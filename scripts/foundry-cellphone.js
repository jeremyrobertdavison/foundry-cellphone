const MODULE_ID = "foundry-cellphone";
const PHONE_FLAG = "phoneMessage";
const MISSION_FLAG = "missionRecord";
const FRIENDPAGE_FLAG = "friendpageRecord";
const NPC_CONTACTS_SETTING = "npcContacts";
const MISSION_SEEN_SETTING = "missionSeen";
const SOCKET_NAME = `module.${MODULE_ID}`;
const LEGACY_GROUP_ID = "party";
const MAX_RENDERED_MESSAGES = 300;
const TYPING_KEEPALIVE_MS = 700;
const TYPING_STOP_MS = 1500;
const TYPING_EXPIRE_MS = 3000;
const CALL_RING_TIMEOUT_MS = 30000;

const state = {
  phoneOpen: false,
  app: "home",
  mode: "group",
  selectedGroupId: null,
  groupCreatorOpen: false,
  groupDraft: { name: "", selectedKeys: new Set() },
  groupSenderKey: null,
  selectedContactType: null,
  selectedContactId: null,
  actingNpcId: null,
  npcManagerOpen: false,
  gmNpcCallOpen: false,
  gmNpcCallActorId: null,
  gmNpcCallUserId: null,
  selectedMissionId: null,
  missionEditorOpen: false,
  missionDraft: { title: "", status: "Active", priority: "Normal", visibility: "all", selectedUserIds: new Set(), description: "" },
  friendpageMode: "feed",
  selectedFriendUserId: null,
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
  call: null,
  callRingTimer: null,
  callTimerInterval: null,
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

  game.settings.register(MODULE_ID, MISSION_SEEN_SETTING, {
    name: "Mission Log Read State",
    hint: "Tracks which mission updates this client has viewed.",
    scope: "client",
    config: false,
    type: Object,
    default: {},
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
  if (!isInternalPhoneRecord(message)) return;
  html?.remove?.();
});

// V12 compatibility hook.
Hooks.on("renderChatMessage", (message, html) => {
  if (!isInternalPhoneRecord(message)) return;
  if (html?.remove) html.remove();
  else if (html?.hide) html.hide();
});

Hooks.on("createChatMessage", (message) => {
  if (isMissionRecord(message)) {
    const data = getMissionData(message);
    if (data && isMissionVisibleToCurrentUser(data)) refreshAll();
    return;
  }

  if (isFriendpageRecord(message)) {
    refreshAll();
    return;
  }

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
      const activelyViewing = state.phoneOpen && state.app === "messages" && state.mode === "group" && state.selectedGroupId === groupId;
      if (!activelyViewing) {
        state.unreadGroups.set(groupId, (state.unreadGroups.get(groupId) ?? 0) + 1);
      }
    }
  } else if (data.kind === "dm") {
    const threadKey = getMessageThreadKeyForCurrentUser(data);
    if (threadKey) {
      const activelyViewing = state.phoneOpen && state.app === "messages" && state.mode === "dm" && getCurrentThreadKey() === threadKey;
      if (!activelyViewing) {
        state.unreadDirect.set(threadKey, (state.unreadDirect.get(threadKey) ?? 0) + 1);
      }
    }
  }

  refreshAll();
});

Hooks.on("updateChatMessage", (message) => {
  if (isMissionRecord(message)) {
    const data = getMissionData(message);
    if (data && state.phoneOpen && state.app === "missions" && state.selectedMissionId === data.id && !state.missionEditorOpen && isMissionVisibleToCurrentUser(data)) {
      markMissionSeen(data.id, data.updatedAt);
    } else {
      refreshAll();
    }
    return;
  }
  if (isPhoneMessage(message) || isFriendpageRecord(message)) refreshAll();
});

