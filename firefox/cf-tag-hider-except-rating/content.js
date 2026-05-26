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

// 1. Check storage on initial load
browser.storage.local.get(["extensionEnabled"]).then((result) => {
  isEnabled = result.extensionEnabled !== false; // defaults to true
  filterTags();
});

// 2. Watch for dynamic DOM changes (debounced)
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(filterTags, 150);
});
observer.observe(document.body, { childList: true, subtree: true });

// 3. Listen for toggle button clicks from the popup
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.extensionEnabled) {
    isEnabled = changes.extensionEnabled.newValue;
    filterTags();
  }
});
