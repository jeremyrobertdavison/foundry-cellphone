# Changelog

## 1.8.0

- Expanded the **Arcade** from two games to five.
- Added **Minesweeper** with an 8x8 board, 10 mines, flood reveal, Flag Mode, right-click flagging, first-click safety, win/loss states, and local cleared-board stats.
- Added **Runner**, a generic endless jump-and-dodge game inspired by classic offline browser runners, with increasing speed, keyboard/tap controls, pause behavior, distance scoring, and a local best distance.
- Added **Guess My Number** where the phone chooses 1-100 and responds with Too high, Too low, or Correct.
- Guess My Number tracks wins and the user's best attempt count locally.
- Runner and Snake automatically pause when the phone closes, the user leaves Arcade, or an incoming/outgoing cellphone call interrupts play.
- Existing Snake and Tic Tac Toe behavior and statistics remain intact.

## 1.7.0

- Added the **Arcade** app to the cellphone Home Screen.
- Added a functional **Snake** game with arrow-key/WASD controls and on-screen direction buttons.
- Snake includes scoring, a persistent local best score, pause/resume, restart, food growth, wall collision, and self collision.
- Snake automatically pauses when leaving the app, closing the phone, or receiving/placing a cellphone call.
- Added **Tic Tac Toe** against a simple phone AI.
- Tic Tac Toe includes win/block strategy, restart, win highlighting, and persistent local win/loss/draw stats.
- Existing phone apps and communication features remain unchanged.

## 1.6.0

- Added the **News** app to the cellphone Home Screen.
- GMs can publish, edit, and delete public news stories.
- News stories support a headline, short blurb, publisher, author, and GM-specified publication date/time.
- Player access is read-only; the News app is a simple feed and does not open external pages.
- Stories are sorted by publication date/time with newest items first.
- News records persist in the Foundry world while remaining hidden from the normal chat feed.
- The Home Screen now presents six apps in a balanced 2-column grid.
- Existing messaging, calls, Mission Log, Friendpage, Browser, and Notes functionality is unchanged.

## 1.5.0

- Added the **Notes** app to the cellphone Home Screen.
- Each Foundry user has their own private note collection.
- Users can create, edit, and delete notes with a title and freeform body text.
- Notes persist in the Foundry world as self-whispered module records and are hidden from the normal Foundry chat feed.
- Notes are filtered to the owning Foundry user and are not exposed through the Notes interface to other players.
- Added note previews and last-updated timestamps to the Notes list.
- Existing Messages, calls, Mission Log, Friendpage, Browser, and NPC features remain unchanged.

## 1.4.1

- Improved Browser shortcut tile labels so bookmark names appear clearly beneath each icon.
- Increased bookmark label readability with brighter white text, stronger contrast, and larger sizing.
- Allowed bookmark labels to wrap across two lines so longer names remain readable.
- Existing Browser search, external links, and Journal rendering are unchanged.

## 1.4.0

- Added the **Browser** app to the cellphone Home Screen.
- Added a generic faux-browser start page with search and shortcut tiles.
- Added GM-only Browser shortcut management.
- Shortcut tiles support a name, HTTP/HTTPS URL, and generic icon.
- Clicking a shortcut opens the configured real-world URL in a new browser tab.
- Added permission-aware Foundry Journal search inside the Browser app.
- Journal search indexes entry names, page names, and visible text from Journal pages the current user may observe.
- Journal search results open and render inside the cellphone interface.
- Secret Journal sections are excluded from search indexing for non-owners.
- Browser navigation preserves search results when opening and backing out of a Journal page.
- Changed the Home Screen app grid to a balanced 2x2 layout for Messages, Mission Log, Friendpage, and Browser.
- Existing messaging, calls, Mission Log, Friendpage, NPC roleplay, and history remain unchanged.

## 1.3.2

- Added GM-managed **active Friendpage profiles**.
- By default, existing Foundry user profiles remain active for backwards compatibility until the GM saves a custom profile list.
- GMs can enable or disable individual Foundry user profiles and unassigned NPC Actor profiles.
- Enabled NPC Actors receive full Friendpage profiles and public walls.
- Added a GM-only **Posting as** selector for switching between the GM identity and enabled NPC Friendpage identities.
- NPC identities can publish statuses, post on other profiles, comment, Like, and Dislike.
- Players can browse enabled NPC profiles and post directly to NPC walls.
- Reactions are now one-per-Friendpage-profile-per-post, allowing multiple NPC identities controlled by the same GM to react independently.
- Existing v1.3.0/v1.3.1 Friendpage posts, comments, and reactions remain readable without migration.
- Friendpage records now use identity-aware schema v2 for new NPC-aware activity while retaining legacy user-ID compatibility.

## 1.3.1

- Added compact sender identity strips to group-chat bubbles.
- Incoming group messages now show both the sender name and a small character/NPC avatar.
- GM messages sent as NPCs now show that NPC's name and avatar even though the bubble is outgoing on the GM client.
- Added sender-avatar data to newly created group messages while retaining fallback support for existing message history.
- No data migration is required.

## 1.3.0

- Added **Friendpage**, a public in-world social-media app on the cellphone Home Screen.
- Added a global Friendpage feed.
- Added a profile and wall for every Foundry user, using assigned character identity when available.
- Users can post statuses to their own wall.
- Users can post public messages to other users' walls.
- Added public comments on Friendpage posts.
- Added Like and Dislike reactions with counts.
- Reactions are one-per-user-per-post and can be switched or removed.
- Added profile browsing and clickable author/wall-recipient navigation.
- Friendpage records persist through Foundry ChatMessage documents but are suppressed from the standard Foundry chat feed.
- Existing messaging, calls, Mission Log, and NPC features remain unchanged.

## 1.2.1

- Fixed Mission Log selection cards being compressed into a single horizontal row by Foundry's global button styling.
- Mission cards now keep a full-height vertical layout with title, status/priority chips, briefing preview, and audience on separate rows.
- Long mission titles may wrap to two lines instead of crushing the rest of the card.
- No mission data migration is required.

## 1.2.0

- Added a true cellphone **Home Screen** that opens before individual apps.
- Moved all existing group/direct messaging and call features into the **Messages** app.
- Added the **Mission Log** app.
- Added GM-only mission creation, editing, and deletion.
- Missions support title, briefing text, status, and priority.
- Missions may be visible to all players or restricted to selected player users.
- Restricted missions use Foundry whisper recipients so unassigned players are not recipients of the mission record.
- Players have read-only access to missions they are authorized to view.
- Added per-mission NEW indicators and a Mission Log app badge for newly created or updated missions.
- The main cellphone launcher badge now combines unread messages and unread mission updates.
- Hanging up a call now returns the phone to the new Home Screen.
- Existing messaging, NPC texting, group chats, typing indicators, player calls, and GM call-as-NPC features remain intact.

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
