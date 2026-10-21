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
const NEWER = ['chopbar', 'trotro'];                       // newer building types are appended so saved worlds keep their tile ids
const TYPES = ['empty', 'road', ...Object.keys(CATALOG).filter(k => !NEWER.includes(k)), ...Object.keys(CIVIC), ...NEWER];
const TYPE_ID = Object.fromEntries(TYPES.map((t, i) => [t, i]));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const now = () => Date.now();
const MAX_PLAYERS = +process.env.MAX_PLAYERS || 5000, MAX_CONN_IP = +process.env.MAX_CONN_IP || 6, SIGNUPS_PER_HOUR = +process.env.SIGNUPS_PER_HOUR || 5, TRUST_PROXY = !!process.env.TRUST_PROXY;
const GIFT_MIN_AGE = process.env.GIFT_MIN_AGE_MS !== undefined ? +process.env.GIFT_MIN_AGE_MS : 3600000;
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const lim = { conn: new Map(), signups: new Map(), fails: new Map() };       // per-IP counters
const recent = (map, ip, windowMs) => { const t = now(), a = (map.get(ip) || []).filter(x => t - x < windowMs); map.set(ip, a); return a; };

// ---------- state + persistence ----------
let world, players = {}, nextId = 1, dirty = false;
const songs = {};                                          // clubKey -> [{tr, by, st}] (not saved: queues are short-lived)
let election = { week: -1, cands: {}, votes: {}, mayor: null };
const WEEK = 7 * R.DAYMS, MON = 4 * R.DAYMS, ELECT_MIN_AGE = process.env.ELECT_MIN_AGE_MS !== undefined ? +process.env.ELECT_MIN_AGE_MS : 86400000;
const weekOf = ts => Math.floor((ts - MON) / WEEK), weekEnd = wk => (wk + 1) * WEEK + MON;
function load() {
  try {
    const d = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    world = R.makeWorld();
    for (let i = 0; i < N * N; i++) world.grid[(i / N) | 0][i % N] = TYPES[d.grid[i]] || 'empty';
    world.land = d.land; world.cracked = d.cracked; world.jobs = d.jobs || {}; world.companies = d.companies || {}; world.cars = d.cars || {}; election = d.election || election; R.reindex(world);
    players = d.players; nextId = d.nextId;
    for (const id in players) if (players[id].fedUntil === undefined) players[id].fedUntil = Date.now() + 24 * 3600000;
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
  fs.writeFileSync(tmp, JSON.stringify({ v: 1, nextId, grid, land: world.land, cracked: world.cracked, jobs: world.jobs, companies: world.companies, cars: world.cars, election, players }));
  fs.renameSync(tmp, SAVE_FILE);
}

// ---------- http (serves the game itself) ----------
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" };
const keyOk = k => { const a = Buffer.from(String(k || '')), b = Buffer.from(process.env.ADMIN_KEY || ''); return b.length > 0 && a.length === b.length && require('crypto').timingSafeEqual(a, b); };
const server = http.createServer((req, res) => {
  for (const h in SEC) res.setHeader(h, SEC[h]);
  let pathname = '/'; try { pathname = new URL(req.url, 'http://x').pathname; } catch (e) { res.writeHead(400); res.end(); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  if (pathname === '/health') { res.end('ok'); return; }
  if (pathname === '/stats' && !keyOk(new URL(req.url, 'http://x').searchParams.get('key'))) { res.writeHead(404); res.end('Not found'); return; }
  if (pathname === '/three.min.js') {
    try { const js = fs.readFileSync(path.join(path.dirname(CLIENT_FILE), 'three.min.js')); res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }); res.end(js); }
    catch (e) { res.writeHead(404); res.end('Not found'); }
    return;
  }
  if (pathname !== '/' && pathname !== '/stats' && pathname !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
  if (pathname === '/stats') {
    const ps = Object.values(players), t = now(); let buildings = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (CATALOG[world.grid[y][x]]) buildings++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ players: ps.length, online: socks.size, newLastDay: ps.filter(p => t - p.born < 86400000).length, activeLastDay: ps.filter(p => t - p.t < 86400000).length, plots: Object.keys(world.land).length, buildings, employed: Object.keys(world.jobs).length, companies: Object.keys(world.companies).length, vehicles: Object.keys(world.cars).length, totalMoney: Math.round(ps.reduce((a, p) => a + p.money, 0)) }, null, 1)); return;
  }
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
const carsMsg = pids => ({ t: 'cars', list: pids.map(id => ({ p: id, c: world.cars[id] || null })) });
const companyMsg = id => ({ t: 'company', id, co: world.companies[id] || null });
const electionMsg = () => ({ t: 'election', week: election.week, endsAt: weekEnd(election.week), mayor: election.mayor,
  cands: Object.keys(election.cands).map(id => ({ id: +id, name: players[id] ? players[id].name : '?', votes: Object.values(election.votes).filter(v => v === +id).length })) });
