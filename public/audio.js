/* Kleiner WebAudio-Synth: Soundeffekte + Backing-Tracks (läuft auf dem Host-Bildschirm). */
(function () {
  let ctx = null, master = null, noiseBuf = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(t, freq, dur, type, vol, opts) {
    if (!ctx) return;
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(opts.dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, hp, dest) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function kick(t, v, dest) { tone(t, 150, 0.16, 'sine', v, { slideTo: 42, dest: dest }); }
  function snare(t, v, dest) { noise(t, 0.12, v, 1800, dest); tone(t, 210, 0.08, 'triangle', v * 0.5, { dest: dest }); }
  function hat(t, v, dest) { noise(t, 0.04, v, 7000, dest); }

  const SFX = {
    roll: (t) => { for (let i = 0; i < 6; i++) tone(t + i * 0.07, 300 + Math.random() * 500, 0.06, 'square', 0.07); },
    step: (t) => tone(t, 520, 0.07, 'triangle', 0.12),
    coin: (t) => { tone(t, 988, 0.08, 'square', 0.09); tone(t + 0.08, 1319, 0.22, 'square', 0.09); },
    bad: (t) => { tone(t, 220, 0.25, 'sawtooth', 0.1, { slideTo: 110 }); },
    star: (t) => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(t + i * 0.09, f, 0.25, 'square', 0.09)); },
    win: (t) => { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.14, f, 0.3, 'triangle', 0.14)); },
    tick: (t) => tone(t, 880, 0.08, 'square', 0.08),
    go: (t) => tone(t, 1320, 0.3, 'square', 0.1),
    ok: (t) => tone(t, 700, 0.08, 'triangle', 0.1)
  };
  function sfx(name, delaySec) {
    if (!init() || !SFX[name]) return;
    SFX[name](ctx.currentTime + (delaySec || 0.01));
  }

  // Backing-Track. opts: {startInMs, bpm, beats, lead, kind:'dance'|'sing', melody:[{b,d,p}], guide:bool}
  function playTrack(opts) {
    if (!init()) return { stop: function () {} };
    const spb = 60 / opts.bpm;
    const t0 = ctx.currentTime + Math.max(0.05, opts.startInMs / 1000);
    const bus = ctx.createGain();
    bus.gain.value = opts.kind === 'sing' ? 0.45 : 0.9;
    bus.connect(master);
    const roots = opts.kind === 'sing' ? [48, 48, 43, 48] : [45, 41, 48, 43]; // je 1 Takt (4 Beats)
    for (let b = 0; b < opts.beats; b++) {
      const t = t0 + b * spb;
      if (b < opts.lead) { tone(t, b % 4 === 0 ? 1320 : 990, 0.07, 'square', 0.1, { dest: bus }); continue; }
      const bar = Math.floor(b / 4) % 4, inBar = b % 4;
      if (opts.kind === 'dance') {
        kick(t, 0.9, bus);
        if (inBar === 1 || inBar === 3) snare(t, 0.35, bus);
        hat(t + spb / 2, 0.16, bus); hat(t, 0.07, bus);
        tone(t, mtof(roots[bar]), spb * 0.45, 'sawtooth', 0.12, { dest: bus });
        tone(t + spb / 2, mtof(roots[bar] + 12), spb * 0.35, 'sawtooth', 0.08, { dest: bus });
        if (inBar === 0) [0, 4, 7].forEach((iv) => tone(t, mtof(roots[bar] + 24 + iv), spb * 1.6, 'triangle', 0.05, { dest: bus }));
      } else {
        if (inBar === 0 || inBar === 2) kick(t, 0.6, bus);
        if (inBar === 1 || inBar === 3) snare(t, 0.22, bus);
        hat(t + spb / 2, 0.1, bus);
        // bewusst kein Bass/keine Melodie: das Handy-Mikro soll nur die Stimme hören
      }
    }
    if (opts.guide && opts.melody) {
      opts.melody.forEach((n) => tone(t0 + (opts.lead + n.b) * spb, mtof(n.p), n.d * spb * 0.95, 'sine', 0.12, { dest: bus }));
    }
    return {
      stop: function () {
        try { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setValueAtTime(bus.gain.value, ctx.currentTime); bus.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25); } catch (e) {}
      }
    };
  }

  window.Sfx = { init: init, sfx: sfx, playTrack: playTrack, mtof: mtof };
})();
