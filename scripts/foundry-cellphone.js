const MODULE_ID = "foundry-cellphone";
const PHONE_FLAG = "phoneMessage";
const NPC_CONTACTS_SETTING = "npcContacts";
const SOCKET_NAME = `module.${MODULE_ID}`;
const LEGACY_GROUP_ID = "party";
const MAX_RENDERED_MESSAGES = 300;
const TYPING_KEEPALIVE_MS = 700;
const TYPING_STOP_MS = 1500;
const TYPING_EXPIRE_MS = 3000;

const state = {
  phoneOpen: false,
  mode: "group",
  selectedGroupId: null,
  groupCreatorOpen: false,
  groupDraft: { name: "", selectedKeys: new Set() },
  groupSenderKey: null,
  selectedContactType: null,
  selectedContactId: null,
  actingNpcId: null,
  npcManagerOpen: false,
  unreadGroups: new Map(),
  unreadDirect: new Map(),
  incomingTyping: new Map(),
  outgoingTyping: {
    active: false,
    contextKey: null,
    senderKey: null,
    senderType: null,
    senderId: null,
    senderName: null,
    targetUserIds: [],
    lastEmitAt: 0,
    stopTimer: null
  },
  typingSweepTimer: null,
  root: null,
  launcher: null,
  drag: null
};

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, NPC_CONTACTS_SETTING, {
    name: "NPC Phone Contacts",
    hint: "Actor IDs that are exposed to players as cellphone contacts.",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => refreshAll()
  });
});

Hooks.once("ready", () => {
  buildLauncher();
  buildPhone();
  game.socket.on(SOCKET_NAME, onSocketMessage);
  state.typingSweepTimer = window.setInterval(pruneExpiredTyping, 750);
  refreshAll();
  console.info(`${MODULE_ID} | Ready`);
});

// V13+ chat rendering hook.
Hooks.on("renderChatMessageHTML", (message, html) => {
  if (!isPhoneMessage(message)) return;
  html?.remove?.();
});

// V12 compatibility hook.
Hooks.on("renderChatMessage", (message, html) => {
  if (!isPhoneMessage(message)) return;
  if (html?.remove) html.remove();
  else if (html?.hide) html.hide();
});

Hooks.on("createChatMessage", (message) => {
  if (!isPhoneMessage(message)) return;
  if (!isPhoneMessageVisibleToCurrentUser(message)) return;

  const data = normalizePhoneData(message);
  if (!data) return;

  if (isMessageAuthoredByCurrentUser(data)) {
    refreshAll();
    return;
  }

  if (data.kind === "group") {
    const groupId = getGroupIdFromData(data);
    if (data.event !== "group-create") {
      const activelyViewing = state.phoneOpen && state.mode === "group" && state.selectedGroupId === groupId;
      if (!activelyViewing) {
        state.unreadGroups.set(groupId, (state.unreadGroups.get(groupId) ?? 0) + 1);
      }
    }
  } else if (data.kind === "dm") {
    const threadKey = getMessageThreadKeyForCurrentUser(data);
    if (threadKey) {
      const activelyViewing = state.phoneOpen && state.mode === "dm" && getCurrentThreadKey() === threadKey;
      if (!activelyViewing) {
        state.unreadDirect.set(threadKey, (state.unreadDirect.get(threadKey) ?? 0) + 1);
      }
    }
  }

  refreshAll();
});

Hooks.on("deleteChatMessage", (message) => {
  if (isPhoneMessage(message)) refreshAll();
});

Hooks.on("userConnected", () => refreshAll());

function buildLauncher() {
  if (document.getElementById(`${MODULE_ID}-launcher`)) return;

  const button = document.createElement("button");
  button.id = `${MODULE_ID}-launcher`;
  button.className = "fc-launcher";
  button.type = "button";
  button.title = "Open Cellphone";
  button.setAttribute("aria-label", "Open Cellphone");
  button.innerHTML = `
    <i class="fa-solid fa-mobile-screen-button" aria-hidden="true"></i>
    <span class="fc-launcher-badge" hidden>0</span>
  `;
  button.addEventListener("click", togglePhone);
  document.body.appendChild(button);
  state.launcher = button;
}

