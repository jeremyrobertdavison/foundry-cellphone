# Foundry Cellphone

An immersive cellphone UI for modern-day Foundry VTT campaigns.

Version 1.0.0 provides the messaging foundation: a party-wide group text and player-to-player direct messages rendered inside a cellphone frame rather than the normal Foundry chat interface.

## Features

- Cellphone button on the Foundry interface
- Center-screen draggable phone UI
- Custom transparent PNG phone frame
- Persistent **Party Chat** shared by the table
- Persistent **Direct Messages** between Foundry users
- Uses an assigned character's name and portrait when available, falling back to the Foundry user name/avatar
- Online/offline contact indicators
- Unread badges for group and direct messages
- Enter to send; Shift+Enter for a new line
- Phone messages are hidden from the normal Foundry chat feed
- Works independently of game system data, so it can be used with modern RPG systems including Marvel Multiverse RPG

## Foundry compatibility

- Minimum: Foundry VTT v12
- Verified target: Foundry VTT v13.350

The module uses Foundry `ChatMessage` documents as the persistence layer. Group texts are stored as normal chat documents with module flags; direct messages use Foundry whisper recipients. The module suppresses its flagged messages from the regular chat log and displays them only in the cellphone UI.

## Important privacy note

Direct Messages are **in-game roleplay DMs**, not encrypted private communications. They use Foundry's whisper/message infrastructure and should not be treated as secret from the Foundry server owner or as a secure messaging system.

## Installation for development

Copy the `foundry-cellphone` folder into:

```text
<Data>/modules/foundry-cellphone
```

Restart Foundry if needed, then enable **Foundry Cellphone** in the world's Manage Modules screen.

## GitHub release packaging

For a Foundry release asset, create a ZIP whose root contains `module.json`, `scripts/`, `styles/`, and `assets/` directly. The included `foundry-cellphone-v1.0.0.zip` is packaged that way.

When a GitHub repository exists, add the repository, manifest, and download URLs to `module.json`, for example:

```json
"url": "https://github.com/jeremyrobertdavison/foundry-cellphone",
"manifest": "https://raw.githubusercontent.com/jeremyrobertdavison/foundry-cellphone/main/module.json",
"download": "https://github.com/jeremyrobertdavison/foundry-cellphone/releases/download/v1.0.0/foundry-cellphone-v1.0.0.zip"
```

The GitHub URLs above are configured for `jeremyrobertdavison/foundry-cellphone`; confirm the release asset name before publishing.

## Version 1 scope

This first release intentionally focuses on the messaging core. Good candidates for later releases include:

- GM-controlled NPC contacts
- Multiple group chats
- Lock-screen notifications
- Notification sounds and ringtones
- Images and attachments
- Phone wallpapers and themes
- Calls / voicemail
- Scheduled GM messages
- Fake websites and browser app
- Maps / location sharing
- Contact management and phone-number exchange

## Data behavior

Messages persist with the world's normal ChatMessage collection. Clearing the Foundry chat history can therefore also remove cellphone history.

## License

MIT
