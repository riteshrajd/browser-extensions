// 1. THE HEIST: Intercept the audio player
window.__grokActiveAudio = null;
const originalPlay = HTMLAudioElement.prototype.play;

HTMLAudioElement.prototype.play = function() {
    window.__grokActiveAudio = this; 
    
    // Auto-update the input box to show the current speed when a new audio starts
    const speedInput = document.getElementById('grok-speed-input');
    if (speedInput) speedInput.value = this.playbackRate;
    
    return originalPlay.apply(this, arguments);
};

// 2. THE UI BUILDER (Buttons)
function createButton(text, id, onClick) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.textContent = text;
    btn.style.color = '#a1a1aa';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.padding = '8px 6px'; // Slightly tighter padding to fit more buttons
    btn.style.fontSize = '12px';
    btn.style.fontWeight = '600';
    btn.style.cursor = 'pointer';
    btn.style.borderRadius = '8px';
    
    btn.addEventListener('mouseenter', () => btn.style.color = '#fff');
    btn.addEventListener('mouseleave', () => btn.style.color = '#a1a1aa');
    
    btn.addEventListener('click', (e) => {
        e.preventDefault(); 
        e.stopPropagation();
        onClick();
    });
    return btn;
}

// 2.5 THE UI BUILDER (Text Input for Speed)
function createSpeedInput(id, onChange) {
    const input = document.createElement('input');
    input.id = id;
    input.type = 'number';
    input.step = '0.05'; // Allows you to click the up/down arrows in tiny increments
    input.min = '0.1';
    input.max = '5.0';
    input.placeholder = '1x';
    input.title = 'Type speed and hit Enter'; // Tooltip on hover

    // Styling it to look like Grok's native UI elements
    input.style.width = '55px';
    input.style.color = '#a1a1aa';
    input.style.background = 'transparent';
    input.style.border = '1px solid #3f3f46';
    input.style.padding = '4px';
    input.style.fontSize = '12px';
    input.style.fontWeight = '600';
    input.style.borderRadius = '6px';
    input.style.margin = '0 4px';
    input.style.textAlign = 'center';
    input.style.outline = 'none'; // Removes ugly default focus ring

    input.addEventListener('mouseenter', () => input.style.color = '#fff');
    input.addEventListener('mouseleave', () => input.style.color = '#a1a1aa');

    // CRITICAL: Stop React from stealing your keyboard inputs or clicks while typing
    ['click', 'keydown', 'keyup', 'keypress'].forEach(evt => {
        input.addEventListener(evt, (e) => e.stopPropagation());
    });

    // Trigger the speed change when you click away or hit Enter
    input.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && onChange) {
            onChange(val);
        }
    });

    return input;
}

// 3. THE CONTROLLER
function injectControls() {
    const rateButton = document.querySelector('button[aria-label="Playback rate"]');
    // If the 15s rewind button already exists, we've already injected our UI, so stop.
    if (!rateButton || document.getElementById('grok-btn-rewind-15')) return;

    // Create all the UI elements
    const btnRewind15 = createButton('-15s', 'grok-btn-rewind-15', () => {
        if (window.__grokActiveAudio) window.__grokActiveAudio.currentTime = Math.max(0, window.__grokActiveAudio.currentTime - 15);
    });

    const btnRewind5 = createButton('-5s', 'grok-btn-rewind-5', () => {
        if (window.__grokActiveAudio) window.__grokActiveAudio.currentTime = Math.max(0, window.__grokActiveAudio.currentTime - 5);
    });

    const btnForward5 = createButton('+5s', 'grok-btn-forward-5', () => {
        if (window.__grokActiveAudio) window.__grokActiveAudio.currentTime += 5;
    });

    const btnForward15 = createButton('+15s', 'grok-btn-forward-15', () => {
        if (window.__grokActiveAudio) window.__grokActiveAudio.currentTime += 15;
    });

    const speedInput = createSpeedInput('grok-speed-input', (newSpeed) => {
        if (window.__grokActiveAudio) window.__grokActiveAudio.playbackRate = newSpeed;
    });

    // Insert them in reverse order so they show up left-to-right correctly
    // Final Order: [Grok's Rate Button] [Speed Input] [-15s] [-5s] [+5s] [+15s]
    rateButton.insertAdjacentElement('afterend', btnForward15);
    rateButton.insertAdjacentElement('afterend', btnForward5);
    rateButton.insertAdjacentElement('afterend', btnRewind5);
    rateButton.insertAdjacentElement('afterend', btnRewind15);
    rateButton.insertAdjacentElement('afterend', speedInput);
}

// Watch the screen for the audio player to appear
const observer = new MutationObserver(() => injectControls());
observer.observe(document.body, { childList: true, subtree: true });