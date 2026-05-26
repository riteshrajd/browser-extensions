const toggle = document.getElementById('toggleSwitch');

// Load current state (defaults to true)
browser.storage.local.get(['extensionEnabled']).then(result => {
    toggle.checked = result.extensionEnabled !== false;

    // Listen for the toggle switch being clicked
    toggle.addEventListener('change', (e) => {
        browser.storage.local.set({ extensionEnabled: e.target.checked });
    });
});