chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-action') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => inject(tabs[0]));
  }
});

chrome.action.onClicked.addListener((tab) => {
  inject(tab);
});

function inject(tab) {
  if (tab && tab.url && tab.url.includes("gemini.google.com")) {
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
}