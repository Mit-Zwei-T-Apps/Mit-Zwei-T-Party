# Mit Zwei T Party

🇬🇧 [English version](README.md)

Ein Party-Spiel für den Fernseher/Laptop + Handys (Standardsprache **Englisch**, in der Lobby auf **Deutsch** umschaltbar): **Brettspiel wie bei Mario Party** (Münzen, Sterne, Ereignisfelder)
mit Minispielen – darunter ein **Tanz-Battle (Just-Dance-Stil)** und ein **Sing-Battle (Just-Sing-Stil)**.
Eigene Figuren, eigene Songs – keine Nintendo-/Ubisoft-Inhalte.

## Ablauf
1. Auf dem großen Bildschirm `/host.html` öffnen → Raum-Code + QR-Code erscheinen.
2. Mitspieler scannen den QR-Code (oder öffnen `/play.html` und geben den Code ein), wählen Namen und Tier.
3. Reihum würfeln, Felder: blau +3 🪙, rot −3 🪙, `?` Ereignis, ⭐ Stern kostet 10 🪙 (wandert nach dem Kauf).
4. Nach jeder Runde ein Minispiel: **Tanz**, **Sing**, **Tipp-Fieber**, **Blitzreaktion**. Platz 1/2/3 = 10/6/3 🪙, sonst 1 🪙.
5. Am Ende Bonus-Sterne für Münzkönig, Tanzkönig und Gesangsstar.

### Tanzen – 3 Erkennungsarten (jeder wählt selbst)
- **📷 Kamera**: Handy aufstellen (2–3 m Abstand, ganz im Bild). Posen werden per MediaPipe erkannt (Arme hoch/seitlich/unten, Kniebeuge).
- **📱 Bewegung**: Handy in der Hand, Bewegung im Takt (Beschleunigungssensor). Dauerschütteln bringt weniger Punkte als Bewegung im Takt.
- **👆 Tippen**: im Takt auf den Button tippen (Fallback, geht immer).

Fällt Kamera oder Sensor aus, schaltet das Handy automatisch eine Stufe zurück (Kamera → Bewegung → Tippen).

### Berechtigungen
Vor jedem Sing- oder Tanz-Minispiel zeigt das Handy ein eigenes Pop-up für Mikrofon, Kamera oder Bewegungssensor – auch wenn sich der Browser ein früheres „Zulassen“ gemerkt hat. Ablehnen ist okay: Beim Singen gibt es dann 0 Punkte, beim Tanzen wechselt es in den Tipp-Modus. Nichts wird aufgenommen oder verschickt; Ton und Bild bleiben auf dem Handy und werden nach jedem Minispiel ausgeschaltet.
Die Erlaubnis-Abfrage von Chrome selbst kann eine Webseite nicht erzwingen. Soll Chrome jedes Mal fragen: im Prompt „Diesmal zulassen“ wählen (Desktop) oder in den Website-Einstellungen Mikrofon/Kamera auf „Fragen“ stellen.

### Singen
Das Handy-Mikro erkennt die Tonhöhe (Autokorrelation, im Browser). Gewertet wird **oktavunabhängig** – man kann also auch eine Oktave tiefer/höher singen.
Songs (alle gemeinfrei bzw. mit eigenem Text) – Englisch: *Twinkle, Twinkle, Little Star*, *Mary Had a Little Lamb*, *Party Star*; Deutsch: *Alle meine Entchen*, *Hänschen klein*, *Party-Stern*. Es werden nur Songs der gewählten Sprache gespielt.
Der Begleit-Track hat absichtlich keine Melodie/keinen Bass, damit das Mikro nur die Stimme hört. Optional: „Melodie-Hilfe“ in der Lobby.

## Starten (lokal)
```bash
npm install
node server.js            # Port 3000, anderer Port: PORT=8080 node server.js
xdg-open http://localhost:3000/host.html
```
Handys im selben WLAN: Die Lobby zeigt automatisch die LAN-Adresse im QR-Code.
**Achtung:** Mikrofon, Kamera und Bewegungssensor erlauben Browser auf Handys nur über **HTTPS** (oder `localhost`).
Ohne HTTPS geht nur Beitreten, Würfeln, Tippen, Reaktion und der Tipp-Modus beim Tanzen.

## Auf dem Server / Pterodactyl
- **Am einfachsten mit dem mitgelieferten Egg:** `egg-mit-zwei-t-party.json` (liegt im Repo und an jedem GitHub-Release) im Panel unter *Admin → Nests → Import Egg* importieren, Server damit anlegen, Variablen ausfüllen, starten.
- Alternativ mit dem generischen Node.js-Egg: Node.js ≥ 18, Startbefehl `node server.js`, Port aus der Panel-Allocation (`SERVER_PORT` wird automatisch erkannt, alternativ `PORT`).
- `PUBLIC_URL=https://party.deine-domain.de` setzen, damit der QR-Code die richtige Adresse enthält.
- Optional: `MAX_PLAYERS=12` (2–16, Standard 12) legt die maximale Spielerzahl fest.
- Spieler können in der Lobby Name/Figur ändern und jederzeit verlassen. Schließt der Host die Seite, werden nach kurzer Gnadenfrist alle gekickt (Neuladen ist ok).
- Nginx als Reverse Proxy mit HTTPS (z. B. Let's Encrypt) und **WebSocket-Weiterleitung**:

```nginx
server {
    server_name party.deine-domain.de;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}
```

## Hinweise
- Die Kamera-Erkennung lädt das Pose-Modell (~5 MB) beim ersten Mal von `storage.googleapis.com`; die Bibliothek selbst liefert dein Server unter `/vendor/mediapipe`.
- Räume leben nur im Arbeitsspeicher; startet der Server neu, werden Räume geschlossen.
- Test des Spielablaufs mit Bots: `npm test` (Server wird mit `PF_FAST=1` beschleunigt gestartet).

## Struktur
```
server.js            Räume, Brettlogik, Minispiel-Ablauf (Socket.io)
public/host.*        Großer Bildschirm
public/play.*        Handy-Controller (Kamera/Sensor/Mikro)
public/songs.js      Songs, Tanz-Choreografien, Konstanten
public/i18n.js       Texte Englisch/Deutsch (neue Sprache = neuer Block im Wörterbuch)
public/audio.js      Synthesizer für Effekte + Backing-Tracks
public/common.js     Zeit-Sync, Strichmännchen, Posen-Auswertung
test/bots.js         Bot-Test des kompletten Spiels
```

Matteo Mit Zwei T, with Claude
