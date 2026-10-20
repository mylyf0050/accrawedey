// =====================================================
// SHARED STATE + NETWORK. The server decides everything that matters (money, land, who owns what).
// This file keeps a copy of the world, previews actions with the same shared rules, and sends them.
// =====================================================
const R = Rules;
const { N, HOUR, DAYMS, MAXAWAY, CUR, START_MONEY, WAGE, ROAD, LAND, CATALOG, TIERS, CIVIC, ZONES, key, fmt, rentDaily, leaseCost, projectDay, dayYield, clamp } = R;
const fmtK = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k' : String(Math.round(n));

let world = R.makeWorld();
const me = { id: 0, name: '', money: 0, t: 0, born: 0, jail: null, life: { hunger:72, energy:70, fun:55, social:45, hygiene:65, bladder:40 } }; window.meId=0; window.lifeState=me.life;
let timeOff = 0;                                   // server clock minus this device's clock: players cannot gain time by changing their clock
const now = () => Date.now() + timeOff;
let election = { week: -1, endsAt: 0, mayor: null, cands: [] }, ballot = 0;
let online = 1, roadCount = 0, TYPES = [], zoneView = false;
const model = { get grid() { return world.grid; }, get land() { return world.land; }, get money() { return me.money; } };   // read-only view used by the renderer
const landPrice = (x, y) => R.landPrice(world, x, y);
const nearRoad = (x, y) => R.nearRoad(world, x, y);
const landOf = (x, y) => world.land[key(x, y)] || null;
const nameOf = id => world.names[id] || 'Player';
let C = null;
const dirty = () => { C = null; };
const cen = () => C || (C = R.census(world, me.id));
const plan = (x, y, T) => R.plan(world, me, T, x, y, cen(), now());

