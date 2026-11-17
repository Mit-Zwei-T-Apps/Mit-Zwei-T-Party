/* Songs, Choreografien und Spiel-Konstanten – läuft im Browser (window.PF) und in Node (require).
 * Alle Melodien sind gemeinfrei (Volkslieder / Mozart-Thema), "Party-Stern" hat eigenen Text. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PF = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  // Hilfsfunktion: Noten aus kompakter Schreibweise bauen.
  // Eintrag: [Silbe, MIDI, Dauer in Beats, Zeilenende?]; Startzeit ergibt sich fortlaufend.
  function build(list) {
    let b = 0;
    return list.map(function (n) {
      const note = { b: b, d: n[2], p: n[1], t: n[0], br: !!n[3] };
      b += n[2];
      return note;
    });
  }
  const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69;

  // Twinkle-Melodie (gemeinfrei): 6 Zeilen à 7 Silben
  const TW = [[60,60,67,67,69,69,67],[65,65,64,64,62,62,60],[67,67,65,65,64,64,62],[67,67,65,65,64,64,62],[60,60,67,67,69,69,67],[65,65,64,64,62,62,60]];
  function twinkle(lines) {
    const list = [];
    lines.forEach(function (l, i) { l.forEach(function (syl, j) { list.push([syl, TW[i][j], j === 6 ? 2 : 1, j === 6]); }); });
    return build(list);
  }

  const SONGS = {
    twinkle: {
      id: 'twinkle', lang: 'en', title: 'Twinkle, Twinkle, Little Star', info: 'Traditional', bpm: 100, lead: 4,
      notes: twinkle([
        ['Twin-', 'kle', 'twin-', 'kle', 'lit-', 'tle', 'star'],
        ['How', 'I', 'won-', 'der', 'what', 'you', 'are'],
        ['Up', 'a-', 'bove', 'the', 'world', 'so', 'high'],
        ['Like', 'a', 'dia-', 'mond', 'in', 'the', 'sky'],
        ['Twin-', 'kle', 'twin-', 'kle', 'lit-', 'tle', 'star'],
        ['How', 'I', 'won-', 'der', 'what', 'you', 'are']
      ])
    },
    mary: {
      id: 'mary', lang: 'en', title: 'Mary Had a Little Lamb', info: 'Traditional', bpm: 112, lead: 4,
      notes: build([
        ['Ma-', E, 1], ['ry', D, 1], ['had', C, 1], ['a', D, 1], ['lit-', E, 1], ['tle', E, 1], ['lamb', E, 2, 1],
        ['lit-', D, 1], ['tle', D, 1], ['lamb', D, 2], ['lit-', E, 1], ['tle', G, 1], ['lamb', G, 2, 1],
        ['Ma-', E, 1], ['ry', D, 1], ['had', C, 1], ['a', D, 1], ['lit-', E, 1], ['tle', E, 1], ['lamb', E, 1, 1],
        ['its', E, 1], ['fleece', D, 1], ['was', D, 1], ['white', E, 1], ['as', D, 1], ['snow', C, 4, 1]
      ])
    },
    partystar: {
      id: 'partystar', lang: 'en', title: 'Party Star', info: 'Mozart melody, original lyrics', bpm: 100, lead: 4,
      notes: twinkle([
        ["Let's", 'get', 'read-', 'y', 'par-', 'ty', 'time'],
        ['Dance', 'and', 'sing', 'and', 'roll', 'the', 'dice'],
        ['Win', 'a', 'star', 'and', 'win', 'it', 'twice'],
        ['Ev-', "'ry-", 'bod-', "y's", 'gon-', 'na', 'shine'],
        ['Bring', 'the', 'mu-', 'sic', 'bring', 'the', 'fun'],
        ['Par-', 'ty', 'fe-', 'ver', 'ev-', "'ry-", 'one']
      ])
    },

    entchen: {
      id: 'entchen', lang: 'de', title: 'Alle meine Entchen', info: 'Volkslied', bpm: 96, lead: 4,
      notes: build([
        ['Al-', C, 1], ['le', D, 1], ['mei-', E, 1], ['ne', F, 1], ['Ent-', G, 2], ['chen', G, 2, 1],
        ['schwim-', A, 1], ['men', A, 1], ['auf', A, 1], ['dem', A, 1], ['See', G, 4, 1],
        ['schwim-', A, 1], ['men', A, 1], ['auf', A, 1], ['dem', A, 1], ['See', G, 4, 1],
        ['Köpf-', F, 1], ['chen', F, 1], ['in', F, 1], ['das', F, 1], ['Was-', E, 2], ['ser', E, 2, 1],
        ['Schwänz-', D, 1], ['chen', D, 1], ['in', D, 1], ['die', D, 1], ['Höh', C, 4, 1]
      ])
    },
    haenschen: {
      id: 'haenschen', lang: 'de', title: 'Hänschen klein', info: 'Volkslied', bpm: 108, lead: 4,
      notes: build([
        ['Häns-', G, 1], ['chen', E, 1], ['klein', E, 2],
        ['ging', F, 1], ['al-', D, 1], ['lein', D, 2, 1],
        ['in', C, 1], ['die', D, 1], ['wei-', E, 1], ['te', F, 1],
        ['Welt', G, 1], ['hin-', G, 1], ['ein', G, 2, 1],
        ['Stock', G, 1], ['und', E, 1], ['Hut', E, 2],
        ['steht', F, 1], ['ihm', D, 1], ['gut', D, 2, 1],
        ['ist', C, 1], ['gar', E, 1], ['wohl-', G, 1], ['ge-', G, 1],
        ['mut', C, 4, 1]
      ])
    },
    partystern: {
      id: 'partystern', lang: 'de', title: 'Party-Stern', info: 'Mozart-Melodie, eigener Text', bpm: 100, lead: 4,
      notes: build([
        ['Heu-', C, 1], ['te', C, 1], ['geht', G, 1], ['die', G, 1], ['Par-', A, 1], ['ty', A, 1], ['los', G, 2, 1],
        ['Jetzt', F, 1], ['wird', F, 1], ['ge-', E, 1], ['tanzt', E, 1], ['und', D, 1], ['ge-', D, 1], ['lacht', C, 2, 1],
        ['Ster-', G, 1], ['ne', G, 1], ['ho-', F, 1], ['len', F, 1], ['ist', E, 1], ['mein', E, 1], ['Ziel', D, 2, 1],
        ['Wer', G, 1], ['am', G, 1], ['bes-', F, 1], ['ten', F, 1], ['tanzt', E, 1], ['ge-', E, 1], ['winnt', D, 2, 1],
        ['Her', C, 1], ['mit', C, 1], ['Mu-', G, 1], ['sik', G, 1], ['her', A, 1], ['mit', A, 1], ['Spaß', G, 2, 1],
        ['Lau-', F, 1], ['ter', F, 1], ['lau-', E, 1], ['ter', E, 1], ['Par-', D, 1], ['ty-', D, 1], ['nacht', C, 2, 1]
      ])
    }
  };

  // Tanzbewegungen: l / r = Zustand des linken/rechten Arms der tanzenden Person
  // ('up' hoch, 'side' seitlich, 'down' unten); sq = Kniebeuge verlangt.
  const MOVES = {
    rest:   { name: { en: 'Relax', de: 'Locker' },          l: 'down', r: 'down' },
    armsUp: { name: { en: 'Hands up!', de: 'Hände hoch!' },     l: 'up',   r: 'up' },
    lUp:    { name: { en: 'Left up', de: 'Links hoch' },      l: 'up',   r: 'down' },
    rUp:    { name: { en: 'Right up', de: 'Rechts hoch' },     l: 'down', r: 'up' },
    tpose:  { name: { en: 'T-pose', de: 'T-Pose' },          l: 'side', r: 'side' },
    lSide:  { name: { en: 'Left out', de: 'Links seitlich' },  l: 'side', r: 'down' },
    rSide:  { name: { en: 'Right out', de: 'Rechts seitlich' }, l: 'down', r: 'side' },
    lUpRS:  { name: { en: 'Left up, right out', de: 'Links hoch, rechts seitlich' }, l: 'up', r: 'side' },
    rUpLS:  { name: { en: 'Right up, left out', de: 'Rechts hoch, links seitlich' }, l: 'side', r: 'up' },
    squat:  { name: { en: 'Squat!', de: 'Kniebeuge!' },      l: 'down', r: 'down', sq: true }
  };

  const DANCES = {
    disco: {
      id: 'disco', title: { en: 'Disco Fever', de: 'Disco-Fieber' }, bpm: 118, lead: 4, every: 2,
      moves: ['armsUp', 'tpose', 'lUp', 'rUp', 'armsUp', 'lSide', 'rSide', 'tpose',
              'lUpRS', 'rUpLS', 'armsUp', 'squat', 'lUp', 'rUp', 'tpose', 'armsUp']
    },
    robo: {
      id: 'robo', title: { en: 'Robo Groove', de: 'Robo-Groove' }, bpm: 104, lead: 4, every: 2,
      moves: ['tpose', 'lSide', 'rSide', 'armsUp', 'squat', 'lUp', 'lUpRS', 'rUp',
              'rUpLS', 'tpose', 'armsUp', 'squat', 'lSide', 'rSide', 'lUp', 'armsUp']
    }
  };

  function nm(o, lang) { return typeof o === 'string' ? o : (o[lang] || o.en); }
  function songBeats(song) {
    const last = song.notes[song.notes.length - 1];
    return song.lead + last.b + last.d + 2; // Lead-in + Song + 2 Beats Nachlauf
  }
  function danceBeats(dance) { return dance.lead + dance.moves.length * dance.every + 2; }
  function songMs(song) { return Math.round(songBeats(song) * 60000 / song.bpm); }
  function danceMs(dance) { return Math.round(danceBeats(dance) * 60000 / dance.bpm); }

  const AVATARS = ['🦊', '🐸', '🐙', '🦄', '🐼', '🐯', '🦖', '🐧', '🐝', '🦉', '🐳', '🦋'];
  const COLORS = ['#ff4d6d', '#ffb703', '#2ec4b6', '#8338ec', '#3a86ff', '#fb5607', '#06d6a0', '#f72585'];

  return {
    nm: nm, SONGS: SONGS, MOVES: MOVES, DANCES: DANCES, AVATARS: AVATARS, COLORS: COLORS,
    songBeats: songBeats, danceBeats: danceBeats, songMs: songMs, danceMs: danceMs
  };
});
