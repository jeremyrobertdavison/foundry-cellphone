# Foundry Cellphone

An immersive in-game cellphone interface for modern-day Foundry VTT campaigns.

Version **1.2.1** includes the Mission Log layout fix and retains a true cellphone **Home Screen** and the first standalone phone app beyond messaging: **Mission Log**. Existing messaging, NPC roleplay, typing indicators, calls, and GM call-as-NPC features remain available through the Messages app.

## Features

- New cellphone **Home Screen** with app icons
- **Messages** app containing the existing Group and Direct messaging systems
- **Mission Log** app with player read-only access
- GM-only mission creation, editing, and deletion
- Mission title, briefing, status, and priority
- Missions can be visible to **all players** or only **selected players**
- Restricted missions use Foundry whisper recipients so unassigned players are not given the mission record
- Mission Log unread/new badges when an assigned mission is created or updated
- Launcher badge now combines unread messages and unread mission updates
- Persistent Party Chat and custom group chats
- Mixed PC/NPC group chats with GM NPC identities
- Persistent direct messages between players
- GM-managed NPC text contacts
- Player-to-player calls
- GM-triggered calls as any NPC Actor
- Incoming call pop-up, Accept/Decline, live call timer, and synchronized Hang Up
- Live typing indicators
- Existing message history from v1.0.0+ remains readable

## Home Screen

Opening the cellphone now starts at the Home Screen. The first two apps are:

- **Messages** — Groups, Direct Messages, NPC texting, typing indicators, and calls.
- **Mission Log** — GM-created assignments and briefings.

Unread badges appear directly on the appropriate app icon. The main Foundry cellphone launcher badge displays the combined unread total.

## Mission Log: GM workflow

1. Open the cellphone.
2. Open **Mission Log**.
3. Click **Add Mission**.
4. Enter a mission title and briefing.
5. Choose a status: Active, Pending, On Hold, Completed, or Failed.
6. Choose a priority: Low, Normal, High, or Critical.
7. Choose visibility:
   - **Everyone** — all players can see the mission.
   - **Selected Players** — choose exactly which player users receive the mission.
8. Click **Save Mission**.

Open an existing mission as GM and choose **Edit Mission** to update it. Players assigned to the mission receive a new unread Mission Log badge whenever the mission is updated.

Deleting a mission removes it from every phone that could see it.

## Mission Log: player workflow

Players can open **Mission Log** from the Home Screen and read missions they are authorized to see. Players cannot create, edit, or delete missions.

Restricted missions are persisted as private Foundry records addressed only to the selected player users and GM users. They are not merely hidden with CSS from unassigned players.

Opening a mission marks that mission's current version as read on that client.

## Messaging

The Messages app contains the existing **Groups** and **Direct** tabs. Party Chat, custom groups, PC/NPC mixed groups, direct messages, NPC contacts, typing indicators, and calls work as in previous releases.

## GM calling a player as an NPC

1. Open **Messages** → **Direct**.
2. Click **Call Player as NPC**.
3. Choose any unassigned NPC Actor as the caller.
4. Choose an online player.
5. Click **Place Call**.

The recipient's phone automatically opens with the selected NPC's name and portrait. Calls remain roleplay signaling/UI only; voice audio continues through your normal Foundry/Discord/in-person setup.

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350
- Module socket namespace enabled for calls and typing indicators

## Privacy note

Cellphone communications and Mission Log entries are in-game roleplaying data, not encrypted communications. Player DMs and restricted missions use Foundry recipient controls. GM users are intentionally included where necessary to portray NPCs and manage missions.

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
foundry-cellphone-v1.2.1.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