Hooks.on("deleteChatMessage", (message) => {
  if (isInternalPhoneRecord(message)) refreshAll();
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

        <section class="fc-home-screen">
          <div class="fc-home-topbar">
            <div class="fc-home-user">
              <img class="fc-home-avatar" src="icons/svg/mystery-man.svg" alt="">
              <div>
                <div class="fc-home-greeting">Cellphone</div>
                <div class="fc-home-name">User</div>
              </div>
            </div>
            <button class="fc-icon-button fc-home-close" type="button" aria-label="Close phone"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="fc-home-date"></div>
          <div class="fc-app-grid">
            <button class="fc-app-icon" type="button" data-app="messages">
              <span class="fc-app-symbol fc-app-symbol-messages"><i class="fa-solid fa-message"></i><span class="fc-app-badge fc-messages-app-badge" hidden>0</span></span>
              <span class="fc-app-label">Messages</span>
            </button>
            <button class="fc-app-icon" type="button" data-app="missions">
              <span class="fc-app-symbol fc-app-symbol-missions"><i class="fa-solid fa-clipboard-list"></i><span class="fc-app-badge fc-missions-app-badge" hidden>0</span></span>
              <span class="fc-app-label">Mission Log</span>
            </button>
            <button class="fc-app-icon" type="button" data-app="friendpage">
              <span class="fc-app-symbol fc-app-symbol-friendpage"><i class="fa-solid fa-user-group"></i></span>
              <span class="fc-app-label">Friendpage</span>
            </button>
          </div>
        </section>

        <section class="fc-call-screen" hidden>
          <div class="fc-call-kicker"></div>
          <img class="fc-call-avatar" src="icons/svg/mystery-man.svg" alt="Caller portrait">
          <div class="fc-call-name">Caller</div>
          <div class="fc-call-status">Incoming call…</div>
          <div class="fc-call-timer" hidden>00:00</div>
          <div class="fc-call-actions">
            <button class="fc-call-action fc-call-accept" type="button" aria-label="Accept call">
              <i class="fa-solid fa-phone"></i>
              <span>Accept</span>
            </button>
            <button class="fc-call-action fc-call-end" type="button" aria-label="End call">
              <i class="fa-solid fa-phone-slash"></i>
              <span class="fc-call-end-label">Decline</span>
            </button>
          </div>
        </section>

        <header class="fc-header">
          <button class="fc-icon-button fc-back" type="button" aria-label="Back" hidden><i class="fa-solid fa-chevron-left"></i></button>
          <div class="fc-header-title-wrap">
            <div class="fc-header-title">Messages</div>
            <div class="fc-header-subtitle"></div>
          </div>
          <div class="fc-header-actions">
            <button class="fc-icon-button fc-call-button" type="button" aria-label="Call contact" title="Call" hidden><i class="fa-solid fa-phone"></i></button>
            <button class="fc-icon-button fc-close" type="button" aria-label="Close phone"><i class="fa-solid fa-xmark"></i></button>
          </div>
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

          <section class="fc-mission-view" hidden>
            <div class="fc-mission-content"></div>
          </section>

          <section class="fc-friendpage-view" hidden>
            <div class="fc-friendpage-content"></div>
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
  root.querySelector(".fc-home-close").addEventListener("click", closePhone);
  root.querySelectorAll(".fc-app-icon").forEach((button) => button.addEventListener("click", () => openApp(button.dataset.app)));
  root.querySelector(".fc-call-button").addEventListener("click", initiateCallFromCurrentConversation);
  root.querySelector(".fc-call-accept").addEventListener("click", acceptIncomingCall);
  root.querySelector(".fc-call-end").addEventListener("click", endCurrentCall);
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
  if (state.call) {
    openPhone();
    return;
  }
  if (state.phoneOpen) closePhone();
  else openPhone();
}

function openPhone() {
  if (!state.root) buildPhone();
  state.phoneOpen = true;
  state.app = "home";
  state.root.hidden = false;
  state.root.classList.add("is-open");
  renderPhone();
}

function openApp(app) {
  if (!['messages', 'missions', 'friendpage'].includes(app)) return;
  stopTyping();
  state.app = app;
  if (app === 'messages') {
    state.mode = 'group';
    state.selectedGroupId = null;
    state.groupCreatorOpen = false;
    state.groupSenderKey = null;
    state.selectedContactType = null;
    state.selectedContactId = null;
    state.actingNpcId = null;
    state.npcManagerOpen = false;
    state.gmNpcCallOpen = false;
  } else if (app === 'missions') {
    state.selectedMissionId = null;
    state.missionEditorOpen = false;
    resetMissionDraft();
  } else if (app === 'friendpage') {
    state.friendpageMode = 'feed';
    state.selectedFriendUserId = null;
  }
  renderPhone();
}

function goHome() {
  stopTyping();
  state.app = 'home';
  state.selectedMissionId = null;
  state.missionEditorOpen = false;
  resetMissionDraft();
  state.friendpageMode = 'feed';
  state.selectedFriendUserId = null;
  renderPhone();
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
  state.gmNpcCallOpen = false;
  state.gmNpcCallActorId = null;
  state.gmNpcCallUserId = null;
  renderPhone();
}

function goBack() {
  stopTyping();

  if (state.app === "friendpage") {
    if (state.friendpageMode === "profiles" && state.selectedFriendUserId) {
      state.selectedFriendUserId = null;
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "missions") {
    if (state.missionEditorOpen) {
      state.missionEditorOpen = false;
      resetMissionDraft();
      renderPhone();
      return;
    }
    if (state.selectedMissionId) {
      state.selectedMissionId = null;
      renderPhone();
      return;
    }
    goHome();
    return;
  }

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

  if (state.gmNpcCallOpen) {
    state.gmNpcCallOpen = false;
    state.gmNpcCallActorId = null;
    state.gmNpcCallUserId = null;
    renderPhone();
    return;
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
    return;
  }

  goHome();
}

function markCurrentConversationRead() {
  if (state.app !== "messages") return;
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
    senderAvatar: identity.type === "npc" ? getActorAvatar(game.actors.get(identity.id)) : getUserAvatar(game.users.get(identity.id)),
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

  const home = state.root.querySelector(".fc-home-screen");
  const callScreen = state.root.querySelector(".fc-call-screen");
  const header = state.root.querySelector(".fc-header");
  const tabs = state.root.querySelector(".fc-tabs");
  const content = state.root.querySelector(".fc-content");
  const conversation = state.root.querySelector(".fc-conversation-view");
  const contactsView = state.root.querySelector(".fc-contacts-view");
  const missionView = state.root.querySelector(".fc-mission-view");
  const friendpageView = state.root.querySelector(".fc-friendpage-view");
  const composer = state.root.querySelector(".fc-composer");
  const inCallUi = Boolean(state.call);

  callScreen.hidden = !inCallUi;
  home.hidden = true;
  header.hidden = true;
  tabs.hidden = true;
  content.hidden = true;
  conversation.hidden = true;
  contactsView.hidden = true;
  missionView.hidden = true;
  friendpageView.hidden = true;

  if (inCallUi) {
    renderCallScreen();
    updateBadges();
    return;
  }

  if (state.app === "home") {
    home.hidden = false;
    renderHomeScreen();
    updateBadges();
    return;
  }

  header.hidden = false;
  content.hidden = false;
  updateHeader();
  updateCallButton();

  if (state.app === "missions") {
    missionView.hidden = false;
    renderMissionView();
    updateBadges();
    return;
  }

  if (state.app === "friendpage") {
    friendpageView.hidden = false;
    renderFriendpageView();
    updateBadges();
    return;
  }

  tabs.hidden = false;
  updateTabs();

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

function renderHomeScreen() {
  const avatar = state.root.querySelector('.fc-home-avatar');
  const name = state.root.querySelector('.fc-home-name');
  const date = state.root.querySelector('.fc-home-date');
  avatar.src = getUserAvatar(game.user);
  name.textContent = getUserDisplayName(game.user);
  date.textContent = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
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

  if (state.app === "friendpage") {
    back.hidden = false;
    title.textContent = state.selectedFriendUserId
      ? getUserDisplayName(game.users.get(state.selectedFriendUserId))
      : "Friendpage";
    subtitle.textContent = state.selectedFriendUserId ? "Profile & wall" : "Your social feed";
    return;
  }

  if (state.app === "missions") {
    back.hidden = false;
    if (state.missionEditorOpen) {
      title.textContent = state.selectedMissionId ? "Edit Mission" : "New Mission";
      subtitle.textContent = "GM Mission Control";
      return;
    }
    if (state.selectedMissionId) {
      const record = getMissionById(state.selectedMissionId);
      title.textContent = record?.data?.title || "Mission";
      subtitle.textContent = record?.data?.status || "Mission Briefing";
      return;
    }
    title.textContent = "Mission Log";
    subtitle.textContent = "Assignments & briefings";
    return;
  }

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
      back.hidden = false;
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

  if (state.gmNpcCallOpen) {
    title.textContent = "Call as NPC";
    subtitle.textContent = "Choose a caller and player";
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
    back.hidden = false;
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

  const showGroupIdentity = state.mode === "group" && (!outgoing || data.senderType === "npc");
  if (showGroupIdentity) {
    const sender = document.createElement("div");
    sender.className = "fc-bubble-sender";

    const avatar = document.createElement("img");
    avatar.className = "fc-bubble-sender-avatar";
    avatar.src = data.senderAvatar || getIdentityAvatar(data.senderType, data.senderId);
    avatar.alt = "";

    const name = document.createElement("span");
    name.className = "fc-bubble-sender-name";
    name.textContent = data.senderName || getIdentityName(data.senderType, data.senderId);

    sender.append(avatar, name);
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
  if (state.gmNpcCallOpen) {
    renderGmNpcCaller(container);
    return;
  }

  if (state.npcManagerOpen) {
    renderNpcManager(container);
    return;
  }

  if (game.user.isGM && state.actingNpcId) {
    renderNpcRecipients(container, state.actingNpcId);
    return;
  }

  if (game.user.isGM) {
    const callAsNpc = document.createElement("button");
    callAsNpc.className = "fc-manager-button fc-gm-call-button";
    callAsNpc.type = "button";
    callAsNpc.innerHTML = `<i class="fa-solid fa-phone-volume"></i><span>Call Player as NPC</span>`;
    callAsNpc.addEventListener("click", () => {
      state.gmNpcCallOpen = true;
      state.gmNpcCallActorId = null;
      state.gmNpcCallUserId = null;
      renderPhone();
    });
    container.appendChild(callAsNpc);

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

function renderGmNpcCaller(container) {
  if (!game.user.isGM) return;

  const actors = getNpcCandidates();
  const players = getNpcRecipientUsers();

  const note = document.createElement("div");
  note.className = "fc-manager-note";
  note.textContent = "Place a roleplay call as any NPC Actor. The NPC does not need to be enabled as a messaging contact.";
  container.appendChild(note);

  if (!actors.length || !players.length) {
    const empty = document.createElement("div");
    empty.className = "fc-empty";
    const reason = !actors.length ? "No NPC Actors are available." : "No player users are available.";
    empty.innerHTML = `<i class="fa-solid fa-phone-slash"></i><strong>Call unavailable</strong><span>${reason}</span>`;
    container.appendChild(empty);
    return;
  }

  if (!state.gmNpcCallActorId || !actors.some((actor) => actor.id === state.gmNpcCallActorId)) {
    state.gmNpcCallActorId = actors[0].id;
  }
  if (!state.gmNpcCallUserId || !players.some((user) => user.id === state.gmNpcCallUserId)) {
    state.gmNpcCallUserId = players.find((user) => user.active)?.id || players[0].id;
  }

  const form = document.createElement("div");
  form.className = "fc-gm-call-form";

  const actorField = document.createElement("label");
  actorField.className = "fc-gm-call-field";
  const actorLabel = document.createElement("span");
  actorLabel.textContent = "Call as";
  const actorSelect = document.createElement("select");
  actorSelect.className = "fc-gm-call-select";
  actorSelect.setAttribute("aria-label", "NPC caller");
  for (const actor of actors) {
    const option = document.createElement("option");
    option.value = actor.id;
    option.textContent = actor.name;
    option.selected = actor.id === state.gmNpcCallActorId;
    actorSelect.appendChild(option);
  }
  actorField.append(actorLabel, actorSelect);

  const playerField = document.createElement("label");
  playerField.className = "fc-gm-call-field";
  const playerLabel = document.createElement("span");
  playerLabel.textContent = "Call player";
  const playerSelect = document.createElement("select");
  playerSelect.className = "fc-gm-call-select";
  playerSelect.setAttribute("aria-label", "Player to call");
  for (const user of players) {
    const option = document.createElement("option");
    option.value = user.id;
    option.textContent = `${getUserDisplayName(user)}${user.active ? "" : " (Offline)"}`;
    option.selected = user.id === state.gmNpcCallUserId;
    playerSelect.appendChild(option);
  }
  playerField.append(playerLabel, playerSelect);

  const preview = document.createElement("div");
  preview.className = "fc-gm-call-preview";

  const placeCall = document.createElement("button");
  placeCall.className = "fc-create-group-button fc-place-npc-call";
  placeCall.type = "button";
  placeCall.innerHTML = `<i class="fa-solid fa-phone"></i><span>Place Call</span>`;

  const updatePreview = () => {
    state.gmNpcCallActorId = actorSelect.value || null;
    state.gmNpcCallUserId = playerSelect.value || null;
    const actor = game.actors.get(state.gmNpcCallActorId);
    const user = game.users.get(state.gmNpcCallUserId);
    preview.replaceChildren();

    if (actor) {
      const img = document.createElement("img");
      img.src = getActorAvatar(actor);
      img.alt = "";
      img.className = "fc-gm-call-preview-avatar";
      const text = document.createElement("div");
      text.className = "fc-contact-text";
      const name = document.createElement("div");
      name.className = "fc-contact-name";
      name.textContent = actor.name;
      const detail = document.createElement("div");
      detail.className = "fc-contact-preview";
      detail.textContent = user ? `Calling ${getUserDisplayName(user)}` : "Choose a player";
      text.append(name, detail);
      preview.append(img, text);
    }

    placeCall.disabled = !actor || !user?.active || Boolean(state.call);
    placeCall.title = !user?.active ? "Selected player is offline" : `Call ${getUserDisplayName(user)} as ${actor?.name || "NPC"}`;
  };

  actorSelect.addEventListener("change", updatePreview);
  playerSelect.addEventListener("change", updatePreview);
  placeCall.addEventListener("click", () => {
    const actor = game.actors.get(state.gmNpcCallActorId);
    const user = game.users.get(state.gmNpcCallUserId);
    if (!actor || !user) return;
    startCallWithContext({
      callerIdentity: identityFromActor(actor),
      calleeIdentity: identityFromUser(user),
      targetUserId: user.id
    });
  });

  form.append(actorField, playerField, preview, placeCall);
  container.appendChild(form);
  updatePreview();
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


// ---------------------------
// Friendpage social app
// ---------------------------

function isFriendpageRecord(message) {
  return Boolean(getFriendpageData(message));
}

function getFriendpageData(message) {
  return message?.getFlag?.(MODULE_ID, FRIENDPAGE_FLAG) ?? message?.flags?.[MODULE_ID]?.[FRIENDPAGE_FLAG] ?? null;
}

function getFriendpageRecords() {
  return game.messages.contents
    .filter(isFriendpageRecord)
    .map((document) => ({ document, data: getFriendpageData(document) }))
    .filter((record) => record.data && record.data.type)
    .sort((a, b) => Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0));
}

function getFriendpagePosts() {
  return getFriendpageRecords()
    .filter((record) => record.data.type === 'post')
    .sort((a, b) => Number(b.data.createdAt || 0) - Number(a.data.createdAt || 0));
}

function getFriendpageComments(postId) {
  return getFriendpageRecords()
    .filter((record) => record.data.type === 'comment' && record.data.postId === postId)
    .sort((a, b) => Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0));
}

function getFriendpageReactionState(postId) {
  const latestByUser = new Map();
  for (const record of getFriendpageRecords()) {
    const data = record.data;
    if (data.type !== 'reaction' || data.postId !== postId || !data.authorUserId) continue;
    const current = latestByUser.get(data.authorUserId);
    if (!current || Number(data.createdAt || 0) >= Number(current.createdAt || 0)) latestByUser.set(data.authorUserId, data);
  }
  let likes = 0;
  let dislikes = 0;
  for (const data of latestByUser.values()) {
    if (data.reaction === 'like') likes += 1;
    if (data.reaction === 'dislike') dislikes += 1;
  }
  return { likes, dislikes, mine: latestByUser.get(game.user.id)?.reaction || 'none' };
}

function getFriendpageUsers() {
  return [...game.users.contents].sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)));
}

function getFriendpageHandle(user) {
  const base = getUserDisplayName(user).toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return `@${base || 'user'}`;
}

function renderFriendpageView() {
  const container = state.root.querySelector('.fc-friendpage-content');
  container.replaceChildren();

  const tabs = document.createElement('div');
  tabs.className = 'fc-friend-tabs';
  for (const [mode, icon, label] of [['feed', 'fa-house', 'Feed'], ['profiles', 'fa-address-book', 'Profiles']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `fc-friend-tab${state.friendpageMode === mode ? ' is-active' : ''}`;
    button.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`;
    button.addEventListener('click', () => {
      state.friendpageMode = mode;
      if (mode === 'feed') state.selectedFriendUserId = null;
      renderPhone();
    });
    tabs.appendChild(button);
  }
  container.appendChild(tabs);

  if (state.friendpageMode === 'profiles') {
    if (state.selectedFriendUserId) renderFriendpageProfile(container, state.selectedFriendUserId);
    else renderFriendpageProfileList(container);
    return;
  }

  renderFriendpageComposer(container, game.user.id);
  renderFriendpagePostList(container, getFriendpagePosts());
}

function renderFriendpageProfileList(container) {
  const intro = document.createElement('div');
  intro.className = 'fc-friend-section-title';
  intro.textContent = 'Profiles';
  container.appendChild(intro);

  for (const user of getFriendpageUsers()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-friend-profile-row';
    const avatar = document.createElement('img');
    avatar.src = getUserAvatar(user);
    avatar.alt = '';
    const text = document.createElement('div');
    text.className = 'fc-friend-profile-text';
    const name = document.createElement('strong');
    name.textContent = getUserDisplayName(user);
    const handle = document.createElement('span');
    handle.textContent = getFriendpageHandle(user);
    text.append(name, handle);
    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-chevron-right';
    button.append(avatar, text, arrow);
    button.addEventListener('click', () => {
      state.selectedFriendUserId = user.id;
      renderPhone();
    });
    container.appendChild(button);
  }
}

function renderFriendpageProfile(container, userId) {
  const user = game.users.get(userId);
  if (!user) {
    state.selectedFriendUserId = null;
    renderPhone();
    return;
  }

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'fc-friend-profile-back';
  back.innerHTML = '<i class="fa-solid fa-chevron-left"></i><span>All Profiles</span>';
  back.addEventListener('click', () => { state.selectedFriendUserId = null; renderPhone(); });

  const hero = document.createElement('div');
  hero.className = 'fc-friend-profile-hero';
  const avatar = document.createElement('img');
  avatar.src = getUserAvatar(user);
  avatar.alt = '';
  const info = document.createElement('div');
  const name = document.createElement('h2');
  name.textContent = getUserDisplayName(user);
  const handle = document.createElement('div');
  handle.className = 'fc-friend-handle';
  handle.textContent = getFriendpageHandle(user);
  info.append(name, handle);
  hero.append(avatar, info);
  container.append(back, hero);

  renderFriendpageComposer(container, user.id);
  const wallPosts = getFriendpagePosts().filter((record) => record.data.targetUserId === user.id);
  renderFriendpagePostList(container, wallPosts, 'Wall');
}

function renderFriendpageComposer(container, targetUserId) {
  const target = game.users.get(targetUserId) || game.user;
  const form = document.createElement('form');
  form.className = 'fc-friend-composer';
  const row = document.createElement('div');
  row.className = 'fc-friend-composer-top';
  const avatar = document.createElement('img');
  avatar.src = getUserAvatar(game.user);
  avatar.alt = '';
  const textarea = document.createElement('textarea');
  textarea.rows = 2;
  textarea.maxLength = 2000;
  textarea.placeholder = target.id === game.user.id ? "What's happening?" : `Write on ${getUserDisplayName(target)}'s wall...`;
  row.append(avatar, textarea);
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'fc-friend-post-button';
  submit.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Post</span>';
  form.append(row, submit);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = textarea.value.trim();
    if (!body) return;
    submit.disabled = true;
    try {
      await createFriendpagePost(body, target.id);
      textarea.value = '';
      renderPhone();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to create Friendpage post`, error);
      ui.notifications.error('Friendpage could not publish the post. Check the console for details.');
    } finally {
      submit.disabled = false;
    }
  });
  container.appendChild(form);
}

function renderFriendpagePostList(container, posts, label = 'Global Feed') {
  const heading = document.createElement('div');
  heading.className = 'fc-friend-section-title';
  heading.textContent = label;
  container.appendChild(heading);

  if (!posts.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-friend-empty';
    empty.innerHTML = '<i class="fa-regular fa-face-smile"></i><strong>No posts yet</strong><span>Be the first to say something.</span>';
    container.appendChild(empty);
    return;
  }

  for (const record of posts) renderFriendpagePost(container, record);
}

function renderFriendpagePost(container, record) {
  const data = record.data;
  const author = game.users.get(data.authorUserId);
  const target = game.users.get(data.targetUserId);
  const card = document.createElement('article');
  card.className = 'fc-friend-post';

  const header = document.createElement('div');
  header.className = 'fc-friend-post-header';
  const avatar = document.createElement('img');
  avatar.src = getUserAvatar(author);
  avatar.alt = '';
  const identity = document.createElement('div');
  identity.className = 'fc-friend-post-identity';
  const nameLine = document.createElement('div');
  nameLine.className = 'fc-friend-post-name';
  const authorButton = document.createElement('button');
  authorButton.type = 'button';
  authorButton.className = 'fc-friend-link';
  authorButton.textContent = getUserDisplayName(author);
  authorButton.addEventListener('click', () => openFriendpageProfile(data.authorUserId));
  nameLine.appendChild(authorButton);
  if (target && data.targetUserId !== data.authorUserId) {
    const arrow = document.createElement('span');
    arrow.textContent = ' → ';
    const targetButton = document.createElement('button');
    targetButton.type = 'button';
    targetButton.className = 'fc-friend-link';
    targetButton.textContent = getUserDisplayName(target);
    targetButton.addEventListener('click', () => openFriendpageProfile(data.targetUserId));
    nameLine.append(arrow, targetButton);
  }
  const meta = document.createElement('div');
  meta.className = 'fc-friend-post-meta';
  meta.textContent = `${getFriendpageHandle(author)} · ${formatFriendpageDate(data.createdAt)}`;
  identity.append(nameLine, meta);
  header.append(avatar, identity);

  const body = document.createElement('div');
  body.className = 'fc-friend-post-body';
  body.textContent = data.body || '';

  const reaction = getFriendpageReactionState(data.id);
  const comments = getFriendpageComments(data.id);
  const actions = document.createElement('div');
  actions.className = 'fc-friend-actions';
  const like = buildFriendReactionButton('like', reaction.likes, reaction.mine === 'like', data.id);
  const dislike = buildFriendReactionButton('dislike', reaction.dislikes, reaction.mine === 'dislike', data.id);
  const commentCount = document.createElement('span');
  commentCount.className = 'fc-friend-comment-count';
  commentCount.innerHTML = `<i class="fa-regular fa-comment"></i><span>${comments.length}</span>`;
  actions.append(like, dislike, commentCount);

  card.append(header, body, actions);

  if (comments.length) {
    const commentList = document.createElement('div');
    commentList.className = 'fc-friend-comments';
    for (const comment of comments) {
      const row = document.createElement('div');
      row.className = 'fc-friend-comment';
      const commentAuthor = game.users.get(comment.data.authorUserId);
      const img = document.createElement('img');
      img.src = getUserAvatar(commentAuthor);
      img.alt = '';
      const bubble = document.createElement('div');
      bubble.className = 'fc-friend-comment-bubble';
      const who = document.createElement('strong');
      who.textContent = getUserDisplayName(commentAuthor);
      const text = document.createElement('span');
      text.textContent = comment.data.body || '';
      bubble.append(who, text);
      row.append(img, bubble);
      commentList.appendChild(row);
    }
    card.appendChild(commentList);
  }

  const commentForm = document.createElement('form');
  commentForm.className = 'fc-friend-comment-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 1000;
  input.placeholder = 'Write a comment...';
  const send = document.createElement('button');
  send.type = 'submit';
  send.setAttribute('aria-label', 'Post comment');
  send.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  commentForm.append(input, send);
  commentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    send.disabled = true;
    try {
      await createFriendpageComment(data.id, text);
      renderPhone();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to create Friendpage comment`, error);
      ui.notifications.error('Friendpage could not publish the comment.');
    } finally {
      send.disabled = false;
    }
  });
  card.appendChild(commentForm);
  container.appendChild(card);
}

function buildFriendReactionButton(kind, count, active, postId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `fc-friend-reaction${active ? ' is-active' : ''}`;
  button.innerHTML = kind === 'like'
    ? `<i class="fa-solid fa-thumbs-up"></i><span>${count}</span>`
    : `<i class="fa-solid fa-thumbs-down"></i><span>${count}</span>`;
  button.title = kind === 'like' ? 'Like' : 'Dislike';
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await createFriendpageReaction(postId, active ? 'none' : kind);
      renderPhone();
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function openFriendpageProfile(userId) {
  if (!game.users.get(userId)) return;
  state.app = 'friendpage';
  state.friendpageMode = 'profiles';
  state.selectedFriendUserId = userId;
  renderPhone();
}

async function createFriendpagePost(body, targetUserId) {
  const now = Date.now();
  const data = {
    schema: 1,
    type: 'post',
    id: makeId(),
    authorUserId: game.user.id,
    targetUserId: targetUserId || game.user.id,
    body,
    createdAt: now
  };
  return createFriendpageDocument(data, `[Friendpage] ${getUserDisplayName(game.user)} posted`);
}

async function createFriendpageComment(postId, body) {
  const data = {
    schema: 1,
    type: 'comment',
    id: makeId(),
    postId,
    authorUserId: game.user.id,
    body,
    createdAt: Date.now()
  };
  return createFriendpageDocument(data, `[Friendpage] ${getUserDisplayName(game.user)} commented`);
}

async function createFriendpageReaction(postId, reaction) {
  const data = {
    schema: 1,
    type: 'reaction',
    id: makeId(),
    postId,
    authorUserId: game.user.id,
    reaction,
    createdAt: Date.now()
  };
  return createFriendpageDocument(data, `[Friendpage] reaction`);
}

function createFriendpageDocument(data, content) {
  return createChatMessageDocument({
    content: formatSafeChatContent(content),
    speaker: { alias: getUserDisplayName(game.user) },
    flags: { [MODULE_ID]: { [FRIENDPAGE_FLAG]: data } }
  });
}

function formatFriendpageDate(timestamp) {
  const date = new Date(Number(timestamp) || Date.now());
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ---------------------------
// Mission Log
// ---------------------------

function isInternalPhoneRecord(message) {
  return isPhoneMessage(message) || isMissionRecord(message) || isFriendpageRecord(message);
}

function isMissionRecord(message) {
  return Boolean(getMissionData(message));
}

function getMissionData(message) {
  return message?.getFlag?.(MODULE_ID, MISSION_FLAG) ?? message?.flags?.[MODULE_ID]?.[MISSION_FLAG] ?? null;
}

function isMissionVisibleToCurrentUser(data) {
  if (!data) return false;
  if (game.user?.isGM) return true;
  if (data.visibility === 'all') return true;
  return Array.isArray(data.selectedUserIds) && data.selectedUserIds.includes(game.user.id);
}

function getMissionRecords() {
  const latestById = new Map();
  for (const document of game.messages.contents.filter(isMissionRecord)) {
    const data = getMissionData(document);
    if (!data || !isMissionVisibleToCurrentUser(data)) continue;
    const key = data.id || document.id;
    const current = latestById.get(key);
    if (!current || Number(data.updatedAt || 0) >= Number(current.data.updatedAt || 0)) {
      latestById.set(key, { document, data });
    }
  }
  return [...latestById.values()].sort((a, b) => {
    const rank = { Active: 0, Pending: 1, 'On Hold': 2, Completed: 3, Failed: 4 };
    const statusDelta = (rank[a.data.status] ?? 9) - (rank[b.data.status] ?? 9);
    if (statusDelta) return statusDelta;
    return Number(b.data.updatedAt || 0) - Number(a.data.updatedAt || 0);
  });
}

function getMissionById(id) {
  return getMissionRecords().find((record) => record.data.id === id) ?? null;
}

function getMissionSeenMap() {
  const value = game.settings.get(MODULE_ID, MISSION_SEEN_SETTING);
  const allUsers = value && typeof value === 'object' ? value : {};
  const userSeen = allUsers[game.user.id];
  return userSeen && typeof userSeen === 'object' ? { ...userSeen } : {};
}

function isMissionUnread(data) {
  if (!data?.id) return false;
  const seen = getMissionSeenMap();
  return Number(seen[data.id] || 0) < Number(data.updatedAt || data.createdAt || 0);
}

function getMissionUnreadCount() {
  return getMissionRecords().filter((record) => isMissionUnread(record.data)).length;
}

async function markMissionSeen(id, version) {
  if (!id) return;
  const rootValue = game.settings.get(MODULE_ID, MISSION_SEEN_SETTING);
  const allUsers = rootValue && typeof rootValue === 'object' ? { ...rootValue } : {};
  const seen = allUsers[game.user.id] && typeof allUsers[game.user.id] === 'object' ? { ...allUsers[game.user.id] } : {};
  const next = Math.max(Number(seen[id] || 0), Number(version || Date.now()));
  if (Number(seen[id] || 0) >= next) {
    refreshAll();
    return;
  }
  seen[id] = next;
  allUsers[game.user.id] = seen;
  await game.settings.set(MODULE_ID, MISSION_SEEN_SETTING, allUsers);
}

function resetMissionDraft(data = null) {
  state.missionDraft = {
    title: data?.title || '',
    status: data?.status || 'Active',
    priority: data?.priority || 'Normal',
    visibility: data?.visibility || 'all',
    selectedUserIds: new Set(Array.isArray(data?.selectedUserIds) ? data.selectedUserIds : []),
    description: data?.description || ''
  };
}

function renderMissionView() {
  const container = state.root.querySelector('.fc-mission-content');
  container.replaceChildren();
  if (state.missionEditorOpen && game.user.isGM) {
    renderMissionEditor(container);
    return;
  }
  if (state.selectedMissionId) {
    renderMissionDetail(container);
    return;
  }
  renderMissionList(container);
}

function renderMissionList(container) {
  if (game.user.isGM) {
    const add = document.createElement('button');
    add.className = 'fc-manager-button fc-mission-add';
    add.type = 'button';
    add.innerHTML = `<i class="fa-solid fa-plus"></i><span>Add Mission</span>`;
    add.addEventListener('click', () => {
      state.selectedMissionId = null;
      state.missionEditorOpen = true;
      resetMissionDraft();
      renderPhone();
    });
    container.appendChild(add);
  }

  const missions = getMissionRecords();
  if (!missions.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-empty';
    empty.innerHTML = `<i class="fa-solid fa-clipboard-list"></i><strong>No missions assigned</strong><span>New assignments from the GM will appear here.</span>`;
    container.appendChild(empty);
    return;
  }

  for (const record of missions) {
    const { data } = record;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `fc-mission-card fc-mission-status-${String(data.status || 'Active').toLowerCase().replace(/\s+/g, '-')}`;

    const top = document.createElement('div');
    top.className = 'fc-mission-card-top';
    const title = document.createElement('div');
    title.className = 'fc-mission-card-title';
    title.textContent = data.title || 'Untitled Mission';
    top.appendChild(title);
    if (isMissionUnread(data)) {
      const badge = document.createElement('span');
      badge.className = 'fc-mission-new';
      badge.textContent = 'NEW';
      top.appendChild(badge);
    }

    const meta = document.createElement('div');
    meta.className = 'fc-mission-card-meta';
    meta.innerHTML = `<span>${escapeMissionText(data.status || 'Active')}</span><span>${escapeMissionText(data.priority || 'Normal')} Priority</span>`;

    const preview = document.createElement('div');
    preview.className = 'fc-mission-card-preview';
    preview.textContent = truncate(data.description || 'Open mission briefing.', 86);

    const audience = document.createElement('div');
    audience.className = 'fc-mission-card-audience';
    audience.innerHTML = `<i class="fa-solid fa-user-shield"></i><span>${escapeMissionText(getMissionAudienceLabel(data))}</span>`;

    card.append(top, meta, preview, audience);
    card.addEventListener('click', async () => {
      state.selectedMissionId = data.id;
      state.missionEditorOpen = false;
      await markMissionSeen(data.id, data.updatedAt);
      renderPhone();
    });
    container.appendChild(card);
  }
}

function renderMissionDetail(container) {
  const record = getMissionById(state.selectedMissionId);
  if (!record) {
    state.selectedMissionId = null;
    renderMissionList(container);
    return;
  }
  const { data } = record;

  const hero = document.createElement('div');
  hero.className = 'fc-mission-detail-hero';
  const icon = document.createElement('div');
  icon.className = 'fc-mission-detail-icon';
  icon.innerHTML = `<i class="fa-solid fa-shield-halved"></i>`;
  const title = document.createElement('h2');
  title.textContent = data.title || 'Untitled Mission';
  hero.append(icon, title);

  const chips = document.createElement('div');
  chips.className = 'fc-mission-chips';
  chips.innerHTML = `<span>${escapeMissionText(data.status || 'Active')}</span><span>${escapeMissionText(data.priority || 'Normal')} Priority</span>`;

  const audience = document.createElement('div');
  audience.className = 'fc-mission-detail-audience';
  audience.innerHTML = `<i class="fa-solid fa-users"></i><div><strong>Assigned</strong><span>${escapeMissionText(getMissionAudienceLabel(data))}</span></div>`;

  const body = document.createElement('div');
  body.className = 'fc-mission-detail-body';
  body.textContent = data.description || 'No additional briefing has been provided.';

  const updated = document.createElement('div');
  updated.className = 'fc-mission-updated';
  updated.textContent = `Updated ${formatMissionDate(data.updatedAt || data.createdAt)}`;

  container.append(hero, chips, audience, body, updated);

  if (game.user.isGM) {
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'fc-manager-button fc-mission-edit';
    edit.innerHTML = `<i class="fa-solid fa-pen"></i><span>Edit Mission</span>`;
    edit.addEventListener('click', () => {
      resetMissionDraft(data);
      state.missionEditorOpen = true;
      renderPhone();
    });
    container.appendChild(edit);
  }
}

function renderMissionEditor(container) {
  const draft = state.missionDraft;
  const form = document.createElement('form');
  form.className = 'fc-mission-form';

  form.innerHTML = `
    <label class="fc-mission-field">Mission title<input class="fc-mission-title-input" type="text" maxlength="100" required></label>
    <div class="fc-mission-field-grid">
      <label class="fc-mission-field">Status<select class="fc-mission-status-select"><option>Active</option><option>Pending</option><option>On Hold</option><option>Completed</option><option>Failed</option></select></label>
      <label class="fc-mission-field">Priority<select class="fc-mission-priority-select"><option>Low</option><option>Normal</option><option>High</option><option>Critical</option></select></label>
    </div>
    <label class="fc-mission-field">Briefing<textarea class="fc-mission-description-input" rows="7" maxlength="8000" placeholder="Mission briefing, objectives, intelligence, or instructions..."></textarea></label>
    <label class="fc-mission-field">Visibility<select class="fc-mission-visibility-select"><option value="all">Everyone</option><option value="selected">Selected Players</option></select></label>
    <div class="fc-mission-audience-picker"></div>
    <button class="fc-create-group-button fc-mission-save" type="submit"><i class="fa-solid fa-floppy-disk"></i><span>Save Mission</span></button>
  `;

  const titleInput = form.querySelector('.fc-mission-title-input');
  const statusSelect = form.querySelector('.fc-mission-status-select');
  const prioritySelect = form.querySelector('.fc-mission-priority-select');
  const descriptionInput = form.querySelector('.fc-mission-description-input');
  const visibilitySelect = form.querySelector('.fc-mission-visibility-select');
  titleInput.value = draft.title;
  statusSelect.value = draft.status;
  prioritySelect.value = draft.priority;
  descriptionInput.value = draft.description;
  visibilitySelect.value = draft.visibility;

  const syncDraft = () => {
    draft.title = titleInput.value;
    draft.status = statusSelect.value;
    draft.priority = prioritySelect.value;
    draft.description = descriptionInput.value;
    draft.visibility = visibilitySelect.value;
  };
  [titleInput, statusSelect, prioritySelect, descriptionInput].forEach((el) => el.addEventListener('input', syncDraft));
  visibilitySelect.addEventListener('change', () => { syncDraft(); renderMissionAudiencePicker(form.querySelector('.fc-mission-audience-picker')); });

  renderMissionAudiencePicker(form.querySelector('.fc-mission-audience-picker'));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    syncDraft();
    await saveMissionDraft();
  });
  container.appendChild(form);

  if (state.selectedMissionId) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'fc-manager-button fc-mission-delete';
    del.innerHTML = `<i class="fa-solid fa-trash"></i><span>Delete Mission</span>`;
    del.addEventListener('click', () => deleteSelectedMission());
    container.appendChild(del);
  }
}

function renderMissionAudiencePicker(container) {
  container.replaceChildren();
  if (state.missionDraft.visibility !== 'selected') {
    const note = document.createElement('div');
    note.className = 'fc-manager-note';
    note.textContent = 'This mission will be visible to every player.';
    container.appendChild(note);
    return;
  }

  appendSectionLabel(container, 'Visible to');
  const users = game.users.contents.filter((user) => !user.isGM);
  if (!users.length) {
    const note = document.createElement('div');
    note.className = 'fc-manager-note';
    note.textContent = 'No player users are available.';
    container.appendChild(note);
    return;
  }

  for (const user of users) {
    const row = document.createElement('label');
    row.className = 'fc-npc-manager-row fc-mission-player-choice';
    const img = document.createElement('img');
    img.className = 'fc-contact-avatar';
    img.src = getUserAvatar(user);
    img.alt = '';
    const text = document.createElement('div');
    text.className = 'fc-contact-text';
    text.innerHTML = `<div class="fc-contact-name">${escapeMissionText(getUserDisplayName(user))}</div><div class="fc-contact-preview">${user.active ? 'Online' : 'Offline'}</div>`;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'fc-npc-toggle';
    checkbox.checked = state.missionDraft.selectedUserIds.has(user.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) state.missionDraft.selectedUserIds.add(user.id);
      else state.missionDraft.selectedUserIds.delete(user.id);
    });
    row.append(img, text, checkbox);
    container.appendChild(row);
  }
}

