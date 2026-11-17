'use strict';
/* Mit Zwei T Party – server: rooms, board game flow, minigame rotation.
 * Start: npm install && node server.js   (port via PORT environment variable, default 3000)
 */
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const PF = require('./public/songs.js');
const I18N = require('./public/i18n.js');
const tr = (room, key, vars) => I18N.t(room.settings.lang, key, vars);

const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT, 10) || 3000; // SERVER_PORT = Pterodactyl allocation
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
const BOARD_SIZE = 28;
const STAR_COST = 10;
const MAX_PLAYERS = 8;
const TIMING = Object.assign({ stepMs: 420, effectMs: 1800, introMs: 6000, resultMs: 7000 },
  process.env.PF_FAST ? { stepMs: 5, effectMs: 20, introMs: 50, resultMs: 50 } : {});

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 8000, pingTimeout: 12000 });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor/mediapipe', express.static(path.join(__dirname, 'node_modules/@mediapipe/tasks-vision')));

app.get('/api/info', (req, res) => {
  const lan = [];
  const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach((n) => ifs[n].forEach((i) => {
    if (i.family === 'IPv4' && !i.internal) lan.push('http://' + i.address + ':' + PORT);
  }));
  res.json({ publicUrl: PUBLIC_URL, lan });
});
app.get('/api/qr', async (req, res) => {
  try {
    const text = String(req.query.text || '').slice(0, 300);
    const buf = await QRCode.toBuffer(text, { margin: 1, width: 360, color: { dark: '#14102b', light: '#ffffff' } });
    res.type('png').send(buf);
  } catch (e) { res.status(400).end(); }
});

// ---------------------------------------------------------------- Hilfsfunktionen
const rooms = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (n) => Math.floor(Math.random() * n);
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[rnd(a.length)]; }

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (;;) {
    let c = '';
    for (let i = 0; i < 4; i++) c += letters[rnd(letters.length)];
    if (!rooms.has(c)) return c;
  }
}
function makeBoard() {
  const b = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (i === 0) { b.push('start'); continue; }
    const r = Math.random();
    b.push(r < 0.52 ? 'blue' : r < 0.74 ? 'red' : 'event');
  }
  return b;
}
function createRoom(hostSocketId) {
  const room = {
    code: newCode(), hostKey: crypto.randomBytes(8).toString('hex'), hostSocketId, hostSeen: Date.now(),
    players: [], phase: 'lobby', settings: { rounds: 8, melodyGuide: false, lang: 'en' },
    board: [], starPos: 0, round: 0, turnId: null, prompt: null, mini: null,
    waiters: {}, miniQueue: [], lastSong: null, lastDance: null, dead: false, running: false, results: {}, ready: new Set()
  };
  rooms.set(room.code, room);
  return room;
}
function pub(p) {
  return { id: p.id, name: p.name, avatar: p.avatar, color: p.color, coins: p.coins, stars: p.stars, pos: p.pos, connected: p.connected, mode: p.mode };
}
function publicState(room) {
  return {
    code: room.code, phase: room.phase, round: room.round, rounds: room.settings.rounds, settings: room.settings,
    players: room.players.map(pub), board: room.board, starPos: room.starPos, turnId: room.turnId,
    prompt: room.prompt, mini: room.mini, starCost: STAR_COST
  };
}
function emitState(room) { io.to(room.code).emit('state', publicState(room)); }
function emitAll(room, ev, data) { io.to(room.code).emit(ev, data); }
function playerById(room, id) { return room.players.find((p) => p.id === id); }
function connectedPlayers(room) { return room.players.filter((p) => p.connected); }

function waitFor(room, key, ms) {
  return new Promise((resolve) => {
    const t = setTimeout(() => { delete room.waiters[key]; resolve(undefined); }, ms);
    room.waiters[key] = (v) => { clearTimeout(t); delete room.waiters[key]; resolve(v); };
  });
}
function resolveWait(room, key, v) { if (room.waiters[key]) room.waiters[key](v); }
function skipAll(room) { Object.keys(room.waiters).forEach((k) => room.waiters[k](undefined)); }

