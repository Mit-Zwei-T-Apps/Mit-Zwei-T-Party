/* Mit Zwei T Party – host screen (TV / projector) */
(function () {
  'use strict';
  const socket = io();
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let S = null, info = { publicUrl: '', lan: [] };
  let hostKey = null;
  const readySet = new Set();
  const pAnim = {}; // Spieler-Id -> { cur, target }
  let miniRun = null; // laufendes Minispiel
  let curLang = null;
  const L = () => (S && S.settings && S.settings.lang) || 'en';
  const T = (k, v) => I18N.t(L(), k, v);

  fetch('/api/info').then((r) => r.json()).then((i) => { info = i; if (S) renderLobby(); }).catch(() => {});

  // ------------------------------------------------------------ Verbindung
  function connectFlow() {
    const saved = JSON.parse(sessionStorage.getItem('pf-host') || 'null');
    const create = () => socket.emit('host:create', (r) => {
      hostKey = r.hostKey; sessionStorage.setItem('pf-host', JSON.stringify({ code: r.code, hostKey: r.hostKey }));
    });
    if (saved) socket.emit('host:resume', saved, (r) => { if (!r || !r.ok) create(); });
    else create();
    Net.sync(socket).then(() => setInterval(() => Net.sync(socket, 4), 45000));
  }
  socket.on('connect', connectFlow);

  // ------------------------------------------------------------ Screens
  function showScreen(name) {
    ['lobby', 'board', 'mini', 'end'].forEach((n) => $('screen-' + n).classList.toggle('hidden', n !== name));
  }
  function joinUrl() {
    let base = info.publicUrl;
    if (!base) {
      const local = /^(localhost|127\.|\[::1\])/.test(location.hostname);
      base = local && info.lan && info.lan.length ? info.lan[0] : location.origin;
    }
    return base + '/play.html?code=' + (S ? S.code : '') + '&lang=' + L();
  }

  socket.on('state', (s) => {
    const prev = S; S = s;
    if (curLang !== L()) { curLang = L(); I18N.apply(document, curLang); }
    s.players.forEach((p) => {
      if (!pAnim[p.id]) pAnim[p.id] = { cur: p.pos, target: p.pos };
      pAnim[p.id].target = p.pos;
    });
    if (s.phase === 'lobby') { showScreen('lobby'); renderLobby(); }
    else if (s.phase === 'board') { showScreen('board'); renderBoardUI(); }
    else if (s.phase === 'minigame') { showScreen('mini'); syncMini(); }
    else { showScreen('end'); }
    if (prev && s.phase === 'board') reactToChanges(prev, s);
  });

  // ------------------------------------------------------------ Lobby
  function renderLobby() {
    $('code').textContent = S.code;
    const url = joinUrl();
    $('joinurl').textContent = url.replace(/^https?:\/\//, '');
    if ($('qr').dataset.u !== url) { $('qr').dataset.u = url; $('qr').src = '/api/qr?text=' + encodeURIComponent(url); }
    $('httpwarn').classList.toggle('hidden', url.indexOf('https://') === 0);
    const modeIcon = { camera: '📷', motion: '📱', tap: '👆' };
    $('plist').innerHTML = S.players.length ? S.players.map((p) =>
      '<div class="pchip ' + (p.connected ? '' : 'off') + '" style="border-color:' + p.color + '"><span class="av">' + p.avatar + '</span>' + esc(p.name) +
      '<span class="mode">' + (modeIcon[p.mode] || '') + '</span></div>').join('') : '<span style="color:var(--muted)">' + T('h.scan') + '</span>';
    $('btn-start').disabled = !S.players.length;
    document.querySelectorAll('.rounds').forEach((b) => b.classList.toggle('on', +b.dataset.r === S.settings.rounds));
    $('guide').textContent = T('h.guide', { s: T(S.settings.melodyGuide ? 'on' : 'off') });
    document.querySelectorAll('.lang').forEach((b) => b.classList.toggle('on', b.dataset.l === L()));
    $('guide').classList.toggle('on', S.settings.melodyGuide);
  }
  document.querySelectorAll('.rounds').forEach((b) => b.addEventListener('click', () => socket.emit('host:settings', { rounds: +b.dataset.r })));
  document.querySelectorAll('.lang').forEach((b) => b.addEventListener('click', () => socket.emit('host:settings', { lang: b.dataset.l })));
  $('guide').addEventListener('click', () => socket.emit('host:settings', { melodyGuide: !S.settings.melodyGuide }));
  $('btn-start').addEventListener('click', () => { Sfx.init(); socket.emit('host:start'); });
  $('btn-again').addEventListener('click', () => socket.emit('host:again'));
  $('btn-new').addEventListener('click', () => { sessionStorage.removeItem('pf-host'); location.reload(); });
  $('mi-skip').addEventListener('click', () => socket.emit('host:skip'));
  $('fsbtn').addEventListener('click', () => {
    Sfx.init();
    if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  });
  document.addEventListener('click', () => Sfx.init(), { once: true });

  // ------------------------------------------------------------ Brett
  const cv = $('board'), g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function resize() {
    const r = cv.parentElement.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);

  function tilePos(i, N) {
    const m = Math.max(50, Math.min(W, H) * 0.1);
    const x0 = m, y0 = m, w = W - 2 * m, h = H - 2 * m, P = 2 * (w + h);
    let s = ((i % N) / N) * P;
    if (s < w) return { x: x0 + s, y: y0 };
    s -= w; if (s < h) return { x: x0 + w, y: y0 + s };
    s -= h; if (s < w) return { x: x0 + w - s, y: y0 + h };
    s -= w; return { x: x0, y: y0 + h - s };
  }
  const TILE = { blue: '#3a86ff', red: '#ef476f', event: '#ffd166', start: '#06d6a0' };
  const TILE_ICON = { blue: '+3', red: '−3', event: '?', start: '⚑' };

  function drawBoard(t) {
    g.clearRect(0, 0, W, H);
    if (!S || !S.board || !S.board.length || S.phase !== 'board') return;
    const N = S.board.length, r = Math.max(16, Math.min(W, H) * 0.036);
    // Bahn
    g.lineWidth = r * 1.5; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i <= N; i++) { const p = tilePos(i, N); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
    g.stroke();
    for (let i = 0; i < N; i++) {
      const p = tilePos(i, N), type = S.board[i], isStar = i === S.starPos;
      g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2);
      g.fillStyle = TILE[type]; g.fill();
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke();
      g.fillStyle = type === 'event' ? '#5a3b00' : '#fff';
      g.font = '900 ' + Math.round(r * 0.85) + 'px "Trebuchet MS", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(TILE_ICON[type], p.x, p.y + 1);
      if (isStar) {
        const pulse = 1 + Math.sin(t / 180) * 0.12;
        g.save(); g.translate(p.x, p.y - r * 0.9); g.scale(pulse, pulse);
        g.font = Math.round(r * 2.3) + 'px sans-serif'; g.shadowColor = '#ffd166'; g.shadowBlur = 24;
        g.fillText('⭐', 0, 0); g.restore();
      }
    }
    // Spieler-Figuren
    const byTile = {};
    S.players.forEach((p) => {
      const a = pAnim[p.id]; if (!a) return;
      const diff = (a.target - a.cur + N) % N;
      if (diff > 0.001) a.cur = (a.cur + Math.min(diff, 0.16 + diff * 0.12)) % N; else a.cur = a.target;
      (byTile[Math.round(a.cur) % N] = byTile[Math.round(a.cur) % N] || []).push(p);
    });
    Object.keys(byTile).forEach((k) => {
      const list = byTile[k];
      list.forEach((p, idx) => {
        const a = pAnim[p.id];
        const i0 = Math.floor(a.cur), f = a.cur - i0;
        const A = tilePos(i0, N), B = tilePos(i0 + 1, N);
        const x = A.x + (B.x - A.x) * f + (idx - (list.length - 1) / 2) * r * 0.95;
        const y = A.y + (B.y - A.y) * f - r * 0.55 + (S.turnId === p.id ? Math.sin(t / 120) * 4 : 0);
        g.beginPath(); g.arc(x, y, r * 0.78, 0, Math.PI * 2);
        g.fillStyle = p.color; g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
        g.font = Math.round(r * 1.05) + 'px sans-serif'; g.fillStyle = '#fff'; g.fillText(p.avatar, x, y + 2);
      });
    });
  }

  function renderBoardUI() {
    $('side').innerHTML = S.players.map((p) =>
      '<div class="prow ' + (S.turnId === p.id ? 'turn' : '') + (p.connected ? '' : ' off') + '" style="border-left:6px solid ' + p.color + '"><div class="av">' + p.avatar + '</div>' +
      '<div class="nm">' + esc(p.name) + '</div><div class="st">⭐ ' + p.stars + '<br>🪙 ' + p.coins + '</div></div>').join('') +
      '<div class="hintp" style="color:var(--muted);font-size:.85rem;margin-top:auto">' + T('h.legend', { n: S.starCost }) + '</div>';
    const cur = S.players.find((p) => p.id === S.turnId);
    let hint = '';
    if (S.prompt && S.prompt.type === 'roll') hint = T('h.rolling');
    else if (S.prompt && S.prompt.type === 'buyStar') hint = T('h.canbuy', { n: S.starCost });
    $('boardInfo').innerHTML = '<div class="round">' + T('h.round', { r: S.round, n: S.rounds }) + '</div>' +
      (cur ? '<div class="turn">' + cur.avatar + ' ' + esc(cur.name) + '</div><div class="hint">' + hint + '</div>' : '<div class="turn">' + T('h.nextmini') + '</div>');
  }

  function reactToChanges(prev, s) {
    s.players.forEach((p) => {
      const o = prev.players.find((x) => x.id === p.id); if (!o) return;
      if (p.stars > o.stars) Sfx.sfx('star');
      else if (p.coins > o.coins) Sfx.sfx('coin');
      else if (p.coins < o.coins) Sfx.sfx('bad');
    });
  }

  let bannerT = null;
  function banner(html, ms, color) {
    const b = $('banner');
    b.innerHTML = html; b.style.borderColor = color || 'var(--yellow)';
    b.classList.add('show');
    clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms || 1700);
  }
  socket.on('board:roll', (d) => {
    const p = S && S.players.find((x) => x.id === d.playerId); if (!p) return;
    Sfx.sfx('roll');
    banner('🎲 ' + T('h.rolls', { name: p.avatar + ' ' + esc(p.name) }), 700);
    setTimeout(() => banner('🎲 ' + d.roll + '!', 1300), 750);
  });
  socket.on('board:step', () => Sfx.sfx('step'));
  socket.on('board:teleport', (d) => { if (pAnim[d.playerId]) pAnim[d.playerId].cur = d.pos; });
  socket.on('board:star', (d) => {
    const p = S.players.find((x) => x.id === d.playerId);
    banner('⭐ ' + T('h.starbuy', { name: p ? esc(p.name) : '' }), 2000, '#ffd166');
  });
  socket.on('board:effect', (d) => {
    const p = S.players.find((x) => x.id === d.playerId);
    const col = d.delta > 0 ? '#06d6a0' : d.delta < 0 ? '#ef476f' : '#ffd166';
    banner((p ? p.avatar + ' ' : '') + esc(d.text), 1900, col);
  });
  socket.on('round', (d) => banner(T('h.roundbanner', { r: d.round, n: d.rounds }), 1600));

  // ------------------------------------------------------------ Minispiele
  const MVIEWS = ['intro', 'tap', 'reaction', 'dance', 'sing', 'results'];
  function mview(name) { MVIEWS.forEach((v) => $('m-' + v).classList.toggle('hidden', v !== name)); }
  function stopMini() { if (miniRun) { if (miniRun.track) miniRun.track.stop(); miniRun.stopped = true; miniRun = null; } $('countdown').classList.add('hidden'); }

  function syncMini() {
    const m = S.mini; if (!m) return;
    if (m.step === 'intro' && (!miniRun || miniRun.intro !== m.type + m.ref + S.round)) showIntro(m);
    else if (m.step === 'play' && (!miniRun || miniRun.startAt !== m.startAt)) startMini(m);
    else if (m.step === 'intro') renderReady();
  }
  function showIntro(m) {
    stopMini();
    readySet.clear();
    miniRun = { intro: m.type + m.ref + S.round };
    mview('intro');
    $('mi-title').textContent = m.title; $('mi-desc').textContent = m.desc;
    $('mi-ref').textContent = m.refTitle ? '♪ ' + m.refTitle : '';
    $('mi-skip').classList.toggle('hidden', !m.needReady);
    renderReady();
    Sfx.sfx('go');
  }
  function renderReady() {
    const m = S.mini;
    $('mi-ready').innerHTML = m && m.needReady
      ? S.players.map((p) => '<div class="rchip ' + (readySet.has(p.id) ? 'ok' : '') + '">' + p.avatar + ' ' + esc(p.name) + (readySet.has(p.id) ? ' ✓' : ' …') + '</div>').join('')
      : '';
  }
  socket.on('mini:intro', () => {});
  socket.on('mini:ready', (d) => { readySet.add(d.id); if (S && S.phase === 'minigame') renderReady(); });

  function startMini(m) {
    stopMini();
    const run = { type: m.type, startAt: m.startAt, durationMs: m.durationMs, ref: m.ref, goTimes: m.goTimes, progress: {}, hist: {}, lastTick: -1 };
    miniRun = run;
    $('countdown').classList.remove('hidden');
    if (m.type === 'tap') initTap(run);
    if (m.type === 'reaction') { mview('reaction'); $('re-sign').textContent = T('h.getready'); $('re-sign').style.color = '#fff'; }
    if (m.type === 'dance') {
      mview('dance');
      const D = PF.DANCES[m.ref];
      run.track = Sfx.playTrack({ startInMs: m.startAt - Net.now(), bpm: D.bpm, beats: PF.danceBeats(D), lead: D.lead, kind: 'dance' });
    }
    if (m.type === 'sing') {
      mview('sing');
      const Sg = PF.SONGS[m.ref];
      run.track = Sfx.playTrack({ startInMs: m.startAt - Net.now(), bpm: Sg.bpm, beats: PF.songBeats(Sg), lead: Sg.lead, kind: 'sing', melody: Sg.notes, guide: S.settings.melodyGuide });
    }
    requestAnimationFrame(miniLoop);
  }
  socket.on('mini:start', () => {});
  socket.on('mini:progress', (d) => {
    if (!miniRun) return;
    const prog = miniRun.progress[d.id] = Object.assign(miniRun.progress[d.id] || {}, d);
    if (d.judge) prog.judgeAt = Date.now();
    if (miniRun.type === 'sing' && typeof d.pitch === 'number') {
      const h = miniRun.hist[d.id] = miniRun.hist[d.id] || [];
      h.push({ t: Date.now(), pitch: d.pitch, tgt: d.tgt }); if (h.length > 60) h.shift();
    }
    if (miniRun.type === 'tap') updateTap();
  });

  // ---- Tap
  function initTap(run) {
    mview('tap');
    $('tap-bars').innerHTML = S.players.map((p) =>
      '<div class="tbar"><div>' + p.avatar + '</div><div class="track"><div class="fill" id="tf-' + p.id + '" style="background:' + p.color + '"></div></div><div id="tn-' + p.id + '">0</div></div>').join('');
  }
  function updateTap() {
    const max = Math.max(30, ...S.players.map((p) => (miniRun.progress[p.id] || {}).score || 0));
    S.players.forEach((p) => {
      const sc = (miniRun.progress[p.id] || {}).score || 0;
      const f = $('tf-' + p.id), n = $('tn-' + p.id);
      if (f) { f.style.width = Math.min(100, sc / max * 100) + '%'; n.textContent = sc; }
    });
  }

  // ---- Hauptschleife der Minispiele
  function miniLoop() {
    const run = miniRun; if (!run || run.stopped) return;
    const now = Net.now(), until = run.startAt - now;
    const cd = $('countdown');
    if (until > 0) {
      const n = Math.ceil(until / 1000);
      if (run.lastTick !== n) { run.lastTick = n; Sfx.sfx('tick'); }
      cd.classList.remove('hidden'); cd.textContent = n;
    } else {
      if (!cd.classList.contains('hidden')) { cd.classList.add('hidden'); Sfx.sfx('go'); }
    }
    const el = now - run.startAt;
    if (run.type === 'tap') $('tap-timer').textContent = Math.max(0, Math.ceil((run.durationMs - Math.max(0, el)) / 1000));
    else if (run.type === 'reaction') drawReaction(run, now);
    else if (run.type === 'dance') drawDance(run, now);
    else if (run.type === 'sing') drawSing(run, now);
    requestAnimationFrame(miniLoop);
  }

  function drawReaction(run, now) {
    const gt = run.goTimes; let round = 0, state = 'wait';
    for (let i = 0; i < gt.length; i++) {
      if (now >= gt[i] - 5000) round = i;
      if (now >= gt[i] && now < gt[i] + 1600) { state = 'go'; round = i; }
    }
    $('re-round').textContent = T('h.round', { r: round + 1, n: gt.length });
    const s = $('re-sign');
    if (state === 'go') {
      if (s.textContent !== T('h.now')) Sfx.sfx('go');
      s.textContent = T('h.now'); s.style.color = '#06d6a0';
    } else { s.textContent = now < run.startAt ? T('h.getready') : T('h.wait'); s.style.color = '#fff'; }
  }

  // ---- Tanz
  const JCOL = { perfect: '#ffd166', good: '#2ec4b6', ok: '#3a86ff', miss: '#ef476f' };
  const JTXT = (j) => T('j.' + j);
  function fitCanvas(c) {
    const r = c.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
    const ctx = c.getContext('2d'); ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }
  function playerCards(ctx, w, h, run, y) {
    const n = S.players.length, cw = Math.min(210, (w - 40) / n), gap = 10;
    const total = n * cw + (n - 1) * gap; let x = (w - total) / 2;
    S.players.forEach((p) => {
      const pr = run.progress[p.id] || {};
      ctx.fillStyle = 'rgba(255,255,255,.1)'; roundRect(ctx, x, y, cw, 84, 16); ctx.fill();
      ctx.strokeStyle = p.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
      ctx.font = '30px sans-serif'; ctx.fillText(p.avatar, x + 10, y + 26);
      ctx.font = '800 15px "Trebuchet MS", sans-serif'; ctx.fillText(p.name.slice(0, 10), x + 50, y + 22);
      ctx.font = '900 28px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#ffd166'; ctx.fillText(Math.round(pr.score || 0), x + 12, y + 60);
      if (pr.judge && Date.now() - (pr.judgeAt || 0) < 900) {
        ctx.fillStyle = JCOL[pr.judge] || '#fff'; ctx.textAlign = 'right'; ctx.font = '900 18px "Trebuchet MS", sans-serif';
        ctx.fillText(JTXT(pr.judge), x + cw - 10, y + 60);
      }
      x += cw + gap;
    });
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function drawDance(run, now) {
    const { ctx, w, h } = fitCanvas($('dance-cv'));
    const D = PF.DANCES[run.ref], spb = 60000 / D.bpm;
    const beat = (now - run.startAt) / spb - D.lead; // 0 = Treffer der ersten Bewegung
    const pulse = 1 - ((((beat % 1) + 1) % 1));
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, h * 0.9);
    grad.addColorStop(0, 'rgba(131,56,236,' + (0.25 + pulse * 0.25) + ')'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    const k = Math.max(0, Math.floor((beat + 0.4) / D.every));
    const idx = Math.min(k, D.moves.length - 1);
    const cur = PF.MOVES[D.moves[idx]], curName = PF.nm(cur.name, L());
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.font = '900 ' + Math.round(h * 0.055) + 'px "Trebuchet MS", sans-serif';
    ctx.fillText(PF.nm(D.title, L()) + (beat < -0.2 ? ' – ' + T('h.soon') : ''), w / 2, h * 0.07);
    // großer Tänzer
    const size = h * 0.56, cx = w * 0.36, cy = h * 0.43;
    const until = (idx * D.every - beat) / D.every; // 0..1+ bis zum Treffer
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, 1 - until)));
    ctx.strokeStyle = until < 0.15 && until > -0.4 ? '#ffd166' : 'rgba(255,255,255,.35)'; ctx.lineWidth = 8; ctx.stroke();
    PFDraw.drawFigure(ctx, cur, cx, cy + size * 0.04, size * 0.85, '#fff', 1);
    ctx.fillStyle = '#ffd166'; ctx.font = '900 ' + Math.round(h * 0.05) + 'px "Trebuchet MS", sans-serif';
    ctx.fillText(curName, cx, cy + size * 0.58);
    // nächste Posen
    ctx.fillStyle = '#b9b2e0'; ctx.font = '800 ' + Math.round(h * 0.03) + 'px "Trebuchet MS", sans-serif';
    ctx.fillText(T('h.next'), w * 0.76, h * 0.125);
    for (let j = 1; j <= 3; j++) {
      const mi = idx + j; if (mi >= D.moves.length) break;
      PFDraw.drawFigure(ctx, PF.MOVES[D.moves[mi]], w * 0.76, h * (0.31 + (j - 1) * 0.2), h * 0.19, '#fff', 0.9 - j * 0.2);
    }
    // Fortschritt
    const total = D.moves.length * D.every;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(w * 0.05, h * 0.115, w * 0.9, 6);
    ctx.fillStyle = '#2ec4b6'; ctx.fillRect(w * 0.05, h * 0.115, w * 0.9 * Math.max(0, Math.min(1, beat / total)), 6);
    playerCards(ctx, w, h, run, h - 104);
  }

  // ---- Singen
  function drawSing(run, now) {
    const { ctx, w, h } = fitCanvas($('sing-cv'));
    const Sg = PF.SONGS[run.ref], spb = 60000 / Sg.bpm;
    const beat = (now - run.startAt) / spb - Sg.lead; // 0 = erste Note
    ctx.clearRect(0, 0, w, h);
    let lo = 999, hi = 0; Sg.notes.forEach((n) => { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); });
    lo -= 2; hi += 2;
    const top = h * 0.14, bot = h * 0.60, yOf = (p) => bot - (p - lo) / (hi - lo) * (bot - top);
    const nowX = w * 0.22, pxPerBeat = w * 0.075;
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 ' + Math.round(h * 0.05) + 'px "Trebuchet MS", sans-serif';
    ctx.fillText('♪ ' + Sg.title + (beat < -0.2 ? '  –  ' + T('h.soon') : ''), w / 2, h * 0.07);
    for (let p = lo; p <= hi; p++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(0, yOf(p) - 1, w, 2); }
    // Noten
    Sg.notes.forEach((n) => {
      const x1 = nowX + (n.b - beat) * pxPerBeat, ww = n.d * pxPerBeat - 4;
      if (x1 > w || x1 + ww < 0) return;
      const active = beat >= n.b && beat < n.b + n.d;
      ctx.fillStyle = active ? '#ffd166' : 'rgba(46,196,182,.85)';
      roundRect(ctx, x1, yOf(n.p) - 13, Math.max(8, ww), 26, 13); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(nowX - 2, top - 20, 4, bot - top + 40);
    // Sänger-Punkte (relativ zum Zielton)
    const n2 = S.players.length;
    S.players.forEach((p, i) => {
      const hArr = run.hist[p.id] || [];
      hArr.forEach((s) => {
        const age = (Date.now() - s.t) / spb; if (age > 3.5) return;
        const x = nowX - age * pxPerBeat;
        const y = Math.max(top - 10, Math.min(bot + 10, yOf(s.pitch)));
        ctx.globalAlpha = Math.max(0.1, 1 - age / 3.5);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
    });
    // Text
    const lines = []; let cur = [];
    Sg.notes.forEach((n, i) => { cur.push(i); if (n.br) { lines.push(cur); cur = []; } });
    if (cur.length) lines.push(cur);
    let li = 0;
    lines.forEach((l, i) => { if (beat >= Sg.notes[l[0]].b - 2) li = i; });
    const line = lines[li];
    const parts = line.map((ni) => { const n = Sg.notes[ni]; return { txt: n.t.replace(/-$/, ''), join: /-$/.test(n.t), done: beat >= n.b }; });
    ctx.font = '900 ' + Math.round(h * 0.07) + 'px "Trebuchet MS", sans-serif'; ctx.textAlign = 'left';
    let full = 0; const widths = parts.map((p) => { const wd = ctx.measureText(p.txt + (p.join ? '' : ' ')).width; full += wd; return wd; });
    let x = (w - full) / 2; const ly = h * 0.72;
    parts.forEach((p, i) => { ctx.fillStyle = p.done ? '#ffd166' : '#fff'; ctx.fillText(p.txt, x, ly); x += widths[i]; });
    if (lines[li + 1]) {
      const nxt = lines[li + 1].map((ni) => { const t = Sg.notes[ni].t; return t.replace(/-$/, '') + (/-$/.test(t) ? '' : ' '); }).join('');
      ctx.font = '700 ' + Math.round(h * 0.04) + 'px "Trebuchet MS", sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.textAlign = 'center';
      ctx.fillText(nxt, w / 2, ly + h * 0.085);
    }
    playerCards(ctx, w, h, run, h - 104);
  }

  // ---- Ergebnis
  socket.on('mini:end', (d) => {
    stopMini();
    mview('results');
    const medals = ['🥇', '🥈', '🥉'];
    $('mr-title').textContent = T('h.result');
    $('mr-rows').innerHTML = d.results.map((r, i) => {
      const p = S.players.find((x) => x.id === r.id) || { avatar: '?', name: '?' };
      return '<div class="rrow ' + (r.rank === 1 ? 'first' : '') + '" style="animation-delay:' + i * 0.12 + 's"><div>' + (medals[r.rank - 1] || r.rank + '.') + '</div><div style="font-size:2rem">' + p.avatar +
        '</div><div>' + esc(p.name) + '</div><div style="color:var(--muted);font-size:1.1rem">' + esc(r.label) + '</div><div class="coins">+' + r.coins + ' 🪙</div></div>';
    }).join('');
    Sfx.sfx('win');
  });

  // ---- Ende
  socket.on('game:end', (d) => {
    stopMini();
    const order = [1, 0, 2]; // Anzeige: 2., 1., 3.
    const heights = [200, 260, 150];
    const cols = ['#c0c7d4', '#ffd166', '#d99058'];
    const top3 = d.ranking.slice(0, 3);
    $('podium').innerHTML = order.map((ri, pos) => {
      const p = top3[ri]; if (!p) return '';
      return '<div class="pod" style="height:' + (heights[pos] + 90) + 'px;background:' + cols[pos] + ';color:#1b1233;animation-delay:' + (pos === 1 ? 1.2 : pos === 0 ? 0.4 : 0.1) + 's"><div class="av">' + p.avatar + '</div><div>' + esc(p.name) +
        '</div><div>⭐ ' + p.stars + ' · 🪙 ' + p.coins + '</div><div style="font-size:2.2rem;margin-top:auto">' + (ri + 1) + '</div></div>';
    }).join('');
    const rest = d.ranking.slice(3).map((p) => p.avatar + ' ' + esc(p.name) + ' (⭐' + p.stars + ')').join(' · ');
    $('bonus').innerHTML = d.bonus.map((b) => {
      const names = b.playerIds.map((id) => { const p = d.ranking.find((x) => x.id === id); return p ? p.avatar + ' ' + esc(p.name) : ''; }).join(', ');
      return '<div class="b"><b>⭐ ' + esc(b.title) + '</b> – ' + names + '<br><small style="color:var(--muted)">' + esc(b.desc) + '</small></div>';
    }).join('') + (rest ? '<div class="b" style="border-color:var(--line)">' + T('h.more') + ' ' + rest + '</div>' : '');
    showScreen('end');
    Sfx.sfx('win');
  });

  // ------------------------------------------------------------ Start
  resize();
  (function frame(t) { drawBoard(t); requestAnimationFrame(frame); })(0);
  setInterval(resize, 2000);
})();
