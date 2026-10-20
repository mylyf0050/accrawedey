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

## Accra flavour, dumsor, gifts
New buildings: Chop Bar, Trotro Station (appended to the type list so older saved worlds still load). Dumsor: on about one evening in three the power is rationed 18:00 to midnight; shops, clubs, factories and other businesses earn 40% less (hospitals, police, prisons, airports and homes are exempt). Players can send each other GH₵10 to GH₵5,000 (accounts must be an hour old; env `GIFT_MIN_AGE_MS` overrides for tests).

## Food, hiring, companies, elections
- Food tab: eat from open shops, chop bars and markets or income is halved (owner keeps 70%).
- Jobs tab: owners choose how many positions are open; staffed workplaces earn more.
- City tab: weekly Mayor election (account must be 1 day old), found a company and set the pay level.
- My Properties: furnish houses (+15% per level), buy an Uber car or trotro.

## Characters and birth backgrounds
- After signing up, the server rolls a family background (10% born rich GH₵20,000, 60% ordinary GH₵6,500, 30% born broke GH₵2,000). Players cannot choose it.
- Then the player builds a character (gender, skin tone, hairstyle, hair colour, outfit). The Me tab shows the room, energy (food) bar, cash, power and home comfort. The look can be changed free.
- The guide card, warnings and notices can be closed.

## Shifts and side hustle
- Employed players see an "On shift, Xh left" pill. Signing in during a shift opens a card with the workplace, the time left to clock out and a button to show it on the map.
- Off shift, everyone with a job earns a side hustle of GH₵3 an hour.

## 3D view
Tap the 3D button (top bar) to switch the city to a Three.js 3D view; tap 2D to go back. 2D stays the default. Three.js is served from client/three.min.js and loads only when 3D is tapped.
