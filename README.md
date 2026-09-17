# Foundry Cellphone

An immersive cellphone UI for modern-day Foundry VTT campaigns.

Version 1.1.4 adds a GM-only **Call Player as NPC** picker. A GM can choose any unassigned NPC Actor in the world and any non-GM player, then place a roleplay call without first enabling that NPC as a messaging contact. The player sees the selected NPC name and Actor portrait as the caller. Version 1.1.3 enabled the module socket namespace required for live calls and typing indicators.

## Features

- Cellphone button on the Foundry interface with unread-message badge
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
- **Player-to-player call screens** from direct-message threads
- **GM-triggered NPC incoming calls** to selected players
- GM-only **Call Player as NPC** picker can use any unassigned NPC Actor, independent of messaging contacts
- Incoming calls automatically pop open the cellphone on the recipient's screen
- Incoming call screen with caller portrait, Accept, and Decline controls
- Outgoing ringing screen with Cancel control
- Active call screen with remote portrait, call-duration timer, and red Hang Up button
- Hanging up terminates the call on both clients and returns both phones to the main screen
- Busy handling and automatic no-answer timeout
- Assigned character names/portraits are used for Foundry users when available
- Actor names/portraits are used for NPC contacts
- Online/offline indicators for player contacts
- Unread badges per group and per direct-message thread
- Enter to send; Shift+Enter for a new line
- Phone messages are hidden from the normal Foundry chat feed
- Existing v1.0.0 through v1.1.2 message history remains readable

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350
- Module socket namespace enabled for calls and typing indicators

## Calling another player

1. Open the cellphone and choose **Direct**.
2. Open a direct-message thread with another Foundry user.
3. Click the green phone button in the conversation header.
4. The other user's cellphone automatically opens to an incoming-call screen.
5. The recipient can **Accept** or **Decline**.
6. Once accepted, both sides see the other party's portrait, a live call timer, and a red **Hang Up** control.
7. Either side can hang up; the call ends on both clients and both phones return to the main screen.

Offline users cannot be called. Unanswered calls automatically time out.

## GM calling a player as any NPC

1. As GM, open the cellphone and choose **Direct**.
2. Click **Call Player as NPC**.
3. Choose an NPC Actor from **Call as**. The Actor does not need to be enabled as a messaging contact.
4. Choose a player from **Call player**. Offline players are labeled and cannot be called.
5. Click **Place Call**.
6. The player's phone automatically opens showing the selected NPC Actor portrait and name as the caller.
7. If the player accepts, the GM sees the player's portrait while the player continues to see the NPC portrait.
8. Either side can end the call with the red **Hang Up** button.

The older conversation-based path also remains available for enabled NPC messaging contacts: select the NPC, choose the player, open the conversation, and click the green phone button.

## Call behavior and audio

The call feature is a synchronized roleplay interface and signaling system. It controls ringing, accepting, declining, call state, portraits, timers, and hang-up behavior through the Foundry module socket. It does **not** transmit microphone or voice audio. Use your normal table voice method (Foundry's configured A/V, Discord, in-person conversation, etc.) for the actual spoken dialogue.

Call state is ephemeral and is not stored as a ChatMessage or written into message history.

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
5. Enabled NPCs are available for direct messages, group chats, and GM-originated NPC calls.

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
foundry-cellphone-v1.1.4.zip
├── module.json
├── README.md
├── CHANGELOG.md
├── LICENSE
├── assets/
├── scripts/
└── styles/
```
