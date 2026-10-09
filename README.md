# Foundry Cellphone

An immersive in-game cellphone interface for modern Foundry VTT campaigns.

Version **2.11.0** adds three more Arcade games: **Checkers**, **Blackjack**, and **Solitaire**.

## Cellphone apps

- **Messages** — Party Chat, custom groups, player DMs, NPC texting, typing indicators, calls, and in-phone message deletion/moderation.
- **Mission Log** — GM-managed assignments and briefings with all-player or selected-player visibility.
- **Friendpage** — in-world social media with user/NPC profiles, walls, posts, comments, plus Like/Dislike reactions on posts and comments.
- **Browser** — GM-configured external website shortcuts plus permission-aware Foundry Journal search inside the phone.
- **Notes** — private per-user notes with title/body editing and deletion.
- **News** — GM-authored headline feed with blurb, publisher, author, and publication date/time.
- **Arcade** — Snake, Tic Tac Toe, Minesweeper, Runner, Face Flap, Guess My Number, Stack It, Block Drop, Chess, Farkle, Demon Run, Brick Breaker, Paddle Duel, Dig Deep, Checkers, Blackjack, and Solitaire.
- **Maps** — GM-managed reference maps with character markers and player visibility controls.
- **Mondo Rides** — GM-controlled downtime Scene travel presented as an in-world ride-share app.
- **Music** — streaming-style now-playing view with client-only personal Music and Environment volume controls.
- **Pocket Pet** — hatch and care for a personal virtual pet whose needs change over real elapsed time.
- **Paint** — a personal drawing canvas with brush, eraser, colors, brush sizing, clear, and automatic saving.
- **Settings** — per-user phone resizing from 60% to 150%, automatic proportional text scaling, and an optional independent text-size control.

## Messages

Cellphone messages can be deleted directly from their message bubble. Players may delete messages they authored; GMs may delete any cellphone message visible to them. Deletion removes the underlying cellphone message record, so the message disappears for everyone in that conversation rather than only being hidden locally. Existing privacy rules are unchanged: a GM does not gain access to player-to-player conversations that were not already visible to that GM.

## Mondo Rides

Mondo Rides turns GM-approved Foundry Scenes into player-selectable downtime destinations. The app is styled like a generic ride-share service and shows every destination currently enabled by the GM.

GMs receive **Manage Destinations**, which lists the world's Scenes with simple on/off switches. Enabling a Scene immediately adds it to Mondo Rides; disabling it immediately removes it from player phones. No Mondo-specific copy of the Scene is created.

When a player requests a ride, the module sends the request through the Foundry module socket to the connected active GM and validates that the destination is still enabled. On Foundry v13 and v14, the GM client uses Foundry's player-specific Scene pull API so only the requesting user changes Scene; other players remain where they are and the destination is not globally activated. Foundry v14 Scene Levels remain under Foundry's normal scene-view behavior when a user is pulled to a destination.

On Foundry v12, where that core player-specific method is not available on `Scene`, the module falls back to GM-approved client-side Scene viewing. For that fallback, the destination Scene must already be accessible to the player through Foundry's Scene permissions.

The app uses Scene thumbnails/background artwork when available and never moves Tokens between Scenes; it changes only the requesting user's viewed Scene.

## Maps

Open the cellphone and choose **Maps**. Players see only maps available to their Foundry user. Use the previous/next controls to cycle through available maps and **Open Large** to inspect the map in a larger dedicated overlay window over Foundry.

### GM map management

GMs receive a **Manage Maps** button. Each map supports:

- Map name
- Background image selected through the Foundry file picker or entered as a file path
- Visibility to **All Players** or **Selected Players**
- Multiple player-character and NPC Actor markers
- Drag-and-drop marker placement directly on the map
- Optional custom marker labels
- Reordering maps with move-up/move-down controls
- Editing and deletion

Marker coordinates are stored as percentages, so positions remain proportional when the map is displayed at different sizes. The same character can appear independently on multiple maps.

Restricted maps use Foundry ChatMessage whisper recipients so players who are not assigned are not recipients of the map record. Maps are module-owned internal records and are suppressed from the normal Foundry chat feed.

**Maps are reference information only.** Moving a Maps marker does not move any token on a Foundry Scene.

## Browser

The Browser app uses a generic in-world browser interface. GMs can configure named external shortcut tiles; clicking one opens the configured HTTP/HTTPS page in the user's real browser in a new tab.

The search field searches Foundry Journal text pages the current user has permission to observe. Results and Journal content open inside the cellphone interface. Secret Journal sections are excluded from search indexing for users who do not own the page/entry.

## Friendpage

Friendpage provides a public in-world social feed. GMs can enable Foundry user profiles and unassigned NPC Actor profiles. Players post as their own active profile; GMs receive a **Posting as** selector for enabled NPC identities.

Posts support comments, Likes, Dislikes, profile navigation, and posts on another profile's wall. Individual comments also support Like and Dislike reactions. Reactions are tracked per Friendpage profile, allowing multiple NPC identities controlled by the same GM to react independently.

## Notes

Notes are private to the current Foundry user inside the module interface. Notes persist in the Foundry world as self-whispered module records and are hidden from the normal chat feed. They are intended for private in-game note taking, not encrypted storage from the server administrator.

## News

The News app is a read-only feed for players. GMs can publish, edit, and delete stories containing a headline, short blurb, publisher, author, and custom publication date/time.

