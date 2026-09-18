# Foundry Cellphone

An immersive in-game cellphone interface for modern Foundry VTT campaigns.

Version **1.9.0** adds the **Maps** app: GM-managed reference maps with draggable character markers, multiple map support, optional player-restricted visibility, and an enlarged inspection view. Maps are informational only and do not move Foundry tokens or alter Scene coordinates.

## Cellphone apps

- **Messages** — Party Chat, custom groups, player DMs, NPC texting, typing indicators, player calls, and GM calls as NPCs.
- **Mission Log** — GM-managed assignments and briefings with all-player or selected-player visibility.
- **Friendpage** — in-world social media with user/NPC profiles, walls, posts, comments, Likes, and Dislikes.
- **Browser** — GM-configured external website shortcuts plus permission-aware Foundry Journal search inside the phone.
- **Notes** — private per-user notes with title/body editing and deletion.
- **News** — GM-authored headline feed with blurb, publisher, author, and publication date/time.
- **Arcade** — Snake, Tic Tac Toe, Minesweeper, Runner, and Guess My Number.
- **Maps** — GM-managed reference maps with character markers and player visibility controls.

## Maps

Open the cellphone and choose **Maps**. Players see only maps available to their Foundry user. Use the previous/next controls to cycle through available maps and **Enlarge** to inspect a larger scrollable version inside the phone.

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

Posts support comments, Likes, Dislikes, profile navigation, and posts on another profile's wall. Reactions are tracked per Friendpage profile, allowing multiple NPC identities controlled by the same GM to react independently.

## Notes

Notes are private to the current Foundry user inside the module interface. Notes persist in the Foundry world as self-whispered module records and are hidden from the normal chat feed. They are intended for private in-game note taking, not encrypted storage from the server administrator.

## News

The News app is a read-only feed for players. GMs can publish, edit, and delete stories containing a headline, short blurb, publisher, author, and custom publication date/time.

## Arcade

The Arcade includes five lightweight single-player games:

- **Snake** — keyboard/WASD and on-screen controls, pause/resume, local best score.
- **Tic Tac Toe** — play against a simple phone AI with local win/loss/draw stats.
- **Minesweeper** — 8×8 board, 10 mines, first-click safety, Flag Mode/right-click flagging.
- **Runner** — generic endless jump-and-dodge game with keyboard/tap controls and local best distance.
- **Guess My Number** — guess a number from 1–100 with Too high / Too low feedback.

Snake and Runner automatically pause when appropriate, including when leaving Arcade or closing the phone.

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350
- Module socket namespace enabled for calls and typing indicators

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
foundry-cellphone-v1.9.0.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
