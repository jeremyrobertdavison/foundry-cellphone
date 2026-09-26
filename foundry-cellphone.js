const MODULE_ID = "foundry-cellphone";
const PHONE_FLAG = "phoneMessage";
const MISSION_FLAG = "missionRecord";
const FRIENDPAGE_FLAG = "friendpageRecord";
const NOTE_FLAG = "noteRecord";
const NEWS_FLAG = "newsRecord";
const MAP_FLAG = "mapRecord";
const NPC_CONTACTS_SETTING = "npcContacts";
const MISSION_SEEN_SETTING = "missionSeen";
const FRIENDPAGE_PROFILES_SETTING = "friendpageProfiles";
const BROWSER_BOOKMARKS_SETTING = "browserBookmarks";
const ARCADE_STATS_SETTING = "arcadeStats";
const MONDO_RIDES_SETTING = "mondoRidesScenes";
const PHONE_SCALE_SETTING = "phoneScalePercent";
const PHONE_TEXT_SCALE_SETTING = "phoneTextScalePercent";
const PHONE_TEXT_FOLLOW_SIZE_SETTING = "phoneTextFollowsSize";
const SOCKET_NAME = `module.${MODULE_ID}`;
const LEGACY_GROUP_ID = "party";
const MAX_RENDERED_MESSAGES = 300;
const TYPING_KEEPALIVE_MS = 700;
const TYPING_STOP_MS = 1500;
const TYPING_EXPIRE_MS = 3000;
const CALL_RING_TIMEOUT_MS = 30000;
const SNAKE_BOARD_SIZE = 14;
const SNAKE_TICK_MS = 175;
const MINESWEEPER_SIZE = 8;
const MINESWEEPER_MINE_COUNT = 10;
const RUNNER_TICK_MS = 50;
const STACK_IT_TICK_MS = 35;
const BLOCK_DROP_WIDTH = 10;
const BLOCK_DROP_HEIGHT = 20;
const BLOCK_DROP_BASE_TICK_MS = 550;
const PHONE_TOOL_NAME = `${MODULE_ID}-open-phone`;

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
  selectedFriendProfileKey: null,
  friendpageActingKey: null,
  friendpageProfileManagerOpen: false,
  browserQuery: "",
  browserSearchResults: [],
  selectedBrowserPage: null,
  browserBookmarkManagerOpen: false,
  selectedNoteId: null,
  noteEditorOpen: false,
  noteDraft: { title: "", body: "" },
  selectedNewsId: null,
  newsEditorOpen: false,
  newsDraft: { headline: "", blurb: "", author: "", publisher: "", publishedAt: "" },
  selectedMapId: null,
  mapManagerOpen: false,
  mapEditorOpen: false,
  mapExpanded: false,
  mapEditorDraft: { id: null, name: "", image: "", visibility: "all", selectedUserIds: new Set(), markers: [], createdAt: null, sortIndex: 0 },
  mondoManagerOpen: false,
  mondoRidePending: null,
  arcadeGame: "menu",
  snake: {
    segments: [],
    food: null,
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    score: 0,
    running: false,
    paused: false,
    gameOver: false,
    interval: null
  },
  ticTacToe: { board: Array(9).fill(null), turn: "X", status: "playing", aiTimer: null },
  minesweeper: { cells: [], status: "ready", flagMode: false, minesPlaced: false },
  runner: { running: false, paused: false, gameOver: false, interval: null, playerY: 0, velocityY: 0, obstacles: [], score: 0, ticks: 0, spawnIn: 34 },
  guessNumber: { target: Math.floor(Math.random() * 100) + 1, attempts: 0, status: "playing", feedback: "I picked a number from 1 to 100." },
  stackIt: { layers: [], moving: null, running: false, paused: false, gameOver: false, interval: null, score: 0, direction: 1, speed: 1.25 },
  blockDrop: { board: [], current: null, next: null, running: false, paused: false, gameOver: false, interval: null, score: 0, lines: 0 },
  chess: { board: [], turn: "w", status: "playing", selected: null, legalTargets: [], message: "Your move", aiTimer: null },
  farkle: { playerScore: 0, phoneScore: 0, turnScore: 0, diceCount: 6, dice: [], selected: new Set(), status: "player", message: "Roll the dice to start.", rolled: false, phoneTimer: null },
  musicLastVolume: 0.7,
  musicVolumeTimer: null,
  musicLastAmbientVolume: 0.7,
  musicAmbientVolumeTimer: null,
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

  game.settings.register(MODULE_ID, FRIENDPAGE_PROFILES_SETTING, {
    name: "Friendpage Active Profiles",
    hint: "Controls which Foundry users and NPC Actors have active Friendpage profiles.",
    scope: "world",
    config: false,
    type: Object,
    default: { configured: false, keys: [] },
    onChange: () => {
      state.selectedFriendProfileKey = null;
      state.friendpageProfileManagerOpen = false;
      validateFriendpageActingIdentity();
      refreshAll();
    }
  });

  game.settings.register(MODULE_ID, BROWSER_BOOKMARKS_SETTING, {
    name: "Browser Shortcuts",
    hint: "GM-configured external web shortcuts shown in the cellphone Browser app.",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      state.browserBookmarkManagerOpen = false;
      refreshAll();
    }
  });

  game.settings.register(MODULE_ID, ARCADE_STATS_SETTING, {
    name: "Arcade Stats",
    hint: "Local high scores and results for the cellphone Arcade app.",
    scope: "client",
    config: false,
    type: Object,
    default: { snakeBest: 0, ticTacToeWins: 0, ticTacToeLosses: 0, ticTacToeDraws: 0, minesweeperWins: 0, runnerBest: 0, guessNumberWins: 0, guessNumberBestAttempts: 0, stackItBest: 0, blockDropBest: 0, chessWins: 0, chessLosses: 0, chessDraws: 0, farkleWins: 0, farkleLosses: 0 },
    onChange: () => refreshAll()
  });

  game.settings.register(MODULE_ID, MONDO_RIDES_SETTING, {
    name: "Mondo Rides Destinations",
    hint: "Scenes currently available to players through the Mondo Rides cellphone app.",
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => refreshAll()
  });

  game.settings.register(MODULE_ID, PHONE_SCALE_SETTING, {
    name: "Cellphone Size",
    hint: "Personal cellphone size percentage for this Foundry client.",
    scope: "client",
    config: false,
    type: Number,
    default: 100,
    onChange: () => {
      applyPhoneScale();
      if (state.phoneOpen && state.app === "settings") renderSettingsView();
    }
  });

  game.settings.register(MODULE_ID, PHONE_TEXT_SCALE_SETTING, {
    name: "Cellphone Text Size",
    hint: "Personal cellphone text size percentage for this Foundry client when text size is not following phone size.",
    scope: "client",
    config: false,
    type: Number,
    default: 100,
    onChange: () => {
      applyPhoneScale();
      if (state.phoneOpen && state.app === "settings") renderSettingsView();
    }
  });

  game.settings.register(MODULE_ID, PHONE_TEXT_FOLLOW_SIZE_SETTING, {
    name: "Cellphone Text Follows Phone Size",
    hint: "When enabled, cellphone text scales automatically with the phone size setting.",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: () => {
      applyPhoneScale();
      if (state.phoneOpen && state.app === "settings") renderSettingsView();
    }
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  addCellphoneToolbarTool(controls);
});

Hooks.on("renderSceneControls", () => {
  window.setTimeout(decorateCellphoneToolbarButton, 0);
});

Hooks.once("ready", () => {
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
  if (isMapRecord(message)) {
    const data = getMapData(message);
    if (data && isMapVisibleToCurrentUser(data)) refreshAll();
    return;
  }

  if (isNewsRecord(message)) {
    refreshAll();
    return;
  }

  if (isNoteRecord(message)) {
    const data = getNoteData(message);
    if (data?.ownerUserId === game.user?.id) refreshAll();
    return;
  }

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
  if (isMapRecord(message)) {
    refreshAll();
    return;
  }

  if (isNewsRecord(message)) {
    refreshAll();
    return;
  }

  if (isNoteRecord(message)) {
    const data = getNoteData(message);
    if (data?.ownerUserId === game.user?.id) refreshAll();
    return;
  }

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

// Keep the Music app in sync with Foundry's native playlist playback.
for (const hookName of ["createPlaylistSound", "updatePlaylistSound", "deletePlaylistSound", "updatePlaylist"]) {
  Hooks.on(hookName, () => {
    if (state.phoneOpen && state.app === "music") refreshAll();
  });
}

function addCellphoneToolbarTool(controls) {
  const makeV13Tool = (order) => ({
    name: PHONE_TOOL_NAME,
    title: "Open Cellphone",
    icon: "fa-solid fa-mobile-screen-button",
    order,
    button: true,
    visible: true,
    onChange: () => togglePhone()
  });

  const makeV12Tool = () => ({
    name: PHONE_TOOL_NAME,
    title: "Open Cellphone",
    icon: "fa-solid fa-mobile-screen-button",
    visible: true,
    toggle: false,
    active: false,
    button: true,
    onClick: () => togglePhone()
  });

  // Foundry v13+ exposes SceneControls as a record whose tools are also records.
  if (!Array.isArray(controls)) {
    for (const control of Object.values(controls ?? {})) {
      if (!control?.tools || typeof control.tools !== "object" || Array.isArray(control.tools)) continue;
      if (control.tools[PHONE_TOOL_NAME]) continue;
      const orders = Object.values(control.tools).map((tool) => Number(tool?.order ?? 0)).filter(Number.isFinite);
      const order = (orders.length ? Math.max(...orders) : 0) + 10;
      control.tools[PHONE_TOOL_NAME] = makeV13Tool(order);
    }
    return;
  }

  // Foundry v12 exposes SceneControls and their tools as arrays.
  for (const control of controls) {
    if (!Array.isArray(control?.tools)) continue;
    if (control.tools.some((tool) => tool?.name === PHONE_TOOL_NAME)) continue;
    control.tools.push(makeV12Tool());
  }
}

function decorateCellphoneToolbarButton() {
  const selector = `[data-tool="${PHONE_TOOL_NAME}"], [data-control="${PHONE_TOOL_NAME}"]`;
  const buttons = [...document.querySelectorAll(selector)];
  if (!buttons.length) {
    state.launcher = null;
    return;
  }

  // Only one SceneControl palette is normally visible, but decorate every matching
  // element so the badge survives Foundry changing the active control layer.
  for (const button of buttons) {
    button.classList.add("fc-toolbar-phone-button");
    button.title = "Open Cellphone";
    button.setAttribute("aria-label", "Open Cellphone");
    if (!button.querySelector(".fc-launcher-badge")) {
      const badge = document.createElement("span");
      badge.className = "fc-launcher-badge";
      badge.hidden = true;
      badge.textContent = "0";
      button.appendChild(badge);
    }
  }

  state.launcher = buttons.find((button) => button.offsetParent !== null) || buttons[0];
  updateBadges();
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
            <button class="fc-app-icon" type="button" data-app="browser">
              <span class="fc-app-symbol fc-app-symbol-browser"><i class="fa-solid fa-compass"></i></span>
              <span class="fc-app-label">Browser</span>
            </button>
            <button class="fc-app-icon fc-app-icon-notes" type="button" data-app="notes">
              <span class="fc-app-symbol fc-app-symbol-notes"><i class="fa-solid fa-note-sticky"></i></span>
              <span class="fc-app-label">Notes</span>
            </button>
            <button class="fc-app-icon" type="button" data-app="news">
              <span class="fc-app-symbol fc-app-symbol-news"><i class="fa-solid fa-newspaper"></i></span>
              <span class="fc-app-label">News</span>
            </button>
            <button class="fc-app-icon fc-app-icon-arcade" type="button" data-app="arcade">
              <span class="fc-app-symbol fc-app-symbol-arcade"><i class="fa-solid fa-gamepad"></i></span>
              <span class="fc-app-label">Arcade</span>
            </button>
            <button class="fc-app-icon fc-app-icon-maps" type="button" data-app="maps">
              <span class="fc-app-symbol fc-app-symbol-maps"><i class="fa-solid fa-map-location-dot"></i></span>
              <span class="fc-app-label">Maps</span>
            </button>
            <button class="fc-app-icon fc-app-icon-mondo" type="button" data-app="mondo">
              <span class="fc-app-symbol fc-app-symbol-mondo"><i class="fa-solid fa-car-side"></i></span>
              <span class="fc-app-label">Mondo Rides</span>
            </button>
            <button class="fc-app-icon fc-app-icon-music" type="button" data-app="music">
              <span class="fc-app-symbol fc-app-symbol-music"><i class="fa-solid fa-headphones"></i></span>
              <span class="fc-app-label">Music</span>
            </button>
            <button class="fc-app-icon fc-app-icon-settings" type="button" data-app="settings">
              <span class="fc-app-symbol fc-app-symbol-settings"><i class="fa-solid fa-gear"></i></span>
              <span class="fc-app-label">Settings</span>
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

          <section class="fc-browser-view" hidden>
            <div class="fc-browser-content"></div>
          </section>

          <section class="fc-notes-view" hidden>
            <div class="fc-notes-content"></div>
          </section>

          <section class="fc-news-view" hidden>
            <div class="fc-news-content"></div>
          </section>

          <section class="fc-arcade-view" hidden>
            <div class="fc-arcade-content"></div>
          </section>

          <section class="fc-maps-view" hidden>
            <div class="fc-maps-content"></div>
          </section>

          <section class="fc-mondo-view" hidden>
            <div class="fc-mondo-content"></div>
          </section>

          <section class="fc-music-view" hidden>
            <div class="fc-music-content"></div>
          </section>

          <section class="fc-settings-view" hidden>
            <div class="fc-settings-content"></div>
          </section>
        </main>
      </div>

      <img class="fc-phone-frame" src="modules/${MODULE_ID}/assets/phone-frame.png" alt="" draggable="false">
      <div class="fc-drag-handle" title="Drag phone"></div>
    </div>
  `;

  document.body.appendChild(root);
  state.root = root;
  applyPhoneScale();

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
  window.addEventListener("resize", () => { applyPhoneScale(); keepPhoneOnScreen(); });
  window.addEventListener("keydown", onArcadeKeydown);
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
  if (!['messages', 'missions', 'friendpage', 'browser', 'notes', 'news', 'arcade', 'maps', 'mondo', 'music', 'settings'].includes(app)) return;
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
    state.selectedFriendProfileKey = null;
    state.friendpageProfileManagerOpen = false;
  } else if (app === 'browser') {
    state.browserQuery = '';
    state.browserSearchResults = [];
    state.selectedBrowserPage = null;
    state.browserBookmarkManagerOpen = false;
  } else if (app === 'notes') {
    state.selectedNoteId = null;
    state.noteEditorOpen = false;
    resetNoteDraft();
  } else if (app === 'news') {
    state.selectedNewsId = null;
    state.newsEditorOpen = false;
    resetNewsDraft();
  } else if (app === 'arcade') {
    state.arcadeGame = 'menu';
    pauseArcadeActionGames();
  } else if (app === 'maps') {
    state.selectedMapId = null;
    state.mapManagerOpen = false;
    state.mapEditorOpen = false;
    state.mapExpanded = false;
    resetMapDraft();
  } else if (app === 'mondo') {
    state.mondoManagerOpen = false;
    state.mondoRidePending = null;
  } else if (app === 'music') {
    // Music mirrors Foundry's native playlist state; no per-app reset is needed.
  }
  renderPhone();
}

function goHome() {
  stopTyping();
  pauseArcadeActionGames();
  closeLargeMapWindow();
  state.app = 'home';
  state.selectedMissionId = null;
  state.missionEditorOpen = false;
  resetMissionDraft();
  state.friendpageMode = 'feed';
  state.selectedFriendProfileKey = null;
  state.friendpageProfileManagerOpen = false;
  state.browserQuery = '';
  state.browserSearchResults = [];
  state.selectedBrowserPage = null;
  state.browserBookmarkManagerOpen = false;
  state.selectedNoteId = null;
  state.noteEditorOpen = false;
  resetNoteDraft();
  state.selectedNewsId = null;
  state.newsEditorOpen = false;
  resetNewsDraft();
  state.selectedMapId = null;
  state.mapManagerOpen = false;
  state.mapEditorOpen = false;
  state.mapExpanded = false;
  resetMapDraft();
  state.mondoManagerOpen = false;
  state.mondoRidePending = null;
  renderPhone();
}

function closePhone() {
  stopTyping();
  pauseArcadeActionGames();
  closeLargeMapWindow();
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

  if (state.app === "settings") {
    goHome();
    return;
  }

  if (state.app === "music") {
    goHome();
    return;
  }

  if (state.app === "mondo") {
    if (state.mondoManagerOpen) {
      state.mondoManagerOpen = false;
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "maps") {
    if (state.mapEditorOpen) {
      state.mapEditorOpen = false;
      resetMapDraft();
      renderPhone();
      return;
    }
    if (state.mapManagerOpen) {
      state.mapManagerOpen = false;
      state.selectedMapId = null;
      state.mapExpanded = false;
      renderPhone();
      return;
    }
    if (state.mapExpanded) {
      state.mapExpanded = false;
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "arcade") {
    if (state.arcadeGame !== "menu") {
      pauseArcadeActionGames();
      state.arcadeGame = "menu";
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "news") {
    if (state.newsEditorOpen) {
      state.newsEditorOpen = false;
      state.selectedNewsId = null;
      resetNewsDraft();
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "notes") {
    if (state.noteEditorOpen) {
      state.noteEditorOpen = false;
      state.selectedNoteId = null;
      resetNoteDraft();
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "browser") {
    if (state.browserBookmarkManagerOpen) {
      state.browserBookmarkManagerOpen = false;
      renderPhone();
      return;
    }
    if (state.selectedBrowserPage) {
      state.selectedBrowserPage = null;
      renderPhone();
      return;
    }
    if (state.browserQuery) {
      state.browserQuery = '';
      state.browserSearchResults = [];
      renderPhone();
      return;
    }
    goHome();
    return;
  }

  if (state.app === "friendpage") {
    if (state.friendpageProfileManagerOpen) {
      state.friendpageProfileManagerOpen = false;
      renderPhone();
      return;
    }
    if (state.friendpageMode === "profiles" && state.selectedFriendProfileKey) {
      state.selectedFriendProfileKey = null;
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
  const browserView = state.root.querySelector(".fc-browser-view");
  const notesView = state.root.querySelector(".fc-notes-view");
  const newsView = state.root.querySelector(".fc-news-view");
  const arcadeView = state.root.querySelector(".fc-arcade-view");
  const mapsView = state.root.querySelector(".fc-maps-view");
  const mondoView = state.root.querySelector(".fc-mondo-view");
  const musicView = state.root.querySelector(".fc-music-view");
  const settingsView = state.root.querySelector(".fc-settings-view");
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
  browserView.hidden = true;
  notesView.hidden = true;
  newsView.hidden = true;
  arcadeView.hidden = true;
  mapsView.hidden = true;
  mondoView.hidden = true;
  musicView.hidden = true;
  settingsView.hidden = true;

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

  if (state.app === "browser") {
    browserView.hidden = false;
    renderBrowserView();
    updateBadges();
    return;
  }

  if (state.app === "notes") {
    notesView.hidden = false;
    renderNotesView();
    updateBadges();
    return;
  }

  if (state.app === "news") {
    newsView.hidden = false;
    renderNewsView();
    updateBadges();
    return;
  }

  if (state.app === "arcade") {
    arcadeView.hidden = false;
    renderArcadeView();
    updateBadges();
    return;
  }

  if (state.app === "maps") {
    mapsView.hidden = false;
    renderMapsView();
    updateBadges();
    return;
  }

  if (state.app === "music") {
    musicView.hidden = false;
    renderMusicView();
    updateBadges();
    return;
  }

  if (state.app === "settings") {
    settingsView.hidden = false;
    renderSettingsView();
    updateBadges();
    return;
  }

  if (state.app === "mondo") {
    mondoView.hidden = false;
    renderMondoRidesView();
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

  if (state.app === "settings") {
    back.hidden = false;
    title.textContent = "Settings";
    subtitle.textContent = "Personal phone preferences";
    return;
  }

  if (state.app === "music") {
    back.hidden = false;
    title.textContent = "Music";
    subtitle.textContent = "Now playing in Foundry";
    return;
  }

  if (state.app === "mondo") {
    back.hidden = false;
    title.textContent = state.mondoManagerOpen ? "Mondo Destinations" : "Mondo Rides";
    subtitle.textContent = state.mondoManagerOpen ? "GM scene access" : "Where to?";
    return;
  }

  if (state.app === "maps") {
    back.hidden = false;
    if (state.mapEditorOpen) {
      title.textContent = state.selectedMapId ? "Edit Map" : "New Map";
      subtitle.textContent = "GM map editor";
    } else if (state.mapManagerOpen) {
      title.textContent = "Manage Maps";
      subtitle.textContent = "GM map configuration";
    } else {
      const record = getCurrentMapRecord();
      title.textContent = record?.data?.name || "Maps";
      subtitle.textContent = record ? "Party location reference" : "Reference maps";
    }
    return;
  }

  if (state.app === "arcade") {
    back.hidden = false;
    const arcadeTitles = { snake: "Snake", tictactoe: "Tic Tac Toe", minesweeper: "Minesweeper", runner: "Runner", guessnumber: "Guess My Number", stackit: "Stack It", blockdrop: "Block Drop", chess: "Chess", farkle: "Farkle" };
    title.textContent = arcadeTitles[state.arcadeGame] || "Arcade";
    subtitle.textContent = state.arcadeGame === "menu" ? "Pick a game" : "Cellphone games";
    return;
  }

  if (state.app === "news") {
    back.hidden = false;
    title.textContent = state.newsEditorOpen ? (state.selectedNewsId ? "Edit Story" : "New Story") : "News";
    subtitle.textContent = state.newsEditorOpen ? "GM News Desk" : "Latest headlines";
    return;
  }

  if (state.app === "notes") {
    back.hidden = false;
    title.textContent = state.noteEditorOpen ? (state.selectedNoteId ? "Edit Note" : "New Note") : "Notes";
    subtitle.textContent = state.noteEditorOpen ? "Private phone note" : "Private to your account";
    return;
  }

  if (state.app === "browser") {
    back.hidden = false;
    if (state.browserBookmarkManagerOpen) {
      title.textContent = "Browser Sites";
      subtitle.textContent = "GM shortcut configuration";
    } else if (state.selectedBrowserPage) {
      const page = getBrowserJournalPage(state.selectedBrowserPage);
      title.textContent = page?.page?.name || page?.entry?.name || "Journal";
      subtitle.textContent = page?.entry?.name && page?.page?.name !== page?.entry?.name ? page.entry.name : "Journal result";
    } else if (state.browserQuery) {
      title.textContent = "Browser";
      subtitle.textContent = "Journal search results";
    } else {
      title.textContent = "Browser";
      subtitle.textContent = "Search journals & open sites";
    }
    return;
  }

  if (state.app === "friendpage") {
    back.hidden = false;
    const selectedProfile = getFriendpageProfileByKey(state.selectedFriendProfileKey, { requireActive: false });
    if (state.friendpageProfileManagerOpen) {
      title.textContent = "Friendpage Profiles";
      subtitle.textContent = "GM profile control";
    } else {
      title.textContent = selectedProfile?.name || "Friendpage";
      subtitle.textContent = selectedProfile ? "Profile & wall" : "Public social feed";
    }
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

  const footer = document.createElement("div");
  footer.className = "fc-bubble-footer";

  const time = document.createElement("span");
  time.className = "fc-bubble-time";
  time.textContent = formatMessageTime(data.sentAt ?? message.timestamp);
  footer.appendChild(time);

  if (canDeletePhoneMessage(message, data)) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "fc-bubble-delete";
    remove.title = game.user.isGM && data.authorUserId !== game.user.id ? "Delete message as GM" : "Delete your message";
    remove.setAttribute("aria-label", "Delete message");
    remove.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    remove.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await deletePhoneMessage(message, data);
    });
    footer.appendChild(remove);
  }

  bubble.appendChild(footer);
  row.appendChild(bubble);
  return row;
}

function canDeletePhoneMessage(message, data = normalizePhoneData(message)) {
  if (!message || !data || data.event === "group-create") return false;
  if (game.user?.isGM) return true;
  if (data.authorUserId) return data.authorUserId === game.user?.id;
  return data.senderType === "user" && data.senderId === game.user?.id;
}

async function deletePhoneMessage(message, data = normalizePhoneData(message)) {
  if (!canDeletePhoneMessage(message, data)) return;
  const confirmed = window.confirm("Delete this message for everyone in this conversation?");
  if (!confirmed) return;
  try {
    await message.delete();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to delete cellphone message`, error);
    ui.notifications.error("The cellphone message could not be deleted.");
  }
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

function getFriendpageProfileConfig() {
  const raw = game.settings.get(MODULE_ID, FRIENDPAGE_PROFILES_SETTING);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { configured: false, keys: [] };
  return {
    configured: Boolean(raw.configured),
    keys: Array.isArray(raw.keys) ? raw.keys.filter((key) => typeof key === 'string') : []
  };
}

function getActiveFriendpageProfileKeys() {
  const config = getFriendpageProfileConfig();
  if (!config.configured) return game.users.contents.map((user) => `user:${user.id}`);
  return config.keys.filter((key) => Boolean(getFriendpageProfileByKey(key, { requireActive: false })));
}

function getActiveFriendpageProfileKeySet() {
  return new Set(getActiveFriendpageProfileKeys());
}

function isFriendpageProfileActive(key) {
  return Boolean(key) && getActiveFriendpageProfileKeySet().has(key);
}

function getFriendpageProfiles() {
  return getActiveFriendpageProfileKeys()
    .map((key) => getFriendpageProfileByKey(key, { requireActive: false }))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getFriendpageProfileByKey(key, { requireActive = true } = {}) {
  if (!key || typeof key !== 'string') return null;
  if (requireActive && !isFriendpageProfileActive(key)) return null;
  const [type, ...rest] = key.split(':');
  const id = rest.join(':');
  if (!id) return null;
  if (type === 'user') {
    const user = game.users.get(id);
    if (!user) return null;
    return {
      key,
      type: 'user',
      id,
      name: getUserDisplayName(user),
      avatar: getUserAvatar(user),
      handle: buildFriendpageHandle(getUserDisplayName(user)),
      isNpc: false
    };
  }
  if (type === 'npc') {
    const actor = game.actors.get(id);
    if (!actor) return null;
    return {
      key,
      type: 'npc',
      id,
      name: actor.name || 'NPC',
      avatar: getActorAvatar(actor),
      handle: buildFriendpageHandle(actor.name || 'NPC'),
      isNpc: true
    };
  }
  return null;
}

function buildFriendpageHandle(name) {
  const base = String(name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return `@${base || 'user'}`;
}

function getFriendpageIdentityKey(data, side = 'author') {
  const type = data?.[`${side}Type`];
  const id = data?.[`${side}Id`];
  if (type && id) return `${type}:${id}`;
  const legacyUserId = data?.[`${side}UserId`];
  if (legacyUserId) return `user:${legacyUserId}`;
  if (side === 'target') return getFriendpageIdentityKey(data, 'author');
  return null;
}

function getFriendpageProfileFromRecord(data, side = 'author') {
  return getFriendpageProfileByKey(getFriendpageIdentityKey(data, side));
}

function isFriendpagePostActive(data) {
  const authorKey = getFriendpageIdentityKey(data, 'author');
  const targetKey = getFriendpageIdentityKey(data, 'target');
  return isFriendpageProfileActive(authorKey) && isFriendpageProfileActive(targetKey);
}

function getFriendpagePosts() {
  return getFriendpageRecords()
    .filter((record) => record.data.type === 'post' && isFriendpagePostActive(record.data))
    .sort((a, b) => Number(b.data.createdAt || 0) - Number(a.data.createdAt || 0));
}

function getFriendpageComments(postId) {
  return getFriendpageRecords()
    .filter((record) => {
      if (record.data.type !== 'comment' || record.data.postId !== postId) return false;
      return isFriendpageProfileActive(getFriendpageIdentityKey(record.data, 'author'));
    })
    .sort((a, b) => Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0));
}

function getFriendpageReactionState(postId) {
  const latestByProfile = new Map();
  for (const record of getFriendpageRecords()) {
    const data = record.data;
    if (data.type !== 'reaction' || data.postId !== postId) continue;
    const authorKey = getFriendpageIdentityKey(data, 'author');
    if (!authorKey || !isFriendpageProfileActive(authorKey)) continue;
    const current = latestByProfile.get(authorKey);
    if (!current || Number(data.createdAt || 0) >= Number(current.createdAt || 0)) latestByProfile.set(authorKey, data);
  }
  let likes = 0;
  let dislikes = 0;
  for (const data of latestByProfile.values()) {
    if (data.reaction === 'like') likes += 1;
    if (data.reaction === 'dislike') dislikes += 1;
  }
  const actingKey = getFriendpageActingIdentity()?.key || null;
  return { likes, dislikes, mine: actingKey ? (latestByProfile.get(actingKey)?.reaction || 'none') : 'none' };
}

function getFriendpageCommentReactionState(commentId) {
  const latestByProfile = new Map();
  for (const record of getFriendpageRecords()) {
    const data = record.data;
    if (data.type !== 'comment-reaction' || data.commentId !== commentId) continue;
    const authorKey = getFriendpageIdentityKey(data, 'author');
    if (!authorKey || !isFriendpageProfileActive(authorKey)) continue;
    const current = latestByProfile.get(authorKey);
    if (!current || Number(data.createdAt || 0) >= Number(current.createdAt || 0)) latestByProfile.set(authorKey, data);
  }
  let likes = 0;
  let dislikes = 0;
  for (const data of latestByProfile.values()) {
    if (data.reaction === 'like') likes += 1;
    if (data.reaction === 'dislike') dislikes += 1;
  }
  const actingKey = getFriendpageActingIdentity()?.key || null;
  return { likes, dislikes, mine: actingKey ? (latestByProfile.get(actingKey)?.reaction || 'none') : 'none' };
}

function getFriendpageAllowedActingProfiles() {
  const activeKeys = getActiveFriendpageProfileKeySet();
  if (!game.user?.isGM) {
    const ownKey = `user:${game.user.id}`;
    const own = activeKeys.has(ownKey) ? getFriendpageProfileByKey(ownKey, { requireActive: false }) : null;
    return own ? [own] : [];
  }

  const profiles = [];
  const ownKey = `user:${game.user.id}`;
  if (activeKeys.has(ownKey)) {
    const own = getFriendpageProfileByKey(ownKey, { requireActive: false });
    if (own) profiles.push(own);
  }
  for (const key of activeKeys) {
    if (!key.startsWith('npc:')) continue;
    const profile = getFriendpageProfileByKey(key, { requireActive: false });
    if (profile) profiles.push(profile);
  }
  return profiles.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'user' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function validateFriendpageActingIdentity() {
  const allowed = getFriendpageAllowedActingProfiles();
  if (!allowed.length) {
    state.friendpageActingKey = null;
    return null;
  }
  if (!allowed.some((profile) => profile.key === state.friendpageActingKey)) {
    state.friendpageActingKey = allowed[0].key;
  }
  return allowed.find((profile) => profile.key === state.friendpageActingKey) || allowed[0];
}

function getFriendpageActingIdentity() {
  return validateFriendpageActingIdentity();
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
      state.selectedFriendProfileKey = null;
      state.friendpageProfileManagerOpen = false;
      renderPhone();
    });
    tabs.appendChild(button);
  }
  container.appendChild(tabs);

  if (state.friendpageProfileManagerOpen) {
    renderFriendpageProfileManager(container);
    return;
  }

  renderFriendpageActingSelector(container);

  if (state.friendpageMode === 'profiles') {
    if (state.selectedFriendProfileKey) renderFriendpageProfile(container, state.selectedFriendProfileKey);
    else renderFriendpageProfileList(container);
    return;
  }

  const acting = getFriendpageActingIdentity();
  if (acting) renderFriendpageComposer(container, acting.key);
  else renderFriendpageInactiveNotice(container);
  renderFriendpagePostList(container, getFriendpagePosts());
}

