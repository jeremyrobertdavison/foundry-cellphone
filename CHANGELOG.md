# Changelog

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