// ---------------------------------------------------------------- Spielablauf
async function runGame(room) {
  if (room.running) return;
  room.running = true;
  room.board = makeBoard();
  room.starPos = 10 + rnd(10);
  room.players.forEach((p) => { p.coins = 10; p.stars = 0; p.pos = 0; p.stats = { dance: 0, sing: 0 }; });
  room.miniQueue = [];
  try {
    for (room.round = 1; room.round <= room.settings.rounds; room.round++) {
      room.phase = 'board';
      room.mini = null;
      emitAll(room, 'round', { round: room.round, rounds: room.settings.rounds });
      emitState(room);
      await sleep(TIMING.effectMs);
      for (const p of room.players.slice()) {
        if (room.dead) return;
        await playerTurn(room, p);
      }
      if (room.dead) return;
      await runMinigame(room);
      if (room.dead) return;
    }
    await finale(room);
  } finally {
    room.running = false;
  }
}

async function playerTurn(room, p) {
  room.phase = 'board';
  room.turnId = p.id;
  room.prompt = { type: 'roll', playerId: p.id };
  emitState(room);
  await waitFor(room, 'roll', p.connected ? 30000 : 1800);
  if (room.dead) return;
  room.prompt = null;
  const roll = 1 + rnd(6);
  emitAll(room, 'board:roll', { playerId: p.id, roll });
  emitState(room);
  await sleep(TIMING.effectMs * 0.6);
  await movePlayer(room, p, roll);
  if (room.dead) return;
  await tileEffect(room, p);
  room.turnId = null;
  emitState(room);
}

async function movePlayer(room, p, steps) {
  for (let i = 0; i < steps; i++) {
    p.pos = (p.pos + 1) % BOARD_SIZE;
    emitAll(room, 'board:step', { playerId: p.id, pos: p.pos });
    emitState(room);
    await sleep(TIMING.stepMs);
    if (p.pos === room.starPos && p.coins >= STAR_COST) await offerStar(room, p);
  }
  await sleep(TIMING.stepMs);
}

async function offerStar(room, p) {
  room.prompt = { type: 'buyStar', playerId: p.id, cost: STAR_COST };
  emitState(room);
  const yes = await waitFor(room, 'choice', p.connected ? 14000 : 1200);
  room.prompt = null;
  if (yes === false) { emitState(room); return; }
  p.coins -= STAR_COST;
  p.stars += 1;
  const old = room.starPos;
  do { room.starPos = 1 + rnd(BOARD_SIZE - 1); } while (room.starPos === old);
  emitAll(room, 'board:star', { playerId: p.id, newPos: room.starPos });
  emitState(room);
  await sleep(TIMING.effectMs);
}

async function tileEffect(room, p) {
  if (p.pos === room.starPos) return; // Stern-Feld hat keinen Feld-Effekt
  const type = room.board[p.pos];
  let text = '', delta = 0, kind = type;
  if (type === 'blue') { delta = 3; p.coins += 3; text = tr(room, 's.plus3'); }
  else if (type === 'red') { delta = -Math.min(3, p.coins); p.coins += delta; text = delta ? tr(room, 's.minus3') : tr(room, 's.nothing'); }
  else if (type === 'event') {
    const others = room.players.filter((o) => o.id !== p.id);
    const options = ['plus5', 'minus5', 'rain', 'star'];
    if (others.length) options.push('swap');
    const ev = pick(options);
    kind = 'event';
    if (ev === 'plus5') { p.coins += 5; delta = 5; text = tr(room, 's.plus5'); }
    else if (ev === 'minus5') { delta = -Math.min(5, p.coins); p.coins += delta; text = tr(room, 's.minus5'); }
    else if (ev === 'rain') { room.players.forEach((o) => { o.coins += 2; }); text = tr(room, 's.rain'); }
    else if (ev === 'swap') {
      const o = pick(others); const t = p.coins; p.coins = o.coins; o.coins = t;
      text = tr(room, 's.swap', { name: o.name });
    } else if (ev === 'star') {
      p.pos = room.starPos; text = tr(room, 's.tele');
      emitAll(room, 'board:teleport', { playerId: p.id, pos: p.pos });
    }
  } else { text = ''; }
  if (text) {
    emitAll(room, 'board:effect', { playerId: p.id, kind, text, delta });
    emitState(room);
    await sleep(TIMING.effectMs);
  }
  if (type === 'event' && p.pos === room.starPos && p.coins >= STAR_COST) await offerStar(room, p);
}

// ---------------------------------------------------------------- Minispiele
const MINI_INFO = (room, type) => ({ title: tr(room, 'm.' + type + '.t'), desc: tr(room, 'm.' + type + '.d') });