const ballotMsg = pid => ({ t: 'ballot', vote: election.votes[pid] || 0 });
const eligible = p => now() - p.born >= ELECT_MIN_AGE;
function rollover(ts) {
  const wk = weekOf(ts); if (wk === election.week) return;
  if (election.week >= 0) {                                   // count last week's ballots
    const tally = {}; for (const v of Object.values(election.votes)) tally[v] = (tally[v] || 0) + 1;
    const win = Object.keys(election.cands).sort((a, b) => (tally[b] || 0) - (tally[a] || 0) || a - b)[0];
    if (win && players[win] && (tally[win] || 0) > 0) {
      election.mayor = { id: +win, name: players[win].name, week: election.week, votes: tally[win] };
      settleP(players[win], ts); players[win].money += R.MAYOR_PAY;
      const o = socketOf(+win); if (o) send(o, youMsg(players[win]));
      broadcast({ t: 'notice', kind: 'ok', msg: `${players[win].name} is the new Mayor with ${tally[win]} vote${tally[win] > 1 ? 's' : ''}!` });
    }
  }
  election.week = wk; election.cands = {}; election.votes = {}; dirty = true;
  broadcast(electionMsg()); for (const [ws, pid] of socks) send(ws, ballotMsg(pid));
}
const youMsg = p => ({ t: 'you', money: p.money, ts: p.t, jail: p.jail || null, fed: p.fedUntil });

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
      const bg = R.rollBackground(crypto.randomInt(0, 1000000) / 1000000);
      p = { id: nextId++, name, bg, av: null, money: R.BACKGROUNDS[bg].money, t: now(), born: now(), fedUntil: now() + 24 * 3600000, salt, pw: hashPw(pw, salt) };
      players[p.id] = p; world.names[p.id] = name; dirty = true;
      broadcast({ t: 'name', id: p.id, name });
    }
    token = crypto.randomBytes(24).toString('hex'); p.th = sha(token); dirty = true;     // fresh session token on every sign-in
  }
  for (const [o, pid] of socks) if (pid === p.id) { socks.delete(o); try { o.close(); } catch (e) {} }   // one session per player
  socks.set(ws, p.id); ws.pid = p.id;
  const away = now() - p.t, gain = settleP(p, now());
  const grid = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) grid.push(TYPE_ID[world.grid[y][x]]);
  send(ws, { t: 'init', now: now(), token, you: { id: p.id, name: p.name, money: p.money, ts: p.t, born: p.born, jail: p.jail || null, fed: p.fedUntil, bg: p.bg || 'mid', av: p.av || null },
    world: { types: TYPES, grid, land: world.land, cracked: world.cracked, names: world.names, jobs: world.jobs, companies: world.companies, cars: world.cars }, away: away > 600000 ? { ms: Math.min(away, R.MAXAWAY), gain } : null });
  send(ws, electionMsg()); send(ws, ballotMsg(p.id)); send(ws, songsMsg());
  broadcast({ t: 'online', n: socks.size });
}

function act(ws, p, m) {
  const T = m.tool || {}, x = m.x, y = m.y;
  const tool = { k: String(T.k), mode: T.mode ? String(T.mode) : undefined, item: T.item ? String(T.item) : undefined, n: Number.isInteger(T.n) ? T.n : undefined };
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
  if (r.pay && r.pay.amt > 0 && players[r.pay.to]) {                                  // the seller is paid for the meal
    const o = players[r.pay.to]; o.money += r.pay.amt; const ws2 = socketOf(o.id);
    if (ws2 && o.id !== p.id) { send(ws2, youMsg(o)); send(ws2, { t: 'notice', kind: 'ok', msg: `${p.name} bought ${R.FOOD[before] ? R.FOOD[before].label.toLowerCase() : 'food'} from you: +${R.fmt(r.pay.amt)}` }); }
  }
  if (r.fired && r.fired.length) {
    for (const id of r.fired) { const ws2 = socketOf(id); if (ws2) { send(ws2, { t: 'notice', kind: 'err', msg: `${p.name} let you go from their ${(R.CATALOG[before] || {}).name || 'workplace'}.` }); send(ws2, youMsg(players[id])); } }
    broadcast(jobsMsg(r.fired));
  }
  if (tool.k === 'job' || hadJob !== !!world.jobs[p.id]) broadcast(jobsMsg([p.id]));
  if (tool.k === 'vehicle') broadcast(carsMsg([p.id]));
  const list = [tileMsg(x, y)]; broadcast({ t: 'tiles', list });
  send(ws, { t: 'res', rid: m.rid, ok: true, done: r.done, cost: r.cost || 0, gain: r.gain || 0, note: r.note || '', you: youMsg(p) });
  for (const id of touched) if (id !== p.id) { const o = socketOf(id); if (o) send(o, youMsg(players[id])); }
}

