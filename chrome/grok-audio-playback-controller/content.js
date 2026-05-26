// This sneaks our inject.js file directly into Grok's main environment
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
(document.head || document.documentElement).appendChild(script);

// Clean up the script tag after it loads so we don't leave a mess
script.onload = function() {
    script.remove();
};