function renderFriendpageActingSelector(container) {
  if (!game.user?.isGM) return;
  const options = getFriendpageAllowedActingProfiles();
  if (!options.length) {
    renderFriendpageInactiveNotice(container, 'No active GM/NPC profile', 'Enable your GM profile or an NPC profile under Manage Profiles.');
    return;
  }

  const acting = getFriendpageActingIdentity();
  const bar = document.createElement('div');
  bar.className = 'fc-friend-acting-bar';
  const label = document.createElement('span');
  label.textContent = 'Posting as';
  const avatar = document.createElement('img');
  avatar.src = acting?.avatar || 'icons/svg/mystery-man.svg';
  avatar.alt = '';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Friendpage posting identity');
  for (const profile of options) {
    const option = document.createElement('option');
    option.value = profile.key;
    option.textContent = `${profile.name}${profile.isNpc ? ' (NPC)' : ''}`;
    option.selected = profile.key === acting?.key;
    select.appendChild(option);
  }
  select.addEventListener('change', () => {
    state.friendpageActingKey = select.value;
    renderPhone();
  });
  bar.append(label, avatar, select);
  container.appendChild(bar);
}

function renderFriendpageProfileList(container) {
  if (game.user?.isGM) {
    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'fc-friend-manage-profiles';
    manage.innerHTML = '<i class="fa-solid fa-sliders"></i><span>Manage Profiles</span>';
    manage.addEventListener('click', () => {
      state.friendpageProfileManagerOpen = true;
      renderPhone();
    });
    container.appendChild(manage);
  }

  const intro = document.createElement('div');
  intro.className = 'fc-friend-section-title';
  intro.textContent = 'Profiles';
  container.appendChild(intro);

  const profiles = getFriendpageProfiles();
  if (!profiles.length) {
    renderFriendpageInactiveNotice(container, 'No active profiles', game.user?.isGM ? 'Use Manage Profiles to enable Friendpage profiles.' : 'The GM has not enabled any Friendpage profiles yet.');
    return;
  }

  for (const profile of profiles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-friend-profile-row';
    const avatar = document.createElement('img');
    avatar.src = profile.avatar;
    avatar.alt = '';
    const text = document.createElement('div');
    text.className = 'fc-friend-profile-text';
    const nameLine = document.createElement('div');
    nameLine.className = 'fc-friend-profile-name-line';
    const name = document.createElement('strong');
    name.textContent = profile.name;
    nameLine.appendChild(name);
    if (profile.isNpc) {
      const badge = document.createElement('span');
      badge.className = 'fc-friend-npc-badge';
      badge.textContent = 'NPC';
      nameLine.appendChild(badge);
    }
    const handle = document.createElement('span');
    handle.textContent = profile.handle;
    text.append(nameLine, handle);
    const arrow = document.createElement('i');
    arrow.className = 'fa-solid fa-chevron-right';
    button.append(avatar, text, arrow);
    button.addEventListener('click', () => {
      state.selectedFriendProfileKey = profile.key;
      renderPhone();
    });
    container.appendChild(button);
  }
}

function renderFriendpageProfileManager(container) {
  if (!game.user?.isGM) {
    state.friendpageProfileManagerOpen = false;
    renderPhone();
    return;
  }

  const currentKeys = getActiveFriendpageProfileKeySet();
  const description = document.createElement('div');
  description.className = 'fc-friend-manager-help';
  description.textContent = 'Choose which player and NPC identities exist on Friendpage. Active NPCs can be used by the GM to post, comment, like, and dislike.';
  container.appendChild(description);

  const form = document.createElement('form');
  form.className = 'fc-friend-manager';

  const addSection = (title, profiles) => {
    const heading = document.createElement('div');
    heading.className = 'fc-friend-section-title';
    heading.textContent = title;
    form.appendChild(heading);
    for (const profile of profiles) {
      const label = document.createElement('label');
      label.className = 'fc-friend-manager-row';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = profile.key;
      checkbox.checked = currentKeys.has(profile.key);
      const avatar = document.createElement('img');
      avatar.src = profile.avatar;
      avatar.alt = '';
      const details = document.createElement('span');
      details.className = 'fc-friend-manager-text';
      const strong = document.createElement('strong');
      strong.textContent = profile.name;
      const small = document.createElement('span');
      small.textContent = profile.isNpc ? 'NPC Actor' : 'Foundry user';
      details.append(strong, small);
      label.append(checkbox, avatar, details);
      form.appendChild(label);
    }
  };

  const userProfiles = game.users.contents
    .map((user) => getFriendpageProfileByKey(`user:${user.id}`, { requireActive: false }))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  const npcProfiles = getNpcCandidates()
    .map((actor) => getFriendpageProfileByKey(`npc:${actor.id}`, { requireActive: false }))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  addSection('Player / User Profiles', userProfiles);
  addSection('NPC Profiles', npcProfiles);

  const actions = document.createElement('div');
  actions.className = 'fc-friend-manager-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'fc-friend-manager-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    state.friendpageProfileManagerOpen = false;
    renderPhone();
  });
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'fc-friend-manager-save';
  save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Save Profiles</span>';
  actions.append(cancel, save);
  form.appendChild(actions);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.disabled = true;
    const keys = [...form.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
    try {
      await game.settings.set(MODULE_ID, FRIENDPAGE_PROFILES_SETTING, { configured: true, keys });
      state.friendpageProfileManagerOpen = false;
      state.selectedFriendProfileKey = null;
      validateFriendpageActingIdentity();
      renderPhone();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save Friendpage profiles`, error);
      ui.notifications.error('Friendpage profile settings could not be saved.');
    } finally {
      save.disabled = false;
    }
  });

  container.appendChild(form);
}

function renderFriendpageProfile(container, profileKey) {
  const profile = getFriendpageProfileByKey(profileKey);
  if (!profile) {
    state.selectedFriendProfileKey = null;
    renderPhone();
    return;
  }

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'fc-friend-profile-back';
  back.innerHTML = '<i class="fa-solid fa-chevron-left"></i><span>All Profiles</span>';
  back.addEventListener('click', () => { state.selectedFriendProfileKey = null; renderPhone(); });

  const hero = document.createElement('div');
  hero.className = 'fc-friend-profile-hero';
  const avatar = document.createElement('img');
  avatar.src = profile.avatar;
  avatar.alt = '';
  const info = document.createElement('div');
  const nameLine = document.createElement('div');
  nameLine.className = 'fc-friend-profile-hero-name';
  const name = document.createElement('h2');
  name.textContent = profile.name;
  nameLine.appendChild(name);
  if (profile.isNpc) {
    const badge = document.createElement('span');
    badge.className = 'fc-friend-npc-badge';
    badge.textContent = 'NPC';
    nameLine.appendChild(badge);
  }
  const handle = document.createElement('div');
  handle.className = 'fc-friend-handle';
  handle.textContent = profile.handle;
  info.append(nameLine, handle);
  hero.append(avatar, info);
  container.append(back, hero);

  if (getFriendpageActingIdentity()) renderFriendpageComposer(container, profile.key);
  else renderFriendpageInactiveNotice(container);
  const wallPosts = getFriendpagePosts().filter((record) => getFriendpageIdentityKey(record.data, 'target') === profile.key);
  renderFriendpagePostList(container, wallPosts, 'Wall');
}

function renderFriendpageComposer(container, targetProfileKey) {
  const target = getFriendpageProfileByKey(targetProfileKey);
  const acting = getFriendpageActingIdentity();
  if (!target || !acting) return;

  const form = document.createElement('form');
  form.className = 'fc-friend-composer';
  const row = document.createElement('div');
  row.className = 'fc-friend-composer-top';
  const avatar = document.createElement('img');
  avatar.src = acting.avatar;
  avatar.alt = '';
  const textarea = document.createElement('textarea');
  textarea.rows = 2;
  textarea.maxLength = 2000;
  textarea.placeholder = target.key === acting.key ? "What's happening?" : `Write on ${target.name}'s wall...`;
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
      await createFriendpagePost(body, target.key);
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

function renderFriendpageInactiveNotice(container, title = 'Profile inactive', message = 'Your current Friendpage identity is not active, so you can browse but cannot post or react.') {
  const notice = document.createElement('div');
  notice.className = 'fc-friend-inactive';
  notice.innerHTML = `<i class="fa-solid fa-user-lock"></i><div><strong>${escapeMissionText(title)}</strong><span>${escapeMissionText(message)}</span></div>`;
  container.appendChild(notice);
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
  const author = getFriendpageProfileFromRecord(data, 'author');
  const target = getFriendpageProfileFromRecord(data, 'target');
  if (!author || !target) return;

  const card = document.createElement('article');
  card.className = 'fc-friend-post';

  const header = document.createElement('div');
  header.className = 'fc-friend-post-header';
  const avatar = document.createElement('img');
  avatar.src = author.avatar;
  avatar.alt = '';
  const identity = document.createElement('div');
  identity.className = 'fc-friend-post-identity';
  const nameLine = document.createElement('div');
  nameLine.className = 'fc-friend-post-name';
  const authorButton = document.createElement('button');
  authorButton.type = 'button';
  authorButton.className = 'fc-friend-link';
  authorButton.textContent = author.name;
  authorButton.addEventListener('click', () => openFriendpageProfile(author.key));
  nameLine.appendChild(authorButton);
  if (target.key !== author.key) {
    const arrow = document.createElement('span');
    arrow.textContent = ' → ';
    const targetButton = document.createElement('button');
    targetButton.type = 'button';
    targetButton.className = 'fc-friend-link';
    targetButton.textContent = target.name;
    targetButton.addEventListener('click', () => openFriendpageProfile(target.key));
    nameLine.append(arrow, targetButton);
  }
  const meta = document.createElement('div');
  meta.className = 'fc-friend-post-meta';
  meta.textContent = `${author.handle} · ${formatFriendpageDate(data.createdAt)}`;
  identity.append(nameLine, meta);
  header.append(avatar, identity);

  const body = document.createElement('div');
  body.className = 'fc-friend-post-body';
  body.textContent = data.body || '';

  const reaction = getFriendpageReactionState(data.id);
  const comments = getFriendpageComments(data.id);
  const canInteract = Boolean(getFriendpageActingIdentity());
  const actions = document.createElement('div');
  actions.className = 'fc-friend-actions';
  const like = buildFriendReactionButton('like', reaction.likes, reaction.mine === 'like', data.id, canInteract);
  const dislike = buildFriendReactionButton('dislike', reaction.dislikes, reaction.mine === 'dislike', data.id, canInteract);
  const commentCount = document.createElement('span');
  commentCount.className = 'fc-friend-comment-count';
  commentCount.innerHTML = `<i class="fa-regular fa-comment"></i><span>${comments.length}</span>`;
  actions.append(like, dislike, commentCount);

  card.append(header, body, actions);

  if (comments.length) {
    const commentList = document.createElement('div');
    commentList.className = 'fc-friend-comments';
    for (const comment of comments) {
      const commentAuthor = getFriendpageProfileFromRecord(comment.data, 'author');
      if (!commentAuthor) continue;
      const commentId = comment.data.id || comment.document.id;
      const commentReaction = getFriendpageCommentReactionState(commentId);

      const row = document.createElement('div');
      row.className = 'fc-friend-comment';
      const img = document.createElement('img');
      img.src = commentAuthor.avatar;
      img.alt = '';

      const content = document.createElement('div');
      content.className = 'fc-friend-comment-content';
      const bubble = document.createElement('div');
      bubble.className = 'fc-friend-comment-bubble';
      const who = document.createElement('button');
      who.type = 'button';
      who.className = 'fc-friend-comment-author';
      who.textContent = commentAuthor.name;
      who.addEventListener('click', () => openFriendpageProfile(commentAuthor.key));
      const text = document.createElement('span');
      text.textContent = comment.data.body || '';
      bubble.append(who, text);

      const commentActions = document.createElement('div');
      commentActions.className = 'fc-friend-comment-actions';
      commentActions.append(
        buildFriendCommentReactionButton('like', commentReaction.likes, commentReaction.mine === 'like', data.id, commentId, canInteract),
        buildFriendCommentReactionButton('dislike', commentReaction.dislikes, commentReaction.mine === 'dislike', data.id, commentId, canInteract)
      );

      content.append(bubble, commentActions);
      row.append(img, content);
      commentList.appendChild(row);
    }
    card.appendChild(commentList);
  }

  if (canInteract) {
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
  }
  container.appendChild(card);
}

function buildFriendReactionButton(kind, count, active, postId, enabled = true) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `fc-friend-reaction${active ? ' is-active' : ''}`;
  button.innerHTML = kind === 'like'
    ? `<i class="fa-solid fa-thumbs-up"></i><span>${count}</span>`
    : `<i class="fa-solid fa-thumbs-down"></i><span>${count}</span>`;
  button.title = enabled ? (kind === 'like' ? 'Like' : 'Dislike') : 'No active Friendpage identity';
  button.disabled = !enabled;
  button.addEventListener('click', async () => {
    if (!enabled) return;
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

function buildFriendCommentReactionButton(kind, count, active, postId, commentId, enabled = true) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `fc-friend-comment-reaction${active ? ' is-active' : ''}`;
  button.innerHTML = kind === 'like'
    ? `<i class="fa-solid fa-thumbs-up"></i><span>${count}</span>`
    : `<i class="fa-solid fa-thumbs-down"></i><span>${count}</span>`;
  button.title = enabled ? (kind === 'like' ? 'Like comment' : 'Dislike comment') : 'No active Friendpage identity';
  button.disabled = !enabled;
  button.addEventListener('click', async () => {
    if (!enabled) return;
    button.disabled = true;
    try {
      await createFriendpageCommentReaction(postId, commentId, active ? 'none' : kind);
      renderPhone();
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function openFriendpageProfile(profileKey) {
  const profile = getFriendpageProfileByKey(profileKey);
  if (!profile) return;
  state.app = 'friendpage';
  state.friendpageMode = 'profiles';
  state.friendpageProfileManagerOpen = false;
  state.selectedFriendProfileKey = profile.key;
  renderPhone();
}

function buildFriendpageIdentityFields(profile, prefix) {
  const fields = {
    [`${prefix}Type`]: profile.type,
    [`${prefix}Id`]: profile.id
  };
  if (profile.type === 'user') fields[`${prefix}UserId`] = profile.id;
  return fields;
}

async function createFriendpagePost(body, targetProfileKey) {
  const author = getFriendpageActingIdentity();
  const target = getFriendpageProfileByKey(targetProfileKey);
  if (!author || !target) throw new Error('Friendpage author or target profile is inactive.');
  const now = Date.now();
  const data = {
    schema: 2,
    type: 'post',
    id: makeId(),
    ...buildFriendpageIdentityFields(author, 'author'),
    ...buildFriendpageIdentityFields(target, 'target'),
    operatorUserId: game.user.id,
    body,
    createdAt: now
  };
  return createFriendpageDocument(data, `[Friendpage] ${author.name} posted`, author);
}

async function createFriendpageComment(postId, body) {
  const author = getFriendpageActingIdentity();
  if (!author) throw new Error('No active Friendpage identity.');
  const data = {
    schema: 2,
    type: 'comment',
    id: makeId(),
    postId,
    ...buildFriendpageIdentityFields(author, 'author'),
    operatorUserId: game.user.id,
    body,
    createdAt: Date.now()
  };
  return createFriendpageDocument(data, `[Friendpage] ${author.name} commented`, author);
}

async function createFriendpageReaction(postId, reaction) {
  const author = getFriendpageActingIdentity();
  if (!author) throw new Error('No active Friendpage identity.');
  const data = {
    schema: 2,
    type: 'reaction',
    id: makeId(),
    postId,
    ...buildFriendpageIdentityFields(author, 'author'),
    operatorUserId: game.user.id,
    reaction,
    createdAt: Date.now()
  };
  return createFriendpageDocument(data, `[Friendpage] ${author.name} reaction`, author);
}

async function createFriendpageCommentReaction(postId, commentId, reaction) {
  const author = getFriendpageActingIdentity();
  if (!author) throw new Error('No active Friendpage identity.');
  const data = {
    schema: 3,
    type: 'comment-reaction',
    id: makeId(),
    postId,
    commentId,
    ...buildFriendpageIdentityFields(author, 'author'),
    operatorUserId: game.user.id,
    reaction,
    createdAt: Date.now()
  };
  return createFriendpageDocument(data, `[Friendpage] ${author.name} comment reaction`, author);
}

function createFriendpageDocument(data, content, authorProfile = null) {
  const alias = authorProfile?.name || getUserDisplayName(game.user);
  return createChatMessageDocument({
    content: formatSafeChatContent(content),
    speaker: { alias },
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


// -----------------------------------------------------------------------------
// Browser app: external shortcuts + permission-aware Journal search
// -----------------------------------------------------------------------------

const BROWSER_ICON_CHOICES = [
  ['globe', 'Globe'],
  ['newspaper', 'News'],
  ['building', 'Building'],
  ['shield-halved', 'Shield'],
  ['book-open', 'Book'],
  ['video', 'Video'],
  ['comments', 'Social'],
  ['satellite-dish', 'Signal'],
  ['link', 'Link']
];

function getBrowserBookmarks() {
  const raw = game.settings.get(MODULE_ID, BROWSER_BOOKMARKS_SETTING);
  if (!Array.isArray(raw)) return [];
  return raw.map((bookmark) => ({
    id: String(bookmark?.id || makeBrowserBookmarkId()),
    label: String(bookmark?.label || 'Website').slice(0, 60),
    url: String(bookmark?.url || ''),
    icon: sanitizeBrowserIcon(bookmark?.icon)
  })).filter((bookmark) => bookmark.url);
}

function sanitizeBrowserIcon(icon) {
  const allowed = new Set(BROWSER_ICON_CHOICES.map(([value]) => value));
  return allowed.has(icon) ? icon : 'globe';
}

function makeBrowserBookmarkId() {
  const random = globalThis.foundry?.utils?.randomID?.(10) || Math.random().toString(36).slice(2, 12);
  return `site-${random}`;
}

function normalizeExternalUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch (_) {
    return null;
  }
}

function openBrowserExternalUrl(url) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) {
    ui.notifications.warn('That Browser shortcut does not have a valid HTTP or HTTPS URL.');
    return;
  }
  window.open(normalized, '_blank', 'noopener,noreferrer');
}

function renderBrowserView() {
  const container = state.root.querySelector('.fc-browser-content');
  if (!container) return;
  container.innerHTML = '';

  if (state.browserBookmarkManagerOpen) {
    renderBrowserBookmarkManager(container);
    return;
  }

  if (state.selectedBrowserPage) {
    void renderBrowserJournalPage(container, state.selectedBrowserPage);
    return;
  }

  const shell = document.createElement('div');
  shell.className = 'fc-browser-shell';

  const brand = document.createElement('div');
  brand.className = 'fc-browser-brand';
  brand.innerHTML = '<span class="fc-browser-brand-icon"><i class="fa-solid fa-compass"></i></span><strong>Browser</strong>';
  shell.appendChild(brand);

  const searchForm = document.createElement('form');
  searchForm.className = 'fc-browser-search';
  searchForm.innerHTML = `
    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
    <input type="search" maxlength="180" autocomplete="off" placeholder="Search accessible journal notes" aria-label="Search Foundry journal notes">
    <button type="submit" aria-label="Search"><i class="fa-solid fa-arrow-right"></i></button>
  `;
  const input = searchForm.querySelector('input');
  input.value = state.browserQuery || '';
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    state.browserQuery = query;
    state.browserSearchResults = query ? searchAccessibleJournalPages(query) : [];
    state.selectedBrowserPage = null;
    renderPhone();
  });
  shell.appendChild(searchForm);

  if (state.browserQuery) {
    renderBrowserSearchResults(shell);
  } else {
    renderBrowserBookmarkStart(shell);
  }

  container.appendChild(shell);
}

function renderBrowserBookmarkStart(container) {
  const header = document.createElement('div');
  header.className = 'fc-browser-section-heading';
  const title = document.createElement('span');
  title.textContent = 'Shortcuts';
  header.appendChild(title);

  if (game.user?.isGM) {
    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'fc-browser-manage';
    manage.innerHTML = '<i class="fa-solid fa-sliders"></i> Manage';
    manage.addEventListener('click', () => {
      state.browserBookmarkManagerOpen = true;
      renderPhone();
    });
    header.appendChild(manage);
  }
  container.appendChild(header);

  const bookmarks = getBrowserBookmarks();
  if (!bookmarks.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-browser-empty';
    empty.innerHTML = '<i class="fa-solid fa-bookmark"></i><strong>No shortcuts yet</strong><span>The GM can add websites to this Browser home page.</span>';
    container.appendChild(empty);
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'fc-browser-shortcuts';
  for (const bookmark of bookmarks) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-browser-shortcut';
    button.title = bookmark.url;

    const icon = document.createElement('span');
    icon.className = 'fc-browser-shortcut-icon';
    icon.innerHTML = `<i class="fa-solid fa-${bookmark.icon}"></i>`;
    const label = document.createElement('span');
    label.className = 'fc-browser-shortcut-label';
    label.textContent = bookmark.label;
    button.append(icon, label);
    button.addEventListener('click', () => openBrowserExternalUrl(bookmark.url));
    grid.appendChild(button);
  }
  container.appendChild(grid);
}

function renderBrowserSearchResults(container) {
  const heading = document.createElement('div');
  heading.className = 'fc-browser-section-heading';
  const count = state.browserSearchResults.length;
  heading.innerHTML = `<span>${count} ${count === 1 ? 'result' : 'results'}</span>`;
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'fc-browser-clear';
  clear.textContent = 'Clear';
  clear.addEventListener('click', () => {
    state.browserQuery = '';
    state.browserSearchResults = [];
    renderPhone();
  });
  heading.appendChild(clear);
  container.appendChild(heading);

  if (!count) {
    const empty = document.createElement('div');
    empty.className = 'fc-browser-empty';
    empty.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i><strong>No journal notes found</strong><span>Only journal pages you are allowed to observe are searched.</span>';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'fc-browser-results';
  for (const result of state.browserSearchResults) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-browser-result';

    const icon = document.createElement('span');
    icon.className = 'fc-browser-result-icon';
    icon.innerHTML = '<i class="fa-solid fa-file-lines"></i>';

    const body = document.createElement('span');
    body.className = 'fc-browser-result-body';
    const title = document.createElement('strong');
    title.textContent = result.pageName || result.entryName;
    const parent = document.createElement('small');
    parent.textContent = result.pageName && result.pageName !== result.entryName ? result.entryName : 'Journal';
    const snippet = document.createElement('span');
    snippet.className = 'fc-browser-result-snippet';
    snippet.textContent = result.snippet || 'Open journal page';
    body.append(title, parent, snippet);
    button.append(icon, body);
    button.addEventListener('click', () => {
      state.selectedBrowserPage = { entryId: result.entryId, pageId: result.pageId };
      renderPhone();
    });
    list.appendChild(button);
  }
  container.appendChild(list);
}

function getBrowserObserverLevel() {
  return globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OBSERVER ?? 2;
}

function canCurrentUserReadJournalDocument(document) {
  if (!document || !game.user) return false;
  try {
    if (typeof document.testUserPermission === 'function') {
      return document.testUserPermission(game.user, getBrowserObserverLevel());
    }
    return Boolean(document.visible ?? document.isOwner);
  } catch (_) {
    return false;
  }
}

function getJournalTextContent(page) {
  return String(page?.text?.content ?? page?.system?.text?.content ?? '');
}

function htmlToPlainText(html) {
  const value = String(html || '');
  if (!value) return '';
  const div = document.createElement('div');
  div.innerHTML = value;
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function getJournalSearchPlainText(html, page, entry) {
  const value = String(html || '');
  if (!value) return '';
  const div = document.createElement('div');
  div.innerHTML = value;
  if (!(page?.isOwner || entry?.isOwner)) {
    div.querySelectorAll('.secret, section.secret, [data-secret]').forEach((node) => node.remove());
  }
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

function searchAccessibleJournalPages(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return [];
  const terms = normalized.split(/\s+/).filter(Boolean);
  const results = [];

  for (const entry of game.journal ?? []) {
    if (!canCurrentUserReadJournalDocument(entry)) continue;
    for (const page of entry.pages ?? []) {
      if (!canCurrentUserReadJournalDocument(page)) continue;
      const raw = getJournalTextContent(page);
      const plain = getJournalSearchPlainText(raw, page, entry);
      const entryName = String(entry.name || 'Journal');
      const pageName = String(page.name || entryName);
      const haystack = `${entryName} ${pageName} ${plain}`.toLowerCase();
      if (!terms.every((term) => haystack.includes(term))) continue;

      const firstTerm = terms[0];
      const index = plain.toLowerCase().indexOf(firstTerm);
      let snippet = plain;
      if (index >= 0) snippet = plain.slice(Math.max(0, index - 60), index + 150);
      snippet = snippet.slice(0, 220).trim();
      if (snippet && plain.length > snippet.length) snippet += '…';

      results.push({
        entryId: entry.id,
        pageId: page.id,
        entryName,
        pageName,
        snippet
      });
    }
  }

  return results
    .sort((a, b) => {
      const aTitle = `${a.entryName} ${a.pageName}`.toLowerCase();
      const bTitle = `${b.entryName} ${b.pageName}`.toLowerCase();
      const aStrong = terms.every((term) => aTitle.includes(term)) ? 1 : 0;
      const bStrong = terms.every((term) => bTitle.includes(term)) ? 1 : 0;
      return bStrong - aStrong || a.entryName.localeCompare(b.entryName) || a.pageName.localeCompare(b.pageName);
    })
    .slice(0, 50);
}

function getBrowserJournalPage(ref) {
  if (!ref) return null;
  const entry = game.journal?.get(ref.entryId);
  if (!entry || !canCurrentUserReadJournalDocument(entry)) return null;
  const page = entry.pages?.get(ref.pageId);
  if (!page || !canCurrentUserReadJournalDocument(page)) return null;
  return { entry, page };
}

async function renderBrowserJournalPage(container, ref) {
  const resolved = getBrowserJournalPage(ref);
  if (!resolved) {
    state.selectedBrowserPage = null;
    const warning = document.createElement('div');
    warning.className = 'fc-browser-empty';
    warning.innerHTML = '<i class="fa-solid fa-lock"></i><strong>Journal unavailable</strong><span>This page no longer exists or you do not have permission to view it.</span>';
    container.appendChild(warning);
    return;
  }

  const { entry, page } = resolved;
  const article = document.createElement('article');
  article.className = 'fc-browser-journal';

  const heading = document.createElement('div');
  heading.className = 'fc-browser-journal-heading';
  const parent = document.createElement('span');
  parent.textContent = entry.name || 'Journal';
  const title = document.createElement('h2');
  title.textContent = page.name || entry.name || 'Journal Page';
  heading.append(parent, title);
  article.appendChild(heading);

  const body = document.createElement('div');
  body.className = 'fc-browser-journal-body';
  body.innerHTML = '<div class="fc-browser-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading note…</div>';
  article.appendChild(body);
  container.appendChild(article);

  const raw = getJournalTextContent(page);
  if (!raw) {
    body.innerHTML = '<p class="fc-browser-note-empty">This journal page does not contain searchable text content.</p>';
    return;
  }

  try {
    const editor = globalThis.TextEditor ?? globalThis.foundry?.applications?.ux?.TextEditor;
    let html = raw;
    if (editor?.enrichHTML) {
      html = await editor.enrichHTML(raw, {
        async: true,
        documents: true,
        links: true,
        rolls: false,
        secrets: Boolean(page.isOwner || entry.isOwner)
      });
    }
    // Abort if the user navigated away while async enrichment was running.
    if (!state.selectedBrowserPage || state.selectedBrowserPage.entryId !== ref.entryId || state.selectedBrowserPage.pageId !== ref.pageId) return;
    body.innerHTML = html;
    body.querySelectorAll('a[href^="http://"], a[href^="https://"]').forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Browser could not render journal page`, error);
    body.textContent = htmlToPlainText(raw);
  }
}

function renderBrowserBookmarkManager(container) {
  if (!game.user?.isGM) {
    state.browserBookmarkManagerOpen = false;
    renderBrowserView();
    return;
  }

  const help = document.createElement('div');
  help.className = 'fc-browser-manager-help';
  help.textContent = 'Add shortcuts that open real websites in a new browser tab. Only HTTP and HTTPS links are accepted.';
  container.appendChild(help);

  const form = document.createElement('form');
  form.className = 'fc-browser-manager';
  const rows = document.createElement('div');
  rows.className = 'fc-browser-manager-rows';
  form.appendChild(rows);

  const working = getBrowserBookmarks().map((bookmark) => ({ ...bookmark }));

  const syncWorkingFromRows = () => {
    const rowEls = [...rows.querySelectorAll('.fc-browser-manager-row')];
    rowEls.forEach((row, index) => {
      if (!working[index]) return;
      working[index].label = row.querySelector('[data-field="label"]')?.value ?? working[index].label;
      working[index].url = row.querySelector('[data-field="url"]')?.value ?? working[index].url;
      working[index].icon = sanitizeBrowserIcon(row.querySelector('[data-field="icon"]')?.value);
    });
  };

  const drawRows = () => {
    rows.innerHTML = '';
    working.forEach((bookmark, index) => {
      const row = document.createElement('div');
      row.className = 'fc-browser-manager-row';

      const label = document.createElement('input');
      label.type = 'text';
      label.maxLength = 60;
      label.placeholder = 'Site name';
      label.value = bookmark.label;
      label.dataset.field = 'label';

      const url = document.createElement('input');
      url.type = 'url';
      url.placeholder = 'https://example.com';
      url.value = bookmark.url;
      url.dataset.field = 'url';

      const lower = document.createElement('div');
      lower.className = 'fc-browser-manager-row-lower';
      const icon = document.createElement('select');
      icon.dataset.field = 'icon';
      for (const [value, text] of BROWSER_ICON_CHOICES) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        option.selected = value === bookmark.icon;
        icon.appendChild(option);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'fc-browser-manager-remove';
      remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
      remove.title = 'Remove shortcut';
      remove.addEventListener('click', () => {
        syncWorkingFromRows();
        working.splice(index, 1);
        drawRows();
      });
      lower.append(icon, remove);
      row.append(label, url, lower);
      rows.appendChild(row);
    });
  };
  drawRows();

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'fc-browser-manager-add';
  add.innerHTML = '<i class="fa-solid fa-plus"></i> Add Shortcut';
  add.addEventListener('click', () => {
    syncWorkingFromRows();
    working.push({ id: makeBrowserBookmarkId(), label: 'Website', url: 'https://', icon: 'globe' });
    drawRows();
    rows.lastElementChild?.querySelector('input')?.focus();
  });
  form.appendChild(add);

  const actions = document.createElement('div');
  actions.className = 'fc-browser-manager-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'fc-browser-manager-cancel';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    state.browserBookmarkManagerOpen = false;
    renderPhone();
  });
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'fc-browser-manager-save';
  save.innerHTML = '<i class="fa-solid fa-check"></i> Save';
  actions.append(cancel, save);
  form.appendChild(actions);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const next = [];
    const rowEls = [...rows.querySelectorAll('.fc-browser-manager-row')];
    for (let index = 0; index < rowEls.length; index++) {
      const row = rowEls[index];
      const label = row.querySelector('[data-field="label"]')?.value?.trim() || 'Website';
      const rawUrl = row.querySelector('[data-field="url"]')?.value?.trim() || '';
      const url = normalizeExternalUrl(rawUrl);
      if (!url) {
        ui.notifications.warn(`Browser shortcut "${label}" needs a valid HTTP or HTTPS URL.`);
        return;
      }
      next.push({
        id: working[index]?.id || makeBrowserBookmarkId(),
        label: label.slice(0, 60),
        url,
        icon: sanitizeBrowserIcon(row.querySelector('[data-field="icon"]')?.value)
      });
    }

    try {
      save.disabled = true;
      await game.settings.set(MODULE_ID, BROWSER_BOOKMARKS_SETTING, next);
      state.browserBookmarkManagerOpen = false;
      renderPhone();
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save Browser shortcuts`, error);
      ui.notifications.error('Browser shortcuts could not be saved.');
      save.disabled = false;
    }
  });

  container.appendChild(form);
}


// ---------------------------
// News app
// ---------------------------

function isNewsRecord(message) {
  return Boolean(getNewsData(message));
}

function getNewsData(message) {
  return message?.getFlag?.(MODULE_ID, NEWS_FLAG) ?? message?.flags?.[MODULE_ID]?.[NEWS_FLAG] ?? null;
}

function getNewsRecords() {
  return game.messages.contents
    .filter(isNewsRecord)
    .map((document) => ({ document, data: getNewsData(document) }))
    .filter((record) => Boolean(record.data?.id))
    .sort((a, b) => String(b.data.publishedAt || '').localeCompare(String(a.data.publishedAt || '')) || Number(b.data.createdAt || 0) - Number(a.data.createdAt || 0));
}

function getNewsById(id) {
  return getNewsRecords().find((record) => record.data.id === id) ?? null;
}

function getLocalDateTimeValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resetNewsDraft(data = null) {
  state.newsDraft = {
    headline: data?.headline || '',
    blurb: data?.blurb || '',
    author: data?.author || '',
    publisher: data?.publisher || '',
    publishedAt: data?.publishedAt || getLocalDateTimeValue()
  };
}

function renderNewsView() {
  const container = state.root.querySelector('.fc-news-content');
  container.replaceChildren();
  if (state.newsEditorOpen) renderNewsEditor(container);
  else renderNewsFeed(container);
}

function renderNewsFeed(container) {
  if (game.user?.isGM) {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'fc-manager-button fc-news-add';
    add.innerHTML = '<i class="fa-solid fa-plus"></i><span>Add Headline</span>';
    add.addEventListener('click', () => {
      state.selectedNewsId = null;
      resetNewsDraft();
      state.newsEditorOpen = true;
      renderPhone();
    });
    container.appendChild(add);
  }

  const records = getNewsRecords();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-news-empty';
    empty.innerHTML = '<i class="fa-regular fa-newspaper"></i><strong>No stories yet</strong><span>Published headlines will appear here.</span>';
    container.appendChild(empty);
    return;
  }

  for (const record of records) {
    const { data } = record;
    const card = document.createElement('article');
    card.className = 'fc-news-card';

    const top = document.createElement('div');
    top.className = 'fc-news-card-top';
    const publisher = document.createElement('div');
    publisher.className = 'fc-news-publisher';
    publisher.textContent = data.publisher || 'News';
    top.appendChild(publisher);

    if (game.user?.isGM) {
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'fc-news-edit';
      edit.title = 'Edit story';
      edit.setAttribute('aria-label', `Edit ${data.headline || 'news story'}`);
      edit.innerHTML = '<i class="fa-solid fa-pen"></i>';
      edit.addEventListener('click', () => {
        state.selectedNewsId = data.id;
        resetNewsDraft(data);
        state.newsEditorOpen = true;
        renderPhone();
      });
      top.appendChild(edit);
    }

    const headline = document.createElement('h3');
    headline.className = 'fc-news-headline';
    headline.textContent = data.headline || 'Untitled Story';

    const blurb = document.createElement('p');
    blurb.className = 'fc-news-blurb';
    blurb.textContent = data.blurb || '';
    blurb.hidden = !String(data.blurb || '').trim();

    const meta = document.createElement('div');
    meta.className = 'fc-news-meta';
    const bits = [];
    if (String(data.author || '').trim()) bits.push(`By ${data.author}`);
    if (String(data.publishedAt || '').trim()) bits.push(formatNewsPublication(data.publishedAt));
    meta.textContent = bits.join(' • ');
    meta.hidden = bits.length === 0;

    card.append(top, headline, blurb, meta);
    container.appendChild(card);
  }
}

function renderNewsEditor(container) {
  if (!game.user?.isGM) {
    state.newsEditorOpen = false;
    state.selectedNewsId = null;
    resetNewsDraft();
    renderPhone();
    return;
  }

  const form = document.createElement('form');
  form.className = 'fc-news-form';

  const helper = document.createElement('div');
  helper.className = 'fc-news-editor-help';
  helper.innerHTML = '<i class="fa-solid fa-newspaper"></i><span>Publish a headline to every player\'s News feed.</span>';

  const makeField = (labelText, input) => {
    const label = document.createElement('label');
    label.className = 'fc-news-field';
    label.textContent = labelText;
    label.appendChild(input);
    return label;
  };

  const headlineInput = document.createElement('input');
  headlineInput.type = 'text';
  headlineInput.maxLength = 160;
  headlineInput.placeholder = 'Breaking news headline';
  headlineInput.value = state.newsDraft.headline;

  const blurbInput = document.createElement('textarea');
  blurbInput.rows = 5;
  blurbInput.maxLength = 900;
  blurbInput.placeholder = 'Short summary of the story...';
  blurbInput.value = state.newsDraft.blurb;

  const publisherInput = document.createElement('input');
  publisherInput.type = 'text';
  publisherInput.maxLength = 100;
  publisherInput.placeholder = 'Daily Bugle';
  publisherInput.value = state.newsDraft.publisher;

  const authorInput = document.createElement('input');
  authorInput.type = 'text';
  authorInput.maxLength = 100;
  authorInput.placeholder = 'Ben Urich';
  authorInput.value = state.newsDraft.author;

  const publishedInput = document.createElement('input');
  publishedInput.type = 'datetime-local';
  publishedInput.value = state.newsDraft.publishedAt || getLocalDateTimeValue();

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'fc-create-group-button fc-news-save';
  save.innerHTML = '<i class="fa-solid fa-paper-plane"></i><span>Publish Story</span>';

  form.append(
    helper,
    makeField('Headline', headlineInput),
    makeField('Blurb', blurbInput),
    makeField('Publisher', publisherInput),
    makeField('Author', authorInput),
    makeField('Publication date / time', publishedInput),
    save
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.newsDraft = {
      headline: headlineInput.value,
      blurb: blurbInput.value,
      publisher: publisherInput.value,
      author: authorInput.value,
      publishedAt: publishedInput.value || getLocalDateTimeValue()
    };
    save.disabled = true;
    try {
      await saveNewsDraft();
    } finally {
      save.disabled = false;
    }
  });
  container.appendChild(form);

  if (state.selectedNewsId) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'fc-manager-button fc-news-delete';
    del.innerHTML = '<i class="fa-solid fa-trash"></i><span>Delete Story</span>';
    del.addEventListener('click', () => deleteSelectedNews());
    container.appendChild(del);
  }

  requestAnimationFrame(() => headlineInput.focus());
}

async function saveNewsDraft() {
  if (!game.user?.isGM) return;
  const headline = String(state.newsDraft.headline || '').trim();
  if (!headline) {
    ui.notifications.warn('Enter a headline before publishing.');
    return;
  }

  const existing = state.selectedNewsId ? getNewsById(state.selectedNewsId) : null;
  const now = Date.now();
  const data = {
    schema: 1,
    id: existing?.data?.id || makeId(),
    headline,
    blurb: String(state.newsDraft.blurb || '').trim(),
    author: String(state.newsDraft.author || '').trim(),
    publisher: String(state.newsDraft.publisher || '').trim(),
    publishedAt: String(state.newsDraft.publishedAt || getLocalDateTimeValue()),
    createdAt: existing?.data?.createdAt || now,
    updatedAt: now,
    createdByUserId: existing?.data?.createdByUserId || game.user.id
  };

  try {
    if (existing) {
      await existing.document.update({
        content: `[News] ${formatSafeChatContent(headline)}`,
        speaker: { alias: data.publisher || 'News' },
        [`flags.${MODULE_ID}.${NEWS_FLAG}`]: data
      });
    } else {
      await createChatMessageDocument({
        content: `[News] ${formatSafeChatContent(headline)}`,
        speaker: { alias: data.publisher || 'News' },
        flags: { [MODULE_ID]: { [NEWS_FLAG]: data } }
      });
    }
    state.selectedNewsId = null;
    state.newsEditorOpen = false;
    resetNewsDraft();
    ui.notifications.info(existing ? 'News story updated.' : 'News story published.');
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to save news story`, error);
    ui.notifications.error('The news story could not be saved. Check the console for details.');
  }
}

async function deleteSelectedNews() {
  if (!game.user?.isGM || !state.selectedNewsId) return;
  const record = getNewsById(state.selectedNewsId);
  if (!record) return;
  const confirmed = window.confirm(`Delete "${record.data.headline || 'Untitled Story'}"?`);
  if (!confirmed) return;
  try {
    await record.document.delete();
    state.selectedNewsId = null;
    state.newsEditorOpen = false;
    resetNewsDraft();
    ui.notifications.info('News story deleted.');
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to delete news story`, error);
    ui.notifications.error('The news story could not be deleted. Check the console for details.');
  }
}