function buildPhone() {
  if (document.getElementById(`${MODULE_ID}-root`)) return;

  const root = document.createElement("div");
  root.id = `${MODULE_ID}-root`;
  root.className = "fc-phone-root";
  root.hidden = true;
  root.innerHTML = `
    <div class="fc-phone" role="dialog" aria-label="Cellphone">
      <div class="fc-phone-screen">
        <div class="fc-statusbar">
          <span class="fc-status-time">--:--</span>
          <span class="fc-status-icons"><i class="fa-solid fa-signal"></i> <i class="fa-solid fa-wifi"></i> <i class="fa-solid fa-battery-three-quarters"></i></span>
        </div>

        <header class="fc-header">
          <button class="fc-icon-button fc-back" type="button" aria-label="Back" hidden><i class="fa-solid fa-chevron-left"></i></button>
          <div class="fc-header-title-wrap">
            <div class="fc-header-title">Messages</div>
            <div class="fc-header-subtitle"></div>
          </div>
          <button class="fc-icon-button fc-close" type="button" aria-label="Close phone"><i class="fa-solid fa-xmark"></i></button>
        </header>

        <nav class="fc-tabs" aria-label="Message type">
          <button class="fc-tab is-active" type="button" data-mode="group">
            <i class="fa-solid fa-user-group"></i>
            <span>Groups</span>
            <span class="fc-tab-badge fc-group-tab-badge" hidden>0</span>
          </button>
          <button class="fc-tab" type="button" data-mode="dm">
            <i class="fa-solid fa-comment-dots"></i>
            <span>Direct</span>
            <span class="fc-tab-badge fc-dm-tab-badge" hidden>0</span>
          </button>
        </nav>

        <main class="fc-content">
          <section class="fc-conversation-view" hidden>
            <div class="fc-messages" aria-live="polite"></div>
            <form class="fc-composer">
              <div class="fc-sender-row" hidden>
                <span>Send as</span>
                <select class="fc-sender-select" aria-label="Send message as"></select>
              </div>
              <div class="fc-typing-indicator" hidden></div>
              <div class="fc-composer-row">
                <textarea class="fc-message-input" rows="1" maxlength="2000" placeholder="Message"></textarea>
                <button class="fc-send" type="submit" aria-label="Send message"><i class="fa-solid fa-arrow-up"></i></button>
              </div>
            </form>
          </section>

          <section class="fc-contacts-view">
            <div class="fc-contacts"></div>
          </section>
        </main>
      </div>

      <img class="fc-phone-frame" src="modules/${MODULE_ID}/assets/phone-frame.png" alt="" draggable="false">
      <div class="fc-drag-handle" title="Drag phone"></div>
    </div>
  `;

  document.body.appendChild(root);
  state.root = root;

  root.querySelector(".fc-close").addEventListener("click", closePhone);
  root.querySelectorAll(".fc-tab").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  root.querySelector(".fc-back").addEventListener("click", goBack);

  const form = root.querySelector(".fc-composer");
  const input = root.querySelector(".fc-message-input");
  const senderSelect = root.querySelector(".fc-sender-select");

  form.addEventListener("submit", onSendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener("input", () => {
    autoSizeTextarea(input);
    onComposerTypingInput();
  });
  input.addEventListener("blur", () => stopTyping());
  senderSelect.addEventListener("change", () => {
    stopTyping();
    state.groupSenderKey = senderSelect.value || null;
    if (input.value.trim()) startTyping();
  });

  setupPhoneDragging(root.querySelector(".fc-phone"), root.querySelector(".fc-drag-handle"));
  window.addEventListener("resize", keepPhoneOnScreen);
}

function togglePhone() {
  if (state.phoneOpen) closePhone();
  else openPhone();
}

function openPhone() {
  if (!state.root) buildPhone();
  state.phoneOpen = true;
  state.root.hidden = false;
  state.root.classList.add("is-open");
  markCurrentConversationRead();
  renderPhone();

  requestAnimationFrame(() => {
    const input = state.root.querySelector(".fc-message-input");
    if (input && input.offsetParent !== null) input.focus();
  });
}

function closePhone() {
  stopTyping();
  state.phoneOpen = false;
  if (!state.root) return;
  state.root.classList.remove("is-open");
  state.root.hidden = true;
  updateBadges();
}

function setMode(mode) {
  if (!["group", "dm"].includes(mode)) return;
  stopTyping();
  state.mode = mode;
  state.selectedGroupId = null;
  state.groupCreatorOpen = false;
  state.groupSenderKey = null;
  state.selectedContactType = null;
  state.selectedContactId = null;
  state.actingNpcId = null;
  state.npcManagerOpen = false;
  renderPhone();
}

function goBack() {
  stopTyping();

  if (state.mode === "group") {
    if (state.groupCreatorOpen) {
      state.groupCreatorOpen = false;
      resetGroupDraft();
      renderPhone();
      return;
    }
    if (state.selectedGroupId) {
      state.selectedGroupId = null;
      state.groupSenderKey = null;
      renderPhone();
      return;
    }
  }

  if (state.npcManagerOpen) {
    state.npcManagerOpen = false;
    renderPhone();
    return;
  }

  if (state.actingNpcId && state.selectedContactId) {
    state.selectedContactType = null;
    state.selectedContactId = null;
    renderPhone();
    return;
  }

  if (state.actingNpcId) {
    state.actingNpcId = null;
    renderPhone();
    return;
  }

  if (state.selectedContactId) {
    state.selectedContactType = null;
    state.selectedContactId = null;
    renderPhone();
  }
}

function markCurrentConversationRead() {
  if (state.mode === "group") {
    if (state.selectedGroupId) state.unreadGroups.set(state.selectedGroupId, 0);
  } else {
    const threadKey = getCurrentThreadKey();
    if (threadKey) state.unreadDirect.set(threadKey, 0);
  }
  updateBadges();
}

async function onSendMessage(event) {
  event.preventDefault();
  const input = state.root.querySelector(".fc-message-input");
  const body = input.value.trim();
  if (!body) return;

  if (state.mode === "group" && !state.selectedGroupId) {
    ui.notifications.warn("Choose a group chat first.");
    return;
  }
  if (state.mode === "dm" && !hasOpenDirectConversation()) {
    ui.notifications.warn("Choose a contact first.");
    return;
  }
  if (!getCurrentSenderIdentity()) {
    ui.notifications.warn("There is no available sender identity for this conversation.");
    return;
  }

  input.disabled = true;
  stopTyping();
  try {
    await createPhoneMessage(body);
    input.value = "";
    autoSizeTextarea(input);
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to send message`, error);
    ui.notifications.error("The cellphone message could not be sent. Check the console for details.");
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function hasOpenDirectConversation() {
  if (state.mode !== "dm") return false;
  if (game.user.isGM && state.actingNpcId) return Boolean(state.selectedContactId);
  return Boolean(state.selectedContactType && state.selectedContactId);
}

async function createPhoneMessage(body) {
  if (state.mode === "group") return createGroupMessage(body);
  return createDirectMessage(body);
}

async function createGroupMessage(body) {
  const group = getGroupById(state.selectedGroupId);
  if (!group) throw new Error("Group chat could not be found.");

  const identity = getCurrentSenderIdentity();
  if (!identity) throw new Error("No sender identity is available for this group.");

  const now = Date.now();
  const phoneData = {
    [PHONE_FLAG]: true,
    schema: 3,
    kind: "group",
    event: "message",
    groupId: group.id,
    groupName: group.name,
    participants: cloneParticipants(group.participants),
    creatorUserId: group.creatorUserId ?? null,
    senderType: identity.type,
    senderId: identity.id,
    senderName: identity.name,
    recipientType: null,
    recipientId: null,
    recipientName: null,
    authorUserId: game.user.id,
    body,
    sentAt: now
  };

  const speaker = identity.type === "npc"
    ? { actor: identity.id, alias: identity.name }
    : { alias: identity.name };

  const data = {
    content: formatSafeChatContent(body),
    speaker,
    flags: { [MODULE_ID]: phoneData }
  };

  if (group.id !== LEGACY_GROUP_ID) {
    data.whisper = getGroupWhisperUserIds(group);
  }

  return createChatMessageDocument(data);
}

async function createDirectMessage(body) {
  const now = Date.now();
  let phoneData;
  let speaker;
  let whisper = [];

  if (game.user.isGM && state.actingNpcId) {
    const actor = game.actors.get(state.actingNpcId);
    const recipient = game.users.get(state.selectedContactId);
    if (!actor || !recipient) throw new Error("NPC or recipient could not be found.");

    phoneData = {
      [PHONE_FLAG]: true,
      schema: 3,
      kind: "dm",
      senderType: "npc",
      senderId: actor.id,
      senderName: actor.name,
      recipientType: "user",
      recipientId: recipient.id,
      recipientName: getUserDisplayName(recipient),
      authorUserId: game.user.id,
      body,
      sentAt: now
    };
    speaker = { actor: actor.id, alias: actor.name };
    whisper = uniqueIds([...getGmUserIds(), recipient.id]);
  } else {
    const senderName = getUserDisplayName(game.user);
    const recipientType = state.selectedContactType;
    const recipientId = state.selectedContactId;

    if (recipientType === "user") {
      const recipient = game.users.get(recipientId);
      if (!recipient) throw new Error("Recipient could not be found.");

      phoneData = {
        [PHONE_FLAG]: true,
        schema: 3,
        kind: "dm",
        senderType: "user",
        senderId: game.user.id,
        senderName,
        recipientType: "user",
        recipientId: recipient.id,
        recipientName: getUserDisplayName(recipient),
        authorUserId: game.user.id,
        body,
        sentAt: now
      };
      whisper = uniqueIds([game.user.id, recipient.id]);
    } else if (recipientType === "npc") {
      const actor = game.actors.get(recipientId);
      if (!actor) throw new Error("NPC contact could not be found.");

      phoneData = {
        [PHONE_FLAG]: true,
        schema: 3,
        kind: "dm",
        senderType: "user",
        senderId: game.user.id,
        senderName,
        recipientType: "npc",
        recipientId: actor.id,
        recipientName: actor.name,
        authorUserId: game.user.id,
        body,
        sentAt: now
      };
      whisper = uniqueIds([game.user.id, ...getGmUserIds()]);
    } else {
      throw new Error("No direct-message recipient is selected.");
    }

    speaker = { alias: senderName };
  }

  return createChatMessageDocument({
    content: formatSafeChatContent(body),
    speaker,
    whisper,
    flags: { [MODULE_ID]: phoneData }
  });
}

async function createGroupChat() {
  const selected = [...state.groupDraft.selectedKeys];
  if (!selected.length) {
    ui.notifications.warn("Choose at least one contact for the group chat.");
    return;
  }

  const participants = [];
  if (!game.user.isGM) {
    participants.push({ type: "user", id: game.user.id, name: getUserDisplayName(game.user) });
  }

  for (const key of selected) {
    const [type, id] = key.split(":");
    if (type === "user") {
      const user = game.users.get(id);
      if (user) participants.push({ type: "user", id: user.id, name: getUserDisplayName(user) });
    } else if (type === "npc") {
      const actor = game.actors.get(id);
      if (actor) participants.push({ type: "npc", id: actor.id, name: actor.name });
    }
  }

  const deduped = dedupeParticipants(participants);
  if (!deduped.length) {
    ui.notifications.warn("No valid contacts were selected.");
    return;
  }

  const groupId = makeId();
  const groupName = state.groupDraft.name.trim() || buildDefaultGroupName(deduped);
  const group = {
    id: groupId,
    name: groupName,
    participants: deduped,
    creatorUserId: game.user.id,
    createdAt: Date.now()
  };

  const phoneData = {
    [PHONE_FLAG]: true,
    schema: 3,
    kind: "group",
    event: "group-create",
    groupId,
    groupName,
    participants: cloneParticipants(deduped),
    creatorUserId: game.user.id,
    senderType: "user",
    senderId: game.user.id,
    senderName: getUserDisplayName(game.user),
    authorUserId: game.user.id,
    body: "",
    sentAt: group.createdAt
  };

  const whisper = uniqueIds([...getGroupWhisperUserIds(group), game.user.id]);
  await createChatMessageDocument({
    content: "[Cellphone group created]",
    speaker: { alias: getUserDisplayName(game.user) },
    whisper,
    flags: { [MODULE_ID]: phoneData }
  });

  state.groupCreatorOpen = false;
  state.selectedGroupId = groupId;
  state.groupSenderKey = null;
  resetGroupDraft();
  state.unreadGroups.set(groupId, 0);
  renderPhone();
  requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
}

function createChatMessageDocument(data) {
  const ChatMessageClass = globalThis.foundry?.documents?.ChatMessage ?? globalThis.ChatMessage;
  if (!ChatMessageClass?.create) throw new Error("Foundry ChatMessage API is unavailable.");
  return ChatMessageClass.create(data);
}

function refreshAll() {
  if (state.phoneOpen) renderPhone();
  updateBadges();
}

function renderPhone() {
  if (!state.root) return;

  updateStatusTime();
  updateTabs();
  updateHeader();

  const conversation = state.root.querySelector(".fc-conversation-view");
  const contactsView = state.root.querySelector(".fc-contacts-view");
  const composer = state.root.querySelector(".fc-composer");

  let showConversation = false;
  if (state.mode === "group") showConversation = Boolean(state.selectedGroupId) && !state.groupCreatorOpen;
  else showConversation = hasOpenDirectConversation();

  conversation.hidden = !showConversation;
  contactsView.hidden = showConversation;

  if (showConversation) {
    const identity = getCurrentSenderIdentity();
    composer.hidden = !identity;
    updateSenderIdentityControl();
    renderMessages();
    renderTypingIndicator();
  } else {
    composer.hidden = true;
    renderListView();
  }

  markCurrentConversationRead();
  updateBadges();
}

function updateStatusTime() {
  const el = state.root?.querySelector(".fc-status-time");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateTabs() {
  state.root.querySelectorAll(".fc-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });
}

function updateHeader() {
  const title = state.root.querySelector(".fc-header-title");
  const subtitle = state.root.querySelector(".fc-header-subtitle");
  const back = state.root.querySelector(".fc-back");

  if (state.mode === "group") {
    if (state.groupCreatorOpen) {
      title.textContent = "New Group";
      subtitle.textContent = "Choose contacts";
      back.hidden = false;
      return;
    }

    if (!state.selectedGroupId) {
      title.textContent = "Group Chats";
      subtitle.textContent = "Party and private groups";
      back.hidden = true;
      return;
    }

    const group = getGroupById(state.selectedGroupId);
    title.textContent = group?.name || "Group Chat";
    if (group?.id === LEGACY_GROUP_ID) {
      const online = game.users.contents.filter((u) => u.active).length;
      subtitle.textContent = `${online} online`;
    } else {
      const count = group?.participants?.length ?? 0;
      subtitle.textContent = `${count} contact${count === 1 ? "" : "s"}`;
    }
    back.hidden = false;
    return;
  }

  if (state.npcManagerOpen) {
    title.textContent = "NPC Contacts";
    subtitle.textContent = "Choose who players can text";
    back.hidden = false;
    return;
  }

  if (game.user.isGM && state.actingNpcId) {
    const actor = game.actors.get(state.actingNpcId);
    if (!state.selectedContactId) {
      title.textContent = actor?.name || "NPC";
      subtitle.textContent = "Choose a player";
      back.hidden = false;
      return;
    }

    const contact = game.users.get(state.selectedContactId);
    title.textContent = contact ? getUserDisplayName(contact) : "Direct Message";
    subtitle.textContent = `Texting as ${actor?.name || "NPC"}`;
    back.hidden = false;
    return;
  }

  if (!state.selectedContactId) {
    title.textContent = "Direct Messages";
    subtitle.textContent = "Choose a contact";
    back.hidden = true;
    return;
  }

  if (state.selectedContactType === "npc") {
    const actor = game.actors.get(state.selectedContactId);
    title.textContent = actor?.name || "NPC";
    subtitle.textContent = "NPC Contact";
    back.hidden = false;
    return;
  }

  const contact = game.users.get(state.selectedContactId);
  title.textContent = contact ? getUserDisplayName(contact) : "Direct Message";
  subtitle.textContent = contact?.active ? "Online" : "Offline";
  back.hidden = false;
}

function renderMessages() {
  const container = state.root.querySelector(".fc-messages");
  container.replaceChildren();

  let messages = getConversationMessages();
  if (messages.length > MAX_RENDERED_MESSAGES) messages = messages.slice(-MAX_RENDERED_MESSAGES);

  if (!messages.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `
      <i class="fa-regular fa-message"></i>
      <strong>No messages yet</strong>
      <span>${state.mode === "group" ? "Start the group conversation." : "Start a direct conversation."}</span>
    `;
    container.appendChild(empty);
  } else {
    for (const message of messages) container.appendChild(buildMessageBubble(message));
  }

  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function buildMessageBubble(message) {
  const data = normalizePhoneData(message);
  const outgoing = isOutgoingForCurrentView(data);
  const row = document.createElement("div");
  row.className = `fc-message-row ${outgoing ? "is-outgoing" : "is-incoming"}`;

  const bubble = document.createElement("div");
  bubble.className = "fc-bubble";

  if (state.mode === "group" && !outgoing) {
    const sender = document.createElement("div");
    sender.className = "fc-bubble-sender";
    sender.textContent = data.senderName || getIdentityName(data.senderType, data.senderId);
    bubble.appendChild(sender);
  }

  const body = document.createElement("div");
  body.className = "fc-bubble-body";
  body.textContent = data.body ?? message.content ?? "";
  bubble.appendChild(body);

  const time = document.createElement("div");
  time.className = "fc-bubble-time";
  time.textContent = formatMessageTime(data.sentAt ?? message.timestamp);
  bubble.appendChild(time);

  row.appendChild(bubble);
  return row;
}

function isOutgoingForCurrentView(data) {
  if (!data) return false;
  if (data.authorUserId) return data.authorUserId === game.user.id;
  if (state.mode === "group") return data.senderType === "user" && data.senderId === game.user.id;
  if (game.user.isGM && state.actingNpcId) return data.senderType === "npc" && data.senderId === state.actingNpcId;
  return data.senderType === "user" && data.senderId === game.user.id;
}

function renderListView() {
  const container = state.root.querySelector(".fc-contacts");
  container.replaceChildren();

  if (state.mode === "group") {
    if (state.groupCreatorOpen) renderGroupCreator(container);
    else renderGroupList(container);
    return;
  }

  renderDirectContacts(container);
}

function renderGroupList(container) {
  const create = document.createElement("button");
  create.className = "fc-manager-button";
  create.type = "button";
  create.innerHTML = `<i class="fa-solid fa-plus"></i><span>New Group Chat</span>`;
  create.addEventListener("click", () => {
    state.groupCreatorOpen = true;
    resetGroupDraft();
    renderPhone();
  });
  container.appendChild(create);

  const groups = getGroupDefinitions();
  appendSectionLabel(container, "Conversations");
  for (const group of groups) container.appendChild(buildGroupRow(group));
}

function buildGroupRow(group) {
  const latest = getGroupMessages(group.id).at(-1);
  let preview = group.id === LEGACY_GROUP_ID ? "Everyone at the table" : describeGroupMembers(group);
  if (latest) {
    const data = normalizePhoneData(latest);
    const prefix = data.authorUserId === game.user.id ? "You: " : `${data.senderName || "Someone"}: `;
    preview = prefix + truncate(data.body || "", 36);
  }

  const row = document.createElement("button");
  row.className = "fc-contact fc-group-contact";
  row.type = "button";

  const avatar = document.createElement("div");
  avatar.className = "fc-group-avatar";
  avatar.innerHTML = `<i class="fa-solid fa-user-group"></i>`;

  const text = document.createElement("div");
  text.className = "fc-contact-text";
  const name = document.createElement("div");
  name.className = "fc-contact-name";
  name.textContent = group.name;
  const previewEl = document.createElement("div");
  previewEl.className = "fc-contact-preview";
  previewEl.textContent = preview;
  text.append(name, previewEl);

  const right = document.createElement("div");
  right.className = "fc-contact-right";
  const unread = state.unreadGroups.get(group.id) ?? 0;
  if (unread > 0) {
    const badge = document.createElement("span");
    badge.className = "fc-contact-unread";
    badge.textContent = unread > 99 ? "99+" : String(unread);
    right.appendChild(badge);
  }

  row.append(avatar, text, right);
  row.addEventListener("click", () => {
    state.selectedGroupId = group.id;
    state.groupSenderKey = null;
    state.unreadGroups.set(group.id, 0);
    renderPhone();
    requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
  });
  return row;
}

function renderGroupCreator(container) {
  const note = document.createElement("div");
  note.className = "fc-manager-note";
  note.textContent = "Choose any mix of player and NPC contacts. NPC messages are controlled by the GM.";
  container.appendChild(note);

  const nameInput = document.createElement("input");
  nameInput.className = "fc-group-name-input";
  nameInput.type = "text";
  nameInput.maxLength = 60;
  nameInput.placeholder = "Group name (optional)";
  nameInput.value = state.groupDraft.name;
  nameInput.addEventListener("input", () => { state.groupDraft.name = nameInput.value; });
  container.appendChild(nameInput);

  const users = getGroupSelectableUsers();
  if (users.length) {
    appendSectionLabel(container, "Player Contacts");
    for (const user of users) {
      container.appendChild(buildGroupChoiceRow({
        key: `user:${user.id}`,
        name: getUserDisplayName(user),
        avatar: getUserAvatar(user),
        detail: user.active ? "Online" : "Offline",
        npc: false
      }));
    }
  }

  const npcs = getNpcContacts();
  if (npcs.length) {
    appendSectionLabel(container, "NPC Contacts");
    for (const actor of npcs) {
      container.appendChild(buildGroupChoiceRow({
        key: `npc:${actor.id}`,
        name: actor.name,
        avatar: getActorAvatar(actor),
        detail: "NPC",
        npc: true
      }));
    }
  }

  if (!users.length && !npcs.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `<i class="fa-solid fa-address-book"></i><strong>No contacts</strong><span>No contacts are available for a group chat.</span>`;
    container.appendChild(empty);
    return;
  }

  const create = document.createElement("button");
  create.className = "fc-create-group-button";
  create.type = "button";
  create.innerHTML = `<i class="fa-solid fa-comments"></i><span>Create Group</span>`;
  create.addEventListener("click", () => createGroupChat());
  container.appendChild(create);
}

function buildGroupChoiceRow({ key, name, avatar, detail, npc }) {
  const row = document.createElement("label");
  row.className = "fc-npc-manager-row fc-group-choice";

  const img = document.createElement("img");
  img.className = "fc-contact-avatar";
  img.src = avatar;
  img.alt = "";

  const text = document.createElement("div");
  text.className = "fc-contact-text";
  const nameEl = document.createElement("div");
  nameEl.className = "fc-contact-name";
  nameEl.textContent = name;
  const detailEl = document.createElement("div");
  detailEl.className = "fc-contact-preview";
  detailEl.textContent = detail;
  text.append(nameEl, detailEl);

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "fc-npc-toggle";
  checkbox.checked = state.groupDraft.selectedKeys.has(key);
  checkbox.setAttribute("aria-label", `Add ${name} to group`);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) state.groupDraft.selectedKeys.add(key);
    else state.groupDraft.selectedKeys.delete(key);
  });

  row.append(img, text, checkbox);
  if (npc) row.classList.add("is-npc");
  return row;
}

function resetGroupDraft() {
  state.groupDraft = { name: "", selectedKeys: new Set() };
}

function renderDirectContacts(container) {
  if (state.npcManagerOpen) {
    renderNpcManager(container);
    return;
  }

  if (game.user.isGM && state.actingNpcId) {
    renderNpcRecipients(container, state.actingNpcId);
    return;
  }

  if (game.user.isGM) {
    const manage = document.createElement("button");
    manage.className = "fc-manager-button";
    manage.type = "button";
    manage.innerHTML = `<i class="fa-solid fa-address-card"></i><span>Manage NPC Contacts</span>`;
    manage.addEventListener("click", () => {
      state.npcManagerOpen = true;
      renderPhone();
    });
    container.appendChild(manage);
  }

  const userContacts = getUserContacts();
  if (userContacts.length) {
    appendSectionLabel(container, "People");
    for (const user of userContacts) container.appendChild(buildUserContactRow(user));
  }

  const npcContacts = getNpcContacts();
  if (npcContacts.length) {
    appendSectionLabel(container, "NPC Contacts");
    for (const actor of npcContacts) container.appendChild(buildNpcContactRow(actor));
  }

  if (!userContacts.length && !npcContacts.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `<i class="fa-solid fa-address-book"></i><strong>No contacts</strong><span>No cellphone contacts are available.</span>`;
    container.appendChild(empty);
  }
}

function appendSectionLabel(container, text) {
  const label = document.createElement("div");
  label.className = "fc-section-label";
  label.textContent = text;
  container.appendChild(label);
}

function buildUserContactRow(user) {
  const latest = getDirectMessagesWithUser(user.id).at(-1);
  let previewText = user.active ? "Online" : "Offline";
  if (latest) {
    const data = normalizePhoneData(latest);
    const prefix = data.senderType === "user" && data.senderId === game.user.id ? "You: " : "";
    previewText = prefix + truncate(data.body || "", 42);
  }

  const unread = state.unreadDirect.get(`user:${user.id}`) ?? 0;
  const row = buildContactRow({
    name: getUserDisplayName(user),
    avatar: getUserAvatar(user),
    preview: previewText,
    online: user.active,
    unread,
    kindLabel: null
  });

  row.addEventListener("click", () => {
    stopTyping();
    state.selectedContactType = "user";
    state.selectedContactId = user.id;
    state.unreadDirect.set(`user:${user.id}`, 0);
    renderPhone();
    requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
  });

  return row;
}

function buildNpcContactRow(actor) {
  let previewText = game.user.isGM ? "Choose a player to text" : "NPC contact";
  let unread = 0;

  if (game.user.isGM) {
    const latest = getAllNpcMessagesForActor(actor.id).at(-1);
    if (latest) {
      const data = normalizePhoneData(latest);
      const playerId = data.senderType === "user" ? data.senderId : data.recipientId;
      const player = game.users.get(playerId);
      const prefix = data.senderType === "npc" ? `${actor.name}: ` : `${getUserDisplayName(player)}: `;
      previewText = prefix + truncate(data.body || "", 34);
    }
    unread = getNpcUnreadForGm(actor.id);
  } else {
    const latest = getNpcMessages(actor.id, game.user.id).at(-1);
    if (latest) {
      const data = normalizePhoneData(latest);
      const prefix = data.senderType === "user" ? "You: " : "";
      previewText = prefix + truncate(data.body || "", 42);
    }
    unread = state.unreadDirect.get(`npc:${actor.id}`) ?? 0;
  }

  const row = buildContactRow({
    name: actor.name,
    avatar: getActorAvatar(actor),
    preview: previewText,
    online: null,
    unread,
    kindLabel: "NPC"
  });

  row.addEventListener("click", () => {
    stopTyping();
    if (game.user.isGM) {
      state.actingNpcId = actor.id;
      state.selectedContactType = null;
      state.selectedContactId = null;
    } else {
      state.selectedContactType = "npc";
      state.selectedContactId = actor.id;
      state.unreadDirect.set(`npc:${actor.id}`, 0);
    }
    renderPhone();
    requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
  });

  return row;
}

function buildContactRow({ name, avatar, preview, online, unread, kindLabel }) {
  const row = document.createElement("button");
  row.className = "fc-contact";
  row.type = "button";

  const img = document.createElement("img");
  img.className = "fc-contact-avatar";
  img.src = avatar;
  img.alt = "";

  const text = document.createElement("div");
  text.className = "fc-contact-text";

  const nameRow = document.createElement("div");
  nameRow.className = "fc-contact-name-row";
  const nameEl = document.createElement("div");
  nameEl.className = "fc-contact-name";
  nameEl.textContent = name;
  nameRow.appendChild(nameEl);

  if (kindLabel) {
    const kind = document.createElement("span");
    kind.className = "fc-contact-kind";
    kind.textContent = kindLabel;
    nameRow.appendChild(kind);
  }

  const previewEl = document.createElement("div");
  previewEl.className = "fc-contact-preview";
  previewEl.textContent = preview;
  text.append(nameRow, previewEl);

  const right = document.createElement("div");
  right.className = "fc-contact-right";

  if (online !== null) {
    const dot = document.createElement("span");
    dot.className = `fc-presence ${online ? "is-online" : ""}`;
    dot.title = online ? "Online" : "Offline";
    right.appendChild(dot);
  } else {
    const npcIcon = document.createElement("i");
    npcIcon.className = "fa-solid fa-user-secret fc-npc-icon";
    npcIcon.title = "NPC Contact";
    right.appendChild(npcIcon);
  }

  if (unread > 0) {
    const badge = document.createElement("span");
    badge.className = "fc-contact-unread";
    badge.textContent = unread > 99 ? "99+" : String(unread);
    right.appendChild(badge);
  }

  row.append(img, text, right);
  return row;
}

function renderNpcRecipients(container, actorId) {
  const actor = game.actors.get(actorId);
  const players = getNpcRecipientUsers();

  if (!players.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `<i class="fa-solid fa-user-group"></i><strong>No players</strong><span>No non-GM users are available.</span>`;
    container.appendChild(empty);
    return;
  }

  appendSectionLabel(container, `Text as ${actor?.name || "NPC"}`);
  for (const user of players) {
    const messages = getNpcMessages(actorId, user.id);
    const latest = messages.at(-1);
    let previewText = user.active ? "Online" : "Offline";
    if (latest) {
      const data = normalizePhoneData(latest);
      const prefix = data.senderType === "npc" ? `You as ${actor?.name || "NPC"}: ` : "";
      previewText = prefix + truncate(data.body || "", 34);
    }

    const key = `npc:${actorId}:user:${user.id}`;
    const unread = state.unreadDirect.get(key) ?? 0;
    const row = buildContactRow({
      name: getUserDisplayName(user),
      avatar: getUserAvatar(user),
      preview: previewText,
      online: user.active,
      unread,
      kindLabel: null
    });

    row.addEventListener("click", () => {
      stopTyping();
      state.selectedContactType = "user";
      state.selectedContactId = user.id;
      state.unreadDirect.set(key, 0);
      renderPhone();
      requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
    });

    container.appendChild(row);
  }
}

function renderNpcManager(container) {
  if (!game.user.isGM) return;

  const enabledIds = new Set(getNpcContactIds());
  const actors = getNpcCandidates();

  if (!actors.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `<i class="fa-solid fa-masks-theater"></i><strong>No NPC actors</strong><span>Create an Actor that is not assigned to a Foundry user.</span>`;
    container.appendChild(empty);
    return;
  }

  const note = document.createElement("div");
  note.className = "fc-manager-note";
  note.textContent = "Enabled NPCs appear in player DMs and can also be added to group chats.";
  container.appendChild(note);

  for (const actor of actors) {
    const row = document.createElement("label");
    row.className = "fc-npc-manager-row";

    const avatar = document.createElement("img");
    avatar.className = "fc-contact-avatar";
    avatar.src = getActorAvatar(actor);
    avatar.alt = "";

    const text = document.createElement("div");
    text.className = "fc-contact-text";
    const name = document.createElement("div");
    name.className = "fc-contact-name";
    name.textContent = actor.name;
    const preview = document.createElement("div");
    preview.className = "fc-contact-preview";
    preview.textContent = enabledIds.has(actor.id) ? "Available to players" : "Hidden from players";
    text.append(name, preview);

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "fc-npc-toggle";
    toggle.checked = enabledIds.has(actor.id);
    toggle.addEventListener("change", async () => {
      toggle.disabled = true;
      try {
        const current = new Set(getNpcContactIds());
        if (toggle.checked) current.add(actor.id);
        else current.delete(actor.id);
        await game.settings.set(MODULE_ID, NPC_CONTACTS_SETTING, [...current]);
        renderPhone();
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to update NPC contacts`, error);
        ui.notifications.error("NPC contacts could not be updated.");
      } finally {
        toggle.disabled = false;
      }
    });

    row.append(avatar, text, toggle);
    container.appendChild(row);
  }
}

