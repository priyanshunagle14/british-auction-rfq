# British Auction RFQ

A small app for running freight quote auctions. A buyer creates an RFQ (request for
quote), suppliers place bids, and bids made near the closing time push the closing
time back.

Built with React, Node, Express and MongoDB.

## How the auction works

Each RFQ has these settings:

- **X**: the last X minutes before closing
- **Y**: how many minutes to add
- **Trigger**: what counts as a reason to extend
  - any bid
  - any change in rank
  - a change in the lowest bidder

If a bid comes in during the last X minutes and matches the trigger, the closing time
moves back by Y minutes. It never goes past the forced close time. Every extension is
saved in an activity log with the reason.

## Run it

You need Node 20 or newer and MongoDB.

```bash
cd server
npm install
cp .env.example .env
npm run seed
npm start
```

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

The app is at http://localhost:5173 and the API is at http://localhost:5000.
To run the tests: `npm test` inside `server`.

## How I handled a few things

- A supplier's current bid is their latest bid, and a new bid has to be lower.
- If two prices are equal, the earlier bid ranks higher.
- The status (active, closed, force closed) is worked out from the times, so I don't
  need a job to update it.
- If two bids arrive at the same moment, they could both read old data. To avoid that,
  each RFQ is locked for a moment while a bid is being saved.
- There's no login. You pick the supplier from a dropdown.

## What I'd do next

- Add accounts for buyers and suppliers
- Save a bid and its log entries in one database transaction
- Use WebSockets instead of refreshing every few seconds