function nextMiniType(room) {
  if (!room.miniQueue.length) {
    let q = shuffle(['dance', 'sing', 'tap', 'dance', 'sing', 'reaction']);
    if (room.lastMini && q[0] === room.lastMini) { q.push(q.shift()); }
    room.miniQueue = q;
  }
  const t = room.miniQueue.shift();
  room.lastMini = t;
  return t;
}
function pickRef(room, type) {
  if (type === 'sing') {
    const ids = Object.keys(PF.SONGS).filter((i) => i !== room.lastSong && PF.SONGS[i].lang === room.settings.lang);
    room.lastSong = pick(ids); return room.lastSong;
  }
  if (type === 'dance') {
    const ids = Object.keys(PF.DANCES).filter((i) => i !== room.lastDance);
    room.lastDance = pick(ids); return room.lastDance;
  }
  return null;
}

async function runMinigame(room) {
  const type = nextMiniType(room);
  const ref = pickRef(room, type);
  const info = MINI_INFO(room, type);
  room.phase = 'minigame';
  room.turnId = null;
  room.results = {};
  room.ready = new Set();
  const needReady = type === 'dance' || type === 'sing';
  room.mini = { type, title: info.title, desc: info.desc, ref, step: 'intro', needReady };
  if (type === 'sing') room.mini.refTitle = PF.SONGS[ref].title;
  if (type === 'dance') room.mini.refTitle = PF.nm(PF.DANCES[ref].title, room.settings.lang);
  emitState(room);
  emitAll(room, 'mini:intro', room.mini);

  if (needReady) {
    if (connectedPlayers(room).length) await waitFor(room, 'ready', 35000);
  } else {
    await sleep(TIMING.introMs);
  }
  if (room.dead) return;

  let durationMs;
  let goTimes;
  const startAt = Date.now() + (process.env.PF_FAST ? 100 : 4500);
  if (type === 'tap') durationMs = 10000;
  else if (type === 'dance') durationMs = PF.danceMs(PF.DANCES[ref]);
  else if (type === 'sing') durationMs = PF.songMs(PF.SONGS[ref]);
  else {
    goTimes = [];
    let t = startAt + 500;
    for (let i = 0; i < 3; i++) { t += 2200 + rnd(2800); goTimes.push(t); t += 1600; }
    durationMs = t - startAt;
  }
  room.mini = Object.assign({}, room.mini, { step: 'play', startAt, durationMs, goTimes });
  emitState(room);
  emitAll(room, 'mini:start', room.mini);

  const wait = Math.max(0, startAt + durationMs - Date.now()) + (process.env.PF_FAST ? 800 : 9000);
  await waitFor(room, 'results', wait);
  if (room.dead) return;

  // Auswertung
  const rows = room.players.map((p) => {
    const r = room.results[p.id];
    return { id: p.id, score: r ? Math.max(0, Math.round(r.score)) : 0, label: r ? String(r.label || '') : (p.connected ? tr(room, 's.none') : tr(room, 's.away')) };
  }).sort((a, b) => b.score - a.score);
  let rank = 0, prev = null;
  rows.forEach((r, i) => { if (r.score !== prev) { rank = i + 1; prev = r.score; } r.rank = rank; r.coins = rank === 1 ? 10 : rank === 2 ? 6 : rank === 3 ? 3 : 1; });
  rows.forEach((r) => {
    const p = playerById(room, r.id);
    if (!p) return;
    p.coins += r.coins;
    if (type === 'dance') p.stats.dance += r.score;
    if (type === 'sing') p.stats.sing += r.score;
  });
  room.mini = Object.assign({}, room.mini, { step: 'results', results: rows });
  emitState(room);
  emitAll(room, 'mini:end', { type, results: rows });
  await sleep(TIMING.resultMs);
  room.mini = null;
}

