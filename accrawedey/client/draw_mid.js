  // pass 1: ground
  for (const v of vis) {
    const t0 = model.grid[v.y][v.x], L = model.land[v.y * N + v.x];
    if (t0 === 'road') { drawRoadTile(v.x, v.y, v.sx, v.sy); if (world.cracked[v.y * N + v.x]) drawCrack(v.sx, v.sy); }
    else {
      diamond(v.sx, v.sy, t0 === 'empty' ? GRASS[v.h & 3] : GROUND[t0], 1.04);
      if (t0 === 'airport') airportGround(v.sx, v.sy);
      else if (detail && t0 === 'empty' && !L && v.h % 5 === 0) {
        ctx.strokeStyle = 'rgba(40,100,50,.55)'; ctx.lineWidth = Math.max(1, 1.2 * z);
        const gx = v.sx + ((v.h >> 4) % 17 - 8) / 100 * TW * z, gy = v.sy + TH / 2 * z + ((v.h >> 9) % 9 - 4) / 100 * TH * z;
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 1.5 * z, gy - 4 * z); ctx.moveTo(gx + 2 * z, gy); ctx.lineTo(gx + 2.5 * z, gy - 5 * z); ctx.stroke();
      }
    }
    if (L) { const mine = L.o === me.id; plotBorder(v.sx, v.sy, mine ? TEN[L.t] : L.o === 0 ? CITY : OTHER, t0 === 'empty' && L.o !== 0); }
    else if (zoneView && t0 === 'empty') { ctx.globalAlpha = 0.16; diamond(v.sx, v.sy, ZONECOL[Rules.zoneOf(v.x, v.y)], 1.0); ctx.globalAlpha = 1; }
  }
  // pass 2: shadows (skipped in lite mode)
  if (!lite) for (const v of vis) {
    const t0 = model.grid[v.y][v.x], b = born.get(v.y * N + v.x);
    const k = b === undefined ? 1 : clamp((t - b) / 420, 0, 1), sh = SHADOW[t0];
    if (sh) shadowOf(v.sx, v.sy, sh[0] * k, sh[1]);
    else if (t0 === 'empty' && v.h % 11 === 0) treeShadow(v.sx, v.sy, v.h, 1);
    else if (t0 === 'park') { treeShadow(v.sx, v.sy, v.h * 3 + 1, 1.05); treeShadow(v.sx + TW * z * 0.18, v.sy + TH * z * 0.12, v.h * 7 + 2, 0.9); }
  }
  // pass 3: objects, back to front
  const carMap = new Map();
  for (const c of cars) { const k2 = Math.floor(c.y) * N + Math.floor(c.x); (carMap.get(k2) || carMap.set(k2, []).get(k2)).push(c); }
  for (const v of vis) {
    const { x, y, sx, sy, h } = v, t0 = model.grid[y][x], k2 = y * N + x;
    let k = 1; const b = born.get(k2);
    if (b !== undefined) { const a = (t - b) / 420; if (a >= 1) born.delete(k2); else k = Math.max(0.01, easeOutBack(clamp(a, 0, 1))); }
    if (t0 === 'empty') { if (h % 11 === 0 && !model.land[k2]) drawTree(sx, sy, h, 1); }
    else if (DRAW[t0]) { DRAW[t0](sx, sy, h, k, t); if (t0 !== 'park' && CATALOG[t0] && !nearRoad(x, y) && model.land[k2]?.o === me.id) warnMark(sx, sy, CATALOG[t0].warn, t); }
    else if (t0 === 'road' && h % 5 === 0 && detail) drawLamp(sx, sy);
    const cl = carMap.get(k2); if (cl) for (const c of cl) drawCar(c);
  }
