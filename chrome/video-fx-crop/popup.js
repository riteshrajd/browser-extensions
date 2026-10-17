// Universal cross-browser extension API
const ext = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const DEFAULTS = {
  // Aspect Ratio Crop
  aspectRatio: 'native',
  cropRatioSlider: 1.78,
  customW: 16,
  customH: 9,

  // Real Stretch & Squash
  stretchX: 100,
  stretchY: 100,

  // Orientation & Rotation
  rotate: 0,
  flipH: false,
  flipV: false,

  // Extra Zoom
  zoom: 100,

  // Live Video FX
  activeFx: 'none',

  // Color Grading
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  grayscale: 0,
  sepia: 0,
  invert: 0,
  blur: 0
};

// UI Elements Map
const els = {
  aspectRatio: document.getElementById('aspectRatio'),
  customArBox: document.getElementById('customArBox'),
  customW: document.getElementById('customW'),
  customH: document.getElementById('customH'),
  cropRatioSlider: document.getElementById('cropRatioSlider'),
  cropRatioSliderVal: document.getElementById('cropRatioSliderVal'),
  stretchX: document.getElementById('stretchX'),
  stretchXVal: document.getElementById('stretchXVal'),
  stretchY: document.getElementById('stretchY'),
  stretchYVal: document.getElementById('stretchYVal'),
  rotate: document.getElementById('rotate'),
  rotateVal: document.getElementById('rotateVal'),
  zoom: document.getElementById('zoom'),
  zoomVal: document.getElementById('zoomVal'),
  brightness: document.getElementById('brightness'),
  brightnessVal: document.getElementById('brightnessVal'),
  contrast: document.getElementById('contrast'),
  contrastVal: document.getElementById('contrastVal'),
  saturate: document.getElementById('saturate'),
  saturateVal: document.getElementById('saturateVal'),
  hue: document.getElementById('hue'),
  hueVal: document.getElementById('hueVal'),
  grayscale: document.getElementById('grayscale'),
  grayscaleVal: document.getElementById('grayscaleVal'),
  sepia: document.getElementById('sepia'),
  sepiaVal: document.getElementById('sepiaVal'),
  invert: document.getElementById('invert'),
  invertVal: document.getElementById('invertVal'),
  blur: document.getElementById('blur'),
  blurVal: document.getElementById('blurVal'),
  resetBtn: document.getElementById('resetBtn'),
  quickReset: document.getElementById('quickReset'),
  fsBtn: document.getElementById('fsBtn'),
  flipHBtn: document.getElementById('flipHBtn'),
  flipVBtn: document.getElementById('flipVBtn')
};

let currentFlipH = false;
let currentFlipV = false;
let currentActiveFx = 'none';

// Tab Switching
document.querySelectorAll('.nav-tab').forEach(tabBtn => {
  tabBtn.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tabBtn.classList.add('active');
    const targetId = tabBtn.getAttribute('data-tab');
    const targetContent = document.getElementById(targetId);
    if (targetContent) targetContent.classList.add('active');
  });
});

// FX Card Selection
document.querySelectorAll('.fx-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.fx-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    currentActiveFx = card.getAttribute('data-fx') || 'none';
    const state = getStateFromUI();
    broadcast(state);
  });
});