// ---------- network ----------
let ws = null, wantOpen = true, started = false, reqId = 0;
const pending = new Map(), handlers = {};
const wsURL = () => { const q = new URLSearchParams(location.search).get('server'); return (location.protocol === 'https:' ? 'wss://' : 'ws://') + (q || location.host); };
const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
function sendMsg(o) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
function connect() {
  try { ws = new WebSocket(wsURL()); } catch (e) { setTimeout(connect, 2000); return; }
  ws.onopen = () => { handlers.status && handlers.status(true); sendMsg({ t: 'hello', token: store.get('cb-token') || undefined }); };
  ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } onMsg(m); };
  ws.onclose = () => { for (const [, f] of pending) f({ ok: false, msg: 'Connection lost' }); pending.clear(); handlers.status && handlers.status(false); setTimeout(connect, 2000); };
  ws.onerror = () => {};
}
function sendLifeAction(action) { return new Promise(res => { if (!ws || ws.readyState !== 1) return res({ok:false,msg:'Not connected to the city.'}); const rid=++reqId; pending.set(rid,res); sendMsg({t:'life',action,rid}); setTimeout(()=>{if(pending.delete(rid))res({ok:false,msg:'The city did not answer.'});},6000); }); }
window.doLifeAction = async action => { const r=await sendLifeAction(action); if(r.life){ Object.assign(me.life,r.life); window.lifeState=me.life; } if(r.you){ me.money=r.you.money; me.t=r.you.ts; me.fedUntil=r.you.fed; } handlers.notice && handlers.notice({kind:r.ok?'ok':'err',msg:r.msg||'Done'}); return r; };
window.sendLifePosition = (x,z) => sendMsg({t:'lifePos',x,z});
function sendAct(x, y, tool) {
  return new Promise(res => {
    if (!ws || ws.readyState !== 1) return res({ ok: false, msg: 'Not connected to the city. Reconnecting...' });
    const rid = ++reqId; pending.set(rid, res);
    sendMsg({ t: 'act', tool, x, y, rid });
    setTimeout(() => { if (pending.delete(rid)) res({ ok: false, msg: 'The city did not answer. Try again.' }); }, 6000);
  });
}
function applyTile(tl, animate) {
  const k = key(tl.x, tl.y), was = world.grid[tl.y][tl.x], g = TYPES[tl.g] || 'empty';
  if (was === 'road') roadCount--; if (g === 'road') roadCount++;
  world.grid[tl.y][tl.x] = g;
  if (tl.L) R.setLand(world, k, tl.L); else R.delLand(world, k);
  if (tl.c) world.cracked[k] = 1; else delete world.cracked[k];
  if (animate && g !== was && g !== 'empty') handlers.born && handlers.born(k);
}
function onMsg(m) {
  if (m.t === 'join') return handlers.join && handlers.join();
  if (m.t === 'authErr') return handlers.authErr && handlers.authErr(m);
  if (m.t === 'init') {
    TYPES = m.world.types; world = R.makeWorld(); roadCount = 0;
    for (let i = 0; i < N * N; i++) { const g = TYPES[m.world.grid[i]] || 'empty'; world.grid[(i / N) | 0][i % N] = g; if (g === 'road') roadCount++; }
    world.land = {}; for (const k in m.world.land) world.land[k] = m.world.land[k];
    world.cracked = m.world.cracked; world.names = m.world.names; world.jobs = m.world.jobs || {}; world.companies = m.world.companies || {}; world.cars = m.world.cars || {}; R.reindex(world); R.initCivic(world);
    me.bg = m.you.bg; me.av = m.you.av; Object.assign(me, { id: m.you.id, name: m.you.name, money: m.you.money, t: m.you.ts, born: m.you.born, jail: m.you.jail, fedUntil: m.you.fed }); if(m.you.life) Object.assign(me.life,m.you.life); window.meId=me.id; window.lifeState=me.life;
    timeOff = m.now - Date.now(); dirty();
    if (m.token) store.set('cb-token', m.token); store.set('cb-name', m.you.name);
    handlers.init && handlers.init(m);
  } else if (m.t === 'lifeRes') { const f=pending.get(m.rid); pending.delete(m.rid); if(m.life)Object.assign(me.life,m.life); if(m.you){me.money=m.you.money;me.t=m.you.ts;me.fedUntil=m.you.fed;} window.lifeState=me.life; f&&f(m); handlers.life&&handlers.life(m); }
  else if (m.t === 'lifePlayers') window.dispatchEvent(new CustomEvent('lifePlayers',{detail:m.list||[]}));
  else if (m.t === 'lifePlayer') window.dispatchEvent(new CustomEvent('lifePlayer',{detail:m}));
  else if (m.t === 'lifeGone') window.dispatchEvent(new CustomEvent('lifeGone',{detail:m.id}));
  else if (m.t === 'res') { const f = pending.get(m.rid); pending.delete(m.rid); if (m.you) { me.money = m.you.money; me.t = m.you.ts; me.jail = m.you.jail; if (m.you.fed !== undefined) me.fedUntil = m.you.fed; } f && f(m); }
  else if (m.t === 'tiles') { for (const tl of m.list) applyTile(tl, true); dirty(); handlers.changed && handlers.changed(); }
  else if (m.t === 'you') { me.money = m.money; me.t = m.ts; me.jail = m.jail; if (m.fed !== undefined) me.fedUntil = m.fed; if (m.life) Object.assign(me.life,m.life); window.lifeState=me.life; if (m.now) timeOff = m.now - Date.now(); dirty(); }
  else if (m.t === 'jobs') { for (const e of m.list) R.setJob(world, e.p, e.j); dirty(); handlers.changed && handlers.changed(); }
  else if (m.t === 'avatarRes') { if (m.ok) me.av = m.av; handlers.avatarRes && handlers.avatarRes(m); }
  else if (m.t === 'cars') { for (const e of m.list) { if (e.c) world.cars[e.p] = e.c; else delete world.cars[e.p]; } dirty(); handlers.changed && handlers.changed(); }
  else if (m.t === 'company') { if (m.co) world.companies[m.id] = m.co; else delete world.companies[m.id]; dirty(); handlers.changed && handlers.changed(); }
  else if (m.t === 'election') { election = m; handlers.panel && handlers.panel(); }
  else if (m.t === 'ballot') { ballot = m.vote; handlers.panel && handlers.panel(); }
  else if (m.t === 'companyRes' || m.t === 'electionRes') { if (m.you) { me.money = m.you.money; me.t = m.you.ts; me.jail = m.you.jail; dirty(); } handlers.simple && handlers.simple(m); }
  else if (m.t === 'giftRes') { if (m.you) { me.money = m.you.money; me.t = m.you.ts; me.jail = m.you.jail; dirty(); } handlers.gift && handlers.gift(m); }
  else if (m.t === 'name') world.names[m.id] = m.name;
  else if (m.t === 'online') { online = m.n; handlers.online && handlers.online(); }
  else if (m.t === 'notice') handlers.notice && handlers.notice(m);
  else if (m.t === 'board') handlers.board && handlers.board(m);
}
