const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.action.onClicked.addListener((tab) => {
  if (tab.id) {
    browserAPI.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
  }
});