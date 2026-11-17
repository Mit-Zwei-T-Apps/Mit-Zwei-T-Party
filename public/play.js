/* Mit Zwei T Party – phone controller: join, roll, dance detection (camera / motion / tap), singing detection (microphone) */
(function () {
  'use strict';
  const socket = io();
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VIEWS = ['join', 'wait', 'board', 'intro', 'tap', 'react', 'dance', 'sing', 'result', 'end'];
  const show = (v) => VIEWS.forEach((x) => $('v-' + x).classList.toggle('hidden', x !== v));
  const vib = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  let S = null;
  const joinLang = new URLSearchParams(location.search).get('lang') === 'de' ? 'de' : 'en';
  let curLang = null;
  const L = () => (S && S.settings && S.settings.lang) || joinLang;
  const T = (k, v) => I18N.t(L(), k, v);
  function applyLang() {
    if (curLang === L()) return;
    curLang = L(); I18N.apply(document, curLang);
    if (!window.isSecureContext) $('sec-warn').textContent = T('p.nohttps');
  }
  let me = JSON.parse(localStorage.getItem('pf-player') || 'null'); // { playerId, code }
  let selAvatar = null;
  let run = null;      // laufendes Minispiel
  let prep = null;     // vorbereitete Sensoren { type, ok, mode }
  const res = { stream: null, audioCtx: null, analyser: null, landmarker: null, motionOn: false, motionBuf: [], motionOk: false };

  // ------------------------------------------------------------ Beitreten
  const qs = new URLSearchParams(location.search);
  $('in-code').value = (qs.get('code') || (me && me.code) || '').toUpperCase();
  $('in-name').value = localStorage.getItem('pf-name') || '';
  $('avgrid').innerHTML = PF.AVATARS.map((a) => '<button data-a="' + a + '">' + a + '</button>').join('');
  $('avgrid').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    selAvatar = b.dataset.a;
    document.querySelectorAll('#avgrid button').forEach((x) => x.classList.toggle('sel', x === b));
  });
  $('btn-join').addEventListener('click', () => join());
  function join(silent) {
    const code = $('in-code').value.trim().toUpperCase();
    const name = $('in-name').value.trim();
    if (!silent && code.length !== 4) { $('join-err').textContent = T('p.codeerr'); return; }
    localStorage.setItem('pf-name', name);
    socket.emit('join', { code: code, name: name, avatar: selAvatar, lang: joinLang, playerId: me && me.code === code ? me.playerId : null }, (r) => {
      if (!r || !r.ok) {
        if (silent) { me = null; localStorage.removeItem('pf-player'); show('join'); }
        $('join-err').textContent = (r && r.error) || T('p.joinfail'); return;
      }
      me = { playerId: r.playerId, code: r.code };
      localStorage.setItem('pf-player', JSON.stringify(me));
      Net.sync(socket);
      requestWake();
    });
  }
  socket.on('connect', () => { if (me) join(true); else show('join'); });
  socket.on('kicked', () => { me = null; localStorage.removeItem('pf-player'); show('join'); });
  socket.on('closed', () => { stopRun(true); me = null; localStorage.removeItem('pf-player'); show('join'); $('join-err').textContent = T('p.closed'); });
  // Verlassen
  $('btn-leave').addEventListener('click', () => {
    if (!confirm(T('p.leaveq'))) return;
    stopRun(true); socket.emit('player:leave');
    me = null; localStorage.removeItem('pf-player'); show('join');
  });
  // Name / Figur bearbeiten (nur in der Lobby)
  let edAvatar = null;
  $('btn-edit').addEventListener('click', () => {
    const box = $('edit-box'); const open = box.style.display !== 'flex';
    box.style.display = open ? 'flex' : 'none';
    if (open) { const p = meP(); $('ed-name').value = p ? p.name : ''; edAvatar = p ? p.avatar : null; drawEd(); }
  });
  function drawEd() {
    const taken = S ? S.players.filter((x) => !me || x.id !== me.playerId).map((x) => x.avatar) : [];
    $('edgrid').innerHTML = PF.AVATARS.map((a) => '<button data-a="' + a + '"' + (taken.includes(a) ? ' disabled' : '') + (a === edAvatar ? ' class="sel"' : '') + '>' + a + '</button>').join('');
  }
  $('edgrid').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; edAvatar = b.dataset.a; drawEd(); });
  $('btn-save').addEventListener('click', () => {
    const name = $('ed-name').value.trim(); if (name) localStorage.setItem('pf-name', name);
    socket.emit('player:edit', { name: name, avatar: edAvatar }, () => { $('edit-box').style.display = 'none'; });
  });
  let wake = null;
  function requestWake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((w) => { wake = w; }).catch(() => {}); } catch (e) {} }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && me) requestWake(); });
  applyLang();

  // ------------------------------------------------------------ Zustand
  socket.on('state', (s) => { S = s; applyLang(); render(); });
  const meP = () => S && me && S.players.find((p) => p.id === me.playerId);
  const meCard = (p) => '<div class="av">' + p.avatar + '</div><div class="nm">' + esc(p.name) + '</div><div class="st">⭐ ' + p.stars + '<br>🪙 ' + p.coins + '</div>';

  function render() {
    if (!me || !S) return;
    const p = meP();
    $('btn-leave').classList.toggle('hidden', !p);
    if (!p) { if (S.phase !== 'lobby') { me = null; localStorage.removeItem('pf-player'); } show('join'); return; }
    // belegte Avatare im Join-Screen sind hier irrelevant
    if (S.phase === 'lobby') { stopRun(true); show('wait'); $('me-wait').innerHTML = meCard(p); markModes(p.mode); }
    else if (S.phase === 'board') { if (run) stopRun(true); show('board'); renderBoard(p); }
    else if (S.phase === 'minigame') syncMini(p);
    else { stopRun(true); show('end'); $('me-end').innerHTML = meCard(p); }
  }

  // ---- Modus-Auswahl
  function markModes(mode) {
    document.querySelectorAll('#modes button').forEach((b) => b.classList.toggle('sel', b.dataset.m === mode));
    $('mode-hint').textContent = T('p.mh.' + mode);
  }
  $('modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) socket.emit('player:mode', b.dataset.m); });

  // ---- Brett
  let lastPrompt = '';
  function renderBoard(p) {
    $('me-board').innerHTML = meCard(p);
    const body = $('board-body');
    const pr = S.prompt;
    const key = pr ? pr.type + pr.playerId + S.round + S.turnId : 'none' + S.turnId;
    if (key === lastPrompt && !(pr === null)) return;
    lastPrompt = key;
    if (pr && pr.playerId === p.id && pr.type === 'roll') {
      body.innerHTML = '<div class="big">' + T('p.yourturn') + '</div><button class="btn bigbtn" id="rollBtn">' + T('p.roll') + '</button>';
      $('rollBtn').addEventListener('click', () => { socket.emit('player:roll'); $('rollBtn').disabled = true; vib(40); });
      vib([120, 60, 120]);
    } else if (pr && pr.playerId === p.id && pr.type === 'buyStar') {
      body.innerHTML = '<div class="big">' + T('p.buystar') + '</div><div class="hintp">' + T('p.cost', { c: pr.cost, n: p.coins }) + '</div>' +
        '<button class="btn bigbtn" id="yesBtn">' + T('p.yes') + '</button><button class="btn ghost bigbtn" id="noBtn" style="padding:16px;font-size:1.2rem">' + T('p.no') + '</button>';
      $('yesBtn').addEventListener('click', () => { socket.emit('player:choice', true); body.innerHTML = '<div class="big">⭐</div>'; });
      $('noBtn').addEventListener('click', () => { socket.emit('player:choice', false); body.innerHTML = ''; });
      vib([100, 50, 100]);
    } else {
      const t = S.players.find((x) => x.id === S.turnId);
      body.innerHTML = t ? '<div class="big">' + t.avatar + ' ' + esc(t.name) + '</div><div class="hintp">' + T('p.isturn') + '</div>' : '<div class="big">⏳</div><div class="hintp">' + T('p.coming') + '</div>';
    }
  }

  // ------------------------------------------------------------ Minispiele
  function syncMini(p) {
    const m = S.mini; if (!m) return;
    if (m.step === 'intro') { if (!run || run.key !== 'i' + m.type + m.ref + S.round) showIntro(m, p); }
    else if (m.step === 'play') { if (!run || run.startAt !== m.startAt) startRun(m, p); }
    else if (m.step === 'results') showResult(m, p);
  }

  function showIntro(m, p) {
    stopRun(true);
    run = { key: 'i' + m.type + m.ref + S.round, intro: true };
    prep = null;
    show('intro');
    $('in-title').textContent = m.title; $('in-desc').textContent = m.desc;
    $('in-ref').textContent = m.refTitle ? '♪ ' + m.refTitle : '';
    const b = $('btn-ready');
    b.disabled = false;
    b.classList.toggle('hidden', !m.needReady);
    b.textContent = m.type === 'sing' ? T('p.rdy.sing') : (p.mode === 'camera' ? T('p.rdy.cam') : T('p.rdy'));
    $('in-status').textContent = m.needReady ? T('p.st.tap') : T('p.st.soon');
    vib(60);
  }
  // Vor jedem Sing-/Tanz-Minispiel fragen wir selbst nach – unabhängig davon, ob sich der Browser die Erlaubnis gemerkt hat.
  function askPerm(kind, onChoice) {
    $('perm-t').textContent = T('p.perm.' + kind + '.t');
    $('perm-d').textContent = T('p.perm.' + kind + '.d');
    $('perm-yes').textContent = T('p.perm.allow');
    $('perm-no').textContent = T('p.perm.deny');
    $('perm').classList.remove('hidden');
    // Die Sensor-Anfrage muss direkt im Klick-Handler starten (Handy-Browser verlangen eine Nutzer-Geste).
    $('perm-yes').onclick = () => { $('perm').classList.add('hidden'); onChoice(true); };
    $('perm-no').onclick = () => { $('perm').classList.add('hidden'); onChoice(false); };
  }
  $('btn-ready').addEventListener('click', () => {
    const m = S && S.mini, p = meP(); if (!m || !p) return;
    const kind = m.type === 'sing' ? 'mic' : m.type === 'dance' ? (p.mode === 'camera' ? 'cam' : p.mode === 'motion' ? 'motion' : null) : null;
    if (!kind) doReady(true); else askPerm(kind, doReady);
  });
  async function doReady(allowed) {
    const m = S && S.mini, p = meP(); if (!m || !p) return;
    const b = $('btn-ready'); b.disabled = true; b.textContent = T('p.loading');
    let ok = true, mode = p.mode;
    try {
      if (!allowed) { if (m.type === 'sing') ok = false; else if (m.type === 'dance') mode = 'tap'; }
      else if (m.type === 'sing') await prepSing();
      else if (m.type === 'dance') mode = await prepDance(p.mode);
    } catch (e) { ok = false; console.warn(e); }
    prep = { type: m.type, ok: ok, mode: mode };
    socket.emit('mini:ready', { ok: ok, mode: mode });
    b.classList.add('hidden');
    $('in-status').textContent = ok ? T('p.st.ok') : (m.type === 'sing' ? T('p.st.nomic') : T('p.st.wait'));
  }

  // ---- Sensor-Vorbereitung
  async function prepSing() {
    releaseMedia();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC(); try { await ac.resume(); } catch (e) {}
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true } });
    const src = ac.createMediaStreamSource(stream);
    const an = ac.createAnalyser(); an.fftSize = 2048; an.smoothingTimeConstant = 0;
    src.connect(an);
    res.stream = stream; res.audioCtx = ac; res.analyser = an;
  }
  async function enableMotion() {
    if (!window.DeviceMotionEvent) throw new Error('kein Bewegungssensor');
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      const r = await DeviceMotionEvent.requestPermission();
      if (r !== 'granted') throw new Error('Bewegungssensor abgelehnt');
    }
    if (!res.motionHandler) {
      res.motionHandler = (e) => {
        let a = e.acceleration, m = null;
        if (a && a.x != null) m = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        else if (e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) {
          const g = e.accelerationIncludingGravity; m = Math.abs(Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z) - 9.81);
        }
        if (m == null) return;
        res.motionOk = true;
        if (res.motionOn) { const t = Net.now(); res.motionBuf.push({ t: t, m: m }); while (res.motionBuf.length && t - res.motionBuf[0].t > 6000) res.motionBuf.shift(); }
      };
      window.addEventListener('devicemotion', res.motionHandler);
    }
    res.motionOk = false;
    await new Promise((r) => setTimeout(r, 700));
    if (!res.motionOk) throw new Error('keine Bewegungsdaten');
  }
  async function loadLandmarker() {
    if (res.landmarker) return res.landmarker;
    const vision = await import('/vendor/mediapipe/vision_bundle.mjs');
    const fs = await vision.FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
    const model = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
    const mk = (delegate) => vision.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: model, delegate: delegate }, runningMode: 'VIDEO', numPoses: 1 });
    try { res.landmarker = await mk('GPU'); } catch (e) { res.landmarker = await mk('CPU'); }
    return res.landmarker;
  }
  async function startCamera() {
    releaseMedia();
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false });
    const v = $('cam'); v.srcObject = stream; await v.play();
    res.stream = stream;
    await loadLandmarker();
  }
  async function prepDance(wanted) {
    if (wanted === 'camera') {
      try { await startCamera(); return 'camera'; } catch (e) { console.warn('Kamera:', e); }
      wanted = 'motion';
    }
    if (wanted === 'motion') {
      try { await enableMotion(); return 'motion'; } catch (e) { console.warn('Bewegung:', e); }
    }
    return 'tap';
  }
  function releaseMedia() {
    if (res.stream) { res.stream.getTracks().forEach((t) => t.stop()); res.stream = null; }
    if (res.audioCtx) { try { res.audioCtx.close(); } catch (e) {} res.audioCtx = null; res.analyser = null; }
    const v = $('cam'); if (v) v.srcObject = null;
  }

  function stopRun(full) {
    if (run) { run.stopped = true; if (run.raf) cancelAnimationFrame(run.raf); }
    run = null;
    res.motionOn = false;
    if (full) releaseMedia();
  }
  function loop(r, fn) {
    (function f() { if (run !== r || r.stopped) return; try { fn(Net.now()); } catch (e) { console.error(e); } r.raf = requestAnimationFrame(f); })();
  }
  function sendResult(r, score, label) {
    if (r.sent) return; r.sent = true;
    socket.emit('mini:result', { score: score, label: label });
  }
  let lastProg = 0;
  function sendProgress(d, force) {
    const t = Date.now(); if (!force && t - lastProg < 110) return; lastProg = t;
    socket.emit('mini:progress', d);
  }

  function startRun(m, p) {
    stopRun(false);
    Net.sync(socket, 4);
    const r = run = { type: m.type, startAt: m.startAt, dur: m.durationMs, m: m, key: 'p' + m.startAt };
    if (m.type === 'tap') runTap(r);
    else if (m.type === 'reaction') runReaction(r);
    else if (m.type === 'dance') runDance(r, p);
    else if (m.type === 'sing') runSing(r);
  }

  // ---- Tippen
  function runTap(r) {
    show('tap');
    let n = 0; $('tap-count').textContent = '0';
    const btn = $('tapBtn');
    btn.onpointerdown = (e) => { e.preventDefault(); const t = Net.now(); if (t >= r.startAt && t <= r.startAt + r.dur) { n++; $('tap-count').textContent = n; sendProgress({ score: n }); } };
    loop(r, (now) => {
      const until = r.startAt - now;
      if (until > 0) $('tap-info').textContent = T('p.tap.in', { n: Math.ceil(until / 1000) });
      else if (now < r.startAt + r.dur) $('tap-info').textContent = T('p.tap.go', { n: Math.ceil((r.startAt + r.dur - now) / 1000) });
      else { $('tap-info').textContent = T('p.done'); sendProgress({ score: n }, true); sendResult(r, n, T('p.taps', { n: n })); }
    });
  }

  // ---- Reaktion
  function runReaction(r) {
    show('react');
    const gt = r.m.goTimes, n = gt.length;
    const rt = new Array(n).fill(null), early = new Array(n).fill(false);
    const winStart = (i) => (i === 0 ? r.startAt : gt[i - 1] + 1600), winEnd = (i) => gt[i] + 1600;
    const btn = $('reactBtn');
    const roundAt = (t) => { for (let i = 0; i < n; i++) if (t >= winStart(i) && t < winEnd(i)) return i; return -1; };
    btn.onpointerdown = (e) => {
      e.preventDefault();
      const t = Net.now(), i = roundAt(t); if (i < 0) return;
      if (t < gt[i]) { early[i] = true; vib(150); }
      else if (rt[i] == null) { rt[i] = t - gt[i]; vib(30); }
    };
    loop(r, (now) => {
      const i = roundAt(now);
      if (i < 0) {
        btn.className = ''; btn.textContent = now < r.startAt ? T('p.r.soon') : T('p.r.wait');
        if (now >= winEnd(n - 1)) {
          let total = 0;
          for (let k = 0; k < n; k++) total += (rt[k] == null ? 1600 : rt[k]) + (early[k] ? 700 : 0);
          sendResult(r, Math.max(0, 7000 - total), T('p.r.avg', { n: Math.round(total / n) }));
          $('re-info').textContent = T('p.done');
        }
        return;
      }
      $('re-info').textContent = T('p.r.round', { r: i + 1, n: n });
      if (now >= gt[i]) {
        if (rt[i] != null) { btn.className = ''; btn.textContent = rt[i] + ' ms'; }
        else { btn.className = 'go'; btn.textContent = T('p.r.now'); }
      } else if (early[i]) { btn.className = 'early'; btn.textContent = T('p.r.early'); }
      else { btn.className = ''; btn.textContent = T('p.r.wait'); }
    });
  }

  // ---- Tanzen
  const PTS = { perfect: 100, good: 70, ok: 40, miss: 0 };
  const JNAME = (j) => T('j.' + j);
  const SKEL = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

  function runDance(r, p) {
    show('dance');
    const mode = prep && prep.type === 'dance' && prep.ok !== false ? prep.mode : 'tap';
    r.mode = mode;
    const D = PF.DANCES[r.m.ref], spb = 60000 / D.bpm;
    const nM = D.moves.length;
    const hit = (k) => r.startAt + (D.lead + k * D.every) * spb;
    let k = 0, sum = 0;
    const st = { firstFull: null, best: 0 };
    const taps = [];
    $('camwrap').classList.toggle('hidden', mode !== 'camera');
    $('dnTap').classList.toggle('hidden', mode !== 'tap');
    $('dn-hint').textContent = mode === 'camera' ? T('p.d.cam') : mode === 'motion' ? T('p.d.motion') : T('p.d.tap');
    $('dn-score').textContent = '0'; $('dn-judge').textContent = '';
    if (mode === 'motion') { res.motionOn = true; res.motionBuf = []; }
    $('dnTap').onpointerdown = (e) => { e.preventDefault(); taps.push(Net.now()); vib(15); };
    const ov = $('camov'), octx = ov.getContext('2d'), vid = $('cam');
    let pose = null, lastVideoTime = -1;

    function judge(j) {
      sum += PTS[j];
      $('dn-judge').textContent = JNAME(j); $('dn-judge').className = 'judge ' + j;
      const score = Math.round(sum / nM);
      $('dn-score').textContent = score;
      sendProgress({ score: score, judge: j }, true);
      vib(j === 'perfect' ? 40 : j === 'miss' ? 120 : 20);
    }
    function drawPoseCv(move) {
      const c = $('poseCv'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
      PFDraw.drawFigure(x, move, c.width / 2, c.height / 2, c.width * 0.9, '#fff', 1);
    }
    let shownK = -1;

    loop(r, (now) => {
      const until = r.startAt - now;
      const kk = Math.min(nM - 1, Math.max(0, Math.floor((now - hit(0) + spb * 0.4) / (D.every * spb))));
      if (kk !== shownK) { shownK = kk; drawPoseCv(PF.MOVES[D.moves[kk]]); }
      $('dn-info').textContent = until > 0 ? T('p.tap.in', { n: Math.ceil(until / 1000) }) : PF.nm(PF.MOVES[D.moves[kk]].name, L());

      // Kamera: Pose bestimmen
      if (mode === 'camera' && res.landmarker && vid.readyState >= 2 && vid.currentTime !== lastVideoTime) {
        lastVideoTime = vid.currentTime;
        try {
          const out = res.landmarker.detectForVideo(vid, performance.now());
          const lm = out.landmarks && out.landmarks[0];
          pose = lm ? PFDraw.classifyPose(lm) : null;
          if (ov.width !== vid.videoWidth && vid.videoWidth) { ov.width = vid.videoWidth; ov.height = vid.videoHeight; }
          octx.clearRect(0, 0, ov.width, ov.height);
          if (lm) {
            octx.strokeStyle = '#ffd166'; octx.lineWidth = 5; octx.lineCap = 'round';
            SKEL.forEach((s) => { const a = lm[s[0]], b = lm[s[1]]; if (!a || !b) return; octx.beginPath(); octx.moveTo(a.x * ov.width, a.y * ov.height); octx.lineTo(b.x * ov.width, b.y * ov.height); octx.stroke(); });
          }
        } catch (e) { /* Frame überspringen */ }
      }

      // Bewertung der anstehenden Bewegung
      if (k < nM) {
        const T = hit(k), mv = PF.MOVES[D.moves[k]];
        if (mode === 'camera') {
          if (now >= T - 0.3 * spb && now <= T + 1.0 * spb) {
            const mt = PFDraw.matchMove(pose, mv);
            if (mt >= 1 && st.firstFull == null) st.firstFull = now;
            st.best = Math.max(st.best, mt);
          }
          if (now > T + 1.0 * spb) {
            let j = 'miss';
            if (st.firstFull != null) j = st.firstFull - T <= 0.45 * spb ? 'perfect' : 'good';
            else if (st.best >= 0.5) j = 'ok';
            judge(j); k++; st.firstFull = null; st.best = 0;
          }
        } else if (mode === 'motion') {
          if (now > T + 1.25 * spb) {
            const peak = (a, b) => res.motionBuf.reduce((mx, s) => (s.t >= a && s.t <= b && s.m > mx ? s.m : mx), 0);
            const on = peak(T - 0.35 * spb, T + 0.35 * spb), off = peak(T + 0.75 * spb, T + 1.25 * spb);
            let j = 'miss';
            if (on >= 10 && on >= 1.25 * off) j = 'perfect';
            else if (on >= 6 && on >= 1.0 * off) j = 'good';
            else if (on >= 3) j = 'ok';
            judge(j); k++;
          }
        } else {
          if (now > T + 0.5 * spb) {
            let best = 1e9; taps.forEach((t) => { const d = Math.abs(t - T); if (d < best) best = d; });
            const j = best < 0.14 * spb * 2 ? 'perfect' : best < 0.3 * spb ? 'good' : best < 0.45 * spb ? 'ok' : 'miss';
            judge(j); k++;
          }
        }
      } else if (now > r.startAt + r.dur - 300) {
        const score = Math.round(sum / nM);
        sendResult(r, score, score + ' %');
        $('dn-info').textContent = T('p.d.done');
      }
    });
  }

  // ---- Singen
  function detectPitch(buf, sr, gate) {
    const n = buf.length; let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < gate) return { rms: rms, f: null };
    const minLag = Math.floor(sr / 1100), maxLag = Math.min(n >> 1, Math.floor(sr / 90));
    const nsdf = new Float32Array(maxLag + 2);
    for (let lag = 0; lag <= maxLag; lag++) {
      let acf = 0, m = 0;
      for (let i = 0; i < n - lag; i++) { const a = buf[i], b = buf[i + lag]; acf += a * b; m += a * a + b * b; }
      nsdf[lag] = m > 0 ? 2 * acf / m : 0;
    }
    let lag = 0;
    while (lag < maxLag && nsdf[lag] > 0) lag++;
    while (lag < maxLag && nsdf[lag] <= 0) lag++;
    const peaks = [];
    while (lag < maxLag) {
      let pk = lag, pv = nsdf[lag];
      while (lag < maxLag && nsdf[lag] > 0) { if (nsdf[lag] > pv) { pv = nsdf[lag]; pk = lag; } lag++; }
      if (pk >= minLag && pv > 0) peaks.push([pk, pv]);
      while (lag < maxLag && nsdf[lag] <= 0) lag++;
    }
    if (!peaks.length) return { rms: rms, f: null };
    let maxv = 0; peaks.forEach((p) => { if (p[1] > maxv) maxv = p[1]; });
    if (maxv < 0.72) return { rms: rms, f: null };
    const pick = peaks.find((p) => p[1] >= 0.9 * maxv);
    const kk = pick[0], a = nsdf[kk - 1], b = nsdf[kk], c = nsdf[kk + 1];
    const den = a - 2 * b + c; const shift = den ? 0.5 * (a - c) / den : 0;
    return { rms: rms, f: sr / (kk + (isFinite(shift) ? shift : 0)), clarity: maxv };
  }

  function runSing(r) {
    show('sing');
    const Sg = PF.SONGS[r.m.ref], spb = 60000 / Sg.bpm;
    const hasMic = !!(res.analyser && prep && prep.type === 'sing' && prep.ok);
    const notes = Sg.notes;
    let lo = 999, hi = 0; notes.forEach((n) => { lo = Math.min(lo, n.p); hi = Math.max(hi, n.p); });
    const center = Math.round((lo + hi) / 2);
    const totalMs = notes.reduce((s, n) => s + n.d * spb, 0);
    let gotMs = 0, gate = 0.015, noiseSum = 0, noiseN = 0, lastT = 0, lastShown = -1, curPitch = null;
    const buf = hasMic ? new Float32Array(res.analyser.fftSize) : null;
    const sr = hasMic ? res.audioCtx.sampleRate : 44100;
    // Textzeilen
    const lines = []; let cur = [];
    notes.forEach((n, i) => { cur.push(i); if (n.br) { lines.push(cur); cur = []; } });
    if (cur.length) lines.push(cur);
    const pc = $('pitchView'), pctx = pc.getContext('2d');
    $('sg-hint').textContent = hasMic ? T('p.s.hint') : T('p.s.nomic');
    $('sg-score').textContent = '0 %'; $('sg-meter').style.width = '0%';

    function noteAt(beat) { return notes.find((n) => beat >= n.b && beat < n.b + n.d) || null; }

    loop(r, (now) => {
      const until = r.startAt - now;
      $('sg-info').textContent = until > 0 ? T('p.tap.in', { n: Math.ceil(until / 1000) }) : '♪ ' + Sg.title;
      const beat = (now - r.startAt) / spb - Sg.lead;
      // Mikro auslesen (~25x pro Sekunde)
      if (hasMic && now - lastT >= 38) {
        const dt = lastT ? Math.min(120, now - lastT) : 38; lastT = now;
        res.analyser.getFloatTimeDomainData(buf);
        if (until > 0) {
          let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
          noiseSum += Math.sqrt(rms / buf.length); noiseN++; gate = Math.max(0.012, 2.4 * noiseSum / noiseN);
        }
        const d = detectPitch(buf, sr, gate);
        const refBeat = beat - 0.15 * 1000 / spb; // Reaktionszeit der Stimme ausgleichen
        const note = noteAt(refBeat) || noteAt(beat);
        let shown = null;
        if (d.f && d.f > 80 && d.f < 1200) {
          const midi = 69 + 12 * Math.log2(d.f / 440);
          const tp = note ? note.p : center;
          const diff = ((((midi - tp + 6) % 12) + 12) % 12) - 6;
          shown = tp + diff;
          if (note && beat >= 0) {
            const ad = Math.abs(diff);
            gotMs += dt * (ad <= 1.1 ? 1 : ad <= 2 ? 0.4 : 0);
          }
        }
        curPitch = shown;
        const score = Math.min(100, Math.round(100 * gotMs / totalMs * 1.12));
        $('sg-score').textContent = score + ' %'; $('sg-meter').style.width = score + '%';
        const out = { score: score };
        if (shown != null) { out.pitch = shown; }
        if (note) out.tgt = note.p;
        sendProgress(out);
      }
      // Textzeile
      let li = 0; lines.forEach((l, i) => { if (beat >= notes[l[0]].b - 2) li = i; });
      const sig = li + ':' + notes.filter((n) => beat >= n.b).length;
      if (sig !== lastShown) {
        lastShown = sig;
        $('sg-lyric').innerHTML = lines[li].map((ni) => { const n = notes[ni]; return '<span class="' + (beat >= n.b ? 'done' : '') + '">' + esc(n.t.replace(/-$/, '')) + '</span>' + (/-$/.test(n.t) ? '' : ' '); }).join('');
      }
      // Mini-Notenbild
      const w = pc.width, h = pc.height, nowX = w * 0.25, ppb = w * 0.09;
      pctx.clearRect(0, 0, w, h);
      const yOf = (pp) => h - 14 - (pp - (lo - 2)) / ((hi + 2) - (lo - 2)) * (h - 28);
      notes.forEach((n) => {
        const x1 = nowX + (n.b - beat) * ppb, ww = n.d * ppb - 3; if (x1 > w || x1 + ww < 0) return;
        pctx.fillStyle = beat >= n.b && beat < n.b + n.d ? '#ffd166' : 'rgba(46,196,182,.85)';
        pctx.fillRect(x1, yOf(n.p) - 9, Math.max(6, ww), 18);
      });
      pctx.fillStyle = 'rgba(255,255,255,.7)'; pctx.fillRect(nowX - 1, 0, 2, h);
      if (curPitch != null) { pctx.fillStyle = '#ff4d6d'; pctx.beginPath(); pctx.arc(nowX, Math.max(8, Math.min(h - 8, yOf(curPitch))), 9, 0, Math.PI * 2); pctx.fill(); }
      if (now > r.startAt + r.dur - 300) {
        const score = hasMic ? Math.min(100, Math.round(100 * gotMs / totalMs * 1.12)) : 0;
        sendResult(r, score, hasMic ? T('p.s.hit', { n: score }) : T('p.s.nolabel'));
        $('sg-info').textContent = T('p.s.done');
      }
    });
  }

  // ---- Ergebnis
  function showResult(m, p) {
    if (run && run.key === 'res' + m.startAt) return;
    stopRun(true);
    run = { key: 'res' + m.startAt };
    show('result');
    const row = (m.results || []).find((x) => x.id === p.id);
    const medals = ['🥇', '🥈', '🥉'];
    $('rs-rank').textContent = row ? (medals[row.rank - 1] || row.rank + '.') : '–';
    $('rs-label').textContent = row ? row.label : '';
    $('rs-coins').textContent = row ? '+' + row.coins + ' 🪙' : '';
    vib(row && row.rank === 1 ? [80, 40, 80, 40, 160] : 60);
  }

  show('join');
})();