function updateSenderIdentityControl() {
  const row = state.root.querySelector(".fc-sender-row");
  const select = state.root.querySelector(".fc-sender-select");
  row.hidden = true;
  select.replaceChildren();

  if (state.mode !== "group" || !state.selectedGroupId) return;
  const group = getGroupById(state.selectedGroupId);
  if (!group) return;
  const identities = getAvailableGroupSenderIdentities(group);
  if (!identities.length) return;

  if (!state.groupSenderKey || !identities.some((identity) => identity.key === state.groupSenderKey)) {
    state.groupSenderKey = identities[0].key;
  }

  for (const identity of identities) {
    const option = document.createElement("option");
    option.value = identity.key;
    option.textContent = identity.type === "npc" ? `${identity.name} (NPC)` : identity.name;
    option.selected = identity.key === state.groupSenderKey;
    select.appendChild(option);
  }

  row.hidden = identities.length <= 1;
}

function getAvailableGroupSenderIdentities(group) {
  if (!group) return [];
  if (group.id === LEGACY_GROUP_ID) {
    return [{ key: `user:${game.user.id}`, type: "user", id: game.user.id, name: getUserDisplayName(game.user) }];
  }

  const identities = [];
  const myParticipant = group.participants.find((p) => p.type === "user" && p.id === game.user.id);
  if (myParticipant) {
    identities.push({ key: `user:${game.user.id}`, type: "user", id: game.user.id, name: getUserDisplayName(game.user) });
  }

  if (game.user.isGM) {
    for (const participant of group.participants.filter((p) => p.type === "npc")) {
      const actor = game.actors.get(participant.id);
      identities.push({
        key: `npc:${participant.id}`,
        type: "npc",
        id: participant.id,
        name: actor?.name || participant.name || "NPC"
      });
    }
  }

  return identities;
}

