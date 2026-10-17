// Universal cross-browser extension API
const ext = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

const DEFAULTS = {
  // Aspect Ratio Crop
  cropEnabled: false,
  cropRatio: 1.78,
  cropPreset: 'native',
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
  cropStatusBadge: document.getElementById('cropStatusBadge'),
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
  resetColorsBtn: document.getElementById('resetColorsBtn'),
  fsBtn: document.getElementById('fsBtn'),
  flipHBtn: document.getElementById('flipHBtn'),
  flipVBtn: document.getElementById('flipVBtn')
};

let currentCropEnabled = false;
let currentCropRatio = 1.78;
let currentCropPreset = 'native';
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
  els.cropRatioSliderVal.textContent = parseFloat(state.cropRatio).toFixed(2);
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

  // Crop status badge
  if (!state.cropEnabled) {
    els.cropStatusBadge.textContent = 'Native (Off)';
    els.cropStatusBadge.style.color = '#7982a9';
  } else {
    els.cropStatusBadge.textContent = `${parseFloat(state.cropRatio).toFixed(2)} Active`;
    els.cropStatusBadge.style.color = '#7aa2f7';
  }

  els.customArBox.style.display = state.cropPreset === 'custom' ? 'flex' : 'none';

  // Stretch preset buttons
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

  // Flip buttons
  if (els.flipHBtn) {
    if (state.flipH) els.flipHBtn.classList.add('btn-active');
    else els.flipHBtn.classList.remove('btn-active');
  }
  if (els.flipVBtn) {
    if (state.flipV) els.flipVBtn.classList.add('btn-active');
    else els.flipVBtn.classList.remove('btn-active');
  }

  // Active FX cards
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
    cropEnabled: currentCropEnabled,
    cropRatio: parseFloat(currentCropRatio) || 1.78,
    cropPreset: currentCropPreset,
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
  currentCropEnabled = Boolean(state.cropEnabled);
  currentCropRatio = parseFloat(state.cropRatio) || 1.78;
  currentCropPreset = state.cropPreset || 'native';
  currentFlipH = Boolean(state.flipH);
  currentFlipV = Boolean(state.flipV);
  currentActiveFx = state.activeFx || 'none';

  if (els.aspectRatio) els.aspectRatio.value = currentCropPreset;
  if (els.cropRatioSlider) els.cropRatioSlider.value = currentCropRatio;

  [
    'customW', 'customH', 'stretchX', 'stretchY', 'rotate', 'zoom',
    'brightness', 'contrast', 'saturate', 'hue', 'grayscale', 'sepia', 'invert', 'blur'
  ].forEach(key => {
    if (els[key] && state[key] !== undefined) {
      els[key].value = state[key];
    }
  });

  updateLabels(state);
}

// Throttled 60fps message dispatcher & debounced storage writer
let broadcastRaf = null;
let pendingState = null;
let saveStorageTimeout = null;

function broadcast(state) {
  pendingState = state;

  // Debounce storage writes to avoid disk I/O / quota locks
  clearTimeout(saveStorageTimeout);
  saveStorageTimeout = setTimeout(() => {
    try {
      if (ext.storage?.local?.set) {
        ext.storage.local.set({ vfxState: state });
      }
    } catch (e) {}
  }, 120);

  // Send message at most once per screen refresh frame
  if (!broadcastRaf) {
    broadcastRaf = requestAnimationFrame(async () => {
      broadcastRaf = null;
      const s = pendingState;
      if (!s) return;

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

      try {
        if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
          await browser.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state: s });
        } else {
          chrome.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state: s }, () => {});
        }
      } catch (err) {
        try {
          const scriptingApi = (typeof browser !== 'undefined' && browser.scripting) ? browser.scripting : chrome.scripting;
          if (scriptingApi?.executeScript) {
            await scriptingApi.executeScript({
              target: { tabId: activeTab.id, allFrames: true },
              files: ['content.js']
            });
            if (typeof browser !== 'undefined' && browser.tabs?.sendMessage) {
              await browser.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state: s });
            } else {
              chrome.tabs.sendMessage(activeTab.id, { type: 'APPLY_VFX', state: s }, () => {});
            }
          }
        } catch (e) {}
      }
    });
  }
}

// Aspect Ratio Preset Dropdown
els.aspectRatio.addEventListener('change', () => {
  const val = els.aspectRatio.value;
  currentCropPreset = val;

  if (val === 'native') {
    currentCropEnabled = false;
  } else {
    currentCropEnabled = true;
    if (val === '16:9') currentCropRatio = 16 / 9;
    else if (val === '21:9') currentCropRatio = 21 / 9;
    else if (val === '2.39:1') currentCropRatio = 2.39;
    else if (val === '4:3') currentCropRatio = 4 / 3;
    else if (val === '1:1') currentCropRatio = 1.0;
    else if (val === '9:16') currentCropRatio = 9 / 16;
    else if (val === 'custom') {
      const w = parseFloat(els.customW.value) || 16;
      const h = parseFloat(els.customH.value) || 9;
      currentCropRatio = w / h;
    }
    els.cropRatioSlider.value = currentCropRatio;
  }

  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Any-Amount Crop Ratio Slider
els.cropRatioSlider.addEventListener('input', () => {
  currentCropEnabled = true;
  currentCropRatio = parseFloat(els.cropRatioSlider.value) || 1.78;
  currentCropPreset = 'custom';
  els.aspectRatio.value = 'custom';

  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

// Custom W/H Inputs
['customW', 'customH'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    currentCropEnabled = true;
    currentCropPreset = 'custom';
    els.aspectRatio.value = 'custom';
    const w = parseFloat(els.customW.value) || 16;
    const h = parseFloat(els.customH.value) || 9;
    currentCropRatio = w / h;
    els.cropRatioSlider.value = currentCropRatio;

    const state = getStateFromUI();
    updateLabels(state);
    broadcast(state);
  });
});

// Generic Input Listeners for all Sliders
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

// Stretch Presets
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

// Reset Colors Only
els.resetColorsBtn?.addEventListener('click', () => {
  els.brightness.value = 100;
  els.contrast.value = 100;
  els.saturate.value = 100;
  els.hue.value = 0;
  els.grayscale.value = 0;
  els.sepia.value = 0;
  els.invert.value = 0;
  els.blur.value = 0;
  const state = getStateFromUI();
  updateLabels(state);
  broadcast(state);
});

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