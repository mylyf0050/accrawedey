// Shared City game server. One world, many players. The server is the only authority on money and land.
// Run:  node server/server.js      (PORT, DATA_DIR and CLIENT_FILE can be set in the environment)
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const R = require('../shared/rules.js');

const PORT = +process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CLIENT_FILE = process.env.CLIENT_FILE || path.join(__dirname, '..', 'client', 'index.html');
const SAVE_FILE = path.join(DATA_DIR, 'world.json');
const { N, key, CATALOG, CIVIC } = R;
const TYPES = ['empty', 'road', ...Object.keys(CATALOG), ...Object.keys(CIVIC)];
const TYPE_ID = Object.fromEntries(TYPES.map((t, i) => [t, i]));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const now = () => Date.now();
const MAX_PLAYERS = +process.env.MAX_PLAYERS || 5000, MAX_CONN_IP = +process.env.MAX_CONN_IP || 6, SIGNUPS_PER_HOUR = +process.env.SIGNUPS_PER_HOUR || 5, TRUST_PROXY = !!process.env.TRUST_PROXY;
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const lim = { conn: new Map(), signups: new Map(), fails: new Map() };       // per-IP counters
const recent = (map, ip, windowMs) => { const t = now(), a = (map.get(ip) || []).filter(x => t - x < windowMs); map.set(ip, a); return a; };

// ---------- state + persistence ----------
let world, players = {}, nextId = 1, dirty = false;
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    world = R.makeWorld();
    for (let i = 0; i < N * N; i++) world.grid[(i / N) | 0][i % N] = TYPES[d.grid[i]] || 'empty';
    world.land = d.land; world.cracked = d.cracked; world.jobs = d.jobs || {}; R.reindex(world);
    players = d.players; nextId = d.nextId;
    for (const id in players) world.names[id] = players[id].name;
    R.initCivic(world);
    console.log(`loaded world: ${Object.keys(players).length} players`);
  } catch (e) {
    world = R.seedWorld(); players = {}; nextId = 1; dirty = true;
    console.log('created a new world');
  }
}
function save() {
  if (!dirty) return; dirty = false;
  const grid = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid.push(TYPE_ID[world.grid[y][x]]);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = SAVE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ v: 1, nextId, grid, land: world.land, cracked: world.cracked, jobs: world.jobs, players }));
  fs.renameSync(tmp, SAVE_FILE);
}

// ---------- http (serves the game itself) ----------
const server = http.createServer((req, res) => {
  if (req.url === '/health') { res.end('ok'); return; }
  try { const html = fs.readFileSync(CLIENT_FILE); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(html); }
  catch (e) { res.writeHead(500); res.end('client missing'); }
});
const wss = new WebSocketServer({ server, maxPayload: 4096 });
const ipOf = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
const socks = new Map();                                   // ws -> player id

const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const broadcast = o => { const s = JSON.stringify(o); for (const ws of socks.keys()) if (ws.readyState === 1) ws.send(s); };
const socketOf = id => { for (const [ws, pid] of socks) if (pid === id) return ws; return null; };
const tileMsg = (x, y) => ({ x, y, g: TYPE_ID[world.grid[y][x]], L: world.land[key(x, y)] || null, c: world.cracked[key(x, y)] ? 1 : 0 });
const cleanName = s => String(s || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);

function settleP(p, ts) { const g = R.settle(world, p, ts); dirty = true; return g; }
const jobsMsg = pids => ({ t: 'jobs', list: pids.map(id => ({ p: id, j: world.jobs[id] || null })) });
// everyone working at tile k loses the job (building sold, destroyed or leased out): paid up to now first
function clearJobsAt(k, why, ts) {
  const pids = R.workersAt(world, k); if (!pids.length) return;
  for (const id of pids) { if (players[id]) settleP(players[id], ts); R.setJob(world, id, null); const ws = socketOf(id); if (ws) { send(ws, { t: 'notice', kind: 'err', msg: why }); send(ws, youMsg(players[id])); } }
  dirty = true; broadcast(jobsMsg(pids));
}
const youMsg = p => ({ t: 'you', money: p.money, ts: p.t, jail: p.jail || null });

