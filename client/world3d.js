
// ---------- optional 3D view (Three.js loaded only when the player taps 3D) ----------
(function () {
  const btn = $('v3d'); if (!btn) return;
  let T = null, on = false, loading = false, ren, scene, cam3, mesh = {}, hero, sun, amb, raf = 0, sig = '', lastSig = 0;
  let orbit = window.__o3 = { a: 0.8, e: 0.9, d: 15 }, target = { x: 32, z: 32 }, pos = { x: 32, z: 32 }, ptrs = new Map(), moved = 0, walk = 0;
  const cv = document.createElement('canvas'); cv.id = 'c3'; $('wrap').appendChild(cv);
  const BC = { house: '#e8c39e', shop: '#4f8fd6', club: '#8b5cf6', church: '#f1f5f9', school: '#f59e0b', hospital: '#f8fafc', cityhospital: '#f8fafc', factory: '#8b8f98', airport: '#5d6570', market: '#d97706', citymarket: '#d97706', townhall: '#cbd5e1', police: '#334155', policehq: '#334155', prison: '#4b5563', cityprison: '#4b5563', chopbar: '#ef4444', trotro: '#facc15', den: '#4a3b52', park: '#4fa04f' };
  const BH = { house: 0.9, shop: 1, club: 1.2, church: 1.5, school: 1.1, hospital: 1.7, cityhospital: 1.7, factory: 1.3, airport: 0.15, market: 0.8, citymarket: 0.8, townhall: 1.7, police: 1.1, policehq: 1.4, prison: 1.2, cityprison: 1.2, chopbar: 0.8, trotro: 0.5, den: 0.9, park: 0.05 };
  function load(cb) {
    if (T) return cb(); if (loading) return; loading = true; btn.textContent = '…';
    const s = document.createElement('script'); s.src = '/three.min.js';
    s.onload = () => { T = window.THREE; loading = false; cb(); };
    s.onerror = () => { loading = false; btn.textContent = '3D'; toast && toast('3D could not load. Check your connection.'); };
    document.head.appendChild(s);
  }
  const col = (c, k) => new T.Color(c).multiplyScalar(k || 1);
  function init() {
    BOX = new T.BoxGeometry(1, 1, 1); CYL = new T.CylinderGeometry(0.5, 0.5, 1, 10); PYR = new T.ConeGeometry(0.7071, 1, 4); CONE = new T.ConeGeometry(0.5, 1, 7); DOME = new T.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2); LEAF = new T.SphereGeometry(0.5, 10, 8);
    ren = new T.WebGLRenderer({ canvas: cv, antialias: true }); ren.setPixelRatio(Math.min(2, devicePixelRatio || 1)); ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap;
    scene = new T.Scene(); cam3 = new T.PerspectiveCamera(50, 1, 0.1, 200);
    amb = new T.HemisphereLight(0xffffff, 0x556655, 0.9); scene.add(amb);
    sun = new T.DirectionalLight(0xffffff, 1); sun.position.set(20, 30, 10); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 90 }); scene.add(sun, sun.target);
    const g = new T.PlaneGeometry(400, 400); const sea = new T.Mesh(g, new T.MeshLambertMaterial({ color: 0x2a6f97 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -0.06; scene.add(sea);
    hero = makeHero(me.av); scene.add(hero.g);
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; });
    cv.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d0 = Math.hypot(a.x - b.x, a.y - b.y); p.x = e.clientX; p.y = e.clientY; const [a2, b2] = [...ptrs.values()]; const d1 = Math.hypot(a2.x - b2.x, a2.y - b2.y); orbit.d = Math.max(6, Math.min(50, orbit.d * d0 / Math.max(1, d1))); moved += 99; return; }
      orbit.a -= dx * 0.008; orbit.e = Math.max(0.35, Math.min(1.4, orbit.e + dy * 0.006)); moved += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY;
    });
    const up = e => { const had = ptrs.delete(e.pointerId); if (had && moved < 8 && ptrs.size === 0) tapTo(e.clientX, e.clientY); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => ptrs.delete(e.pointerId));
    cv.addEventListener('wheel', e => { e.preventDefault(); orbit.d = Math.max(6, Math.min(50, orbit.d * (1 + e.deltaY * 0.001))); }, { passive: false });
    const k = {}; addEventListener('keydown', e => { k[e.key.toLowerCase()] = 1; }); addEventListener('keyup', e => { k[e.key.toLowerCase()] = 0; }); window.__k3 = k;
  }
  function tapTo(cx, cy) {
    const r = cv.getBoundingClientRect(), m = new T.Vector2((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const rc = new T.Raycaster(); rc.setFromCamera(m, cam3); const o = rc.ray.origin, d = rc.ray.direction; if (d.y > -0.01) return;
    const t = -o.y / d.y; target = { x: Math.max(1, Math.min(N - 1, o.x + d.x * t)), z: Math.max(1, Math.min(N - 1, o.z + d.z * t)) };
  }
  function makeHero(av) {
    av = Object.assign({ g: 0, s: 2, h: 0, c: 0, o: 1 }, av || {}); const g = new T.Group(), L = c => new T.MeshLambertMaterial({ color: c }), f = av.g === 1;
    const sk = L(SKIN[av.s]), hc = L(HAIRC[av.c]), oc = L(OUTC[av.o]), pants = L(f ? '#57434a' : '#35404a'), shoe = L('#292725');
    const add = (geo, m, x, y, z, par) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); (par || g).add(o); return o; };
    const sph = (r, ws, hs) => new T.SphereGeometry(r, ws || 16, hs || 12), cy = (r1, r2, h, n) => new T.CylinderGeometry(r1, r2, h, n || 12);
    // Smaller head and softer features keep the silhouette closer to an adult person.
    const legs = [-0.075, 0.075].map(x => { const l = new T.Group(); l.position.set(x, 0.47, 0); g.add(l); add(cy(0.052, 0.065, 0.36, 10), f ? sk : pants, 0, -0.18, 0, l); add(new T.BoxGeometry(0.105, 0.055, 0.16), shoe, 0, -0.37, 0.025, l); return l; });
    if (f) { add(new T.CapsuleGeometry(0.13, 0.28, 4, 10), oc, 0, 0.79, 0); add(cy(0.14, 0.2, 0.25, 12), oc, 0, 0.54, 0); }
    else { add(new T.CapsuleGeometry(0.15, 0.31, 4, 10), oc, 0, 0.79, 0); add(cy(0.15, 0.16, 0.07, 12), pants, 0, 0.53, 0); }
    const arms = [-1, 1].map(sd => { const a = new T.Group(); a.position.set(sd * 0.17, 0.96, 0); g.add(a); add(cy(0.047, 0.052, 0.23, 10), oc, 0, -0.12, 0, a); add(cy(0.034, 0.04, 0.23, 10), sk, 0, -0.34, 0, a); add(sph(0.033), sk, 0, -0.47, 0, a); return a; });
    add(cy(0.045, 0.05, 0.08, 10), sk, 0, 1.04, 0);
    add(sph(0.14, 20, 16), sk, 0, 1.18, 0);
    const eye = L('#251c17');
    [-0.048, 0.048].forEach(x => { add(sph(0.014, 10, 8), eye, x, 1.195, 0.129); add(new T.BoxGeometry(0.034, 0.006, 0.006), hc, x, 1.222, 0.128); });
    add(sph(0.018, 10, 8), sk, 0, 1.155, 0.137);
    add(new T.BoxGeometry(0.035, 0.006, 0.006), L('#59342e'), 0, 1.112, 0.132);
    const cap = (r, yy) => add(new T.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.54), hc, 0, yy, -0.015);
    if (av.h === 0) cap(0.146, 1.22);
    else if (av.h === 1) cap(0.18, 1.23);
    else if (av.h === 2) { cap(0.148, 1.22); for (let i = 0; i < 6; i++) { const x = (i - 2.5) * 0.045; const br = add(cy(0.018, 0.013, 0.36, 7), hc, x, 0.91, -0.045); br.rotation.z = -x * 0.35; } }
    else if (av.h === 3) { cap(0.148, 1.22); add(sph(0.064, 12, 10), hc, 0, 1.36, -0.06); }
    g.traverse(m => { m.castShadow = true; }); g.scale.setScalar(0.8);
    const sh = new T.Mesh(new T.CircleGeometry(0.2, 16), new T.MeshBasicMaterial({ color: 0, transparent: true, opacity: 0.18 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; g.add(sh);
    return { g, legs, arms, key: JSON.stringify(av) };
  }
  // ---- merged low-poly model builder: one mesh per material, so hundreds of buildings stay fast ----
  function G() { return { s: [], w: [], labels: [] }; }            // s = solid parts, w = glowing parts (windows, lamps, neon)
  function addLabel(g, text, x, y, z, width, bg) { g.labels.push({ text, x, y, z, width, bg }); }
  function part(list, geo, x, y, z, color, ry, sx, sy, sz) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(), m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry || 0, 0)), new T.Vector3(sx || 1, sy || 1, sz || 1));
    g.applyMatrix4(m); const c = new T.Color(color), n = g.attributes.position.count, cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; } g.setAttribute('color', new T.BufferAttribute(cols, 3)); list.push(g);
  }
  let BOX, CYL, PYR, CONE, DOME, LEAF;
  const box = (L, x, y, z, w, h, d, c, ry) => part(L, BOX, x, y + h / 2, z, c, ry, w, h, d);          // y = bottom
  const roof = (L, x, y, z, w, h, d, c) => part(L, PYR, x, y + h / 2, z, c, Math.PI / 4, w, h, d);    // pyramid roof, base w x d
  const cyl = (L, x, y, z, w, h, c) => part(L, CYL, x, y + h / 2, z, c, 0, w, h, w);
  function windows(g, x, y, z, w, h, d, rows, cols, c) {   // glowing windows on the front (+z) and right (+x) faces
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const fy = y + h * (r + 0.55) / rows - 0.03, fx = x - w / 2 + w * (k + 0.5) / cols;
      box(g.w, fx, fy, z + d / 2 + 0.005, w / cols * 0.45, h / rows * 0.4, 0.02, c || '#ffe9a8');
      const fz = z - d / 2 + d * (k + 0.5) / cols; box(g.w, x + w / 2 + 0.005, fy, fz, 0.02, h / rows * 0.4, d / cols * 0.45, c || '#ffe9a8');
    }
  }
  function building(g, t, x, y, hash) {
    const cx = x + 0.5, cz = y + 0.5, v = hash % 4, wall = ['#f0d9b5', '#e8c39e', '#f5e6c8', '#d9b99b'][v], tint = ['#b45309', '#9a3412', '#7c2d12', '#b91c1c'][v];
    if (t === 'house') {
      const floors = hash % 4 === 0 ? 2 : 1, h = floors === 2 ? 0.84 : 0.52 + (hash % 3) * 0.035, plaster = ['#d7c3a1', '#d9b6a5', '#d5cbb5', '#c8bca3'][v];
      box(g.s, cx, 0.08, cz, 0.78, h, 0.68, plaster); box(g.s, cx, 0.08 + h, cz, 0.84, 0.07, 0.74, '#9b9282');
      box(g.s, cx, 0.08 + h + 0.07, cz - 0.31, 0.84, 0.08, 0.08, '#ded2bc'); box(g.s, cx, 0.08 + h + 0.07, cz + 0.31, 0.84, 0.08, 0.08, '#ded2bc');
      windows(g, cx, 0.12, cz, 0.72, h - 0.08, 0.68, floors, 2, '#8bb8c2');
      box(g.s, cx + 0.22, 0.08, cz + 0.351, 0.14, 0.31, 0.025, '#76503d'); box(g.s, cx + 0.22, 0.08, cz + 0.37, 0.19, 0.045, 0.12, '#b9aa93');
      for (let i = 0; i < 4; i++) box(g.s, cx - 0.22 + i * 0.15, 0.16, cz + 0.355, 0.014, 0.27, 0.014, '#72665a');
      box(g.s, cx - 0.03, 0.08 + h - 0.11, cz + 0.39, 0.42, 0.06, 0.18, ['#9f5747', '#ac8040', '#547565'][hash % 3]);
      if (hash % 3 === 0) { cyl(g.s, cx - 0.22, 0.08 + h + 0.15, cz - 0.16, 0.23, 0.25, '#536d79'); cyl(g.s, cx - 0.22, 0.08 + h + 0.28, cz - 0.16, 0.19, 0.025, '#758b91'); }
    }
    else if (t === 'shop') {
      const paint = ['#d8c7a6', '#d5b1a4', '#c8d0bd', '#d8c7b8'][v];
      box(g.s, cx, 0.08, cz, 0.82, 0.58, 0.7, paint); box(g.s, cx, 0.66, cz, 0.86, 0.08, 0.74, '#77756e');
      box(g.s, cx, 0.45, cz + 0.358, 0.66, 0.25, 0.025, '#514b43'); box(g.s, cx, 0.45, cz + 0.376, 0.6, 0.19, 0.015, '#756f64');
      box(g.s, cx, 0.72, cz + 0.382, 0.78, 0.12, 0.04, ['#9f4637', '#39627a', '#8b6b2d', '#40624c'][v]);
      for (let i = 0; i < 6; i++) box(g.s, cx - 0.32 + i * 0.128, 0.62, cz + 0.42, 0.11, 0.06, 0.12, i % 2 ? '#d7c2a0' : '#c3aa83');
      for (let i = 0; i < 5; i++) box(g.s, cx - 0.34 + i * 0.17, 0.75, cz + 0.36, 0.12, 0.035, 0.18, ['#ad493a', '#c28d37', '#4d7357'][i % 3]);
      for (let i = 0; i < 6; i++) box(g.s, cx - 0.34 + i * 0.135, 0.12, cz + 0.36, 0.012, 0.21, 0.018, '#796d5d');
      addLabel(g, ['MOBILE MONEY', 'COLD DRINKS', 'PROVISIONS'][v % 3], cx, 0.74, cz + 0.402, 0.68, ['#9c483b', '#3d6579', '#8f7134'][v]);
    }
    else if (t === 'club') { box(g.s, cx, 0.08, cz, 0.8, 0.9, 0.74, '#312e81'); box(g.w, cx, 0.98, cz, 0.84, 0.05, 0.78, '#e879f9'); box(g.w, cx, 0.55, cz + 0.38, 0.5, 0.12, 0.03, '#22d3ee'); windows(g, cx, 0.25, cz, 0.7, 0.5, 0.74, 1, 3, '#c084fc'); }
    else if (t === 'church') { box(g.s, cx, 0.08, cz + 0.08, 0.7, 0.5, 0.72, '#f8fafc'); roof(g.s, cx, 0.58, cz + 0.08, 0.84, 0.28, 0.84, '#64748b'); box(g.s, cx, 0.08, cz - 0.28, 0.24, 1.2, 0.24, '#f8fafc'); roof(g.s, cx, 1.28, cz - 0.28, 0.32, 0.3, 0.32, '#475569'); box(g.s, cx, 1.58, cz - 0.28, 0.04, 0.2, 0.04, '#facc15'); box(g.s, cx, 1.66, cz - 0.28, 0.14, 0.04, 0.04, '#facc15'); windows(g, cx, 0.12, cz + 0.08, 0.6, 0.4, 0.72, 1, 3, '#93c5fd'); }
    else if (t === 'school') { box(g.s, cx, 0.08, cz, 0.92, 0.5, 0.58, '#fde68a'); box(g.s, cx, 0.58, cz, 0.96, 0.05, 0.62, '#b45309'); cyl(g.s, cx + 0.38, 0.08, cz + 0.36, 0.03, 0.9, '#94a3b8'); box(g.s, cx + 0.46, 0.8, cz + 0.36, 0.14, 0.1, 0.02, '#16a34a'); windows(g, cx, 0.1, cz, 0.84, 0.42, 0.58, 1, 4); }
    else if (t === 'hospital' || t === 'cityhospital') { box(g.s, cx, 0.08, cz, 0.84, 1.0, 0.7, '#f8fafc'); box(g.s, cx, 0.5, cz + 0.36, 0.26, 0.07, 0.02, '#dc2626'); box(g.s, cx, 0.5, cz + 0.36, 0.07, 0.26, 0.02, '#dc2626'); windows(g, cx, 0.1, cz, 0.74, 0.9, 0.7, 3, 3, '#bfe8ff'); }
    else if (t === 'factory') { box(g.s, cx - 0.05, 0.08, cz + 0.1, 0.84, 0.55, 0.6, '#9ca3af'); box(g.s, cx - 0.05, 0.63, cz + 0.1, 0.88, 0.05, 0.64, '#4b5563'); cyl(g.s, cx - 0.28, 0.08, cz - 0.28, 0.16, 1.1, '#78716c'); cyl(g.s, cx + 0.12, 0.08, cz - 0.28, 0.16, 0.9, '#78716c'); box(g.w, cx - 0.28, 1.15, cz - 0.28, 0.1, 0.03, 0.1, '#f97316'); windows(g, cx - 0.05, 0.2, cz + 0.1, 0.7, 0.25, 0.6, 1, 3, '#fcd34d'); }
    else if (t === 'airport') { box(g.s, cx, 0.08, cz, 0.98, 0.04, 0.98, '#4b5563'); for (let i = 0; i < 4; i++) box(g.s, cx, 0.125, cz - 0.36 + i * 0.24, 0.08, 0.01, 0.12, '#f8fafc'); box(g.s, cx - 0.3, 0.08, cz - 0.3, 0.3, 0.35, 0.3, '#e5e7eb'); cyl(g.s, cx - 0.3, 0.43, cz - 0.3, 0.12, 0.3, '#94a3b8'); box(g.w, cx - 0.3, 0.7, cz - 0.3, 0.2, 0.05, 0.2, '#38bdf8'); }
    else if (t === 'market' || t === 'citymarket') { for (const [dx, dz, c] of [[-0.24, -0.22, '#a94f3b'], [0.24, -0.22, '#4b7558'], [-0.24, 0.24, '#c2923a'], [0.24, 0.24, '#42677f']]) { box(g.s, cx + dx, 0.08, cz + dz, 0.32, 0.2, 0.3, '#876d4d'); for (const sx of [-0.13, 0.13]) for (const sz of [-0.12, 0.12]) box(g.s, cx + dx + sx, 0.28, cz + dz + sz, 0.025, 0.3, 0.025, '#88765e'); box(g.s, cx + dx, 0.44, cz + dz, 0.38, 0.035, 0.36, c); box(g.s, cx + dx, 0.25, cz + dz + 0.17, 0.3, 0.045, 0.025, '#c49a5c'); } }
    else if (t === 'townhall') { box(g.s, cx, 0.08, cz, 0.9, 0.7, 0.7, '#e2e8f0'); for (let i = 0; i < 4; i++) cyl(g.s, cx - 0.33 + i * 0.22, 0.08, cz + 0.4, 0.07, 0.7, '#f8fafc'); box(g.s, cx, 0.78, cz + 0.05, 1.0, 0.07, 0.86, '#94a3b8'); part(g.s, DOME, cx, 0.85, cz, '#cbd5e1', 0, 0.5, 0.9, 0.5); windows(g, cx, 0.12, cz, 0.8, 0.5, 0.7, 1, 4); }
    else if (t === 'police' || t === 'policehq') { box(g.s, cx, 0.08, cz, 0.8, 0.75, 0.66, '#475569'); box(g.s, cx, 0.83, cz, 0.84, 0.05, 0.7, '#1e293b'); box(g.w, cx, 0.4, cz + 0.34, 0.3, 0.1, 0.03, '#60a5fa'); box(g.w, cx + 0.3, 0.9, cz, 0.1, 0.07, 0.1, '#ef4444'); windows(g, cx, 0.12, cz, 0.7, 0.55, 0.66, 2, 3, '#bfe8ff'); }
    else if (t === 'prison' || t === 'cityprison') { box(g.s, cx, 0.08, cz, 0.96, 0.3, 0.96, '#6b7280'); box(g.s, cx, 0.38, cz, 0.6, 0.55, 0.6, '#4b5563'); for (const [dx, dz] of [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]]) box(g.s, cx + dx, 0.08, cz + dz, 0.1, 0.5, 0.1, '#374151'); windows(g, cx, 0.45, cz, 0.5, 0.38, 0.6, 1, 3, '#fcd34d'); }
    else if (t === 'chopbar') {
      box(g.s, cx, 0.08, cz, 0.72, 0.26, 0.54, '#c8b18b'); box(g.s, cx, 0.38, cz, 0.88, 0.06, 0.74, '#807666');
      for (const dx of [-0.35, 0.35]) for (const dz of [-0.28, 0.28]) box(g.s, cx + dx, 0.08, cz + dz, 0.045, 0.62, 0.045, '#76664f');
      box(g.s, cx, 0.72, cz, 0.98, 0.06, 0.84, '#77766d');
      for (let i = 0; i < 8; i++) box(g.s, cx - 0.42 + i * 0.12, 0.76, cz + 0.38, 0.12, 0.035, 0.08, ['#a74d3c', '#c49743', '#4e7258'][i % 3]);
      box(g.s, cx, 0.39, cz + 0.34, 0.62, 0.12, 0.08, '#986a48'); for (const dx of [-0.23, -0.06, 0.11]) cyl(g.s, cx + dx, 0.4, cz + 0.34, 0.12, 0.14, '#4b4136');
      box(g.s, cx, 0.57, cz + 0.39, 0.68, 0.1, 0.03, '#8f4737'); box(g.s, cx, 0.32, cz + 0.42, 0.7, 0.04, 0.025, '#b28242');
      addLabel(g, 'WAAKYE • BANKU', cx, 0.57, cz + 0.411, 0.66, '#8f4737');
    }
    else if (t === 'trotro') {
      box(g.s, cx, 0.08, cz - 0.2, 0.82, 0.06, 0.46, '#8a867c');
      for (const dx of [-0.38, 0.38]) for (const dz of [-0.34, 0.02]) box(g.s, cx + dx, 0.08, cz + dz, 0.035, 0.58, 0.035, '#7e786b');
      box(g.s, cx, 0.64, cz - 0.16, 0.9, 0.07, 0.6, '#a9a18e'); box(g.s, cx, 0.7, cz + 0.22, 0.84, 0.11, 0.04, '#6b4f39');
      box(g.s, cx, 0.77, cz + 0.25, 0.76, 0.1, 0.025, '#405b63');
      const van = (x, z, body, stripe) => { box(g.s, x, 0.12, z, 0.4, 0.23, 0.25, body); box(g.s, x - 0.025, 0.34, z - 0.015, 0.32, 0.2, 0.23, '#b8d0d1'); box(g.s, x, 0.2, z + 0.13, 0.4, 0.045, 0.025, stripe); box(g.s, x, 0.085, z, 0.3, 0.045, 0.28, '#292a29'); for (const dx of [-0.13, 0.13]) cyl(g.s, x + dx, 0.08, z + 0.11, 0.075, 0.06, '#302e2c'); };
      van(cx - 0.22, cz - 0.06, '#e6e0cf', '#c99a3e'); van(cx + 0.22, cz + 0.25, '#e4dfd0', '#4d6d72');
      addLabel(g, 'MADINA • CIRCLE', cx, 0.78, cz + 0.277, 0.78, '#365c4b');
    }
    else if (t === 'hostel') { box(g.s, cx, 0.08, cz, 0.78, 1.0, 0.66, '#a9c4e8'); box(g.s, cx, 1.08, cz, 0.84, 0.05, 0.72, '#3f5b85'); windows(g, cx, 0.12, cz, 0.7, 0.9, 0.66, 3, 3, '#ffe9a8'); box(g.s, cx, 0.08, cz + 0.34, 0.16, 0.26, 0.02, '#334155'); box(g.w, cx, 0.5, cz + 0.345, 0.4, 0.08, 0.02, '#fde047'); }
    else if (t === 'den') { box(g.s, cx, 0.08, cz, 0.6, 0.4, 0.55, '#3b2f45'); roof(g.s, cx, 0.48, cz, 0.74, 0.22, 0.68, '#1f2937'); box(g.w, cx + 0.1, 0.25, cz + 0.29, 0.12, 0.14, 0.02, '#f87171'); }
    else if (t !== 'park') { box(g.s, cx, 0.08, cz, 0.72, 0.9, 0.72, '#e5e7eb'); windows(g, cx, 0.1, cz, 0.7, 0.8, 0.72, 3, 3); }
  }
  function tree(g, x, z, k, hash) { const c = ['#36784b', '#438457', '#527f49'][hash % 3]; cyl(g.s, x, 0.08, z, 0.09, 0.46 * k, '#76543b'); part(g.s, LEAF, x, 0.66 * k, z, c, 0, 0.48 * k, 0.39 * k, 0.48 * k); part(g.s, LEAF, x - 0.15 * k, 0.57 * k, z + 0.06 * k, c, 0, 0.3 * k, 0.3 * k, 0.34 * k); part(g.s, LEAF, x + 0.14 * k, 0.58 * k, z - 0.08 * k, c, 0, 0.32 * k, 0.31 * k, 0.33 * k); }
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count; if (!n) return null;
    const P = new Float32Array(n * 3), N3 = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
    for (const g of list) { P.set(g.attributes.position.array, o * 3); N3.set(g.attributes.normal.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; g.dispose(); }
    const m = new T.BufferGeometry(); m.setAttribute('position', new T.BufferAttribute(P, 3)); m.setAttribute('normal', new T.BufferAttribute(N3, 3)); m.setAttribute('color', new T.BufferAttribute(C, 3)); return m;
  }
  let solidMat, glowMat, roads = [], signs = [];
  function rebuild() {
    for (const k in mesh) { scene.remove(mesh[k]); mesh[k].geometry.dispose(); } mesh = {}; roads = [];
    for (const s of signs) { scene.remove(s); s.geometry.dispose(); s.material.map.dispose(); s.material.dispose(); } signs = [];
    const g = G(); if (!solidMat) { solidMat = new T.MeshLambertMaterial({ vertexColors: true }); glowMat = new T.MeshBasicMaterial({ vertexColors: true }); }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = world.grid[y][x], h = ((x * 73856093) ^ (y * 19349663)) >>> 0;
      if (t === 'road') {
        roads.push([x, y]); box(g.s, x + 0.5, 0, y + 0.5, 1, 0.07, 1, world.cracked[y * N + x] ? '#5a4a40' : '#3b4048');
        const rr = n => world.grid[y + n[1]]?.[x + n[0]] === 'road';
        if (!rr([1, 0]) || !rr([-1, 0]) ? rr([0, 1]) || rr([0, -1]) : false) { box(g.s, x + 0.5, 0.07, y + 0.5, 0.04, 0.005, 0.4, '#e5e7eb'); }
        else if (rr([1, 0]) || rr([-1, 0])) { box(g.s, x + 0.5, 0.07, y + 0.5, 0.4, 0.005, 0.04, '#e5e7eb'); }
        if (h % 6 === 0) { cyl(g.s, x + 0.08, 0.07, y + 0.08, 0.04, 0.5, '#94a3b8'); box(g.w, x + 0.08, 0.57, y + 0.08, 0.1, 0.05, 0.1, '#fde68a'); }
        continue;
      }
      const base = t === 'empty' ? ['#c3ae7e', '#b8a372', '#c9b889', '#b5a174'][h & 3] : (GROUND[t] || '#9ca3af');
      box(g.s, x + 0.5, 0, y + 0.5, 1, 0.08, 1, base);
      if (t === 'empty' && h % 11 === 0) tree(g, x + 0.5, y + 0.5, 0.8 + (h % 5) * 0.1, h >> 3);
      else if (t === 'park') { tree(g, x + 0.28, y + 0.35, 1, h); tree(g, x + 0.72, y + 0.7, 0.85, h >> 2); box(g.s, x + 0.5, 0.08, y + 0.55, 0.3, 0.07, 0.08, '#78350f'); }
      else if (t !== 'empty') building(g, t, x, y, h);
    }
    const ms = merge(g.s), mw = merge(g.w);
    if (ms) { const m = new T.Mesh(ms, solidMat); m.castShadow = m.receiveShadow = true; scene.add(m); mesh.solid = m; }
    if (mw) { const m = new T.Mesh(mw, glowMat); scene.add(m); mesh.glow = m; }
    for (const s of g.labels) {
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d');
      x.fillStyle = s.bg; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#f4ead6'; x.font = '700 48px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s.text, c.width / 2, c.height / 2, c.width - 18);
      const tex = new T.CanvasTexture(c), mat = new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide }), sign = new T.Mesh(new T.PlaneGeometry(s.width, 0.12), mat);
      sign.position.set(s.x, s.y, s.z); scene.add(sign); signs.push(sign);
    }
    spawnLife();
  }
  // ---- life: cars on the roads and people on the ground (visual only) ----
  let cars = [], folks = [];
  function spawnLife() {
    for (const c of cars) scene.remove(c.g); for (const f of folks) scene.remove(f.g); cars = []; folks = [];
    const M = c => new T.MeshLambertMaterial({ color: c });
    if (roads.length > 2) for (let i = 0; i < Math.min(14, 2 + roads.length / 6 | 0); i++) {
      const g = new T.Group(), col = ['#ba8a2d', '#3b6680', '#e6e0d2', '#b34a3c', '#58784f', '#68727a'][i % 6], van = i % 3 === 0;
      const b = new T.Mesh(new T.BoxGeometry(van ? 0.48 : 0.4, 0.14, 0.24), M(col)); b.position.y = 0.19;
      const cab = new T.Mesh(new T.BoxGeometry(van ? 0.28 : 0.24, van ? 0.18 : 0.14, 0.22), M('#7e999a')); cab.position.set(-0.015, 0.34, 0);
      const wheels = [];
      for (const x of [-0.15, 0.15]) for (const z of [-0.105, 0.105]) { const w = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 0.045, 10), M('#292a29')); w.rotation.z = Math.PI / 2; w.position.set(x, 0.1, z); wheels.push(w); }
      const lamps = [-0.14, 0.14].map(x => { const l = new T.Mesh(new T.BoxGeometry(0.07, 0.035, 0.012), M('#f5e7bf')); l.position.set(x, 0.2, 0.126); return l; });
      g.add(b, cab, ...wheels, ...lamps); g.traverse(m => { m.castShadow = true; });
      const r = roads[(Math.random() * roads.length) | 0]; g.position.set(r[0] + 0.5, 0.02, r[1] + 0.5); scene.add(g); cars.push({ g, x: r[0] + 0.5, z: r[1] + 0.5, tx: r[0], tz: r[1], px: -1, pz: -1, d: 0 });
    }
    const footCells = [];
    for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) if (world.grid[y][x] === 'empty') footCells.push([x, y]);
    for (let i = 0; i < 18 && footCells.length; i++) {
      const o = makeNpc(), cell = footCells[(Math.random() * footCells.length) | 0], x = cell[0] + 0.5, z = cell[1] + 0.5; o.g.position.set(x, 0.08, z); scene.add(o.g); folks.push(Object.assign(o, { x, z, tx: x, tz: z, w: Math.random() * 6 }));
    }
  }
  function makeNpc() {
    return makeHero({ g: Math.random() < 0.5 ? 0 : 1, s: (Math.random() * 6) | 0, h: (Math.random() * 5) | 0, c: (Math.random() * 5) | 0, o: (Math.random() * 6) | 0 });
  }
  function stepLife(dt) {
    for (const c of cars) {
      const dx = c.tx + 0.5 - c.x, dz = c.tz + 0.5 - c.z, dd = Math.hypot(dx, dz);
      if (dd < 0.05) {
        const opts = roads.length < 400 ? roads.filter(r => Math.abs(r[0] - c.tx) + Math.abs(r[1] - c.tz) === 1 && !(r[0] === c.px && r[1] === c.pz)) : [[c.tx + 1, c.tz], [c.tx - 1, c.tz], [c.tx, c.tz + 1], [c.tx, c.tz - 1]].filter(r => world.grid[r[1]]?.[r[0]] === 'road' && !(r[0] === c.px && r[1] === c.pz));
        const n = opts.length ? opts[(Math.random() * opts.length) | 0] : (world.grid[c.pz]?.[c.px] === 'road' ? [c.px, c.pz] : null); if (n) { c.px = c.tx; c.pz = c.tz; c.tx = n[0]; c.tz = n[1]; }
      } else { const st = Math.min(dd, 1.6 * dt); c.x += dx / dd * st; c.z += dz / dd * st; c.g.rotation.y = Math.atan2(-dz, dx); }
      c.g.position.x = c.x + (c.tz !== c.pz ? 0.12 : 0); c.g.position.z = c.z + (c.tx !== c.px ? -0.12 : 0);
    }
    for (const f of folks) {
      const dx = f.tx - f.x, dz = f.tz - f.z, dd = Math.hypot(dx, dz);
      if (dd < 0.1) {
        if (Math.random() < 0.035) {
          const x = Math.floor(f.x), z = Math.floor(f.z), opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dz]) => world.grid[z + dz]?.[x + dx] === 'empty');
          if (opts.length) { const [dx, dz] = opts[(Math.random() * opts.length) | 0]; f.tx = x + dx + 0.5; f.tz = z + dz + 0.5; }
        }
        f.legs.forEach(l => { l.rotation.x = 0; }); f.arms.forEach(a => { a.rotation.x = 0; });
      } else { const st = Math.min(dd, 0.7 * dt); f.x += dx / dd * st; f.z += dz / dd * st; f.g.rotation.y = Math.atan2(dx, dz); f.w += dt * 7; const sw = Math.sin(f.w) * 0.38; f.legs[0].rotation.x = sw; f.legs[1].rotation.x = -sw; f.arms[0].rotation.x = -sw * 0.65; f.arms[1].rotation.x = sw * 0.65; }
      f.g.position.set(f.x, 0.08, f.z);
    }
  }
  function worldSig() { let s = ''; for (let y = 0; y < N; y++) s += world.grid[y].join(',') + ';'; return s.length + ':' + s.slice(0, 4000).split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7) + ':' + Object.keys(world.cracked || {}).length; }
  function frame() {
    if (!on) return; raf = requestAnimationFrame(frame);
    const W = innerWidth, H = innerHeight; if (cv.width !== (W * ren.getPixelRatio() | 0)) { ren.setSize(W, H, false); cam3.aspect = W / H; cam3.setViewOffset(W, H, 0, -H * 0.16, W, H); cam3.updateProjectionMatrix(); }
    const ts = performance.now(); if (ts - lastSig > 1500) { lastSig = ts; const s = worldSig(); if (s !== sig) { sig = s; rebuild(); } }
    const k = window.__k3 || {}, dt = 1 / 60, sp = 3.2 * dt; let mx = 0, mz = 0;
    if (k.w || k.arrowup) mz -= 1; if (k.s || k.arrowdown) mz += 1; if (k.a || k.arrowleft) mx -= 1; if (k.d || k.arrowright) mx += 1;
    if (mx || mz) { const ca = Math.cos(orbit.a), sa = Math.sin(orbit.a); target = { x: pos.x + (mx * ca - mz * sa) * 2, z: pos.z + (mx * sa + mz * ca) * 2 }; }
    const dx = target.x - pos.x, dz = target.z - pos.z, dd = Math.hypot(dx, dz);
    if (dd > 0.05) { const st = Math.min(dd, sp); pos.x += dx / dd * st; pos.z += dz / dd * st; hero.g.rotation.y = Math.atan2(dx, dz); walk += dt * 11; } else walk = 0;
    hero.g.position.set(pos.x, 0.08, pos.z); const sw = walk ? Math.sin(walk) * 0.7 : 0;
    hero.legs[0].rotation.x = sw; hero.legs[1].rotation.x = -sw; hero.arms[0].rotation.x = -sw; hero.arms[1].rotation.x = sw;
    hero.g.position.y = 0.08 + (walk ? Math.abs(Math.sin(walk)) * 0.03 : 0);
    stepLife(dt); sun.position.set(pos.x + 14, 26, pos.z + 8); sun.target.position.set(pos.x, 0, pos.z); sun.target.updateMatrixWorld();
    const sk = sky(), d = sk.d; if (glowMat) glowMat.color.setRGB(0.25 + 0.75 * (1 - d) + 0.15, 0.25 + 0.7 * (1 - d) + 0.15, 0.2 + 0.4 * (1 - d) + 0.2); scene.background = new T.Color().setRGB(0.04 + 0.5 * d, 0.07 + 0.72 * d, 0.2 + 0.78 * d);
    amb.intensity = 0.35 + 0.65 * d; sun.intensity = 0.15 + 0.95 * d; sun.color.setRGB(1, 0.8 + 0.2 * d, 0.65 + 0.35 * d);
    const cx = pos.x + 0.5, cz = pos.z + 0.5, ce = Math.cos(orbit.e) * orbit.d, sy = Math.sin(orbit.e) * orbit.d;
    cam3.position.set(cx + Math.sin(orbit.a) * ce, sy, cz + Math.cos(orbit.a) * ce); cam3.lookAt(cx, 0.6, cz);
    ren.render(scene, cam3);
  }
  function set(v) {
    on = v; btn.classList.toggle('on', v); btn.textContent = v ? '2D' : '3D'; document.body.classList.toggle('mode3d', v);
    if (v) { if (!ren) init(); sig = ''; if (hero && hero.key !== JSON.stringify(Object.assign({ g: 0, s: 2, h: 0, c: 0, o: 1 }, me.av || {}))) { scene.remove(hero.g); hero = makeHero(me.av); scene.add(hero.g); } cancelAnimationFrame(raf); frame(); }
    else cancelAnimationFrame(raf);
  }
  btn.addEventListener('click', () => { if (on) return set(false); load(() => { try { set(true); } catch (e) { btn.textContent = '3D'; toast && toast('Your device cannot run the 3D view.'); } }); });
})();
