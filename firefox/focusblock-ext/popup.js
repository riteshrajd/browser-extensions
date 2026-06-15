const PRESET_DURATIONS = [
  900000,
  1800000,
  3600000,
  7200000,
  14400000,
  28800000,
  43200000,
  86400000
];

const state = {
  mode: "allowlist",
  allowList: [],
  blockList: [],
  lockUntil: 0,
  selectedDurationMs: 7200000,
  locked: false,
  remainingMs: 0
};

const els = {
  statusText: document.getElementById("statusText"),
  timerText: document.getElementById("timerText"),
  durationSelect: document.getElementById("durationSelect"),
  customWrap: document.getElementById("customWrap"),
  customMinutes: document.getElementById("customMinutes"),
  startBtn: document.getElementById("startBtn"),
  modeSelect: document.getElementById("modeSelect"),
  allowInput: document.getElementById("allowInput"),
  blockInput: document.getElementById("blockInput"),
  allowAddBtn: document.getElementById("allowAddBtn"),
  blockAddBtn: document.getElementById("blockAddBtn"),
  allowList: document.getElementById("allowList"),
  blockList: document.getElementById("blockList"),
  moveModal: document.getElementById("moveModal"),
  moveText: document.getElementById("moveText"),
  moveCancelBtn: document.getElementById("moveCancelBtn"),
  moveConfirmBtn: document.getElementById("moveConfirmBtn")
};

let pendingMove = null;