async function saveMissionDraft() {
  if (!game.user.isGM) return;
  const draft = state.missionDraft;
  const title = draft.title.trim();
  if (!title) {
    ui.notifications.warn('Enter a mission title.');
    return;
  }
  const selectedUserIds = [...draft.selectedUserIds].filter((id) => game.users.get(id) && !game.users.get(id).isGM);
  if (draft.visibility === 'selected' && !selectedUserIds.length) {
    ui.notifications.warn('Select at least one player for a restricted mission.');
    return;
  }

  const existing = state.selectedMissionId ? getMissionById(state.selectedMissionId) : null;
  const now = Date.now();
  const data = {
    schema: 1,
    id: existing?.data?.id || makeId(),
    title,
    description: draft.description.trim(),
    status: draft.status,
    priority: draft.priority,
    visibility: draft.visibility,
    selectedUserIds: draft.visibility === 'selected' ? selectedUserIds : [],
    createdAt: existing?.data?.createdAt || now,
    updatedAt: now,
    createdByUserId: existing?.data?.createdByUserId || game.user.id,
    updatedByUserId: game.user.id
  };
  const whisper = data.visibility === 'selected' ? uniqueIds([...data.selectedUserIds, ...getGmUserIds()]) : [];

  try {
    const document = await createChatMessageDocument({
      content: `[Mission Log] ${formatSafeChatContent(data.title)}`,
      speaker: { alias: 'Mission Log' },
      whisper,
      flags: { [MODULE_ID]: { [MISSION_FLAG]: data } }
    });
    if (existing) await existing.document.delete();
    state.selectedMissionId = data.id;
    state.missionEditorOpen = false;
    resetMissionDraft();
    await markMissionSeen(data.id, data.updatedAt);
    ui.notifications.info(existing ? 'Mission updated.' : 'Mission added.');
    renderPhone();
    return document;
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to save mission`, error);
    ui.notifications.error('The mission could not be saved. Check the console for details.');
  }
}

async function deleteSelectedMission() {
  if (!game.user.isGM || !state.selectedMissionId) return;
  const record = getMissionById(state.selectedMissionId);
  if (!record) return;
  const confirmed = window.confirm(`Delete "${record.data.title}" from every assigned phone?`);
  if (!confirmed) return;
  await record.document.delete();
  state.selectedMissionId = null;
  state.missionEditorOpen = false;
  resetMissionDraft();
  ui.notifications.info('Mission deleted.');
  renderPhone();
}

function getMissionAudienceLabel(data) {
  if (data.visibility === 'all') return 'All Players';
  const names = (data.selectedUserIds || []).map((id) => getUserDisplayName(game.users.get(id))).filter(Boolean);
  if (!names.length) return 'Selected Players';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function formatMissionDate(timestamp) {
  return new Date(Number(timestamp) || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function escapeMissionText(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
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

function getIdentityAvatar(type, id) {
  if (type === "npc") return getActorAvatar(game.actors.get(id));
  return getUserAvatar(game.users.get(id));
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
// Call signaling and call UI
// ---------------------------

function updateCallButton() {
  const button = state.root?.querySelector(".fc-call-button");
  if (!button) return;

  if (state.app !== "messages") {
    button.hidden = true;
    return;
  }

  const context = getCallInitiationContext();
  button.hidden = !context;
  if (!context) return;

  const target = game.users.get(context.targetUserId);
  button.disabled = !target?.active;
  button.title = target?.active ? `Call ${context.calleeIdentity.name}` : `${context.calleeIdentity.name} is offline`;
}

function getCallInitiationContext() {
  if (state.call || state.mode !== "dm" || !hasOpenDirectConversation()) return null;

  if (game.user.isGM && state.actingNpcId && state.selectedContactId) {
    const actor = game.actors.get(state.actingNpcId);
    const user = game.users.get(state.selectedContactId);
    if (!actor || !user) return null;
    return {
      callerIdentity: identityFromActor(actor),
      calleeIdentity: identityFromUser(user),
      targetUserId: user.id
    };
  }

  if (state.selectedContactType === "user" && state.selectedContactId) {
    const user = game.users.get(state.selectedContactId);
    if (!user) return null;
    return {
      callerIdentity: identityFromUser(game.user),
      calleeIdentity: identityFromUser(user),
      targetUserId: user.id
    };
  }

  return null;
}

function identityFromUser(user) {
  return {
    type: "user",
    id: user.id,
    name: getUserDisplayName(user),
    avatar: getUserAvatar(user)
  };
}

function identityFromActor(actor) {
  return {
    type: "npc",
    id: actor.id,
    name: actor.name,
    avatar: getActorAvatar(actor)
  };
}

function normalizeCallIdentity(identity) {
  if (!identity) return { type: "user", id: null, name: "Unknown", avatar: "icons/svg/mystery-man.svg" };
  return {
    type: identity.type === "npc" ? "npc" : "user",
    id: identity.id ?? null,
    name: identity.name || "Unknown",
    avatar: identity.avatar || "icons/svg/mystery-man.svg"
  };
}

function initiateCallFromCurrentConversation() {
  const context = getCallInitiationContext();
  if (!context) return;
  startCallWithContext(context);
}

function startCallWithContext(context) {
  if (!context || state.call) return;

  const target = game.users.get(context.targetUserId);
  if (!target?.active) {
    ui.notifications.warn(`${context.calleeIdentity?.name || "That player"} is offline.`);
    return;
  }

  stopTyping();
  const callId = makeId();
  state.call = {
    callId,
    phase: "outgoing",
    localRole: "caller",
    callerUserId: game.user.id,
    calleeUserId: target.id,
    callerIdentity: normalizeCallIdentity(context.callerIdentity),
    calleeIdentity: normalizeCallIdentity(context.calleeIdentity),
    startedAt: null
  };

  openPhoneForCall();
  scheduleRingTimeout();
  emitCallSignal("call-offer", {
    callId,
    targetUserId: target.id,
    callerUserId: game.user.id,
    calleeUserId: target.id,
    callerIdentity: state.call.callerIdentity,
    calleeIdentity: state.call.calleeIdentity
  });
}

function acceptIncomingCall() {
  if (state.call?.phase !== "incoming") return;

  clearCallRingTimer();
  const startedAt = Date.now();
  state.call.phase = "active";
  state.call.startedAt = startedAt;
  startCallTimer();

  emitCallSignal("call-answer", {
    callId: state.call.callId,
    targetUserId: state.call.callerUserId,
    callerUserId: state.call.callerUserId,
    calleeUserId: state.call.calleeUserId,
    startedAt
  });
  renderPhone();
}

function endCurrentCall() {
  if (!state.call) return;

  const call = state.call;
  const peerUserId = call.localRole === "caller" ? call.calleeUserId : call.callerUserId;
  const signalType = call.phase === "incoming" ? "call-decline" : "call-end";

  emitCallSignal(signalType, {
    callId: call.callId,
    targetUserId: peerUserId,
    callerUserId: call.callerUserId,
    calleeUserId: call.calleeUserId
  });
  resetCallToHome();
}

function emitCallSignal(type, data) {
  if (!game.socket) return;
  game.socket.emit(SOCKET_NAME, {
    type,
    ...data,
    authorUserId: game.user.id,
    sentAt: Date.now()
  });
}

function handleCallSignal(payload) {
  if (!payload?.type?.startsWith("call-")) return;
  if (payload.targetUserId && payload.targetUserId !== game.user.id) return;

  if (payload.type === "call-offer") {
    handleIncomingCallOffer(payload);
    return;
  }

  if (!state.call || payload.callId !== state.call.callId) return;

  if (payload.type === "call-answer") {
    if (state.call.phase !== "outgoing" || state.call.localRole !== "caller") return;
    clearCallRingTimer();
    state.call.phase = "active";
    state.call.startedAt = Number(payload.startedAt) || Date.now();
    startCallTimer();
    openPhoneForCall();
    return;
  }

  if (payload.type === "call-busy") {
    ui.notifications.info(`${state.call.calleeIdentity?.name || "That contact"} is already on another call.`);
    resetCallToHome();
    return;
  }

  if (payload.type === "call-decline") {
    ui.notifications.info(`${state.call.calleeIdentity?.name || "The contact"} declined the call.`);
    resetCallToHome();
    return;
  }

  if (payload.type === "call-end") {
    resetCallToHome();
  }
}

function handleIncomingCallOffer(payload) {
  if (!payload.callId || !payload.callerUserId || !payload.calleeUserId) return;

  if (state.call) {
    emitCallSignal("call-busy", {
      callId: payload.callId,
      targetUserId: payload.callerUserId,
      callerUserId: payload.callerUserId,
      calleeUserId: payload.calleeUserId
    });
    return;
  }

  stopTyping();
  state.call = {
    callId: payload.callId,
    phase: "incoming",
    localRole: "callee",
    callerUserId: payload.callerUserId,
    calleeUserId: payload.calleeUserId,
    callerIdentity: normalizeCallIdentity(payload.callerIdentity),
    calleeIdentity: normalizeCallIdentity(payload.calleeIdentity),
    startedAt: null
  };

  openPhoneForCall();
  scheduleRingTimeout();
}

function openPhoneForCall() {
  if (!state.root) buildPhone();
  state.phoneOpen = true;
  state.root.hidden = false;
  state.root.classList.add("is-open");
  renderPhone();
}

function renderCallScreen() {
  if (!state.call || !state.root) return;

  const remoteIdentity = state.call.localRole === "caller" ? state.call.calleeIdentity : state.call.callerIdentity;
  const kicker = state.root.querySelector(".fc-call-kicker");
  const avatar = state.root.querySelector(".fc-call-avatar");
  const name = state.root.querySelector(".fc-call-name");
  const status = state.root.querySelector(".fc-call-status");
  const timer = state.root.querySelector(".fc-call-timer");
  const accept = state.root.querySelector(".fc-call-accept");
  const end = state.root.querySelector(".fc-call-end");
  const endLabel = state.root.querySelector(".fc-call-end-label");

  avatar.src = remoteIdentity?.avatar || "icons/svg/mystery-man.svg";
  avatar.alt = `${remoteIdentity?.name || "Caller"} portrait`;
  name.textContent = remoteIdentity?.name || "Unknown Caller";
  kicker.textContent = remoteIdentity?.type === "npc" ? "NPC CALL" : "PHONE CALL";

  accept.hidden = state.call.phase !== "incoming";
  end.hidden = false;

  if (state.call.phase === "incoming") {
    status.textContent = "Incoming call…";
    timer.hidden = true;
    endLabel.textContent = "Decline";
  } else if (state.call.phase === "outgoing") {
    status.textContent = "Calling…";
    timer.hidden = true;
    endLabel.textContent = "Cancel";
  } else {
    status.textContent = "Connected";
    timer.hidden = false;
    endLabel.textContent = "Hang Up";
    updateCallTimerDisplay();
  }
}

function startCallTimer() {
  clearCallTimer();
  updateCallTimerDisplay();
  state.callTimerInterval = window.setInterval(updateCallTimerDisplay, 1000);
}

function updateCallTimerDisplay() {
  if (!state.call || state.call.phase !== "active" || !state.call.startedAt) return;
  const el = state.root?.querySelector(".fc-call-timer");
  if (!el) return;

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - state.call.startedAt) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  el.textContent = hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function scheduleRingTimeout() {
  clearCallRingTimer();
  const callId = state.call?.callId;
  state.callRingTimer = window.setTimeout(() => {
    if (!state.call || state.call.callId !== callId || !["incoming", "outgoing"].includes(state.call.phase)) return;

    if (state.call.localRole === "caller") {
      emitCallSignal("call-end", {
        callId: state.call.callId,
        targetUserId: state.call.calleeUserId,
        callerUserId: state.call.callerUserId,
        calleeUserId: state.call.calleeUserId
      });
      ui.notifications.info("No answer.");
    }
    resetCallToHome();
  }, CALL_RING_TIMEOUT_MS);
}

function clearCallRingTimer() {
  clearTimeout(state.callRingTimer);
  state.callRingTimer = null;
}

function clearCallTimer() {
  clearInterval(state.callTimerInterval);
  state.callTimerInterval = null;
}

function resetCallToHome() {
  clearCallRingTimer();
  clearCallTimer();
  state.call = null;
  state.phoneOpen = true;
  state.app = "home";
  state.mode = "group";
  state.selectedGroupId = null;
  state.groupCreatorOpen = false;
  state.groupSenderKey = null;
  state.selectedContactType = null;
  state.selectedContactId = null;
  state.actingNpcId = null;
  state.npcManagerOpen = false;
  state.gmNpcCallOpen = false;
  state.gmNpcCallActorId = null;
  state.gmNpcCallUserId = null;

  if (state.root) {
    state.root.hidden = false;
    state.root.classList.add("is-open");
    renderPhone();
  }
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
  if (!payload) return;

  if (payload.type?.startsWith("call-")) {
    handleCallSignal(payload);
    return;
  }

  if (payload.type !== "typing") return;
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
  const messageUnread = groupUnread + dmUnread;
  const missionUnread = getMissionUnreadCount();
  const total = messageUnread + missionUnread;

  setBadge(state.launcher?.querySelector(".fc-launcher-badge"), total);
  if (!state.root) return;
  setBadge(state.root.querySelector(".fc-group-tab-badge"), groupUnread);
  setBadge(state.root.querySelector(".fc-dm-tab-badge"), dmUnread);
  setBadge(state.root.querySelector(".fc-messages-app-badge"), messageUnread);
  setBadge(state.root.querySelector(".fc-missions-app-badge"), missionUnread);
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