function getCurrentSenderIdentity() {
  if (state.mode === "group") {
    const group = getGroupById(state.selectedGroupId);
    if (!group) return null;
    const identities = getAvailableGroupSenderIdentities(group);
    if (!identities.length) return null;
    const selected = identities.find((identity) => identity.key === state.groupSenderKey) || identities[0];
    if (state.groupSenderKey !== selected.key) state.groupSenderKey = selected.key;
    return selected;
  }

  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    const actor = game.actors.get(state.actingNpcId);
    if (!actor) return null;
    return { key: `npc:${actor.id}`, type: "npc", id: actor.id, name: actor.name };
  }

  if (hasOpenDirectConversation()) {
    return { key: `user:${game.user.id}`, type: "user", id: game.user.id, name: getUserDisplayName(game.user) };
  }
  return null;
}

function getConversationMessages() {
  if (state.mode === "group") return getGroupMessages(state.selectedGroupId);

  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    return getNpcMessages(state.actingNpcId, state.selectedContactId);
  }
  if (state.selectedContactType === "npc") return getNpcMessages(state.selectedContactId, game.user.id);
  if (state.selectedContactType === "user") return getDirectMessagesWithUser(state.selectedContactId);
  return [];
}

function getGroupMessages(groupId) {
  if (!groupId) return [];
  return getAllPhoneMessages().filter((message) => {
    const data = normalizePhoneData(message);
    return data.kind === "group" && data.event !== "group-create" && getGroupIdFromData(data) === groupId;
  });
}

