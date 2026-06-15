const timerEl = document.getElementById("timer");
const siteEl = document.getElementById("site");
const imgEl = document.getElementById("blockedImage");

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

async function refresh() {
  const state = await browser.runtime.sendMessage({ type: "GET_STATE" });
  if (!state) return;

  timerEl.textContent = state.locked ? formatMs(state.remainingMs) : "00:00:00";

  const blockedUrl = new URLSearchParams(location.search).get("u") || "";
  if (blockedUrl) {
    try {
      siteEl.textContent = new URL(blockedUrl).hostname;
    } catch {
      siteEl.textContent = blockedUrl;
    }
  }

  imgEl.src = browser.runtime.getURL("assets/images/blocked.png");
}

refresh();
setInterval(refresh, 1000);
