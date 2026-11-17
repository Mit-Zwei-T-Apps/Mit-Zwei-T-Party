/* Gemeinsame Helfer: Zeit-Synchronisation, Strichmännchen, Posen-Auswertung. */
(function () {
  const Net = {
    offset: 0, // Serverzeit = Date.now() + offset
    now: function () { return Date.now() + Net.offset; },
    sync: function (socket, n) {
      n = n || 8;
      return new Promise(function (resolve) {
        const samples = [];
        let left = n;
        function one() {
          const t0 = Date.now();
          socket.emit('time', function (ts) {
            const t1 = Date.now();
            samples.push({ rtt: t1 - t0, off: ts + (t1 - t0) / 2 - t1 });
            if (--left > 0) setTimeout(one, 60);
            else {
              samples.sort(function (a, b) { return a.rtt - b.rtt; });
              Net.offset = samples[0].off;
              resolve(samples[0]);
            }
          });
        }
        one();
      });
    }
  };

  // Strichmännchen. move: {l,r,sq}. Bildschirm-links = 'l' (Spiegel-Ansicht).
  function drawFigure(ctx, move, cx, cy, s, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, s * 0.045);
    const sq = !!(move && move.sq);
    const neckY = cy - s * 0.27, hipY = cy + s * (sq ? 0.14 : 0.06);
    ctx.beginPath(); ctx.arc(cx, cy - s * 0.37, s * 0.085, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, neckY); ctx.lineTo(cx, hipY); ctx.stroke();
    // Beine
    ctx.beginPath();
    if (sq) {
      ctx.moveTo(cx, hipY); ctx.lineTo(cx - s * 0.16, hipY + s * 0.05); ctx.lineTo(cx - s * 0.1, cy + s * 0.4);
      ctx.moveTo(cx, hipY); ctx.lineTo(cx + s * 0.16, hipY + s * 0.05); ctx.lineTo(cx + s * 0.1, cy + s * 0.4);
    } else {
      ctx.moveTo(cx, hipY); ctx.lineTo(cx - s * 0.08, cy + s * 0.4);
      ctx.moveTo(cx, hipY); ctx.lineTo(cx + s * 0.08, cy + s * 0.4);
    }
    ctx.stroke();
    // Arme
    function arm(side, state) {
      const sx = cx + side * s * 0.05, sy = neckY + s * 0.03;
      let ex, ey;
      if (state === 'up') { ex = sx + side * s * 0.1; ey = sy - s * 0.3; }
      else if (state === 'side') { ex = sx + side * s * 0.33; ey = sy; }
      else { ex = sx + side * s * 0.09; ey = sy + s * 0.3; }
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    }
    arm(-1, move ? move.l : 'down'); arm(1, move ? move.r : 'down');
    ctx.restore();
  }

  // MediaPipe-Landmarks -> {l,r,sq}  (l/r = linke/rechte Körperseite der Person)
  function armState(sh, wr) {
    if (!sh || !wr || (sh.visibility != null && sh.visibility < 0.4) || (wr.visibility != null && wr.visibility < 0.4)) return null;
    const dx = Math.abs(wr.x - sh.x), dy = wr.y - sh.y;
    const ang = Math.atan2(-dy, Math.max(dx, 1e-4)) * 180 / Math.PI;
    return ang > 38 ? 'up' : ang < -38 ? 'down' : 'side';
  }
  function classifyPose(lm) {
    if (!lm) return null;
    const out = { l: armState(lm[11], lm[15]), r: armState(lm[12], lm[16]), sq: null };
    const sh = lm[11] && lm[12], hp = lm[23] && lm[24], kn = lm[25] && lm[26];
    if (sh && hp && kn) {
      const shY = (lm[11].y + lm[12].y) / 2, hipY = (lm[23].y + lm[24].y) / 2, knY = (lm[25].y + lm[26].y) / 2;
      const torso = Math.max(0.05, hipY - shY);
      const vis = Math.min(lm[23].visibility == null ? 1 : lm[23].visibility, lm[25].visibility == null ? 1 : lm[25].visibility);
      out.sq = vis > 0.4 ? (knY - hipY) / torso < 0.62 : null;
    }
    return out;
  }
  // 0..1: wie gut passt die erkannte Pose zur geforderten Bewegung
  function matchMove(pose, move) {
    if (!pose) return 0;
    if (move.sq) return pose.sq ? 1 : 0;
    let ok = 0;
    if (pose.l === move.l) ok++;
    if (pose.r === move.r) ok++;
    return ok / 2;
  }

  window.Net = Net;
  window.PFDraw = { drawFigure: drawFigure, classifyPose: classifyPose, matchMove: matchMove };
})();