## Arcade

The Arcade includes seventeen lightweight games:

- **Snake** — keyboard/WASD and on-screen controls, pause/resume, local best score.
- **Tic Tac Toe** — play against a simple phone AI with local win/loss/draw stats.
- **Minesweeper** — 8×8 board, 10 mines, first-click safety, Flag Mode/right-click flagging.
- **Face Flap** — a flappy-style obstacle game using the bundled custom face image as the flying character, with local best-score tracking.
- **Runner** — generic endless jump-and-dodge game with keyboard/tap controls and local best distance.
- **Guess My Number** — guess a number from 1–100 with Too high / Too low feedback.
- **Stack It** — time moving blocks to build the tallest tower possible; overhang is trimmed and a complete miss ends the run. Supports tap/click, Space/Enter, pause/resume, and a local best score.
- **Block Drop** — a classic falling-block puzzle with seven block shapes, row clearing, increasing speed, keyboard/on-screen controls, hard drop, pause/resume, and local best score.
- **Chess** — play White against a lightweight phone AI with legal move validation, check, checkmate, stalemate, captures, and automatic queen promotion. Arcade Chess intentionally omits castling and en passant.
- **Farkle** — a quick first-to-3000 dice game against the phone with selectable scoring dice, banking, hot dice, farkles, common combination scoring, and local win/loss stats.
- **Demon Run** — an original compact retro first-person shooter with three ray-cast levels, creatures, health/ammo pickups, shooting, exits, touch controls, and keyboard controls.
- **Brick Breaker** — a simple breakout-style paddle-and-bricks game with lives and a local best score.
- **Paddle Duel** — a single-player pong-style match against the phone, first to five points.
- **Dig Deep** — a turn-based dig-and-pump underground action game with tunnels, roaming creatures, and scoring.
- **Checkers** — play against the phone with mandatory captures, multi-jumps, king promotion, and local win/loss tracking.
- **Blackjack** — play standard hit/stand blackjack against a dealer with blackjack, bust, push, and local result tracking.
- **Solitaire** — one-card-draw Klondike with stock/waste, seven tableau columns, four suit foundations, card flipping, selectable runs, and local win/best-move tracking.

Snake, Runner, Face Flap, Stack It, Block Drop, Demon Run, Brick Breaker, and Paddle Duel automatically pause when appropriate, including when leaving Arcade or closing the phone.

## Music

The Music app provides a generic streaming-player presentation for Foundry's native Playlist system. It shows the currently playing track and playlist, displays additional simultaneously playing tracks when present, and updates when Foundry playlist playback changes.

The **Your Music Volume** slider controls Foundry's client-side global Playlist volume setting. The **Your Environment Volume** slider controls Foundry's client-side Ambient volume setting for Scene environmental sounds. Both controls affect only the current user's listening level and include mute/restore buttons. Playback remains under normal Foundry/GM control; the app does not add player skip, pause, or track-selection permissions.

## Pocket Pet

The **Pocket Pet** app is a lightweight virtual pet. On first use, the player names and hatches a creature. The pet tracks **Fullness, Happiness, Energy, Cleanliness, and Health**. Those needs continue to change based on real elapsed time even while the phone is closed. Players can Feed, Play, Clean, and put the pet to Sleep or Wake it. The app also tracks the pet's age and changes its mood/message based on its current needs.

Pocket Pet data is stored as a client-scoped module setting keyed to the current Foundry user ID, matching the personal/local behavior used by Arcade statistics and phone appearance settings. It is gameplay flavor rather than a GM-facing campaign system.

## Paint

The **Paint** app provides a personal 240×300 drawing canvas inside the phone. Players can switch between Brush and Eraser, choose from quick colors or a custom color picker, adjust brush size, clear the canvas, and draw with mouse, pen, or touch input. The current drawing saves automatically as a client-scoped setting so reopening the phone restores the same artwork for that user.

## Settings

The **Settings** app contains personal cellphone preferences that are stored per Foundry client. **Phone Size** uses a 60%–150% slider with Small, Default, Large, and XL presets. By default, **Follow phone size** is enabled, so enlarging or shrinking the phone also scales cellphone typography proportionally. Players may disable that option and use the separate **Text Size** control, also from 60% to 150%, to make text larger or smaller without changing the physical phone size. Changes preview immediately and affect only the current user's Foundry client. Oversized phone values are automatically constrained to the available browser window.

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v14.368
- Module socket namespace enabled for calls, typing indicators, and Mondo Rides dispatch

## GitHub installation

Manifest URL:

```text
https://raw.githubusercontent.com/jeremyrobertdavison/foundry-cellphone/main/module.json
```

Repository:

```text
https://github.com/jeremyrobertdavison/foundry-cellphone
```

## Release packaging

The release archive must contain `module.json` at the root of the ZIP:

```text
foundry-cellphone-v2.4.3.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```


### Cellphone toolbar button

The cellphone no longer uses a floating launcher. An **Open Cellphone** button is added to Foundry's native Scene Controls tool palette on the left side of the canvas. The phone button is added to each control palette so it remains available regardless of which Scene Control layer is active, and it retains the cellphone unread badge when Foundry re-renders the toolbar. Foundry v14's Scene Control tool metadata is handled explicitly so the phone remains a button rather than becoming a canvas interaction, control, or creation tool.
