// =====================================================
// HUD + INPUT
// =====================================================
const $ = id => document.getElementById(id);
const ICONS = {
  road:  '<path d="M8 3 4 21M16 3l4 18"/><path d="M12 5v3M12 11v3M12 17v3"/>',
  house: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  shop:  '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a3 3 0 0 0 5.3 1.8 3 3 0 0 0 5.4 0A3 3 0 0 0 20 9"/><path d="M5 12v8h14v-8"/><path d="M10 20v-4h4v4"/>',
  park:  '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 21h6"/>',
  school:'<path d="M3 10 12 5l9 5"/><path d="M5 10v9h14v-9"/><path d="M12 5V2h4"/><path d="M10 19v-4h4v4"/>',
  church:'<path d="M12 2v5M10 4h4"/><path d="M12 7 7 11v9h10v-9z"/><path d="M10 20v-4h4v4"/>',
  factory:'<path d="M3 20V10l6 3V10l6 3V6h4v14z"/><path d="M7 20v-3M12 20v-3"/>',
  club:  '<circle cx="12" cy="8" r="5"/><path d="M12 3v10M7 8h10"/><path d="M8 21l4-8 4 8"/>',
  airport:'<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/>',
  market: '<path d="M3 9h18l-2-5H5z"/><path d="M5 9v11h14V9M9 20v-6h6v6"/>',
  hospital: '<path d="M5 21V6l7-3 7 3v15z"/><path d="M12 9v6M9 12h6"/>',
  police: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 9v5"/>',
  prison: '<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M9 4v16M15 4v16"/>',
  den:   '<path d="M3 20V10l9-6 9 6v10z"/><path d="M9 20v-5h6v5M12 12v.01"/>',
  land:  '<path d="M12 3 21 8l-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  build: '<path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/><path d="M9 10h.01M15 10h.01"/>',
  sell:  '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
  mine:  '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chopbar: '<path d="M4 11h16l-1.5 8h-13z"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  trotro: '<rect x="3" y="6" width="18" height="10" rx="2"/><path d="M3 11h18M7 19h.01M17 19h.01"/>',
  jobs:  '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 14h18"/>',
  players: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 3-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.5 0 4.5 2 4.5 5"/>',
  pan:   '<path d="M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>'
};
const svg = k => `<svg viewBox="0 0 24 24">${ICONS[k]}</svg>`;
const MODES = { buy: 'Buy', rent: 'Rent', lease: 'Lease' };
let tool = { k: 'road' }, lastMode = 'buy', lastItem = 'house';
const dock = $('dock');
function addTool(k, label, hotkey) {
  const b = document.createElement('button');
  b.className = 'tool'; b.dataset.key = k; b.title = `${label} (${hotkey})`;
  b.innerHTML = `${svg(k)}<span>${label}</span><em></em>`;
  b.onclick = () => selectTool(k, true);
  dock.appendChild(b);
}
addTool('pan', 'Move', 1); addTool('road', 'Road', 2);
dock.appendChild(Object.assign(document.createElement('div'), { className: 'sep' }));
addTool('land', 'Land', 3); addTool('build', 'Build', 4); addTool('sell', 'Sell', 5);

function selectTool(k, fromUser) {
  const again = tool.k === k;
  if (k === 'land') tool = { k, mode: lastMode };
  else if (k === 'build') tool = { k, item: lastItem };
  else tool = { k };
  if (fromUser && (k === 'land' || k === 'build')) { tab = k; setSheet(!(again && sheetOpen)); }
  else if (sheetOpen) setSheet(false);
  zoneView = k === 'land' || k === 'build';
  canvas.style.cursor = k === 'pan' ? 'grab' : 'crosshair';
  if (k === 'sell' && fromUser) toast('Tap a building or plot to sell it', 'info');
  refreshDock(); tagKey = '';
}
function refreshDock() {
  dock.querySelectorAll('.tool').forEach(c => {
    const k = c.dataset.key, em = c.querySelector('em'); c.classList.toggle('on', tool.k === k);
    let cost = 0, txt = '';
    if (k === 'road') { cost = ROAD.cost; txt = fmtK(cost); }
    else if (k === 'land') txt = MODES[lastMode];
    else if (k === 'build') { cost = CATALOG[lastItem].cost; txt = CATALOG[lastItem].name; }
    em.textContent = txt; c.classList.toggle('cant', !!cost && model.money < cost);
  });
}

