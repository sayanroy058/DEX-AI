# BitDx Prediction Markets

## 1. What This Feature Is

A prediction market asks a question about a future event. Traders choose one of two possible outcomes. Most markets use **YES / NO**. Short price-direction markets use **UP / DOWN**.

Each outcome is represented by a share, sometimes called a contract. A share price is between $0 and $1.

Buying YES at 62¢ means paying $0.62 for one YES share. If YES wins, the share becomes worth $1. If YES loses, it becomes worth $0. UP and DOWN shares work in exactly the same way.

The current BitDx implementation is a frontend demonstration. It does not send orders to a server, move wallet funds, or make blockchain transactions.

## 2. Listing Page

The listing page is available at `/prediction`. Its markets come from the shared `PREDICTION_MARKETS` fixture in `src/lib/predictionMarkets.ts`.

The category buttons filter the shared list by Crypto, Macro, Regulation, AI, or Tech. A separate duration control can show all markets, only 5-minute markets, or only 15-minute markets. The category and duration filters work together. Each `PredictionMarketCard` shows:

- the market icon and category;
- the question;
- closing time or countdown;
- participant and volume figures;
- both outcomes and their contract prices.

The larger outcome price also suggests the market's leading opinion. For example, 62¢ is approximately a 62% implied probability. Price and probability are related, but the code stores the contract price and only derives the displayed percentage.

The entire card is a keyboard-accessible link. Clicking it opens `/prediction/:marketId`.

## 3. Market Detail Page

`PredictionMarketDetail` loads the selected market from the same fixture used by the listing. It does not copy market information into the page. For five-minute UP/DOWN markets, `useLivePredictionMarket` turns that fixture into one synchronized live demo snapshot every second.

The page contains:

- `MarketHeader`: icon, title, category, duration, dates, status, copy, share, and bookmark controls;
- `MarketStats`: target/current price when relevant, leading outcome for non-price markets, countdown, volume, participants, and source;
- `MarketPriceChart`: underlying asset history and a target line for price markets;
- `MarketIntervalSelector`: past, live, and upcoming five-minute windows below a direction-market chart;
- `TradeTicket`: BUY/SELL mode, outcome selection, amount entry, quick controls, estimates, and local demo positions;
- `PredictionOrderBook`: outcome tabs, asks, bids, last price, spread, and depth shading;
- `RelatedMarkets`: links to other fixtures related to the current market;
- `MarketInformation`: accessible Rules and Market Context tabs.

Markets without underlying price data show a clear chart-unavailable state instead of displaying irrelevant price fields.

## 4. Price to Beat

The Price to Beat is a reference value for the underlying asset. In a BTC direction market, it may be the BTC price when the interval started. In a threshold market, it may be a fixed level such as $80,000.

It is **not** the prediction-contract price. A BTC target of $77,345.05 and an UP contract price of 62¢ describe two different things.

## 5. Current Price

The Current Price is the latest simulated price of the underlying asset. In five-minute UP/DOWN markets it changes once per second. `MarketStats` compares it with `referencePrice` and displays whether it is above or below the target.

The target comparison does not decide the final outcome before the market ends. Resolution uses the value at the stated end time and the rules stored on that market.

## 6. Prediction Contract Price

A contract price is stored as a dollar decimal:

- `0.91` is displayed as 91¢;
- `0.10` is displayed as 10¢.

If UP costs 91¢, traders are approximately pricing UP as a 91% probability. If DOWN costs 10¢, traders are approximately pricing DOWN as a 10% probability. The fixture keeps each outcome as its own object with an ID, label, price, and visual tone. In a live UP/DOWN interval, the simulation recalculates these prices from the current distance to the target and the time remaining. Movement is smooth and deterministic, and the two displayed prices always total $1. In a real market, these prices would come from trader orders instead.

## 7. Buying Shares

The BUY mode treats the input as an amount of BI2XUSD to spend. `calculateBuyEstimate` validates the amount and contract price, protects against division by zero, and derives shares, maximum payout, and potential profit.

Example:

- Contract price: $0.80
- Amount: $20
- Shares: $20 / $0.80 = 25 shares
- Winning payout: 25 × $1 = $25
- Potential profit: $25 - $20 = $5

The $5, $25, and $100 buttons only fill the amount field. Pressing the final button adds shares to local React state and shows a Sonner message explaining that backend execution is not connected.

## 8. Selling Shares

SELL mode treats the input as a number of shares. The detail page starts with a small mock position in the first outcome so the interaction can be demonstrated. Other outcomes correctly show that no position is available.

`calculateSellEstimate` caps the sale at the shares owned and estimates proceeds as:

`shares sold × current contract price`