function normalizeRule(raw) {
  let value = String(raw ?? "").trim().toLowerCase();
  if (!value) return "";

  value = value.replace(/\s+/g, "");
  value = value.replace(/^\.+|\.+$/g, "");

  if (value === "::1" || value === "[::1]") return "::1";

  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.slice(1, -1);
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.hostname.replace(/^\[|\]$/g, "");
    } catch {
      return "";
    }
  }

  value = value.split(/[/?#]/)[0];

  const colonCount = (value.match(/:/g) || []).length;
  if (colonCount === 1 && !value.includes("]")) {
    value = value.split(":")[0];
  }

  return value.replace(/^\[|\]$/g, "");
}

function uniqueNormalizedList(list) {
  const out = [];
  const seen = new Set();

  for (const item of Array.isArray(list) ? list : []) {
    const rule = normalizeRule(item);
    if (!rule || seen.has(rule)) continue;
    seen.add(rule);
    out.push(rule);
  }

  return out;
}

function listHas(list, rule) {
  const target = normalizeRule(rule);
  return list.some((item) => normalizeRule(item) === target);
}

function removeFromList(list, rule) {
  const target = normalizeRule(rule);
  return list.filter((item) => normalizeRule(item) !== target);
}

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function selectedDurationFromUI() {
  if (els.durationSelect.value === "custom") {
    const minutes = Number(els.customMinutes.value);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;
    return Math.max(60000, Math.floor(minutes * 60000));
  }

  const ms = Number(els.durationSelect.value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.max(60000, Math.floor(ms));
}

function applyDurationToUI(ms) {
  const preset = PRESET_DURATIONS.includes(ms) ? String(ms) : "custom";
  els.durationSelect.value = preset;

  if (preset === "custom") {
    els.customWrap.classList.remove("hidden");
    els.customMinutes.value = String(Math.max(1, Math.round(ms / 60000)));
  } else {
    els.customWrap.classList.add("hidden");
    els.customMinutes.value = "";
  }
}

function setLockedUI(locked) {
  els.modeSelect.disabled = locked;
  els.allowInput.disabled = locked;
  els.blockInput.disabled = locked;
  els.allowAddBtn.disabled = locked;
  els.blockAddBtn.disabled = locked;
  els.durationSelect.disabled = locked;
  els.customMinutes.disabled = locked;
  els.startBtn.disabled = locked;
  els.startBtn.textContent = locked ? "Lock active" : "Start lock";
}

function renderList(container, list, listName) {
  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "tiny";
    empty.textContent = "No entries yet.";
    container.appendChild(empty);
    return;
  }

  for (const item of list) {
    const row = document.createElement("div");
    row.className = "item";

    const label = document.createElement("span");
    label.textContent = item;

    const del = document.createElement("button");
    del.textContent = "Remove";
    del.disabled = state.locked;
    del.addEventListener("click", async () => {
      if (state.locked) return;
      if (listName === "allowList") {
        state.allowList = removeFromList(state.allowList, item);
      } else {
        state.blockList = removeFromList(state.blockList, item);
      }
      await syncState();
    });

    row.appendChild(label);
    row.appendChild(del);
    container.appendChild(row);
  }
}

function render() {
  els.statusText.textContent = state.locked ? "Locked" : "Unlocked";
  els.timerText.textContent = state.locked
    ? formatMs(state.remainingMs)
    : "00:00:00";

  els.modeSelect.value = state.mode;
  applyDurationToUI(state.selectedDurationMs);
  setLockedUI(state.locked);

  renderList(els.allowList, state.allowList, "allowList");
  renderList(els.blockList, state.blockList, "blockList");
}

async function fetchState() {
  const fresh = await browser.runtime.sendMessage({ type: "GET_STATE" });
  if (!fresh) return;
  Object.assign(state, fresh);
  render();
}

async function syncState() {
  const response = await browser.runtime.sendMessage({
    type: "UPDATE_SETTINGS",
    payload: {
      mode: state.mode,
      allowList: state.allowList,
      blockList: state.blockList,
      selectedDurationMs: state.selectedDurationMs
    }
  });

  if (!response || !response.ok) {
    await fetchState();
    return;
  }

  Object.assign(state, response.state);
  render();
}

function showMoveModal(text, onConfirm) {
  pendingMove = onConfirm;
  els.moveText.textContent = text;
  els.moveModal.classList.remove("hidden");
}

function hideMoveModal() {
  pendingMove = null;
  els.moveModal.classList.add("hidden");
}

async function addRuleToList(targetListName, inputEl) {
  if (state.locked) return;

  const normalized = normalizeRule(inputEl.value);
  if (!normalized) return;

  const targetList = targetListName === "allowList" ? state.allowList : state.blockList;
  const otherListName = targetListName === "allowList" ? "blockList" : "allowList";
  const otherList = otherListName === "allowList" ? state.allowList : state.blockList;

  if (listHas(targetList, normalized)) {
    inputEl.value = "";
    return;
  }

  if (listHas(otherList, normalized)) {
    const fromName = otherListName === "allowList" ? "Allow list" : "Block list";
    const toName = targetListName === "allowList" ? "Allow list" : "Block list";

    showMoveModal(
      `${normalized} already exists in the ${fromName}. Move it to the ${toName}?`,
      async () => {
        if (targetListName === "allowList") {
          state.blockList = removeFromList(state.blockList, normalized);
          state.allowList = uniqueNormalizedList([...state.allowList, normalized]);
        } else {
          state.allowList = removeFromList(state.allowList, normalized);
          state.blockList = uniqueNormalizedList([...state.blockList, normalized]);
        }

        inputEl.value = "";
        hideMoveModal();
        await syncState();
      }
    );

    return;
  }

  if (targetListName === "allowList") {
    state.allowList = uniqueNormalizedList([...state.allowList, normalized]);
  } else {
    state.blockList = uniqueNormalizedList([...state.blockList, normalized]);
  }

  inputEl.value = "";
  await syncState();
}

els.modeSelect.addEventListener("change", async () => {
  if (state.locked) return;
  state.mode = els.modeSelect.value === "blocklist" ? "blocklist" : "allowlist";
  await syncState();
});

els.durationSelect.addEventListener("change", async () => {
  if (state.locked) return;

  if (els.durationSelect.value === "custom") {
    els.customWrap.classList.remove("hidden");
  } else {
    els.customWrap.classList.add("hidden");
  }

  const ms = selectedDurationFromUI();
  if (ms !== null) {
    state.selectedDurationMs = ms;
    await syncState();
  }
});

els.customMinutes.addEventListener("change", async () => {
  if (state.locked || els.durationSelect.value !== "custom") return;
  const ms = selectedDurationFromUI();
  if (ms !== null) {
    state.selectedDurationMs = ms;
    await syncState();
  }
});

els.customMinutes.addEventListener("input", async () => {
  if (state.locked || els.durationSelect.value !== "custom") return;
  const ms = selectedDurationFromUI();
  if (ms !== null) {
    state.selectedDurationMs = ms;
  }
});

els.allowAddBtn.addEventListener("click", async () => {
  await addRuleToList("allowList", els.allowInput);
});

els.blockAddBtn.addEventListener("click", async () => {
  await addRuleToList("blockList", els.blockInput);
});

els.allowInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await addRuleToList("allowList", els.allowInput);
  }
});

els.blockInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    await addRuleToList("blockList", els.blockInput);
  }
});

els.startBtn.addEventListener("click", async () => {
  if (state.locked) return;

  const durationMs = selectedDurationFromUI();
  if (durationMs === null) {
    els.statusText.textContent = "Enter a valid custom duration first.";
    return;
  }

  const response = await browser.runtime.sendMessage({
    type: "START_LOCK",
    durationMs
  });

  if (!response || !response.ok) {
    await fetchState();
    return;
  }

  Object.assign(state, response.state);
  render();
});

els.moveCancelBtn.addEventListener("click", hideMoveModal);

els.moveConfirmBtn.addEventListener("click", async () => {
  if (typeof pendingMove === "function") {
    await pendingMove();
  } else {
    hideMoveModal();
  }
});

els.moveModal.addEventListener("click", (e) => {
  if (e.target === els.moveModal) hideMoveModal();
});

fetchState();
setInterval(fetchState, 1000);