function getGroupDefinitions() {
  const map = new Map();
  map.set(LEGACY_GROUP_ID, {
    id: LEGACY_GROUP_ID,
    name: "Party Chat",
    participants: [],
    creatorUserId: null,
    createdAt: 0,
    legacy: true
  });

  for (const message of getAllPhoneMessages()) {
    const data = normalizePhoneData(message);
    if (data.kind !== "group") continue;
    const id = getGroupIdFromData(data);
    if (id === LEGACY_GROUP_ID) continue;

    const existing = map.get(id);
    const candidate = {
      id,
      name: data.groupName || existing?.name || "Group Chat",
      participants: dedupeParticipants(data.participants || existing?.participants || []),
      creatorUserId: data.creatorUserId || existing?.creatorUserId || null,
      createdAt: Number(data.sentAt || existing?.createdAt || 0),
      legacy: false
    };
    map.set(id, candidate);
  }

  const groups = [...map.values()];
  groups.sort((a, b) => {
    if (a.id === LEGACY_GROUP_ID) return -1;
    if (b.id === LEGACY_GROUP_ID) return 1;
    return getGroupLatestTimestamp(b.id) - getGroupLatestTimestamp(a.id);
  });
  return groups;
}

function getGroupById(groupId) {
  if (!groupId) return null;
  return getGroupDefinitions().find((group) => group.id === groupId) || null;
}