function formatNewsPublication(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return String(value || '');
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return date.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------------------------
// Notes app
// ---------------------------

function isNoteRecord(message) {
  return Boolean(getNoteData(message));
}

function getNoteData(message) {
  return message?.getFlag?.(MODULE_ID, NOTE_FLAG) ?? message?.flags?.[MODULE_ID]?.[NOTE_FLAG] ?? null;
}

function getNoteRecords() {
  return game.messages.contents
    .filter(isNoteRecord)
    .map((document) => ({ document, data: getNoteData(document) }))
    .filter((record) => record.data?.ownerUserId === game.user?.id)
    .sort((a, b) => Number(b.data.updatedAt || 0) - Number(a.data.updatedAt || 0));
}

function getNoteById(id) {
  return getNoteRecords().find((record) => record.data.id === id) ?? null;
}

function resetNoteDraft(data = null) {
  state.noteDraft = {
    title: data?.title || "",
    body: data?.body || ""
  };
}

function renderNotesView() {
  const container = state.root.querySelector('.fc-notes-content');
  container.replaceChildren();
  if (state.noteEditorOpen) renderNoteEditor(container);
  else renderNoteList(container);
}

function renderNoteList(container) {
  const privacy = document.createElement('div');
  privacy.className = 'fc-note-privacy';
  privacy.innerHTML = '<i class="fa-solid fa-lock"></i><span>Your notes are visible only to your Foundry user.</span>';
  container.appendChild(privacy);

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'fc-manager-button fc-note-add';
  add.innerHTML = '<i class="fa-solid fa-plus"></i><span>New Note</span>';
  add.addEventListener('click', () => {
    state.selectedNoteId = null;
    resetNoteDraft();
    state.noteEditorOpen = true;
    renderPhone();
  });
  container.appendChild(add);

  const notes = getNoteRecords();
  if (!notes.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-note-empty';
    empty.innerHTML = '<i class="fa-regular fa-note-sticky"></i><strong>No notes yet</strong><span>Tap New Note to jot something down.</span>';
    container.appendChild(empty);
    return;
  }

  for (const record of notes) {
    const { data } = record;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'fc-note-card';

    const title = document.createElement('div');
    title.className = 'fc-note-card-title';
    title.textContent = data.title || 'Untitled Note';

    const preview = document.createElement('div');
    preview.className = 'fc-note-card-preview';
    preview.textContent = truncate(String(data.body || '').replace(/\s+/g, ' ').trim() || 'Empty note', 92);

    const meta = document.createElement('div');
    meta.className = 'fc-note-card-meta';
    meta.textContent = `Updated ${formatNoteDate(data.updatedAt || data.createdAt)}`;

    card.append(title, preview, meta);
    card.addEventListener('click', () => {
      state.selectedNoteId = data.id;
      resetNoteDraft(data);
      state.noteEditorOpen = true;
      renderPhone();
    });
    container.appendChild(card);
  }
}

function renderNoteEditor(container) {
  const form = document.createElement('form');
  form.className = 'fc-note-form';

  const privacy = document.createElement('div');
  privacy.className = 'fc-note-privacy';
  privacy.innerHTML = '<i class="fa-solid fa-lock"></i><span>Private note</span>';

  const titleLabel = document.createElement('label');
  titleLabel.className = 'fc-note-field';
  titleLabel.textContent = 'Title';
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.maxLength = 100;
  titleInput.placeholder = 'Note title';
  titleInput.value = state.noteDraft.title;
  titleLabel.appendChild(titleInput);

  const bodyLabel = document.createElement('label');
  bodyLabel.className = 'fc-note-field';
  bodyLabel.textContent = 'Note';
  const bodyInput = document.createElement('textarea');
  bodyInput.rows = 11;
  bodyInput.maxLength = 12000;
  bodyInput.placeholder = 'Write your note...';
  bodyInput.value = state.noteDraft.body;
  bodyLabel.appendChild(bodyInput);

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'fc-create-group-button fc-note-save';
  save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Save Note</span>';

  form.append(privacy, titleLabel, bodyLabel, save);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.noteDraft.title = titleInput.value;
    state.noteDraft.body = bodyInput.value;
    save.disabled = true;
    try {
      await saveNoteDraft();
    } finally {
      save.disabled = false;
    }
  });
  container.appendChild(form);

  if (state.selectedNoteId) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'fc-manager-button fc-note-delete';
    del.innerHTML = '<i class="fa-solid fa-trash"></i><span>Delete Note</span>';
    del.addEventListener('click', () => deleteSelectedNote());
    container.appendChild(del);
  }

  requestAnimationFrame(() => (state.selectedNoteId ? bodyInput : titleInput).focus());
}

async function saveNoteDraft() {
  const body = String(state.noteDraft.body || '').trim();
  let title = String(state.noteDraft.title || '').trim();
  if (!title && !body) {
    ui.notifications.warn('Write something before saving the note.');
    return;
  }
  if (!title) title = truncate(body.split(/\r?\n/)[0] || 'Untitled Note', 60);

  const existing = state.selectedNoteId ? getNoteById(state.selectedNoteId) : null;
  const now = Date.now();
  const data = {
    schema: 1,
    id: existing?.data?.id || makeId(),
    ownerUserId: game.user.id,
    title,
    body: String(state.noteDraft.body || ''),
    createdAt: existing?.data?.createdAt || now,
    updatedAt: now
  };

  try {
    if (existing) {
      await existing.document.update({
        content: `[Phone Note] ${formatSafeChatContent(title)}`,
        [`flags.${MODULE_ID}.${NOTE_FLAG}`]: data
      });
    } else {
      await createChatMessageDocument({
        content: `[Phone Note] ${formatSafeChatContent(title)}`,
        speaker: { alias: 'Notes' },
        whisper: [game.user.id],
        flags: { [MODULE_ID]: { [NOTE_FLAG]: data } }
      });
    }
    state.selectedNoteId = null;
    state.noteEditorOpen = false;
    resetNoteDraft();
    ui.notifications.info(existing ? 'Note updated.' : 'Note saved.');
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to save note`, error);
    ui.notifications.error('The note could not be saved. Check the console for details.');
  }
}

async function deleteSelectedNote() {
  if (!state.selectedNoteId) return;
  const record = getNoteById(state.selectedNoteId);
  if (!record) return;
  const confirmed = window.confirm(`Delete "${record.data.title || 'Untitled Note'}"?`);
  if (!confirmed) return;
  try {
    await record.document.delete();
    state.selectedNoteId = null;
    state.noteEditorOpen = false;
    resetNoteDraft();
    ui.notifications.info('Note deleted.');
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to delete note`, error);
    ui.notifications.error('The note could not be deleted. Check the console for details.');
  }
}