// ---------- toast ----------
const toastEl = $('toast'); let toastTimer = 0;
toastEl.addEventListener('click', () => { toastEl.classList.remove('show'); });
function toast(msg, kind) {
  toastEl.className = 'glass show ' + (kind || 'err'); toastEl.textContent = msg;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ---------- HUD ----------
let lastHintHtml = '', lastBrand = '', warnHid = '', warnShown = null, hintClosed = false;
try { hintClosed = localStorage.getItem('cb-hint-x') === '1'; } catch (e) {}
function refreshStats() {
  S = cen(); S.roads = roadCount;
  const dow = new Date(now()).getUTCDay(), pr = projectDay(S, dow);
  $('vMoney').textContent = fmt(model.money);
  const net = pr.net; $('vIncome').textContent = (net >= 0 ? '+' : '-') + fmtK(Math.abs(net)) + '/day'; $('vIncome').classList.toggle('neg', net < 0);
  $('vPop').textContent = S.pop; $('vJobs').textContent = S.jobs;
  $('vHappy').textContent = S.happy + '%'; $('barHappy').style.width = S.happy + '%';
  const w = $('warn'), ts = now(); let msg = '';
  if (me.jail && me.jail.until > ts) { const m = Math.ceil((me.jail.until - ts) / 60000); msg = `! In prison: ${Math.floor(m / 60)}h ${m % 60}m left`; }
  else if (S.late) msg = '! Rent unpaid: plots will be taken back';
  else if (S.soonest < ts + 3 * DAYMS) msg = `! A lease ends in ${Math.max(1, Math.ceil((S.soonest - ts) / DAYMS))}d`;
  else if (R.dumsorAt(ts).on) { const u = new Date(R.dumsorAt(ts).until); msg = '! Dumsor: power cut until midnight, shops and clubs earn 40% less'; }
  else if (me.fedUntil !== undefined && me.fedUntil < ts) msg = '! Hungry: income halved. Open the Food tab and eat';
  else if (S.unconnected) msg = S.unconnected > 1 ? `! ${S.unconnected} buildings need a road` : '! 1 building needs a road';
  if (msg && msg === warnHid) msg = '';
  w.style.display = msg ? 'flex' : 'none'; if (msg !== warnShown) { warnShown = msg; w.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = msg; const bx = document.createElement('button'); bx.className = 'x'; bx.textContent = '×'; bx.setAttribute('aria-label', 'Dismiss'); w.append(sp, bx); }
  updateEnergy(ts); updateShift(ts);
  refreshDock(); updateGuide();
  const day = Math.floor((ts - me.born) / DAYMS) + 1, nm = `${me.name} · Day ${day}`; if (nm !== lastBrand) { lastBrand = nm; $('brand').querySelector('b').textContent = nm; }
}
function updateGuide() {
  const own = S.own + S.rent + S.lease > 0, house = S.blds.some(b => b.k === 'house'), road = S.blds.some(b => b.k === 'house' && b.ok);
  const steps = [['Get a plot of land', 'Tap Land, choose Buy, then tap a grass tile', own], ['Build a house on it', 'Tap Build, pick House, tap your plot', house], ['Get a working road next to it', 'Tap Road: repair a cracked road or lay a new one beside the house', road]];
  const el = $('hint');
  if (hintClosed || own && house && road || S.built > 3) { el.style.opacity = 0; el.style.pointerEvents = 'none'; return; }
  el.style.opacity = 1; const cur = steps.findIndex(s => !s[2]);
  const html = `<button class="x" data-close="1" aria-label="Close">×</button><b>Welcome.</b> You start with ${fmt(START_MONEY)}. Earnings come in real time (Ghana time), so every cedi counts.<ul>` +
    steps.map((s, i) => `<li class="${s[2] ? 'done' : i === cur ? 'now' : ''}"><i>${s[2] ? '✓' : i + 1}</i><span>${s[0]}${i === cur ? `<br><small style="color:var(--muted)">${s[1]}</small>` : ''}</span></li>`).join('') + '</ul>';
  if (html !== lastHintHtml) { lastHintHtml = html; el.innerHTML = html; }
}

// ---------- the pull-down Market sheet ----------
const sheet = $('sheet'), scrim = $('scrim'), panel = $('panel'); let sheetOpen = false, tab = 'build', openedAt = 0;
const TABS = [['me', 'Me', 'players'], ['build', 'Build', 'build'], ['land', 'Land', 'land'], ['mine', 'My Properties', 'mine'], ['jobs', 'Jobs', 'jobs'], ['food', 'Food', 'shop'], ['city', 'City', 'players'], ['players', 'Players', 'players']];
let boardRows = null;
function setSheet(open) {
  sheetOpen = open; if (open) openedAt = performance.now(); sheet.style.transform = ''; sheet.classList.toggle('open', open); scrim.classList.toggle('show', open);
  if (open) renderSheet();
}
function renderSheet() {
  $('tabs').innerHTML = TABS.map(([k, l, ic]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${svg(ic)}${l}</button>`).join('');
  const st = panel.scrollTop;
  if (tab === 'players' && !boardRows) sendMsg({ t: 'board' });
  if (tab === 'city' && !election.week && election.week !== 0 && !election.ask) { election.ask = 1; sendMsg({ t: 'sync' }); }
  panel.innerHTML = tab === 'me' ? panelMe() : tab === 'build' ? panelBuild() : tab === 'land' ? panelLand() : tab === 'players' ? panelPlayers() : tab === 'jobs' ? panelJobs() : tab === 'food' ? panelFood() : tab === 'city' ? panelCity() : panelMine();
  panel.scrollTop = st;
}
const hoursLine = k => CATALOG[k].hours;
function panelBuild() {
  let h = `<div class="help">Money now: <b style="color:var(--gold)">${fmt(model.money)}</b>. You need land first (Land tab). Bigger buildings cost far more but earn more, and unlock as your town grows.</div>`;
  h += '<div class="grid">';
  for (const tier of TIERS) {
    const ks = Object.keys(CATALOG).filter(k => CATALOG[k].tier === tier); if (!ks.length) continue;
    h += `<div class="tier">${tier}</div>`;
    for (const k of ks) {
      const d = CATALOG[k], lock = S.pop < d.unlock, y = dayYield(k), on = tool.k === 'build' && tool.item === k;
      h += `<button class="card ${on ? 'on' : ''} ${lock ? 'locked' : ''}" data-act="pickBuild" data-k="${k}">
        <div class="ch">${svg(ICONS[k] ? k : 'house')}<b>${d.name}</b>${d.illegal ? '<span class="chip" style="background:#f87171">illegal</span>' : ''}</div><div class="price">${fmt(d.cost)}</div>
        <div class="line">${y ? `Earns up to <b>${fmt(y)}/day</b>` : 'No income'} · costs ${fmt(d.upkeep)}/day</div>
        <div class="line">${hoursLine(k)}</div>
        <div class="line">${d.homes ? `Homes ${d.homes} · ` : ''}Jobs ${d.jobs} · ${d.zones.split('').map(q => ZONES[q]).join(' / ')}</div>
        ${lock ? `<div class="lock">Locked: needs ${d.unlock} residents</div>` : `<div class="note">${d.blurb}</div>`}</button>`;
    }
  }
  return h + '</div>';
}
function panelLand() {
  const lo = landPrice(0, 0), hi = landPrice(N / 2, N / 2), r = rentDaily(hi);
  const cards = [
    ['buy', 'Buy', 'Own the plot for good. Pay the full price once. You can sell it back for 70%.', `From ${fmt(lo)} (edge) to ${fmt(hi)} (city centre)`],
    ['rent', 'Rent', `No big payment. Pay about 1.2% of the plot's price every day, cancel any time. Miss payments for 24 hours and you are evicted.`, `Centre plot: about ${fmt(r)}/day`],
    ['lease', 'Lease', `Pay 30% up front for 30 days with no daily fee. Cheaper than renting for long stays, but the plot (and what you built) is lost when it ends unless you renew or buy it out.`, `Centre plot: ${fmt(leaseCost(hi))} for 30 days`]
  ];
  return `<div class="help">Land costs more near the city centre and beside roads. Pick how you want to hold a plot, then tap grass on the map. Tap a rented or leased plot with <b>Buy</b> to own it, or with <b>Lease</b> to renew.</div><div class="grid">` +
    cards.map(([m, n, d, p]) => `<button class="card big ${tool.k === 'land' && tool.mode === m ? 'on' : ''}" data-act="pickLand" data-m="${m}"><div class="ch">${svg('land')}<b>${n} land</b></div><div class="price">${p}</div><div class="note">${d}</div></button>`).join('') + '</div>';
}
function panelMine() {
  const ts = now(), pr = projectDay(S, new Date(ts).getUTCDay());
  const rows = [];
  for (const k of (world.byOwner[me.id] || [])) {
    const L = world.land[k], x = k % N, y = (k / N) | 0, g = world.grid[y][x], p = plan(x, y, { k: 'sell' }), d = CATALOG[g];
    const detail = L.t === 'lease' ? `ends in ${Math.max(0, Math.ceil((L.end - ts) / DAYMS))} days` : L.t === 'rent' ? `${fmt(rentDaily(landPrice(x, y)))}/day${L.ls ? ' (UNPAID)' : ''}` : `worth ${fmt(landPrice(x, y) * LAND.sell)}`;
    rows.push({ x, y, g, L, p, d, detail, v: (d ? d.cost : 0) + landPrice(x, y) });
  }
  rows.sort((a, b) => b.v - a.v);
  let h = `<div class="sum"><div><span>Net per day</span><b>${pr.net >= 0 ? '+' : '-'}${fmt(Math.abs(pr.net))}</b></div><div><span>Plots</span><b>${S.own} own · ${S.rent} rent · ${S.lease} lease</b></div><div><span>Rent per day</span><b>${fmt(S.rentDay)}</b></div></div>
    <div class="help">Selling a building returns 60% of what you paid. Selling land returns 70% of its price. Ending a rent or lease returns nothing. <button class="card" style="display:inline-flex;margin-left:6px;padding:6px 12px;border-radius:11px" data-act="sellMode">Sell by tapping the map</button></div>`;
  h += panelAssets();
  if (!rows.length) return h + '<div class="empty">You do not own anything yet. Open the Land tab to get your first plot.</div>';
  for (const r of rows.slice(0, 60)) {
    const col = TEN[r.L.t];
    h += `<div class="row"><div class="nm"><b>${r.d ? r.d.name : r.g === 'road' ? 'Road' : 'Empty plot'}<span class="chip" style="background:${col}">${r.L.t}</span></b><small>Plot ${r.x},${r.y} · ${r.detail}</small></div>
      <button data-act="go" data-x="${r.x}" data-y="${r.y}">Show</button>
      <button class="danger" data-act="sell" data-x="${r.x}" data-y="${r.y}">${r.p.verb}${r.p.gain ? ' ' + fmtK(r.p.gain) : ''}</button></div>`;
  }
  return h;
}
function panelJobs() {
  const esc = t => String(t).replace(/</g, '&lt;');
  const jobNow = C0().job;
  let h = `<div class="help">Everyone pays about <b>${fmt(R.LIVING)}</b> a day for transport and utilities, and must eat (Food tab) or income is halved. With no job you earn ${fmt(R.WAGE)} a day from odd jobs. A job pays more, and the owner pays your salary while the place is open. Off shift, a side hustle earns ${fmt(R.SIDE_HR)} an hour.</div>`;
  if (jobNow) {
    const d = CATALOG[jobNow.g], L = landOf(jobNow.k % N, (jobNow.k / N) | 0);
    h += `<div class="sum"><div><span>Your job</span><b>${d.name}</b></div><div><span>Pay</span><b>${fmt(d.sal)}/day</b></div><div><span>Employer</span><b>${L && L.o ? esc(nameOf(L.o)) : 'City'}</b></div></div>` +
      `<div class="row"><div class="nm"><b>${d.name} · ${d.hours}</b><small>Paid hourly while it is open</small></div><button data-act="go" data-x="${jobNow.k % N}" data-y="${(jobNow.k / N) | 0}">Show</button><button class="danger" data-act="quit">Quit job</button></div>`;
  } else h += `<div class="empty" style="padding:8px 4px;text-align:left">You have no job. Pick one below.</div>`;
  h += panelOwnerJobs();
  const list = R.openJobs(world).filter(j => j.o !== me.id && !(jobNow && jobNow.k === j.k)).sort((a, b) => (b.free > 0) - (a.free > 0) || b.sal - a.sal).slice(0, 40);
  h += '<div class="tier">Open positions</div>';
  h += list.length ? list.map(j => { const d = CATALOG[j.g];
    return `<div class="row"><div class="nm"><b>${d.name}<span class="chip" style="background:${j.o ? '#f9a8d4' : '#cbd5e1'}">${j.o ? esc(nameOf(j.o)) : 'City'}</span></b><small>${fmt(j.sal)}/day · ${j.free} of ${j.slots} free · ${d.hours}</small></div>` +
      `<button data-act="go" data-x="${j.x}" data-y="${j.y}">Show</button><button data-act="apply" data-x="${j.x}" data-y="${j.y}" ${j.free > 0 && !jobNow ? '' : 'disabled'}>${j.free > 0 ? 'Apply' : 'Full'}</button></div>`; }).join('')
    : '<div class="empty">No workplaces are open yet.</div>';
  return h;
}
const C0 = () => cen();
// ---------- avatar and room ----------
const SKIN = ['#f1c9a5', '#e0ac7e', '#c68642', '#a0693a', '#7a4a2a', '#4b2e1c'], HAIRC = ['#1a1a1a', '#3b2314', '#6b4226', '#b5651d', '#bdbdbd', '#7b2cbf'], OUTC = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#f1f5f9'];
const HAIRN = ['Low cut', 'Afro', 'Long braids', 'Bun', 'Bald'];
function avatarSVG(av) {
  av = av || { g: 0, s: 2, h: 0, c: 0, o: 1 }; const sk = SKIN[av.s], hc = HAIRC[av.c], oc = OUTC[av.o], f = av.g === 1;
  let hairBack = '', hairFront = '';
  if (av.h === 1) hairBack = `<circle cx="32" cy="25" r="19" fill="${hc}"/>`;
  else if (av.h === 2) hairBack = `<path d="M13 26q0-17 19-17t19 17v30h-8V30H21v26h-8z" fill="${hc}"/>`;
  else if (av.h === 3) hairBack = `<circle cx="32" cy="7" r="7" fill="${hc}"/>`;
  if (av.h === 0) hairFront = `<path d="M17 24q0-14 15-14t15 14q-8-7-15-7t-15 7z" fill="${hc}"/>`;
  else if (av.h === 1) hairFront = `<path d="M16 26q0-13 16-13t16 13q-6-8-16-8t-16 8z" fill="${hc}"/>`;
  else if (av.h === 2 || av.h === 3) hairFront = `<path d="M17 26q0-15 15-15t15 15q-9-8-15-8t-15 8z" fill="${hc}"/>`;
  const body = f ? `<path d="M18 70q0-17 14-17t14 17v8H18z" fill="${oc}"/>` : `<path d="M14 78v-8q0-17 18-17t18 17v8z" fill="${oc}"/>`;
  return `<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">${hairBack}${body}<rect x="28" y="42" width="8" height="12" rx="3" fill="${sk}"/><ellipse cx="32" cy="30" rx="13" ry="15" fill="${sk}"/>${hairFront}<circle cx="27" cy="31" r="1.6" fill="#1b1b1b"/><circle cx="37" cy="31" r="1.6" fill="#1b1b1b"/>${f ? '<path d="M24.5 28.5l-2-1M39.5 28.5l2-1" stroke="#1b1b1b" stroke-width="1" stroke-linecap="round"/>' : ''}<path d="M28 38q4 3.5 8 0" stroke="#7a2e2e" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
}
function roomSVG(av, lvl, hasHome, hr) {
  const night = hr < 6 || hr >= 19, sky = night ? '#0f1b3d' : '#7ec8f5', wall = night ? '#3a3350' : '#e9d8b4', floor = night ? '#4a3a2a' : '#b98a5a';
  let s = `<svg viewBox="0 0 320 190" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="190" fill="${wall}"/><rect y="140" width="320" height="50" fill="${floor}"/>`;
  s += `<rect x="215" y="30" width="80" height="70" rx="4" fill="${sky}" stroke="#6b5233" stroke-width="5"/>${night ? '<circle cx="270" cy="52" r="9" fill="#f5f0c8"/><circle cx="232" cy="48" r="1.4" fill="#fff"/><circle cx="250" cy="82" r="1.4" fill="#fff"/>' : '<circle cx="272" cy="52" r="11" fill="#ffd54a"/>'}<path d="M255 30v70M215 65h80" stroke="#6b5233" stroke-width="3"/>`;
  s += hasHome ? `<rect x="14" y="112" width="92" height="34" rx="5" fill="#5b7bd5"/><rect x="14" y="104" width="30" height="20" rx="6" fill="#f4f4f4"/><rect x="10" y="100" width="6" height="50" fill="#6b4a2a"/>` : `<rect x="14" y="132" width="92" height="14" rx="4" fill="#9aa5b1"/><text x="14" y="124" fill="#555" font-size="10">Shared room: no home yet</text>`;
  if (lvl >= 1) s += `<ellipse cx="160" cy="165" rx="60" ry="12" fill="#c0392b" opacity=".85"/><rect x="118" y="70" width="60" height="38" rx="3" fill="#111"/><rect x="122" y="74" width="52" height="30" fill="${night ? '#5fb0ff' : '#2a2a2a'}"/><rect x="140" y="108" width="16" height="30" fill="#6b4a2a"/>`;
  if (lvl >= 2) s += `<rect x="296" y="108" width="8" height="40" fill="#6b4a2a"/><path d="M290 108h20l-4-16h-12z" fill="#ffd54a"/><circle cx="196" cy="128" r="12" fill="#2e8b57"/><rect x="192" y="136" width="8" height="12" fill="#8b5a2b"/>`;
  return s + `<svg x="128" y="${lvl >= 1 ? 68 : 76}" width="62" height="78" viewBox="0 0 64 80">${avatarSVG(av).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg></svg>`;
}
function bar(label, pct, col, txt) { return `<div class="bar"><span>${label} <b>${txt}</b></span><i><u style="width:${Math.max(2, Math.min(100, pct))}%;background:${col}"></u></i></div>`; }
function energyPct(ts) { return Math.max(0, Math.min(1, ((me.fedUntil || 0) - ts) / (R.FEED_CAP || 72 * 3600000))); }
function updateEnergy(ts) {
  const p = energyPct(ts), bar = $('enBar'); if (!bar) return;
  bar.style.width = Math.max(4, p * 100) + '%'; bar.style.background = p > .35 ? '#22c55e' : p > .12 ? '#f59e0b' : '#ef4444';
  const h = Math.max(0, ((me.fedUntil || 0) - ts) / 3600000); $('enTxt').textContent = h >= 1 ? Math.floor(h) + 'h' : h > 0 ? '<1h' : 'Hungry';
}
// ---------- shift: workplace card, time left to clock out ----------
const fmtDur = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'; };
const hhmm = t => { const d = new Date(t); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); };
function shiftState(ts) { const j = C0().job; if (!j) return null; const s = R.shiftInfo(j, ts); return s ? Object.assign({ j, d: CATALOG[j.g], s }, {}) : null; }
function updateShift(ts) {
  const el = $('shift'), st = shiftState(ts); if (!st) { el.className = 'glass pill'; if (shiftCardOpen) closeShiftCard(); return; }
  const { s } = st; el.className = 'glass pill on ' + (s.on ? 'on' : 'off');
  $('shTxt').textContent = s.on ? (s.end ? `On shift · ${fmtDur(s.end - ts)} left` : 'On shift · open 24h') : `Off shift · starts in ${s.end ? fmtDur(s.end - ts) : '?'}`;
  if (shiftCardOpen) drawShiftCard(ts);
}
let shiftCardOpen = false; const scEl = $('shiftcard');
function drawShiftCard(ts) {
  const st = shiftState(ts); if (!st) return; const { j, d, s } = st, L = landOf(j.k % N, (j.k / N) | 0), boss = L && L.o ? esc2(nameOf(L.o)) : 'City';
  const pct = s.on && s.end ? Math.round((ts - s.start) / (s.end - s.start) * 100) : s.on ? 50 : 0;
  scEl.innerHTML = `<button class="sx" aria-label="Close">×</button><div class="wp">${svg(ICONS[j.g] ? j.g : 'house')}<div><h3>${s.on ? 'Your shift is on' : 'Off shift'}</h3><small>${d.name} · ${boss}</small></div></div>` +
    (s.on ? `<div><b>${s.end ? fmtDur(s.end - ts) + ' left' : 'Open 24 hours'}</b> <small>${s.end ? 'until you clock out at ' + hhmm(s.end) : 'pay runs hourly while it is open'}</small></div><div class="pb"><u style="width:${pct}%"></u></div><small>Pay ${fmt(d.sal)}/day while open. After you clock out, your side hustle earns ${fmt(R.SIDE_HR)} an hour.</small>`
      : `<div><b>Next shift in ${s.end ? fmtDur(s.end - ts) : '?'}</b> <small>${s.end ? 'at ' + hhmm(s.end) : ''}</small></div><small>Side hustle: ${fmt(R.SIDE_HR)} an hour while you are off shift.</small>`) +
    `<button class="go" data-go="1">Show my workplace</button>`;
}
function openShiftCard() { shiftCardOpen = true; scEl.classList.add('show'); drawShiftCard(now()); }
function closeShiftCard() { shiftCardOpen = false; scEl.classList.remove('show'); }
scEl.addEventListener('click', e => { if (e.target.closest('.sx')) closeShiftCard(); else if (e.target.closest('[data-go]')) { const j = C0().job; if (j) { closeShiftCard(); focusTile(j.k % N, (j.k / N) | 0); } } });
$('shift').addEventListener('click', () => shiftCardOpen ? closeShiftCard() : openShiftCard());
function morningShift() {   // on sign-in during a shift: open the workplace and show the clock-out time
  const ts = now(), st = shiftState(ts); if (!st || !st.s.on) return;
  let seen = ''; try { seen = sessionStorage.getItem('cb-shift') || ''; } catch (e) {} const id = me.id + ':' + st.s.start; if (seen === id) return;
  try { sessionStorage.setItem('cb-shift', id); } catch (e) {}
  focusTile(st.j.k % N, (st.j.k / N) | 0); openShiftCard();
}
function panelMe() {
  const ts = now(), hr = (new Date(ts).getUTCHours()), bg = R.BACKGROUNDS[me.bg || 'mid'] || R.BACKGROUNDS.mid, pr = projectDay(S, new Date(ts).getUTCDay());
  let lvl = 0, home = false; for (const k of (world.byOwner[me.id] || [])) { const g = world.grid[(k / N) | 0][k % N]; if (g === 'house') { home = true; lvl = Math.max(lvl, world.land[k].f || 0); } }
  const en = energyPct(ts), left = Math.max(0, ((me.fedUntil || 0) - ts) / 3600000), du = R.dumsorAt(ts), job = C0().job;
  return `<div class="room">${roomSVG(me.av, lvl, home, hr)}</div>
    <div class="bars">${bar('Energy (food)', en * 100, en > .35 ? '#22c55e' : en > .12 ? '#f59e0b' : '#ef4444', left >= 1 ? Math.floor(left) + 'h left' : 'Hungry: income halved')}
    ${bar('Cash', Math.min(100, model.money / 200), '#fbbf24', fmt(model.money))}
    ${bar('Power', du.on ? 40 : 100, du.on ? '#f87171' : '#60a5fa', du.on ? 'Dumsor: power cut' : 'On')}
    ${bar('Home comfort', home ? 34 + lvl * 33 : 8, '#a78bfa', home ? (lvl ? 'Furnished level ' + lvl : 'Empty house') : 'No home')}</div>
    <div class="sum"><div><span>Born</span><b>${bg.name}</b></div><div><span>Net per day</span><b>${pr.net >= 0 ? '+' : '-'}${fmt(Math.abs(pr.net))}</b></div><div><span>Job</span><b>${job ? CATALOG[job.g].name : 'None'}</b></div></div>
    <div class="row"><div class="nm"><b>${esc2(me.name)}</b><small>${bg.story}</small></div><button data-act="look">Change look</button></div>`;
}
// ---------- character creator ----------
const creatorEl = $('creator'); let draft = null;
function drawCreator() {
  $('cPrev').innerHTML = avatarSVG(draft);
  const sw = (key, arr, label) => `<div class="cr"><span>${label}</span><div>${arr.map((c, i) => `<button class="sw ${draft[key] === i ? 'on' : ''}" data-k="${key}" data-i="${i}" style="background:${c}" aria-label="${label} ${i + 1}"></button>`).join('')}</div></div>`;
  $('cOpts').innerHTML = `<div class="cr"><span>Gender</span><div>${['Male', 'Female'].map((n, i) => `<button class="${draft.g === i ? 'on' : ''}" data-k="g" data-i="${i}">${n}</button>`).join('')}</div></div>` + sw('s', SKIN, 'Skin tone') +
    `<div class="cr"><span>Hairstyle</span><div>${HAIRN.map((n, i) => `<button class="${draft.h === i ? 'on' : ''}" data-k="h" data-i="${i}">${n}</button>`).join('')}</div></div>` + sw('c', HAIRC, 'Hair colour') + sw('o', OUTC, 'Outfit colour');
}
function openCreator(first) {
  draft = Object.assign({ g: 0, s: 2, h: 0, c: 0, o: 1 }, me.av || {});
  const bg = R.BACKGROUNDS[me.bg || 'mid'];
  $('cStory').innerHTML = first ? `You were born into: <b>${bg.name}</b>. Starting cash <b>${fmt(bg.money)}</b>.<br>${bg.story}` : 'Change how your character looks. It is free.';
  $('cErr').textContent = ''; $('cGo').textContent = first ? 'Enter the city' : 'Save look'; drawCreator(); creatorEl.classList.add('show'); setSheet(false);
}
$('cOpts').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; draft[b.dataset.k] = +b.dataset.i; drawCreator(); });
$('cGo').addEventListener('click', () => { $('cGo').disabled = true; sendMsg({ t: 'avatar', av: draft }); });
handlers.avatarRes = m => { $('cGo').disabled = false; if (m.ok) { setTimeout(morningShift, 300); creatorEl.classList.remove('show'); if (sheetOpen) renderSheet(); } else $('cErr').textContent = m.msg || 'Could not save'; };
$('energy').addEventListener('click', () => { tab = 'me'; setSheet(true); });
$('hint').addEventListener('click', e => { if (e.target.closest('[data-close]')) { hintClosed = true; try { localStorage.setItem('cb-hint-x', '1'); } catch (er) {} $('hint').style.opacity = 0; $('hint').style.pointerEvents = 'none'; } });
$('warn').addEventListener('click', e => { if (e.target.closest('.x')) { warnHid = warnShown; $('warn').style.display = 'none'; } });
const esc2 = t => String(t).replace(/</g, '&lt;');
function panelFood() {
  const ts = now(), left = (me.fedUntil || 0) - ts, hr = new Date(ts).getUTCHours(), dw = new Date(ts).getUTCDay();
  let h = `<div class="help">${left > 0 ? `You are fed for <b>${Math.floor(left / 3600000)}h ${Math.floor(left % 3600000 / 60000)}m</b>.` : '<b style="color:#f87171">You are hungry.</b> Your income is halved.'} Buy food from any open shop, chop bar or market. The owner keeps 70%. You can stock up to 3 days.</div>`;
  const rows = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const g = world.grid[y][x], f = R.FOOD[g]; if (!f) continue;
    const L = landOf(x, y), civ = R.CIVIC && R.CIVIC[g], open = civ ? dw !== 0 && hr >= 6 && hr < 18 : CATALOG[g].at(hr, dw) > 0;
    rows.push({ x, y, g, f, L, open, civ });
  }
  rows.sort((a, b) => b.open - a.open || a.f.cost / a.f.hours - b.f.cost / b.f.hours);
  h += rows.slice(0, 30).map(r => `<div class="row"><div class="nm"><b>${r.civ ? 'Makola Market' : CATALOG[r.g].name}<span class="chip" style="background:${r.L && r.L.o ? '#f9a8d4' : '#cbd5e1'}">${r.L && r.L.o ? esc2(nameOf(r.L.o)) : 'City'}</span></b><small>${r.f.label} ${fmt(r.f.cost)} · fed ${r.f.hours}h · ${r.open ? 'open' : 'closed now'}</small></div>
    <button data-act="go" data-x="${r.x}" data-y="${r.y}">Show</button><button data-act="eat" data-x="${r.x}" data-y="${r.y}" ${r.open ? '' : 'disabled'}>Eat</button></div>`).join('') || '<div class="empty">No food sellers yet.</div>';
  return h;
}
function panelCity() {
  const e = election, ts = now(), co = world.companies[me.id];
  let h = `<div class="help">The city elects a Mayor every week. The Mayor earns <b>${fmt(R.MAYOR_PAY)}</b> a week. You need an account at least a day old to run or vote.</div>`;
  h += `<div class="sum"><div><span>Mayor</span><b>${e.mayor ? esc2(e.mayor.name) : 'none yet'}</b></div><div><span>Voting ends</span><b>${e.endsAt ? Math.max(0, Math.ceil((e.endsAt - ts) / 3600000)) + 'h' : '-'}</b></div></div>`;
  h += `<div class="tier">Candidates</div>`;
  const cs = (e.cands || []).slice().sort((a, b) => b.votes - a.votes);
  h += cs.length ? cs.map(c => `<div class="row"><div class="nm"><b>${esc2(c.name)}${c.id === me.id ? '<span class="chip" style="background:#fbbf24">you</span>' : ''}</b><small>${c.votes} vote${c.votes === 1 ? '' : 's'}</small></div><button data-act="vote" data-id="${c.id}" ${ballot === c.id ? 'disabled' : ''}>${ballot === c.id ? 'Your vote' : 'Vote'}</button></div>`).join('') : '<div class="empty" style="padding:8px 4px;text-align:left">No candidates yet.</div>';
  if (!(e.cands || []).some(c => c.id === me.id)) h += `<div class="row"><div class="nm"><b>Run for Mayor</b><small>Free to enter this week</small></div><button data-act="run">Run</button></div>`;
  h += `<div class="tier">Your company</div>`;
  if (!co) h += `<div class="row"><div class="nm"><b>Found a company</b><small>${fmt(R.FOUND_COST)} · needs a workplace you own · set pay level for all staff</small></div><button data-act="found">Found</button></div>`;
  else h += `<div class="row"><div class="nm"><b>${esc2(co.name)}</b><small>Pay level ${co.pay}x on every workplace you own</small></div><button data-act="payDown">-0.1</button><button data-act="payUp">+0.1</button></div>`;
  return h;
}
function ownedWork() {
  const out = [];
  for (const k of (world.byOwner[me.id] || [])) { const x = k % N, y = (k / N) | 0, g = world.grid[y][x], d = CATALOG[g]; if (d && d.slots) out.push({ x, y, g, d, L: world.land[k], staff: world.staff[k] || 0 }); }
  return out;
}
function panelOwnerJobs() {
  const ws = ownedWork(); if (!ws.length) return '';
  let h = '<div class="tier">Your workplaces: hiring</div><div class="help">You decide how many positions are open. Staff are paid from your cash, but a fuller workplace earns more (40% empty up to 100% full).</div>';
  return h + ws.map(w => { const open = Math.min(w.d.slots, w.L.h || 0);
    return `<div class="row"><div class="nm"><b>${w.d.name}</b><small>${w.staff} staff · ${open} of ${w.d.slots} open · ${fmt(w.d.sal)}/day each</small></div><button data-act="hire" data-x="${w.x}" data-y="${w.y}" data-n="${Math.max(0, open - 1)}">-</button><button data-act="hire" data-x="${w.x}" data-y="${w.y}" data-n="${Math.min(w.d.slots, open + 1)}">+</button></div>`; }).join('');
}
function panelAssets() {
  let h = ''; const homes = [];
  for (const k of (world.byOwner[me.id] || [])) { const x = k % N, y = (k / N) | 0; if (world.grid[y][x] === 'house' && world.land[k].o === me.id) homes.push({ x, y, f: world.land[k].f || 0 }); }
  if (homes.length) h += '<div class="tier">Furnish your houses</div>' + homes.slice(0, 20).map(o => `<div class="row"><div class="nm"><b>House ${o.x},${o.y}</b><small>Level ${o.f} of 2${o.f < 2 ? ' · next ' + fmt(R.FURNISH_COST[o.f]) + ', +15% income' : ' · full'}</small></div><button data-act="furnish" data-x="${o.x}" data-y="${o.y}" ${o.f < 2 ? '' : 'disabled'}>Furnish</button></div>`).join('');
  const cur = world.cars[me.id];
  h += '<div class="tier">Your vehicle</div>';
  if (cur) h += `<div class="row"><div class="nm"><b>${R.CARS[cur].name}</b><small>Earns while you are not on a job shift</small></div><button class="danger" data-act="vehicle" data-m="sell">Sell ${fmtK(Math.round(R.CARS[cur].cost * 0.5))}</button></div>`;
  else h += Object.keys(R.CARS).map(c => `<div class="row"><div class="nm"><b>${R.CARS[c].name}</b><small>${fmt(R.CARS[c].cost)} · ${R.CARS[c].hours}</small></div><button data-act="vehicle" data-m="buy" data-i="${c}">Buy</button></div>`).join('');
  return h;
}
function panelPlayers() {
  if (!boardRows) return '<div class="empty">Loading the leaderboard...</div>';
  return `<div class="help">Richest players in the city. Net worth is cash plus the resale value of your buildings and land. ${online} online now.</div>` +
    boardRows.map((r, i) => `<div class="row"><div class="nm"><b>${i + 1}. ${r.name.replace(/</g, '&lt;')}${r.id === me.id ? '<span class="chip" style="background:#fbbf24">you</span>' : ''}</b><small>${r.plots} plots</small></div><b style="color:var(--gold)">${fmt(r.worth)}</b>${r.id === me.id ? '' : `<button data-act="gift" data-id="${r.id}" data-name="${r.name.replace(/"/g, '')}">Send</button>`}</div>`).join('');
}
panel.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'pickBuild') {
    const k = b.dataset.k, d = CATALOG[k];
    if (S.pop < d.unlock) { toast(`${d.name} unlocks at ${d.unlock} residents (you have ${S.pop})`); return; }
    lastItem = k; tool = { k: 'build', item: k }; afterPick(`Tap one of your plots to build a ${d.name} (${fmt(d.cost)})`);
  } else if (a === 'pickLand') {
    lastMode = b.dataset.m; tool = { k: 'land', mode: lastMode };
    afterPick({ buy: 'Tap a grass tile to buy it', rent: 'Tap a grass tile to rent it', lease: 'Tap a grass tile to lease it for 30 days' }[lastMode]);
  } else if (a === 'sellMode') { tool = { k: 'sell' }; afterPick('Tap a building or plot to sell it'); }
  else if (a === 'gift') {
    const v = prompt(`Send how much to ${b.dataset.name}? (GH₵10 to 5,000)`, '100'); if (v === null) return;
    const amt = Math.round(+v); if (!(amt >= 10)) { toast('Enter an amount of at least 10'); return; }
    sendMsg({ t: 'gift', to: +b.dataset.id, amt });
  }
  else if (a === 'apply' || a === 'quit') {
    const x = +b.dataset.x || 0, y = +b.dataset.y || 0; b.disabled = true;
    sendAct(x, y, a === 'quit' ? { k: 'job', mode: 'quit' } : { k: 'job', mode: 'apply' }).then(r => { toast(r.ok ? r.done : r.msg || 'Could not do that', r.ok ? 'ok' : undefined); afterChange(); });
  }
  else if (a === 'eat') sendAct(+b.dataset.x, +b.dataset.y, { k: 'eat' }).then(r => { toast(r.ok ? r.done : r.msg || 'Could not eat', r.ok ? 'ok' : undefined); afterChange(); });
  else if (a === 'hire') sendAct(+b.dataset.x, +b.dataset.y, { k: 'hire', n: +b.dataset.n }).then(r => { toast(r.ok ? r.done : r.msg, r.ok ? 'ok' : undefined); afterChange(); });
  else if (a === 'furnish') sendAct(+b.dataset.x, +b.dataset.y, { k: 'furnish' }).then(r => { toast(r.ok ? r.done : r.msg, r.ok ? 'ok' : undefined); afterChange(); });
  else if (a === 'vehicle') sendAct(0, 0, { k: 'vehicle', mode: b.dataset.m, item: b.dataset.i }).then(r => { toast(r.ok ? r.done : r.msg, r.ok ? 'ok' : undefined); afterChange(); });
  else if (a === 'run') sendMsg({ t: 'run' });
  else if (a === 'vote') sendMsg({ t: 'vote', for: +b.dataset.id });
  else if (a === 'found') { const n = prompt('Company name (3 to 24 letters)'); if (n) sendMsg({ t: 'company', name: n }); }
  else if (a === 'payUp' || a === 'payDown') { const c = world.companies[me.id]; if (c) sendMsg({ t: 'company', pay: Math.round((c.pay + (a === 'payUp' ? 0.1 : -0.1)) * 10) / 10 }); }
  else if (a === 'look') openCreator(false);
  else if (a === 'go') { setSheet(false); focusTile(+b.dataset.x, +b.dataset.y); }
  else if (a === 'sell') { sendAct(+b.dataset.x, +b.dataset.y, { k: 'sell' }).then(r => { if (r.ok) { toast(`${r.done}${r.gain ? ' +' + fmt(r.gain) : ''}`, 'ok'); afterChange(); } else toast(r.msg); }); }
});
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderSheet(); } });
function afterPick(msg) { canvas.style.cursor = 'crosshair'; setSheet(false); refreshDock(); toast(msg, 'info'); }
function focusTile(gx, gy) {
  cam.x = canvas.width / 2 - (gx - gy) * TW / 2 * cam.z; cam.y = canvas.height / 2 - (gx + gy + 1) * TH / 2 * cam.z; clampCamera();
}
function afterChange() { refreshStats(); if (sheetOpen) renderSheet(); }

// drag the sheet down from the Market pill, or up from its handle
let sdrag = null;
function sheetDown(e) {
  const h = sheet.offsetHeight + 24;
  sdrag = { y0: e.clientY, t0: performance.now(), h, base: sheetOpen ? 0 : -h, moved: false, pos: sheetOpen ? 0 : -h, id: e.pointerId, el: e.currentTarget };
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  sheet.classList.add('drag');
}
function sheetMove(e) {
  if (!sdrag || e.pointerId !== sdrag.id) return;
  const dy = e.clientY - sdrag.y0; if (Math.abs(dy) > 6) sdrag.moved = true;
  if (!sdrag.moved) return;
  sdrag.pos = clamp(sdrag.base + dy, -sdrag.h, 0); sheet.style.transform = `translate(-50%, ${sdrag.pos}px)`;
  if (!sheetOpen && sdrag.pos > -sdrag.h * 0.9 && !sheet.dataset.pre) { sheet.dataset.pre = 1; renderSheet(); }
  scrim.style.opacity = String(1 - Math.abs(sdrag.pos) / sdrag.h); scrim.classList.add('show');
}
function sheetUp(e) {
  if (!sdrag || e.pointerId !== sdrag.id) return;
  const d = sdrag; sdrag = null; sheet.classList.remove('drag'); scrim.style.opacity = ''; delete sheet.dataset.pre;
  if (!d.moved) { setSheet(!sheetOpen); return; }
  const v = (e.clientY - d.y0) / Math.max(1, performance.now() - d.t0);
  setSheet(Math.abs(v) > 0.5 ? v > 0 : d.pos > -d.h / 2);
}
for (const el of [$('pull'), $('grab')]) { el.addEventListener('pointerdown', sheetDown); el.addEventListener('pointermove', sheetMove); el.addEventListener('pointerup', sheetUp); el.addEventListener('pointercancel', sheetUp); }
scrim.addEventListener('click', () => { if (performance.now() - openedAt > 500) setSheet(false); });

// ---------- hover tag ----------
const tagEl = $('tag'); let tagKey = '';
const tenureTxt = L => !L ? '' : L.t === 'own' ? 'owned' : L.t === 'rent' ? 'rented' : 'leased';
function describe(x, y) {
  const g = world.grid[y]?.[x], L = landOf(x, y); if (g === undefined) return '';
  const zone = ZONES[R.zoneOf(x, y)];
  if (g === 'road') return `<b>${world.cracked[key(x, y)] ? 'Cracked road' : 'Public road'}</b>`;
  if (CIVIC[g]) return `<b>${CIVIC[g].name}</b> · city building`;
  const who = !L ? '' : L.o === me.id ? tenureTxt(L) : L.o === 0 ? 'city' : nameOf(L.o);
  if (g !== 'empty') { const d = CATALOG[g]; return `<b>${d.name}</b> · ${who} · ${OPEN[g] ? '<span class="good">open now</span>' : 'closed now'}`; }
  if (L) return L.o === me.id ? `<b>Your plot</b> · ${tenureTxt(L)} · ${zone}` : L.o === 0 ? '<b>City land</b>' : `<b>${nameOf(L.o)}'s plot</b>`;
  return `<b>Free plot</b> · ${zone} · ${fmt(landPrice(x, y))} to buy`;
}
function updateTag(e) {
  if (e.pointerType === 'touch' || !hover) { tagEl.classList.remove('show'); return; }
  const [x, y] = hover; if (x < 0 || y < 0 || x >= N || y >= N) { tagEl.classList.remove('show'); return; }
  const k = x + ',' + y + tool.k + (tool.mode || tool.item || '') + Math.floor(model.money);
  if (k !== tagKey) {
    tagKey = k; let h = describe(x, y);
    if (tool.k !== 'pan') {
      if (tool.k === 'build' && tool.item === 'den') h += `<br>Raid risk here: ${(R.raidRisk(world, x, y) * 100).toFixed(1)}% per open hour`;
      const p = plan(x, y, tool);
      if (p.ok) h += `<br>${p.verb}${p.cost ? ' for ' + fmt(p.cost) : p.gain ? ' for +' + fmt(p.gain) : ''}${p.note ? ' (' + p.note + ')' : ''}`;
      else if (p.msg) h += `<br><span class="bad">${p.msg}</span>`;
    }
    tagEl.innerHTML = h;
  }
  tagEl.style.left = Math.min(innerWidth - 270, e.clientX + 16) + 'px'; tagEl.style.top = Math.min(innerHeight - 80, e.clientY + 18) + 'px'; tagEl.classList.add('show');
}

// ---------- acting on the map ----------
let lastSell = { k: -1, t: 0 }; const inflight = new Set();
async function act(gx, gy, announce) {
  const T = tool; if (T.k === 'pan') return false;
  const k = key(gx, gy);
  if (T.k === 'sell') { const t = performance.now(); if (k === lastSell.k && t - lastSell.t < 900) return false; lastSell = { k, t }; }
  if (inflight.has(k)) return false;
  const p = plan(gx, gy, T);                                 // instant feedback; the server then makes the real decision
  if (!p.ok) { if (announce && p.msg) toast(p.msg); return false; }
  inflight.add(k);
  const r = await sendAct(gx, gy, { k: T.k, mode: T.mode, item: T.item });
  inflight.delete(k);
  if (r.ok) {
    if (T.k === 'sell') burst(gx, gy, '#c9c2b4', 8); else if (T.k === 'build') burst(gx, gy, '#f2eadb', 10); else if (T.k === 'land') burst(gx, gy, TEN[T.mode === 'buy' ? 'own' : T.mode], 8);
    if (lastPointerType === 'touch' && navigator.vibrate) { try { navigator.vibrate(8); } catch (err) {} }
    if (T.k !== 'road') toast(r.done + (r.cost ? ` · -${fmt(r.cost)}` : r.gain ? ` · +${fmt(r.gain)}` : r.note ? ` · ${r.note}` : ''), 'ok');
    tagKey = ''; afterChange(); return true;
  }
  if (announce && r.msg) toast(r.msg);
  return false;
}

const pointers = new Map();
let lastPinch = null, panning = false, painting = false, last = null, spaceDown = false, tap = null, lastPointerType = 'mouse';
function pos(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
}
function zoomAt(sx, sy, factor) {
  const nz = clamp(cam.z * factor, 0.3 * DPR, 2.6 * DPR), f = nz / cam.z;
  cam.x = sx - (sx - cam.x) * f; cam.y = sy - (sy - cam.y) * f; cam.z = nz; clampCamera();
}

canvas.addEventListener('pointerdown', e => {
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  pointers.set(e.pointerId, pos(e));
  lastPointerType = e.pointerType;
  if (sheetOpen) { setSheet(false); return; }
  if (pointers.size === 2) { painting = false; panning = false; tap = null; lastPinch = null; return; }
  last = pos(e);
  if (e.button === 1 || e.button === 2 || tool.k === 'pan' || spaceDown) { panning = true; canvas.style.cursor = 'grabbing'; return; }
  // Touch: a TAP acts, a DRAG moves the map. Only Road paints while dragging.
  if (e.pointerType === 'touch' && tool.k !== 'road') { tap = { x: e.clientX, y: e.clientY }; return; }
  const [gx, gy] = toGrid(...pos(e));
  painting = tool.k === 'road';
  act(gx, gy, true);
});
canvas.addEventListener('pointermove', e => {
  const p = pos(e); hover = toGrid(...p); updateTag(e);
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
  if (tap && pointers.size === 1) {
    if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 10) return;
    tap = null; panning = true; last = p; return;
  }
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (lastPinch) { cam.x += mid[0] - lastPinch.mid[0]; cam.y += mid[1] - lastPinch.mid[1]; zoomAt(mid[0], mid[1], dist / lastPinch.dist); }
    lastPinch = { mid, dist };
  } else if (panning && last) {
    cam.x += p[0] - last[0]; cam.y += p[1] - last[1]; last = p; clampCamera();
  } else if (painting) {
    const [gx, gy] = toGrid(...p); act(gx, gy, false);
  }
});
function release(e) {
  const wasTap = tap && e.type === 'pointerup' && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (wasTap) { const [gx, gy] = toGrid(...pos(e)); act(gx, gy, true); }
  tap = null;
  if (e.pointerType === 'touch') { hover = null; }
  if (pointers.size < 2) lastPinch = null;
  if (pointers.size === 0) { painting = false; panning = false; canvas.style.cursor = tool.k === 'pan' ? 'grab' : 'crosshair'; }
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('pointerleave', () => { hover = null; tagEl.classList.remove('show'); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => { e.preventDefault(); const [sx, sy] = pos(e); zoomAt(sx, sy, e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

window.addEventListener('keydown', e => {
  const k = e.key, st = 60 * DPR, keys = { 1: 'pan', 2: 'road', 3: 'land', 4: 'build', 5: 'sell' };
  if (k === ' ') { spaceDown = true; e.preventDefault(); return; }
  if (k === 'Escape') { setSheet(false); return; }
  if (k === 'm' || k === 'M') { setSheet(!sheetOpen); return; }
  if (keys[k]) { selectTool(keys[k], true); return; }
  if (k === 'ArrowLeft' || k === 'a') cam.x += st; else if (k === 'ArrowRight' || k === 'd') cam.x -= st;
  else if (k === 'ArrowUp' || k === 'w') cam.y += st; else if (k === 'ArrowDown' || k === 's') cam.y -= st;
  else if (k === '+' || k === '=') zoomAt(canvas.width / 2, canvas.height / 2, 1.25);
  else if (k === '-' || k === '_') zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.25);
  else return;
  clampCamera();
});
window.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });
window.addEventListener('resize', resize);
$('zin').onclick = () => zoomAt(canvas.width / 2, canvas.height / 2, 1.25);
$('zout').onclick = () => zoomAt(canvas.width / 2, canvas.height / 2, 1 / 1.25);
$('zhome').onclick = centerCamera;

// ---------- clock + start-up ----------
function tickClock() {
  const d = new Date(now()), txt = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] + ' ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0');
  if (txt !== lastClock) { lastClock = txt; $('clock').textContent = txt; $('sun').classList.toggle('night', sky().d < 0.5); }
}
function tick() { R.settle(world, me, now(), cen()); refreshStats(); tickClock(); }
function refreshWho() { $('who').textContent = `${me.name} · ${online} online`; }

// ---------- join screen + start-up ----------
const joinEl = $('join');
let joinMode = 'signup';
const setJoinMode = m => { joinMode = m; joinEl.querySelectorAll('.jtabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); $('joinGo').textContent = m === 'signup' ? 'Create account' : 'Log in'; $('joinPass').autocomplete = m === 'signup' ? 'new-password' : 'current-password'; $('joinErr').textContent = ''; };
joinEl.querySelectorAll('.jtabs button').forEach(b => b.onclick = () => setJoinMode(b.dataset.m));
handlers.join = () => { joinEl.classList.add('show'); setTimeout(() => $('joinName').focus(), 50); };
handlers.authErr = m => { $('joinErr').textContent = m.msg; $('joinGo').disabled = false; };
$('joinForm').onsubmit = e => { e.preventDefault(); const n = $('joinName').value.trim(), p = $('joinPass').value; if (!n || !p) { $('joinErr').textContent = 'Enter your name and password.'; return; } $('joinErr').textContent = ''; sendMsg({ t: 'hello', mode: joinMode, name: n, pass: p }); };
handlers.status = ok => $('offline').classList.toggle('show', !ok);
handlers.born = k => born.set(k, performance.now());
handlers.changed = () => { tagKey = ''; refreshStats(); if (sheetOpen) renderSheet(); };
handlers.online = refreshWho;
handlers.notice = m => toast(m.msg, m.kind);
handlers.board = m => { boardRows = m.rows; if (sheetOpen && tab === 'players') renderSheet(); };
handlers.init = m => {
  joinEl.classList.remove('show'); refreshWho();
  if (!started) { started = true; resize(); centerCamera(); selectTool('road'); setInterval(tick, 1000); requestAnimationFrame(frame); }
  refreshStats(); tickClock();
  if (!m.you.av) openCreator(true); else setTimeout(morningShift, 600);
  if (m.away && Math.abs(m.away.gain) >= 1) { const hrs = m.away.ms / HOUR; setTimeout(() => toast(`Welcome back! ${m.away.gain >= 0 ? '+' : '-'}${fmt(Math.abs(m.away.gain))} while you were away (${hrs >= 48 ? Math.round(hrs / 24) + ' days' : Math.round(hrs) + ' hours'})`, 'info'), 600); }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { sendMsg({ t: 'sync' }); tick(); } });
resize();
connect();
handlers.panel = () => { if (sheetOpen) renderSheet(); };
handlers.simple = m => { toast(m.msg, m.ok ? 'ok' : undefined); if (sheetOpen) renderSheet(); };
handlers.gift = m => { toast(m.msg, m.ok ? 'ok' : undefined); if (m.ok) afterChange(); };
