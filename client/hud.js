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
function toast(msg, kind) {
  toastEl.className = 'glass show ' + (kind || 'err'); toastEl.textContent = msg;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
}

// ---------- HUD ----------
let lastBrand = '';
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
  else if (S.unconnected) msg = S.unconnected > 1 ? `! ${S.unconnected} buildings need a road` : '! 1 building needs a road';
  w.style.display = msg ? 'flex' : 'none'; w.textContent = msg;
  refreshDock(); updateGuide();
  const day = Math.floor((ts - me.born) / DAYMS) + 1, nm = `${me.name} · Day ${day}`; if (nm !== lastBrand) { lastBrand = nm; $('brand').querySelector('b').textContent = nm; }
}
function updateGuide() {
  const own = S.own + S.rent + S.lease > 0, house = S.blds.some(b => b.k === 'house'), road = S.blds.some(b => b.k === 'house' && b.ok);
  const steps = [['Get a plot of land', 'Tap Land, choose Buy, then tap a grass tile', own], ['Build a house on it', 'Tap Build, pick House, tap your plot', house], ['Get a working road next to it', 'Tap Road: repair a cracked road or lay a new one beside the house', road]];
  const el = $('hint');
  if (own && house && road || S.built > 3) { el.style.opacity = 0; el.style.pointerEvents = 'none'; return; }
  el.style.opacity = 1; const cur = steps.findIndex(s => !s[2]);
  el.innerHTML = `<b>Welcome.</b> You start with ${fmt(START_MONEY)}. Earnings come in real time (Ghana time), so every cedi counts.<ul>` +
    steps.map((s, i) => `<li class="${s[2] ? 'done' : i === cur ? 'now' : ''}"><i>${s[2] ? '✓' : i + 1}</i><span>${s[0]}${i === cur ? `<br><small style="color:var(--muted)">${s[1]}</small>` : ''}</span></li>`).join('') + '</ul>';
}

// ---------- the pull-down Market sheet ----------
const sheet = $('sheet'), scrim = $('scrim'), panel = $('panel'); let sheetOpen = false, tab = 'build', openedAt = 0;
const TABS = [['build', 'Build', 'build'], ['land', 'Land', 'land'], ['mine', 'My Properties', 'mine'], ['jobs', 'Jobs', 'jobs'], ['players', 'Players', 'players']];
let boardRows = null;
function setSheet(open) {
  sheetOpen = open; if (open) openedAt = performance.now(); sheet.style.transform = ''; sheet.classList.toggle('open', open); scrim.classList.toggle('show', open);
  if (open) renderSheet();
}
function renderSheet() {
  $('tabs').innerHTML = TABS.map(([k, l, ic]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${svg(ic)}${l}</button>`).join('');
  const st = panel.scrollTop;
  if (tab === 'players' && !boardRows) sendMsg({ t: 'board' });
  panel.innerHTML = tab === 'build' ? panelBuild() : tab === 'land' ? panelLand() : tab === 'players' ? panelPlayers() : tab === 'jobs' ? panelJobs() : panelMine();
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
  let h = `<div class="help">Everyone pays about <b>${fmt(R.LIVING)}</b> a day for food and daily costs. With no job you earn ${fmt(R.WAGE)} a day from odd jobs, which only just covers it. A job pays more, and the owner pays your salary while the place is open.</div>`;
  if (jobNow) {
    const d = CATALOG[jobNow.g], L = landOf(jobNow.k % N, (jobNow.k / N) | 0);
    h += `<div class="sum"><div><span>Your job</span><b>${d.name}</b></div><div><span>Pay</span><b>${fmt(d.sal)}/day</b></div><div><span>Employer</span><b>${L && L.o ? esc(nameOf(L.o)) : 'City'}</b></div></div>` +
      `<div class="row"><div class="nm"><b>${d.name} · ${d.hours}</b><small>Paid hourly while it is open</small></div><button data-act="go" data-x="${jobNow.k % N}" data-y="${(jobNow.k / N) | 0}">Show</button><button class="danger" data-act="quit">Quit job</button></div>`;
  } else h += `<div class="empty" style="padding:8px 4px;text-align:left">You have no job. Pick one below.</div>`;
  const list = R.openJobs(world).filter(j => j.o !== me.id && !(jobNow && jobNow.k === j.k)).sort((a, b) => (b.free > 0) - (a.free > 0) || b.sal - a.sal).slice(0, 40);
  h += '<div class="tier">Open positions</div>';
  h += list.length ? list.map(j => { const d = CATALOG[j.g];
    return `<div class="row"><div class="nm"><b>${d.name}<span class="chip" style="background:${j.o ? '#f9a8d4' : '#cbd5e1'}">${j.o ? esc(nameOf(j.o)) : 'City'}</span></b><small>${fmt(j.sal)}/day · ${j.free} of ${j.slots} free · ${d.hours}</small></div>` +
      `<button data-act="go" data-x="${j.x}" data-y="${j.y}">Show</button><button data-act="apply" data-x="${j.x}" data-y="${j.y}" ${j.free > 0 && !jobNow ? '' : 'disabled'}>${j.free > 0 ? 'Apply' : 'Full'}</button></div>`; }).join('')
    : '<div class="empty">No workplaces are open yet.</div>';
  return h;
}
const C0 = () => cen();
function panelPlayers() {
  if (!boardRows) return '<div class="empty">Loading the leaderboard...</div>';
  return `<div class="help">Richest players in the city. Net worth is cash plus the resale value of your buildings and land. ${online} online now.</div>` +
    boardRows.map((r, i) => `<div class="row"><div class="nm"><b>${i + 1}. ${r.name.replace(/</g, '&lt;')}${r.id === me.id ? '<span class="chip" style="background:#fbbf24">you</span>' : ''}</b><small>${r.plots} plots</small></div><b style="color:var(--gold)">${fmt(r.worth)}</b></div>`).join('');
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
  else if (a === 'apply' || a === 'quit') {
    const x = +b.dataset.x || 0, y = +b.dataset.y || 0; b.disabled = true;
    sendAct(x, y, a === 'quit' ? { k: 'job', mode: 'quit' } : { k: 'job', mode: 'apply' }).then(r => { toast(r.ok ? r.done : r.msg || 'Could not do that', r.ok ? 'ok' : undefined); afterChange(); });
  }
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
  if (m.away && Math.abs(m.away.gain) >= 1) { const hrs = m.away.ms / HOUR; setTimeout(() => toast(`Welcome back! ${m.away.gain >= 0 ? '+' : '-'}${fmt(Math.abs(m.away.gain))} while you were away (${hrs >= 48 ? Math.round(hrs / 24) + ' days' : Math.round(hrs) + ' hours'})`, 'info'), 600); }
};
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { sendMsg({ t: 'sync' }); tick(); } });
resize();
connect();