function getGroupLatestTimestamp(groupId) {
  const messages = getAllPhoneMessages().filter((message) => {
    const data = normalizePhoneData(message);
    return data.kind === "group" && getGroupIdFromData(data) === groupId;
  });
  return messages.length ? getMessageTimestamp(messages.at(-1)) : 0;
}

function getGroupIdFromData(data) {
  if (!data || data.kind !== "group") return null;
  return data.groupId || LEGACY_GROUP_ID;
}

function getDirectMessagesWithUser(contactId) {
  if (!contactId) return [];
  const myId = game.user.id;
  return getAllPhoneMessages().filter((message) => {
    const data = normalizePhoneData(message);
    if (data.kind !== "dm") return false;
    if (data.senderType !== "user" || data.recipientType !== "user") return false;
    return (data.senderId === myId && data.recipientId === contactId) ||
      (data.senderId === contactId && data.recipientId === myId);
  });
}

function getNpcMessages(actorId, userId) {
  if (!actorId || !userId) return [];
  return getAllPhoneMessages().filter((message) => {
    const data = normalizePhoneData(message);
    if (data.kind !== "dm") return false;
    return (data.senderType === "user" && data.senderId === userId && data.recipientType === "npc" && data.recipientId === actorId) ||
      (data.senderType === "npc" && data.senderId === actorId && data.recipientType === "user" && data.recipientId === userId);
  });
}

function getAllNpcMessagesForActor(actorId) {
  return getAllPhoneMessages().filter((message) => {
    const data = normalizePhoneData(message);
    if (data.kind !== "dm") return false;
    return (data.senderType === "npc" && data.senderId === actorId) ||
      (data.recipientType === "npc" && data.recipientId === actorId);
  });
}

function getAllPhoneMessages() {
  return game.messages.contents
    .filter((message) => isPhoneMessage(message) && isPhoneMessageVisibleToCurrentUser(message))
    .sort((a, b) => getMessageTimestamp(a) - getMessageTimestamp(b));
}

function isPhoneMessage(message) {
  return Boolean(getPhoneData(message)?.[PHONE_FLAG]);
}

function getPhoneData(message) {
  return message?.flags?.[MODULE_ID] ?? null;
}

function normalizePhoneData(message) {
  const data = getPhoneData(message);
  if (!data) return null;

  const normalized = {
    ...data,
    senderType: data.senderType || "user",
    recipientType: data.kind === "dm" ? (data.recipientType || "user") : null,
    authorUserId: data.authorUserId || (data.senderType === "npc" ? null : data.senderId)
  };

  if (normalized.kind === "group") {
    normalized.event = normalized.event || "message";
    normalized.groupId = normalized.groupId || LEGACY_GROUP_ID;
    normalized.groupName = normalized.groupName || (normalized.groupId === LEGACY_GROUP_ID ? "Party Chat" : "Group Chat");
    normalized.participants = Array.isArray(normalized.participants) ? normalized.participants : [];
  }
  return normalized;
}

