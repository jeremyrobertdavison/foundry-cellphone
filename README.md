# Foundry Cellphone

An immersive in-game cellphone interface for modern-day Foundry VTT campaigns.

Version **1.3.2** expands **Friendpage** with GM-managed active profiles and full NPC social identities. The GM can choose which player/user and NPC Actor profiles exist on Friendpage, then post, comment, Like, and Dislike as enabled NPCs. Existing messaging, NPC roleplay, typing indicators, calls, Mission Log, and Friendpage history remain available.

## Features

- Cellphone **Home Screen** with Messages, Mission Log, and Friendpage apps
- **Friendpage global feed** showing public posts from active Friendpage profiles
- GM-managed **active profile list** for Foundry users and NPC Actors
- A **profile and wall** for every enabled user or NPC identity, using assigned character/Actor names and portraits
- GM-only **Posting as** selector for enabled NPC social identities
- Post a status to your own wall
- Write a public post on another user's wall
- Public comments on Friendpage posts
- Like and dislike reactions with live counts
- One active reaction per Friendpage profile per post; NPC identities controlled by the GM react independently
- Click a post author or wall recipient to jump directly to that profile
- Persistent Friendpage history stored as module-owned Foundry records and hidden from the normal Foundry chat feed
- **Messages** app with Party Chat, custom groups, DMs, NPC texting, typing indicators, and calls
- Group messages identify incoming participants with a compact name + avatar strip; GM-sent NPC messages also show the active NPC identity
- **Mission Log** app with GM-managed public or restricted assignments
- GM-triggered calls as NPC Actors
- Existing message and mission history from earlier releases remains readable

## Friendpage

Open the cellphone and choose **Friendpage**.

### Feed

The Feed tab shows all Friendpage posts newest-first. A post on your own wall is treated as a status. A post on somebody else's wall displays both the author and the wall owner.

Every post supports:

- Likes
- Dislikes
- Comments
- Profile navigation

All Friendpage content is public to the Foundry world. It is intended as in-character social-media roleplay rather than private communication.

### Profiles and walls

Choose **Profiles** to browse every identity the GM has enabled for Friendpage. User profiles use the assigned Foundry character name and portrait when one is available, falling back to the Foundry username/avatar otherwise. NPC profiles use the Actor name and portrait.

Open a profile to view that profile's wall. Any user with an active Friendpage identity can publish directly to an enabled player or NPC wall.

### GM profile management and NPC posting

GMs have a **Manage Profiles** control on the Profiles tab. Before the GM saves a custom profile configuration, all Foundry user profiles remain enabled for compatibility with earlier Friendpage releases. The GM can then explicitly enable or disable user profiles and unassigned NPC Actor profiles.

When one or more NPC profiles are active, the GM receives a **Posting as** selector. Switching this selector changes the identity used for new Friendpage statuses, wall posts, comments, Likes, and Dislikes. A single GM can therefore roleplay several NPC social accounts independently.

### Reactions

Each active Friendpage profile has one current reaction per post. A profile can:

- Like a post
- Dislike a post
- Switch between Like and Dislike
- Click the active reaction again to remove it

Reaction counts are calculated from the latest reaction state for each active profile. This means two NPC profiles controlled by the same GM can each react separately.

## Mission Log

The Mission Log remains GM-managed and player read-only. Missions can be visible to everyone or restricted to selected player users. Restricted missions use Foundry whisper recipients rather than merely hiding data in the UI.

## Messaging and calls

The Messages app retains Party Chat, custom PC/NPC group chats, player DMs, GM-managed NPC text contacts, typing indicators, player-to-player calls, and GM calls as NPC Actors. Calls are roleplay signaling/UI only; voice audio continues through your normal Foundry/Discord/in-person setup.

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350
- Module socket namespace enabled for calls and typing indicators

## Privacy note

Friendpage is deliberately public in-world content. Text messages and restricted Mission Log entries continue to use their existing Foundry recipient controls. This module is intended for roleplaying data and does not provide encrypted communication.

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
foundry-cellphone-v1.3.2.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