function formatNoteDate(timestamp) {
  return new Date(Number(timestamp) || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function isInternalPhoneRecord(message) {
  return isPhoneMessage(message) || isMissionRecord(message) || isFriendpageRecord(message) || isNoteRecord(message) || isNewsRecord(message) || isMapRecord(message);
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
// Mondo Rides app
// ---------------------------

function normalizeMondoDestination(entry) {
  if (!entry || !entry.sceneId) return null;
  return {
    sceneId: String(entry.sceneId),
    name: String(entry.name || 'Destination'),
    image: String(entry.image || '')
  };
}

function getMondoDestinations() {
  const raw = game.settings.get(MODULE_ID, MONDO_RIDES_SETTING);
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMondoDestination).filter(Boolean);
}

function getMondoDestination(sceneId) {
  return getMondoDestinations().find((entry) => entry.sceneId === sceneId) || null;
}

function getMondoSceneImage(scene) {
  return String(scene?.thumbnail || scene?.thumb || scene?.background?.src || '');
}

function snapshotMondoScene(scene) {
  return {
    sceneId: scene.id,
    name: String(scene.navName || scene.name || 'Destination'),
    image: getMondoSceneImage(scene)
  };
}

function getMondoCurrentSceneId() {
  return game.scenes?.viewed?.id || globalThis.canvas?.scene?.id || game.user?.viewedScene || null;
}

function renderMondoRidesView() {
  const container = state.root.querySelector('.fc-mondo-content');
  if (!container) return;
  container.replaceChildren();

  if (state.mondoManagerOpen) {
    renderMondoManager(container);
    return;
  }
  renderMondoPassengerView(container);
}

function renderMondoPassengerView(container) {
  const hero = document.createElement('section');
  hero.className = 'fc-mondo-hero';
  hero.innerHTML = `
    <div class="fc-mondo-brand"><span class="fc-mondo-brand-mark"><i class="fa-solid fa-car-side"></i></span><div><strong>Mondo</strong><span>RIDES</span></div></div>
    <div class="fc-mondo-question">Where to?</div>
  `;
  container.appendChild(hero);

  if (game.user?.isGM) {
    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'fc-manager-button fc-mondo-manage';
    manage.innerHTML = '<i class="fa-solid fa-sliders"></i><span>Manage Destinations</span>';
    manage.addEventListener('click', () => {
      state.mondoManagerOpen = true;
      state.mondoRidePending = null;
      renderPhone();
    });
    container.appendChild(manage);
  }

  const heading = document.createElement('div');
  heading.className = 'fc-mondo-section-heading';
  heading.innerHTML = '<strong>Available rides</strong><span>Choose a destination</span>';
  container.appendChild(heading);

  const destinations = getMondoDestinations();
  if (!destinations.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-mondo-empty';
    empty.innerHTML = `<i class="fa-solid fa-car-side"></i><strong>No rides available</strong><span>${game.user?.isGM ? 'Open Manage Destinations to make scenes available.' : 'The GM has not opened any downtime destinations yet.'}</span>`;
    container.appendChild(empty);
    return;
  }

  const currentSceneId = getMondoCurrentSceneId();
  const list = document.createElement('div');
  list.className = 'fc-mondo-destination-list';
  for (const destination of destinations) {
    const row = document.createElement('article');
    row.className = 'fc-mondo-destination';

    const image = document.createElement('div');
    image.className = 'fc-mondo-destination-image';
    if (destination.image) image.style.backgroundImage = `url("${destination.image.replace(/"/g, '%22')}")`;
    else image.innerHTML = '<i class="fa-solid fa-city"></i>';

    const copy = document.createElement('div');
    copy.className = 'fc-mondo-destination-copy';
    const name = document.createElement('strong');
    name.textContent = destination.name;
    const detail = document.createElement('span');
    const isHere = destination.sceneId === currentSceneId;
    detail.innerHTML = isHere
      ? '<i class="fa-solid fa-location-dot"></i> You are here'
      : '<i class="fa-solid fa-bolt"></i> Available now';
    copy.append(name, detail);

    const ride = document.createElement('button');
    ride.type = 'button';
    ride.className = 'fc-mondo-ride-button';
    const pending = state.mondoRidePending?.sceneId === destination.sceneId;
    ride.disabled = Boolean(state.mondoRidePending) || isHere;
    ride.innerHTML = isHere
      ? '<i class="fa-solid fa-check"></i>'
      : pending
        ? '<i class="fa-solid fa-spinner fa-spin"></i>'
        : '<i class="fa-solid fa-arrow-right"></i>';
    ride.title = isHere ? 'You are already here' : `Ride to ${destination.name}`;
    ride.addEventListener('click', () => requestMondoRide(destination));

    row.append(image, copy, ride);
    list.appendChild(row);
  }
  container.appendChild(list);

  const foot = document.createElement('div');
  foot.className = 'fc-mondo-footnote';
  foot.innerHTML = state.mondoRidePending
    ? '<i class="fa-solid fa-car-side"></i><span>Finding your Mondo driver…</span>'
    : '<i class="fa-solid fa-circle-info"></i><span>Rides change only your Foundry scene view. Other players stay where they are.</span>';
  container.appendChild(foot);
}

function renderMondoManager(container) {
  if (!game.user?.isGM) {
    state.mondoManagerOpen = false;
    renderPhone();
    return;
  }

  const help = document.createElement('div');
  help.className = 'fc-mondo-manager-help';
  help.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>Turn destinations on or off at any time. Players only see scenes that are currently enabled here.</span>';
  container.appendChild(help);

  const activeIds = new Set(getMondoDestinations().map((entry) => entry.sceneId));
  const scenes = [...game.scenes.contents].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  if (!scenes.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-mondo-empty';
    empty.innerHTML = '<i class="fa-solid fa-map"></i><strong>No scenes found</strong><span>Create Foundry Scenes before adding Mondo Rides destinations.</span>';
    container.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.className = 'fc-mondo-manager-list';
  for (const scene of scenes) {
    const label = document.createElement('label');
    label.className = `fc-mondo-manager-row${activeIds.has(scene.id) ? ' is-active' : ''}`;

    const thumb = document.createElement('span');
    thumb.className = 'fc-mondo-manager-thumb';
    const sceneImage = getMondoSceneImage(scene);
    if (sceneImage) thumb.style.backgroundImage = `url("${sceneImage.replace(/"/g, '%22')}")`;
    else thumb.innerHTML = '<i class="fa-solid fa-map-location-dot"></i>';

    const copy = document.createElement('span');
    copy.className = 'fc-mondo-manager-copy';
    const title = document.createElement('strong');
    title.textContent = scene.name || 'Unnamed Scene';
    const status = document.createElement('span');
    status.textContent = activeIds.has(scene.id) ? 'Available in Mondo Rides' : 'Unavailable to Mondo Rides';
    copy.append(title, status);

    const toggleWrap = document.createElement('span');
    toggleWrap.className = 'fc-mondo-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = activeIds.has(scene.id);
    checkbox.setAttribute('aria-label', `Make ${scene.name || 'scene'} available in Mondo Rides`);
    const slider = document.createElement('span');
    slider.className = 'fc-mondo-toggle-slider';
    toggleWrap.append(checkbox, slider);

    checkbox.addEventListener('change', async () => {
      checkbox.disabled = true;
      try {
        await setMondoSceneEnabled(scene, checkbox.checked);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to update Mondo Rides destination`, error);
        checkbox.checked = !checkbox.checked;
        ui.notifications.error('Mondo Rides destination could not be updated.');
      } finally {
        checkbox.disabled = false;
      }
    });

    label.append(thumb, copy, toggleWrap);
    list.appendChild(label);
  }
  container.appendChild(list);

  const note = document.createElement('div');
  note.className = 'fc-mondo-manager-note';
  note.innerHTML = '<i class="fa-solid fa-shield-halved"></i><span>Ride requests are validated by a connected GM before a player is moved to a destination.</span>';
  container.appendChild(note);
}

async function setMondoSceneEnabled(scene, enabled) {
  if (!game.user?.isGM || !scene?.id) return;
  const current = getMondoDestinations();
  const without = current.filter((entry) => entry.sceneId !== scene.id);
  if (enabled) without.push(snapshotMondoScene(scene));
  without.sort((a, b) => a.name.localeCompare(b.name));
  await game.settings.set(MODULE_ID, MONDO_RIDES_SETTING, without);
}

function getMondoDispatchGm() {
  const activeGm = game.users?.activeGM;
  if (activeGm?.active) return activeGm;
  return game.users?.contents?.find((user) => user.isGM && user.active) || null;
}

function isMondoDispatchAuthority() {
  return Boolean(game.user?.isGM && getMondoDispatchGm()?.id === game.user.id);
}

async function requestMondoRide(destination) {
  if (!destination?.sceneId || state.mondoRidePending) return;
  if (!getMondoDestination(destination.sceneId)) {
    ui.notifications.warn('That Mondo Rides destination is no longer available.');
    renderPhone();
    return;
  }
  if (destination.sceneId === getMondoCurrentSceneId()) {
    ui.notifications.info('You are already at that destination.');
    return;
  }

  const requestId = makeId();
  state.mondoRidePending = { requestId, sceneId: destination.sceneId, name: destination.name };
  renderPhone();

  if (game.user?.isGM) {
    const scene = game.scenes.get(destination.sceneId);
    if (!scene) {
      state.mondoRidePending = null;
      ui.notifications.error('That Foundry Scene no longer exists.');
      renderPhone();
      return;
    }
    try {
      await scene.view();
      state.mondoRidePending = null;
      closePhone();
      ui.notifications.info(`Mondo Rides: arrived at ${destination.name}.`);
    } catch (error) {
      console.error(`${MODULE_ID} | GM Mondo ride failed`, error);
      state.mondoRidePending = null;
      ui.notifications.error('Mondo Rides could not open that Scene.');
      renderPhone();
    }
    return;
  }

  const dispatcher = getMondoDispatchGm();
  if (!dispatcher) {
    state.mondoRidePending = null;
    ui.notifications.warn('Mondo Rides is unavailable because no GM is currently connected.');
    renderPhone();
    return;
  }

  game.socket.emit(SOCKET_NAME, {
    type: 'mondo-ride-request',
    requestId,
    sceneId: destination.sceneId,
    destinationName: destination.name,
    requestingUserId: game.user.id,
    authorUserId: game.user.id,
    sentAt: Date.now()
  });
}

async function handleMondoRideRequest(payload) {
  if (!isMondoDispatchAuthority()) return;
  if (!payload?.requestId || !payload.sceneId || !payload.requestingUserId) return;
  if (payload.authorUserId !== payload.requestingUserId) return;

  const destination = getMondoDestination(payload.sceneId);
  const user = game.users.get(payload.requestingUserId);
  const scene = game.scenes.get(payload.sceneId);
  if (!destination || !user || !scene || !user.active) {
    emitMondoRideResponse(payload, false, 'That destination is no longer available.');
    return;
  }

  try {
    if (typeof scene.pullUsers === 'function') {
      scene.pullUsers([user]);
      emitMondoRideResponse(payload, true, '', 'core-pull');
    } else {
      // Foundry v12 compatibility: approve the request and allow the requesting client to view the Scene.
      emitMondoRideResponse(payload, true, '', 'client-view');
    }
  } catch (error) {
    console.error(`${MODULE_ID} | Mondo Rides dispatch failed`, error);
    emitMondoRideResponse(payload, false, 'The ride could not be dispatched.');
  }
}

function emitMondoRideResponse(request, success, message = '', mode = '') {
  if (!game.socket) return;
  game.socket.emit(SOCKET_NAME, {
    type: 'mondo-ride-response',
    requestId: request.requestId,
    sceneId: request.sceneId,
    destinationName: request.destinationName || getMondoDestination(request.sceneId)?.name || 'destination',
    targetUserId: request.requestingUserId,
    success: Boolean(success),
    message,
    mode,
    authorUserId: game.user.id,
    sentAt: Date.now()
  });
}

async function handleMondoRideResponse(payload) {
  if (payload?.targetUserId !== game.user?.id) return;
  if (!state.mondoRidePending || payload.requestId !== state.mondoRidePending.requestId) return;

  const pending = state.mondoRidePending;
  if (!payload.success) {
    state.mondoRidePending = null;
    ui.notifications.warn(payload.message || 'Mondo Rides could not complete that trip.');
    if (state.phoneOpen && state.app === 'mondo') renderPhone();
    return;
  }

  if (payload.mode === 'client-view') {
    const scene = game.scenes.get(payload.sceneId);
    if (!scene) {
      state.mondoRidePending = null;
      ui.notifications.error('Mondo Rides could not access that Scene on this client.');
      if (state.phoneOpen && state.app === 'mondo') renderPhone();
      return;
    }
    try {
      await scene.view();
    } catch (error) {
      console.error(`${MODULE_ID} | Mondo Rides v12 client view failed`, error);
      state.mondoRidePending = null;
      ui.notifications.error('Mondo Rides could not open that Scene. On Foundry v12, make sure the Scene is accessible to players.');
      if (state.phoneOpen && state.app === 'mondo') renderPhone();
      return;
    }
  }

  state.mondoRidePending = null;
  closePhone();
  ui.notifications.info(`Mondo Rides: arrived at ${payload.destinationName || pending.name}.`);
}

// ---------------------------
// Maps app
// ---------------------------

function isMapRecord(message) {
  return Boolean(getMapData(message));
}

function getMapData(message) {
  return message?.getFlag?.(MODULE_ID, MAP_FLAG) ?? message?.flags?.[MODULE_ID]?.[MAP_FLAG] ?? null;
}

function isMapVisibleToCurrentUser(data) {
  if (!data) return false;
  if (game.user?.isGM) return true;
  if (data.visibility === 'all') return true;
  return Array.isArray(data.selectedUserIds) && data.selectedUserIds.includes(game.user?.id);
}

function getMapRecords() {
  const latestById = new Map();
  for (const document of game.messages.contents.filter(isMapRecord)) {
    const data = getMapData(document);
    if (!data?.id || !isMapVisibleToCurrentUser(data)) continue;
    const current = latestById.get(data.id);
    if (!current || Number(data.updatedAt || 0) >= Number(current.data.updatedAt || 0)) {
      latestById.set(data.id, { document, data });
    }
  }
  return [...latestById.values()]
    .sort((a, b) => Number(a.data.sortIndex || 0) - Number(b.data.sortIndex || 0) || Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0));
}

function getMapById(id) {
  return getMapRecords().find((record) => record.data.id === id) ?? null;
}

function getCurrentMapRecord() {
  const records = getMapRecords();
  if (!records.length) {
    state.selectedMapId = null;
    return null;
  }
  let record = state.selectedMapId ? records.find((entry) => entry.data.id === state.selectedMapId) : null;
  if (!record) {
    record = records[0];
    state.selectedMapId = record.data.id;
  }
  return record;
}

function resetMapDraft(data = null) {
  const records = game.user?.isGM ? getMapRecords() : [];
  const nextSort = records.length ? Math.max(...records.map((record) => Number(record.data.sortIndex || 0))) + 1 : 0;
  state.mapEditorDraft = {
    id: data?.id || null,
    name: data?.name || '',
    image: data?.image || '',
    visibility: data?.visibility === 'selected' ? 'selected' : 'all',
    selectedUserIds: new Set(Array.isArray(data?.selectedUserIds) ? data.selectedUserIds : []),
    markers: Array.isArray(data?.markers) ? data.markers.map((marker) => ({
      id: marker.id || makeId(),
      sourceType: marker.sourceType === 'npc' ? 'npc' : 'user',
      sourceId: marker.sourceId || '',
      sourceName: marker.sourceName || '',
      sourceAvatar: marker.sourceAvatar || 'icons/svg/mystery-man.svg',
      label: marker.label || '',
      x: clampMapPercent(marker.x, 50),
      y: clampMapPercent(marker.y, 50)
    })) : [],
    createdAt: data?.createdAt || null,
    sortIndex: Number.isFinite(Number(data?.sortIndex)) ? Number(data.sortIndex) : nextSort
  };
}

function clampMapPercent(value, fallback = 50) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(98, Math.max(2, number));
}

function getMapMarkerSources() {
  const assignedActorIds = new Set(game.users.contents.map((user) => user.character?.id).filter(Boolean));
  const users = game.users.contents
    .filter((user) => !user.isGM)
    .map((user) => ({
      key: `user:${user.id}`,
      type: 'user',
      id: user.id,
      name: getUserDisplayName(user),
      avatar: getUserAvatar(user),
      detail: user.character ? 'Player Character' : 'Player User'
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const npcs = game.actors.contents
    .filter((actor) => !assignedActorIds.has(actor.id))
    .map((actor) => ({
      key: `npc:${actor.id}`,
      type: 'npc',
      id: actor.id,
      name: actor.name || 'NPC',
      avatar: getActorAvatar(actor),
      detail: 'NPC Actor'
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { users, npcs, all: [...users, ...npcs] };
}

function getMapMarkerPresentation(marker) {
  if (marker.sourceType === 'npc') {
    const actor = game.actors.get(marker.sourceId);
    return {
      name: actor?.name || marker.sourceName || 'NPC',
      avatar: actor ? getActorAvatar(actor) : (marker.sourceAvatar || 'icons/svg/mystery-man.svg')
    };
  }
  const user = game.users.get(marker.sourceId);
  return {
    name: user ? getUserDisplayName(user) : (marker.sourceName || 'Player'),
    avatar: user ? getUserAvatar(user) : (marker.sourceAvatar || 'icons/svg/mystery-man.svg')
  };
}

function getMapAudienceLabel(data) {
  if (data.visibility !== 'selected') return 'All Players';
  const names = (data.selectedUserIds || []).map((id) => getUserDisplayName(game.users.get(id))).filter(Boolean);
  if (!names.length) return 'Selected Players';
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
}

function renderMapsView() {
  const container = state.root.querySelector('.fc-maps-content');
  if (!container) return;
  container.replaceChildren();
  if (state.mapEditorOpen) {
    renderMapEditor(container);
    return;
  }
  if (state.mapManagerOpen) {
    renderMapManager(container);
    return;
  }
  renderMapViewer(container);
}

function renderMapViewer(container) {
  const records = getMapRecords();

  if (game.user?.isGM) {
    const manage = document.createElement('button');
    manage.type = 'button';
    manage.className = 'fc-manager-button fc-map-manage-button';
    manage.innerHTML = '<i class="fa-solid fa-sliders"></i><span>Manage Maps</span>';
    manage.addEventListener('click', () => {
      state.mapManagerOpen = true;
      state.mapExpanded = false;
      renderPhone();
    });
    container.appendChild(manage);
  }

  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-map-empty';
    empty.innerHTML = `<i class="fa-regular fa-map"></i><strong>No maps available</strong><span>${game.user?.isGM ? 'Use Manage Maps to create the first reference map.' : 'The GM has not shared any maps with you yet.'}</span>`;
    container.appendChild(empty);
    return;
  }

  const current = getCurrentMapRecord();
  const index = Math.max(0, records.findIndex((record) => record.data.id === current.data.id));

  const nav = document.createElement('div');
  nav.className = 'fc-map-nav';
  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'fc-map-nav-button';
  previous.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
  previous.title = 'Previous map';
  previous.disabled = records.length < 2;
  previous.addEventListener('click', () => {
    state.selectedMapId = records[(index - 1 + records.length) % records.length].data.id;
    state.mapExpanded = false;
    renderPhone();
  });

  const identity = document.createElement('div');
  identity.className = 'fc-map-nav-identity';
  const name = document.createElement('strong');
  name.textContent = current.data.name || 'Map';
  const count = document.createElement('span');
  count.textContent = `${index + 1} of ${records.length}`;
  identity.append(name, count);

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'fc-map-nav-button';
  next.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
  next.title = 'Next map';
  next.disabled = records.length < 2;
  next.addEventListener('click', () => {
    state.selectedMapId = records[(index + 1) % records.length].data.id;
    state.mapExpanded = false;
    renderPhone();
  });
  nav.append(previous, identity, next);
  container.appendChild(nav);

  const toolbar = document.createElement('div');
  toolbar.className = 'fc-map-view-toolbar';
  const audience = document.createElement('span');
  audience.innerHTML = `<i class="fa-solid ${current.data.visibility === 'selected' ? 'fa-lock' : 'fa-users'}"></i> ${escapeMissionText(getMapAudienceLabel(current.data))}`;
  const expand = document.createElement('button');
  expand.type = 'button';
  expand.className = 'fc-map-expand';
  expand.innerHTML = '<i class="fa-solid fa-up-right-and-down-left-from-center"></i> Open Large';
  expand.addEventListener('click', () => openLargeMapWindow(current.data));
  toolbar.append(audience, expand);
  container.appendChild(toolbar);

  const viewport = document.createElement('div');
  viewport.className = 'fc-map-viewport';
  const canvas = buildMapCanvas(current.data, { editable: false });
  canvas.classList.add('is-tappable');
  canvas.title = 'Click to open a larger map';
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('aria-label', `Open ${current.data.name || 'map'} in a larger window`);
  canvas.addEventListener('click', () => openLargeMapWindow(current.data));
  canvas.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openLargeMapWindow(current.data);
  });
  viewport.appendChild(canvas);
  container.appendChild(viewport);

  const hint = document.createElement('div');
  hint.className = 'fc-map-view-hint';
  hint.innerHTML = '<i class="fa-solid fa-magnifying-glass-plus"></i><span>Click the map to open a larger view. Markers are reference locations only.</span>';
  container.appendChild(hint);
}

function openLargeMapWindow(mapData) {
  closeLargeMapWindow();
  if (!mapData) return;

  const overlay = document.createElement('div');
  overlay.className = 'fc-map-lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', `${mapData.name || 'Map'} large view`);

  const windowEl = document.createElement('div');
  windowEl.className = 'fc-map-lightbox-window';

  const header = document.createElement('div');
  header.className = 'fc-map-lightbox-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'fc-map-lightbox-title';
  const kicker = document.createElement('span');
  kicker.textContent = 'MAPS';
  const title = document.createElement('strong');
  title.textContent = mapData.name || 'Map';
  titleWrap.append(kicker, title);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'fc-map-lightbox-close';
  close.setAttribute('aria-label', 'Close large map');
  close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  close.addEventListener('click', closeLargeMapWindow);

  header.append(titleWrap, close);

  const viewport = document.createElement('div');
  viewport.className = 'fc-map-lightbox-viewport';
  const canvas = buildMapCanvas(mapData, { editable: false });
  canvas.classList.add('fc-map-lightbox-canvas');
  viewport.appendChild(canvas);

  const footer = document.createElement('div');
  footer.className = 'fc-map-lightbox-footer';
  footer.innerHTML = '<i class="fa-solid fa-location-dot"></i><span>Reference map only — marker positions do not move Foundry tokens.</span>';

  windowEl.append(header, viewport, footer);
  overlay.appendChild(windowEl);
  overlay.addEventListener('pointerdown', (event) => {
    if (event.target === overlay) closeLargeMapWindow();
  });

  const onKeydown = (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    closeLargeMapWindow();
  };
  overlay._fcKeydownHandler = onKeydown;
  window.addEventListener('keydown', onKeydown);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => close.focus());
}

function closeLargeMapWindow() {
  const overlay = document.querySelector('.fc-map-lightbox');
  if (!overlay) return;
  if (overlay._fcKeydownHandler) window.removeEventListener('keydown', overlay._fcKeydownHandler);
  overlay.remove();
}

function buildMapCanvas(data, { editable = false } = {}) {
  const canvas = document.createElement('div');
  canvas.className = `fc-map-canvas${editable ? ' is-editable' : ''}`;

  if (String(data.image || '').trim()) {
    canvas.classList.add('has-image');
    const image = document.createElement('img');
    image.className = 'fc-map-background';
    image.src = data.image;
    image.alt = data.name ? `${data.name} map` : 'Map';
    image.draggable = false;
    canvas.appendChild(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'fc-map-background-placeholder';
    placeholder.innerHTML = '<i class="fa-regular fa-image"></i><span>Choose a map image</span>';
    canvas.appendChild(placeholder);
  }

  for (const marker of data.markers || []) {
    const presentation = getMapMarkerPresentation(marker);
    const pin = document.createElement(editable ? 'button' : 'div');
    if (editable) pin.type = 'button';
    pin.className = `fc-map-marker${editable ? ' is-draggable' : ''}`;
    pin.style.left = `${clampMapPercent(marker.x)}%`;
    pin.style.top = `${clampMapPercent(marker.y)}%`;
    pin.dataset.markerId = marker.id;
    pin.title = editable ? `Drag ${marker.label || presentation.name}` : (marker.label || presentation.name);

    const avatar = document.createElement('img');
    avatar.src = presentation.avatar || 'icons/svg/mystery-man.svg';
    avatar.alt = '';
    const label = document.createElement('span');
    label.textContent = marker.label || presentation.name;
    pin.append(avatar, label);

    if (editable) pin.addEventListener('pointerdown', (event) => beginMapMarkerDrag(event, marker.id, canvas, pin));
    canvas.appendChild(pin);
  }
  return canvas;
}

function beginMapMarkerDrag(event, markerId, canvas, pin) {
  if (!game.user?.isGM || event.button > 0) return;
  event.preventDefault();
  event.stopPropagation();
  const marker = state.mapEditorDraft.markers.find((entry) => entry.id === markerId);
  if (!marker) return;
  pin.classList.add('is-dragging');
  pin.setPointerCapture?.(event.pointerId);

  const update = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    marker.x = clampMapPercent(((clientX - rect.left) / rect.width) * 100);
    marker.y = clampMapPercent(((clientY - rect.top) / rect.height) * 100);
    pin.style.left = `${marker.x}%`;
    pin.style.top = `${marker.y}%`;
  };
  update(event.clientX, event.clientY);

  const move = (moveEvent) => {
    moveEvent.preventDefault();
    update(moveEvent.clientX, moveEvent.clientY);
  };
  const end = () => {
    pin.classList.remove('is-dragging');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
  };
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { once: true });
  window.addEventListener('pointercancel', end, { once: true });
}

function renderMapManager(container) {
  if (!game.user?.isGM) {
    state.mapManagerOpen = false;
    renderPhone();
    return;
  }

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'fc-manager-button fc-map-add';
  add.innerHTML = '<i class="fa-solid fa-plus"></i><span>New Map</span>';
  add.addEventListener('click', () => {
    state.selectedMapId = null;
    resetMapDraft();
    state.mapEditorOpen = true;
    renderPhone();
  });
  container.appendChild(add);

  const helper = document.createElement('div');
  helper.className = 'fc-map-manager-help';
  helper.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>Maps are reference images only. Drag character markers to show approximate party locations.</span>';
  container.appendChild(helper);

  const records = getMapRecords();
  if (!records.length) {
    const empty = document.createElement('div');
    empty.className = 'fc-map-empty';
    empty.innerHTML = '<i class="fa-regular fa-map"></i><strong>No maps configured</strong><span>Create a map and choose an image to begin.</span>';
    container.appendChild(empty);
    return;
  }

  records.forEach((record, index) => {
    const row = document.createElement('div');
    row.className = 'fc-map-manager-row';
    const thumb = document.createElement('div');
    thumb.className = 'fc-map-manager-thumb';
    if (record.data.image) thumb.style.backgroundImage = `url("${String(record.data.image).replace(/"/g, '%22')}")`;
    else thumb.innerHTML = '<i class="fa-regular fa-map"></i>';

    const text = document.createElement('div');
    text.className = 'fc-map-manager-copy';
    const title = document.createElement('strong');
    title.textContent = record.data.name || 'Untitled Map';
    const detail = document.createElement('span');
    detail.textContent = `${getMapAudienceLabel(record.data)} • ${(record.data.markers || []).length} marker${(record.data.markers || []).length === 1 ? '' : 's'}`;
    text.append(title, detail);

    const actions = document.createElement('div');
    actions.className = 'fc-map-manager-row-actions';
    const up = document.createElement('button');
    up.type = 'button';
    up.title = 'Move map up';
    up.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    up.disabled = index === 0;
    up.addEventListener('click', () => moveMapRecord(record.data.id, -1));
    const down = document.createElement('button');
    down.type = 'button';
    down.title = 'Move map down';
    down.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
    down.disabled = index === records.length - 1;
    down.addEventListener('click', () => moveMapRecord(record.data.id, 1));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.title = 'Edit map';
    edit.innerHTML = '<i class="fa-solid fa-pen"></i>';
    edit.addEventListener('click', () => {
      state.selectedMapId = record.data.id;
      resetMapDraft(record.data);
      state.mapEditorOpen = true;
      renderPhone();
    });
    actions.append(up, down, edit);
    row.append(thumb, text, actions);
    container.appendChild(row);
  });
}

async function moveMapRecord(mapId, delta) {
  if (!game.user?.isGM) return;
  const records = getMapRecords();
  const index = records.findIndex((record) => record.data.id === mapId);
  const target = index + Number(delta || 0);
  if (index < 0 || target < 0 || target >= records.length) return;
  const next = [...records];
  [next[index], next[target]] = [next[target], next[index]];
  try {
    for (let sortIndex = 0; sortIndex < next.length; sortIndex++) {
      const record = next[sortIndex];
      if (Number(record.data.sortIndex || 0) === sortIndex) continue;
      const updated = { ...record.data, sortIndex, updatedAt: Date.now() };
      await record.document.update({ [`flags.${MODULE_ID}.${MAP_FLAG}`]: updated });
    }
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to reorder Maps`, error);
    ui.notifications.error('Map order could not be saved.');
  }
}

function renderMapEditor(container) {
  if (!game.user?.isGM) {
    state.mapEditorOpen = false;
    state.mapManagerOpen = false;
    resetMapDraft();
    renderPhone();
    return;
  }

  const draft = state.mapEditorDraft;
  const form = document.createElement('form');
  form.className = 'fc-map-editor';

  const makeField = (text, input) => {
    const label = document.createElement('label');
    label.className = 'fc-map-field';
    const title = document.createElement('span');
    title.textContent = text;
    label.append(title, input);
    return label;
  };

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.maxLength = 80;
  nameInput.placeholder = 'New York City';
  nameInput.value = draft.name;
  nameInput.addEventListener('input', () => { draft.name = nameInput.value; });
  form.appendChild(makeField('Map name', nameInput));

  const imageWrap = document.createElement('div');
  imageWrap.className = 'fc-map-image-row';
  const imageInput = document.createElement('input');
  imageInput.type = 'text';
  imageInput.placeholder = 'path/to/map.webp';
  imageInput.value = draft.image;
  imageInput.addEventListener('input', () => { draft.image = imageInput.value.trim(); });
  const browse = document.createElement('button');
  browse.type = 'button';
  browse.className = 'fc-map-browse';
  browse.innerHTML = '<i class="fa-solid fa-folder-open"></i><span>Browse</span>';
  imageWrap.append(imageInput, browse);
  const imageField = document.createElement('label');
  imageField.className = 'fc-map-field';
  const imageTitle = document.createElement('span');
  imageTitle.textContent = 'Background image';
  imageField.append(imageTitle, imageWrap);
  form.appendChild(imageField);

  const visibility = document.createElement('select');
  for (const [value, text] of [['all', 'All Players'], ['selected', 'Selected Players']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    option.selected = draft.visibility === value;
    visibility.appendChild(option);
  }
  form.appendChild(makeField('Visible to', visibility));

  const playerChoices = document.createElement('div');
  playerChoices.className = 'fc-map-player-choices';
  const drawPlayerChoices = () => {
    playerChoices.replaceChildren();
    playerChoices.hidden = draft.visibility !== 'selected';
    if (playerChoices.hidden) return;
    const users = game.users.contents.filter((user) => !user.isGM).sort((a, b) => getUserDisplayName(a).localeCompare(getUserDisplayName(b)));
    if (!users.length) {
      const none = document.createElement('div');
      none.className = 'fc-map-no-players';
      none.textContent = 'No player users are available.';
      playerChoices.appendChild(none);
      return;
    }
    for (const user of users) {
      const label = document.createElement('label');
      label.className = 'fc-map-player-choice';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = draft.selectedUserIds.has(user.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) draft.selectedUserIds.add(user.id);
        else draft.selectedUserIds.delete(user.id);
      });
      const avatar = document.createElement('img');
      avatar.src = getUserAvatar(user);
      avatar.alt = '';
      const span = document.createElement('span');
      span.textContent = getUserDisplayName(user);
      label.append(checkbox, avatar, span);
      playerChoices.appendChild(label);
    }
  };
  visibility.addEventListener('change', () => {
    draft.visibility = visibility.value === 'selected' ? 'selected' : 'all';
    drawPlayerChoices();
  });
  drawPlayerChoices();
  form.appendChild(playerChoices);

  const editorTitle = document.createElement('div');
  editorTitle.className = 'fc-map-editor-section-title';
  editorTitle.textContent = 'Marker placement';
  form.appendChild(editorTitle);

  const editorHint = document.createElement('div');
  editorHint.className = 'fc-map-editor-hint';
  editorHint.innerHTML = '<i class="fa-solid fa-arrows-up-down-left-right"></i><span>Add a character, then drag their marker directly on the map.</span>';
  form.appendChild(editorHint);

  const canvasHolder = document.createElement('div');
  canvasHolder.className = 'fc-map-editor-canvas-holder';
  form.appendChild(canvasHolder);

  const sourceRow = document.createElement('div');
  sourceRow.className = 'fc-map-source-row';
  const sourceSelect = document.createElement('select');
  const sources = getMapMarkerSources();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Choose character…';
  sourceSelect.appendChild(placeholder);
  if (sources.users.length) {
    const group = document.createElement('optgroup');
    group.label = 'Players';
    for (const source of sources.users) {
      const option = document.createElement('option');
      option.value = source.key;
      option.textContent = source.name;
      group.appendChild(option);
    }
    sourceSelect.appendChild(group);
  }
  if (sources.npcs.length) {
    const group = document.createElement('optgroup');
    group.label = 'NPC Actors';
    for (const source of sources.npcs) {
      const option = document.createElement('option');
      option.value = source.key;
      option.textContent = source.name;
      group.appendChild(option);
    }
    sourceSelect.appendChild(group);
  }
  const addMarker = document.createElement('button');
  addMarker.type = 'button';
  addMarker.className = 'fc-map-add-marker';
  addMarker.innerHTML = '<i class="fa-solid fa-location-dot"></i><span>Add</span>';
  sourceRow.append(sourceSelect, addMarker);
  form.appendChild(sourceRow);

  const markerList = document.createElement('div');
  markerList.className = 'fc-map-marker-list';
  form.appendChild(markerList);

  const drawEditor = () => {
    draft.image = imageInput.value.trim();
    canvasHolder.replaceChildren(buildMapCanvas(draft, { editable: true }));
    markerList.replaceChildren();
    if (!draft.markers.length) {
      const none = document.createElement('div');
      none.className = 'fc-map-marker-empty';
      none.textContent = 'No character markers on this map yet.';
      markerList.appendChild(none);
      return;
    }
    for (const marker of draft.markers) {
      const presentation = getMapMarkerPresentation(marker);
      const row = document.createElement('div');
      row.className = 'fc-map-marker-editor-row';
      const avatar = document.createElement('img');
      avatar.src = presentation.avatar;
      avatar.alt = '';
      const copy = document.createElement('div');
      copy.className = 'fc-map-marker-editor-copy';
      const strong = document.createElement('strong');
      strong.textContent = presentation.name;
      const label = document.createElement('input');
      label.type = 'text';
      label.maxLength = 40;
      label.placeholder = 'Custom label (optional)';
      label.value = marker.label || '';
      label.addEventListener('input', () => {
        marker.label = label.value;
        const pin = [...canvasHolder.querySelectorAll('[data-marker-id]')].find((element) => element.dataset.markerId === marker.id);
        const pinLabel = pin?.querySelector('span');
        if (pinLabel) pinLabel.textContent = marker.label || presentation.name;
      });
      copy.append(strong, label);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'fc-map-remove-marker';
      remove.title = 'Remove marker';
      remove.innerHTML = '<i class="fa-solid fa-trash"></i>';
      remove.addEventListener('click', () => {
        draft.markers = draft.markers.filter((entry) => entry.id !== marker.id);
        drawEditor();
      });
      row.append(avatar, copy, remove);
      markerList.appendChild(row);
    }
  };

  imageInput.addEventListener('change', drawEditor);
  browse.addEventListener('click', () => {
    openMapImagePicker(imageInput.value.trim(), (path) => {
      imageInput.value = path || '';
      draft.image = imageInput.value.trim();
      drawEditor();
    });
  });
  addMarker.addEventListener('click', () => {
    const source = sources.all.find((entry) => entry.key === sourceSelect.value);
    if (!source) {
      ui.notifications.warn('Choose a character to add to the map.');
      return;
    }
    if (draft.markers.some((marker) => marker.sourceType === source.type && marker.sourceId === source.id)) {
      ui.notifications.warn(`${source.name} is already on this map.`);
      return;
    }
    const offset = (draft.markers.length % 5) * 5;
    draft.markers.push({
      id: makeId(),
      sourceType: source.type,
      sourceId: source.id,
      sourceName: source.name,
      sourceAvatar: source.avatar,
      label: '',
      x: clampMapPercent(50 + offset),
      y: clampMapPercent(50 + offset)
    });
    sourceSelect.value = '';
    drawEditor();
  });
  drawEditor();

  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'fc-create-group-button fc-map-save';
  save.innerHTML = '<i class="fa-solid fa-floppy-disk"></i><span>Save Map</span>';
  form.appendChild(save);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    draft.name = nameInput.value.trim();
    draft.image = imageInput.value.trim();
    draft.visibility = visibility.value === 'selected' ? 'selected' : 'all';
    save.disabled = true;
    try {
      await saveMapDraft();
    } finally {
      save.disabled = false;
    }
  });
  container.appendChild(form);

  if (state.selectedMapId) {
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'fc-manager-button fc-map-delete';
    del.innerHTML = '<i class="fa-solid fa-trash"></i><span>Delete Map</span>';
    del.addEventListener('click', () => deleteSelectedMap());
    container.appendChild(del);
  }

  requestAnimationFrame(() => nameInput.focus());
}

function openMapImagePicker(current, callback) {
  const FilePickerClass = globalThis.foundry?.applications?.apps?.FilePicker ?? globalThis.FilePicker;
  if (!FilePickerClass) {
    ui.notifications.warn('Foundry file picker is unavailable. Enter the image path manually.');
    return;
  }
  try {
    const picker = new FilePickerClass({
      type: 'image',
      current: current || '',
      callback: (path) => callback?.(path)
    });
    picker.render(true);
  } catch (error) {
    console.error(`${MODULE_ID} | Could not open map image picker`, error);
    ui.notifications.warn('Could not open the image picker. Enter the image path manually.');
  }
}

async function saveMapDraft() {
  if (!game.user?.isGM) return;
  const draft = state.mapEditorDraft;
  const name = String(draft.name || '').trim();
  const image = String(draft.image || '').trim();
  if (!name) {
    ui.notifications.warn('Enter a map name.');
    return;
  }
  if (!image) {
    ui.notifications.warn('Choose a background image for the map.');
    return;
  }
  const selectedUserIds = [...draft.selectedUserIds].filter((id) => game.users.get(id) && !game.users.get(id).isGM);
  if (draft.visibility === 'selected' && !selectedUserIds.length) {
    ui.notifications.warn('Select at least one player for a restricted map.');
    return;
  }

  const existing = state.selectedMapId ? getMapById(state.selectedMapId) : null;
  const now = Date.now();
  const data = {
    schema: 1,
    id: existing?.data?.id || draft.id || makeId(),
    name: name.slice(0, 80),
    image,
    visibility: draft.visibility === 'selected' ? 'selected' : 'all',
    selectedUserIds: draft.visibility === 'selected' ? selectedUserIds : [],
    markers: draft.markers.map((marker) => ({
      id: marker.id || makeId(),
      sourceType: marker.sourceType === 'npc' ? 'npc' : 'user',
      sourceId: marker.sourceId,
      sourceName: marker.sourceName || '',
      sourceAvatar: marker.sourceAvatar || 'icons/svg/mystery-man.svg',
      label: String(marker.label || '').trim().slice(0, 40),
      x: clampMapPercent(marker.x),
      y: clampMapPercent(marker.y)
    })),
    sortIndex: existing ? Number(existing.data.sortIndex || 0) : Number(draft.sortIndex || 0),
    createdAt: existing?.data?.createdAt || draft.createdAt || now,
    updatedAt: now,
    createdByUserId: existing?.data?.createdByUserId || game.user.id,
    updatedByUserId: game.user.id
  };
  const whisper = data.visibility === 'selected' ? uniqueIds([...data.selectedUserIds, ...getGmUserIds()]) : [];

  try {
    const document = await createChatMessageDocument({
      content: `[Maps] ${formatSafeChatContent(data.name)}`,
      speaker: { alias: 'Maps' },
      whisper,
      flags: { [MODULE_ID]: { [MAP_FLAG]: data } }
    });
    if (existing) await existing.document.delete();
    state.selectedMapId = data.id;
    state.mapEditorOpen = false;
    state.mapManagerOpen = false;
    state.mapExpanded = false;
    resetMapDraft();
    ui.notifications.info(existing ? 'Map updated.' : 'Map added.');
    renderPhone();
    return document;
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to save map`, error);
    ui.notifications.error('The map could not be saved. Check the console for details.');
  }
}

async function deleteSelectedMap() {
  if (!game.user?.isGM || !state.selectedMapId) return;
  const record = getMapById(state.selectedMapId);
  if (!record) return;
  const confirmed = window.confirm(`Delete "${record.data.name || 'Untitled Map'}" from the Maps app?`);
  if (!confirmed) return;
  try {
    await record.document.delete();
    state.selectedMapId = null;
    state.mapEditorOpen = false;
    state.mapManagerOpen = true;
    state.mapExpanded = false;
    resetMapDraft();
    ui.notifications.info('Map deleted.');
    renderPhone();
  } catch (error) {
    console.error(`${MODULE_ID} | Failed to delete map`, error);
    ui.notifications.error('The map could not be deleted. Check the console for details.');
  }
}

// ---------------------------
// Arcade app
// ---------------------------

function getArcadeStats() {
  const raw = game.settings.get(MODULE_ID, ARCADE_STATS_SETTING) || {};
  return {
    snakeBest: Number(raw.snakeBest || 0),
    ticTacToeWins: Number(raw.ticTacToeWins || 0),
    ticTacToeLosses: Number(raw.ticTacToeLosses || 0),
    ticTacToeDraws: Number(raw.ticTacToeDraws || 0),
    minesweeperWins: Number(raw.minesweeperWins || 0),
    runnerBest: Number(raw.runnerBest || 0),
    guessNumberWins: Number(raw.guessNumberWins || 0),
    guessNumberBestAttempts: Number(raw.guessNumberBestAttempts || 0),
    stackItBest: Number(raw.stackItBest || 0),
    blockDropBest: Number(raw.blockDropBest || 0),
    chessWins: Number(raw.chessWins || 0),
    chessLosses: Number(raw.chessLosses || 0),
    chessDraws: Number(raw.chessDraws || 0),
    farkleWins: Number(raw.farkleWins || 0),
    farkleLosses: Number(raw.farkleLosses || 0)
  };
}

async function saveArcadeStats(patch) {
  const next = { ...getArcadeStats(), ...patch };
  try {
    await game.settings.set(MODULE_ID, ARCADE_STATS_SETTING, next);
  } catch (error) {
    console.warn(`${MODULE_ID} | Could not save Arcade stats`, error);
  }
}

function renderArcadeView() {
  const container = state.root.querySelector('.fc-arcade-content');
  if (!container) return;
  container.replaceChildren();

  if (state.arcadeGame === 'snake') {
    renderSnakeGame(container);
    return;
  }
  if (state.arcadeGame === 'tictactoe') {
    renderTicTacToe(container);
    return;
  }
  if (state.arcadeGame === 'minesweeper') {
    renderMinesweeper(container);
    return;
  }
  if (state.arcadeGame === 'runner') {
    renderRunnerGame(container);
    return;
  }
  if (state.arcadeGame === 'guessnumber') {
    renderGuessNumber(container);
    return;
  }
  if (state.arcadeGame === 'stackit') {
    renderStackItGame(container);
    return;
  }
  if (state.arcadeGame === 'blockdrop') {
    renderBlockDropGame(container);
    return;
  }
  if (state.arcadeGame === 'chess') {
    renderChessGame(container);
    return;
  }
  if (state.arcadeGame === 'farkle') {
    renderFarkleGame(container);
    return;
  }
  renderArcadeMenu(container);
}

function renderArcadeMenu(container) {
  const intro = document.createElement('div');
  intro.className = 'fc-arcade-intro';
  intro.innerHTML = '<i class="fa-solid fa-gamepad"></i><div><strong>Arcade</strong><span>Nine quick games for downtime between scenes.</span></div>';
  container.appendChild(intro);

  const stats = getArcadeStats();
  const grid = document.createElement('div');
  grid.className = 'fc-arcade-menu';

  const snake = document.createElement('button');
  snake.type = 'button';
  snake.className = 'fc-arcade-game-card';
  snake.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-snake"><i class="fa-solid fa-staff-snake"></i></span>
    <span class="fc-arcade-game-copy"><strong>Snake</strong><small>Best score: ${stats.snakeBest}</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  snake.addEventListener('click', () => {
    state.arcadeGame = 'snake';
    if (!state.snake.segments.length || state.snake.gameOver) resetSnakeGame();
    renderPhone();
  });

  const ttt = document.createElement('button');
  ttt.type = 'button';
  ttt.className = 'fc-arcade-game-card';
  ttt.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-ttt"><i class="fa-solid fa-table-cells-large"></i></span>
    <span class="fc-arcade-game-copy"><strong>Tic Tac Toe</strong><small>${stats.ticTacToeWins}W · ${stats.ticTacToeLosses}L · ${stats.ticTacToeDraws}D</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  ttt.addEventListener('click', () => {
    state.arcadeGame = 'tictactoe';
    if (!state.ticTacToe.board?.length) resetTicTacToe();
    renderPhone();
  });

  const mines = document.createElement('button');
  mines.type = 'button';
  mines.className = 'fc-arcade-game-card';
  mines.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-mines"><i class="fa-solid fa-bomb"></i></span>
    <span class="fc-arcade-game-copy"><strong>Minesweeper</strong><small>${stats.minesweeperWins} cleared boards</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  mines.addEventListener('click', () => {
    state.arcadeGame = 'minesweeper';
    if (!state.minesweeper.cells.length) resetMinesweeper();
    renderPhone();
  });

  const runner = document.createElement('button');
  runner.type = 'button';
  runner.className = 'fc-arcade-game-card';
  runner.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-runner"><i class="fa-solid fa-person-running"></i></span>
    <span class="fc-arcade-game-copy"><strong>Runner</strong><small>Best distance: ${stats.runnerBest}</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  runner.addEventListener('click', () => {
    state.arcadeGame = 'runner';
    if (state.runner.gameOver) resetRunnerGame();
    renderPhone();
  });

  const guess = document.createElement('button');
  guess.type = 'button';
  guess.className = 'fc-arcade-game-card';
  const guessBest = stats.guessNumberBestAttempts ? `Best: ${stats.guessNumberBestAttempts} guesses` : `${stats.guessNumberWins} wins`;
  guess.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-guess"><i class="fa-solid fa-hashtag"></i></span>
    <span class="fc-arcade-game-copy"><strong>Guess My Number</strong><small>${guessBest}</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  guess.addEventListener('click', () => {
    state.arcadeGame = 'guessnumber';
    renderPhone();
  });

  const stack = document.createElement('button');
  stack.type = 'button';
  stack.className = 'fc-arcade-game-card';
  stack.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-stack"><i class="fa-solid fa-layer-group"></i></span>
    <span class="fc-arcade-game-copy"><strong>Stack It</strong><small>Best stack: ${stats.stackItBest}</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  stack.addEventListener('click', () => {
    state.arcadeGame = 'stackit';
    if (!state.stackIt.layers.length || state.stackIt.gameOver) resetStackItGame();
    renderPhone();
  });

  const blockDrop = document.createElement('button');
  blockDrop.type = 'button';
  blockDrop.className = 'fc-arcade-game-card';
  blockDrop.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-blockdrop"><i class="fa-solid fa-cubes-stacked"></i></span>
    <span class="fc-arcade-game-copy"><strong>Block Drop</strong><small>Best score: ${stats.blockDropBest}</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  blockDrop.addEventListener('click', () => {
    state.arcadeGame = 'blockdrop';
    if (!state.blockDrop.board.length || state.blockDrop.gameOver) resetBlockDropGame();
    renderPhone();
  });

  const chess = document.createElement('button');
  chess.type = 'button';
  chess.className = 'fc-arcade-game-card';
  chess.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-chess"><i class="fa-solid fa-chess-knight"></i></span>
    <span class="fc-arcade-game-copy"><strong>Chess</strong><small>${stats.chessWins}W · ${stats.chessLosses}L · ${stats.chessDraws}D</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  chess.addEventListener('click', () => {
    state.arcadeGame = 'chess';
    if (!state.chess.board.length || state.chess.status !== 'playing') resetChessGame();
    renderPhone();
  });

  const farkle = document.createElement('button');
  farkle.type = 'button';
  farkle.className = 'fc-arcade-game-card';
  farkle.innerHTML = `
    <span class="fc-arcade-game-icon fc-arcade-game-icon-farkle"><i class="fa-solid fa-dice"></i></span>
    <span class="fc-arcade-game-copy"><strong>Farkle</strong><small>${stats.farkleWins}W · ${stats.farkleLosses}L vs phone</small></span>
    <i class="fa-solid fa-chevron-right"></i>
  `;
  farkle.addEventListener('click', () => {
    state.arcadeGame = 'farkle';
    if (state.farkle.status === 'over') resetFarkleGame();
    renderPhone();
  });

  grid.append(snake, ttt, mines, runner, guess, stack, blockDrop, chess, farkle);
  container.appendChild(grid);
}

function pauseArcadeActionGames() {
  pauseSnakeGame();
  pauseRunnerGame();
  pauseStackItGame();
  pauseBlockDropGame();
  stopChessAi();
  stopFarklePhoneTimer();
}

function resetSnakeGame() {
  stopSnakeInterval();
  const mid = Math.floor(SNAKE_BOARD_SIZE / 2);
  state.snake.segments = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid }
  ];
  state.snake.direction = { x: 1, y: 0 };
  state.snake.nextDirection = { x: 1, y: 0 };
  state.snake.score = 0;
  state.snake.running = false;
  state.snake.paused = false;
  state.snake.gameOver = false;
  placeSnakeFood();
}

function placeSnakeFood() {
  const occupied = new Set(state.snake.segments.map((p) => `${p.x},${p.y}`));
  const available = [];
  for (let y = 0; y < SNAKE_BOARD_SIZE; y++) {
    for (let x = 0; x < SNAKE_BOARD_SIZE; x++) {
      if (!occupied.has(`${x},${y}`)) available.push({ x, y });
    }
  }
  state.snake.food = available.length ? available[Math.floor(Math.random() * available.length)] : null;
}

function startSnakeGame() {
  if (state.snake.gameOver) resetSnakeGame();
  state.snake.running = true;
  state.snake.paused = false;
  stopSnakeInterval();
  state.snake.interval = window.setInterval(snakeStep, SNAKE_TICK_MS);
  updateSnakeBoard();
}

function pauseSnakeGame() {
  if (!state.snake) return;
  if (state.snake.running) {
    state.snake.running = false;
    state.snake.paused = true;
  }
  stopSnakeInterval();
  if (state.phoneOpen && state.app === 'arcade' && state.arcadeGame === 'snake' && !state.call) updateSnakeBoard();
}

function stopSnakeInterval() {
  if (state.snake?.interval) {
    window.clearInterval(state.snake.interval);
    state.snake.interval = null;
  }
}

function setSnakeDirection(x, y) {
  if (state.snake.gameOver) return;
  const current = state.snake.direction;
  if (current.x + x === 0 && current.y + y === 0) return;
  state.snake.nextDirection = { x, y };
  if (!state.snake.running && !state.snake.paused) startSnakeGame();
}

function snakeStep() {
  if (!state.snake.running || state.call) return;
  const dir = state.snake.nextDirection;
  state.snake.direction = { ...dir };
  const head = state.snake.segments[0];
  const next = { x: head.x + dir.x, y: head.y + dir.y };
  const hitsWall = next.x < 0 || next.y < 0 || next.x >= SNAKE_BOARD_SIZE || next.y >= SNAKE_BOARD_SIZE;
  const eating = Boolean(state.snake.food && next.x === state.snake.food.x && next.y === state.snake.food.y);
  const bodyToCheck = eating ? state.snake.segments : state.snake.segments.slice(0, -1);
  const hitsSelf = bodyToCheck.some((p) => p.x === next.x && p.y === next.y);

  if (hitsWall || hitsSelf) {
    finishSnakeGame();
    return;
  }

  state.snake.segments.unshift(next);
  if (eating) {
    state.snake.score += 1;
    placeSnakeFood();
  } else {
    state.snake.segments.pop();
  }
  updateSnakeBoard();
}

function finishSnakeGame() {
  state.snake.running = false;
  state.snake.paused = false;
  state.snake.gameOver = true;
  stopSnakeInterval();
  const stats = getArcadeStats();
  if (state.snake.score > stats.snakeBest) void saveArcadeStats({ snakeBest: state.snake.score });
  updateSnakeBoard();
}

function renderSnakeGame(container) {
  if (!state.snake.segments.length) resetSnakeGame();
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-snake-shell';
  shell.innerHTML = `
    <div class="fc-arcade-scorebar">
      <span>Score <strong class="fc-snake-score">${state.snake.score}</strong></span>
      <span>Best <strong class="fc-snake-best">${Math.max(stats.snakeBest, state.snake.score)}</strong></span>
    </div>
    <div class="fc-snake-board" role="img" aria-label="Snake game board"></div>
    <div class="fc-snake-message"></div>
    <div class="fc-snake-controls">
      <span></span><button type="button" data-dir="up" aria-label="Move up"><i class="fa-solid fa-chevron-up"></i></button><span></span>
      <button type="button" data-dir="left" aria-label="Move left"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="fc-snake-pause" aria-label="Pause or resume"><i class="fa-solid fa-play"></i></button>
      <button type="button" data-dir="right" aria-label="Move right"><i class="fa-solid fa-chevron-right"></i></button>
      <span></span><button type="button" data-dir="down" aria-label="Move down"><i class="fa-solid fa-chevron-down"></i></button><span></span>
    </div>
    <button type="button" class="fc-arcade-secondary fc-snake-new"><i class="fa-solid fa-rotate-right"></i> New Game</button>
  `;
  container.appendChild(shell);

  const board = shell.querySelector('.fc-snake-board');
  for (let i = 0; i < SNAKE_BOARD_SIZE * SNAKE_BOARD_SIZE; i++) {
    const cell = document.createElement('span');
    cell.className = 'fc-snake-cell';
    board.appendChild(cell);
  }

  const directions = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
  shell.querySelectorAll('[data-dir]').forEach((button) => {
    button.addEventListener('click', () => {
      const [x,y] = directions[button.dataset.dir];
      setSnakeDirection(x,y);
    });
  });
  shell.querySelector('.fc-snake-pause').addEventListener('click', () => {
    if (state.snake.gameOver) startSnakeGame();
    else if (state.snake.running) pauseSnakeGame();
    else startSnakeGame();
  });
  shell.querySelector('.fc-snake-new').addEventListener('click', () => {
    resetSnakeGame();
    updateSnakeBoard();
  });
  updateSnakeBoard();
}

function updateSnakeBoard() {
  const board = state.root?.querySelector('.fc-snake-board');
  if (!board) return;
  const cells = [...board.children];
  for (const cell of cells) cell.className = 'fc-snake-cell';
  for (let i = 0; i < state.snake.segments.length; i++) {
    const p = state.snake.segments[i];
    const cell = cells[p.y * SNAKE_BOARD_SIZE + p.x];
    if (cell) cell.classList.add(i === 0 ? 'is-head' : 'is-snake');
  }
  if (state.snake.food) {
    const foodCell = cells[state.snake.food.y * SNAKE_BOARD_SIZE + state.snake.food.x];
    foodCell?.classList.add('is-food');
  }
  const score = state.root?.querySelector('.fc-snake-score');
  const best = state.root?.querySelector('.fc-snake-best');
  if (score) score.textContent = String(state.snake.score);
  if (best) best.textContent = String(Math.max(getArcadeStats().snakeBest, state.snake.score));
  const message = state.root?.querySelector('.fc-snake-message');
  if (message) {
    if (state.snake.gameOver) message.textContent = `Game over — score ${state.snake.score}`;
    else if (state.snake.paused) message.textContent = 'Paused';
    else if (!state.snake.running) message.textContent = 'Use arrows / WASD or tap a direction to start';
    else message.textContent = '';
  }
  const pause = state.root?.querySelector('.fc-snake-pause i');
  if (pause) pause.className = `fa-solid ${state.snake.running ? 'fa-pause' : 'fa-play'}`;
}

function onArcadeKeydown(event) {
  if (!state.phoneOpen || state.call || state.app !== 'arcade') return;
  const tag = event.target?.tagName?.toLowerCase();
  if (['input','textarea','select'].includes(tag)) return;

  if (state.arcadeGame === 'snake') {
    const keys = {
      ArrowUp: [0,-1], w: [0,-1], W: [0,-1],
      ArrowDown: [0,1], s: [0,1], S: [0,1],
      ArrowLeft: [-1,0], a: [-1,0], A: [-1,0],
      ArrowRight: [1,0], d: [1,0], D: [1,0]
    };
    if (keys[event.key]) {
      event.preventDefault();
      setSnakeDirection(...keys[event.key]);
    } else if (event.key === ' ') {
      event.preventDefault();
      if (state.snake.running) pauseSnakeGame();
      else startSnakeGame();
    }
    return;
  }

  if (state.arcadeGame === 'runner' && [' ', 'ArrowUp', 'w', 'W'].includes(event.key)) {
    event.preventDefault();
    jumpRunner();
    return;
  }

  if (state.arcadeGame === 'blockdrop') {
    const key = event.key;
    if (['ArrowLeft', 'a', 'A'].includes(key)) { event.preventDefault(); moveBlockDrop(-1, 0); }
    else if (['ArrowRight', 'd', 'D'].includes(key)) { event.preventDefault(); moveBlockDrop(1, 0); }
    else if (['ArrowDown', 's', 'S'].includes(key)) { event.preventDefault(); softDropBlockDrop(); }
    else if (['ArrowUp', 'w', 'W'].includes(key)) { event.preventDefault(); rotateBlockDrop(); }
    else if (key === ' ') { event.preventDefault(); hardDropBlockDrop(); }
    else if (key === 'p' || key === 'P') {
      event.preventDefault();
      if (state.blockDrop.running) pauseBlockDropGame();
      else if (!state.blockDrop.gameOver) startBlockDropGame();
    }
    return;
  }

  if (state.arcadeGame === 'stackit') {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      stackItAction();
    } else if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      if (state.stackIt.running) pauseStackItGame();
      else if (!state.stackIt.gameOver) startStackItGame();
    }
  }
}

