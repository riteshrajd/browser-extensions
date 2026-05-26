chrome.action.onClicked.addListener((tab) => {
  if (tab.url.includes("gemini.google.com")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const targets = document.querySelectorAll('input-container, .side-nav-menu-button.with-pill-ui, header');
        targets.forEach(el => {
          if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
        });
      }
    });
  }
});