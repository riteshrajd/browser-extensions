// Universal cross-browser extension API (Firefox & Chrome)
const ext = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let currentState = null;

// Ensure Global Styles are injected only once
function ensureGlobalStyles() {
  if (document.getElementById('vfx-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'vfx-global-styles';
  style.textContent = `
    /* Handheld Camera Shake Keyframes (GPU Accelerated) */
    @keyframes vfxHandheldShake {
      0%   { transform: var(--vfx-base-transform) translate3d(0, 0, 0) rotate(0deg); }
      15%  { transform: var(--vfx-base-transform) translate3d(-3.5px, 2px, 0) rotate(-0.35deg); }
      30%  { transform: var(--vfx-base-transform) translate3d(2.5px, -3px, 0) rotate(0.4deg); }
      45%  { transform: var(--vfx-base-transform) translate3d(-2.5px, -2px, 0) rotate(-0.25deg); }
      60%  { transform: var(--vfx-base-transform) translate3d(3px, 2.5px, 0) rotate(0.4deg); }
      75%  { transform: var(--vfx-base-transform) translate3d(-2px, 3px, 0) rotate(-0.3deg); }
      90%  { transform: var(--vfx-base-transform) translate3d(2px, -2px, 0) rotate(0.2deg); }
      100% { transform: var(--vfx-base-transform) translate3d(0, 0, 0) rotate(0deg); }
    }
    .vfx-handheld-shake {
      animation: vfxHandheldShake 3.4s ease-in-out infinite !important;
      will-change: transform;
    }

    /* Live FX Overlay Root Layer */
    .vfx-overlay-root {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 10 !important;
      overflow: hidden !important;
      display: block !important;
    }

    /* VCR / VHS Effect */
    .vfx-vcr-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: repeating-linear-gradient(
        rgba(0, 0, 0, 0) 0px,
        rgba(0, 0, 0, 0) 2px,
        rgba(0, 0, 0, 0.35) 3px,
        rgba(0, 0, 0, 0.35) 4px
      );
    }
    .vfx-vcr-osd {
      position: absolute;
      top: 18px;
      left: 22px;
      font-family: "Courier New", Courier, monospace;
      font-size: 18px;
      font-weight: 700;
      color: #00ff66;
      text-shadow: 0 0 8px rgba(0, 255, 102, 0.8), 2px 2px 0 #000;
      letter-spacing: 2px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      user-select: none;
    }
    .vfx-vcr-tracking {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 20px;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.12) 0px,
        rgba(255, 255, 255, 0.3) 10px,
        rgba(0, 0, 0, 0.7) 20px
      );
      opacity: 0.7;
      animation: vfxTrackingGlitch 1.2s steps(3) infinite;
    }
    @keyframes vfxTrackingGlitch {
      0% { transform: translateY(0); opacity: 0.6; }
      50% { transform: translateY(-4px); opacity: 0.85; }
      100% { transform: translateY(0); opacity: 0.6; }
    }

    /* Door Hole / Peephole Effect */
    .vfx-doorhole-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center,
        transparent 0%,
        transparent 27%,
        rgba(20, 15, 5, 0.5) 28%,
        rgba(80, 60, 20, 0.9) 29%,
        rgba(220, 180, 65, 0.98) 29.8%,
        rgba(150, 115, 30, 0.98) 30.8%,
        rgba(35, 25, 8, 0.98) 31.8%,
        #050505 33%,
        #000000 34%,
        #000000 100%
      );
    }
    .vfx-doorhole-glass {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 18%, rgba(0, 0, 0, 0.35) 27%, transparent 28%);
    }

    /* Fish Eye Lens Vignette */
    .vfx-fisheye-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center,
        transparent 32%,
        rgba(0, 0, 0, 0.35) 50%,
        rgba(0, 0, 0, 0.8) 65%,
        #000000 80%
      );
    }

    /* CRT Monitor Arcade Effect */
    .vfx-crt-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at center, transparent 55%, rgba(0, 0, 0, 0.8) 100%),
        repeating-linear-gradient(
          rgba(0, 0, 0, 0) 0px,
          rgba(0, 0, 0, 0) 1px,
          rgba(0, 0, 0, 0.4) 2px,
          rgba(0, 0, 0, 0.4) 3px
        );
      box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.9);
    }

    /* Night Vision Effect */
    .vfx-nightvision-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at center, transparent 35%, rgba(0, 25, 0, 0.75) 65%, #000c02 92%),
        repeating-linear-gradient(
          rgba(0, 255, 70, 0.04) 0px,
          rgba(0, 255, 70, 0.04) 2px,
          transparent 2px,
          transparent 4px
        );
    }
    .vfx-nv-hud {
      position: absolute;
      top: 18px;
      left: 22px;
      right: 22px;
      display: flex;
      justify-content: space-between;
      color: #39ff14;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      text-shadow: 0 0 8px #39ff14;
      letter-spacing: 1px;
    }

    /* Film Noir Layer */
    .vfx-noir-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center, transparent 32%, rgba(0, 0, 0, 0.65) 65%, rgba(0, 0, 0, 0.95) 100%);
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// Find direct player container element
function getPlayerContainer(video) {
  return video.parentElement || video;
}

// Apply or update special FX overlay elements (guarded against redundant DOM re-writes)
function updateVideoOverlay(video, parent, activeFx) {
  let overlayRoot = parent.querySelector(':scope > .vfx-overlay-root');
  if (!overlayRoot) {
    overlayRoot = document.createElement('div');
    overlayRoot.className = 'vfx-overlay-root';
    parent.appendChild(overlayRoot);
  }

  // If already displaying this FX, skip completely to prevent layout thrashing
  if (overlayRoot.dataset.activeFx === activeFx) {
    return;
  }
  overlayRoot.dataset.activeFx = activeFx;

  if (!activeFx || activeFx === 'none') {
    overlayRoot.style.display = 'none';
    overlayRoot.innerHTML = '';
    return;
  }

  overlayRoot.style.display = 'block';

  let html = '';
  if (activeFx === 'vcr') {
    html = `
      <div class="vfx-vcr-layer"></div>
      <div class="vfx-vcr-osd">
        <div>PLAY &#9654; SP</div>
        <div>00:24:19</div>
      </div>
      <div class="vfx-vcr-tracking"></div>
    `;
  } else if (activeFx === 'doorhole') {
    html = `
      <div class="vfx-doorhole-layer"></div>
      <div class="vfx-doorhole-glass"></div>
    `;
  } else if (activeFx === 'fisheye') {
    html = `<div class="vfx-fisheye-layer"></div>`;
  } else if (activeFx === 'crt') {
    html = `<div class="vfx-crt-layer"></div>`;
  } else if (activeFx === 'nightvision') {
    html = `
      <div class="vfx-nightvision-layer"></div>
      <div class="vfx-nv-hud">
        <span>IR ON &bull; 4X</span>
        <span>REC &#9679; [&#9646;&#9646;&#9646;]</span>
      </div>
    `;
  } else if (activeFx === 'noir') {
    html = `<div class="vfx-noir-layer"></div>`;
  }

  overlayRoot.innerHTML = html;
}

// Main video processing function
function processVideo(video) {
  if (!currentState) return;
  ensureGlobalStyles();

  const {
    cropEnabled = false,
    cropRatio = 1.78,
    zoom = 100,
    stretchX = 100,
    stretchY = 100,
    rotate = 0,
    flipH = false,
    flipV = false,
    brightness = 100,
    contrast = 100,
    saturate = 100,
    hue = 0,
    grayscale = 0,
    sepia = 0,
    invert = 0,
    blur = 0,
    activeFx = 'none'
  } = currentState;

  // 1. Build CSS Filter string reliably
  const filterParts = [];

  // Active FX base color grading
  if (activeFx === 'nightvision') {
    filterParts.push('hue-rotate(90deg) saturate(350%) brightness(130%) contrast(140%)');
  } else if (activeFx === 'noir') {
    filterParts.push('grayscale(100%) contrast(145%) brightness(95%)');
  } else if (activeFx === 'vcr') {
    filterParts.push('contrast(115%) saturate(120%)');
  }

  // User Color Adjustments
  if (brightness !== 100) filterParts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) filterParts.push(`contrast(${contrast}%)`);
  if (saturate !== 100) filterParts.push(`saturate(${saturate}%)`);
  if (hue !== 0) filterParts.push(`hue-rotate(${hue}deg)`);
  if (grayscale !== 0) filterParts.push(`grayscale(${grayscale}%)`);
  if (sepia !== 0) filterParts.push(`sepia(${sepia}%)`);
  if (invert !== 0) filterParts.push(`invert(${invert}%)`);
  if (blur !== 0) filterParts.push(`blur(${blur}px)`);

  const finalFilter = filterParts.length ? filterParts.join(' ') : 'none';
  if (video.style.filter !== finalFilter) {
    video.style.setProperty('filter', finalFilter, 'important');
  }

  // 2. Identify and setup player container
  const parent = getPlayerContainer(video);
  if (parent && parent !== video) {
    if (parent.style.position !== 'relative') {
      parent.style.setProperty('position', 'relative', 'important');
    }
    if (parent.style.overflow !== 'hidden') {
      parent.style.setProperty('overflow', 'hidden', 'important');
    }
  }

  // Update live FX overlays
  updateVideoOverlay(video, parent, activeFx);

  // 3. Compute Scale, Stretch/Squash, Rotation, Flip, Zoom
  let scaleVal = (zoom || 100) / 100;
  if (activeFx === 'doorhole') scaleVal *= 1.25;
  else if (activeFx === 'fisheye') scaleVal *= 1.18;

  const sX = ((stretchX || 100) / 100) * (flipH ? -1 : 1) * scaleVal;
  const sY = ((stretchY || 100) / 100) * (flipV ? -1 : 1) * scaleVal;
  const rotDeg = (rotate || 0) % 360;

  // Base video element attributes
  video.style.setProperty('margin', '0', 'important');
  video.style.setProperty('padding', '0', 'important');
  video.style.setProperty('max-width', 'none', 'important');
  video.style.setProperty('max-height', 'none', 'important');
  video.style.setProperty('min-width', '0', 'important');
  video.style.setProperty('min-height', '0', 'important');
  video.style.setProperty('transform-origin', 'center center', 'important');
  video.style.setProperty('z-index', '1', 'important');

  // 4. Cropping Logic
  const targetRatio = (cropEnabled && cropRatio > 0) ? cropRatio : null;

  if (!targetRatio) {
    // Native Aspect Ratio Mode
    video.style.removeProperty('object-fit');
    video.style.removeProperty('width');
    video.style.removeProperty('height');
    video.style.removeProperty('left');
    video.style.removeProperty('top');
    video.style.removeProperty('position');

    const baseTransform = (sX !== 1 || sY !== 1 || rotDeg !== 0)
      ? `rotate(${rotDeg}deg) scale(${sX}, ${sY})`
      : 'none';

    video.style.setProperty('--vfx-base-transform', baseTransform);

    if (activeFx === 'handheld') {
      video.classList.add('vfx-handheld-shake');
    } else {
      video.classList.remove('vfx-handheld-shake');
      video.style.setProperty('transform', baseTransform, 'important');
    }
    return;
  }

  // Crop Mode: Compute target ratio box inside container
  const bounds = parent.getBoundingClientRect();
  let pW = bounds.width;
  let pH = bounds.height;

  if (!pW || !pH) {
    pW = video.clientWidth || window.innerWidth;
    pH = video.clientHeight || window.innerHeight;
  }
  if (!pW || !pH) return;

  const containerRatio = pW / pH;
  let boxW = pW;
  let boxH = pH;

  if (containerRatio > targetRatio) {
    boxW = Math.round(pH * targetRatio);
    boxH = Math.round(pH);
  } else {
    boxW = Math.round(pW);
    boxH = Math.round(pW / targetRatio);
  }

  video.style.setProperty('object-fit', 'cover', 'important');
  video.style.setProperty('width', `${boxW}px`, 'important');
  video.style.setProperty('height', `${boxH}px`, 'important');
  video.style.setProperty('position', 'absolute', 'important');
  video.style.setProperty('left', '50%', 'important');
  video.style.setProperty('top', '50%', 'important');

  const baseTransform = `translate(-50%, -50%) rotate(${rotDeg}deg) scale(${sX}, ${sY})`;
  video.style.setProperty('--vfx-base-transform', baseTransform);

  if (activeFx === 'handheld') {
    video.classList.add('vfx-handheld-shake');
  } else {
    video.classList.remove('vfx-handheld-shake');
    video.style.setProperty('transform', baseTransform, 'important');
  }
}

// Batched update via requestAnimationFrame
let updateRaf = null;
function scheduleUpdateAll() {
  if (updateRaf) return;
  updateRaf = requestAnimationFrame(() => {
    updateRaf = null;
    document.querySelectorAll('video').forEach(processVideo);
  });
}

function updateAllVideos() {
  document.querySelectorAll('video').forEach(processVideo);
}

// Observe container resize only (batched with RAF)
const observedParents = new WeakSet();
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    if (entry.target.tagName !== 'VIDEO') {
      scheduleUpdateAll();
      break;
    }
  }
});

function attachVideo(video) {
  if (!video.dataset.vfxAttached) {
    video.dataset.vfxAttached = 'true';
    const parent = getPlayerContainer(video);
    if (parent && !observedParents.has(parent)) {
      observedParents.add(parent);
      resizeObserver.observe(parent);
    }
    video.addEventListener('loadedmetadata', () => processVideo(video));
    video.addEventListener('play', () => processVideo(video));
  }
  processVideo(video);
}

// Watch ONLY for newly added <video> tags, ignoring attribute and overlay updates
const mutationObserver = new MutationObserver((mutations) => {
  let hasNewVideo = false;
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'VIDEO' || (node.querySelector && node.querySelector('video'))) {
          hasNewVideo = true;
          break;
        }
      }
    }
    if (hasNewVideo) break;
  }
  if (hasNewVideo) {
    document.querySelectorAll('video').forEach(attachVideo);
  }
});
mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('fullscreenchange', () => setTimeout(scheduleUpdateAll, 60));
window.addEventListener('resize', scheduleUpdateAll);

// Cross-browser message listener
ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'APPLY_VFX') {
    currentState = msg.state;
    document.querySelectorAll('video').forEach(attachVideo);
    if (sendResponse) sendResponse({ ok: true });
  }
});

// Restore saved settings on initial load
try {
  if (typeof browser !== 'undefined' && browser.storage?.local?.get) {
    browser.storage.local.get(['vfxState']).then((res) => {
      if (res && res.vfxState) {
        currentState = res.vfxState;
        document.querySelectorAll('video').forEach(attachVideo);
      }
    }).catch(() => {});
  } else if (typeof chrome !== 'undefined' && chrome.storage?.local?.get) {
    chrome.storage.local.get(['vfxState'], (res) => {
      if (res && res.vfxState) {
        currentState = res.vfxState;
        document.querySelectorAll('video').forEach(attachVideo);
      }
    });
  }
} catch (e) {}