# Foundry Cellphone

An immersive cellphone UI for modern-day Foundry VTT campaigns.

Version 1.1.0 expands the messaging system with NPC texting. Players can message NPC contacts exposed by the GM, and GMs can reply from the perspective of those NPCs.

## Features

- Cellphone button on the Foundry interface
- Center-screen draggable phone UI
- Custom transparent PNG phone frame
- Persistent **Party Chat** shared by the table
- Persistent **Direct Messages** between Foundry users
- GM-managed **NPC Contacts**
- Players can privately text enabled NPC contacts
- GMs can select an NPC and text a player **as that NPC**
- NPC conversations remain separate per NPC and per player
- Assigned character names/portraits are used for Foundry users when available
- Actor names/portraits are used for NPC contacts
- Online/offline indicators for player contacts
- Unread badges for group, player, and NPC conversations
- Enter to send; Shift+Enter for a new line
- Phone messages are hidden from the normal Foundry chat feed
- Existing v1.0.0 message history remains readable

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350

## Setting up NPC contacts

1. Sign in as a GM and open the cellphone.
2. Open **Direct**.
3. Click **Manage NPC Contacts**.
4. Enable any Actor that should appear as a cellphone contact for players.
5. Players will see those Actors under **NPC Contacts** in their Direct Messages list.

Actors assigned directly to Foundry users are excluded from the NPC-management list so player characters are not duplicated as NPC contacts.

## Player to NPC messaging

A player opens **Direct**, chooses an enabled NPC, and sends a message normally. The message is whispered through Foundry to the sending player and GM users. Other players do not receive that NPC conversation.

## GM texting as an NPC

A GM opens **Direct**, chooses an enabled NPC, then chooses a player. The conversation opens with a header showing **Texting as [NPC Name]**. Messages sent from that view appear to the player as messages from the selected NPC.

## Privacy note

Cellphone direct messages are in-game roleplaying messages, not encrypted private communications. NPC messages are intentionally available to GM users so the GM can roleplay the NPC response. Player-to-player DMs continue to use Foundry whisper recipients and are not automatically copied to the GM.

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
foundry-cellphone-v1.1.0.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