// ---------- messages ----------
function hello(ws, m) {
  let p = null, token = null;
  const fail = msg => send(ws, { t: 'authErr', msg });
  if (typeof m.token === 'string' && m.token) { const h = sha(m.token); p = Object.values(players).find(q => q.th === h) || null; }
  if (!p) {
    if (m.mode !== 'signup' && m.mode !== 'login') { send(ws, { t: 'join' }); return; }
    const name = cleanName(m.name), pw = typeof m.pass === 'string' ? m.pass : '';
    if (!name) return fail('Enter a name (letters and numbers).');
    if (pw.length < 6 || pw.length > 100) return fail('Password must be 6 to 100 characters.');
    const q = Object.values(players).find(o => o.name.toLowerCase() === name.toLowerCase());
    if (m.mode === 'login') {
      if (recent(lim.fails, ws.ip, 600000).length >= 10) return fail('Too many wrong attempts. Wait 10 minutes.');
      const ok = q && q.salt && crypto.timingSafeEqual(Buffer.from(hashPw(pw, q.salt), 'hex'), Buffer.from(q.pw, 'hex'));
      if (!ok) { lim.fails.get(ws.ip).push(now()); return fail('Wrong name or password.'); }
      p = q;
    } else {
      if (q) return fail('That name is taken.');
      if (Object.keys(players).length >= MAX_PLAYERS) return fail('The city is full right now.');
      if (recent(lim.signups, ws.ip, 3600000).length >= SIGNUPS_PER_HOUR) return fail('Too many new accounts from your network. Try later.');
      lim.signups.get(ws.ip).push(now());
      const salt = crypto.randomBytes(16).toString('hex');
      p = { id: nextId++, name, money: R.START_MONEY, t: now(), born: now(), salt, pw: hashPw(pw, salt) };
      players[p.id] = p; world.names[p.id] = name; dirty = true;
      broadcast({ t: 'name', id: p.id, name });
    }
    token = crypto.randomBytes(24).toString('hex'); p.th = sha(token); dirty = true;     // fresh session token on every sign-in
  }
  for (const [o, pid] of socks) if (pid === p.id) { socks.delete(o); try { o.close(); } catch (e) {} }   // one session per player
  socks.set(ws, p.id); ws.pid = p.id;
  const away = now() - p.t, gain = settleP(p, now());
  const grid = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid.push(TYPE_ID[world.grid[y][x]]);
  send(ws, { t: 'init', now: now(), token, you: { id: p.id, name: p.name, money: p.money, ts: p.t, born: p.born, jail: p.jail || null },
    world: { types: TYPES, grid, land: world.land, cracked: world.cracked, names: world.names, jobs: world.jobs }, away: away > 600000 ? { ms: Math.min(away, R.MAXAWAY), gain } : null });
  broadcast({ t: 'online', n: socks.size });
}

function act(ws, p, m) {
  const T = m.tool || {}, x = m.x, y = m.y;
  const tool = { k: String(T.k), mode: T.mode ? String(T.mode) : undefined, item: T.item ? String(T.item) : undefined };
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= N || y >= N) return send(ws, { t: 'res', rid: m.rid, ok: false, msg: '' });
  const ts = now();
  // Everyone whose income depends on this tile or its neighbours is paid up to now before the tile changes.
  const touched = new Set([p.id]);
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const L = world.land[key(x + dx, y + dy)]; if (L && L.o) touched.add(L.o); }
  const tk = key(x, y), before = world.grid[y][x], hadJob = !!world.jobs[p.id];
  for (const id of R.workersAt(world, tk)) touched.add(id);
  for (const id of touched) if (players[id]) settleP(players[id], ts);
  const r = R.perform(world, p, tool, x, y, null, ts);
  if (!r.ok) return send(ws, { t: 'res', rid: m.rid, ok: false, msg: r.msg, you: youMsg(p) });
  dirty = true;
  if (world.grid[y][x] !== before) clearJobsAt(tk, 'Your workplace closed. You lost your job.', ts);
  if (tool.k === 'job' || hadJob !== !!world.jobs[p.id]) broadcast(jobsMsg([p.id]));
  const list = [tileMsg(x, y)]; broadcast({ t: 'tiles', list });
  send(ws, { t: 'res', rid: m.rid, ok: true, done: r.done, cost: r.cost || 0, gain: r.gain || 0, note: r.note || '', you: youMsg(p) });
  for (const id of touched) if (id !== p.id) { const o = socketOf(id); if (o) send(o, youMsg(players[id])); }
}

function board(ws) {
  const rows = Object.values(players).map(p => ({ id: p.id, name: p.name, worth: R.netWorth(world, p), plots: (world.byOwner[p.id] || new Set()).size }))
    .sort((a, b) => b.worth - a.worth).slice(0, 25);
  send(ws, { t: 'board', rows });
}

wss.on('connection', (ws, req) => {
  ws.ip = ipOf(req);
  const c = (lim.conn.get(ws.ip) || 0) + 1; lim.conn.set(ws.ip, c);
  if (c > MAX_CONN_IP) { ws.close(); }
  let tokens = 40, last = Date.now();
  ws.on('message', raw => {
    const t0 = Date.now(); tokens = Math.min(40, tokens + (t0 - last) / 1000 * 20); last = t0;
    if (--tokens < 0) return;                                  // too many messages: ignore
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'hello') return hello(ws, m);
    const pid = socks.get(ws), p = pid && players[pid]; if (!p) return;
    if (m.t === 'act') act(ws, p, m);
    else if (m.t === 'board') board(ws);
    else if (m.t === 'sync') { settleP(p, now()); send(ws, Object.assign(youMsg(p), { now: now() })); }
  });
  ws.on('close', () => { lim.conn.set(ws.ip, Math.max(0, (lim.conn.get(ws.ip) || 1) - 1)); if (socks.delete(ws)) broadcast({ t: 'online', n: socks.size }); });
  ws.on('error', () => {});
});