function updateLabels(state) {
  els.cropRatioSliderVal.textContent = parseFloat(state.cropRatioSlider).toFixed(2);
  els.stretchXVal.textContent = `${state.stretchX}%`;
  els.stretchYVal.textContent = `${state.stretchY}%`;
  els.rotateVal.textContent = `${state.rotate}°`;
  els.zoomVal.textContent = `${state.zoom}%`;
  els.brightnessVal.textContent = `${state.brightness}%`;
  els.contrastVal.textContent = `${state.contrast}%`;
  els.saturateVal.textContent = `${state.saturate}%`;
  els.hueVal.textContent = `${state.hue}deg`;
  els.grayscaleVal.textContent = `${state.grayscale}%`;
  els.sepiaVal.textContent = `${state.sepia}%`;
  els.invertVal.textContent = `${state.invert}%`;
  els.blurVal.textContent = `${state.blur}px`;

  els.customArBox.style.display = state.aspectRatio === 'custom' ? 'flex' : 'none';

  // Update Stretch preset button highlights
  const stretchPresetButtons = [
    { id: 'btnSquash75', x: 75, y: 100 },
    { id: 'btnStretch100', x: 100, y: 100 },
    { id: 'btnStretch133', x: 133, y: 100 },
    { id: 'btnStretch178', x: 178, y: 100 }
  ];
  stretchPresetButtons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      if (state.stretchX === btn.x && state.stretchY === btn.y) {
        el.classList.add('btn-active');
      } else {
        el.classList.remove('btn-active');
      }
    }
  });

  // Update Flip button states
  if (els.flipHBtn) {
    if (state.flipH) els.flipHBtn.classList.add('btn-active');
    else els.flipHBtn.classList.remove('btn-active');
  }
  if (els.flipVBtn) {
    if (state.flipV) els.flipVBtn.classList.add('btn-active');
    else els.flipVBtn.classList.remove('btn-active');
  }

  // Update Active FX cards
  document.querySelectorAll('.fx-card').forEach(card => {
    if (card.getAttribute('data-fx') === state.activeFx) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function getStateFromUI() {
  return {
    aspectRatio: els.aspectRatio.value,
    cropRatioSlider: parseFloat(els.cropRatioSlider.value) || 1.78,
    customW: parseFloat(els.customW.value) || 16,
    customH: parseFloat(els.customH.value) || 9,
    stretchX: Number(els.stretchX.value),
    stretchY: Number(els.stretchY.value),
    rotate: Number(els.rotate.value),
    flipH: currentFlipH,
    flipV: currentFlipV,
    zoom: Number(els.zoom.value),
    activeFx: currentActiveFx,
    brightness: Number(els.brightness.value),
    contrast: Number(els.contrast.value),
    saturate: Number(els.saturate.value),
    hue: Number(els.hue.value),
    grayscale: Number(els.grayscale.value),
    sepia: Number(els.sepia.value),
    invert: Number(els.invert.value),
    blur: Number(els.blur.value)
  };
}

function applyStateToUI(state) {
  currentFlipH = Boolean(state.flipH);
  currentFlipV = Boolean(state.flipV);
  currentActiveFx = state.activeFx || 'none';

  Object.keys(DEFAULTS).forEach(key => {
    if (els[key] && state[key] !== undefined) {
      els[key].value = state[key];
    }
  });

  updateLabels(state);
}

// Cross-browser storage and message dispatch
async function broadcast(state) {
  // 1. Save to local storage
  try {
    if (ext.storage?.local?.set) {
      ext.storage.local.set({ vfxState: state });
    }
  } catch (e) {}

  // 2. Query active tab
  let activeTab = null;
  try {
    if (typeof browser !== 'undefined' && browser.tabs?.query) {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs && tabs[0];
    } else if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      activeTab = await new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => resolve(tabs && tabs[0]));
      });
    }
  } catch (e) {}

  if (!activeTab?.id) return;

  // 3. Send message to tab (inject content.js if not yet loaded)
  try {
    if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
      await browser.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state });
    } else {
      await new Promise(resolve => {
        chrome.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state }, resolve);
      });
    }
  } catch (err) {
    // Inject content.js if script is not present
    try {
      const scriptingApi = (typeof browser !== 'undefined' && browser.scripting) ? browser.scripting : chrome.scripting;
      if (scriptingApi?.executeScript) {
        await scriptingApi.executeScript({
          target: { tabId: activeTab.id, allFrames: true },
          files: ['content.js']
        });
        if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
          await browser.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state });
        } else {
          chrome.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state }, () => {});
        }
      }
    } catch (e) {}
  }
}