The 25%, 50%, and MAX buttons are based on the local position. Selling reduces only the local position. A real backend can later replace the `MockPredictionPositions` object with account position data.

## 9. Countdown and Resolution

Every market has a `startTime`, `endTime`, and `resolutionDate`.

`CountdownTimer` calculates days, hours, minutes, and seconds from `endTime`. It updates once per second, cleans up its interval when removed, clamps the remaining time to zero, and never displays a negative value.

Short markets display minutes and seconds. Longer markets display days and hours. Five-minute direction markets are aligned to real clock boundaries such as 3:50–3:55 and 3:55–4:00. When the active interval ends, the default view automatically rolls to the next interval with a new Price to Beat. A manually selected past interval remains visible as resolved, and an upcoming interval shows when it starts and disables trading. Actual authoritative resolution is not performed because this feature is frontend-only.

## 10. Price Chart

`MarketPriceChart` uses the Recharts library already installed in BitDx. It charts `priceHistory`, which represents the underlying asset price. It does not chart contract probability. The X-axis shows underlying-price timestamps. The pill buttons below the chart are different: they select separate five-minute prediction intervals.

The orange dashed target line is the market's fixed `referencePrice`. A separate dotted current-price line moves once per second and is green above the target or red below it. Tooltip values and the current-price summary use currency formatting.

Initial fixture history is produced by `generatePriceHistory`. Live five-minute history is produced by `simulateUnderlyingPrice` and rebuilt through `createLivePredictionMarketSnapshot`. Both use repeatable sine/cosine movement rather than random numbers. The live chart endpoint advances each second without jumping on React renders.

## 11. Order Book

An order book is a list of offers to buy and sell outcome shares.

- **Price** is the contract price per share.
- **Shares** is the number of shares at that price.
- **Total** is the running dollar value through that row.
- **Last price** is the latest simulated contract trade.
- **Spread** is the difference between the best ask and best bid.
- **Depth shading** makes larger rows visually easier to compare.

The Trade UP/DOWN or Trade YES/NO controls switch to the selected outcome's separate book. `calculateCumulativeBookLevels` computes totals from raw price and share fixtures. `calculateBookSpread` computes the spread instead of storing it as display text.

## 12. Frontend Data Model

The main `PredictionMarket` fields mean:

- `id` and `slug`: stable identifiers used for lookup and routing;
- `title` and `shortTitle`: full and compact display names;
- `category`: the listing filter group;
- `marketType`: binary event, price threshold, or price direction;
- `status`: open, closed, or resolved;
- `description`, `rules`, and `edgeCase`: market-specific explanatory content;
- `volume` and `participants`: numeric activity figures;
- `startTime`, `endTime`, and `resolutionDate`: ISO timestamps;
- `priceSource`: the source that would determine resolution;
- `symbol`, `interval`, and `intervalMinutes`: optional price-market details and the numeric duration used by live interval calculations;
- `referencePrice` and `currentPrice`: optional underlying asset values;
- `priceHistory`: optional underlying chart points;
- `outcomes`: generalized YES/NO or UP/DOWN contracts;
- `orderBooks`: separate mock depth for each outcome;
- `relatedMarketIds`: links to other shared market fixtures.

`PredictionOutcome` stores an ID, label, dollar price, and semantic tone. `PredictionOutcomeBook` stores bids, asks, and last price. Derived totals, spread, probability text, payouts, and profit are deliberately not duplicated in the fixtures.

## 13. Component Structure

```text
Prediction
└── PredictionMarketCard

PredictionMarketDetail
├── MarketHeader
├── MarketStats
│   └── CountdownTimer
├── MarketPriceChart
├── MarketIntervalSelector
├── TradeTicket
├── PredictionOrderBook
├── MarketInformation
└── RelatedMarkets
    └── CountdownTimer
```

`AppShell` remains above both pages and supplies the unchanged BitDx navigation and wallet controls.

## 14. State Flow

React Router provides `marketId`. `findPredictionMarket` converts it into the selected shared market.

The detail page owns:

- `selectedOutcomeId` for the trade ticket;
- a query-string value such as `?outcome=up`, so outcome selection has a shareable URL;
- an optional `?interval=<timestamp>` value for a manually selected five-minute window; without it, the page follows the live interval automatically;
- `positions`, a local map of outcome ID to mock shares;
- `useLivePredictionMarket`, which owns one cleaned-up one-second clock and derives the market snapshot, live window, chart history, current price, contract prices, and repriced order book.

`TradeTicket` owns BUY/SELL mode and the current input. Shares, payout, profit, proceeds, owned position, spread, countdown, and cumulative totals are calculated values rather than redundant state.

