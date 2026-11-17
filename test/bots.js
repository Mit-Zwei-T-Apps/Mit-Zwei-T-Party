// Full game run with bots (host + 3 players); start the server with PF_FAST=1
const { io } = require('socket.io-client');
const URL = 'http://localhost:' + (process.env.PORT || 3999);
const log = (...a) => console.log(...a);
const host = io(URL), seen = { events: {}, phases: new Set() };
let code, S;
const bots = [];
function bump(k) { seen.events[k] = (seen.events[k] || 0) + 1; }
['board:roll', 'board:step', 'board:effect', 'board:star', 'board:teleport', 'mini:intro', 'mini:start', 'mini:end', 'game:end', 'round'].forEach((e) => host.on(e, (d) => { bump(e); if (e === 'mini:end') seen.last = d; if (e === 'game:end') { seen.end = d; } }));
host.on('state', (s) => { S = s; seen.phases.add(s.phase); if (s.mini && s.mini.refTitle) seen.refs = (seen.refs || new Set()).add(s.mini.refTitle); });
host.on('connect', () => host.emit('host:create', (r) => {
  code = r.code; log('Room', code, 'lang', process.env.PF_LANG || 'en');
  host.emit('host:settings', { rounds: 4, lang: process.env.PF_LANG || 'en' });
  let joined = 0;
  const NAMES = ['Anna','Ben','Cleo','Dana','Emil','Fiona','Gero','Hanna','Ivo','Jule','Karl','Lena','Max','Nora','Otto','Pia'].slice(0, parseInt(process.env.PF_BOTS || '3', 10));
  NAMES.forEach((n, i) => {
    const s = io(URL); const bot = { s, n, id: null };
    s.on('connect', () => s.emit('join', { code, name: n }, (rr) => {
      if (!rr.ok) throw new Error(rr.error); bot.id = rr.playerId; if (++joined === NAMES.length) setTimeout(() => host.emit('host:start'), 200);
    }));
    s.on('state', (st) => {
      if (st.prompt && st.prompt.playerId === bot.id) {
        if (st.prompt.type === 'roll') s.emit('player:roll');
        if (st.prompt.type === 'buyStar') s.emit('player:choice', true);
      }
      if (st.phase === 'minigame' && st.mini && st.mini.step === 'intro' && st.mini.needReady && !bot['r' + st.round]) { bot['r' + st.round] = 1; s.emit('mini:ready', { ok: true, mode: 'tap' }); }
      if (st.phase === 'minigame' && st.mini && st.mini.step === 'play' && !bot['p' + st.round]) {
        bot['p' + st.round] = 1;
        s.emit('mini:progress', { score: 10, judge: 'good', pitch: 62.4, tgt: 62 });
        setTimeout(() => s.emit('mini:result', { score: Math.round(Math.random() * 100), label: 'bot' }), 30);
      }
    });
    bots.push(bot);
  });
}));
const t0 = Date.now();
const iv = setInterval(() => {
  if (seen.end) {
    clearInterval(iv);
    log('Phases:', [...seen.phases].join(','));
    log('Events:', JSON.stringify(seen.events));
    log('Ranking:', seen.end.ranking.map((p) => p.name + ' ⭐' + p.stars + ' 🪙' + p.coins).join(' | '));
    log('Refs:', [...(seen.refs || [])].join(' | '));
    log('Bonus:', JSON.stringify(seen.end.bonus.map((b) => b.title)));
    const ok = seen.events['mini:end'] === 4 && seen.events['round'] === 4;
    log(ok ? 'TEST OK' : 'TEST FAILED'); process.exit(ok ? 0 : 1);
  }
  if (Date.now() - t0 > 60000) { log('TIMEOUT', S && S.phase, S && S.round, S && S.mini && S.mini.step); process.exit(2); }
}, 200);
