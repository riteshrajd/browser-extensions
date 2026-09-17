const browserAPI = globalThis.browser || globalThis.chrome;
const toggle = document.getElementById('toggleSwitch');

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

// Load current state (defaults to true)
getStorage(['extensionEnabled']).then(result => {
    toggle.checked = result?.extensionEnabled !== false;

    // Listen for the toggle switch being clicked
    toggle.addEventListener('change', (e) => {
        browserAPI?.storage?.local?.set({ extensionEnabled: e.target.checked });
    });
});