// Sending money to another player. New accounts cannot send (stops one person feeding many fresh accounts).
function gift(ws, p, m) {
  const fail = msg => send(ws, { t: 'giftRes', ok: false, msg });
  const to = Number.isInteger(m.to) && Object.hasOwn(players, m.to) ? players[m.to] : null, amt = m.amt;
  if (!to || to.id === p.id) return fail('Pick another player.');
  if (!Number.isInteger(amt) || amt < 10 || amt > 5000) return fail('You can send GH₵10 to GH₵5,000 at a time.');
  if (now() - p.born < GIFT_MIN_AGE) return fail('New players can send money after their first hour.');
  if (p.jail && p.jail.until > now()) return fail('You cannot do that while in prison.');
  const ts = now(); settleP(p, ts); settleP(to, ts);
  if (p.money < amt) return fail(`You only have ${R.fmt(p.money)}.`);
  p.money -= amt; to.money += amt; dirty = true;
  send(ws, { t: 'giftRes', ok: true, msg: `Sent ${R.fmt(amt)} to ${to.name}`, you: youMsg(p) });
  const o = socketOf(to.id); if (o) { send(o, youMsg(to)); send(o, { t: 'notice', kind: 'ok', msg: `${p.name} sent you ${R.fmt(amt)}` }); }
}
// A company: a name plus a pay level that scales the salary of everyone working in the owner's buildings.
function company(ws, p, m) {
  const fail = msg => send(ws, { t: 'companyRes', ok: false, msg }), ts = now();
  const mine = world.companies[p.id];
  if (!mine) {
    const name = String(m.name || '').replace(/[^\p{L}\p{N} &_.\-]/gu, '').trim().slice(0, 24);
    if (name.length < 3) return fail('Give your company a name (3 to 24 letters).');
    if (Object.values(world.companies).some(c => c.name.toLowerCase() === name.toLowerCase())) return fail('That company name is taken.');
    let has = false; for (const k of (world.byOwner[p.id] || [])) { const g = world.grid[(k / N) | 0][k % N]; if (CATALOG[g] && CATALOG[g].sal) { has = true; break; } }
    if (!has) return fail('Build a shop, school or other workplace first.');
    settleP(p, ts); if (p.money < R.FOUND_COST) return fail(`Founding a company costs ${R.fmt(R.FOUND_COST)}.`);
    p.money -= R.FOUND_COST; world.companies[p.id] = { name, pay: 1 }; dirty = true;
    send(ws, { t: 'companyRes', ok: true, msg: `${name} is founded`, you: youMsg(p) }); broadcast(companyMsg(p.id)); return;
  }
  const pay = Math.round(+m.pay * 10) / 10;
  if (!(pay >= R.PAY_MIN && pay <= R.PAY_MAX)) return fail(`Pay level must be between ${R.PAY_MIN} and ${R.PAY_MAX}.`);
  const touched = new Set([p.id]); for (const k of (world.byOwner[p.id] || [])) for (const id of R.workersAt(world, k)) touched.add(id);
  for (const id of touched) if (players[id]) settleP(players[id], ts);              // everyone is paid at the old rate up to now
  mine.pay = pay; dirty = true;
  send(ws, { t: 'companyRes', ok: true, msg: `Pay level set to ${pay}x`, you: youMsg(p) }); broadcast(companyMsg(p.id));
  for (const id of touched) if (id !== p.id) { const o = socketOf(id); if (o) send(o, youMsg(players[id])); }
}
function vote(ws, p, m, run) {
  const fail = msg => send(ws, { t: 'electionRes', ok: false, msg });
  rollover(now());
  if (!eligible(p)) return fail('Accounts must be a day old to run or vote.');
  if (run) {
    if (election.cands[p.id]) return fail('You are already running.');
    if (Object.keys(election.cands).length >= 20) return fail('The ballot is full this week.');
    election.cands[p.id] = true; dirty = true; send(ws, { t: 'electionRes', ok: true, msg: 'You are running for Mayor this week' });
  } else {
    if (!Number.isInteger(m.for) || !Object.hasOwn(election.cands, m.for) || !players[m.for]) return fail('Pick a candidate from the list.');
    election.votes[p.id] = +m.for; dirty = true; send(ws, { t: 'electionRes', ok: true, msg: `Vote cast for ${players[m.for].name}` }); send(ws, ballotMsg(p.id));
  }
  broadcast(electionMsg());
}
// ---------- club song requests ----------
function songPrune(ts) {
  let ch = false;
  for (const k of Object.keys(songs)) {
    const y = (k / N) | 0, x = k % N, keep = world.grid[y] && world.grid[y][x] === 'club' ? songs[k].filter(s => s.st + R.SONG.TRACK_MS > ts) : [];
    if (keep.length !== songs[k].length) { ch = true; if (keep.length) songs[k] = keep; else delete songs[k]; }
  }
  return ch;
}
function songsMsg() { const q = {}; for (const k in songs) q[k] = songs[k].map(s => ({ tr: s.tr, by: s.by, n: world.names[s.by] || '?', st: s.st })); return { t: 'songs', q, now: now() }; }
function song(ws, p, m) {
  const fail = msg => send(ws, { t: 'songRes', ok: false, msg }), ts = now();
  const x = m.x, y = m.y, tr = R.SONG.TRACKS.find(t => t.id === m.tr);
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= N || y >= N || !tr) return fail('Pick a club and a song.');
  if (world.grid[y][x] !== 'club') return fail('That is not a night club.');
  if (p.jail && p.jail.until > ts) return fail('You cannot do that while in prison.');
  const d = new Date(ts); if (!process.env.SONG_ANYTIME && CATALOG.club.at(d.getUTCHours(), d.getUTCDay()) <= 0) return fail('The club is closed. Requests open at 20:00.');
  songPrune(ts); const k = y * N + x, q = songs[k] || (songs[k] = []);
  if (q.length >= R.SONG.MAXQ) return fail('The DJ has a full queue. Try again in a few minutes.');
  if (q.filter(s => s.by === p.id).length >= R.SONG.PER_PLAYER) return fail('You already have two songs in this queue.');
  settleP(p, ts); if (p.money < R.SONG.PRICE) return fail(`A request costs ${R.fmt(R.SONG.PRICE)}. You have ${R.fmt(p.money)}.`);
  p.money -= R.SONG.PRICE;
  const L = world.land[k], owner = L && L.o && players[L.o] ? players[L.o] : null, cut = Math.round(R.SONG.PRICE * R.SONG.OWNER_CUT);
  if (owner) { if (owner.id !== p.id) settleP(owner, ts); owner.money += cut; if (owner.id !== p.id) { notify(owner.id, 'ok', `${p.name} requested "${tr.name}" at your club: +${R.fmt(cut)}`); const o = socketOf(owner.id); if (o) send(o, youMsg(owner)); } }
  const last = q[q.length - 1]; q.push({ tr: tr.id, by: p.id, st: last ? Math.max(ts, last.st + R.SONG.TRACK_MS) : ts }); dirty = true;
  send(ws, { t: 'songRes', ok: true, msg: `"${tr.name}" is in the queue`, you: youMsg(p) }); broadcast(songsMsg());
}