## 15. Files Involved

- `src/App.tsx`: registers `/prediction/:marketId`.
- `src/pages/Prediction.tsx`: keeps the listing and renders linked cards.
- `src/pages/PredictionMarketDetail.tsx`: loads a market and composes the trading page.
- `src/lib/predictionMarkets.ts`: types, shared fixtures, formatting, chart generation, and calculation helpers.
- `src/lib/predictionMarkets.test.ts`: tests calculations, lookup, deterministic history, and countdown clamping.
- `src/lib/predictionSimulation.ts`: pure five-minute alignment, live-price, contract-price, history, and snapshot helpers.
- `src/lib/predictionSimulation.test.ts`: tests interval states, deterministic movement, live quote changes, resolution, and book repricing.
- `src/hooks/useLivePredictionMarket.ts`: runs the single live demo clock and exposes one synchronized market snapshot.
- `src/components/prediction/PredictionMarketCard.tsx`: accessible listing card.
- `src/components/prediction/MarketHeader.tsx`: title, status, dates, and utility controls.
- `src/components/prediction/MarketStats.tsx`: target/current data, countdown, and activity.
- `src/components/prediction/CountdownTimer.tsx`: live deadline display.
- `src/components/prediction/MarketPriceChart.tsx`: Recharts underlying-price chart.
- `src/components/prediction/MarketIntervalSelector.tsx`: accessible time pills and Past/More menus for five-minute windows.
- `src/components/prediction/TradeTicket.tsx`: outcome trading simulation and estimates.
- `src/components/prediction/PredictionOrderBook.tsx`: outcome depth and cumulative totals.
- `src/components/prediction/RelatedMarkets.tsx`: related fixture navigation.
- `src/components/prediction/MarketInformation.tsx`: rules and context tabs.
- `src/components/trade/PredictionTradeDialog.tsx`: removed because the new routed trade ticket replaces the old isolated modal.
- `DocPredict.md`: this document.

## 16. Mock Data

The following values are simulated:

- market questions and deadlines;
- live contract prices and implied probability;
- live underlying current/reference prices;
- advancing price history;
- repriced order-book bids, asks, and last prices;
- past/current/upcoming five-minute intervals and local past-window resolution;
- volume and participant counts;
- the starting local position;
- buy and sell results.

Nothing on these screens represents an executed trade or confirmed resolution. Toast messages explicitly call actions demo orders.

## 17. Connecting a Real Backend Later

Future integrations can replace individual boundaries:

- load `PREDICTION_MARKETS` from a market API;
- replace `useLivePredictionMarket` output, `priceHistory`, `currentPrice`, and `referencePrice` with a live price feed;
- update the final chart point through WebSocket data;
- replace `orderBooks` with live book snapshots and updates;
- load `positions` from the authenticated user's account;
- send the validated Trade Ticket values to an order-creation endpoint;
- update `status` and winning outcomes from a resolution service.

The presentation components already receive typed props, so these data sources can change without rebuilding the layout. None of these integrations are implemented now.

## 18. Common Changes

- **Add a market:** add one `fixture(...)` entry to `PREDICTION_MARKETS`, including outcomes, rules, and related IDs. A live 5-minute or 15-minute direction market should also set `intervalMinutes`.
- **Change outcome prices:** edit the `makeOutcomes` price used by that fixture.
- **Change quick-buy amounts:** edit `[5, 25, 100]` in `TradeTicket.tsx`.
- **Add a category:** extend `PredictionCategory`, `PREDICTION_CATEGORIES`, and `CATEGORY_BADGE_CLASS`.
- **Change rules:** edit that market's `rules` and `edgeCase` fields.
- **Replace chart data:** supply a different `priceHistory` array, change the pure functions in `predictionSimulation.ts`, or replace the simulation through an API adapter.
- **Replace order-book data:** supply live `PredictionOutcomeBook` objects; cumulative display math can remain unchanged.

## 19. Known Limitations

- There is no prediction-market backend, database, matching engine, or resolver.
- Demo positions disappear on refresh or navigation to another market.
- Live prices are deterministic browser simulations, not exchange or prediction-market feeds.
- Interval history and resolved outcomes reset when the page reloads; they are not authoritative records.
- Order-book levels do not accept or match orders.
- Wallet connection does not authorize prediction trades and balances never change.
- Bookmark state is local to the current component and is not persisted.
- Copy/share uses the browser clipboard rather than a social sharing service.

## 20. Quick Mental Model

1. A market asks a question.
2. Users choose an outcome.
3. An outcome share costs between $0 and $1.
4. The market runs until its deadline.
5. The winning share becomes worth $1.
6. The losing share becomes worth $0.
