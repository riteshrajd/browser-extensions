const browserAPI = globalThis.browser || globalThis.chrome;

let isEnabled = true;

function filterTags() {
  const problemPageTags = document.querySelectorAll(".tag-box");
  problemPageTags.forEach((tag) => {
    const text = tag.textContent.trim();
    if (!text.startsWith("*")) {
      tag.style.display = isEnabled ? "none" : "";
    }
  });

  const listTags = document.querySelectorAll("a.notice");
  listTags.forEach((a) => {
    if (a.href && a.href.includes("tags")) {
      const container = a.parentElement;
      if (container && container.tagName === "DIV") {
        container.style.display = isEnabled ? "none" : "";
      }
    }
  });
}

function getStorage(keys) {
  if (typeof browserAPI?.storage?.local?.get === "function") {
    const res = browserAPI.storage.local.get(keys);
    if (res && typeof res.then === "function") {
      return res;
    }
    return new Promise((resolve) => {
      browserAPI.storage.local.get(keys, resolve);
    });
  }
  return Promise.resolve({});
}

// 1. Check storage on initial load
getStorage(["extensionEnabled"]).then((result) => {
  isEnabled = result?.extensionEnabled !== false; // defaults to true
  filterTags();
});

// 2. Watch for dynamic DOM changes (debounced)
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterTags, 150);
});
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

// 3. Listen for toggle button clicks from the popup
if (browserAPI?.storage?.onChanged?.addListener) {
  browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.extensionEnabled) {
      isEnabled = changes.extensionEnabled.newValue;
      filterTags();
    }
  });
}