function board(ws) {
  const rows = Object.values(players).map(p => { const set = world.byOwner[p.id] || new Set(), first = set.size ? Math.min(...set) : -1; return { id: p.id, name: p.name, worth: R.netWorth(world, p), plots: set.size, at: first >= 0 ? [first % N, (first / N) | 0] : null, co: world.companies[p.id] ? world.companies[p.id].name : '', mayor: !!(election.mayor && election.mayor.id === p.id) }; })
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
    try {
      if (m.t === 'hello') return hello(ws, m);
      const pid = socks.get(ws), p = pid && players[pid]; if (!p) return;
      if (m.t === 'act') act(ws, p, m);
      else if (m.t === 'board') board(ws);
      else if (m.t === 'gift') gift(ws, p, m);
      else if (m.t === 'song') song(ws, p, m);
      else if (m.t === 'company') company(ws, p, m);
      else if (m.t === 'avatar') { const av = R.cleanAvatar(m.av); if (!av) send(ws, { t: 'avatarRes', ok: false, msg: 'Pick a valid look.' }); else { p.av = av; dirty = true; send(ws, { t: 'avatarRes', ok: true, av }); } }
      else if (m.t === 'run') vote(ws, p, m, true);
      else if (m.t === 'vote') vote(ws, p, m, false);
      else if (m.t === 'sync') { settleP(p, now()); send(ws, Object.assign(youMsg(p), { now: now() })); }
    } catch (e) { console.error('message error:', e && e.stack || e); }
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
  const ts = now(); rollover(ts); raids(ts);
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
load(); rollover(now());
setInterval(sweep, 60000);
setInterval(save, 5000);
setInterval(() => { if (songPrune(now())) broadcast(songsMsg()); }, 5000);
setInterval(() => { for (const m of [lim.signups, lim.fails]) for (const ip of [...m.keys()]) if (!recent(m, ip, 3600000).length) m.delete(ip); }, 600000);
process.on('SIGTERM', () => { dirty = true; save(); process.exit(0); });
process.on('SIGINT', () => { dirty = true; save(); process.exit(0); });
if (require.main === module) server.listen(PORT, () => console.log(`Shared City on http://localhost:${PORT}`));
module.exports = { server, sweep, raids, rollover, get election() { return election; }, get world() { return world; }, get players() { return players; }, save };
