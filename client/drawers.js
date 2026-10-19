// ---------- new structures ----------
const OPEN = {};                                   // which building types are open right now (set each frame)
const TEN = { own: '#fbbf24', rent: '#60a5fa', lease: '#c084fc' };
const OTHER = '#f472b6', CITY = '#94a3b8', ZONECOL = { r: '#4ade80', c: '#60a5fa', i: '#f59e0b' };
const GROUND = { cityhospital: '#d6dde6', citymarket: '#d8c59a', policehq: '#aab8cf', cityprison: '#9a9ea4', police: '#aab8cf', prison: '#9a9ea4', den: '#5b4f60', townhall: '#cfd0bd', hospital: '#d6dde6', market: '#d8c59a', house: '#8cc275', shop: '#b3bcc6', park: '#5fa85d', school: '#c9d2a8', church: '#a7d092', factory: '#a9aaa4', club: '#8a86a6', airport: '#5d6570', chopbar: '#c9b48a', trotro: '#6b7280' };

function plotBorder(sx, sy, col, fill) {
  const z = cam.z, hw = TW / 2 * z * 0.93, hh = TH / 2 * z * 0.93, cx = sx, cy = sy + TH / 2 * z;
  ctx.beginPath(); ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy); ctx.closePath();
  if (fill) { ctx.fillStyle = col + '2e'; ctx.fill(); }
  ctx.lineWidth = Math.max(1.5, 2 * z); ctx.strokeStyle = col; ctx.globalAlpha = 0.9; ctx.stroke(); ctx.globalAlpha = 1;
}
function walls(cx, cy, hw, hh, H, wall) {
  poly([[cx - hw, cy - H], [cx, cy + hh - H], [cx, cy + hh], [cx - hw, cy]], shade(wall, 0.95), true);
  poly([[cx + hw, cy - H], [cx, cy + hh - H], [cx, cy + hh], [cx + hw, cy]], shade(wall, 0.72), true);
}
function topFace(cx, cy, hw, hh, H, col) {
  poly([[cx, cy - hh - H], [cx + hw, cy - H], [cx, cy + hh - H], [cx - hw, cy - H]], col, true);
}
function nightLights(open, k, arr) { if (!ghost && NIGHT > 0.08 && k > 0.9 && open) for (const l of arr) lights.push(l); }

