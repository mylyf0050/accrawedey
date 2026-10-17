  // hover tile + ghost of what you are about to do
  if (hover && hover[0] >= 0 && hover[1] >= 0 && hover[0] < N && hover[1] < N) {
    const [hx, hy] = hover, [sx, sy] = toScreen(hx, hy), hh = hash(hx, hy), T = tool;
    const p = T.k === 'pan' ? null : plan(hx, hy, T), bad = !!p && !p.ok;
    ghost = true; ctx.globalAlpha = 0.62;
    if (p) {
      if (T.k === 'road') diamond(sx, sy, bad ? '#e11d48' : '#7d8794');
      else if (T.k === 'build' && model.grid[hy][hx] === 'empty' && DRAW[T.item]) DRAW[T.item](sx, sy, hh, 1, t);
      else if (T.k === 'land') diamond(sx, sy, bad ? '#e11d48' : TEN[{ buy: 'own', rent: 'rent', lease: 'lease' }[T.mode]]);
      else if (T.k === 'sell') diamond(sx, sy, bad ? '#64748b' : '#e11d48');
    }
    ctx.globalAlpha = 1; ghost = false;
    if (bad && T.k !== 'sell') diamond(sx, sy, 'rgba(225,29,72,.40)');
    const hw = TW / 2 * z, hhh = TH / 2 * z, cx = sx, cy = sy + hhh;
    ctx.lineWidth = Math.max(1.5, 2 * z); ctx.strokeStyle = bad || T.k === 'sell' ? '#fb7185' : 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.moveTo(cx, cy - hhh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hhh); ctx.lineTo(cx - hw, cy); ctx.closePath(); ctx.stroke();
  }