function isPhoneMessageVisibleToCurrentUser(message) {
  const data = normalizePhoneData(message);
  if (!data) return false;

  if (data.kind === "group") {
    const groupId = getGroupIdFromData(data);
    if (groupId === LEGACY_GROUP_ID) return true;
    if (data.creatorUserId === game.user.id) return true;
    const participants = Array.isArray(data.participants) ? data.participants : [];
    if (participants.some((p) => p.type === "user" && p.id === game.user.id)) return true;
    if (game.user.isGM && participants.some((p) => p.type === "npc")) return true;
    return false;
  }

  if (data.kind !== "dm") return false;
  if (data.senderType === "user" && data.recipientType === "user") {
    return data.senderId === game.user.id || data.recipientId === game.user.id;
  }
  if (data.senderType === "user" && data.recipientType === "npc") {
    return data.senderId === game.user.id || game.user.isGM;
  }
  if (data.senderType === "npc" && data.recipientType === "user") {
    return data.recipientId === game.user.id || game.user.isGM;
  }
  return false;
}

function isMessageAuthoredByCurrentUser(data) {
  if (!data) return false;
  if (data.authorUserId) return data.authorUserId === game.user.id;
  return data.senderType === "user" && data.senderId === game.user.id;
}

function getMessageThreadKeyForCurrentUser(data) {
  if (!data || data.kind !== "dm") return null;

  if (data.senderType === "user" && data.recipientType === "user") {
    if (data.senderId === game.user.id) return `user:${data.recipientId}`;
    if (data.recipientId === game.user.id) return `user:${data.senderId}`;
    return null;
  }
  if (data.senderType === "user" && data.recipientType === "npc") {
    if (game.user.isGM) return `npc:${data.recipientId}:user:${data.senderId}`;
    if (data.senderId === game.user.id) return `npc:${data.recipientId}`;
    return null;
  }
  if (data.senderType === "npc" && data.recipientType === "user") {
    if (game.user.isGM) return `npc:${data.senderId}:user:${data.recipientId}`;
    if (data.recipientId === game.user.id) return `npc:${data.senderId}`;
    return null;
  }
  return null;
}

function getCurrentThreadKey() {
  if (state.mode !== "dm") return null;
  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    return `npc:${state.actingNpcId}:user:${state.selectedContactId}`;
  }
  if (state.selectedContactType === "npc" && state.selectedContactId) return `npc:${state.selectedContactId}`;
  if (state.selectedContactType === "user" && state.selectedContactId) return `user:${state.selectedContactId}`;
  return null;
}

function getMessageTimestamp(message) {
  return Number(normalizePhoneData(message)?.sentAt ?? message.timestamp ?? 0);
}

function getUserContacts() {
  return game.users.contents
    .filter((user) => user.id !== game.user.id)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
    });
}

function getGroupSelectableUsers() {
  return game.users.contents
    .filter((user) => user.id !== game.user.id && !user.isGM)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
    });
}

function getNpcRecipientUsers() {
  return game.users.contents
    .filter((user) => !user.isGM)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
    });
}

function getNpcContactIds() {
  const value = game.settings.get(MODULE_ID, NPC_CONTACTS_SETTING);
  return Array.isArray(value) ? value : [];
}

