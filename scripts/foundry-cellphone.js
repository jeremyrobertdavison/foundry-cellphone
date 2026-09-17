const MODULE_ID = "foundry-cellphone";
const PHONE_FLAG = "phoneMessage";
const MAX_RENDERED_MESSAGES = 300;

const state = {
  phoneOpen: false,
  mode: "group",
  selectedContactId: null,
  unreadGroup: 0,
  unreadDirect: new Map(),
  root: null,
  launcher: null,
  drag: null
};

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

  const data = getPhoneData(message);
  if (!data || data.senderId === game.user.id) {
    refreshAll();
    return;
  }

  if (data.kind === "group") {
    const activelyViewing = state.phoneOpen && state.mode === "group";
    if (!activelyViewing) state.unreadGroup += 1;
  } else if (data.kind === "dm" && data.recipientId === game.user.id) {
    const activelyViewing = state.phoneOpen && state.mode === "dm" && state.selectedContactId === data.senderId;
    if (!activelyViewing) {
      const current = state.unreadDirect.get(data.senderId) ?? 0;
      state.unreadDirect.set(data.senderId, current + 1);
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

  root.querySelector(".fc-back").addEventListener("click", () => {
    state.selectedContactId = null;
    renderPhone();
  });

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
  if (!['group', 'dm'].includes(mode)) return;
  state.mode = mode;
  if (mode === "group") state.selectedContactId = null;
  markCurrentConversationRead();
  renderPhone();
}

function markCurrentConversationRead() {
  if (state.mode === "group") {
    state.unreadGroup = 0;
  } else if (state.selectedContactId) {
    state.unreadDirect.set(state.selectedContactId, 0);
  }
  updateBadges();
}

async function onSendMessage(event) {
  event.preventDefault();
  const input = state.root.querySelector(".fc-message-input");
  const body = input.value.trim();
  if (!body) return;

  if (state.mode === "dm" && !state.selectedContactId) {
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

async function createPhoneMessage(body) {
  const senderId = game.user.id;
  const senderName = getUserDisplayName(game.user);
  const now = Date.now();
  const flags = {
    [MODULE_ID]: {
      [PHONE_FLAG]: true,
      schema: 1,
      kind: state.mode,
      senderId,
      senderName,
      recipientId: state.mode === "dm" ? state.selectedContactId : null,
      body,
      sentAt: now
    }
  };

  const data = {
    content: formatSafeChatContent(body),
    speaker: { alias: senderName },
    flags
  };

  if (state.mode === "dm") {
    data.whisper = [senderId, state.selectedContactId];
  }

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

  if (state.mode === "dm" && !state.selectedContactId) {
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
    const online = getContacts().filter((u) => u.active).length + (game.user.active ? 1 : 0);
    subtitle.textContent = `${online} online`;
    back.hidden = true;
    return;
  }

  if (!state.selectedContactId) {
    title.textContent = "Direct Messages";
    subtitle.textContent = "Choose a contact";
    back.hidden = true;
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
  const data = getPhoneData(message);
  const outgoing = data.senderId === game.user.id;
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

function renderContacts() {
  const container = state.root.querySelector(".fc-contacts");
  container.replaceChildren();

  const contacts = getContacts();
  if (!contacts.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    empty.innerHTML = `<i class="fa-solid fa-address-book"></i><strong>No contacts</strong><span>No other Foundry users are available.</span>`;
    container.appendChild(empty);
    return;
  }

  for (const user of contacts) {
    const row = document.createElement("button");
    row.className = "fc-contact";
    row.type = "button";
    row.dataset.userId = user.id;

    const avatar = document.createElement("img");
    avatar.className = "fc-contact-avatar";
    avatar.src = getUserAvatar(user);
    avatar.alt = "";

    const text = document.createElement("div");
    text.className = "fc-contact-text";

    const name = document.createElement("div");
    name.className = "fc-contact-name";
    name.textContent = getUserDisplayName(user);

    const preview = document.createElement("div");
    preview.className = "fc-contact-preview";
    const latest = getDirectMessagesWith(user.id).at(-1);
    if (latest) {
      const latestData = getPhoneData(latest);
      const prefix = latestData.senderId === game.user.id ? "You: " : "";
      preview.textContent = prefix + truncate(latestData.body || "", 42);
    } else {
      preview.textContent = user.active ? "Online" : "Offline";
    }

    text.append(name, preview);

    const right = document.createElement("div");
    right.className = "fc-contact-right";

    const dot = document.createElement("span");
    dot.className = `fc-presence ${user.active ? "is-online" : ""}`;
    dot.title = user.active ? "Online" : "Offline";
    right.appendChild(dot);

    const unread = state.unreadDirect.get(user.id) ?? 0;
    if (unread > 0) {
      const badge = document.createElement("span");
      badge.className = "fc-contact-unread";
      badge.textContent = unread > 99 ? "99+" : String(unread);
      right.appendChild(badge);
    }

    row.append(avatar, text, right);
    row.addEventListener("click", () => {
      state.selectedContactId = user.id;
      state.unreadDirect.set(user.id, 0);
      renderPhone();
      requestAnimationFrame(() => state.root.querySelector(".fc-message-input")?.focus());
    });

    container.appendChild(row);
  }
}

function getConversationMessages() {
  if (state.mode === "group") {
    return getAllPhoneMessages().filter((message) => getPhoneData(message).kind === "group");
  }
  return getDirectMessagesWith(state.selectedContactId);
}

function getDirectMessagesWith(contactId) {
  if (!contactId) return [];
  const myId = game.user.id;
  return getAllPhoneMessages().filter((message) => {
    const data = getPhoneData(message);
    if (data.kind !== "dm") return false;
    return (data.senderId === myId && data.recipientId === contactId) ||
      (data.senderId === contactId && data.recipientId === myId);
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

function isPhoneMessageVisibleToCurrentUser(message) {
  const data = getPhoneData(message);
  if (!data) return false;
  if (data.kind === "group") return true;
  if (data.kind !== "dm") return false;
  return data.senderId === game.user.id || data.recipientId === game.user.id;
}

function getMessageTimestamp(message) {
  return Number(getPhoneData(message)?.sentAt ?? message.timestamp ?? 0);
}

function getContacts() {
  return game.users.contents
    .filter((user) => user.id !== game.user.id)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return getUserDisplayName(a).localeCompare(getUserDisplayName(b));
    });
}

function getUserDisplayName(user) {
  if (!user) return "Unknown";
  return user.character?.name || user.name || "Unknown";
}

function getUserAvatar(user) {
  return user?.character?.img || user?.avatar || "icons/svg/mystery-man.svg";
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
