const MODULE_ID = "foundry-cellphone";
const PHONE_FLAG = "phoneMessage";
const NPC_CONTACTS_SETTING = "npcContacts";
const MAX_RENDERED_MESSAGES = 300;

const state = {
  phoneOpen: false,
  mode: "group",
  selectedContactType: null,
  selectedContactId: null,
  actingNpcId: null,
  npcManagerOpen: false,
  unreadGroup: 0,
  unreadDirect: new Map(),
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
    const activelyViewing = state.phoneOpen && state.mode === "group";
    if (!activelyViewing) state.unreadGroup += 1;
  } else if (data.kind === "dm") {
    const threadKey = getMessageThreadKeyForCurrentUser(data);
    if (threadKey) {
      const activelyViewing = state.phoneOpen && state.mode === "dm" && getCurrentThreadKey() === threadKey;
      if (!activelyViewing) {
        const current = state.unreadDirect.get(threadKey) ?? 0;
        state.unreadDirect.set(threadKey, current + 1);
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
            <span>Group</span>
            <span class="fc-tab-badge fc-group-tab-badge" hidden>0</span>
          </button>
          <button class="fc-tab" type="button" data-mode="dm">
            <i class="fa-solid fa-comment-dots"></i>
            <span>Direct</span>
            <span class="fc-tab-badge fc-dm-tab-badge" hidden>0</span>
          </button>
        </nav>

        <main class="fc-content">
          <section class="fc-conversation-view">
            <div class="fc-messages" aria-live="polite"></div>
            <form class="fc-composer">
              <textarea class="fc-message-input" rows="1" maxlength="2000" placeholder="Message"></textarea>
              <button class="fc-send" type="submit" aria-label="Send message"><i class="fa-solid fa-arrow-up"></i></button>
            </form>
          </section>

          <section class="fc-contacts-view" hidden>
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
  form.addEventListener("submit", onSendMessage);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
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
    if (!input.hidden && input.offsetParent !== null) input.focus();
  });
}

function closePhone() {
  state.phoneOpen = false;
  if (!state.root) return;
  state.root.classList.remove("is-open");
  state.root.hidden = true;
  updateBadges();
}

function setMode(mode) {
  if (!["group", "dm"].includes(mode)) return;
  state.mode = mode;
  state.selectedContactType = null;
  state.selectedContactId = null;
  state.actingNpcId = null;
  state.npcManagerOpen = false;
  markCurrentConversationRead();
  renderPhone();
}

function goBack() {
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
    state.unreadGroup = 0;
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

  if (state.mode === "dm" && !hasOpenDirectConversation()) {
    ui.notifications.warn("Choose a contact first.");
    return;
  }

  input.disabled = true;
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
  const now = Date.now();
  let phoneData;
  let speaker;
  let whisper = [];

  if (state.mode === "group") {
    const senderName = getUserDisplayName(game.user);
    phoneData = {
      [PHONE_FLAG]: true,
      schema: 2,
      kind: "group",
      senderType: "user",
      senderId: game.user.id,
      senderName,
      recipientType: null,
      recipientId: null,
      recipientName: null,
      authorUserId: game.user.id,
      body,
      sentAt: now
    };
    speaker = { alias: senderName };
  } else if (game.user.isGM && state.actingNpcId) {
    const actor = game.actors.get(state.actingNpcId);
    const recipient = game.users.get(state.selectedContactId);
    if (!actor || !recipient) throw new Error("NPC or recipient could not be found.");

    phoneData = {
      [PHONE_FLAG]: true,
      schema: 2,
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
        schema: 2,
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
        schema: 2,
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

  const data = {
    content: formatSafeChatContent(body),
    speaker,
    flags: {
      [MODULE_ID]: phoneData
    }
  };

  if (phoneData.kind === "dm") data.whisper = whisper;

  const ChatMessageClass = foundry?.documents?.ChatMessage ?? globalThis.ChatMessage;
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

  if (state.mode === "dm" && !hasOpenDirectConversation()) {
    conversation.hidden = true;
    contactsView.hidden = false;
    composer.hidden = true;
    renderContacts();
  } else {
    conversation.hidden = false;
    contactsView.hidden = true;
    composer.hidden = false;
    renderMessages();
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
    title.textContent = "Party Chat";
    const online = game.users.contents.filter((u) => u.active).length;
    subtitle.textContent = `${online} online`;
    back.hidden = true;
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
      <span>${state.mode === "group" ? "Start the party chat." : "Start a direct conversation."}</span>
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
    sender.textContent = data.senderName || getUserDisplayName(game.users.get(data.senderId));
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
  if (state.mode === "group") return data.senderType === "user" && data.senderId === game.user.id;
  if (game.user.isGM && state.actingNpcId) return data.senderType === "npc" && data.senderId === state.actingNpcId;
  return data.senderType === "user" && data.senderId === game.user.id;
}

function renderContacts() {
  const container = state.root.querySelector(".fc-contacts");
  container.replaceChildren();

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
  note.textContent = "Enabled NPCs appear in every player's Direct Messages contact list.";
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

function getConversationMessages() {
  if (state.mode === "group") {
    return getAllPhoneMessages().filter((message) => normalizePhoneData(message).kind === "group");
  }

  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    return getNpcMessages(state.actingNpcId, state.selectedContactId);
  }

  if (state.selectedContactType === "npc") {
    return getNpcMessages(state.selectedContactId, game.user.id);
  }

  if (state.selectedContactType === "user") {
    return getDirectMessagesWithUser(state.selectedContactId);
  }

  return [];
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

  return {
    ...data,
    senderType: data.senderType || "user",
    recipientType: data.kind === "dm" ? (data.recipientType || "user") : null,
    authorUserId: data.authorUserId || (data.senderType === "npc" ? null : data.senderId)
  };
}

function isPhoneMessageVisibleToCurrentUser(message) {
  const data = normalizePhoneData(message);
  if (!data) return false;
  if (data.kind === "group") return true;
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
  if (state.selectedContactType === "npc" && state.selectedContactId) {
    return `npc:${state.selectedContactId}`;
  }
  if (state.selectedContactType === "user" && state.selectedContactId) {
    return `user:${state.selectedContactId}`;
  }
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

function updateBadges() {
  const dmUnread = [...state.unreadDirect.values()].reduce((sum, value) => sum + value, 0);
  const total = state.unreadGroup + dmUnread;

  const launcherBadge = state.launcher?.querySelector(".fc-launcher-badge");
  setBadge(launcherBadge, total);

  if (!state.root) return;
  setBadge(state.root.querySelector(".fc-group-tab-badge"), state.unreadGroup);
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
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function autoSizeTextarea(textarea) {
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

// Keep the composer pleasant as messages wrap.
document.addEventListener("input", (event) => {
  if (event.target?.classList?.contains("fc-message-input")) autoSizeTextarea(event.target);
});
