const STORAGE_KEYS = [
  "mode",
  "allowList",
  "blockList",
  "lockUntil",
  "selectedDurationMs"
];

const DEFAULT_ALLOW_LIST = [
  "chatgpt.com",
  "gemini.google.com",
  "grok.com",
  "codeforces.com",
  "chat.deepseek.com",
  "localhost",
  "127.0.0.1",
  "::1"
];

const DEFAULT_BLOCK_LIST = [];

const DEFAULT_STATE = {
  mode: "allowlist",
  allowList: DEFAULT_ALLOW_LIST,
  blockList: DEFAULT_BLOCK_LIST,
  lockUntil: 0,
  selectedDurationMs: 2 * 60 * 60 * 1000
};

const BLOCK_PAGE_URL = browser.runtime.getURL("blocked.html");

let state = { ...DEFAULT_STATE };

function sanitizeMode(mode) {
  return mode === "blocklist" ? "blocklist" : "allowlist";
}

function sanitizeDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_STATE.selectedDurationMs;
  return Math.max(60_000, Math.floor(n));
}

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

function normalizeState(raw = {}) {
  return {
    mode: sanitizeMode(raw.mode),
    allowList: uniqueNormalizedList(raw.allowList ?? DEFAULT_ALLOW_LIST),
    blockList: uniqueNormalizedList(raw.blockList ?? DEFAULT_BLOCK_LIST),
    lockUntil: Math.max(0, Math.floor(Number(raw.lockUntil) || 0)),
    selectedDurationMs: sanitizeDuration(
      raw.selectedDurationMs ?? DEFAULT_STATE.selectedDurationMs
    )
  };
}

function pickStorageState() {
  return {
    mode: state.mode,
    allowList: state.allowList,
    blockList: state.blockList,
    lockUntil: state.lockUntil,
    selectedDurationMs: state.selectedDurationMs
  };
}

function isLockedNow() {
  return state.lockUntil > Date.now();
}

function clearExpiredLockIfNeeded() {
  if (state.lockUntil && Date.now() >= state.lockUntil) {
    state.lockUntil = 0;
    browser.storage.local.set({ lockUntil: 0 }).catch(() => {});
  }
}

function publicState() {
  clearExpiredLockIfNeeded();
  return {
    ...pickStorageState(),
    locked: isLockedNow(),
    remainingMs: Math.max(0, state.lockUntil - Date.now())
  };
}

async function loadState() {
  const stored = await browser.storage.local.get(STORAGE_KEYS);
  state = normalizeState(stored);
  await browser.storage.local.set(pickStorageState());
  clearExpiredLockIfNeeded();
}

function hostMatchesRule(host, rule) {
  const h = normalizeRule(host);
  const r = normalizeRule(rule);
  if (!h || !r) return false;

  if (r === "::1") return h === "::1";
  return h === r || h.endsWith(`.${r}`);
}

function isAllowedUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return true;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return true;
  }

  const host = normalizeRule(url.hostname);
  if (!host) return true;

  if (state.mode === "allowlist") {
    return state.allowList.some((rule) => hostMatchesRule(host, rule));
  }

  return !state.blockList.some((rule) => hostMatchesRule(host, rule));
}

async function updateSettings(payload = {}) {
  clearExpiredLockIfNeeded();

  if (isLockedNow()) {
    return { ok: false, error: "locked", state: publicState() };
  }

  const next = { ...state };

  if (Object.prototype.hasOwnProperty.call(payload, "mode")) {
    next.mode = sanitizeMode(payload.mode);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "allowList")) {
    next.allowList = uniqueNormalizedList(payload.allowList);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "blockList")) {
    next.blockList = uniqueNormalizedList(payload.blockList);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "selectedDurationMs")) {
    next.selectedDurationMs = sanitizeDuration(payload.selectedDurationMs);
  }

  state = normalizeState(next);
  await browser.storage.local.set(pickStorageState());

  return { ok: true, state: publicState() };
}

async function startLock(durationMs) {
  clearExpiredLockIfNeeded();

  if (isLockedNow()) {
    return { ok: false, error: "locked", state: publicState() };
  }

  const chosen = sanitizeDuration(
    durationMs ?? state.selectedDurationMs ?? DEFAULT_STATE.selectedDurationMs
  );

  state.selectedDurationMs = chosen;
  state.lockUntil = Date.now() + chosen;

  await browser.storage.local.set(pickStorageState());

  return { ok: true, state: publicState() };
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    clearExpiredLockIfNeeded();

    if (!isLockedNow()) {
      return {};
    }

    if (isAllowedUrl(details.url)) {
      return {};
    }

    return {
      redirectUrl: `${BLOCK_PAGE_URL}?u=${encodeURIComponent(details.url)}`
    };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

browser.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") return undefined;

  if (message.type === "GET_STATE") {
    return Promise.resolve(publicState());
  }

  if (message.type === "START_LOCK") {
    return startLock(message.durationMs);
  }

  if (message.type === "UPDATE_SETTINGS") {
    return updateSettings(message.payload);
  }

  return undefined;
});

browser.commands.onCommand.addListener((command) => {
  if (command === "start-lock") {
    startLock(state.selectedDurationMs);
  }
});

browser.runtime.onInstalled.addListener(loadState);
browser.runtime.onStartup.addListener(loadState);

loadState();
setInterval(clearExpiredLockIfNeeded, 30000);