const TTT_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function resetTicTacToe() {
  if (state.ticTacToe.aiTimer) window.clearTimeout(state.ticTacToe.aiTimer);
  state.ticTacToe.board = Array(9).fill(null);
  state.ticTacToe.turn = 'X';
  state.ticTacToe.status = 'playing';
  state.ticTacToe.aiTimer = null;
}

function getTicTacToeWinner(board = state.ticTacToe.board) {
  for (const line of TTT_LINES) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
  }
  if (board.every(Boolean)) return { mark: 'draw', line: [] };
  return null;
}

function renderTicTacToe(container) {
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-ttt-shell';
  shell.innerHTML = `
    <div class="fc-ttt-stats"><span>${stats.ticTacToeWins} Wins</span><span>${stats.ticTacToeLosses} Losses</span><span>${stats.ticTacToeDraws} Draws</span></div>
    <div class="fc-ttt-player-row"><span class="is-you">You are X</span><span>Phone is O</span></div>
    <div class="fc-ttt-board" role="grid" aria-label="Tic Tac Toe board"></div>
    <div class="fc-ttt-status"></div>
    <button type="button" class="fc-arcade-primary fc-ttt-new"><i class="fa-solid fa-rotate-right"></i> New Game</button>
  `;
  container.appendChild(shell);
  const board = shell.querySelector('.fc-ttt-board');
  for (let i = 0; i < 9; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-ttt-cell';
    button.dataset.index = String(i);
    button.setAttribute('role', 'gridcell');
    button.addEventListener('click', () => makePlayerTicTacToeMove(i));
    board.appendChild(button);
  }
  shell.querySelector('.fc-ttt-new').addEventListener('click', () => {
    resetTicTacToe();
    renderPhone();
  });
  updateTicTacToeBoard();
}

