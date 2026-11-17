/* Texte in Englisch (Standard) und Deutsch – läuft im Browser (window.I18N) und in Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const D = {
    en: {
      title: 'Mit Zwei T Party',
      tagline: 'Board game · Dance battle · Sing battle – everyone plays with their phone',
      on: 'on', off: 'off', player: 'Player {n}',
      // Host – Lobby
      'h.fs': '⛶ Fullscreen', 'h.rounds': 'Rounds:', 'h.guide': '🎵 Melody guide: {s}', 'h.lang': 'Language:',
      'h.scan': 'Scan the QR code with your phone …', 'h.start': 'Start game',
      'h.hint': 'More fun with 2+ players · max. 8 players', 'h.room': 'Room code',
      'h.httpwarn': '⚠️ Phones only allow microphone, camera and motion sensor over <b>HTTPS</b>. For the sing and dance modes please host via an https address (see README).',
      // Host – Brett
      'h.legend': '⭐ costs {n} 🪙 · Blue +3 · Red −3 · ? Event', 'h.round': 'Round {r} / {n}', 'h.rolling': 'is rolling …',
      'h.canbuy': 'can buy a ⭐ ({n} 🪙)', 'h.nextmini': 'Next minigame …', 'h.rolls': '{name} rolls …',
      'h.starbuy': '{name} grabs a star!', 'h.roundbanner': 'Round {r} of {n}',
      // Host – Minispiele
      'h.minigame': 'MINIGAME', 'h.skip': 'Go – don\'t wait', 'h.taptitle': 'Tap, tap, tap!', 'h.getready': 'Get ready …', 'h.wait': 'Wait …',
      'h.now': 'NOW!', 'h.react.hint': 'Only tap when the screen turns green!', 'h.soon': 'starting soon!', 'h.next': 'NEXT',
      'h.result': 'Result', 'h.podium': 'PODIUM', 'h.again': 'Play again', 'h.newroom': 'New room', 'h.more': 'Next up:',
      'j.perfect': 'PERFECT!', 'j.good': 'Good!', 'j.ok': 'Okay', 'j.miss': 'Miss',
      // Handy
      'p.code': 'CODE', 'p.name': 'Your name', 'p.join': 'Join', 'p.codeerr': 'Please enter the 4-letter code.', 'p.joinfail': 'Could not join.',
      'p.in': 'You\'re in! 🎉', 'p.soon': 'The game starts soon on the big screen.', 'p.dancewith': 'How you dance:',
      'p.m.motion': '📱<br>Motion<br><small>phone in hand</small>', 'p.m.camera': '📷<br>Camera<br><small>prop up phone</small>', 'p.m.tap': '👆<br>Tap<br><small>in rhythm</small>',
      'p.mh.motion': 'Hold the phone and move in rhythm. The more rhythmic, the more points – wild constant shaking scores less!',
      'p.mh.camera': 'Prop the phone up 2–3 m away, camera facing you – your whole body must be visible. Loading takes a moment the first time.',
      'p.mh.tap': 'Tap the button in rhythm when the pose changes.',
      'p.nohttps': '⚠️ Without HTTPS the camera, microphone and motion sensor are blocked – only tap mode works for dancing, and no singing.',
      'p.yourturn': 'It\'s your turn!', 'p.roll': '🎲 Roll', 'p.buystar': '⭐ Buy a star?', 'p.cost': 'Costs {c} 🪙 – you have {n}.',
      'p.yes': 'Yes, buy!', 'p.no': 'No thanks', 'p.isturn': 'is up – watch the big screen', 'p.coming': 'Coming up …',
      'p.minigame': 'MINIGAME', 'p.rdy.sing': '🎤 Mic on – ready!', 'p.rdy.cam': '📷 Camera on – ready!', 'p.rdy': 'Ready!', 'p.loading': 'Loading …',
      'p.st.tap': 'Tap "Ready" when you\'re good to go.', 'p.st.soon': 'Starting soon …', 'p.st.ok': 'Ready! Waiting for the others …',
      'p.st.nomic': 'Microphone unavailable – you get 0 points.', 'p.st.wait': 'Waiting for the others …',
      'p.perm.mic.t': 'Allow microphone? 🎤', 'p.perm.mic.d': 'The sing battle listens to your voice through the phone microphone to rate your pitch. Nothing is recorded or sent anywhere – the audio stays on your phone and the microphone is switched off after the song.',
      'p.perm.cam.t': 'Allow camera? 📷', 'p.perm.cam.d': 'The camera is used on your phone to detect your pose while you dance. No video is saved or sent anywhere, and the camera is switched off after the dance.',
      'p.perm.motion.t': 'Allow motion sensor? 📱', 'p.perm.motion.d': 'Motion mode measures how you move the phone to the beat. The data stays on your phone.',
      'p.perm.allow': 'Allow', 'p.perm.deny': 'No thanks',
      'p.tap': 'TAP!', 'p.tap.in': 'Starting in {n} …', 'p.tap.go': 'TAP! {n} s left', 'p.done': 'Done!', 'p.taps': '{n} taps',
      'p.r.round': 'Round {r} / {n}', 'p.r.wait': 'Wait …', 'p.r.soon': 'Soon …', 'p.r.early': 'Too early!', 'p.r.now': 'NOW!', 'p.r.avg': 'Ø {n} ms',
      'p.d.cam': 'Copy the pose – your arms and legs are tracked.', 'p.d.motion': 'Move the phone in rhythm when the pose changes.', 'p.d.tap': 'Tap in rhythm when the pose changes.',
      'p.d.tapbtn': 'TAP in time!', 'p.d.done': 'Done! 🎉',
      'p.s.hint': 'Sing the melody – any pitch works, an octave lower or higher is fine too.', 'p.s.nomic': '⚠️ No microphone – you get 0 points.',
      'p.s.hit': '{n} % hit', 'p.s.nolabel': 'no microphone', 'p.s.done': 'Done! 🎤',
      'p.result': 'YOUR RESULT', 'p.look': 'Look at the big screen …', 'p.over': 'Game over!', 'p.thanks': 'Thanks for playing! 🎉',
      'p.host': '📺 Host a game', 'p.hostsub': 'on TV / laptop', 'p.play': '📱 Join a game', 'p.playsub': 'join with your phone',
      // Server
      's.noroom': 'Room not found – check the code.', 's.running': 'The game is already running.', 's.full': 'The room is full.',
      's.plus3': '+3 coins', 's.minus3': '−3 coins', 's.nothing': 'Bad luck – but nothing to lose',
      's.plus5': 'Lucky strike: +5 coins!', 's.minus5': 'Pickpocket: −5 coins!', 's.rain': 'Coin rain: everyone gets +2!', 's.swap': 'Coin swap with {name}!', 's.tele': 'Teleport to the star space!',
      's.none': 'no score', 's.away': 'away',
      'm.tap.t': 'Tap Fever', 'm.tap.d': 'Tap your button as fast as you can – for 10 seconds!',
      'm.reaction.t': 'Lightning Reflexes', 'm.reaction.d': 'Wait for the signal, then tap as fast as you can. Too early = penalty! (3 rounds)',
      'm.dance.t': 'Dance Battle', 'm.dance.d': 'Copy the poses on screen – in time with the music!',
      'm.sing.t': 'Sing Battle', 'm.sing.d': 'Sing the melody into your phone mic. The closer you hit the notes, the more points!',
      'b.coins.t': 'Coin King', 'b.coins.d': 'Most coins', 'b.dance.t': 'Dance King', 'b.dance.d': 'Best total dance score', 'b.sing.t': 'Singing Star', 'b.sing.d': 'Best total singing score'
    },
    de: {
      title: 'Mit Zwei T Party',
      tagline: 'Brettspiel · Tanz-Battle · Sing-Battle – alle spielen mit dem Handy mit',
      on: 'an', off: 'aus', player: 'Spieler {n}',
      'h.fs': '⛶ Vollbild', 'h.rounds': 'Runden:', 'h.guide': '🎵 Melodie-Hilfe: {s}', 'h.lang': 'Sprache:',
      'h.scan': 'Scanne den QR-Code mit dem Handy …', 'h.start': 'Spiel starten',
      'h.hint': 'Ab 2 Spielern macht es am meisten Spaß · maximal 8 Spieler', 'h.room': 'Raum-Code',
      'h.httpwarn': '⚠️ Mikrofon, Kamera und Bewegungssensor funktionieren auf Handys nur über <b>HTTPS</b>. Für Sing- und Tanz-Modus bitte per https-Adresse hosten (siehe README).',
      'h.legend': '⭐ kostet {n} 🪙 · Blau +3 · Rot −3 · ? Ereignis', 'h.round': 'Runde {r} / {n}', 'h.rolling': 'würfelt …',
      'h.canbuy': 'kann einen ⭐ kaufen ({n} 🪙)', 'h.nextmini': 'Nächstes Minispiel …', 'h.rolls': '{name} würfelt …',
      'h.starbuy': '{name} holt sich einen Stern!', 'h.roundbanner': 'Runde {r} von {n}',
      'h.minigame': 'MINISPIEL', 'h.skip': 'Los – ohne Warten', 'h.taptitle': 'Tippen, tippen, tippen!', 'h.getready': 'Bereit …', 'h.wait': 'Warte …',
      'h.now': 'JETZT!', 'h.react.hint': 'Tippe erst, wenn der Bildschirm grün wird!', 'h.soon': 'gleich geht\'s los!', 'h.next': 'DANACH',
      'h.result': 'Ergebnis', 'h.podium': 'SIEGEREHRUNG', 'h.again': 'Nochmal spielen', 'h.newroom': 'Neuer Raum', 'h.more': 'Weiter:',
      'j.perfect': 'PERFEKT!', 'j.good': 'Gut!', 'j.ok': 'Okay', 'j.miss': 'Daneben',
      'p.code': 'CODE', 'p.name': 'Dein Name', 'p.join': 'Beitreten', 'p.codeerr': 'Bitte den 4-stelligen Code eingeben.', 'p.joinfail': 'Beitritt fehlgeschlagen.',
      'p.in': 'Du bist drin! 🎉', 'p.soon': 'Gleich startet das Spiel auf dem großen Bildschirm.', 'p.dancewith': 'So tanzt du mit:',
      'p.m.motion': '📱<br>Bewegung<br><small>Handy in der Hand</small>', 'p.m.camera': '📷<br>Kamera<br><small>Handy aufstellen</small>', 'p.m.tap': '👆<br>Tippen<br><small>im Takt</small>',
      'p.mh.motion': 'Handy in die Hand und im Takt bewegen. Je rhythmischer, desto mehr Punkte – wildes Dauer-Schütteln bringt weniger!',
      'p.mh.camera': 'Handy 2–3 m entfernt aufstellen, Kamera auf dich richten – du musst ganz zu sehen sein. Beim ersten Mal lädt die Erkennung kurz.',
      'p.mh.tap': 'Tippe im Takt auf den Button, wenn die Pose wechselt.',
      'p.nohttps': '⚠️ Ohne HTTPS sind Kamera, Mikrofon und Bewegungssensor gesperrt – beim Tanzen geht nur der Tipp-Modus, Singen nicht.',
      'p.yourturn': 'Du bist dran!', 'p.roll': '🎲 Würfeln', 'p.buystar': '⭐ Stern kaufen?', 'p.cost': 'Kostet {c} 🪙 – du hast {n}.',
      'p.yes': 'Ja, kaufen!', 'p.no': 'Nein, danke', 'p.isturn': 'ist dran – schau auf den großen Bildschirm', 'p.coming': 'Gleich geht\'s weiter …',
      'p.minigame': 'MINISPIEL', 'p.rdy.sing': '🎤 Mikro an – bereit!', 'p.rdy.cam': '📷 Kamera an – bereit!', 'p.rdy': 'Bereit!', 'p.loading': 'Lade …',
      'p.st.tap': 'Tippe auf „Bereit“, sobald du loslegen kannst.', 'p.st.soon': 'Gleich geht\'s los …', 'p.st.ok': 'Bereit! Warte auf die anderen …',
      'p.st.nomic': 'Mikrofon nicht verfügbar – du bekommst 0 Punkte.', 'p.st.wait': 'Warte auf die anderen …',
      'p.perm.mic.t': 'Mikrofon erlauben? 🎤', 'p.perm.mic.d': 'Das Sing-Battle hört deine Stimme über das Handy-Mikrofon, um deine Tonhöhe zu bewerten. Nichts wird aufgenommen oder verschickt – der Ton bleibt auf deinem Handy und das Mikrofon wird nach dem Song ausgeschaltet.',
      'p.perm.cam.t': 'Kamera erlauben? 📷', 'p.perm.cam.d': 'Die Kamera erkennt auf deinem Handy deine Pose beim Tanzen. Es wird kein Video gespeichert oder verschickt, und die Kamera wird nach dem Tanz ausgeschaltet.',
      'p.perm.motion.t': 'Bewegungssensor erlauben? 📱', 'p.perm.motion.d': 'Der Bewegungs-Modus misst, wie du das Handy im Takt bewegst. Die Daten bleiben auf deinem Handy.',
      'p.perm.allow': 'Erlauben', 'p.perm.deny': 'Nein danke',
      'p.tap': 'TIPP!', 'p.tap.in': 'Los geht\'s in {n} …', 'p.tap.go': 'TIPPEN! Noch {n} s', 'p.done': 'Fertig!', 'p.taps': '{n} Taps',
      'p.r.round': 'Runde {r} / {n}', 'p.r.wait': 'Warte …', 'p.r.soon': 'Gleich …', 'p.r.early': 'Zu früh!', 'p.r.now': 'JETZT!', 'p.r.avg': 'Ø {n} ms',
      'p.d.cam': 'Mach die Pose nach – deine Arme und Beine werden erkannt.', 'p.d.motion': 'Bewege das Handy im Takt, wenn die Pose wechselt.', 'p.d.tap': 'Tippe im Takt, wenn die Pose wechselt.',
      'p.d.tapbtn': 'TIPP im Takt!', 'p.d.done': 'Fertig! 🎉',
      'p.s.hint': 'Singe die Melodie – egal in welcher Tonlage, auch eine Oktave tiefer ist okay.', 'p.s.nomic': '⚠️ Kein Mikrofon – du bekommst 0 Punkte.',
      'p.s.hit': '{n} % getroffen', 'p.s.nolabel': 'kein Mikrofon', 'p.s.done': 'Fertig! 🎤',
      'p.result': 'DEIN ERGEBNIS', 'p.look': 'Schau auf den großen Bildschirm …', 'p.over': 'Spiel vorbei!', 'p.thanks': 'Danke fürs Mitspielen! 🎉',
      'p.host': '📺 Spiel hosten', 'p.hostsub': 'auf Fernseher / Laptop', 'p.play': '📱 Mitspielen', 'p.playsub': 'mit dem Handy beitreten',
      's.noroom': 'Raum nicht gefunden – Code prüfen.', 's.running': 'Das Spiel läuft schon.', 's.full': 'Der Raum ist voll.',
      's.plus3': '+3 Münzen', 's.minus3': '−3 Münzen', 's.nothing': 'Pech gehabt – aber nichts zu verlieren',
      's.plus5': 'Glückstreffer: +5 Münzen!', 's.minus5': 'Taschendieb: −5 Münzen!', 's.rain': 'Münzregen: Alle bekommen +2!', 's.swap': 'Münz-Tausch mit {name}!', 's.tele': 'Teleport zum Stern-Feld!',
      's.none': 'keine Wertung', 's.away': 'abwesend',
      'm.tap.t': 'Tipp-Fieber', 'm.tap.d': 'Tippe so schnell du kannst auf deinen Button – 10 Sekunden lang!',
      'm.reaction.t': 'Blitzreaktion', 'm.reaction.d': 'Warte auf das Signal und tippe dann blitzschnell. Zu früh getippt = Strafe! (3 Runden)',
      'm.dance.t': 'Tanz-Battle', 'm.dance.d': 'Mach die Posen nach, die auf dem Bildschirm erscheinen – im Takt der Musik!',
      'm.sing.t': 'Sing-Battle', 'm.sing.d': 'Sing die Melodie ins Handy-Mikro. Je besser du den Ton triffst, desto mehr Punkte!',
      'b.coins.t': 'Münzkönig', 'b.coins.d': 'Die meisten Münzen', 'b.dance.t': 'Tanzkönig', 'b.dance.d': 'Beste Tanz-Gesamtwertung', 'b.sing.t': 'Gesangsstar', 'b.sing.d': 'Beste Sing-Gesamtwertung'
    }
  };
  function t(lang, key, vars) {
    let s = D[lang] && D[lang][key] != null ? D[lang][key] : (D.en[key] != null ? D.en[key] : key);
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  // data-i18n / data-i18n-html / data-i18n-ph in einem DOM-Teilbaum anwenden
  function apply(rootEl, lang) {
    if (typeof document === 'undefined') return;
    rootEl.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(lang, e.dataset.i18n); });
    rootEl.querySelectorAll('[data-i18n-html]').forEach(function (e) { e.innerHTML = t(lang, e.dataset.i18nHtml); });
    rootEl.querySelectorAll('[data-i18n-ph]').forEach(function (e) { e.placeholder = t(lang, e.dataset.i18nPh); });
    document.documentElement.lang = lang;
    document.title = t(lang, 'title');
  }
  return { D: D, t: t, apply: apply };
});
