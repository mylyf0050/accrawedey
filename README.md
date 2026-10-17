# Shared City

One shared city, many players. The server owns all money, land and rules; browsers only draw the world and send requests.

    npm install
    node server/server.js          # then open http://localhost:3000

* `shared/rules.js`  every game rule (prices, zones, income, rent/lease, crime). Used by the server as the authority and by the browser only to preview.
* `server/server.js` WebSocket server: accounts (anonymous token), actions, per-minute payouts, lease/rent enforcement, police raids, JSON save file in `data/` (set `DATA_DIR`).
* `client/`          the game screen. `python3 client/build.py` rebuilds `client/index.html` (the single file the server sends).

Environment: `PORT` (default 3000), `DATA_DIR`, `CLIENT_FILE`.
Delete `data/world.json` to reset the whole city.

## Accounts and limits
Players sign up with a name and password (scrypt-hashed). Environment options: `MAX_PLAYERS` (5000), `MAX_CONN_IP` (6 sockets per IP), `SIGNUPS_PER_HOUR` (5 per IP), `TRUST_PROXY=1` when behind a host proxy (so limits use the real client IP).

## Jobs and living costs
Everyone pays `LIVING` (GH₵50/day). Players without a job earn the odd-jobs wage (GH₵60/day). Workplaces have staff slots (`jobs` in the catalog) and a daily salary (`sal`), paid by the owner while the building is open. City-run workplaces give newcomers entry-level jobs. If an owner runs out of money, or the building is sold, lost or its road breaks, the staff lose the job.