function makePlayerTicTacToeMove(index) {
  if (state.ticTacToe.status !== 'playing' || state.ticTacToe.turn !== 'X' || state.ticTacToe.board[index]) return;
  state.ticTacToe.board[index] = 'X';
  const result = getTicTacToeWinner();
  if (result) {
    finishTicTacToe(result);
    return;
  }
  state.ticTacToe.turn = 'O';
  updateTicTacToeBoard();
  state.ticTacToe.aiTimer = window.setTimeout(makeTicTacToeAiMove, 350);
}

function makeTicTacToeAiMove() {
  state.ticTacToe.aiTimer = null;
  if (state.ticTacToe.status !== 'playing' || state.ticTacToe.turn !== 'O') return;
  const move = chooseTicTacToeAiMove();
  if (move == null) return;
  state.ticTacToe.board[move] = 'O';
  const result = getTicTacToeWinner();
  if (result) {
    finishTicTacToe(result);
    return;
  }
  state.ticTacToe.turn = 'X';
  updateTicTacToeBoard();
}

function chooseTicTacToeAiMove() {
  const board = state.ticTacToe.board;
  const empty = board.map((v,i) => v ? null : i).filter((v) => v != null);
  const findMove = (mark) => {
    for (const i of empty) {
      const test = [...board];
      test[i] = mark;
      if (getTicTacToeWinner(test)?.mark === mark) return i;
    }
    return null;
  };
  const win = findMove('O');
  if (win != null) return win;
  const block = findMove('X');
  if (block != null) return block;
  if (!board[4]) return 4;
  const corners = [0,2,6,8].filter((i) => !board[i]);
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function finishTicTacToe(result) {
  state.ticTacToe.status = result.mark;
  state.ticTacToe.turn = null;
  const stats = getArcadeStats();
  if (result.mark === 'X') void saveArcadeStats({ ticTacToeWins: stats.ticTacToeWins + 1 });
  else if (result.mark === 'O') void saveArcadeStats({ ticTacToeLosses: stats.ticTacToeLosses + 1 });
  else void saveArcadeStats({ ticTacToeDraws: stats.ticTacToeDraws + 1 });
  updateTicTacToeBoard(result.line);
}

function updateTicTacToeBoard(winningLine = null) {
  const cells = [...(state.root?.querySelectorAll('.fc-ttt-cell') || [])];
  const result = getTicTacToeWinner();
  const line = winningLine || result?.line || [];
  cells.forEach((cell, index) => {
    const mark = state.ticTacToe.board[index];
    cell.textContent = mark || '';
    cell.classList.toggle('is-x', mark === 'X');
    cell.classList.toggle('is-o', mark === 'O');
    cell.classList.toggle('is-win', line.includes(index));
    cell.disabled = Boolean(mark) || state.ticTacToe.status !== 'playing' || state.ticTacToe.turn !== 'X';
  });
  const status = state.root?.querySelector('.fc-ttt-status');
  if (!status) return;
  if (state.ticTacToe.status === 'X') status.textContent = 'You win!';
  else if (state.ticTacToe.status === 'O') status.textContent = 'The phone wins.';
  else if (state.ticTacToe.status === 'draw') status.textContent = 'Draw game.';
  else status.textContent = state.ticTacToe.turn === 'X' ? 'Your turn' : 'Phone is thinking…';
}


// ---------------------------
// Minesweeper
// ---------------------------

function resetMinesweeper() {
  state.minesweeper.cells = Array.from({ length: MINESWEEPER_SIZE * MINESWEEPER_SIZE }, () => ({ mine: false, revealed: false, flagged: false, adjacent: 0 }));
  state.minesweeper.status = 'ready';
  state.minesweeper.flagMode = false;
  state.minesweeper.minesPlaced = false;
}

function placeMinesweeperMines(excludedIndex) {
  const candidates = Array.from({ length: MINESWEEPER_SIZE * MINESWEEPER_SIZE }, (_, i) => i).filter((i) => i !== excludedIndex);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const index of candidates.slice(0, MINESWEEPER_MINE_COUNT)) state.minesweeper.cells[index].mine = true;
  for (let i = 0; i < state.minesweeper.cells.length; i++) {
    if (state.minesweeper.cells[i].mine) continue;
    state.minesweeper.cells[i].adjacent = getMinesweeperNeighbors(i).filter((n) => state.minesweeper.cells[n].mine).length;
  }
  state.minesweeper.minesPlaced = true;
}

function getMinesweeperNeighbors(index) {
  const x = index % MINESWEEPER_SIZE;
  const y = Math.floor(index / MINESWEEPER_SIZE);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < MINESWEEPER_SIZE && ny < MINESWEEPER_SIZE) out.push(ny * MINESWEEPER_SIZE + nx);
    }
  }
  return out;
}

function revealMinesweeperCell(index) {
  if (state.minesweeper.status === 'won' || state.minesweeper.status === 'lost') return;
  const cell = state.minesweeper.cells[index];
  if (!cell || cell.flagged || cell.revealed) return;
  if (!state.minesweeper.minesPlaced) placeMinesweeperMines(index);
  state.minesweeper.status = 'playing';
  if (cell.mine) {
    cell.revealed = true;
    state.minesweeper.status = 'lost';
    for (const c of state.minesweeper.cells) if (c.mine) c.revealed = true;
    updateMinesweeperBoard();
    return;
  }

  const queue = [index];
  const seen = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (seen.has(current)) continue;
    seen.add(current);
    const currentCell = state.minesweeper.cells[current];
    if (!currentCell || currentCell.flagged || currentCell.mine) continue;
    currentCell.revealed = true;
    if (currentCell.adjacent === 0) {
      for (const neighbor of getMinesweeperNeighbors(current)) {
        const neighborCell = state.minesweeper.cells[neighbor];
        if (neighborCell && !neighborCell.revealed && !neighborCell.flagged && !neighborCell.mine) queue.push(neighbor);
      }
    }
  }

  const safeRemaining = state.minesweeper.cells.some((c) => !c.mine && !c.revealed);
  if (!safeRemaining) {
    state.minesweeper.status = 'won';
    const stats = getArcadeStats();
    void saveArcadeStats({ minesweeperWins: stats.minesweeperWins + 1 });
  }
  updateMinesweeperBoard();
}

function toggleMinesweeperFlag(index) {
  if (['won','lost'].includes(state.minesweeper.status)) return;
  const cell = state.minesweeper.cells[index];
  if (!cell || cell.revealed) return;
  cell.flagged = !cell.flagged;
  updateMinesweeperBoard();
}

function renderMinesweeper(container) {
  if (!state.minesweeper.cells.length) resetMinesweeper();
  const shell = document.createElement('div');
  shell.className = 'fc-mines-shell';
  shell.innerHTML = `
    <div class="fc-arcade-scorebar"><span>Mines <strong>${MINESWEEPER_MINE_COUNT}</strong></span><span>Flags <strong class="fc-mines-flags">0</strong></span></div>
    <div class="fc-mines-board" role="grid" aria-label="Minesweeper board"></div>
    <div class="fc-mines-status"></div>
    <div class="fc-mines-actions">
      <button type="button" class="fc-arcade-secondary fc-mines-flag-mode"><i class="fa-solid fa-flag"></i> Flag Mode: Off</button>
      <button type="button" class="fc-arcade-primary fc-mines-new"><i class="fa-solid fa-rotate-right"></i> New Board</button>
    </div>
  `;
  container.appendChild(shell);
  const board = shell.querySelector('.fc-mines-board');
  state.minesweeper.cells.forEach((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fc-mines-cell';
    button.dataset.index = String(index);
    button.addEventListener('click', () => state.minesweeper.flagMode ? toggleMinesweeperFlag(index) : revealMinesweeperCell(index));
    button.addEventListener('contextmenu', (event) => { event.preventDefault(); toggleMinesweeperFlag(index); });
    board.appendChild(button);
  });
  shell.querySelector('.fc-mines-flag-mode').addEventListener('click', () => {
    state.minesweeper.flagMode = !state.minesweeper.flagMode;
    updateMinesweeperBoard();
  });
  shell.querySelector('.fc-mines-new').addEventListener('click', () => { resetMinesweeper(); renderPhone(); });
  updateMinesweeperBoard();
}

function updateMinesweeperBoard() {
  const cells = [...(state.root?.querySelectorAll('.fc-mines-cell') || [])];
  cells.forEach((button, index) => {
    const cell = state.minesweeper.cells[index];
    button.className = 'fc-mines-cell';
    button.textContent = '';
    if (cell?.revealed) {
      button.classList.add('is-revealed');
      if (cell.mine) {
        button.classList.add('is-mine');
        button.innerHTML = '<i class="fa-solid fa-bomb"></i>';
      } else if (cell.adjacent) {
        button.textContent = String(cell.adjacent);
        button.classList.add(`n${cell.adjacent}`);
      }
    } else if (cell?.flagged) {
      button.classList.add('is-flagged');
      button.innerHTML = '<i class="fa-solid fa-flag"></i>';
    }
  });
  const flags = state.minesweeper.cells.filter((c) => c.flagged).length;
  const flagsEl = state.root?.querySelector('.fc-mines-flags');
  if (flagsEl) flagsEl.textContent = String(flags);
  const status = state.root?.querySelector('.fc-mines-status');
  if (status) {
    status.textContent = state.minesweeper.status === 'won' ? 'Board cleared!' : state.minesweeper.status === 'lost' ? 'Boom! Try another board.' : 'Tap cells to reveal. Use Flag Mode or right-click to flag.';
  }
  const flagMode = state.root?.querySelector('.fc-mines-flag-mode');
  if (flagMode) {
    flagMode.classList.toggle('is-active', state.minesweeper.flagMode);
    flagMode.innerHTML = `<i class="fa-solid fa-flag"></i> Flag Mode: ${state.minesweeper.flagMode ? 'On' : 'Off'}`;
  }
}

// ---------------------------
// Runner
// ---------------------------

function resetRunnerGame() {
  stopRunnerInterval();
  state.runner.running = false;
  state.runner.paused = false;
  state.runner.gameOver = false;
  state.runner.playerY = 0;
  state.runner.velocityY = 0;
  state.runner.obstacles = [];
  state.runner.score = 0;
  state.runner.ticks = 0;
  state.runner.spawnIn = 30 + Math.floor(Math.random() * 20);
}

function startRunnerGame() {
  if (state.runner.gameOver) resetRunnerGame();
  state.runner.running = true;
  state.runner.paused = false;
  stopRunnerInterval();
  state.runner.interval = window.setInterval(runnerStep, RUNNER_TICK_MS);
  updateRunnerBoard();
}

function pauseRunnerGame() {
  if (!state.runner) return;
  if (state.runner.running) {
    state.runner.running = false;
    state.runner.paused = true;
  }
  stopRunnerInterval();
  if (state.phoneOpen && state.app === 'arcade' && state.arcadeGame === 'runner' && !state.call) updateRunnerBoard();
}

function stopRunnerInterval() {
  if (state.runner?.interval) {
    window.clearInterval(state.runner.interval);
    state.runner.interval = null;
  }
}

function jumpRunner() {
  if (state.runner.gameOver) resetRunnerGame();
  if (!state.runner.running) startRunnerGame();
  if (state.runner.playerY <= 0.5) state.runner.velocityY = 8.2;
}

function runnerStep() {
  if (!state.runner.running || state.call) return;
  state.runner.ticks += 1;
  state.runner.score = Math.floor(state.runner.ticks / 4);
  state.runner.velocityY -= 0.72;
  state.runner.playerY += state.runner.velocityY;
  if (state.runner.playerY < 0) {
    state.runner.playerY = 0;
    state.runner.velocityY = 0;
  }

  state.runner.spawnIn -= 1;
  if (state.runner.spawnIn <= 0) {
    state.runner.obstacles.push({ x: 106, width: 7 + Math.random() * 3, height: 13 + Math.random() * 8 });
    const difficulty = Math.min(12, Math.floor(state.runner.score / 20));
    state.runner.spawnIn = Math.max(22, 43 - difficulty) + Math.floor(Math.random() * 18);
  }
  const speed = 2.2 + Math.min(1.6, state.runner.score / 150);
  for (const obstacle of state.runner.obstacles) obstacle.x -= speed;
  state.runner.obstacles = state.runner.obstacles.filter((obstacle) => obstacle.x > -12);

  const playerLeft = 14;
  const playerRight = 23;
  const playerBottom = state.runner.playerY;
  const playerTop = playerBottom + 18;
  const hit = state.runner.obstacles.some((obstacle) => {
    const obstacleLeft = obstacle.x;
    const obstacleRight = obstacle.x + obstacle.width;
    return playerRight > obstacleLeft && playerLeft < obstacleRight && playerBottom < obstacle.height && playerTop > 0;
  });
  if (hit) {
    finishRunnerGame();
    return;
  }
  updateRunnerBoard();
}

function finishRunnerGame() {
  state.runner.running = false;
  state.runner.paused = false;
  state.runner.gameOver = true;
  stopRunnerInterval();
  const stats = getArcadeStats();
  if (state.runner.score > stats.runnerBest) void saveArcadeStats({ runnerBest: state.runner.score });
  updateRunnerBoard();
}

function renderRunnerGame(container) {
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-runner-shell';
  shell.innerHTML = `
    <div class="fc-arcade-scorebar"><span>Distance <strong class="fc-runner-score">${state.runner.score}</strong></span><span>Best <strong class="fc-runner-best">${Math.max(stats.runnerBest, state.runner.score)}</strong></span></div>
    <div class="fc-runner-board" tabindex="0" aria-label="Endless runner game">
      <div class="fc-runner-sky"><i class="fa-regular fa-sun"></i></div>
      <div class="fc-runner-player"><i class="fa-solid fa-person-running"></i></div>
      <div class="fc-runner-obstacles"></div>
      <div class="fc-runner-ground"></div>
    </div>
    <div class="fc-runner-status">Press Jump, Space, or ↑ to start.</div>
    <div class="fc-runner-actions">
      <button type="button" class="fc-arcade-primary fc-runner-jump"><i class="fa-solid fa-arrow-up"></i> Jump</button>
      <button type="button" class="fc-arcade-secondary fc-runner-new"><i class="fa-solid fa-rotate-right"></i> New Run</button>
    </div>
  `;
  container.appendChild(shell);
  shell.querySelector('.fc-runner-board').addEventListener('click', jumpRunner);
  shell.querySelector('.fc-runner-jump').addEventListener('click', jumpRunner);
  shell.querySelector('.fc-runner-new').addEventListener('click', () => { resetRunnerGame(); updateRunnerBoard(); });
  updateRunnerBoard();
}

function updateRunnerBoard() {
  const board = state.root?.querySelector('.fc-runner-board');
  if (!board) return;
  const player = board.querySelector('.fc-runner-player');
  if (player) player.style.bottom = `${18 + state.runner.playerY}px`;
  const obstacles = board.querySelector('.fc-runner-obstacles');
  if (obstacles) {
    obstacles.replaceChildren();
    for (const obstacle of state.runner.obstacles) {
      const el = document.createElement('span');
      el.className = 'fc-runner-obstacle';
      el.style.left = `${obstacle.x}%`;
      el.style.width = `${obstacle.width}%`;
      el.style.height = `${obstacle.height}px`;
      obstacles.appendChild(el);
    }
  }
  const score = state.root?.querySelector('.fc-runner-score');
  const best = state.root?.querySelector('.fc-runner-best');
  if (score) score.textContent = String(state.runner.score);
  if (best) best.textContent = String(Math.max(getArcadeStats().runnerBest, state.runner.score));
  const status = state.root?.querySelector('.fc-runner-status');
  if (status) {
    if (state.runner.gameOver) status.textContent = `Run over — distance ${state.runner.score}`;
    else if (state.runner.paused) status.textContent = 'Paused — press Jump to continue.';
    else if (!state.runner.running) status.textContent = 'Press Jump, Space, or ↑ to start.';
    else status.textContent = '';
  }
}

// ---------------------------
// Guess My Number
// ---------------------------

function resetGuessNumber() {
  state.guessNumber.target = Math.floor(Math.random() * 100) + 1;
  state.guessNumber.attempts = 0;
  state.guessNumber.status = 'playing';
  state.guessNumber.feedback = 'I picked a number from 1 to 100.';
}

function renderGuessNumber(container) {
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-guess-shell';
  shell.innerHTML = `
    <div class="fc-guess-hero"><i class="fa-solid fa-hashtag"></i><strong>Guess My Number</strong><span>The phone picked a number between 1 and 100.</span></div>
    <div class="fc-guess-feedback">${escapeMissionText(state.guessNumber.feedback)}</div>
    <form class="fc-guess-form">
      <input class="fc-guess-input" type="number" inputmode="numeric" min="1" max="100" step="1" placeholder="1–100" aria-label="Your guess">
      <button type="submit" class="fc-arcade-primary">Guess</button>
    </form>
    <div class="fc-guess-stats"><span>Attempts <strong>${state.guessNumber.attempts}</strong></span><span>Wins <strong>${stats.guessNumberWins}</strong></span></div>
    <button type="button" class="fc-arcade-secondary fc-guess-new"><i class="fa-solid fa-shuffle"></i> Pick a New Number</button>
  `;
  container.appendChild(shell);
  const form = shell.querySelector('.fc-guess-form');
  const input = shell.querySelector('.fc-guess-input');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = Number.parseInt(input.value, 10);
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      state.guessNumber.feedback = 'Enter a whole number from 1 to 100.';
      renderPhone();
      return;
    }
    if (state.guessNumber.status !== 'playing') return;
    state.guessNumber.attempts += 1;
    if (value === state.guessNumber.target) {
      state.guessNumber.status = 'won';
      state.guessNumber.feedback = `Correct! It was ${state.guessNumber.target}.`;
      const nextAttempts = state.guessNumber.attempts;
      const best = stats.guessNumberBestAttempts;
      void saveArcadeStats({
        guessNumberWins: stats.guessNumberWins + 1,
        guessNumberBestAttempts: !best || nextAttempts < best ? nextAttempts : best
      });
    } else if (value > state.guessNumber.target) {
      state.guessNumber.feedback = 'Too high.';
    } else {
      state.guessNumber.feedback = 'Too low.';
    }
    renderPhone();
  });
  shell.querySelector('.fc-guess-new').addEventListener('click', () => { resetGuessNumber(); renderPhone(); });
  if (state.guessNumber.status === 'won') input.disabled = true;
}

// ---------------------------
// Stack It
// ---------------------------

function resetStackItGame() {
  stopStackItInterval();
  const baseWidth = 64;
  state.stackIt.layers = [{ x: (100 - baseWidth) / 2, width: baseWidth }];
  state.stackIt.moving = { x: 0, width: baseWidth };
  state.stackIt.running = false;
  state.stackIt.paused = false;
  state.stackIt.gameOver = false;
  state.stackIt.score = 0;
  state.stackIt.direction = 1;
  state.stackIt.speed = 1.25;
}

function startStackItGame() {
  if (state.stackIt.gameOver || !state.stackIt.layers.length) resetStackItGame();
  state.stackIt.running = true;
  state.stackIt.paused = false;
  stopStackItInterval();
  state.stackIt.interval = window.setInterval(stackItStep, STACK_IT_TICK_MS);
  updateStackItBoard();
}

function pauseStackItGame() {
  if (!state.stackIt) return;
  if (state.stackIt.running) {
    state.stackIt.running = false;
    state.stackIt.paused = true;
  }
  stopStackItInterval();
  const stats = getArcadeStats();
  if (state.stackIt.score > stats.stackItBest) void saveArcadeStats({ stackItBest: state.stackIt.score });
  if (state.phoneOpen && state.app === 'arcade' && state.arcadeGame === 'stackit' && !state.call) updateStackItBoard();
}

function stopStackItInterval() {
  if (state.stackIt?.interval) {
    window.clearInterval(state.stackIt.interval);
    state.stackIt.interval = null;
  }
}

function stackItStep() {
  if (!state.stackIt.running || state.call || !state.stackIt.moving) return;
  const moving = state.stackIt.moving;
  const maxX = Math.max(0, 100 - moving.width);
  moving.x += state.stackIt.speed * state.stackIt.direction;
  if (moving.x <= 0) {
    moving.x = 0;
    state.stackIt.direction = 1;
  } else if (moving.x >= maxX) {
    moving.x = maxX;
    state.stackIt.direction = -1;
  }
  updateStackItBoard();
}

function stackItAction() {
  if (state.stackIt.gameOver) {
    resetStackItGame();
    startStackItGame();
    return;
  }
  if (!state.stackIt.running) {
    startStackItGame();
    return;
  }
  placeStackItBlock();
}

function placeStackItBlock() {
  const moving = state.stackIt.moving;
  const top = state.stackIt.layers.at(-1);
  if (!moving || !top) return;

  const perfectTolerance = 1.1;
  let x = moving.x;
  let width = moving.width;
  if (Math.abs(moving.x - top.x) <= perfectTolerance && Math.abs(moving.width - top.width) <= perfectTolerance) {
    x = top.x;
    width = top.width;
  } else {
    const left = Math.max(moving.x, top.x);
    const right = Math.min(moving.x + moving.width, top.x + top.width);
    width = right - left;
    x = left;
  }

  if (width <= 0) {
    finishStackItGame();
    return;
  }

  state.stackIt.layers.push({ x, width });
  state.stackIt.score += 1;
  state.stackIt.speed = Math.min(3.25, 1.25 + state.stackIt.score * 0.085);
  state.stackIt.direction = state.stackIt.score % 2 === 0 ? 1 : -1;
  state.stackIt.moving = {
    x: state.stackIt.direction > 0 ? 0 : Math.max(0, 100 - width),
    width
  };
  updateStackItBoard();
}

function finishStackItGame() {
  state.stackIt.running = false;
  state.stackIt.paused = false;
  state.stackIt.gameOver = true;
  stopStackItInterval();
  const stats = getArcadeStats();
  if (state.stackIt.score > stats.stackItBest) void saveArcadeStats({ stackItBest: state.stackIt.score });
  updateStackItBoard();
}

function renderStackItGame(container) {
  if (!state.stackIt.layers.length) resetStackItGame();
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-stack-shell';
  shell.innerHTML = `
    <div class="fc-arcade-scorebar"><span>Stack <strong class="fc-stack-score">${state.stackIt.score}</strong></span><span>Best <strong class="fc-stack-best">${Math.max(stats.stackItBest, state.stackIt.score)}</strong></span></div>
    <div class="fc-stack-board" tabindex="0" role="button" aria-label="Stack It game board. Tap to start and place blocks.">
      <div class="fc-stack-layers"></div>
      <div class="fc-stack-horizon"></div>
    </div>
    <div class="fc-stack-status"></div>
    <div class="fc-stack-actions">
      <button type="button" class="fc-arcade-primary fc-stack-place"><i class="fa-solid fa-layer-group"></i> Start</button>
      <button type="button" class="fc-arcade-secondary fc-stack-pause"><i class="fa-solid fa-pause"></i> Pause</button>
      <button type="button" class="fc-arcade-secondary fc-stack-new"><i class="fa-solid fa-rotate-right"></i> New Game</button>
    </div>
  `;
  container.appendChild(shell);
  shell.querySelector('.fc-stack-board').addEventListener('click', stackItAction);
  shell.querySelector('.fc-stack-place').addEventListener('click', stackItAction);
  shell.querySelector('.fc-stack-pause').addEventListener('click', () => {
    if (state.stackIt.gameOver) return;
    if (state.stackIt.running) pauseStackItGame();
    else startStackItGame();
  });
  shell.querySelector('.fc-stack-new').addEventListener('click', () => {
    resetStackItGame();
    updateStackItBoard();
  });
  updateStackItBoard();
}

function updateStackItBoard() {
  const board = state.root?.querySelector('.fc-stack-board');
  if (!board) return;
  const layerHost = board.querySelector('.fc-stack-layers');
  if (!layerHost) return;
  layerHost.replaceChildren();

  const maxVisiblePlaced = 10;
  const visible = state.stackIt.layers.slice(-maxVisiblePlaced);
  visible.forEach((layer, index) => {
    const el = document.createElement('span');
    el.className = 'fc-stack-block is-placed';
    el.style.left = `${Math.max(0, Math.min(100, layer.x))}%`;
    el.style.width = `${Math.max(0, Math.min(100, layer.width))}%`;
    el.style.bottom = `${12 + index * 15}px`;
    layerHost.appendChild(el);
  });

  if (!state.stackIt.gameOver && state.stackIt.moving) {
    const moving = document.createElement('span');
    moving.className = 'fc-stack-block is-moving';
    moving.style.left = `${Math.max(0, Math.min(100, state.stackIt.moving.x))}%`;
    moving.style.width = `${Math.max(0, Math.min(100, state.stackIt.moving.width))}%`;
    moving.style.bottom = `${12 + visible.length * 15}px`;
    layerHost.appendChild(moving);
  }

  const score = state.root?.querySelector('.fc-stack-score');
  const best = state.root?.querySelector('.fc-stack-best');
  if (score) score.textContent = String(state.stackIt.score);
  if (best) best.textContent = String(Math.max(getArcadeStats().stackItBest, state.stackIt.score));

  const status = state.root?.querySelector('.fc-stack-status');
  if (status) {
    if (state.stackIt.gameOver) status.textContent = `Missed it — you stacked ${state.stackIt.score} blocks.`;
    else if (state.stackIt.paused) status.textContent = 'Paused — resume when you are ready.';
    else if (!state.stackIt.running) status.textContent = 'Tap Start, the board, Space, or Enter.';
    else status.textContent = 'Tap or press Space when the moving block lines up.';
  }

  const place = state.root?.querySelector('.fc-stack-place');
  if (place) {
    if (state.stackIt.gameOver) place.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Play Again';
    else if (state.stackIt.running) place.innerHTML = '<i class="fa-solid fa-layer-group"></i> Place';
    else place.innerHTML = '<i class="fa-solid fa-play"></i> Start';
  }
  const pause = state.root?.querySelector('.fc-stack-pause');
  if (pause) {
    pause.disabled = state.stackIt.gameOver;
    pause.innerHTML = state.stackIt.paused ? '<i class="fa-solid fa-play"></i> Resume' : '<i class="fa-solid fa-pause"></i> Pause';
  }
}