function getNpcContacts() {
  const ids = getNpcContactIds();
  return ids
    .map((id) => game.actors.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getNpcCandidates() {
  const assignedActorIds = new Set(game.users.contents.map((user) => user.character?.id).filter(Boolean));
  return game.actors.contents
    .filter((actor) => !assignedActorIds.has(actor.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getNpcUnreadForGm(actorId) {
  let total = 0;
  const prefix = `npc:${actorId}:user:`;
  for (const [key, count] of state.unreadDirect.entries()) {
    if (key.startsWith(prefix)) total += count;
  }
  return total;
}

function getGroupWhisperUserIds(group) {
  if (!group || group.id === LEGACY_GROUP_ID) return [];
  const users = group.participants.filter((p) => p.type === "user").map((p) => p.id);
  const hasNpc = group.participants.some((p) => p.type === "npc");
  if (hasNpc) users.push(...getGmUserIds());
  if (group.creatorUserId) users.push(group.creatorUserId);
  return uniqueIds(users);
}

function cloneParticipants(participants) {
  return (participants || []).map((p) => ({ type: p.type, id: p.id, name: p.name }));
}

function dedupeParticipants(participants) {
  const seen = new Set();
  const result = [];
  for (const participant of participants || []) {
    if (!participant?.type || !participant?.id) continue;
    const key = `${participant.type}:${participant.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ type: participant.type, id: participant.id, name: participant.name || getIdentityName(participant.type, participant.id) });
  }
  return result;
}

function buildDefaultGroupName(participants) {
  const names = participants.map((p) => p.name || getIdentityName(p.type, p.id)).filter(Boolean);
  if (!names.length) return "Group Chat";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function describeGroupMembers(group) {
  const names = (group.participants || []).map((p) => p.name || getIdentityName(p.type, p.id)).filter(Boolean);
  if (!names.length) return "Private group";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

function getIdentityName(type, id) {
  if (type === "npc") return game.actors.get(id)?.name || "NPC";
  return getUserDisplayName(game.users.get(id));
}

function getUserDisplayName(user) {
  if (!user) return "Unknown";
  return user.character?.name || user.name || "Unknown";
}

function getUserAvatar(user) {
  return user?.character?.img || user?.avatar || "icons/svg/mystery-man.svg";
}

function getActorAvatar(actor) {
  return actor?.img || "icons/svg/mystery-man.svg";
}

function getGmUserIds() {
  return game.users.contents.filter((user) => user.isGM).map((user) => user.id);
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

function makeId() {
  if (globalThis.foundry?.utils?.randomID) return globalThis.foundry.utils.randomID(16);
  if (globalThis.randomID) return globalThis.randomID(16);
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------
// Typing indicators
// ---------------------------

function onComposerTypingInput() {
  const input = state.root?.querySelector(".fc-message-input");
  if (!input?.value.trim()) {
    stopTyping();
    return;
  }
  startTyping();
}

function startTyping() {
  const context = getCurrentTypingContext();
  const identity = getCurrentSenderIdentity();
  if (!context || !identity) return;

  const senderKey = `${identity.type}:${identity.id}`;
  const changed = state.outgoingTyping.contextKey !== context.key || state.outgoingTyping.senderKey !== senderKey;
  if (state.outgoingTyping.active && changed) stopTyping();

  const now = Date.now();
  const shouldEmit = !state.outgoingTyping.active || changed || (now - state.outgoingTyping.lastEmitAt >= TYPING_KEEPALIVE_MS);

  state.outgoingTyping.active = true;
  state.outgoingTyping.contextKey = context.key;
  state.outgoingTyping.senderKey = senderKey;
  state.outgoingTyping.senderType = identity.type;
  state.outgoingTyping.senderId = identity.id;
  state.outgoingTyping.senderName = identity.name;
  state.outgoingTyping.targetUserIds = [...context.targetUserIds];

  if (shouldEmit) {
    emitTyping(true, context, identity);
    state.outgoingTyping.lastEmitAt = now;
  }

  clearTimeout(state.outgoingTyping.stopTimer);
  state.outgoingTyping.stopTimer = window.setTimeout(() => stopTyping(), TYPING_STOP_MS);
}

function stopTyping() {
  clearTimeout(state.outgoingTyping.stopTimer);
  state.outgoingTyping.stopTimer = null;
  if (!state.outgoingTyping.active) return;

  const context = state.outgoingTyping.contextKey ? {
    key: state.outgoingTyping.contextKey,
    targetUserIds: [...state.outgoingTyping.targetUserIds]
  } : null;
  const identity = {
    type: state.outgoingTyping.senderType,
    id: state.outgoingTyping.senderId,
    name: state.outgoingTyping.senderName
  };
  if (context && identity.id) emitTyping(false, context, identity);

  state.outgoingTyping.active = false;
  state.outgoingTyping.contextKey = null;
  state.outgoingTyping.senderKey = null;
  state.outgoingTyping.senderType = null;
  state.outgoingTyping.senderId = null;
  state.outgoingTyping.senderName = null;
  state.outgoingTyping.targetUserIds = [];
  state.outgoingTyping.lastEmitAt = 0;
}

function emitTyping(active, context, identity) {
  if (!game.socket || !context || !identity?.id) return;
  game.socket.emit(SOCKET_NAME, {
    type: "typing",
    active,
    contextKey: context.key,
    targetUserIds: context.targetUserIds,
    senderType: identity.type,
    senderId: identity.id,
    senderName: identity.name,
    authorUserId: game.user.id,
    sentAt: Date.now()
  });
}

function onSocketMessage(payload) {
  if (!payload || payload.type !== "typing") return;
  if (payload.authorUserId === game.user.id) return;
  if (Array.isArray(payload.targetUserIds) && !payload.targetUserIds.includes(game.user.id)) return;
  if (!payload.contextKey || !payload.senderId) return;

  const contextKey = String(payload.contextKey);
  const senderKey = `${payload.senderType || "user"}:${payload.senderId}`;
  let contextMap = state.incomingTyping.get(contextKey);
  if (!contextMap) {
    contextMap = new Map();
    state.incomingTyping.set(contextKey, contextMap);
  }

  if (payload.active) {
    contextMap.set(senderKey, {
      name: payload.senderName || getIdentityName(payload.senderType, payload.senderId),
      expiresAt: Date.now() + TYPING_EXPIRE_MS
    });
  } else {
    contextMap.delete(senderKey);
    if (!contextMap.size) state.incomingTyping.delete(contextKey);
  }

  renderTypingIndicator();
}

function pruneExpiredTyping() {
  const now = Date.now();
  let changed = false;
  for (const [contextKey, contextMap] of state.incomingTyping.entries()) {
    for (const [senderKey, item] of contextMap.entries()) {
      if (item.expiresAt <= now) {
        contextMap.delete(senderKey);
        changed = true;
      }
    }
    if (!contextMap.size) state.incomingTyping.delete(contextKey);
  }
  if (changed) renderTypingIndicator();
}

function renderTypingIndicator() {
  const el = state.root?.querySelector(".fc-typing-indicator");
  if (!el) return;
  const context = getCurrentTypingContext();
  if (!context) {
    el.hidden = true;
    el.textContent = "";
    return;
  }

  const map = state.incomingTyping.get(context.key);
  const names = map ? [...map.values()].filter((item) => item.expiresAt > Date.now()).map((item) => item.name) : [];
  const uniqueNames = [...new Set(names)];

  if (!uniqueNames.length) {
    el.hidden = true;
    el.textContent = "";
  } else if (uniqueNames.length === 1) {
    el.hidden = false;
    el.textContent = `${uniqueNames[0]} is typing…`;
  } else if (uniqueNames.length === 2) {
    el.hidden = false;
    el.textContent = `${uniqueNames[0]} and ${uniqueNames[1]} are typing…`;
  } else {
    el.hidden = false;
    el.textContent = "Several people are typing…";
  }
}

function getCurrentTypingContext() {
  if (!state.phoneOpen) return null;
  if (state.mode === "group" && state.selectedGroupId) {
    const group = getGroupById(state.selectedGroupId);
    if (!group) return null;
    return {
      key: `group:${group.id}`,
      targetUserIds: group.id === LEGACY_GROUP_ID
        ? game.users.contents.map((u) => u.id)
        : getGroupWhisperUserIds(group)
    };
  }

  if (state.mode === "dm" && hasOpenDirectConversation()) {
    const thread = getCurrentDirectTypingKey();
    if (!thread) return null;
    return {
      key: thread,
      targetUserIds: getCurrentDirectTargetUserIds()
    };
  }
  return null;
}

function getCurrentDirectTypingKey() {
  if (state.mode !== "dm") return null;

  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    return `dm:npc:${state.actingNpcId}:user:${state.selectedContactId}`;
  }

  if (state.selectedContactType === "npc" && state.selectedContactId) {
    return `dm:npc:${state.selectedContactId}:user:${game.user.id}`;
  }

  if (state.selectedContactType === "user" && state.selectedContactId) {
    const ids = [game.user.id, state.selectedContactId].sort();
    return `dm:userpair:${ids[0]}:${ids[1]}`;
  }

  return null;
}

function getCurrentDirectTargetUserIds() {
  if (state.mode !== "dm") return [];
  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    return uniqueIds([...getGmUserIds(), state.selectedContactId]);
  }
  if (state.selectedContactType === "npc" && state.selectedContactId) {
    return uniqueIds([game.user.id, ...getGmUserIds()]);
  }
  if (state.selectedContactType === "user" && state.selectedContactId) {
    return uniqueIds([game.user.id, state.selectedContactId]);
  }
  return [];
}

// ---------------------------
// Badges and utilities
// ---------------------------

function updateBadges() {
  const groupUnread = [...state.unreadGroups.values()].reduce((sum, value) => sum + value, 0);
  const dmUnread = [...state.unreadDirect.values()].reduce((sum, value) => sum + value, 0);
  const total = groupUnread + dmUnread;

  setBadge(state.launcher?.querySelector(".fc-launcher-badge"), total);
  if (!state.root) return;
  setBadge(state.root.querySelector(".fc-group-tab-badge"), groupUnread);
  setBadge(state.root.querySelector(".fc-dm-tab-badge"), dmUnread);
}

function setBadge(element, count) {
  if (!element) return;
  element.hidden = count <= 0;
  element.textContent = count > 99 ? "99+" : String(count);
}

function formatMessageTime(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatSafeChatContent(text) {
  const holder = document.createElement("div");
  holder.textContent = text;
  return holder.innerHTML.replace(/\n/g, "<br>");
}

function truncate(text, max) {
  const value = String(text ?? "");
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function autoSizeTextarea(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 90)}px`;
}

function setupPhoneDragging(phone, handle) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const rect = phone.getBoundingClientRect();
    phone.classList.add("is-dragging");
    phone.style.transform = "none";
    phone.style.left = `${rect.left}px`;
    phone.style.top = `${rect.top}px`;
    phone.style.margin = "0";
    state.drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const rect = phone.getBoundingClientRect();
    const maxLeft = Math.max(0, window.innerWidth - rect.width);
    const maxTop = Math.max(0, window.innerHeight - rect.height);
    const left = Math.min(maxLeft, Math.max(0, event.clientX - state.drag.offsetX));
    const top = Math.min(maxTop, Math.max(0, event.clientY - state.drag.offsetY));
    phone.style.left = `${left}px`;
    phone.style.top = `${top}px`;
  });

  const finish = (event) => {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    phone.classList.remove("is-dragging");
    state.drag = null;
    try { handle.releasePointerCapture(event.pointerId); } catch (_) { /* noop */ }
  };

  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", finish);
}

function keepPhoneOnScreen() {
  const phone = state.root?.querySelector(".fc-phone");
  if (!phone || !state.phoneOpen) return;
  const rect = phone.getBoundingClientRect();
  if (rect.left < 0 || rect.top < 0 || rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
    phone.style.left = "50%";
    phone.style.top = "50%";
    phone.style.transform = "translate(-50%, -50%)";
    phone.style.margin = "0";
  }
}