// Aspect Ratio preset dropdown changed
els.aspectRatio.addEventListener('change', () => {
  const val = els.aspectRatio.value;
  if (val === '16:9') els.cropRatioSlider.value = 1.78;
  else if (val === '21:9') els.cropRatioSlider.value = 2.33;
  else if (val === '2.39:1') els.cropRatioSlider.value = 2.39;
  else if (val === '4:3') els.cropRatioSlider.value = 1.33;
  else if (val === '1:1') els.cropRatioSlider.value = 1.0;
  else if (val === '9:16') els.cropRatioSlider.value = 0.56;

  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Any-Amount Crop Ratio Slider changed
els.cropRatioSlider.addEventListener('input', () => {
  els.aspectRatio.value = 'slider';
  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Custom W/H Inputs changed
['customW', 'customH'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    els.aspectRatio.value = 'custom';
    const state = getStateFromUI();
    updateLabels(state);
    broadcast(state);
  });
});

// Generic input listeners for remaining sliders
[
  'stretchX', 'stretchY', 'rotate', 'zoom',
  'brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'invert', 'blur'
].forEach(id => {
  const el = els[id];
  if (el) {
    el.addEventListener('input', () => {
      const state = getStateFromUI();
      updateLabels(state);
      broadcast(state);
    });
  }
});

// Stretch / Squash Quick Preset Buttons
const stretchPresets = [
  { id: 'btnSquash75', x: 75, y: 100 },
  { id: 'btnStretch100', x: 100, y: 100 },
  { id: 'btnStretch133', x: 133, y: 100 },
  { id: 'btnStretch178', x: 178, y: 100 }
];
stretchPresets.forEach(preset => {
  document.getElementById(preset.id)?.addEventListener('click', () => {
    els.stretchX.value = preset.x;
    els.stretchY.value = preset.y;
    const state = getStateFromUI();
    updateLabels(state);
    broadcast(state);
  });
});

// Rotation Buttons (0-360 in 90 deg steps)
const rotButtons = [
  { id: 'rot0Btn', deg: 0 },
  { id: 'rot90Btn', deg: 90 },
  { id: 'rot180Btn', deg: 180 },
  { id: 'rot270Btn', deg: 270 }
];
rotButtons.forEach(btn => {
  document.getElementById(btn.id)?.addEventListener('click', () => {
    els.rotate.value = btn.deg;
    const state = getStateFromUI();
    updateLabels(state);
    broadcast(state);
  });
});

// Rotate +90 Clockwise Button
document.getElementById('rotNextBtn')?.addEventListener('click', () => {
  const cur = Number(els.rotate.value) || 0;
  els.rotate.value = (cur + 90) % 360;
  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Flip Horizontal
els.flipHBtn?.addEventListener('click', () => {
  currentFlipH = !currentFlipH;
  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Flip Vertical
els.flipVBtn?.addEventListener('click', () => {
  currentFlipV = !currentFlipV;
  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Reset Handlers
function resetAll() {
  applyStateToUI(DEFAULTS);
  broadcast(DEFAULTS);
}
els.resetBtn?.addEventListener('click', resetAll);
els.quickReset?.addEventListener('click', resetAll);

// Fullscreen button
els.fsBtn?.addEventListener('click', async () => {
  let activeTab = null;
  try {
    if (typeof browser !== 'undefined' && browser.tabs?.query) {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      activeTab = tabs && tabs[0];
    } else {
      activeTab = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, t => r(t && t[0])));
    }
  } catch (e) {}

  if (!activeTab?.id) return;

  const scriptingApi = (typeof browser !== 'undefined' && browser.scripting) ? browser.scripting : chrome.scripting;
  if (!scriptingApi?.executeScript) return;

  scriptingApi.executeScript({
    target: { tabId: activeTab.id, allFrames: true },
    func: () => {
      const videos = Array.from(document.querySelectorAll('video'));
      if (!videos.length) return;

      const mainVideo = videos.reduce((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        return (rB.width * rB.height) > (rA.width * rA.height) ? b : a;
      });

      if (document.fullscreenElement || document.webkitFullscreenElement) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        return;
      }

      const container = mainVideo.closest(
        '#kt_player, .kt-player, .fp-player, .html5-video-player, .video-js, .plyr, [data-player], .player-container'
      ) || mainVideo;

      const req = container.requestFullscreen || container.webkitRequestFullscreen;
      if (req) {
        req.call(container).catch(() => mainVideo.requestFullscreen?.());
      }
    }
  });
});

// Initialize on popup open
try {
  if (typeof browser !== 'undefined' && browser.storage?.local?.get) {
    browser.storage.local.get(['vfxState']).then(res => {
      const state = { ...DEFAULTS, ...(res?.vfxState || {}) };
      applyStateToUI(state);
      broadcast(state);
    }).catch(() => {
      applyStateToUI(DEFAULTS);
      broadcast(DEFAULTS);
    });
  } else if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
    chrome.storage.local.get(['vfxState'], res => {
      const state = { ...DEFAULTS, ...(res?.vfxState || {}) };
      applyStateToUI(state);
      broadcast(state);
    });
  }
} catch (e) {
  applyStateToUI(DEFAULTS);
}