// ---------------------------
// Block Drop
// ---------------------------

const BLOCK_DROP_PIECES = [
  { type: 1, cells: [[0,1],[1,1],[2,1],[3,1]] },
  { type: 2, cells: [[0,0],[1,0],[0,1],[1,1]] },
  { type: 3, cells: [[1,0],[0,1],[1,1],[2,1]] },
  { type: 4, cells: [[1,0],[2,0],[0,1],[1,1]] },
  { type: 5, cells: [[0,0],[1,0],[1,1],[2,1]] },
  { type: 6, cells: [[0,0],[0,1],[1,1],[2,1]] },
  { type: 7, cells: [[2,0],[0,1],[1,1],[2,1]] }
];

function randomBlockDropPiece() {
  const source = BLOCK_DROP_PIECES[Math.floor(Math.random() * BLOCK_DROP_PIECES.length)];
  return { type: source.type, cells: source.cells.map(([x,y]) => [x,y]), x: 0, y: 0 };
}

function normalizeBlockDropCells(cells) {
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([,y]) => y));
  return cells.map(([x,y]) => [x - minX, y - minY]);
}

function rotatedBlockDropCells(cells) {
  const normalized = normalizeBlockDropCells(cells);
  const maxX = Math.max(...normalized.map(([x]) => x));
  const maxY = Math.max(...normalized.map(([,y]) => y));
  const size = Math.max(maxX, maxY);
  return normalizeBlockDropCells(normalized.map(([x,y]) => [size - y, x]));
}

function resetBlockDropGame() {
  stopBlockDropInterval();
  state.blockDrop.board = Array.from({ length: BLOCK_DROP_HEIGHT }, () => Array(BLOCK_DROP_WIDTH).fill(0));
  state.blockDrop.current = null;
  state.blockDrop.next = randomBlockDropPiece();
  state.blockDrop.running = false;
  state.blockDrop.paused = false;
  state.blockDrop.gameOver = false;
  state.blockDrop.score = 0;
  state.blockDrop.lines = 0;
  spawnBlockDropPiece();
}

function spawnBlockDropPiece() {
  const piece = state.blockDrop.next || randomBlockDropPiece();
  state.blockDrop.next = randomBlockDropPiece();
  const width = Math.max(...piece.cells.map(([x]) => x)) + 1;
  state.blockDrop.current = { ...piece, cells: piece.cells.map(([x,y]) => [x,y]), x: Math.floor((BLOCK_DROP_WIDTH - width) / 2), y: 0 };
  if (blockDropCollides(state.blockDrop.current, 0, 0, state.blockDrop.current.cells)) finishBlockDropGame();
}

function blockDropCollides(piece, dx = 0, dy = 0, cells = piece?.cells) {
  if (!piece || !cells) return true;
  for (const [cx, cy] of cells) {
    const x = piece.x + dx + cx;
    const y = piece.y + dy + cy;
    if (x < 0 || x >= BLOCK_DROP_WIDTH || y >= BLOCK_DROP_HEIGHT) return true;
    if (y >= 0 && state.blockDrop.board[y]?.[x]) return true;
  }
  return false;
}

function getBlockDropTickMs() {
  return Math.max(140, BLOCK_DROP_BASE_TICK_MS - Math.floor(state.blockDrop.lines / 5) * 45);
}

function startBlockDropGame() {
  if (!state.blockDrop.board.length || state.blockDrop.gameOver) resetBlockDropGame();
  state.blockDrop.running = true;
  state.blockDrop.paused = false;
  restartBlockDropInterval();
  updateBlockDropBoard();
}

function restartBlockDropInterval() {
  stopBlockDropInterval();
  if (!state.blockDrop.running) return;
  state.blockDrop.interval = window.setInterval(blockDropStep, getBlockDropTickMs());
}

function pauseBlockDropGame() {
  if (!state.blockDrop) return;
  if (state.blockDrop.running) {
    state.blockDrop.running = false;
    state.blockDrop.paused = true;
  }
  stopBlockDropInterval();
  const stats = getArcadeStats();
  if (state.blockDrop.score > stats.blockDropBest) void saveArcadeStats({ blockDropBest: state.blockDrop.score });
  if (state.phoneOpen && state.app === 'arcade' && state.arcadeGame === 'blockdrop' && !state.call) updateBlockDropBoard();
}

function stopBlockDropInterval() {
  if (state.blockDrop?.interval) {
    window.clearInterval(state.blockDrop.interval);
    state.blockDrop.interval = null;
  }
}

function blockDropStep() {
  if (!state.blockDrop.running || state.call || state.blockDrop.gameOver) return;
  if (!moveBlockDrop(0, 1, false)) lockBlockDropPiece();
}

function moveBlockDrop(dx, dy, redraw = true) {
  if (state.blockDrop.gameOver || state.blockDrop.paused) return false;
  if (!state.blockDrop.running) startBlockDropGame();
  const piece = state.blockDrop.current;
  if (!piece || blockDropCollides(piece, dx, dy, piece.cells)) return false;
  piece.x += dx;
  piece.y += dy;
  if (redraw) updateBlockDropBoard();
  return true;
}

function softDropBlockDrop() {
  if (state.blockDrop.gameOver) return;
  if (!state.blockDrop.running && !state.blockDrop.paused) startBlockDropGame();
  if (state.blockDrop.paused) return;
  if (moveBlockDrop(0, 1, false)) state.blockDrop.score += 1;
  else lockBlockDropPiece();
  updateBlockDropBoard();
}

function hardDropBlockDrop() {
  if (state.blockDrop.gameOver) {
    resetBlockDropGame();
    startBlockDropGame();
    return;
  }
  if (!state.blockDrop.running && !state.blockDrop.paused) startBlockDropGame();
  if (state.blockDrop.paused) return;
  let distance = 0;
  while (moveBlockDrop(0, 1, false)) distance += 1;
  state.blockDrop.score += distance * 2;
  lockBlockDropPiece();
  updateBlockDropBoard();
}

function rotateBlockDrop() {
  if (state.blockDrop.gameOver || state.blockDrop.paused) return;
  if (!state.blockDrop.running) startBlockDropGame();
  const piece = state.blockDrop.current;
  if (!piece) return;
  const rotated = rotatedBlockDropCells(piece.cells);
  for (const kick of [0, -1, 1, -2, 2]) {
    if (!blockDropCollides(piece, kick, 0, rotated)) {
      piece.x += kick;
      piece.cells = rotated;
      updateBlockDropBoard();
      return;
    }
  }
}

function lockBlockDropPiece() {
  const piece = state.blockDrop.current;
  if (!piece) return;
  for (const [cx, cy] of piece.cells) {
    const x = piece.x + cx;
    const y = piece.y + cy;
    if (y < 0) {
      finishBlockDropGame();
      return;
    }
    if (state.blockDrop.board[y]) state.blockDrop.board[y][x] = piece.type;
  }
  state.blockDrop.score += 10;
  const cleared = clearBlockDropLines();
  if (cleared) {
    const bonuses = [0, 100, 300, 500, 800];
    state.blockDrop.lines += cleared;
    state.blockDrop.score += bonuses[cleared] || cleared * 250;
  }
  spawnBlockDropPiece();
  if (!state.blockDrop.gameOver) restartBlockDropInterval();
  updateBlockDropBoard();
}

function clearBlockDropLines() {
  const remaining = state.blockDrop.board.filter((row) => !row.every(Boolean));
  const cleared = BLOCK_DROP_HEIGHT - remaining.length;
  while (remaining.length < BLOCK_DROP_HEIGHT) remaining.unshift(Array(BLOCK_DROP_WIDTH).fill(0));
  state.blockDrop.board = remaining;
  return cleared;
}

function finishBlockDropGame() {
  state.blockDrop.running = false;
  state.blockDrop.paused = false;
  state.blockDrop.gameOver = true;
  stopBlockDropInterval();
  const stats = getArcadeStats();
  if (state.blockDrop.score > stats.blockDropBest) void saveArcadeStats({ blockDropBest: state.blockDrop.score });
  updateBlockDropBoard();
}

function renderBlockDropGame(container) {
  if (!state.blockDrop.board.length) resetBlockDropGame();
  const stats = getArcadeStats();
  const shell = document.createElement('div');
  shell.className = 'fc-blockdrop-shell';
  shell.innerHTML = `
    <div class="fc-arcade-scorebar"><span>Score <strong class="fc-blockdrop-score">${state.blockDrop.score}</strong></span><span>Lines <strong class="fc-blockdrop-lines">${state.blockDrop.lines}</strong></span><span>Best <strong class="fc-blockdrop-best">${Math.max(stats.blockDropBest, state.blockDrop.score)}</strong></span></div>
    <div class="fc-blockdrop-board" role="img" aria-label="Falling block puzzle board"></div>
    <div class="fc-blockdrop-status"></div>
    <div class="fc-blockdrop-controls">
      <button type="button" data-block-action="rotate" aria-label="Rotate"><i class="fa-solid fa-rotate-right"></i></button>
      <button type="button" data-block-action="left" aria-label="Move left"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" data-block-action="down" aria-label="Move down"><i class="fa-solid fa-chevron-down"></i></button>
      <button type="button" data-block-action="right" aria-label="Move right"><i class="fa-solid fa-chevron-right"></i></button>
      <button type="button" data-block-action="drop" aria-label="Hard drop"><i class="fa-solid fa-angles-down"></i></button>
    </div>
    <div class="fc-blockdrop-actions">
      <button type="button" class="fc-arcade-primary fc-blockdrop-start"><i class="fa-solid fa-play"></i> Start</button>
      <button type="button" class="fc-arcade-secondary fc-blockdrop-new"><i class="fa-solid fa-rotate-right"></i> New Game</button>
    </div>
  `;
  container.appendChild(shell);
  const board = shell.querySelector('.fc-blockdrop-board');
  for (let i = 0; i < BLOCK_DROP_WIDTH * BLOCK_DROP_HEIGHT; i++) {
    const cell = document.createElement('span');
    cell.className = 'fc-blockdrop-cell';
    board.appendChild(cell);
  }
  shell.querySelectorAll('[data-block-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.blockAction;
      if (action === 'left') moveBlockDrop(-1, 0);
      else if (action === 'right') moveBlockDrop(1, 0);
      else if (action === 'down') softDropBlockDrop();
      else if (action === 'rotate') rotateBlockDrop();
      else if (action === 'drop') hardDropBlockDrop();
    });
  });
  shell.querySelector('.fc-blockdrop-start').addEventListener('click', () => {
    if (state.blockDrop.gameOver) { resetBlockDropGame(); startBlockDropGame(); }
    else if (state.blockDrop.running) pauseBlockDropGame();
    else startBlockDropGame();
  });
  shell.querySelector('.fc-blockdrop-new').addEventListener('click', () => { resetBlockDropGame(); updateBlockDropBoard(); });
  updateBlockDropBoard();
}

function updateBlockDropBoard() {
  const boardEl = state.root?.querySelector('.fc-blockdrop-board');
  if (!boardEl) return;
  const display = state.blockDrop.board.map((row) => [...row]);
  const piece = state.blockDrop.current;
  if (piece && !state.blockDrop.gameOver) {
    for (const [cx, cy] of piece.cells) {
      const x = piece.x + cx;
      const y = piece.y + cy;
      if (y >= 0 && y < BLOCK_DROP_HEIGHT && x >= 0 && x < BLOCK_DROP_WIDTH) display[y][x] = piece.type;
    }
  }
  [...boardEl.children].forEach((cell, index) => {
    const y = Math.floor(index / BLOCK_DROP_WIDTH);
    const x = index % BLOCK_DROP_WIDTH;
    const value = display[y]?.[x] || 0;
    cell.className = `fc-blockdrop-cell${value ? ` piece-${value}` : ''}`;
  });
  const score = state.root?.querySelector('.fc-blockdrop-score');
  const lines = state.root?.querySelector('.fc-blockdrop-lines');
  const best = state.root?.querySelector('.fc-blockdrop-best');
  if (score) score.textContent = String(state.blockDrop.score);
  if (lines) lines.textContent = String(state.blockDrop.lines);
  if (best) best.textContent = String(Math.max(getArcadeStats().blockDropBest, state.blockDrop.score));
  const status = state.root?.querySelector('.fc-blockdrop-status');
  if (status) {
    if (state.blockDrop.gameOver) status.textContent = `Game over — score ${state.blockDrop.score}.`;
    else if (state.blockDrop.paused) status.textContent = 'Paused.';
    else if (!state.blockDrop.running) status.textContent = 'Use the controls or arrow keys. Space performs a hard drop.';
    else status.textContent = 'Clear complete rows before the stack reaches the top.';
  }
  const start = state.root?.querySelector('.fc-blockdrop-start');
  if (start) {
    if (state.blockDrop.gameOver) start.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Play Again';
    else if (state.blockDrop.running) start.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
    else start.innerHTML = '<i class="fa-solid fa-play"></i> Resume';
  }
}


// ---------------------------
// Chess
// ---------------------------

const CHESS_GLYPHS = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};
const CHESS_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 100 };

function makeInitialChessBoard() {
  return [
    'bR','bN','bB','bQ','bK','bB','bN','bR',
    'bP','bP','bP','bP','bP','bP','bP','bP',
    ...Array(32).fill(null),
    'wP','wP','wP','wP','wP','wP','wP','wP',
    'wR','wN','wB','wQ','wK','wB','wN','wR'
  ];
}

function resetChessGame() {
  stopChessAi();
  state.chess.board = makeInitialChessBoard();
  state.chess.turn = 'w';
  state.chess.status = 'playing';
  state.chess.selected = null;
  state.chess.legalTargets = [];
  state.chess.message = 'Your move — you are White.';
}

function stopChessAi() {
  if (state.chess?.aiTimer) {
    window.clearTimeout(state.chess.aiTimer);
    state.chess.aiTimer = null;
  }
}

function chessColor(piece) { return piece?.[0] || null; }
function chessType(piece) { return piece?.[1] || null; }
function chessIndex(row, col) { return row * 8 + col; }
function chessRow(index) { return Math.floor(index / 8); }
function chessCol(index) { return index % 8; }
function chessInside(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }
function chessOther(color) { return color === 'w' ? 'b' : 'w'; }

function getChessPseudoMoves(board, index, attacksOnly = false) {
  const piece = board[index];
  if (!piece) return [];
  const color = chessColor(piece);
  const type = chessType(piece);
  const row = chessRow(index);
  const col = chessCol(index);
  const moves = [];
  const push = (r, c, allowOwn = false) => {
    if (!chessInside(r,c)) return false;
    const target = chessIndex(r,c);
    const occupied = board[target];
    if (!occupied) { moves.push(target); return true; }
    if (allowOwn || chessColor(occupied) !== color) moves.push(target);
    return false;
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    for (const dc of [-1,1]) {
      const r = row + dir, c = col + dc;
      if (!chessInside(r,c)) continue;
      const target = chessIndex(r,c);
      if (attacksOnly || (board[target] && chessColor(board[target]) !== color)) moves.push(target);
    }
    if (!attacksOnly) {
      const oneRow = row + dir;
      const one = chessInside(oneRow,col) ? chessIndex(oneRow,col) : -1;
      if (one >= 0 && !board[one]) {
        moves.push(one);
        const twoRow = row + dir * 2;
        const two = chessInside(twoRow,col) ? chessIndex(twoRow,col) : -1;
        if (row === startRow && two >= 0 && !board[two]) moves.push(two);
      }
    }
    return moves;
  }

  if (type === 'N') {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      const r=row+dr,c=col+dc;
      if (!chessInside(r,c)) continue;
      const target=chessIndex(r,c), occupied=board[target];
      if (!occupied || chessColor(occupied)!==color) moves.push(target);
    }
    return moves;
  }

  if (type === 'K') {
    for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
      if (!dr && !dc) continue;
      const r=row+dr,c=col+dc;
      if (!chessInside(r,c)) continue;
      const target=chessIndex(r,c), occupied=board[target];
      if (!occupied || chessColor(occupied)!==color) moves.push(target);
    }
    return moves;
  }

  const dirs = [];
  if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
  if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
  for (const [dr,dc] of dirs) {
    let r=row+dr,c=col+dc;
    while (chessInside(r,c)) {
      if (!push(r,c)) break;
      r+=dr; c+=dc;
    }
  }
  return moves;
}

function isChessSquareAttacked(board, square, byColor) {
  for (let i=0; i<64; i++) {
    const piece=board[i];
    if (!piece || chessColor(piece)!==byColor) continue;
    if (getChessPseudoMoves(board,i,true).includes(square)) return true;
  }
  return false;
}

function findChessKing(board, color) {
  return board.findIndex((piece) => piece === `${color}K`);
}

function isChessInCheck(board, color) {
  const king = findChessKing(board,color);
  if (king < 0) return true;
  return isChessSquareAttacked(board,king,chessOther(color));
}

function applyChessMoveToBoard(board, from, to) {
  const next=[...board];
  const piece=next[from];
  next[to]=piece;
  next[from]=null;
  if (piece?.[1]==='P') {
    const row=chessRow(to);
    if ((piece[0]==='w' && row===0) || (piece[0]==='b' && row===7)) next[to]=`${piece[0]}Q`;
  }
  return next;
}

function getChessLegalMovesForPiece(board,index,color=chessColor(board[index])) {
  const piece=board[index];
  if (!piece || chessColor(piece)!==color) return [];
  return getChessPseudoMoves(board,index,false).filter((to) => {
    const target=board[to];
    if (target && chessType(target)==='K') return false;
    const next=applyChessMoveToBoard(board,index,to);
    return !isChessInCheck(next,color);
  });
}

function getAllChessLegalMoves(board,color) {
  const moves=[];
  for (let from=0;from<64;from++) {
    if (chessColor(board[from])!==color) continue;
    for (const to of getChessLegalMovesForPiece(board,from,color)) moves.push({from,to});
  }
  return moves;
}

function finishChessIfNeeded(nextTurn) {
  const moves=getAllChessLegalMoves(state.chess.board,nextTurn);
  if (moves.length) {
    const check=isChessInCheck(state.chess.board,nextTurn);
    state.chess.message = nextTurn==='w' ? (check ? 'Check — your move.' : 'Your move.') : (check ? 'Phone is in check.' : 'Phone is thinking…');
    return false;
  }
  const check=isChessInCheck(state.chess.board,nextTurn);
  const stats=getArcadeStats();
  if (check) {
    const winner=chessOther(nextTurn);
    state.chess.status=winner==='w' ? 'won' : 'lost';
    state.chess.message=winner==='w' ? 'Checkmate — you win!' : 'Checkmate — phone wins.';
    if (winner==='w') void saveArcadeStats({chessWins:stats.chessWins+1});
    else void saveArcadeStats({chessLosses:stats.chessLosses+1});
  } else {
    state.chess.status='draw';
    state.chess.message='Stalemate — draw.';
    void saveArcadeStats({chessDraws:stats.chessDraws+1});
  }
  state.chess.turn='none';
  return true;
}

function makeChessMove(from,to) {
  if (state.chess.status!=='playing') return false;
  const color=chessColor(state.chess.board[from]);
  if (color!==state.chess.turn) return false;
  if (!getChessLegalMovesForPiece(state.chess.board,from,color).includes(to)) return false;
  state.chess.board=applyChessMoveToBoard(state.chess.board,from,to);
  state.chess.selected=null;
  state.chess.legalTargets=[];
  const next=chessOther(color);
  state.chess.turn=next;
  if (finishChessIfNeeded(next)) { renderChessGameIntoExisting(); return true; }
  renderChessGameIntoExisting();
  if (next==='b') scheduleChessAi();
  return true;
}

function scheduleChessAi() {
  stopChessAi();
  if (state.chess.status!=='playing' || state.chess.turn!=='b') return;
  state.chess.aiTimer=window.setTimeout(() => {
    state.chess.aiTimer=null;
    if (state.chess.status!=='playing' || state.chess.turn!=='b') return;
    const moves=getAllChessLegalMoves(state.chess.board,'b');
    if (!moves.length) { finishChessIfNeeded('b'); renderChessGameIntoExisting(); return; }
    let best=-Infinity, choices=[];
    for (const move of moves) {
      const captured=state.chess.board[move.to];
      let score=(captured ? CHESS_VALUES[chessType(captured)]*10 : 0) + Math.random()*2;
      const next=applyChessMoveToBoard(state.chess.board,move.from,move.to);
      if (isChessInCheck(next,'w')) score+=4;
      const r=chessRow(move.to),c=chessCol(move.to);
      score += (3.5-Math.abs(3.5-r))*.15 + (3.5-Math.abs(3.5-c))*.15;
      if (score>best+0.001) { best=score; choices=[move]; }
      else if (Math.abs(score-best)<0.001) choices.push(move);
    }
    const move=choices[Math.floor(Math.random()*choices.length)] || moves[0];
    state.chess.board=applyChessMoveToBoard(state.chess.board,move.from,move.to);
    state.chess.turn='w';
    finishChessIfNeeded('w');
    renderChessGameIntoExisting();
  }, 420);
}

function onChessSquare(index) {
  if (state.chess.status!=='playing' || state.chess.turn!=='w') return;
  const piece=state.chess.board[index];
  if (state.chess.selected !== null && state.chess.legalTargets.includes(index)) {
    makeChessMove(state.chess.selected,index);
    return;
  }
  if (chessColor(piece)==='w') {
    state.chess.selected=index;
    state.chess.legalTargets=getChessLegalMovesForPiece(state.chess.board,index,'w');
  } else {
    state.chess.selected=null;
    state.chess.legalTargets=[];
  }
  renderChessGameIntoExisting();
}

function renderChessGame(container) {
  if (!state.chess.board.length) resetChessGame();
  const stats=getArcadeStats();
  const shell=document.createElement('div');
  shell.className='fc-chess-shell';
  shell.innerHTML=`
    <div class="fc-ttt-stats"><span>${stats.chessWins} Wins</span><span>${stats.chessLosses} Losses</span><span>${stats.chessDraws} Draws</span></div>
    <div class="fc-chess-note">You play White · pawn promotion is automatic · castling/en passant are omitted in Arcade mode.</div>
    <div class="fc-chess-board" role="grid" aria-label="Chess board"></div>
    <div class="fc-chess-status"></div>
    <button type="button" class="fc-arcade-primary fc-chess-new"><i class="fa-solid fa-rotate-right"></i> New Game</button>
  `;
  container.appendChild(shell);
  const board=shell.querySelector('.fc-chess-board');
  for (let i=0;i<64;i++) {
    const button=document.createElement('button');
    button.type='button';
    button.className='fc-chess-square';
    button.dataset.chessIndex=String(i);
    button.addEventListener('click',()=>onChessSquare(i));
    board.appendChild(button);
  }
  shell.querySelector('.fc-chess-new').addEventListener('click',()=>{ resetChessGame(); renderPhone(); });
  updateChessBoard();
  if (state.chess.status==='playing' && state.chess.turn==='b' && !state.chess.aiTimer) scheduleChessAi();
}

function renderChessGameIntoExisting() {
  if (!state.phoneOpen || state.app!=='arcade' || state.arcadeGame!=='chess') return;
  updateChessBoard();
}

function updateChessBoard() {
  const board=state.root?.querySelector('.fc-chess-board');
  if (!board) return;
  const whiteCheck = state.chess.status==='playing' && isChessInCheck(state.chess.board,'w');
  const blackCheck = state.chess.status==='playing' && isChessInCheck(state.chess.board,'b');
  [...board.children].forEach((button,index)=>{
    const row=chessRow(index),col=chessCol(index),piece=state.chess.board[index];
    button.className=`fc-chess-square ${(row+col)%2 ? 'is-dark' : 'is-light'}`;
    if (state.chess.selected===index) button.classList.add('is-selected');
    if (state.chess.legalTargets.includes(index)) button.classList.add(piece ? 'is-capture' : 'is-target');
    if ((piece==='wK'&&whiteCheck)||(piece==='bK'&&blackCheck)) button.classList.add('is-check');
    button.textContent=piece ? CHESS_GLYPHS[piece] : '';
    button.setAttribute('aria-label',piece ? `${piece[0]==='w'?'White':'Black'} ${piece[1]}` : 'Empty square');
    button.disabled = state.chess.status!=='playing' || state.chess.turn!=='w';
  });
  const status=state.root?.querySelector('.fc-chess-status');
  if (status) status.textContent=state.chess.message;
}

// ---------------------------
// Farkle
// ---------------------------

const FARKLE_TARGET = 3000;

function stopFarklePhoneTimer() {
  if (state.farkle?.phoneTimer) {
    window.clearTimeout(state.farkle.phoneTimer);
    state.farkle.phoneTimer=null;
  }
}

function resetFarkleGame() {
  stopFarklePhoneTimer();
  state.farkle.playerScore=0;
  state.farkle.phoneScore=0;
  state.farkle.turnScore=0;
  state.farkle.diceCount=6;
  state.farkle.dice=[];
  state.farkle.selected=new Set();
  state.farkle.status='player';
  state.farkle.message=`First to ${FARKLE_TARGET}. Roll the dice to start.`;
  state.farkle.rolled=false;
}

function rollFarkleDice(count) {
  return Array.from({length:count},()=>Math.floor(Math.random()*6)+1);
}

function scoreFarkleSelection(values) {
  if (!values?.length) return 0;
  const counts=Array(7).fill(0);
  values.forEach(v=>counts[v]++);
  const n=values.length;
  if (n===6) {
    if ([1,2,3,4,5,6].every(v=>counts[v]===1)) return 1500;
    const groups=counts.slice(1).filter(Boolean).sort((a,b)=>a-b);
    if (groups.length===3 && groups.every(c=>c===2)) return 1500;
    if (groups.length===2 && groups.every(c=>c===3)) return 2500;
    if (groups.length===2 && groups.includes(4) && groups.includes(2)) return 1500;
  }
  let score=0;
  for (let face=1;face<=6;face++) {
    let count=counts[face];
    if (count>=3) {
      if (count===6) { score+=3000; count=0; }
      else if (count===5) { score+=2000; count=0; }
      else if (count===4) { score+=1000; count=0; }
      else { score += face===1 ? 1000 : face*100; count-=3; }
    }
    if (count>0) {
      if (face===1) score+=count*100;
      else if (face===5) score+=count*50;
      else return null;
    }
  }
  return score;
}

function getBestFarkleSelection(values) {
  let best={score:0,indices:[]};
  const total=1<<values.length;
  for (let mask=1;mask<total;mask++) {
    const subset=[],indices=[];
    for (let i=0;i<values.length;i++) if (mask&(1<<i)) { subset.push(values[i]); indices.push(i); }
    const score=scoreFarkleSelection(subset);
    if (score===null || score<=0) continue;
    if (score>best.score || (score===best.score && indices.length<best.indices.length)) best={score,indices};
  }
  return best;
}

function farkleRollHasScore(values) {
  return getBestFarkleSelection(values).score>0;
}

function rollPlayerFarkle() {
  if (state.farkle.status!=='player') return;
  state.farkle.dice=rollFarkleDice(state.farkle.diceCount);
  state.farkle.selected=new Set();
  state.farkle.rolled=true;
  if (!farkleRollHasScore(state.farkle.dice)) {
    state.farkle.turnScore=0;
    state.farkle.message='Farkle! No scoring dice — your turn scores 0.';
    state.farkle.status='phone';
    updateFarkleBoard();
    scheduleFarklePhoneTurn();
    return;
  }
  state.farkle.message='Select scoring dice, then Roll Again or Bank.';
  updateFarkleBoard();
}

function toggleFarkleDie(index) {
  if (state.farkle.status!=='player' || !state.farkle.rolled) return;
  if (state.farkle.selected.has(index)) state.farkle.selected.delete(index);
  else state.farkle.selected.add(index);
  updateFarkleBoard();
}

