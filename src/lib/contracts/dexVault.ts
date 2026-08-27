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

  const allowance = await pc.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [userAddress, DEX_VAULT_ADDRESS],
  });

  if (allowance < amountRaw) {
    const approveHash = await wc.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [DEX_VAULT_ADDRESS, amountRaw],
    });
    await pc.waitForTransactionReceipt({ hash: approveHash });
  }

  const depositHash = await wc.writeContract({
    address: DEX_VAULT_ADDRESS,
    abi: DEX_VAULT_ABI,
    functionName: "depositToken",
    args: [USDC_ADDRESS, amountRaw],
  });
  await pc.waitForTransactionReceipt({ hash: depositHash });

  return depositHash;
}