function drawFactory(sx, sy, h, k, t) {
  const z = cam.z, s = 0.9, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 26 * z * k;
  walls(cx, cy, hw, hh, Hz, '#b7bbc2');
  if (k > 0.5) {
    for (let i = 0; i < 4; i++) leftQuad(cx, cy, hw, hh, Hz, .08 + i * .22, .24 + i * .22, .56, .8, WINDOW);
    rightQuad(cx, cy, hw, hh, Hz, .12, .5, 0, .6, '#4b5563'); rightQuad(cx, cy, hw, hh, Hz, .6, .9, .3, .6, '#8b93a0');
  }
  topFace(cx, cy, hw, hh, Hz, '#8a929d');
  box(sx - hw * 0.30, sy - Hz - hh * 0.2, 9, '#9aa2ad', 0.3);                 // saw-tooth roof blocks
  box(sx + hw * 0.10, sy - Hz + hh * 0.2, 9, '#9aa2ad', 0.3);
  const chx = sx + hw * 0.5, chy = sy - Hz - hh * 0.55;
  box(chx, chy, 26, '#a25f48', 0.14);
  if (!lite && k > 0.8 && OPEN.factory) {                                      // smoke
    const topY = chy + TH / 2 * z - 26 * z;
    for (let i = 0; i < 4; i++) {
      const a = ((t / 2600) + i / 4) % 1;
      ctx.globalAlpha = (1 - a) * 0.55; ctx.fillStyle = '#e6e9ee';
      ctx.beginPath(); ctx.arc(chx + a * 14 * z, topY - a * 34 * z, (3 + 6 * a) * z, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  nightLights(OPEN.factory, k, [[cx - hw * 0.45, cy - Hz * 0.55, 40 * z], [cx + hw * 0.4, cy - Hz * 0.3, 46 * z]]);
}

function drawSchool(sx, sy, h, k, t) {
  const z = cam.z, s = 0.84, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 28 * z * k;
  walls(cx, cy, hw, hh, Hz, '#d9694b');
  if (k > 0.5) {
    for (let i = 0; i < 3; i++) for (let f = 0; f < 2; f++) leftQuad(cx, cy, hw, hh, Hz, .1 + i * .29, .3 + i * .29, .16 + f * .42, .44 + f * .42, WINDOW);
    for (let i = 0; i < 2; i++) rightQuad(cx, cy, hw, hh, Hz, .1 + i * .3, .3 + i * .3, .52, .82, WINDOW);
    rightQuad(cx, cy, hw, hh, Hz, .62, .88, 0, .5, '#6b4a35');
    rightQuad(cx, cy, hw, hh, Hz, .0, 1, .9, 1, '#efe3c8');                   // roof edge band
  }
  topFace(cx, cy, hw, hh, Hz, '#cfd6dc');
  const tx = sx, ty = sy - Hz; box(tx, ty, 14, '#efe3c8', 0.22);               // bell tower
  const hw2 = TW / 2 * z * 0.22, hh2 = TH / 2 * z * 0.22, tcy = cy - Hz - 14 * z;
  poly([[cx - hw2, tcy], [cx, tcy + hh2], [cx, tcy - 10 * z]], '#b84a35'); poly([[cx + hw2, tcy], [cx, tcy + hh2], [cx, tcy - 10 * z]], '#8e3626');
  const fx = cx + hw * 0.55, fy = cy - Hz - hh * 0.3;                          // flag
  ctx.strokeStyle = '#444'; ctx.lineWidth = Math.max(1, 1.4 * z); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 20 * z); ctx.stroke();
  const wv = Math.sin(t / 300) * 1.2 * z;
  poly([[fx, fy - 20 * z], [fx + 10 * z, fy - 18 * z + wv], [fx, fy - 15 * z]], '#e11d48');
  nightLights(OPEN.school, k, [[cx - hw * 0.4, cy - Hz * 0.5, 36 * z]]);
}

function drawChurch(sx, sy, h, k, t) {
  const z = cam.z, s = 0.72, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 22 * z * k, wall = '#f3eee4';
  walls(cx, cy, hw, hh, Hz, wall);
  if (k > 0.5) {
    leftQuad(cx, cy, hw, hh, Hz, .2, .38, .3, .8, '#6aa0dc'); leftQuad(cx, cy, hw, hh, Hz, .6, .78, .3, .8, '#6aa0dc');
    rightQuad(cx, cy, hw, hh, Hz, .3, .66, 0, .6, '#7a5238');
  }
  const R = 12 * z * k, ex = 1.12, hwR = hw * ex, hhR = hh * ex;               // roof
  const T = [cx, cy - hhR - Hz], Rr = [cx + hwR, cy - Hz], Bt = [cx, cy + hhR - Hz], Lf = [cx - hwR, cy - Hz], A = [cx, cy - Hz - R];
  poly([Lf, Bt, A], '#7b8794', true); poly([Bt, Rr, A], '#5d6875', true); poly([Lf, T, A], '#66707c'); poly([T, Rr, A], '#505a66');
  const bx = sx + hw * 0.25, by = sy - Hz + hh * 0.3;                          // steeple
  box(bx, by, 20, wall, 0.2);
  const hw2 = TW / 2 * z * 0.2, hh2 = TH / 2 * z * 0.2, tcy = by + TH / 2 * z - 20 * z;
  poly([[bx - hw2, tcy], [bx, tcy + hh2], [bx, tcy - 20 * z]], '#7b8794'); poly([[bx + hw2, tcy], [bx, tcy + hh2], [bx, tcy - 20 * z]], '#5d6875');
  ctx.strokeStyle = '#f8f4ea'; ctx.lineWidth = Math.max(1.4, 2 * z); ctx.beginPath();
  ctx.moveTo(bx, tcy - 20 * z); ctx.lineTo(bx, tcy - 29 * z); ctx.moveTo(bx - 3.5 * z, tcy - 25.5 * z); ctx.lineTo(bx + 3.5 * z, tcy - 25.5 * z); ctx.stroke();
  nightLights(OPEN.church, k, [[cx - hw * 0.3, cy - Hz * 0.5, 34 * z]]);
}

function drawClub(sx, sy, h, k, t) {
  const z = cam.z, s = 0.8, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 30 * z * k;
  walls(cx, cy, hw, hh, Hz, '#2d2745');
  const on = OPEN.club, neon = on ? `hsl(${(t / 14) % 360},95%,64%)` : '#5d5486', neon2 = on ? `hsl(${((t / 14) + 140) % 360},95%,64%)` : '#4b4470';
  if (k > 0.5) {
    for (let i = 0; i < 3; i++) leftQuad(cx, cy, hw, hh, Hz, .12 + i * .28, .3 + i * .28, .34, .7, on ? neon2 : '#3d3660');
    rightQuad(cx, cy, hw, hh, Hz, .08, .92, .62, .86, neon);                   // sign
    rightQuad(cx, cy, hw, hh, Hz, .08, .92, .0, .06, neon2);
    rightQuad(cx, cy, hw, hh, Hz, .38, .62, .06, .5, '#14101f');                // door
  }
  topFace(cx, cy, hw, hh, Hz, '#3d3660');
  const bx = cx - hw * 0.1, by = cy - Hz - hh * 0.1;                           // disco ball
  ctx.fillStyle = '#d7dbe6'; ctx.beginPath(); ctx.arc(bx, by - 7 * z, 5.5 * z, 0, 7); ctx.fill();
  ctx.fillStyle = on ? neon : '#8b8fa3'; ctx.beginPath(); ctx.arc(bx - 1.6 * z, by - 8.6 * z, 1.8 * z, 0, 7); ctx.fill();
  nightLights(on, k, [[cx + hw * 0.5, cy - Hz * 0.5, 62 * z], [cx - hw * 0.4, cy - Hz * 0.5, 46 * z]]);
}

function airportGround(sx, sy) {
  const z = cam.z, hw = TW / 2 * z, hh = TH / 2 * z, cx = sx, cy = sy + hh;
  poly([[cx - hw * 0.98, cy], [cx - hw * 0.5, cy - hh * 0.28], [cx + hw * 0.98, cy], [cx + hw * 0.5, cy + hh * 0.28]], '#3b424d');   // runway
  ctx.strokeStyle = '#f1f3f6'; ctx.lineWidth = Math.max(1, 1.8 * z); ctx.setLineDash([6 * z, 5 * z]);
  ctx.beginPath(); ctx.moveTo(cx - hw * 0.8, cy - hh * 0.04); ctx.lineTo(cx + hw * 0.8, cy + hh * 0.04); ctx.stroke(); ctx.setLineDash([]);
}
function drawAirport(sx, sy, h, k, t) {
  const z = cam.z, hw = TW / 2 * z * 0.5, hh = TH / 2 * z * 0.5, cx = sx, cy = sy + TH / 2 * z;
  const open = OPEN.airport;                                                    // plane taxis along the runway while open
  const u = open ? ((t / 7000) % 1) * 1.7 - 0.85 : 0.1, px = cx + u * TW / 2 * z * 0.8, py = cy + u * TH / 2 * z * 0.08 + 3 * z;
  ctx.fillStyle = '#f4f6f9'; ctx.beginPath(); ctx.ellipse(px, py - 3 * z, 9 * z, 2.6 * z, 0, 0, 7); ctx.fill();
  poly([[px - 2 * z, py - 3 * z], [px + 3 * z, py - 3 * z], [px - 1 * z, py - 12 * z]], '#dfe5ec');
  poly([[px - 2 * z, py - 3 * z], [px + 3 * z, py - 3 * z], [px + 1 * z, py + 4 * z]], '#c7cfd9');
  poly([[px - 9 * z, py - 3.4 * z], [px - 6 * z, py - 3.4 * z], [px - 8 * z, py - 7 * z]], '#e11d48');
  const bx = sx - TW / 2 * z * 0.2, by = sy - TH / 2 * z * 0.5;                  // terminal at the back
  box(bx, by, 17, '#e9eef4', 0.5); box(bx, by - 17 * z, 3, '#8ea0b4', 0.46);
  const tx = sx + TW / 2 * z * 0.4, ty = sy - TH / 2 * z * 0.3;                   // control tower
  box(tx, ty, 38, '#dfe5ec', 0.12); box(tx, ty - 38 * z, 9, '#4a90b8', 0.22);
  if (!ghost && NIGHT > 0.1) lights.push([tx, ty + TH / 2 * z - 42 * z, 40 * z], [px, py - 4 * z, 36 * z]);
}

function drawTownHall(sx, sy, h, k, t) {
  const z = cam.z, s = 0.9, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 26 * z * k;
  walls(cx, cy, hw, hh, Hz, '#ece6d6');
  if (k > 0.5) {
    for (let i = 0; i < 4; i++) rightQuad(cx, cy, hw, hh, Hz, .1 + i * .22, .17 + i * .22, 0, .85, '#b9b2a0');      // columns
    rightQuad(cx, cy, hw, hh, Hz, .0, 1, .85, 1, '#cfc8b4');
    for (let i = 0; i < 3; i++) leftQuad(cx, cy, hw, hh, Hz, .12 + i * .29, .3 + i * .29, .3, .7, WINDOW);
  }
  topFace(cx, cy, hw, hh, Hz, '#d8d2c0');
  const dy = cy - Hz - 2 * z;                                                       // dome
  ctx.fillStyle = '#c9a43c'; ctx.beginPath(); ctx.ellipse(cx, dy, 11 * z, 8 * z, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#e6c463'; ctx.beginPath(); ctx.ellipse(cx - 3 * z, dy - 2 * z, 4 * z, 3 * z, 0, Math.PI, 0); ctx.fill();
  const fx = cx, fy = dy - 8 * z, wv = Math.sin(t / 300) * 1.2 * z;                // Ghana flag: red, gold, green
  ctx.strokeStyle = '#444'; ctx.lineWidth = Math.max(1, 1.4 * z); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 17 * z); ctx.stroke();
  for (const [i, col] of ['#ce1126', '#fcd116', '#006b3f'].entries()) poly([[fx, fy - 17 * z + i * 3 * z], [fx + 11 * z, fy - 17 * z + i * 3 * z + wv], [fx + 11 * z, fy - 14 * z + i * 3 * z + wv], [fx, fy - 14 * z + i * 3 * z]], col);
  nightLights(true, k, [[cx - hw * 0.4, cy - Hz * 0.5, 40 * z], [cx + hw * 0.5, cy - Hz * 0.4, 40 * z]]);
}
function drawHospital(sx, sy, h, k, t) {
  const z = cam.z, s = 0.86, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 36 * z * k;
  walls(cx, cy, hw, hh, Hz, '#f1f5f9');
  if (k > 0.5) {
    for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) leftQuad(cx, cy, hw, hh, Hz, .1 + i * .29, .28 + i * .29, .08 + f * .3, .3 + f * .3, WINDOW);
    rightQuad(cx, cy, hw, hh, Hz, .36, .64, .44, .56, '#e11d48'); rightQuad(cx, cy, hw, hh, Hz, .46, .54, .32, .68, '#e11d48');   // red cross
    rightQuad(cx, cy, hw, hh, Hz, .1, .3, .0, .3, '#7aa7d9'); rightQuad(cx, cy, hw, hh, Hz, .7, .9, .0, .3, '#7aa7d9');
  }
  topFace(cx, cy, hw, hh, Hz, '#dfe6ee');
  box(sx, sy - Hz, 6, '#cdd6e0', 0.3);
  nightLights(true, k, [[cx - hw * 0.4, cy - Hz * 0.5, 44 * z], [cx + hw * 0.4, cy - Hz * 0.3, 44 * z]]);
}
function drawMarket(sx, sy, h, k, t) {
  const z = cam.z, hw = TW / 2 * z, hh = TH / 2 * z, cx = sx, cy = sy + hh;
  diamond(sx, sy, '#cdb98a', 0.92);
  const cols = [['#e11d48', '#fff1f2'], ['#2563eb', '#eff6ff'], ['#f59e0b', '#fffbeb'], ['#059669', '#ecfdf5']];
  [[-0.42, 0], [0, -0.42], [0.42, 0], [0, 0.42]].forEach(([ox, oy], i) => {
    const px = cx + ox * hw * 0.9, py = cy + oy * hh * 0.9;
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(px - 5 * z, py - 4 * z, 10 * z, 6 * z * k);
    const a = 11 * z * k, b = 5.5 * z * k, top = py - 14 * z * k;
    poly([[px - a, top], [px, top - b], [px + a, top], [px, top + b]], cols[i][0]);
    poly([[px - a, top], [px, top + b], [px + a, top], [px + a, top + 3 * z], [px, top + b + 3 * z], [px - a, top + 3 * z]], cols[i][1]);
  });
  nightLights(true, k, [[cx, cy - 12 * z, 52 * z]]);
}
function drawCrack(sx, sy) {
  const z = cam.z, hw = TW / 2 * z, hh = TH / 2 * z, cx = sx, cy = sy + hh;
  ctx.strokeStyle = '#161a20'; ctx.lineWidth = Math.max(1.2, 1.8 * z); ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx - hw * .45, cy - hh * .1); ctx.lineTo(cx - hw * .15, cy + hh * .12); ctx.lineTo(cx + hw * .05, cy - hh * .08); ctx.lineTo(cx + hw * .3, cy + hh * .15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - hw * .15, cy + hh * .12); ctx.lineTo(cx - hw * .2, cy + hh * .4); ctx.stroke();
  poly([[cx - 3 * z, cy - 2 * z], [cx, cy - 12 * z], [cx + 3 * z, cy - 2 * z]], '#f97316');                    // warning cone
  ctx.fillStyle = '#fff'; ctx.fillRect(cx - 2 * z, cy - 7 * z, 4 * z, 1.4 * z);
}
function drawPolice(sx, sy, h, k, t) {
  const z = cam.z, s = 0.8, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 26 * z * k;
  walls(cx, cy, hw, hh, Hz, '#8aa4c8');
  if (k > 0.5) {
    for (let i = 0; i < 3; i++) leftQuad(cx, cy, hw, hh, Hz, .1 + i * .29, .28 + i * .29, .3, .7, WINDOW);
    rightQuad(cx, cy, hw, hh, Hz, .08, .92, .72, .9, '#1e3a8a'); rightQuad(cx, cy, hw, hh, Hz, .38, .62, 0, .5, '#1f2937');
    rightQuad(cx, cy, hw, hh, Hz, .1, .3, .3, .6, '#d9e4f4');
  }
  topFace(cx, cy, hw, hh, Hz, '#6f88ad');
  box(sx, sy - Hz, 7, '#5b6f92', 0.22);
  const on = Math.floor(t / 350) % 2, bx = cx, by = cy - Hz - 9 * z;                // flashing beacon
  ctx.fillStyle = on ? '#ef4444' : '#3b82f6'; ctx.beginPath(); ctx.arc(bx - 3 * z, by, 2.6 * z, 0, 7); ctx.fill();
  ctx.fillStyle = on ? '#3b82f6' : '#ef4444'; ctx.beginPath(); ctx.arc(bx + 3 * z, by, 2.6 * z, 0, 7); ctx.fill();
  if (!ghost && !lite && k > 0.9) lights.push([bx, by, 28 * z]);
  nightLights(true, k, [[cx - hw * 0.4, cy - Hz * 0.5, 38 * z]]);
}
function drawPrison(sx, sy, h, k, t) {
  const z = cam.z, s = 0.9, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 22 * z * k;
  walls(cx, cy, hw, hh, Hz, '#a3a7ad');
  if (k > 0.5) {
    for (let i = 0; i < 4; i++) for (let f = 0; f < 2; f++) { leftQuad(cx, cy, hw, hh, Hz, .1 + i * .22, .2 + i * .22, .25 + f * .38, .5 + f * .38, '#2a2e35'); }
    rightQuad(cx, cy, hw, hh, Hz, .38, .62, 0, .5, '#2a2e35'); rightQuad(cx, cy, hw, hh, Hz, .0, 1, .86, 1, '#7c8087');
  }
  topFace(cx, cy, hw, hh, Hz, '#8d9197');
  for (const [ox, oy] of [[-0.82, 0.0], [0.82, 0.0]]) {                                // watchtowers
    box(sx + ox * hw, sy - Hz + oy * hh - 4 * z, 20, '#8d9197', 0.16); box(sx + ox * hw, sy - Hz + oy * hh - 24 * z, 5, '#3b4048', 0.2);
  }
  ctx.strokeStyle = '#6b7078'; ctx.lineWidth = Math.max(1, 1.6 * z); ctx.beginPath(); ctx.moveTo(cx - hw * 0.82, cy - Hz - 4 * z); ctx.lineTo(cx + hw * 0.82, cy - Hz - 4 * z); ctx.stroke();
  nightLights(true, k, [[cx - hw * 0.8, cy - Hz - 20 * z, 40 * z], [cx + hw * 0.8, cy - Hz - 20 * z, 40 * z]]);
}
function drawDen(sx, sy, h, k, t) {
  const z = cam.z, s = 0.74, hw = TW / 2 * z * s, hh = TH / 2 * z * s, cx = sx, cy = sy + TH / 2 * z, Hz = 20 * z * k;
  walls(cx, cy, hw, hh, Hz, '#4a3f4f');
  if (k > 0.5) {
    leftQuad(cx, cy, hw, hh, Hz, .15, .45, .35, .7, '#1f1a22'); leftQuad(cx, cy, hw, hh, Hz, .55, .85, .35, .7, '#1f1a22');       // boarded windows
    rightQuad(cx, cy, hw, hh, Hz, .3, .7, 0, .62, '#231d27');
    if (OPEN.den) rightQuad(cx, cy, hw, hh, Hz, .38, .62, .66, .8, '#b91c1c');                                                  // dim red lamp when open
  }
  topFace(cx, cy, hw, hh, Hz, '#3a313e');
  nightLights(OPEN.den, k, [[cx + hw * 0.5, cy - Hz * 0.6, 34 * z]]);
}
function drawChopBar(sx, sy, h, k, t) {
  const z = cam.z, hw = TW / 2 * z, hh = TH / 2 * z, cx = sx, cy = sy + hh, bw = hw * 0.56, bh = hh * 0.56, H = 17 * z * k;
  diamond(sx, sy, '#c9b48a', 0.92);
  walls(cx, cy, bw, bh, H, '#f3e2b3'); topFace(cx, cy, bw, bh, H, '#b45309');
  const cols = ['#ce1126', '#fcd116', '#006b3f'];                                   // Ghana-coloured awning
  for (let i = 0; i < 3; i++) {
    const x0 = cx + bw * i / 3, x1 = cx + bw * (i + 1) / 3, y0 = cy + bh * (1 - i / 3), y1 = cy + bh * (1 - (i + 1) / 3);
    poly([[x0, y0 - H * 0.5], [x1, y1 - H * 0.5], [x1, y1 - H * 0.16], [x0, y0 - H * 0.16]], cols[i]);
  }
  if (OPEN.chopbar && k > 0.9 && !ghost) {                                          // steam from the pot
    const tt = performance.now() / 1000;
    for (let i = 0; i < 3; i++) { const ph = (tt * 0.5 + i / 3) % 1; ctx.globalAlpha = 0.55 * (1 - ph); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - bw * 0.25 + Math.sin(ph * 6 + i) * 3 * z, cy - bh - H - ph * 18 * z, (2 + ph * 3) * z, 0, 6.3); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  nightLights(OPEN.chopbar, k, [[cx + bw * 0.4, cy - H * 0.5, 36 * z]]);
}
function drawTrotro(sx, sy, h, k, t) {
  const z = cam.z, hw = TW / 2 * z, hh = TH / 2 * z, cx = sx, cy = sy + hh;
  diamond(sx, sy, '#6b7280', 0.94);
  poly([[cx - hw * 0.5, cy], [cx, cy - hh * 0.5], [cx + hw * 0.5, cy], [cx, cy + hh * 0.5]], '#4b5563');
  const bus = (ox, oy, col) => {
    const px = cx + ox * hw, py = cy + oy * hh, bw = hw * 0.26, bh = hh * 0.26, H = 9 * z * k;
    walls(px, py, bw, bh, H, col); topFace(px, py, bw, bh, H, shade(col, 1.1));
    poly([[px + bw * 0.15, py + bh * 0.62 - H * 0.8], [px + bw * 0.85, py + bh * 0.1 - H * 0.8], [px + bw * 0.85, py + bh * 0.1 - H * 0.45], [px + bw * 0.15, py + bh * 0.62 - H * 0.45]], '#bfdbfe');
  };
  bus(-0.28, -0.04, '#fcd116'); bus(0.26, 0.1, '#ce1126');
  const pole = (px, py) => { ctx.fillStyle = '#e5e7eb'; ctx.fillRect(px, py - 16 * z * k, 2 * z, 16 * z * k); poly([[px - 5 * z, py - 16 * z * k], [px + 7 * z, py - 16 * z * k], [px + 7 * z, py - 22 * z * k], [px - 5 * z, py - 22 * z * k]], '#006b3f'); };
  pole(cx, cy + hh * 0.35);
  nightLights(OPEN.trotro, k, [[cx, cy - 10 * z, 46 * z]]);
}
const DRAW = {
  cityhospital: drawHospital, citymarket: drawMarket, policehq: drawPolice, cityprison: drawPrison,
  police: drawPolice, prison: drawPrison, den: drawDen, hospital: drawHospital, market: drawMarket,
  townhall: drawTownHall, hospital: drawHospital, market: drawMarket,
  house: (sx, sy, h, k) => drawHouse(sx, sy, h, k),
  shop: (sx, sy, h, k) => drawShop(sx, sy, h, k),
  park: (sx, sy, h) => drawPark(sx, sy, h),
  school: drawSchool, church: drawChurch, factory: drawFactory, club: drawClub, airport: drawAirport,
  chopbar: drawChopBar, trotro: drawTrotro
};
const SHADOW = { cityhospital: [38, 0.86], citymarket: [14, 0.9], policehq: [30, 0.8], cityprison: [26, 0.9], police: [30, 0.8], prison: [26, 0.9], den: [24, 0.74], hospital: [38, 0.86], market: [14, 0.9], townhall: [30, 0.9], hospital: [38, 0.86], market: [14, 0.9], house: [28, 0.72], shop: [40, 0.82], school: [34, 0.84], church: [30, 0.72], factory: [30, 0.9], club: [34, 0.8], airport: [40, 0.5], chopbar: [30, 0.76], trotro: [34, 0.8] };
