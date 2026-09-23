import { createPublicClient, createWalletClient, custom, http, parseUnits, type Address } from "viem";
import type { Eip1193Provider } from "@/lib/useWallet";

export const FUJI_CHAIN_ID = Number(import.meta.env.VITE_FUJI_CHAIN_ID ?? 43113);
export const FUJI_RPC_URL = import.meta.env.VITE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
export const DEX_VAULT_ADDRESS = (import.meta.env.VITE_DEXVAULT_ADDRESS || "") as Address;
export const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS ||
  "0x5425890298aed601595a70AB815c96711a31Bc65") as Address;
export const USDC_DECIMALS = 6;

const fujiChain = {
  id: FUJI_CHAIN_ID,
  name: "Avalanche Fuji",
  nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
  rpcUrls: { default: { http: [FUJI_RPC_URL] } },
} as const;

export const DEX_VAULT_ABI = [
  {
    type: "function",
    name: "depositToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Declared standalone (not indexed out of ERC20_ABI) for readContract's
// "allowance" call below — indexing into an existing `as const` array
// (ERC20_ABI[1]) didn't preserve concrete-enough literal typing for viem's
// overload resolution to pick the right ReadContractParameters overload, and
// mixing "approve" (nonpayable) and "allowance" (view) in one array passed
// to readContract confused it the same way. A fresh single-entry `as const`
// array resolves cleanly.
const ERC20_ALLOWANCE_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function publicClient() {
  return createPublicClient({ chain: fujiChain, transport: http(FUJI_RPC_URL) });
}

function walletClient(provider: Eip1193Provider, account: Address) {
  return createWalletClient({ chain: fujiChain, transport: custom(provider), account });
}

export function isDexVaultConfigured() {
  return Boolean(DEX_VAULT_ADDRESS);
}

const FUJI_CHAIN_ID_HEX = `0x${FUJI_CHAIN_ID.toString(16)}`;

async function ensureFujiChain(provider: Eip1193Provider) {
  const currentChainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (currentChainId?.toLowerCase() === FUJI_CHAIN_ID_HEX.toLowerCase()) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: FUJI_CHAIN_ID_HEX }],
    });
  } catch (err: any) {
    if (err?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: FUJI_CHAIN_ID_HEX,
            chainName: "Avalanche Fuji Testnet",
            nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
            rpcUrls: [FUJI_RPC_URL],
            blockExplorerUrls: ["https://testnet.snowtrace.io"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

/**
 * Approves (if needed) then calls depositToken on DexVault. Returns the deposit tx hash.
 */
export async function depositUsdc(provider: Eip1193Provider, userAddress: Address, amount: string) {
  if (!DEX_VAULT_ADDRESS) throw new Error("DexVault contract address is not configured");

  await ensureFujiChain(provider);

  const amountRaw = parseUnits(amount, USDC_DECIMALS);
  const pc = publicClient();
  const wc = walletClient(provider, userAddress);

  // chain/account are already bound on pc/wc via publicClient()/walletClient()
  // above, so these calls work correctly at runtime — but viem's
  // readContract/writeContract overloads need them repeated explicitly in
  // the call arguments to resolve their generic types when the client isn't
  // constructed inline at the call site, or TypeScript falls back to a
  // broader overload that reports them as missing.
  // Passed as a single-entry ABI ([ERC20_ABI[1]], the "allowance" view
  // function only) rather than the full ERC20_ABI array: viem's readContract
  // overload resolution struggled to pick "allowance" out of an ABI array
  // that also contains "approve" (a different stateMutability), and fell
  // back to matching against approve's parameter shape instead — a pure TS
  // inference issue, not a runtime one (the call already worked correctly),
  // but this is the standard fix and removes the ambiguity outright.
  // authorizationList: undefined works around a viem 2.55 type-inference
  // quirk where ReadContractParameters' intersection with CallParameters'
  // EIP-7702 fields resolves authorizationList as required rather than
  // optional for this overload, even though it's never actually needed for
  // a plain read call.
  const allowance = await pc.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: "allowance",
    args: [userAddress, DEX_VAULT_ADDRESS],
    account: userAddress,
    authorizationList: undefined,
  });

  if (allowance < amountRaw) {
    const approveHash = await wc.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [DEX_VAULT_ADDRESS, amountRaw],
      chain: fujiChain,
      account: userAddress,
    });
    await pc.waitForTransactionReceipt({ hash: approveHash });
  }

  const depositHash = await wc.writeContract({
    address: DEX_VAULT_ADDRESS,
    abi: DEX_VAULT_ABI,
    functionName: "depositToken",
    args: [USDC_ADDRESS, amountRaw],
    chain: fujiChain,
    account: userAddress,
  });
  await pc.waitForTransactionReceipt({ hash: depositHash });

  return depositHash;
}
