# Changelog

## 1.1.4

- Added a GM-only **Call Player as NPC** control to the Direct Messages screen.
- GMs can initiate a call as any unassigned NPC Actor, even if that Actor is not enabled as a player messaging contact.
- Added dedicated NPC caller and player recipient selectors with online/offline awareness.
- The recipient sees the selected NPC Actor name and portrait on the incoming and active call screens.
- Existing NPC-contact calls, player-to-player calls, messaging, typing indicators, and group chats remain unchanged.

## 1.1.3

- Hotfix: enabled the Foundry module socket namespace in `module.json` with `"socket": true`.
- Restores delivery of live call offers, answers, declines, hang-ups, busy signals, and typing indicators between connected clients.
- No message-history migration is required.

## 1.1.2

- Added live incoming and outgoing call screens using the existing cellphone frame.
- Players can call other Foundry users from a direct-message thread.
- GMs can select an enabled NPC, choose a player, and place a call from that NPC's identity.
- Incoming calls automatically open the phone for the recipient.
- Incoming calls display the caller portrait and provide Accept and Decline controls.
- Accepted calls keep the remote caller/contact portrait on screen and display a live call-duration timer.
- Added a red Hang Up control that terminates the call on both clients and returns both phones to the main screen.
- Outgoing ringing calls can be cancelled and unanswered calls time out automatically.
- Added busy handling when a recipient is already in another cellphone call.
- Call signaling is ephemeral over the Foundry module socket and is not stored in chat history.
- Calls are roleplay signaling/UI only; v1.1.2 does not transmit voice audio.

## 1.1.1

- Added live typing indicators for player DMs, NPC DMs, Party Chat, and custom group chats.
- Added multiple persistent group-chat threads while preserving the original Party Chat.
- Added a New Group flow that lets the creator choose multiple player contacts, NPC contacts, or a mixture of both.
- Added optional group names and per-group unread badges.
- Added private group delivery through Foundry whisper recipients.
- Groups containing NPCs are also delivered to GM users so NPCs can participate naturally.
- Added GM sender identity selection for groups containing multiple NPCs.
- Typing indicators use the active roleplay identity, so players can see an NPC such as Nick Fury typing rather than the GM account.
- Maintained compatibility with existing v1.0.0 and v1.1.0 message history.

## 1.1.0

- Added GM-managed NPC cellphone contacts.
- Players can direct-message enabled NPC contacts.
- Messages sent to NPCs are visible to GM users and persist through Foundry ChatMessage documents.
- GMs can choose an NPC identity, choose a player, and text that player from the NPC's perspective.
- Added separate NPC/player conversation threads and unread badges.
- Added NPC contact portraits and a clear "Texting as NPC" indicator for GMs.
- Existing v1.0.0 party chat and player-to-player DM history remains compatible.

## 1.0.0

- Initial release.
- Added draggable cellphone interface using the supplied transparent phone frame.
- Added party-wide group texting.
- Added direct player-to-player messaging.
- Added character/user identity fallback behavior.
- Added online presence and unread badges.
- Added persistent message history through Foundry ChatMessage documents.
- Hid cellphone messages from the standard Foundry chat feed.