// ---------- law and order: black markets get raided, owners are fined and may be jailed ----------
const notify = (id, kind, msg) => { const ws = socketOf(id); if (ws) send(ws, { t: 'notice', kind, msg }); };
function freeCell() {
  const used = {}; for (const id in players) { const j = players[id].jail; if (j) used[j.at] = (used[j.at] || 0) + 1; }
  const open = R.prisons(world).filter(p => (used[p.k] || 0) < R.LAW.slots);
  return open.length ? open[Math.floor(Math.random() * open.length)] : null;
}
function raids(ts) {
  const dt = new Date(ts), h = dt.getUTCHours(), d = dt.getUTCDay(), changed = [];
  for (const k of Object.keys(world.land)) {
    const x = k % N, y = (k / N) | 0; if (world.grid[y][x] !== 'den') continue;
    if (CATALOG.den.at(h, d) <= 0) continue;                                   // only open hours carry risk
    if (Math.random() >= R.raidRisk(world, x, y) / 60) continue;               // this sweep runs once a minute
    const L = world.land[k], p = players[L.o]; if (!p) continue;
    settleP(p, ts);
    const fine = Math.round(Math.min(p.money, R.LAW.fineBase + p.money * R.LAW.finePct)); p.money -= fine;
    world.grid[y][x] = 'empty'; changed.push(tileMsg(x, y));
    const cop = R.nearestPolice(world, x, y);
    if (cop && players[cop]) { settleP(players[cop], ts); players[cop].money += R.LAW.bounty; notify(cop, 'ok', `Your police caught a black market: +${R.fmt(R.LAW.bounty)}`); const o = socketOf(cop); if (o) send(o, youMsg(players[cop])); }
    let msg = `Police raided your Black Market! It was confiscated and you were fined ${R.fmt(fine)}.`;
    const cell = freeCell();
    if (cell) {
      p.jail = { until: ts + R.LAW.jailHours * R.HOUR, at: cell.k };
      if (cell.o && players[cell.o]) { settleP(players[cell.o], ts); players[cell.o].money += R.LAW.inmateFee; notify(cell.o, 'ok', `A prisoner was jailed in your prison: +${R.fmt(R.LAW.inmateFee)}`); }
      msg += ` You are in prison for ${R.LAW.jailHours} hours.`;
    } else msg += ' No prison cell was free, so you walked.';
    notify(p.id, 'err', msg); const o = socketOf(p.id); if (o) send(o, youMsg(p));
    dirty = true;
  }
  if (changed.length) broadcast({ t: 'tiles', list: changed });
  for (const id in players) { const p = players[id]; if (p.jail && ts >= p.jail.until) { delete p.jail; dirty = true; notify(p.id, 'ok', 'You are free. You can play again.'); const o = socketOf(p.id); if (o) send(o, youMsg(p)); } }
}

// An owner who cannot pay is out of money: their staff are let go so wages are never created from nothing.
function fireBroke(ts) {
  for (const k in world.staff) { if (!world.staff[k]) continue; const L = world.land[k]; if (!L) { clearJobsAt(+k, 'Your workplace closed. You lost your job.', ts); continue; }
    const o = players[L.o]; if (L.o !== 0 && o && o.money < 1) clearJobsAt(+k, `${o.name} could not pay wages. You lost your job.`, ts); }
}
// ---------- the clock: every minute everyone is paid, leases end, unpaid rent is enforced ----------
function sweep() {
  const ts = now(); raids(ts);
  for (const id in players) if ((world.byOwner[id] || { size: 0 }).size) settleP(players[id], ts);
  const gone = R.expireDue(world, ts);
  for (const g of gone) clearJobsAt(g.k, 'Your workplace closed. You lost your job.', ts);
  fireBroke(ts);
  if (gone.length) {
    dirty = true; const list = gone.map(g => tileMsg(g.x, g.y)); broadcast({ t: 'tiles', list });
    const by = {}; for (const g of gone) (by[g.o] || (by[g.o] = { n: 0, lost: 0 })).n++, g.lost && by[g.o].lost++;
    for (const id in by) { const ws = socketOf(+id); if (ws) send(ws, { t: 'notice', kind: 'err', msg: by[id].lost ? `${by[id].n} plot(s) ended and ${by[id].lost} building(s) were lost` : `${by[id].n} plot(s) ended` }); }
  }
  for (const [ws, pid] of socks) if (players[pid]) send(ws, Object.assign(youMsg(players[pid]), { now: ts }));
}
load();
setInterval(sweep, 60000);
setInterval(save, 5000);
setInterval(() => { for (const m of [lim.signups, lim.fails]) for (const ip of [...m.keys()]) if (!recent(m, ip, 3600000).length) m.delete(ip); }, 600000);
process.on('SIGTERM', () => { dirty = true; save(); process.exit(0); });
process.on('SIGINT', () => { dirty = true; save(); process.exit(0); });
if (require.main === module) server.listen(PORT, () => console.log(`Shared City on http://localhost:${PORT}`));
module.exports = { server, sweep, raids, get world() { return world; }, get players() { return players; }, save };
