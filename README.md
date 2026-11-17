# Mit Zwei T Party

🇩🇪 [Deutsche Version](README.de.md)

A party game for a TV/laptop plus phones: a **Mario-Party-style board game** (coins, stars, event spaces) with minigames,
including a **dance battle (Just Dance style)** and a **sing battle (Just Sing style)**.
Original characters and songs – no Nintendo or Ubisoft content. English is the default language; switch to German in the lobby.

## How it plays
1. Open `/host.html` on the big screen → a room code and a QR code appear.
2. Players scan the QR code (or open `/play.html` and type the code), pick a name and an animal.
3. Take turns rolling the dice. Spaces: blue +3 🪙, red −3 🪙, `?` event, ⭐ star costs 10 🪙 (it moves after each purchase).
4. After every round there is a minigame: **Dance**, **Sing**, **Tap Fever** or **Lightning Reflexes**. 1st/2nd/3rd place = 10/6/3 🪙, everyone else 1 🪙.
5. At the end there are bonus stars for Coin King, Dance King and Singing Star.

### Dancing – 3 ways to play (everyone picks their own)
- **📷 Camera**: prop up the phone 2–3 m away with your whole body in view. Poses are detected with MediaPipe (arms up/out/down, squat).
- **📱 Motion**: hold the phone and move in rhythm (accelerometer). Constant wild shaking scores less than moving on the beat.
- **👆 Tap**: tap the button in rhythm (always works as a fallback).

If the camera or the sensor is unavailable, the phone automatically falls back one step (camera → motion → tap).

### Singing
The phone microphone detects your pitch (autocorrelation, in the browser). Scoring is **octave-independent**, so singing an octave lower or higher is fine.
Songs (all public domain, or original lyrics) – English: *Twinkle, Twinkle, Little Star*, *Mary Had a Little Lamb*, *Party Star*; German: *Alle meine Entchen*, *Hänschen klein*, *Party-Stern*. Only songs of the selected language are played.
The backing track deliberately has no melody and no bass so the microphone hears only the voice. Optional: "Melody guide" in the lobby.

## Run locally
```bash
npm install
node server.js            # port 3000, other port: PORT=8080 node server.js
```
Then open `http://localhost:3000/host.html`. Phones on the same Wi-Fi: the lobby shows the LAN address in the QR code.
**Note:** phone browsers only allow microphone, camera and motion sensor over **HTTPS** (or `localhost`).
Without HTTPS, joining, rolling, tapping, reaction and tap-mode dancing still work, but singing does not.

## Deploy with Pterodactyl
**Easiest: use the included egg.** Download `egg-mit-zwei-t-party.json` (it is in the repo and attached to every GitHub release), then in the panel go to *Admin → Nests → Import Egg* and import it. Create a server with that egg, give it a port allocation, fill in the variables below and start it. The server reads `SERVER_PORT` automatically (or `PORT`).

**Alternative: generic Node.js egg.**
1. Create a server with the generic **Node.js** egg and give it a port allocation.
2. Egg variables:
   - **Git Repo Address**: `https://github.com/Mit-Zwei-T-Apps/Mit-Zwei-T-Party` (for a private repo also set the username and an access token)
   - **Install Branch**: `main`
   - **Auto Update**: `1` (a restart pulls the latest version)
   - **JS file**: `server.js`
   - **Custom environment variables**: `PUBLIC_URL=https://party.your-domain.com` (so the QR code contains the right address)
3. Start the server. Dependencies are installed from `package.json` on start.
4. Put Nginx in front with HTTPS and **WebSocket forwarding** (set `proxy_pass` to your server's IP and allocated port):

```nginx
server {
    server_name party.your-domain.com;
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

Then get a certificate with `sudo certbot --nginx -d party.your-domain.com`.

## Notes
- The camera detection downloads the pose model (~5 MB) from `storage.googleapis.com` on first use; the library itself is served by your server under `/vendor/mediapipe`.
- Rooms live in memory only; when the server restarts, rooms are closed.
- Test the whole game flow with bots: `npm test` (starts the server in fast mode with `PF_FAST=1`).
- Adding a language: add a new block to `public/i18n.js` and songs with `lang: 'xx'` to `public/songs.js`.

## Structure
```
server.js            rooms, board logic, minigame flow (Socket.io)
public/host.*        big screen
public/play.*        phone controller (camera / sensor / microphone)
public/songs.js      songs, dance choreographies, constants
public/i18n.js       texts in English / German
egg-mit-zwei-t-party.json   Pterodactyl egg (import in the panel)
public/audio.js      synthesizer for effects and backing tracks
public/common.js     time sync, stick figures, pose evaluation
test/bots.js         bot test of the whole game
```

Matteo Mit Zwei T, with Claude