function getSelectedFarkleValues() {
  return [...state.farkle.selected].sort((a,b)=>a-b).map(i=>state.farkle.dice[i]);
}

function commitFarkleSelection() {
  const values=getSelectedFarkleValues();
  const score=scoreFarkleSelection(values);
  if (!score || score<1) return null;
  state.farkle.turnScore+=score;
  state.farkle.diceCount-=values.length;
  if (state.farkle.diceCount<=0) state.farkle.diceCount=6;
  state.farkle.selected=new Set();
  state.farkle.dice=[];
  state.farkle.rolled=false;
  return score;
}

function continueFarkleTurn() {
  if (state.farkle.status!=='player') return;
  const committed=commitFarkleSelection();
  if (!committed) { state.farkle.message='Choose only scoring dice before rolling again.'; updateFarkleBoard(); return; }
  state.farkle.message=state.farkle.diceCount===6 ? `Hot dice! ${state.farkle.turnScore} points this turn — rolling all six again.` : `${state.farkle.turnScore} points this turn — rolling ${state.farkle.diceCount} dice.`;
  rollPlayerFarkle();
}

function bankFarkleTurn() {
  if (state.farkle.status!=='player') return;
  const committed=commitFarkleSelection();
  if (!committed) { state.farkle.message='Choose scoring dice before banking.'; updateFarkleBoard(); return; }
  state.farkle.playerScore+=state.farkle.turnScore;
  if (state.farkle.playerScore>=FARKLE_TARGET) { finishFarkleGame('player'); return; }
  const banked=state.farkle.turnScore;
  state.farkle.turnScore=0;
  state.farkle.diceCount=6;
  state.farkle.status='phone';
  state.farkle.message=`You banked ${banked}. Phone is rolling…`;
  updateFarkleBoard();
  scheduleFarklePhoneTurn();
}

function scheduleFarklePhoneTurn() {
  stopFarklePhoneTimer();
  state.farkle.phoneTimer=window.setTimeout(()=>{
    state.farkle.phoneTimer=null;
    if (state.farkle.status!=='phone') return;
    playFarklePhoneTurn();
  },650);
}

function playFarklePhoneTurn() {
  let turn=0, diceCount=6, rolls=0, farkled=false;
  while (rolls<12) {
    rolls++;
    const dice=rollFarkleDice(diceCount);
    const best=getBestFarkleSelection(dice);
    if (!best.score) { turn=0; farkled=true; break; }
    turn+=best.score;
    diceCount-=best.indices.length;
    if (diceCount<=0) diceCount=6;
    if (state.farkle.phoneScore+turn>=FARKLE_TARGET) break;
    const bankThreshold = diceCount<=2 ? 250 : 400;
    if (turn>=bankThreshold) break;
  }
  if (!farkled) state.farkle.phoneScore+=turn;
  if (state.farkle.phoneScore>=FARKLE_TARGET) { finishFarkleGame('phone'); return; }
  state.farkle.turnScore=0;
  state.farkle.diceCount=6;
  state.farkle.dice=[];
  state.farkle.selected=new Set();
  state.farkle.rolled=false;
  state.farkle.status='player';
  state.farkle.message=farkled ? 'Phone farkled! Your turn.' : `Phone banked ${turn}. Your turn.`;
  updateFarkleBoard();
}

function finishFarkleGame(winner) {
  stopFarklePhoneTimer();
  const stats=getArcadeStats();
  state.farkle.status='over';
  if (winner==='player') {
    state.farkle.message=`You win ${state.farkle.playerScore}–${state.farkle.phoneScore}!`;
    void saveArcadeStats({farkleWins:stats.farkleWins+1});
  } else {
    state.farkle.message=`Phone wins ${state.farkle.phoneScore}–${state.farkle.playerScore}.`;
    void saveArcadeStats({farkleLosses:stats.farkleLosses+1});
  }
  updateFarkleBoard();
}

function renderFarkleGame(container) {
  const stats=getArcadeStats();
  const shell=document.createElement('div');
  shell.className='fc-farkle-shell';
  shell.innerHTML=`
    <div class="fc-farkle-score"><div><small>You</small><strong class="fc-farkle-player-score">${state.farkle.playerScore}</strong></div><span>First to ${FARKLE_TARGET}</span><div><small>Phone</small><strong class="fc-farkle-phone-score">${state.farkle.phoneScore}</strong></div></div>
    <div class="fc-farkle-record">Record: ${stats.farkleWins}W · ${stats.farkleLosses}L</div>
    <div class="fc-farkle-turn">Turn points <strong class="fc-farkle-turn-score">${state.farkle.turnScore}</strong></div>
    <div class="fc-farkle-dice" aria-label="Farkle dice"></div>
    <div class="fc-farkle-selection">Selected: <strong class="fc-farkle-selected-score">0</strong></div>
    <div class="fc-farkle-status"></div>
    <div class="fc-farkle-actions">
      <button type="button" class="fc-arcade-primary fc-farkle-roll"><i class="fa-solid fa-dice"></i> Roll</button>
      <button type="button" class="fc-arcade-secondary fc-farkle-bank"><i class="fa-solid fa-piggy-bank"></i> Bank</button>
    </div>
    <button type="button" class="fc-arcade-secondary fc-farkle-new"><i class="fa-solid fa-rotate-right"></i> New Match</button>
    <div class="fc-farkle-rules">1s = 100 · 5s = 50 · triples score · straight / three pairs = 1500. Four, five, and six of a kind score 1000 / 2000 / 3000.</div>
  `;
  container.appendChild(shell);
  shell.querySelector('.fc-farkle-roll').addEventListener('click',()=>{
    if (state.farkle.status==='over') { resetFarkleGame(); renderPhone(); return; }
    if (!state.farkle.rolled) rollPlayerFarkle();
    else continueFarkleTurn();
  });
  shell.querySelector('.fc-farkle-bank').addEventListener('click',bankFarkleTurn);
  shell.querySelector('.fc-farkle-new').addEventListener('click',()=>{ resetFarkleGame(); renderPhone(); });
  updateFarkleBoard();
  if (state.farkle.status==='phone' && !state.farkle.phoneTimer) scheduleFarklePhoneTurn();
}

function updateFarkleBoard() {
  const diceEl=state.root?.querySelector('.fc-farkle-dice');
  if (!diceEl) return;
  diceEl.replaceChildren();
  if (state.farkle.dice.length) {
    state.farkle.dice.forEach((value,index)=>{
      const button=document.createElement('button');
      button.type='button';
      button.className=`fc-farkle-die${state.farkle.selected.has(index)?' is-selected':''}`;
      button.textContent=String(value);
      button.setAttribute('aria-label',`Die showing ${value}${state.farkle.selected.has(index)?', selected':''}`);
      button.disabled=state.farkle.status!=='player';
      button.addEventListener('click',()=>toggleFarkleDie(index));
      diceEl.appendChild(button);
    });
  } else {
    const empty=document.createElement('div');
    empty.className='fc-farkle-dice-empty';
    empty.innerHTML='<i class="fa-solid fa-dice"></i><span>Ready to roll</span>';
    diceEl.appendChild(empty);
  }
  const selectedScore=scoreFarkleSelection(getSelectedFarkleValues());
  const selectedEl=state.root?.querySelector('.fc-farkle-selected-score');
  if (selectedEl) selectedEl.textContent=selectedScore===null ? 'Invalid' : String(selectedScore||0);
  const player=state.root?.querySelector('.fc-farkle-player-score');
  const phone=state.root?.querySelector('.fc-farkle-phone-score');
  const turn=state.root?.querySelector('.fc-farkle-turn-score');
  if (player) player.textContent=String(state.farkle.playerScore);
  if (phone) phone.textContent=String(state.farkle.phoneScore);
  if (turn) turn.textContent=String(state.farkle.turnScore);
  const status=state.root?.querySelector('.fc-farkle-status');
  if (status) status.textContent=state.farkle.message;
  const roll=state.root?.querySelector('.fc-farkle-roll');
  const bank=state.root?.querySelector('.fc-farkle-bank');
  if (roll) {
    roll.disabled=state.farkle.status==='phone';
    if (state.farkle.status==='over') roll.innerHTML='<i class="fa-solid fa-rotate-right"></i> Play Again';
    else if (state.farkle.rolled) roll.innerHTML='<i class="fa-solid fa-dice"></i> Roll Again';
    else roll.innerHTML=`<i class="fa-solid fa-dice"></i> Roll ${state.farkle.diceCount}`;
  }
  if (bank) bank.disabled=state.farkle.status!=='player' || !state.farkle.rolled;
}

// ---------------------------
// Music app
// ---------------------------

function getFoundryPlayingTracks() {
  const tracks = [];
  for (const playlist of game.playlists?.contents || []) {
    const sounds = playlist.sounds?.contents || Array.from(playlist.sounds || []);
    for (const sound of sounds) {
      if (!sound?.playing) continue;
      tracks.push({ playlist, sound });
    }
  }
  return tracks;
}

function getPlaylistVolume() {
  const raw = Number(game.settings.get('core', 'globalPlaylistVolume'));
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
}

function setPlaylistVolume(value) {
  const volume = Math.max(0, Math.min(1, Number(value) || 0));
  if (volume > 0.01) state.musicLastVolume = volume;
  if (state.musicVolumeTimer) window.clearTimeout(state.musicVolumeTimer);
  state.musicVolumeTimer = window.setTimeout(async () => {
    try {
      await game.settings.set('core', 'globalPlaylistVolume', volume);
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not change playlist volume`, error);
      ui.notifications.warn('Foundry music volume could not be changed.');
    }
  }, 45);
}

function getAmbientVolume() {
  const raw = Number(game.settings.get('core', 'globalAmbientVolume'));
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
}

function setAmbientVolume(value) {
  const volume = Math.max(0, Math.min(1, Number(value) || 0));
  if (volume > 0.01) state.musicLastAmbientVolume = volume;
  if (state.musicAmbientVolumeTimer) window.clearTimeout(state.musicAmbientVolumeTimer);
  state.musicAmbientVolumeTimer = window.setTimeout(async () => {
    try {
      await game.settings.set('core', 'globalAmbientVolume', volume);
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not change ambient volume`, error);
      ui.notifications.warn('Foundry environment volume could not be changed.');
    }
  }, 45);
}

function renderMusicView() {
  const container = state.root.querySelector('.fc-music-content');
  if (!container) return;
  container.replaceChildren();
  const tracks = getFoundryPlayingTracks();
  const primary = tracks[0] || null;
  const volume = getPlaylistVolume();
  const ambientVolume = getAmbientVolume();
  if (volume > 0.01) state.musicLastVolume = volume;
  if (ambientVolume > 0.01) state.musicLastAmbientVolume = ambientVolume;

  const shell = document.createElement('div');
  shell.className = 'fc-music-shell';
  shell.innerHTML = `
    <div class="fc-music-brand"><span><i class="fa-solid fa-wave-square"></i></span><div><strong>Music</strong><small>Foundry streaming</small></div></div>
    <div class="fc-music-now${primary ? ' is-playing' : ''}">
      <div class="fc-music-art"><i class="fa-solid ${primary ? 'fa-music' : 'fa-headphones'}"></i><span class="fc-music-eq" aria-hidden="true"><b></b><b></b><b></b><b></b></span></div>
      <div class="fc-music-kicker">${primary ? 'NOW PLAYING' : 'READY'}</div>
      <div class="fc-music-track">${escapeMissionText(primary?.sound?.name || 'Nothing playing')}</div>
      <div class="fc-music-playlist">${escapeMissionText(primary?.playlist?.name || 'Waiting for the GM to start a Foundry playlist')}</div>
    </div>
    <div class="fc-music-volume-card">
      <div class="fc-music-volume-head"><span>Your Music Volume</span><strong class="fc-music-volume-value">${Math.round(volume * 100)}%</strong></div>
      <div class="fc-music-volume-row">
        <button type="button" class="fc-music-mute" aria-label="Mute or restore music"><i class="fa-solid ${volume <= 0.01 ? 'fa-volume-xmark' : 'fa-volume-high'}"></i></button>
        <input class="fc-music-volume" type="range" min="0" max="100" step="1" value="${Math.round(volume * 100)}" aria-label="Personal Foundry playlist volume">
      </div>
      <small>This only changes playlist volume for you. The GM still controls playback.</small>
    </div>
    <div class="fc-music-volume-card fc-music-ambient-card">
      <div class="fc-music-volume-head"><span>Your Environment Volume</span><strong class="fc-music-ambient-value">${Math.round(ambientVolume * 100)}%</strong></div>
      <div class="fc-music-volume-row">
        <button type="button" class="fc-music-ambient-mute fc-music-mute" aria-label="Mute or restore environment sounds"><i class="fa-solid ${ambientVolume <= 0.01 ? 'fa-volume-xmark' : 'fa-tree'}"></i></button>
        <input class="fc-music-ambient-volume fc-music-volume" type="range" min="0" max="100" step="1" value="${Math.round(ambientVolume * 100)}" aria-label="Personal Foundry ambient sound volume">
      </div>
      <small>Controls Scene ambient/environment sounds only for you.</small>
    </div>
  `;
  container.appendChild(shell);

  if (tracks.length > 1) {
    const section = document.createElement('div');
    section.className = 'fc-music-also';
    const heading = document.createElement('div');
    heading.className = 'fc-music-section-title';
    heading.textContent = 'Also playing';
    section.appendChild(heading);
    for (const { playlist, sound } of tracks.slice(1, 5)) {
      const row = document.createElement('div');
      row.className = 'fc-music-track-row';
      row.innerHTML = `<span><i class="fa-solid fa-music"></i></span><div><strong>${escapeMissionText(sound.name || 'Track')}</strong><small>${escapeMissionText(playlist.name || 'Playlist')}</small></div>`;
      section.appendChild(row);
    }
    container.appendChild(section);
  }

  const slider = shell.querySelector('.fc-music-volume:not(.fc-music-ambient-volume)');
  const label = shell.querySelector('.fc-music-volume-value');
  const mute = shell.querySelector('.fc-music-mute:not(.fc-music-ambient-mute)');
  slider.addEventListener('input', () => {
    const next = Math.max(0, Math.min(100, Number(slider.value) || 0));
    label.textContent = `${Math.round(next)}%`;
    mute.querySelector('i').className = `fa-solid ${next <= 1 ? 'fa-volume-xmark' : 'fa-volume-high'}`;
    setPlaylistVolume(next / 100);
  });
  slider.addEventListener('change', async () => {
    const next = Math.max(0, Math.min(100, Number(slider.value) || 0));
    if (state.musicVolumeTimer) window.clearTimeout(state.musicVolumeTimer);
    state.musicVolumeTimer = null;
    try { await game.settings.set('core', 'globalPlaylistVolume', next / 100); }
    catch (error) { console.warn(`${MODULE_ID} | Could not change playlist volume`, error); }
  });
  mute.addEventListener('click', async () => {
    const current = getPlaylistVolume();
    const next = current > 0.01 ? 0 : Math.max(0.05, state.musicLastVolume || 0.7);
    if (current > 0.01) state.musicLastVolume = current;
    try {
      await game.settings.set('core', 'globalPlaylistVolume', next);
      renderMusicView();
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not change playlist volume`, error);
    }
  });

  const ambientSlider = shell.querySelector('.fc-music-ambient-volume');
  const ambientLabel = shell.querySelector('.fc-music-ambient-value');
  const ambientMute = shell.querySelector('.fc-music-ambient-mute');
  ambientSlider.addEventListener('input', () => {
    const next = Math.max(0, Math.min(100, Number(ambientSlider.value) || 0));
    ambientLabel.textContent = `${Math.round(next)}%`;
    ambientMute.querySelector('i').className = `fa-solid ${next <= 1 ? 'fa-volume-xmark' : 'fa-tree'}`;
    setAmbientVolume(next / 100);
  });
  ambientSlider.addEventListener('change', async () => {
    const next = Math.max(0, Math.min(100, Number(ambientSlider.value) || 0));
    if (state.musicAmbientVolumeTimer) window.clearTimeout(state.musicAmbientVolumeTimer);
    state.musicAmbientVolumeTimer = null;
    try { await game.settings.set('core', 'globalAmbientVolume', next / 100); }
    catch (error) { console.warn(`${MODULE_ID} | Could not change ambient volume`, error); }
  });
  ambientMute.addEventListener('click', async () => {
    const current = getAmbientVolume();
    const next = current > 0.01 ? 0 : Math.max(0.05, state.musicLastAmbientVolume || 0.7);
    if (current > 0.01) state.musicLastAmbientVolume = current;
    try {
      await game.settings.set('core', 'globalAmbientVolume', next);
      renderMusicView();
    } catch (error) {
      console.warn(`${MODULE_ID} | Could not change ambient volume`, error);
    }
  });
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
  pauseArcadeActionGames();
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
  pauseArcadeActionGames();
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

  if (payload.type === 'mondo-ride-request') {
    void handleMondoRideRequest(payload);
    return;
  }

  if (payload.type === 'mondo-ride-response') {
    void handleMondoRideResponse(payload);
    return;
  }

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

  const toolbarBadges = document.querySelectorAll(`.fc-toolbar-phone-button .fc-launcher-badge`);
  for (const badge of toolbarBadges) setBadge(badge, total);
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

function getPhoneScalePercent() {
  const raw = Number(game.settings?.get?.(MODULE_ID, PHONE_SCALE_SETTING) ?? 100);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(150, Math.max(60, Math.round(raw)));
}

function getPhoneTextScalePercent() {
  const raw = Number(game.settings?.get?.(MODULE_ID, PHONE_TEXT_SCALE_SETTING) ?? 100);
  if (!Number.isFinite(raw)) return 100;
  return Math.min(150, Math.max(60, Math.round(raw)));
}

function getPhoneTextFollowsSize() {
  return game.settings?.get?.(MODULE_ID, PHONE_TEXT_FOLLOW_SIZE_SETTING) !== false;
}

function getBasePhoneHeight() {
  const viewportHeight = Math.max(320, window.innerHeight || 800);
  const viewportWidth = Math.max(320, window.innerWidth || 1280);
  if (viewportWidth <= 720) return Math.min(viewportHeight * 0.82, 600);
  if (viewportHeight <= 720) return Math.min(viewportHeight * 0.88, 580);
  return Math.min(viewportHeight * 0.76, 650);
}

function getEffectivePhoneHeight(scalePercent = getPhoneScalePercent()) {
  const requested = getBasePhoneHeight() * (scalePercent / 100);
  const maxHeight = Math.max(300, (window.innerHeight || 800) * 0.94);
  const maxByWidth = Math.max(300, (window.innerWidth || 1280) * 0.94 * (337 / 171));
  return Math.round(Math.max(300, Math.min(requested, maxHeight, maxByWidth)));
}

function clampPhonePercent(value, fallback = 100) {
  const numeric = Number(value);
  return Math.min(150, Math.max(60, Number.isFinite(numeric) ? numeric : fallback));
}

function applyPhoneScale(previewPercent = null, previewTextPercent = null, followSizeOverride = null) {
  const phone = state.root?.querySelector(".fc-phone");
  if (!phone) return;

  const phonePercent = previewPercent == null
    ? getPhoneScalePercent()
    : clampPhonePercent(previewPercent);
  const followsPhoneSize = followSizeOverride == null
    ? getPhoneTextFollowsSize()
    : Boolean(followSizeOverride);
  const textPercent = followsPhoneSize
    ? phonePercent
    : (previewTextPercent == null ? getPhoneTextScalePercent() : clampPhonePercent(previewTextPercent));

  phone.style.height = `${getEffectivePhoneHeight(phonePercent)}px`;
  phone.style.setProperty("--fc-font-scale", String(textPercent / 100));
  requestAnimationFrame(keepPhoneOnScreen);
}

async function setPhoneScalePercent(value) {
  const percent = Math.round(clampPhonePercent(value));
  await game.settings.set(MODULE_ID, PHONE_SCALE_SETTING, percent);
}

async function setPhoneTextScalePercent(value) {
  const percent = Math.round(clampPhonePercent(value));
  await game.settings.set(MODULE_ID, PHONE_TEXT_SCALE_SETTING, percent);
}

async function setPhoneTextFollowsSize(value) {
  await game.settings.set(MODULE_ID, PHONE_TEXT_FOLLOW_SIZE_SETTING, Boolean(value));
}

function renderSettingsView() {
  const container = state.root?.querySelector(".fc-settings-content");
  if (!container) return;
  container.replaceChildren();

  const shell = document.createElement("div");
  shell.className = "fc-settings-shell";

  const intro = document.createElement("div");
  intro.className = "fc-settings-intro";
  intro.innerHTML = '<i class="fa-solid fa-sliders"></i><div><strong>Phone appearance</strong><span>These settings apply only to your Foundry client.</span></div>';
  shell.appendChild(intro);

  const card = document.createElement("section");
  card.className = "fc-settings-card";

  const heading = document.createElement("div");
  heading.className = "fc-settings-heading";
  const headingText = document.createElement("div");
  headingText.innerHTML = '<strong>Phone size</strong><span>Resize the entire cellphone interface.</span>';
  const value = document.createElement("strong");
  value.className = "fc-settings-value";
  const current = getPhoneScalePercent();
  value.textContent = `${current}%`;
  heading.append(headingText, value);
  card.appendChild(heading);

  const range = document.createElement("input");
  range.className = "fc-settings-range";
  range.type = "range";
  range.min = "60";
  range.max = "150";
  range.step = "5";
  range.value = String(current);
  range.setAttribute("aria-label", "Phone size percentage");
  range.addEventListener("input", () => {
    const percent = Number(range.value);
    value.textContent = `${percent}%`;
    applyPhoneScale(percent);
    updateTextControlsForPhonePreview(percent);
  });
  range.addEventListener("change", async () => {
    range.disabled = true;
    try {
      await setPhoneScalePercent(range.value);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save phone size`, error);
      ui.notifications.error("Cellphone size could not be saved.");
      applyPhoneScale();
    } finally {
      range.disabled = false;
    }
  });
  card.appendChild(range);

  const scaleLabels = document.createElement("div");
  scaleLabels.className = "fc-settings-range-labels";
  scaleLabels.innerHTML = '<span>Smaller</span><span>Default</span><span>Larger</span>';
  card.appendChild(scaleLabels);

  const presets = document.createElement("div");
  presets.className = "fc-settings-presets";
  for (const [percent, label] of [[75, "Small"], [100, "Default"], [125, "Large"], [150, "XL"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = percent === current ? "is-active" : "";
    button.addEventListener("click", async () => {
      range.value = String(percent);
      value.textContent = `${percent}%`;
      applyPhoneScale(percent);
      updateTextControlsForPhonePreview(percent);
      try {
        await setPhoneScalePercent(percent);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to save phone size preset`, error);
        ui.notifications.error("Cellphone size could not be saved.");
      }
    });
    presets.appendChild(button);
  }
  card.appendChild(presets);

  const note = document.createElement("div");
  note.className = "fc-settings-note";
  note.innerHTML = '<i class="fa-solid fa-circle-info"></i><span>Very large sizes are automatically limited when needed so the phone remains on screen.</span>';
  card.appendChild(note);

  shell.appendChild(card);

  const textCard = document.createElement("section");
  textCard.className = "fc-settings-card";

  const textHeading = document.createElement("div");
  textHeading.className = "fc-settings-heading";
  const textHeadingText = document.createElement("div");
  textHeadingText.innerHTML = '<strong>Text size</strong><span>Scale cellphone text with the phone or adjust it independently.</span>';
  const textValue = document.createElement("strong");
  textValue.className = "fc-settings-value";
  const textCurrent = getPhoneTextScalePercent();
  const followsPhoneSize = getPhoneTextFollowsSize();
  textValue.textContent = `${followsPhoneSize ? current : textCurrent}%`;
  textHeading.append(textHeadingText, textValue);
  textCard.appendChild(textHeading);

  const followRow = document.createElement("label");
  followRow.className = "fc-settings-toggle-row";
  const followCopy = document.createElement("span");
  followCopy.innerHTML = '<strong>Follow phone size</strong><small>Keep text proportional when the phone is resized.</small>';
  const followToggle = document.createElement("input");
  followToggle.type = "checkbox";
  followToggle.checked = followsPhoneSize;
  followToggle.setAttribute("aria-label", "Make text size follow phone size");
  followRow.append(followCopy, followToggle);
  textCard.appendChild(followRow);

  const textRange = document.createElement("input");
  textRange.className = "fc-settings-range";
  textRange.type = "range";
  textRange.min = "60";
  textRange.max = "150";
  textRange.step = "5";
  textRange.value = String(followsPhoneSize ? current : textCurrent);
  textRange.disabled = followsPhoneSize;
  textRange.setAttribute("aria-label", "Text size percentage");
  textRange.addEventListener("input", () => {
    const percent = Number(textRange.value);
    textValue.textContent = `${percent}%`;
    applyPhoneScale(null, percent, false);
    updateTextPresetState(percent);
  });
  textRange.addEventListener("change", async () => {
    textRange.disabled = true;
    try {
      await setPhoneTextScalePercent(textRange.value);
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save text size`, error);
      ui.notifications.error("Cellphone text size could not be saved.");
      applyPhoneScale();
    } finally {
      textRange.disabled = getPhoneTextFollowsSize();
    }
  });
  textCard.appendChild(textRange);

  const textScaleLabels = document.createElement("div");
  textScaleLabels.className = "fc-settings-range-labels";
  textScaleLabels.innerHTML = '<span>Smaller</span><span>Default</span><span>Larger</span>';
  textCard.appendChild(textScaleLabels);

  const textPresets = document.createElement("div");
  textPresets.className = "fc-settings-presets fc-settings-text-presets";
  const textPresetButtons = [];
  for (const [percent, label] of [[75, "Small"], [100, "Default"], [125, "Large"], [150, "XL"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = followsPhoneSize;
    button.className = (!followsPhoneSize && percent === textCurrent) ? "is-active" : "";
    button.addEventListener("click", async () => {
      textRange.value = String(percent);
      textValue.textContent = `${percent}%`;
      applyPhoneScale(null, percent, false);
      updateTextPresetState(percent);
      try {
        await setPhoneTextScalePercent(percent);
      } catch (error) {
        console.error(`${MODULE_ID} | Failed to save text size preset`, error);
        ui.notifications.error("Cellphone text size could not be saved.");
      }
    });
    textPresetButtons.push([percent, button]);
    textPresets.appendChild(button);
  }
  textCard.appendChild(textPresets);

  function updateTextPresetState(percent) {
    for (const [presetPercent, button] of textPresetButtons) {
      button.classList.toggle("is-active", !followToggle.checked && presetPercent === Number(percent));
    }
  }

  function updateTextControlsForPhonePreview(phonePercent) {
    if (!followToggle.checked) return;
    textValue.textContent = `${Math.round(Number(phonePercent) || 100)}%`;
    textRange.value = String(Math.round(clampPhonePercent(phonePercent)));
  }

  followToggle.addEventListener("change", async () => {
    followToggle.disabled = true;
    try {
      if (followToggle.checked) {
        await setPhoneTextFollowsSize(true);
      } else {
        const currentPhonePercent = Number(range.value) || getPhoneScalePercent();
        await setPhoneTextScalePercent(currentPhonePercent);
        await setPhoneTextFollowsSize(false);
      }
    } catch (error) {
      console.error(`${MODULE_ID} | Failed to save text follow setting`, error);
      ui.notifications.error("Cellphone text settings could not be saved.");
      applyPhoneScale();
    } finally {
      followToggle.disabled = false;
    }
  });

  const textNote = document.createElement("div");
  textNote.className = "fc-settings-note";
  textNote.innerHTML = '<i class="fa-solid fa-universal-access"></i><span>Turn off Follow phone size if you want larger or smaller text without changing the phone itself.</span>';
  textCard.appendChild(textNote);

  shell.appendChild(textCard);
  container.appendChild(shell);
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
