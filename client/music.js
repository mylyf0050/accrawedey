
// ---------- game music: original tracks synthesised live with WebAudio (no audio files, no copyrighted songs) ----------
(function () {
  const P = s => s.replace(/\s/g, '').split(''), D = s => s.trim().split(/\s+/).map(v => v === '.' ? null : +v);
  const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11];
  const TR = {
    accra: { bpm: 104, root: 57, sc: MIN, prog: [0, 5, 2, 6], kick: 'x..x..x...x.x...', clap: '....x.......x..x', hat: 'x.xxx.xxx.xxx.xx', bass: 'x..x..x.....x.x.', conga: '..x..x..x..x.x..', stab: '..x...x...x.....', swing: 0.04,
      motif: [D('4 . . 2 . 3 . . 2 . 0 . . . . .'), D('4 . 5 . 4 . 2 . 3 . 2 . 0 . . .')], lead: 'pluck' },
    highlife: { bpm: 112, root: 55, sc: MAJ, prog: [0, 3, 4, 3], kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', bass: 'x...x..x....x...', stab: 'x.x...x.x.x...x.', swing: 0.03,
      motif: [D('2 . 4 . 5 . 4 . 2 . 4 . 7 . . .'), D('7 . 5 . 4 . 2 . 4 . 2 . 0 . . .')], lead: 'pluck' },
    azonto: { bpm: 120, root: 48, sc: MIN, prog: [0, 0, 5, 6], kick: 'x..x..x.x..x..x.', clap: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', bass: 'x..x..x.x..x....', conga: 'x.x..x.x..x.x...',
      motif: [D('0 . 2 . 4 . 2 . 0 . 2 . 4 . 5 .'), D('4 . 5 . 4 . 2 . 0 . 0 . . . . .')], lead: 'sq' },
    sunset: { bpm: 92, root: 50, sc: MIN, prog: [0, 5, 3, 4], kick: 'x......x..x.....', clap: '........x.......', hat: 'x.x.x.x.x.x.x.x.', bass: 'x......x....x...', pad: 1, swing: 0.05,
      motif: [D('4 . . . 2 . . . 3 . . . 0 . . .'), D('. . 4 . . . 5 . . . 4 . 2 . . .')], lead: 'pluck' },
    makola: { bpm: 128, root: 52, sc: MIN, prog: [0, 6, 5, 6], kick: 'x...x...x...x...', clap: '....x.......x...', hat: '.x.x.x.x.x.x.x.x', bass: 'x.x.x.x.x.x.x.x.', conga: 'x..x..x.x..x..x.',
      motif: [D('4 . 4 . 2 . 4 . 5 . 4 . 2 . . .'), D('7 . 5 . 4 . 2 . 4 . 2 . 0 . . .')], lead: 'sq' },
    osu: { bpm: 112, root: 53, sc: MIN, prog: [0, 5, 3, 6], kick: 'x.......x.......', clap: '........x.......', hat: 'x.x.x.x.x.x.x.x.', bass: '..x...x...x.x...', bassStyle: 'log', pad: 1, swing: 0.02,
      motif: [D('. . 4 . . 2 . . 3 . . . 2 . . .'), D('. . 4 . . 5 . . 4 . . 2 . . 0 .')], lead: 'pluck' },
    kpanlogo: { bpm: 100, root: 57, sc: MAJ, prog: [0, 3, 0, 4], kick: 'x..x..x...x..x..', clap: '..x...x...x...x.', hat: 'x.x.xx.xx.x.xx.x', bass: 'x.....x.x.....x.', conga: 'xXx.xXx.xx.XxX.x', swing: 0.05,
      motif: [D('0 . 2 . 4 . . 2 . 4 . 5 . 4 . .'), D('7 . 5 . 4 . 2 . 0 . . . . . . .')], lead: 'pluck' },
    gospel: { bpm: 80, root: 48, sc: MAJ, prog: [0, 4, 5, 3], kick: 'x.......x.......', clap: '........x.......', hat: '', bass: 'x.......x.......', pad: 1, stab: '..x.....', swing: 0,
      motif: [D('4 . . . 2 . . . 4 . . . 5 . . .'), D('7 . . . 5 . . . 4 . . . 2 . . .')], lead: 'pluck' },
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), deg = (t, d) => t.root + t.sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  let ctx = null, master, comp, dly, noise, cur = null, curSig = '', on = true, vol = 0.7, tuned = null, reqClub = null;
  try { on = localStorage.getItem('cb-music') !== '0'; vol = +localStorage.getItem('cb-vol') || 0.7; tuned = +localStorage.getItem('cb-tuned') || null; } catch (e) { }
  const save = () => { try { localStorage.setItem('cb-music', on ? '1' : '0'); localStorage.setItem('cb-vol', String(vol)); localStorage.setItem('cb-tuned', String(tuned || '')); } catch (e) { } };
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false; ctx = new AC();
      master = ctx.createGain(); master.gain.value = vol * 0.9; comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
      dly = ctx.createDelay(1); dly.delayTime.value = 0.27; const fb = ctx.createGain(); fb.gain.value = 0.3; dly.connect(fb); fb.connect(dly); dly.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume(); return true;
  }
  // ---- voices ----
  function env(g, t, a, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); }
  function osc(pb, type, f, t, a, peak, dec, send, f2) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dec * 0.4);
    env(g, t, a, peak, dec); o.connect(g); g.connect(pb.g); if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(dly); } o.start(t); o.stop(t + a + dec + 0.05);
  }
  function nz(pb, t, type, f, q, peak, dec) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q; env(g, t, 0.002, peak, dec); s.connect(fl); fl.connect(g); g.connect(pb.g); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
  }
  const kick = (pb, t) => osc(pb, 'sine', 150, t, 0.002, 0.95, 0.28, 0, 42);
  const clap = (pb, t) => { for (let i = 0; i < 3; i++) nz(pb, t + i * 0.012, 'bandpass', 1500, 0.8, 0.22, 0.09); };
  const hat = (pb, t, acc) => nz(pb, t, 'highpass', 7500, 0.7, acc ? 0.1 : 0.05, 0.04);
  const bass = (pb, t, f, d) => { osc(pb, 'sine', f, t, 0.01, 0.7, d); osc(pb, 'sawtooth', f, t, 0.01, 0.12, d * 0.8); };
  const log = (pb, t, f) => osc(pb, 'sine', f * 1.6, t, 0.004, 0.8, 0.35, 0.1, f);
  const conga = (pb, t, hi) => osc(pb, 'sine', hi ? 330 : 220, t, 0.002, 0.3, 0.12, 0, hi ? 260 : 170);
  const stab = (pb, t, fs, d) => fs.forEach(f => osc(pb, 'triangle', f, t, 0.005, 0.07, d, 0.12));
  const pad = (pb, t, fs, d) => fs.forEach(f => { osc(pb, 'triangle', f, t, d * 0.3, 0.045, d * 0.9, 0.15); osc(pb, 'sine', f / 2, t, d * 0.3, 0.05, d * 0.9); });
  const lead = (pb, t, f, kind, d) => { if (kind === 'sq') { osc(pb, 'square', f, t, 0.005, 0.07, d * 0.9, 0.3); } else { osc(pb, 'triangle', f, t, 0.003, 0.22, d * 1.4, 0.35); osc(pb, 'sine', f * 2, t, 0.003, 0.05, d * 0.5, 0.2); } };
  function sched(pb, tr, i, t) {
    const bar = Math.floor(i / 16), s = i % 16, sd = 60 / tr.bpm / 4, cd = tr.prog[bar % 4]; const tt = s % 2 ? t + (tr.swing || 0) * sd : t;
    const on_ = p => p && p[s] && p[s] !== '.';
    if (on_(tr._k)) kick(pb, t); if (on_(tr._c)) clap(pb, t); if (on_(tr._h)) hat(pb, tt, s % 4 === 2);
    if (on_(tr._b)) { const f = hz(deg(tr, cd) - 12); tr.bassStyle === 'log' ? log(pb, t, f) : bass(pb, t, f, sd * 2.2); }
    if (tr._g && tr._g[s] !== '.' && tr._g[s]) conga(pb, tt, tr._g[s] === 'X');
    const tri = [cd, cd + 2, cd + 4].map(d => hz(deg(tr, d) + 12));
    if (tr._s && tr._s[s % tr._s.length] === 'x' && !tr.pad) stab(pb, tt, tri, sd * 1.4);
    if (s === 0 && tr.pad) pad(pb, t, tri, sd * 16);
    const m = tr.motif[bar % 2][s]; if (m !== null && m !== undefined) lead(pb, tt, hz(deg(tr, m) + 12), tr.lead, sd * 2);
  }
  for (const k in TR) { const t = TR[k]; t._k = P(t.kick || ''); t._c = P(t.clap || ''); t._h = P(t.hat || ''); t._b = P(t.bass || ''); t._g = t.conga ? P(t.conga) : null; t._s = t.stab ? P(t.stab) : null; }
  function play(id, st, lvl) {
    const tr = TR[id]; if (!tr || !ensure()) return null;
    const pb = { g: ctx.createGain(), dead: false }; pb.g.gain.setValueAtTime(0.0001, ctx.currentTime); pb.g.gain.linearRampToValueAtTime(lvl, ctx.currentTime + 0.5); pb.g.connect(master);
    const sd = 60 / tr.bpm / 4, pos = (now() - st) / 1000 / sd; let i = Math.ceil(pos), nt = ctx.currentTime + (i - pos) * sd;
    pb.timer = setInterval(() => { while (nt < ctx.currentTime + 0.2) { sched(pb, tr, i, nt); nt += sd; i++; } }, 40);
    pb.stop = () => { pb.dead = true; clearInterval(pb.timer); pb.g.gain.cancelScheduledValues(ctx.currentTime); pb.g.gain.setValueAtTime(pb.g.gain.value, ctx.currentTime); pb.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4); setTimeout(() => pb.g.disconnect(), 600); };
    return pb;
  }
  const active = (k, ts) => (songs[k] || []).find(s => s.st <= ts && ts < s.st + R.SONG.TRACK_MS);
  function target() {
    if (!on) return null; const ts = now(), a = tuned && active(tuned, ts);
    if (a) return { id: a.tr, st: a.st, lvl: 1, club: true };
    const h = new Date(ts).getUTCHours(); return { id: h >= 20 || h < 4 ? 'sunset' : 'highlife', st: 0, lvl: 0.34 };
  }
  const pill = $('mus');
  function tick() {
    const t = target(), sig = t ? t.id + ':' + t.st : '';
    if (sig !== curSig) {
      if (!t) { if (cur) cur.stop(); cur = null; curSig = ''; }
      else if (ensure() && ctx.state === 'running') { if (cur) cur.stop(); cur = play(t.id, t.st, t.lvl); curSig = sig; if (t.club) toast('Now playing: ' + TR[t.id]._n, 'ok'); }
    }
    pill.classList.toggle('off', !on); pill.classList.toggle('play', !!cur);
  }
  for (const [id, n] of R.SONG.TRACKS.map(t => [t.id, t.name])) TR[id]._n = n;
  const unlock = () => { if (on) { ensure(); tick(); } };
  addEventListener('pointerdown', unlock, { passive: true }); addEventListener('keydown', unlock);
  setInterval(tick, 1000);
  pill.addEventListener('click', () => { on = !on; save(); if (on) ensure(); tick(); toast(on ? 'Music on' : 'Music off'); if (sheetOpen && tab === 'music') renderSheet(); });
  // ---- Music tab ----
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  window.panelMusic = function () {
    const ts = now(), hr = new Date(ts).getUTCHours(), dw = new Date(ts).getUTCDay();
    if (reqClub !== null) {
      const x = reqClub % N, y = (reqClub / N) | 0;
      return `<div class="help"><b>Request a song</b> at the club at ${x},${y}. It costs <b>${fmt(R.SONG.PRICE)}</b> and the club owner gets ${Math.round(R.SONG.OWNER_CUT * 100)}% of it. Everyone tuned in to this club hears it.</div>` +
        R.SONG.TRACKS.map(t => `<div class="row"><div class="nm"><b>${t.name}</b><small>${t.tag}</small></div><button data-act="m_pick" data-tr="${t.id}">${fmt(R.SONG.PRICE)}</button></div>`).join('') + `<div class="row"><button data-act="m_back">Back</button></div>`;
    }
    let h = `<div class="help">Music is made live in your browser. Tune in to a club to hear what people request there. Requests open when the club opens at 20:00.</div>
      <div class="vol"><button data-act="m_toggle">${on ? 'Music on' : 'Music off'}</button><button data-act="m_vol" data-d="-1">Vol -</button><button data-act="m_vol" data-d="1">Vol +</button><small>${Math.round(vol * 100)}%</small></div>`;
    const rows = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (world.grid[y][x] === 'club') rows.push({ x, y, k: y * N + x });
    h += `<div class="tier">Night clubs</div>`;
    h += rows.slice(0, 25).map(r => {
      const L = world.land[r.k], own = L && L.o ? esc2(world.names[L.o] || '?') : 'City', open = CATALOG.club.at(hr, dw) > 0, q = (songs[r.k] || []).filter(s => s.st + R.SONG.TRACK_MS > ts), a = q.find(s => s.st <= ts);
      const nowTxt = a ? `Now: <b>${TR[a.tr]._n}</b> (${esc2(a.n)}) ${mmss(a.st + R.SONG.TRACK_MS - ts)} left` : (open ? 'DJ is open for requests' : 'Closed'), next = q.filter(s => s !== a).map(s => TR[s.tr]._n).join(', ');
      return `<div class="row"><div class="nm"><b>Night Club<span class="chip" style="background:#cbd5e1">${r.x},${r.y}</span>${tuned === r.k ? '<span class="chip" style="background:#22c55e">tuned in</span>' : ''}</b><small>Owner: ${own} · ${open ? 'Open' : 'Closed'}</small><div class="qline">${nowTxt}${next ? '<br>Next: ' + next : ''}</div></div>
        <button data-act="m_tune" data-k="${r.k}">${tuned === r.k ? 'Leave' : 'Tune in'}</button><button data-act="m_req" data-k="${r.k}" ${open ? '' : 'disabled'}>Request</button></div>`;
    }).join('') || '<div class="help">No night clubs in the city yet. Build one in the Commerce tab.</div>';
    return h;
  };
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-act^="m_"]'); if (!b) return; const a = b.dataset.act;
    if (a === 'm_toggle') { on = !on; save(); if (on) ensure(); tick(); }
    else if (a === 'm_vol') { vol = Math.max(0.1, Math.min(1, vol + 0.15 * +b.dataset.d)); save(); if (master) master.gain.value = vol * 0.9; }
    else if (a === 'm_tune') { const k = +b.dataset.k; tuned = tuned === k ? null : k; save(); ensure(); tick(); toast(tuned ? 'Tuned in to the club' : 'Left the club'); }
    else if (a === 'm_req') { reqClub = +b.dataset.k; }
    else if (a === 'm_back') reqClub = null;
    else if (a === 'm_pick') { const k = reqClub; b.disabled = true; sendMsg({ t: 'song', x: k % N, y: (k / N) | 0, tr: b.dataset.tr }); }
    renderSheet();
  });
  handlers.songs = () => { tick(); if (sheetOpen && tab === 'music' && reqClub === null) renderSheet(); };
  handlers.songRes = m => { toast(m.msg, m.ok ? 'ok' : undefined); if (m.ok) { reqClub = null; if (typeof afterChange === 'function') afterChange(); } if (sheetOpen) renderSheet(); };
})();
