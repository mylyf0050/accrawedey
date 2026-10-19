// =====================================================
// SHARED RULES. Pure game logic for the shared city.
// The SERVER runs this as the authority; the client runs the same code only to
// preview prices and to animate income. No drawing code here.
//
// Time is real time on Ghana time (GMT, UTC+0). Money is earned per real hour.
// =====================================================
(function (root) {
  const N = 64;
  const HOUR = 3600000, DAYMS = 86400000, MAXAWAY = 7 * DAYMS;
  const CUR = 'GH₵';
  const START_MONEY = 6500;                 // enough for a plot, a house and a short road repair
  const HOUR_MS = 3600000;
  const LIVING = 20;                        // transport (10) and utilities (10) every player pays, per day. Food is bought separately.
  const LIVING_ITEMS = { transport: 10, utilities: 10 };
  const FURNISH_COST = [1800, 3200], FURNISH_BOOST = 0.15;        // two furnishing levels, each lifts a house's income by 15%
  const FOUND_COST = 2000, PAY_MIN = 0.8, PAY_MAX = 1.5, MAYOR_PAY = 5000;
  const WAGE = 60;                          // odd-jobs income per day, so nobody is ever stuck at zero
  const ROAD = { cost: 120, repair: 40 };
  const LAND = { rent: 0.012, lease: 0.30, leaseDays: 30, sell: 0.70 };
  const between = (h, a, b) => h >= a && h < b;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // What players can build. cost = build price. at(hour, weekday) = income per hour at full staffing (0 = closed). weekday 0 = Sunday.
  // zones = which districts allow it: r residential, c commercial, i industrial
  const CATALOG = {
    house:   { name: 'House',      tier: 'Essentials', cost: 3500,   unlock: 0,  homes: 4, jobs: 0,  upkeep: 15,   happy: 0,  warn: 50, zones: 'rc', hours: 'Lived in all day',
               at: () => 14, blurb: 'Families move in and pay you rent. Needs a road.' },
    park:    { name: 'Park',       tier: 'Essentials', cost: 1500,   unlock: 0,  homes: 0, jobs: 1,  upkeep: 5,    happy: 4,  warn: 0,  zones: 'rc', hours: 'Open all day',
               at: () => 0, blurb: 'No income, but residents are happier.' },
    shop:    { sal: 90, name: 'Provision Shop',       tier: 'Commerce',   cost: 6000,   unlock: 4,  homes: 0, jobs: 3,  upkeep: 25,   happy: 1,  warn: 66, zones: 'rc', hours: 'Every day 08:00 to 20:00',
               at: h => between(h, 8, 20) ? 35 : 0, blurb: 'Indomie, Milo, sachet water and airtime for the whole street. Needs a road and customers.' },
    club:    { sal: 150, name: 'Night Club', tier: 'Commerce',   cost: 35000,  unlock: 16, homes: 0, jobs: 8,  upkeep: 120,  happy: 3,  warn: 62, zones: 'c', hours: 'Nightly 20:00 to 04:00',
               at: (h, d) => (h >= 20 || h < 4) ? (d === 5 || d === 6 ? 238 : 170) : 0, blurb: 'Oxford Street energy: big money after dark, busiest Friday and Saturday. Commercial district only.' },
    church:  { sal: 70, name: 'Church',     tier: 'Community',  cost: 9000,   unlock: 8,  homes: 0, jobs: 2,  upkeep: 25,   happy: 6,  warn: 80, zones: 'rc', hours: 'Sunday 06:00 to 14:00, daily 06:00 to 18:00',
               at: (h, d) => d === 0 && between(h, 6, 14) ? 60 : between(h, 6, 18) ? 8 : 0, blurb: 'Steady offerings, big on Sundays. Raises happiness a lot.' },
    school:  { sal: 120, name: 'School',     tier: 'Community',  cost: 18000,  unlock: 12, homes: 0, jobs: 6,  upkeep: 60,   happy: 7,  warn: 66, zones: 'rc', hours: 'Mon to Fri 07:00 to 15:00',
               at: (h, d) => d >= 1 && d <= 5 && between(h, 7, 15) ? 55 : 0, blurb: 'School fees on weekdays. Makes the whole town happier.' },
    market:  { sal: 100, name: 'Open Market',     tier: 'Commerce',   cost: 25000,  unlock: 14, homes: 0, jobs: 10, upkeep: 80,   happy: 2,  warn: 50, zones: 'rc', hours: 'Mon to Sat 06:00 to 18:00',
               at: (h, d) => d !== 0 && between(h, 6, 18) ? 110 : 0, blurb: 'Makola-style stalls pay you for space. Busy every day except Sunday.' },
    hospital:{ sal: 160, name: 'Hospital',   tier: 'Community',  cost: 45000,  unlock: 24, homes: 0, jobs: 15, upkeep: 200,  happy: 9,  warn: 80, zones: 'rc', hours: 'Open 24 hours',
               at: () => 40, blurb: 'Patient fees all day and night. Makes the whole town much happier.' },
    police:  { sal: 130, name: 'Police Station', tier: 'Safety', cost: 30000,  unlock: 12, homes: 0, jobs: 8,  upkeep: 90,   happy: 3,  warn: 66, zones: 'rc', hours: 'Open 24 hours',
               at: () => 20, blurb: 'City stipend plus GH₵1,500 for every black market raid near you. Cuts crime within 9 tiles.' },
    prison:  { sal: 130, name: 'Prison',     tier: 'Safety',     cost: 80000,  unlock: 30, homes: 0, jobs: 12, upkeep: 250,  happy: -2, warn: 70, zones: 'i',  hours: 'Open 24 hours',
               at: () => 30, blurb: 'Holds 10 inmates. The city pays GH₵400 each time one is jailed here. Industrial district only.' },
    den:     { name: 'Black Market', tier: 'Underworld', cost: 12000, unlock: 8, homes: 0, jobs: 4,  upkeep: 40,   happy: -3, warn: 60, zones: 'ci', hours: 'Nightly 20:00 to 05:00', illegal: true,
               at: h => (h >= 20 || h < 5) ? 90 : 0, blurb: 'ILLEGAL. Big untraceable profit at night, but police raids confiscate it, fine you and can jail you. Spoils the mood of homes within 6 tiles.' },
    factory: { sal: 130, name: 'Factory',    tier: 'Industry',   cost: 60000,  unlock: 20, homes: 0, jobs: 20, upkeep: 150,  happy: -8, warn: 70, zones: 'i', hours: 'Mon to Sat 06:00 to 22:00',
               at: (h, d) => d !== 0 && between(h, 6, 22) ? 85 : 0, blurb: 'Lots of jobs and steady output, but pollution lowers happiness. Industrial district only.' },
    airport: { sal: 220, name: 'Airport',    tier: 'Landmark',   cost: 400000, unlock: 60, homes: 0, jobs: 60, upkeep: 1500, happy: -4, warn: 70, zones: 'i', hours: 'Every day 05:00 to 23:00',
               at: h => between(h, 5, 23) ? 800 : 0, blurb: 'The ultimate landmark. Huge income, huge cost. Industrial district only.' },
    chopbar: { sal: 80, name: 'Chop Bar', tier: 'Commerce', cost: 7500, unlock: 6, homes: 0, jobs: 3, upkeep: 30, happy: 2, warn: 60, zones: 'rc', hours: 'Every day 06:00 to 22:00',
               at: h => between(h, 6, 22) ? 28 : 0, blurb: 'Waakye, banku and kenkey for the neighbourhood. Steady money from breakfast to supper.' },
    trotro:  { sal: 100, name: 'Trotro Station', tier: 'Transport', cost: 20000, unlock: 10, homes: 0, jobs: 6, upkeep: 60, happy: 1, warn: 66, zones: 'rc', hours: 'Every day 05:00 to 21:00',
               at: h => between(h, 5, 21) ? (between(h, 5, 9) || between(h, 16, 20) ? 65 : 40) : 0, blurb: 'Fares from the whole town. Rush hours (05:00 to 09:00 and 16:00 to 20:00) pay the most.' }
  };
  // A vehicle earns when its owner is not on a job shift. A trotro minibus needs more cash than an Uber car but earns more.
  const CARS = {
    uber:   { name: 'Uber car',        cost: 10000, run: 4, hours: 'Daily 06:00 to 22:00, surge 07:00 to 09:00 and 17:00 to 20:00', at: h => between(h, 6, 22) ? (between(h, 7, 9) || between(h, 17, 20) ? 35 : 22) : 0 },
    trotro: { name: 'Trotro minibus',  cost: 22000, run: 9, hours: 'Daily 05:00 to 21:00, rush 05:00 to 09:00 and 16:00 to 20:00', at: h => between(h, 5, 21) ? (between(h, 5, 9) || between(h, 16, 20) ? 70 : 45) : 0 }
  };
  // Staff slots and daily salary per workplace. Staffing lifts income from 40% (empty) to 100% (full), so hiring pays for itself.
  const SLOTS = { shop: [2, 90], chopbar: [2, 90], church: [1, 80], school: [1, 120], market: [5, 100], club: [6, 110], hospital: [4, 110], police: [2, 100], prison: [3, 100], factory: [6, 90], airport: [40, 150], trotro: [4, 90] };
  for (const k in CATALOG) { delete CATALOG[k].sal; if (SLOTS[k]) { CATALOG[k].slots = SLOTS[k][0]; CATALOG[k].sal = SLOTS[k][1]; } }
  const STAFF_FLOOR = 0.4;
  // Food: bought from an open seller. The owner keeps 70% (the rest is ingredients). Being hungry halves income.
  const FOOD = { shop: { label: 'Snacks', cost: 15, hours: 6 }, chopbar: { label: 'Hot meal', cost: 30, hours: 12 }, market: { label: 'Groceries', cost: 80, hours: 72 }, citymarket: { label: 'Groceries', cost: 80, hours: 72 } };
  const FEED_CAP = 72 * HOUR_MS, OWNER_SHARE = 0.7, HUNGRY_FACTOR = 0.5;
  const TIERS = ['Essentials', 'Commerce', 'Transport', 'Community', 'Safety', 'Industry', 'Landmark', 'Underworld'];
  // Built by the city itself. Players cannot buy or sell these, but they lift land prices nearby.
  const CIVIC = { townhall: { name: 'Town Hall' }, cityhospital: { name: 'General Hospital' }, citymarket: { name: 'Makola Market' }, policehq: { name: 'Police HQ' }, cityprison: { name: 'Central Prison' } };
const LAW = { jailHours: 12, slots: 10, fineBase: 2000, finePct: 0.10, bounty: 1500, inmateFee: 400, baseRisk: 0.005, perPolice: 0.04, maxPolice: 3, policeRadius: 9, denRadius: 6 };
  const ZONES = { r: 'Residential', c: 'Commercial', i: 'Industrial' };

  // ---------- world ----------
  const key = (x, y) => y * N + x;
  const blankGrid = () => Array.from({ length: N }, () => Array(N).fill('empty'));
  function makeWorld() { return { grid: blankGrid(), land: {}, byOwner: {}, cracked: {}, names: { 0: 'City' }, jobs: {}, staff: {}, companies: {}, cars: {} }; }
  function setLand(w, k, entry) {
    const old = w.land[k]; if (old && w.byOwner[old.o]) w.byOwner[old.o].delete(k);
    w.land[k] = entry; (w.byOwner[entry.o] || (w.byOwner[entry.o] = new Set())).add(k);
  }
  function delLand(w, k) { const old = w.land[k]; if (old && w.byOwner[old.o]) w.byOwner[old.o].delete(k); delete w.land[k]; }
  function reindex(w) {
    w.byOwner = {}; for (const k in w.land) (w.byOwner[w.land[k].o] || (w.byOwner[w.land[k].o] = new Set())).add(+k);
    w.jobs = w.jobs || {}; w.companies = w.companies || {}; w.cars = w.cars || {}; w.staff = {}; for (const id in w.jobs) { const k = w.jobs[id].k; w.staff[k] = (w.staff[k] || 0) + 1; }
  }
  // ---------- jobs: a player works at one building, the owner pays the salary while it is open ----------
  const openHoursOf = (k, d) => { let n = 0; for (let h = 0; h < 24; h++) if (CATALOG[k].at(h, d) > 0) n++; return n; };
  const hourPay = (k, d) => { const def = CATALOG[k], n = def && def.sal ? openHoursOf(k, d) : 0; return n ? def.sal / n : 0; };
  function setJob(w, pid, job) {
    const old = w.jobs[pid]; if (old) { w.staff[old.k] = Math.max(0, (w.staff[old.k] || 1) - 1); delete w.jobs[pid]; }
    if (job) { w.jobs[pid] = job; w.staff[job.k] = (w.staff[job.k] || 0) + 1; }
  }
  const workersAt = (w, k) => Object.keys(w.jobs).filter(id => w.jobs[id].k === +k).map(Number);
  // a job is valid only while its building stands, is the same kind, and is on a working road
  function jobValid(w, j) { if (!j) return false; const x = j.k % N, y = (j.k / N) | 0; return w.grid[y][x] === j.g && !!CATALOG[j.g] && !!CATALOG[j.g].sal && !!w.land[j.k] && nearRoad(w, x, y); }
  const openN = (w, k, g) => { const L = w.land[k], d = CATALOG[g]; return !L || !d || !d.slots ? 0 : L.o === 0 ? d.slots : Math.min(d.slots, L.h || 0); };
  const payMul = (w, o) => (o && w.companies && w.companies[o]) ? w.companies[o].pay : 1;
  function openJobs(w) {
    const out = [];
    for (const k in w.land) { const x = k % N, y = (k / N) | 0, g = w.grid[y][x], d = CATALOG[g];
      if (!d || !d.sal || !nearRoad(w, x, y)) continue;
      const op = openN(w, +k, g); if (op <= 0) continue;
      const o = w.land[k].o, pm = payMul(w, o); out.push({ x, y, k: +k, g, o, co: o && w.companies[o] ? w.companies[o].name : '', free: Math.max(0, op - (w.staff[k] || 0)), slots: op, sal: Math.round(d.sal * pm), pm }); }
    return out;
  }

  const hash = (x, y) => { let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
  function zoneOf(x, y) {
    const d = Math.max(Math.abs(x - 31.5), Math.abs(y - 31.5));
    if (x + y < 24 || x + y > 102 || Math.abs(x - y) > 40) return 'i';
    return d <= 13 ? 'c' : 'r';
  }
  const isRoadAt = (w, x, y) => w.grid[y]?.[x] === 'road';
  const intactRoad = (w, x, y) => isRoadAt(w, x, y) && !w.cracked[key(x, y)];
  function nearRoad(w, x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => intactRoad(w, x + dx, y + dy)); }

  const CIVIC_AT = [];                       // filled by seedWorld, used for land value
  function civicBoost(x, y) {
    let best = 99; for (const [cx, cy] of CIVIC_AT) best = Math.min(best, Math.max(Math.abs(cx - x), Math.abs(cy - y)));
    return 1 + 0.5 * Math.max(0, 1 - best / 10);
  }
  // Land is worth more near the centre, near civic buildings and beside a working road. Industrial land is cheaper.
  function landPrice(w, x, y) {
    const d = Math.max(Math.abs(x + 0.5 - N / 2), Math.abs(y + 0.5 - N / 2)) / (N / 2);
    let p = 280 + 820 * Math.pow(1 - Math.min(1, d), 1.5);
    p *= civicBoost(x, y);
    if (nearRoad(w, x, y)) p *= 1.18;
    if (zoneOf(x, y) === 'i') p *= 0.7;
    return Math.round(p / 10) * 10;
  }
  const rentDaily = p => Math.max(8, Math.round(p * LAND.rent));
  const leaseCost = p => Math.round(p * LAND.lease);
  const fmt = n => CUR + ' ' + Math.round(n).toLocaleString('en-US');

  // The founding district: a street grid, civic buildings, and some city-owned homes and shops.
  // Every worn-out road section is cracked and must be repaired before it connects anything.
  function seedWorld() {
    const w = makeWorld(); CIVIC_AT.length = 0;
    const lines = [24, 31, 38];
    for (const v of lines) for (let t = 14; t <= 49; t++) { w.grid[v][t] = 'road'; w.grid[t][v] = 'road'; }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (w.grid[y][x] === 'road' && hash(x, y) % 4 === 0) w.cracked[key(x, y)] = 1;
    const sys = (x, y, g) => { w.grid[y][x] = g; setLand(w, key(x, y), { o: 0, t: 'sys' }); };
    for (const [x, y, g] of [[28, 28, 'townhall'], [34, 28, 'citymarket'], [28, 34, 'cityhospital'], [37, 30, 'policehq'], [16, 30, 'cityprison']]) { sys(x, y, g); CIVIC_AT.push([x, y]); }
    for (const [x, y] of [[30, 27], [32, 33], [39, 28], [25, 33], [35, 37]]) sys(x, y, 'shop');
    sys(32, 29, 'market'); sys(25, 36, 'school'); sys(39, 32, 'church');   // city-run workplaces so newcomers can find a job
    for (const [x, y] of [[25, 27], [25, 29], [30, 33], [30, 35], [32, 36], [37, 25], [37, 27], [39, 33], [23, 26], [23, 28], [23, 35], [25, 39], [30, 39], [33, 39], [39, 36]]) sys(x, y, 'house');
    // the city-owned buildings sit beside roads that are kept in good repair
    for (const k in w.land) { const x = k % N, y = (k / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) delete w.cracked[key(x + dx, y + dy)]; }
    return w;
  }
  function initCivic(w) { CIVIC_AT.length = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (CIVIC[w.grid[y][x]]) CIVIC_AT.push([x, y]); }

  // ---------- law and order ----------
  const POLICE = ['police', 'policehq'], PRISONS = ['prison', 'cityprison'];
  function countNear(w, types, x, y, r) {
    let n = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(N - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(N - 1, x + r); xx++) if (types.includes(w.grid[yy][xx])) n++;
    return n;
  }
  const policeCover = (w, x, y) => countNear(w, POLICE, x, y, LAW.policeRadius);
  const raidRisk = (w, x, y) => LAW.baseRisk + LAW.perPolice * Math.min(LAW.maxPolice, policeCover(w, x, y));   // chance per open hour
  function nearestPolice(w, x, y) {                                    // the player-built station that earns the bounty
    let best = null, bd = 99;
    for (let yy = Math.max(0, y - LAW.policeRadius); yy <= Math.min(N - 1, y + LAW.policeRadius); yy++) for (let xx = Math.max(0, x - LAW.policeRadius); xx <= Math.min(N - 1, x + LAW.policeRadius); xx++) {
      if (w.grid[yy][xx] !== 'police') continue; const L = w.land[key(xx, yy)], d = Math.max(Math.abs(xx - x), Math.abs(yy - y));
      if (L && L.o && d < bd) { bd = d; best = L.o; }
    }
    return best;
  }
  function prisons(w) {                                                // every prison tile: key + owner (0 = city)
    const out = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (PRISONS.includes(w.grid[y][x])) { const L = w.land[key(x, y)]; out.push({ k: key(x, y), o: L ? L.o : 0 }); }
    return out;
  }

  // ---------- census of one player's holdings ----------
  function census(w, pid) {
    const c = { pop: 0, jobs: 0, built: 0, unconnected: 0, blds: [], happyAdd: 0, own: 0, rent: 0, lease: 0, rentDay: 0, late: 0, soonest: Infinity };
    for (const k of (w.byOwner[pid] || [])) {
      const L = w.land[k], x = k % N, y = (k / N) | 0, g = w.grid[y][x];
      c[L.t]++;
      if (L.t === 'rent') { c.rentDay += rentDaily(landPrice(w, x, y)); if (L.ls) c.late++; }
      if (L.t === 'lease') c.soonest = Math.min(c.soonest, L.end);
      const d = CATALOG[g]; if (!d) continue;
      const ok = g === 'park' || nearRoad(w, x, y);
      c.built++; c.blds.push({ x, y, k: g, ok, n: w.staff[k] || 0, f: L.f || 0 });
      if (!ok) c.unconnected++; else {
        c.pop += d.homes; c.jobs += d.jobs; c.happyAdd += d.happy;
        if (g === 'house') c.happyAdd += 2 * Math.min(2, policeCover(w, x, y)) - 3 * Math.min(3, countNear(w, ['den'], x, y, LAW.denRadius));   // safe streets vs black markets
      }
    }
    const jb = w.jobs && w.jobs[pid]; c.job = jobValid(w, jb) ? jb : null;
    c.jobPm = c.job ? payMul(w, w.land[c.job.k].o) : 1; c.pm = payMul(w, pid);
    c.car = (w.cars && w.cars[pid]) || null; c.living = LIVING - (c.car ? LIVING_ITEMS.transport : 0);
    c.employed = Math.min(c.pop, c.jobs);
    c.homesF = c.pop ? 0.6 + 0.4 * Math.min(1, c.jobs / c.pop) : 0;
    c.workF = c.jobs ? 0.5 + 0.5 * Math.min(1, c.pop / c.jobs) : 0;
    c.happy = c.pop ? clamp(Math.round(45 + c.happyAdd + (c.employed / c.pop) * 30), 0, 100) : 0;
    c.mood = 0.85 + 0.15 * c.happy / 100;
    return c;
  }
  // Dumsor: on about one evening in three the power is rationed from 18:00 to midnight (Ghana time).
  const NO_POWER_CUT = ['hospital', 'police', 'prison', 'airport', 'house', 'park'];
  const dumsorDay = dn => hash(dn, 77) % 3 === 0;
  function dumsorAt(ts) { const dn = Math.floor(ts / DAYMS), h = new Date(ts).getUTCHours(); return dumsorDay(dn) && h >= 18 ? { on: true, until: (dn + 1) * DAYMS } : { on: false }; }
  const DUMSOR_FACTOR = 0.6;
  function rates(h, d, c, dn) {
    const cut = dn !== undefined && h >= 18 && dumsorDay(dn);
    let inc = c.job ? 0 : WAGE / 24, cost = c.rentDay / 24 + (c.living === undefined ? LIVING : c.living) / 24;
    const working = c.job && CATALOG[c.job.g].at(h, d) > 0;
    if (working) inc += hourPay(c.job.g, d) * (c.jobPm || 1);
    if (c.car && !working) { const v = CARS[c.car], g = v.at(h); if (g > 0) { inc += g; cost += v.run; } }
    for (const b of c.blds) {
      const def = CATALOG[b.k]; cost += def.upkeep / 24;
      if (!b.ok) continue;
      const y = def.at(h, d);
      if (y > 0 && b.n) cost += b.n * hourPay(b.k, d) * (c.pm || 1);
      const staffF = def.slots ? STAFF_FLOOR + (1 - STAFF_FLOOR) * Math.min(1, (b.n || 0) / def.slots) : 1;
      if (y > 0) inc += y * (b.k === 'house' ? c.homesF * (1 + FURNISH_BOOST * (b.f || 0)) : c.workF * staffF) * c.mood * (cut && !NO_POWER_CUT.includes(b.k) ? DUMSOR_FACTOR : 1);
    }
    if (c.hungry) inc *= HUNGRY_FACTOR;
    return { inc, cost };
  }
  function projectDay(c, dow) {
    let inc = 0, cost = 0;
    for (let h = 0; h < 24; h++) { const r = rates(h, dow, c); inc += r.inc; cost += r.cost; }
    return { inc, cost, net: inc - cost };
  }
  function dayYield(k) { let s = 0; for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) s += CATALOG[k].at(h, d); return s / 7; }
  function netWorth(w, p) {
    let v = p.money;
    for (const k of (w.byOwner[p.id] || [])) {
      const L = w.land[k], x = k % N, y = (k / N) | 0, d = CATALOG[w.grid[y][x]];
      if (d) v += d.cost * 0.6;
      if (L.f) v += FURNISH_COST.slice(0, L.f).reduce((a, b) => a + b, 0) * 0.5;
      if (L.t === 'own') v += landPrice(w, x, y) * LAND.sell;
    }
    if (w.cars && w.cars[p.id]) v += CARS[w.cars[p.id]].cost * 0.5;
    return Math.round(v);
  }

  // ---------- real-time accrual (the player object is { id, money, t }) ----------
  function settle(w, p, ts, c) {
    c = c || census(w, p.id);
    let from = p.t;
    if (ts - from > MAXAWAY) from = ts - MAXAWAY;
    if (ts <= from) { p.t = Math.min(p.t, ts); return 0; }
    const before = p.money; let cur = from;
    while (cur < ts) {
      const end = Math.min((Math.floor(cur / HOUR) + 1) * HOUR, ts), seg = end - cur, dt = new Date(cur);
      c.hungry = p.fedUntil !== undefined && !(p.fedUntil > cur);
      const r = rates(dt.getUTCHours(), dt.getUTCDay(), c, Math.floor(cur / DAYMS));
      p.money += (r.inc - r.cost) * seg / HOUR; cur = end;
    }
    p.t = ts;
    if (p.money < 0) {                                      // could not pay: rent goes overdue
      p.money = 0;
      for (const k of (w.byOwner[p.id] || [])) { const L = w.land[k]; if (L.t === 'rent' && !L.ls) L.ls = ts; }
    } else if (c.late) {
      for (const k of (w.byOwner[p.id] || [])) delete w.land[k].ls;
    }
    return p.money - before;
  }
  // Leases end, and rent unpaid for 24 hours means eviction. Buildings on the plot are lost.
  function expireDue(w, ts) {
    const out = [];
    for (const k in w.land) {
      const L = w.land[k];
      if ((L.t === 'lease' && ts >= L.end) || (L.t === 'rent' && L.ls && ts - L.ls > DAYMS)) {
        const x = k % N, y = (k / N) | 0, g = w.grid[y][x], lost = !!CATALOG[g];
        if (lost) w.grid[y][x] = 'empty';
        out.push({ k: +k, x, y, o: L.o, lost, why: L.t }); delLand(w, k);
      }
    }
    return out;
  }

  // ---------- actions: plan() says what would happen, perform() does it ----------
  const afford = (me, cost, verb, extra) => me.money >= cost
    ? Object.assign({ ok: true, cost, verb, msg: '' }, extra)
    : { ok: false, cost, verb, msg: `Not enough money: ${verb} costs ${fmt(cost)}, you have ${fmt(me.money)}` };

  function plan(w, me, T, x, y, c, ts) {
    const no = msg => ({ ok: false, msg: msg || '', verb: '' });
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= N || y >= N) return no();
    c = c || census(w, me.id); ts = ts || Date.now();
    const k = key(x, y), g = w.grid[y][x], L = w.land[k] || null, mine = !!L && L.o === me.id;
    const other = L && !mine ? (L.o === 0 ? 'This belongs to the city' : `This plot belongs to ${w.names[L.o] || 'another player'}`) : '';
    const z = zoneOf(x, y);
    if (!T || typeof T.k !== 'string') return no();
    if (me.jail && me.jail.until > ts) { const e = new Date(me.jail.until); return no(`You are in prison until ${String(e.getUTCHours()).padStart(2, '0')}:${String(e.getUTCMinutes()).padStart(2, '0')} (Ghana time). You cannot build, buy or sell.`); }

    if (T.k === 'road') {
      if (g === 'road') return w.cracked[k] ? afford(me, ROAD.repair, 'Repair road', { done: 'Road repaired', apply() { delete w.cracked[k]; } }) : no();
      if (other) return no(other);
      if (g !== 'empty') return no('That tile is already built on');
      return afford(me, ROAD.cost, 'Road', { done: 'Road laid', apply() { w.grid[y][x] = 'road'; } });
    }
    if (T.k === 'land') {
      if (g === 'road') return no('Roads are public, land under them cannot be bought');
      if (other) return no(other);
      if (CIVIC[g]) return no('That is a city building');
      const P = landPrice(w, x, y);
      if (T.mode === 'buy') {
        if (mine && L.t === 'own') return no('You already own this plot');
        let cost = P, verb = 'Buy plot';
        if (mine && L.t === 'lease') { cost = P - leaseCost(P); verb = 'Buy out lease'; }
        else if (mine && L.t === 'rent') verb = 'Buy plot (ends rent)';
        return afford(me, cost, verb, { done: 'You now own this plot', apply() { setLand(w, k, { o: me.id, t: 'own' }); } });
      }
      if (T.mode === 'rent') {
        if (mine) return no(L.t === 'rent' ? 'You already rent this plot' : L.t === 'own' ? 'You own this plot' : 'This plot is on lease');
        const r = rentDaily(P);
        if (me.money < r) return { ok: false, verb: 'Rent plot', msg: `You need at least ${fmt(r)} (one day's rent) to rent this plot` };
        return { ok: true, cost: 0, verb: 'Rent plot', msg: '', note: `${fmt(r)}/day`, done: `Renting for ${fmt(r)}/day`, apply() { setLand(w, k, { o: me.id, t: 'rent' }); } };
      }
      if (T.mode !== 'lease') return no();
      if (mine && (L.t === 'own' || L.t === 'rent')) return no(L.t === 'own' ? 'You own this plot' : 'This plot is rented. Buy it or end the rent first');
      const cost = leaseCost(P), days = LAND.leaseDays;
      if (mine) return afford(me, cost, `Renew lease (+${days} days)`, { done: `Lease extended ${days} days`, apply() { L.end = Math.min(L.end + days * DAYMS, ts + 60 * DAYMS); } });
      return afford(me, cost, `Lease ${days} days`, { note: `${days} days, no daily fee`, done: `Leased for ${days} days`, apply() { setLand(w, k, { o: me.id, t: 'lease', end: ts + days * DAYMS }); } });
    }
    if (T.k === 'build') {
      const d = CATALOG[T.item];
      if (!d) return no();
      if (g === 'road') return no('Roads are public, you cannot build on them');
      if (other) return no(other);
      if (g !== 'empty') return no('Already built on');
      if (!mine) return no('You need land first: Land > buy, rent or lease this plot');
      if (!d.zones.includes(z)) return no(`${d.name} can only go in the ${d.zones.split('').map(q => ZONES[q].toLowerCase()).join(' or ')} district (this is ${ZONES[z].toLowerCase()})`);
      if (c.pop < d.unlock) return no(`${d.name} unlocks at ${d.unlock} residents (you have ${c.pop})`);
      return afford(me, d.cost, `Build ${d.name}`, { done: `${d.name} built`, apply() { w.grid[y][x] = T.item; } });
    }
    if (T.k === 'job') {
      const mineJob = w.jobs[me.id];
      if (T.mode === 'quit') return mineJob ? { ok: true, cost: 0, verb: 'Quit job', done: 'You quit your job', apply() { setJob(w, me.id, null); } } : no('You do not have a job');
      const d = CATALOG[g];
      if (T.mode !== 'apply' || !d || !d.sal) return no('No job here');
      if (!L) return no('No job here');
      if (L.o === me.id) return no('You own this place. Hire other players instead');
      if (!nearRoad(w, x, y)) return no('This workplace has no working road, so it is closed');
      if (mineJob && jobValid(w, mineJob)) return no('You already have a job. Quit it first');
      if (openN(w, k, g) <= 0) return no('This place is not hiring');
      if ((w.staff[k] || 0) >= openN(w, k, g)) return no('No free positions here');
      return { ok: true, cost: 0, verb: 'Take job', note: `${fmt(d.sal)}/day`, done: `You work at the ${d.name} now: ${fmt(d.sal)}/day`, apply() { setJob(w, me.id, { k, g, at: ts }); } };
    }
    if (T.k === 'hire') {
      const d = CATALOG[g], n = T.n;
      if (other) return no(other);
      if (!mine || !d || !d.slots) return no('Hiring works on a workplace you own');
      if (!Number.isInteger(n) || n < 0 || n > d.slots) return no(`Open positions: 0 to ${d.slots}`);
      return { ok: true, cost: 0, verb: 'Set hiring', done: n ? `${n} position${n > 1 ? 's' : ''} open` : 'Hiring closed', apply() {
        L.h = n; const staff = workersAt(w, k).sort((a, b) => (w.jobs[b].at || 0) - (w.jobs[a].at || 0)), fired = [];
        while (staff.length > n) { const id = staff.shift(); setJob(w, id, null); fired.push(id); }
        this.fired = fired; } };
    }
    if (T.k === 'eat') {
      const f = FOOD[g];
      if (!f || !L) return no('No food is sold here');
      const dt = new Date(ts), hr = dt.getUTCHours(), dw = dt.getUTCDay();
      const open = CIVIC[g] ? dw !== 0 && hr >= 6 && hr < 18 : CATALOG[g].at(hr, dw) > 0;
      if (!open) return no('Closed right now');
      if (!CIVIC[g] && !nearRoad(w, x, y)) return no('Closed: no working road');
      if ((me.fedUntil || 0) - ts > FEED_CAP - f.hours * HOUR_MS) return no('You are already full');
      return afford(me, f.cost, f.label, { note: `fed for ${f.hours}h`, done: `${f.label}: fed for ${f.hours} hours`,
        pay: { to: L.o, amt: L.o ? Math.round(f.cost * OWNER_SHARE) : 0 },
        apply() { me.fedUntil = Math.min(ts + FEED_CAP, Math.max(ts, me.fedUntil || 0) + f.hours * HOUR_MS); } });
    }
    if (T.k === 'furnish') {
      if (other) return no(other);
      if (!mine || g !== 'house') return no('Furnishing works on a house you own');
      const lv = L.f || 0; if (lv >= 2) return no('This house is fully furnished');
      return afford(me, FURNISH_COST[lv], `Furnish (level ${lv + 1})`, { note: `+${Math.round(FURNISH_BOOST * 100)}% rent`, done: `House furnished, level ${lv + 1}`, apply() { L.f = lv + 1; } });
    }
    if (T.k === 'vehicle') {
      const cur = w.cars && w.cars[me.id];
      if (T.mode === 'sell') return cur ? { ok: true, gain: Math.round(CARS[cur].cost * 0.5), verb: 'Sell vehicle', done: 'Vehicle sold', apply() { delete w.cars[me.id]; } } : no('You have no vehicle');
      const v = CARS[T.item]; if (!v) return no();
      if (cur) return no('You already have a vehicle. Sell it first');
      return afford(me, v.cost, `Buy ${v.name}`, { done: `You bought a ${v.name}`, apply() { w.cars[me.id] = T.item; } });
    }
    if (T.k === 'sell') {
      if (g === 'road') {
        if (!mine) return no('Public roads cannot be removed');
        return { ok: true, gain: ROAD.cost / 2, verb: 'Remove road', done: 'Road removed', apply() { w.grid[y][x] = 'empty'; delete w.cracked[k]; } };
      }
      if (other) return no(other);
      if (CIVIC[g]) return no('That is a city building');
      if (CATALOG[g]) { const d = CATALOG[g]; return { ok: true, gain: Math.round(d.cost * 0.6), verb: `Sell ${d.name}`, done: `${d.name} sold`, apply() { w.grid[y][x] = 'empty'; if (L) { delete L.f; delete L.h; } } }; }
      if (!mine) return no('Nothing to sell here');
      if (L.t === 'own') return { ok: true, gain: Math.round(landPrice(w, x, y) * LAND.sell), verb: 'Sell plot', done: 'Plot sold', apply() { delLand(w, k); } };
      return { ok: true, gain: 0, verb: L.t === 'rent' ? 'End rent' : 'Give up lease', done: L.t === 'rent' ? 'Rent ended' : 'Lease given up', apply() { delLand(w, k); } };
    }
    return no();
  }
  function perform(w, me, T, x, y, c, ts) {
    const p = plan(w, me, T, x, y, c, ts);
    if (!p.ok) return p;
    if (p.gain) me.money += p.gain;
    me.money -= p.cost || 0;
    p.apply();
    return p;
  }

  const api = { LAW, POLICE, PRISONS, countNear, policeCover, raidRisk, nearestPolice, prisons, N, HOUR, DAYMS, MAXAWAY, CUR, START_MONEY, WAGE, LIVING, LIVING_ITEMS, FURNISH_COST, FURNISH_BOOST, FOUND_COST, PAY_MIN, PAY_MAX, MAYOR_PAY, CARS, payMul, ROAD, LAND, CATALOG, TIERS, CIVIC, ZONES, key, blankGrid, makeWorld, setLand, delLand, reindex, hash,
    zoneOf, nearRoad, intactRoad, landPrice, rentDaily, leaseCost, fmt, seedWorld, initCivic, census, rates, dumsorAt, FOOD, FEED_CAP, OWNER_SHARE, HUNGRY_FACTOR, STAFF_FLOOR, openN, DUMSOR_FACTOR, projectDay, setJob, workersAt, jobValid, openJobs, hourPay, dayYield, netWorth, settle, expireDue, plan, perform, clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Rules = api;
})(typeof self !== 'undefined' ? self : this);
