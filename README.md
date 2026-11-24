<p align="center"><img src="ki-round.png" alt="Knockout Isles" width="140"></p>
<h1 align="center">🏝️ Knockout Isles</h1>
<p align="center">A 20-player party brawler by <b>Ninebolt Studios</b>. Punch, dash and smash everyone off crumbling floating islands. Free in your browser on iPhone, iPad, Android and PC.</p>

<p align="center"><b><a href="https://ninebolt-studios.github.io/Knockout-Isles/">▶ PLAY NOW</a></b></p>

- 📲 **App (iPhone/iPad):** https://ninebolt-studios.github.io/Knockout-Isles/KnockoutIsles.mobileconfig
- 🌐 **Ninebolt Studios:** https://ninebolt-studios.github.io/Ninebolt-Studios-Website/

## How to play
| | |
|---|---|
| 🏝️ **Goal** | Knock everyone off the island. **Last Isle Standing**: 1 life, last one wins. **KO Frenzy**: 2 minutes, respawns, most knockouts wins |
| 👊 **Punch** | Tap to jab (3-hit combo). **Hold** to charge a SMASH (you can keep holding at max power) |
| 💨 **Dash** | Shove rivals, dodge, and dash again in mid-air to save yourself |
| 📈 **Damage %** | The higher your %, the further you fly |
| 🎁 **Crates** | 💣 bomb · 🍄 mega size · 👟 speed boots · 🛡️ shield · 🔨 hammer (3 smashes) |
| ⚠️ **Crumbling** | Red tiles are about to fall. Get to the middle! |

**Controls:** WASD / arrows to move, J / Space / click to punch, K / Shift to dash · Controller: stick, Ⓐ punch, Ⓑ dash · Touch: joystick + PUNCH + DASH

## Features
- 👥 **Up to 20 players**: quick play against bots, or host a room and share the 4-letter code (empty spots fill with bots)
- 🏝️ 3 islands: **Palm Cove**, **Magma Isle**, **Sky Reef**; the island grows with the number of players
- 🎩 Locker: 12 colours and 9 hats to unlock with coins
- ☁️ Accounts: same login as Ashfall and Boltrush, progress from every device is merged, nothing is ever lost
- 🎓 Tutorial with a training dummy
- ⚙️ Settings (sound, camera, touch button size, graphics, name tags, screen shake) and 🎁 gift codes
- 📲 Installs as an app, works offline against bots

## 🗂️ How the code is organised
- `index.html`: just the page layout (menus, HUD, buttons). It loads everything else
- `js/game.js`: the whole game in JavaScript (three.js 3D engine)
- `css/style.css`: all the styling
- `sw.js`: offline support so the game works without internet
- `tools/release.py`: Python release helper. It checks the scripts and bumps the version stamps, which also triggers the in-game auto-updater for everyone (`python3 tools/release.py`)

## Updates
| Version | What's new |
|---|---|
| **v2.3** | **Your SMASH charge stays when you get hit.** Jabs, dashes and bumps no longer wipe your charge, and if you let go while you're stunned the full-power smash fires the moment you recover. **Settings fix:** sound, camera and button size options now work properly (they were saving the wrong value) and any broken settings repair themselves. **Runs smoother:** lighter shadows, and the game switches to Fast graphics by itself if your device struggles mid-match |
| **v2.2** | **Auto-updater** (like Ashfall): when a new version comes out, the game updates itself the next time you're in the menu (never in the middle of a match or online room) and says "✨ Updated to the newest version!" |
| **v2.1** | **Real JavaScript project:** the game code now lives in `js/game.js` and the styling in `css/style.css` instead of being packed into one HTML page, plus a Python release tool (`tools/release.py`). Same game, it just loads from proper files |
| **v2** | **Faster!** (about 40% quicker movement, snappier dashes and punches, rounds about 30% shorter), a **2-minute tutorial** with a training dummy (◎ 250 the first time), **hold at max SMASH power** as long as you like, **new character models** (shiny bean bodies with outlines, boxing gloves, sneakers that walk, blinking eyes, angry eyebrows when charging, rosy cheeks, an 'O' mouth when hit), a ☁️ **Sign in** button at the top of the menu, and How to play in the pause menu |
| **v1** | First release: Last Isle Standing + KO Frenzy, 3 islands, up to 20 players online or vs bots, crates, hats, accounts, app |
