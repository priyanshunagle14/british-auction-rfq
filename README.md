# British Auction RFQ System

An RFQ system where supplier bids near the closing time automatically extend the
auction, up to a forced-close limit. Built with the MERN stack.

See [docs/HLD.md](docs/HLD.md) for the design, data model and trade-offs.

## Features
- Create an RFQ with bid start/close, forced close, pickup date, and auction settings
  (trigger window X, extension Y, trigger type)
- Three extension triggers: any bid, any rank change, L1 (lowest bidder) change
- Extension never passes the forced close time
- Auction listing with live status, lowest bid and countdown
- Auction details: ranked bids, full quote breakdown, settings, activity log with
  the reason for every extension
- Concurrency-safe bid placement (per-RFQ lock)
- Unit tests for the extension rules

## Tech stack
React (Vite), Node.js, Express, MongoDB (Mongoose)

## Setup

Requirements: Node 20+, MongoDB (local or Atlas).

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then edit MONGO_URI if needed
npm run seed                # creates 3 sample suppliers
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

`server/.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/rfq_auction
```

## Tests
```bash
cd server
npm test
```
Covers ranking and tie-breaks, trigger window edges, all three triggers, forced-close
capping, and closed-auction handling.

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/rfqs` | Create an RFQ |
| GET | `/api/rfqs` | List RFQs with status, lowest bid, bid count |
| GET | `/api/rfqs/:id` | Raw RFQ |
| GET | `/api/rfqs/:id/details` | RFQ, ranking, bid history, activity log |
| POST | `/api/rfqs/:id/bids` | Place a bid |
| GET | `/api/suppliers` | List suppliers |

Errors use `{ "errors": ["..."] }` with 400 (validation), 404, 409 (auction closed or
duplicate reference ID) or 503 (auction busy, retry).

## Trying the three triggers
1. Create an RFQ closing about 8 minutes from now, forced close about 40 minutes out,
   X = 10, Y = 5.
2. **Any bid**: place a bid. The close time moves by 5 minutes and the log says why.
3. **Any rank change**: place a bid that swaps two suppliers' ranks. A bid that only adds
   a new supplier at the bottom does not extend.
4. **L1 change**: a bid that is not the new lowest does not extend. One that takes L1 does.
5. **Forced close**: create an RFQ with close 2 minutes out and forced close 3 minutes
   out. After a bid the close time stops at the forced close and the log shows the cap.

Concurrency check: `node server/scripts/concurrency-demo.js <rfqId>` fires bids from all
suppliers at once; the total extension is exactly (number of bids) x Y.

## Assumptions and decisions
- A supplier's current bid is its latest; a new bid must be strictly lower.
- Total = freight + origin charges + destination charges, computed on the server.
- Ties are ranked by earlier bid.
- Rank change means an already-ranked supplier moved; a new supplier at the bottom
  does not count. The first bid counts as an L1 change.
- Trigger window is `[close - X, close)`. A bid at the close time is rejected.
- Extension is added to the current close time and capped at the forced close time.
- Status is derived from time on every read, so no scheduled job is needed.
- No authentication: the supplier is picked from a dropdown.

## Known limitations
- Bid, close-time update and log writes are ordered but not wrapped in a transaction.
- The frontend polls instead of using WebSockets.
- Listing computes the lowest bid with one aggregate over bids.
See "Scaling" in the HLD for how each would be addressed.

## Project structure
```
server/src   models, routes, controllers, services (auctionEngine, bidService), utils
server/tests unit tests for the auction engine
client/src   pages, components, hooks, api layer
docs         high-level design
```