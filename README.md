# Foundry Cellphone

An immersive cellphone UI for modern-day Foundry VTT campaigns.

Version 1.1.1 adds live typing indicators and true multi-thread group chats. Any player can start a group chat and choose multiple player and NPC contacts. GMs can participate in mixed groups from the perspective of any NPC included in that group.

## Features

- Cellphone button on the Foundry interface
- Center-screen draggable phone UI using a transparent PNG phone frame
- Persistent **Party Chat** retained from earlier versions
- Multiple persistent **custom group chats**
- Group creators can select any mix of player and enabled NPC contacts
- Optional custom group names
- Group chats are private to their selected human participants
- Groups containing NPCs are also delivered to GM users so the GM can roleplay those NPCs
- GMs can switch between NPC identities when a group contains multiple NPC contacts
- Persistent **Direct Messages** between Foundry users
- GM-managed **NPC Contacts**
- Players can privately text enabled NPC contacts
- GMs can select an NPC and text a player **as that NPC**
- **Live typing indicators** in group chats and direct messages
- Typing indicators display the active player or NPC identity, such as `Nick Fury is typing…`
- Assigned character names/portraits are used for Foundry users when available
- Actor names/portraits are used for NPC contacts
- Online/offline indicators for player contacts
- Unread badges per group and per direct-message thread
- Enter to send; Shift+Enter for a new line
- Phone messages are hidden from the normal Foundry chat feed
- Existing v1.0.0 and v1.1.0 Party Chat / DM history remains readable

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350

## Creating a group chat

1. Open the cellphone and choose **Groups**.
2. Click **New Group Chat**.
3. Optionally enter a group name.
4. Select one or more player contacts, NPC contacts, or a mixture of both.
5. Click **Create Group**.
6. The new conversation appears independently from Party Chat and other groups.

A non-GM creator is automatically part of the group. If an NPC is included, GM users receive the group conversation so they can roleplay that NPC.

## GM NPC participation in groups

When a GM opens a group containing NPC contacts, the composer uses an NPC identity from that group. If the group contains more than one NPC, a **Send as** selector appears above the text field so the GM can switch identities before sending or typing.

## Typing indicators

Typing state is transmitted live over the Foundry module socket and is not stored as chat history. Indicators automatically clear when the sender sends, stops typing, changes conversations, or times out.

Examples:

```text
Daisy Johnson is typing…
Nick Fury is typing…
Daisy Johnson and Nick Fury are typing…
```

## Setting up NPC contacts

1. Sign in as a GM and open the cellphone.
2. Open **Direct**.
3. Click **Manage NPC Contacts**.
4. Enable any Actor that should appear as a cellphone contact.
5. Enabled NPCs are available for both direct messages and new group chats.

Actors assigned directly to Foundry users are excluded from the NPC-management list so player characters are not duplicated as NPC contacts.

## Privacy note

Cellphone messages are in-game roleplaying messages, not encrypted communications. Player-to-player DMs and PC-only custom groups use Foundry whisper recipients. When an NPC is included, GM users are intentionally added as recipients so the GM can portray the NPC. The original Party Chat remains visible to everyone at the table for backward compatibility.

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
foundry-cellphone-v1.1.1.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