async function finale(room) {
  room.phase = 'finale';
  room.mini = null; room.turnId = null; room.prompt = null;
  const bonus = [];
  function top(title, desc, key) {
    const vals = room.players.map((p) => key(p));
    const max = Math.max.apply(null, vals);
    if (!(max > 0)) return;
    const ids = room.players.filter((p) => key(p) === max).map((p) => p.id);
    ids.forEach((id) => { playerById(room, id).stars += 1; });
    bonus.push({ title, desc, playerIds: ids });
  }
  top(tr(room, 'b.coins.t'), tr(room, 'b.coins.d'), (p) => p.coins);
  top(tr(room, 'b.dance.t'), tr(room, 'b.dance.d'), (p) => p.stats.dance);
  top(tr(room, 'b.sing.t'), tr(room, 'b.sing.d'), (p) => p.stats.sing);
  const ranking = room.players.slice().sort((a, b) => b.stars - a.stars || b.coins - a.coins).map(pub);
  room.phase = 'finished';
  emitState(room);
  emitAll(room, 'game:end', { ranking, bonus });
}

// ---------------------------------------------------------------- Sockets
function sanitizeName(s) { return String(s || '').replace(/[<>&"']/g, '').trim().slice(0, 14); }

io.on('connection', (socket) => {
  socket.on('time', (cb) => { if (typeof cb === 'function') cb(Date.now()); });

  // ---- Host
  socket.on('host:create', (cb) => {
    const room = createRoom(socket.id);
    socket.join(room.code);
    socket.data = { role: 'host', code: room.code };
    cb && cb({ ok: true, code: room.code, hostKey: room.hostKey });
    emitState(room);
  });
  socket.on('host:resume', (d, cb) => {
    const room = d && rooms.get(String(d.code));
    if (!room || room.hostKey !== d.hostKey) return cb && cb({ ok: false });
    room.hostSocketId = socket.id; room.hostSeen = Date.now();
    socket.join(room.code);
    socket.data = { role: 'host', code: room.code };
    cb && cb({ ok: true, code: room.code, hostKey: room.hostKey });
    socket.emit('state', publicState(room));
  });
  function hostRoom() {
    if (!socket.data || socket.data.role !== 'host') return null;
    return rooms.get(socket.data.code) || null;
  }
  socket.on('host:settings', (s) => {
    const room = hostRoom(); if (!room || room.phase !== 'lobby' || !s) return;
    if ([4, 6, 8, 10, 12].includes(s.rounds)) room.settings.rounds = s.rounds;
    if (typeof s.melodyGuide === 'boolean') room.settings.melodyGuide = s.melodyGuide;
    if (s.lang === 'en' || s.lang === 'de') room.settings.lang = s.lang;
    emitState(room);
  });
  socket.on('host:start', () => {
    const room = hostRoom(); if (!room || room.phase !== 'lobby' || !room.players.length) return;
    room.phase = 'board';
    runGame(room).catch((e) => console.error('Spielfehler', e));
  });
  socket.on('host:skip', () => { const room = hostRoom(); if (room) skipAll(room); });
  socket.on('host:kick', (id) => {
    const room = hostRoom(); if (!room || room.phase !== 'lobby') return;
    const i = room.players.findIndex((p) => p.id === id);
    if (i >= 0) { const sid = room.players[i].socketId; room.players.splice(i, 1); if (sid) io.to(sid).emit('kicked'); emitState(room); }
  });
  socket.on('host:again', () => {
    const room = hostRoom(); if (!room || room.phase !== 'finished') return;
    room.phase = 'lobby'; room.round = 0; room.mini = null; room.prompt = null; room.turnId = null;
    room.players = room.players.filter((p) => p.connected);
    room.players.forEach((p) => { p.coins = 10; p.stars = 0; p.pos = 0; });
    emitState(room);
  });

  // ---- Spieler
  socket.on('join', (d, cb) => {
    cb = typeof cb === 'function' ? cb : () => {};
    d = d || {};
    const room = rooms.get(String(d.code || '').toUpperCase().trim());
    if (!room) return cb({ ok: false, error: I18N.t(d.lang === 'de' ? 'de' : 'en', 's.noroom') });
    let p = d.playerId ? playerById(room, String(d.playerId)) : null;
    if (p) {
      p.socketId = socket.id; p.connected = true;
    } else {
      if (room.phase !== 'lobby') return cb({ ok: false, error: tr(room, 's.running') });
      if (room.players.length >= MAX_PLAYERS) return cb({ ok: false, error: tr(room, 's.full') });
      const name = sanitizeName(d.name) || tr(room, 'player', { n: room.players.length + 1 });
      const taken = room.players.map((x) => x.avatar);
      const avatar = PF.AVATARS.includes(d.avatar) && !taken.includes(d.avatar) ? d.avatar : PF.AVATARS.find((a) => !taken.includes(a));
      const usedColors = room.players.map((x) => x.color);
      const color = PF.COLORS.find((c) => !usedColors.includes(c)) || PF.COLORS[0];
      p = { id: crypto.randomBytes(6).toString('hex'), name, avatar, color, socketId: socket.id, connected: true, coins: 10, stars: 0, pos: 0, stats: { dance: 0, sing: 0 }, mode: 'motion' };
      room.players.push(p);
    }
    socket.join(room.code);
    socket.data = { role: 'player', code: room.code, playerId: p.id };
    cb({ ok: true, playerId: p.id, code: room.code });
    emitState(room);
  });
  function ctx() {
    if (!socket.data || socket.data.role !== 'player') return {};
    const room = rooms.get(socket.data.code);
    return { room, p: room && playerById(room, socket.data.playerId) };
  }
  socket.on('player:mode', (m) => {
    const { room, p } = ctx(); if (!p) return;
    if (['camera', 'motion', 'tap'].includes(m)) { p.mode = m; emitState(room); }
  });
  socket.on('player:roll', () => {
    const { room, p } = ctx(); if (!p) return;
    if (room.prompt && room.prompt.type === 'roll' && room.prompt.playerId === p.id) resolveWait(room, 'roll', true);
  });
  socket.on('player:choice', (v) => {
    const { room, p } = ctx(); if (!p) return;
    if (room.prompt && room.prompt.type === 'buyStar' && room.prompt.playerId === p.id) resolveWait(room, 'choice', !!v);
  });
  socket.on('mini:ready', (d) => {
    const { room, p } = ctx(); if (!p || !room.mini || room.mini.step !== 'intro') return;
    room.ready.add(p.id);
    io.to(room.hostSocketId).emit('mini:ready', { id: p.id, ok: !!(d && d.ok), mode: d && d.mode });
    if (connectedPlayers(room).every((x) => room.ready.has(x.id))) resolveWait(room, 'ready', true);
  });
  socket.on('mini:progress', (d) => {
    const { room, p } = ctx(); if (!p || !room.mini || !d) return;
    const out = { id: p.id };
    ['score', 'pitch', 'tgt', 'n'].forEach((k) => { if (typeof d[k] === 'number' && isFinite(d[k])) out[k] = d[k]; });
    if (typeof d.judge === 'string') out.judge = d.judge.slice(0, 12);
    io.to(room.hostSocketId).emit('mini:progress', out);
  });
  socket.on('mini:result', (d) => {
    const { room, p } = ctx(); if (!p || !room.mini || room.mini.step !== 'play' || !d) return;
    const score = Number(d.score);
    if (!isFinite(score)) return;
    room.results[p.id] = { score: Math.min(score, 100000), label: String(d.label || '').slice(0, 40) };
    if (connectedPlayers(room).every((x) => room.results[x.id])) resolveWait(room, 'results', true);
  });

  socket.on('disconnect', () => {
    const d = socket.data; if (!d) return;
    const room = rooms.get(d.code); if (!room) return;
    if (d.role === 'host') {
      if (room.hostSocketId === socket.id) room.hostSeen = Date.now();
      return;
    }
    const p = playerById(room, d.playerId);
    if (!p || p.socketId !== socket.id) return;
    p.connected = false;
    emitState(room);
    // Wartende Schritte nicht blockieren lassen
    if (room.phase === 'minigame' && room.mini) {
      if (room.mini.step === 'intro' && connectedPlayers(room).every((x) => room.ready.has(x.id))) resolveWait(room, 'ready', true);
      if (room.mini.step === 'play' && connectedPlayers(room).every((x) => room.results[x.id])) resolveWait(room, 'results', true);
    }
    if (room.phase === 'lobby') {
      setTimeout(() => {
        if (!p.connected && room.phase === 'lobby') { room.players = room.players.filter((x) => x !== p); emitState(room); }
      }, 20000);
    }
  });
});

// Verwaiste Räume aufräumen
setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, code) => {
    const hostGone = !io.sockets.sockets.has(room.hostSocketId);
    if (hostGone && now - room.hostSeen > 10 * 60 * 1000) { room.dead = true; skipAll(room); rooms.delete(code); }
  });
}, 60 * 1000);

if (require.main === module) {
  server.listen(PORT, () => console.log('Mit Zwei T Party running on port ' + PORT));
}
module.exports = { server, io, rooms };
