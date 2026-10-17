// Universal cross-browser extension API (Firefox & Chrome)
const ext = (typeof browser !== 'undefined' && browser.runtime) ? browser : chrome;

let currentState = null;
let fisheyeMapDataUrl = null;

// Generate optical spherical displacement map for Fisheye effect
function getFisheyeMapUrl() {
  if (fisheyeMapDataUrl) return fisheyeMapDataUrl;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(128, 128);
    const data = imgData.data;
    const cx = 64, cy = 64, rMax = 64;

    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const dx = (x - cx) / rMax;
        const dy = (y - cy) / rMax;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let factor = 0;
        if (dist < 1.0) {
          factor = Math.sin((dist * Math.PI) / 2) / (dist || 1);
        }
        const shiftX = dx * factor;
        const shiftY = dy * factor;
        const r = Math.min(255, Math.max(0, Math.round((shiftX + 1) * 127.5)));
        const g = Math.min(255, Math.max(0, Math.round((shiftY + 1) * 127.5)));
        const idx = (y * 128 + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = 128;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    fisheyeMapDataUrl = canvas.toDataURL();
    return fisheyeMapDataUrl;
  } catch (e) {
    return null;
  }
}

// Inject Global SVG Filters into the DOM once
function ensureSvgFilters() {
  if (document.getElementById('vfx-global-svg-filters')) return;
  const mapUrl = getFisheyeMapUrl();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'vfx-global-svg-filters';
  svg.setAttribute('style', 'position: absolute; width: 0; height: 0; pointer-events: none; overflow: hidden;');
  svg.innerHTML = `
    <defs>
      <filter id="vfx-fisheye-filter" x="-20%" y="-20%" width="140%" height="140%">
        ${mapUrl ? `<feImage href="${mapUrl}" result="vfxMap" preserveAspectRatio="none"/>
        <feDisplacementMap in="SourceGraphic" in2="vfxMap" scale="42" xChannelSelector="R" yChannelSelector="G"/>` : ''}
      </filter>
    </defs>
  `;
  (document.body || document.documentElement).appendChild(svg);
}

// Inject Global CSS Styles into the DOM once
function ensureGlobalStyles() {
  if (document.getElementById('vfx-global-styles')) return;
  const style = document.createElement('style');
  style.id = 'vfx-global-styles';
  style.textContent = `
    /* Handheld Camera Shake Animation */
    @keyframes vfxHandheldShake {
      0%   { transform: var(--vfx-base-transform) translate(0px, 0px) rotate(0deg); }
      14%  { transform: var(--vfx-base-transform) translate(-3px, 2px) rotate(-0.35deg); }
      28%  { transform: var(--vfx-base-transform) translate(2.5px, -2.5px) rotate(0.4deg); }
      42%  { transform: var(--vfx-base-transform) translate(-2px, -3px) rotate(-0.25deg); }
      56%  { transform: var(--vfx-base-transform) translate(3px, 2px) rotate(0.45deg); }
      70%  { transform: var(--vfx-base-transform) translate(-1.5px, 3px) rotate(-0.3deg); }
      84%  { transform: var(--vfx-base-transform) translate(2px, -1.5px) rotate(0.2deg); }
      100% { transform: var(--vfx-base-transform) translate(0px, 0px) rotate(0deg); }
    }
    .vfx-handheld-shake {
      animation: vfxHandheldShake 3.4s ease-in-out infinite !important;
    }

    /* Overlay Root Container */
    .vfx-overlay-root {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      pointer-events: none !important;
      z-index: 2147483640 !important;
      overflow: hidden !important;
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
      top: 24px;
      left: 28px;
      font-family: "Courier New", Courier, monospace;
      font-size: 18px;
      font-weight: 700;
      color: #00ff77;
      text-shadow: 0 0 8px rgba(0, 255, 119, 0.8), 2px 2px 0 rgba(0, 0, 0, 0.9);
      letter-spacing: 2px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      user-select: none;
    }
    .vfx-vcr-tracking {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 18px;
      background: repeating-linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.15) 0px,
        rgba(255, 255, 255, 0.3) 10px,
        rgba(0, 0, 0, 0.6) 20px
      );
      opacity: 0.7;
      filter: blur(1px);
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
        transparent 31%,
        rgba(10, 8, 5, 0.35) 32%,
        rgba(70, 52, 18, 0.85) 33.2%,
        rgba(220, 180, 75, 0.95) 33.8%,
        rgba(160, 125, 45, 0.95) 34.4%,
        rgba(40, 30, 10, 0.95) 35.2%,
        rgba(5, 5, 5, 0.98) 36.5%,
        #000000 37.5%,
        #000000 100%
      );
      box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8);
    }
    .vfx-doorhole-glass {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, transparent 20%, rgba(0, 0, 0, 0.4) 31%, transparent 32%);
    }

    /* Fish Eye Vignette */
    .vfx-fisheye-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center,
        transparent 38%,
        rgba(0, 0, 0, 0.4) 52%,
        rgba(0, 0, 0, 0.8) 65%,
        #000000 78%
      );
      border-radius: 50%;
      transform: scale(1.18);
    }

    /* CRT Monitor Arcade Effect */
    .vfx-crt-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at center, transparent 60%, rgba(0, 0, 0, 0.75) 100%),
        repeating-linear-gradient(
          rgba(0, 0, 0, 0) 0px,
          rgba(0, 0, 0, 0) 1px,
          rgba(0, 0, 0, 0.45) 2px,
          rgba(0, 0, 0, 0.45) 3px
        );
      box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.85);
    }

    /* Night Vision Effect */
    .vfx-nightvision-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at center, transparent 40%, rgba(0, 20, 0, 0.7) 70%, #000c02 95%),
        repeating-linear-gradient(
          rgba(0, 255, 70, 0.04) 0px,
          rgba(0, 255, 70, 0.04) 2px,
          transparent 2px,
          transparent 4px
        );
    }
    .vfx-nv-hud {
      position: absolute;
      top: 20px;
      left: 24px;
      right: 24px;
      display: flex;
      justify-content: space-between;
      color: #39ff14;
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      text-shadow: 0 0 6px #39ff14;
      letter-spacing: 1px;
    }

    /* Film Noir Layer */
    .vfx-noir-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.65) 70%, rgba(0, 0, 0, 0.95) 100%);
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

// Find the stable player container element
function getPlayerContainer(video) {
  const player = video.closest(
    '.html5-video-player, #kt_player, .kt-player, .fp-player, .video-js, .plyr, .jwplayer, [data-player], .player-container, .vjs-tech'
  );
  if (player) return player;
  return video.parentElement || video;
}

// Calculate target aspect ratio from state
function parseTargetRatio(state) {
  if (!state || state.aspectRatio === 'native') return null;

  if (state.aspectRatio === 'custom') {
    const w = parseFloat(state.customW);
    const h = parseFloat(state.customH);
    return (w > 0 && h > 0) ? (w / h) : null;
  }

  if (state.aspectRatio === 'slider') {
    const r = parseFloat(state.cropRatioSlider);
    return (r > 0) ? r : null;
  }

  // Preset ratios like '16:9', '4:3', '2.39:1', '1:1', '9:16'
  if (typeof state.aspectRatio === 'string') {
    if (state.aspectRatio.includes(':')) {
      const [w, h] = state.aspectRatio.split(':').map(Number);
      return (w && h) ? (w / h) : null;
    }
    const val = parseFloat(state.aspectRatio);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

// Apply or update special FX overlay elements
function updateVideoOverlay(video, parent, activeFx) {
  let overlayRoot = parent.querySelector(':scope > .vfx-overlay-root');
  if (!overlayRoot) {
    overlayRoot = document.createElement('div');
    overlayRoot.className = 'vfx-overlay-root';
    parent.appendChild(overlayRoot);
  }

  if (!activeFx || activeFx === 'none') {
    overlayRoot.style.display = 'none';
    overlayRoot.innerHTML = '';
    return;
  }

  overlayRoot.style.display = 'block';

  let html = '';
  if (activeFx === 'vcr') {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    html = `
      <div class="vfx-vcr-layer"></div>
      <div class="vfx-vcr-osd">
        <div>PLAY &#9654; SP</div>
        <div>${timeStr}</div>
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
  ensureSvgFilters();

  const {
    aspectRatio,
    cropRatioSlider,
    customW,
    customH,
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

  // 1. Build CSS Filter string
  let filterParts = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
    `hue-rotate(${hue}deg)`,
    `grayscale(${grayscale}%)`,
    `sepia(${sepia}%)`
  ];

  if (invert > 0) filterParts.push(`invert(${invert}%)`);
  if (blur > 0) filterParts.push(`blur(${blur}px)`);

  // Extra filter stylings for specific FX
  if (activeFx === 'vcr') {
    filterParts.push('contrast(115%)');
    filterParts.push('drop-shadow(-1.5px 0 0 rgba(255, 20, 50, 0.4))');
    filterParts.push('drop-shadow(1.5px 0 0 rgba(0, 220, 255, 0.4))');
  } else if (activeFx === 'nightvision') {
    filterParts.push('hue-rotate(90deg) saturate(350%) brightness(130%) contrast(140%)');
  } else if (activeFx === 'noir') {
    filterParts.push('grayscale(100%) contrast(140%) brightness(95%)');
  } else if (activeFx === 'fisheye' || activeFx === 'doorhole') {
    if (document.getElementById('vfx-fisheye-filter')) {
      filterParts.push('url(#vfx-fisheye-filter)');
    }
  }

  video.style.setProperty('filter', filterParts.join(' '), 'important');

  // 2. Identify and setup player container
  const parent = getPlayerContainer(video);
  if (parent && parent !== video) {
    parent.style.setProperty('position', 'relative', 'important');
    parent.style.setProperty('overflow', 'hidden', 'important');
  }

  // Update live FX overlays
  updateVideoOverlay(video, parent, activeFx);

  // 3. Compute Transform Matrix (Scale, Stretch/Squash, Rotation, Flip, Zoom)
  const scaleVal = (zoom || 100) / 100;
  const sX = ((stretchX || 100) / 100) * (flipH ? -1 : 1) * scaleVal;
  const sY = ((stretchY || 100) / 100) * (flipV ? -1 : 1) * scaleVal;
  const rotDeg = (rotate || 0) % 360;

  // Reset margins and bounds constraints to prevent off-center shifting
  video.style.setProperty('margin', '0', 'important');
  video.style.setProperty('padding', '0', 'important');
  video.style.setProperty('max-width', 'none', 'important');
  video.style.setProperty('max-height', 'none', 'important');
  video.style.setProperty('min-width', '0', 'important');
  video.style.setProperty('min-height', '0', 'important');
  video.style.setProperty('transform-origin', 'center center', 'important');

  const targetRatio = parseTargetRatio(currentState);

  if (!targetRatio) {
    // Original / Native Aspect Ratio Mode
    video.style.removeProperty('object-fit');
    video.style.removeProperty('width');
    video.style.removeProperty('height');
    video.style.removeProperty('left');
    video.style.removeProperty('top');

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

  // 4. Crop Mode: Calculate clean integer box dimensions to eliminate subpixel jitter
  const bounds = parent.getBoundingClientRect();
  const pW = Math.round(bounds.width) || window.innerWidth;
  const pH = Math.round(bounds.height) || window.innerHeight;
  if (!pW || !pH) return;

  const containerRatio = pW / pH;
  let boxW = pW;
  let boxH = pH;

  if (containerRatio > targetRatio) {
    boxW = Math.round(pH * targetRatio);
  } else {
    boxH = Math.round(pW / targetRatio);
  }

  // Apply object-fit: cover inside target ratio box (pure crop without warping)
  video.style.setProperty('object-fit', 'cover', 'important');
  video.style.setProperty('width', `${boxW}px`, 'important');
  video.style.setProperty('height', `${boxH}px`, 'important');
  video.style.setProperty('position', 'absolute', 'important');
  video.style.setProperty('left', '50%', 'important');
  video.style.setProperty('top', '50%', 'important');

  // Base transform with center alignment, rotation, and stretch/squash
  const baseTransform = `translate(-50%, -50%) rotate(${rotDeg}deg) scale(${sX}, ${sY})`;
  video.style.setProperty('--vfx-base-transform', baseTransform);

  if (activeFx === 'handheld') {
    video.classList.add('vfx-handheld-shake');
  } else {
    video.classList.remove('vfx-handheld-shake');
    video.style.setProperty('transform', baseTransform, 'important');
  }
}

function updateAllVideos() {
  document.querySelectorAll('video').forEach(processVideo);
}

// Observe container resize only (avoid observing video itself to prevent feedback loop)
const observedParents = new WeakSet();
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    if (entry.target.tagName !== 'VIDEO') {
      updateAllVideos();
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

// Detect dynamically added videos
const mutationObserver = new MutationObserver(() => {
  document.querySelectorAll('video').forEach(attachVideo);
});
mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('fullscreenchange', () => setTimeout(updateAllVideos, 80));
window.addEventListener('resize', updateAllVideos);

// Cross-browser message listener
ext.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'APPLY_VFX') {
    currentState = msg.state;
    document.querySelectorAll('video').forEach(attachVideo);
    if (sendResponse) sendResponse({ ok: true });
  }
});

// Restore saved settings on initial script injection
try {
  ext.storage.local.get(['vfxState'], (res) => {
    if (res && res.vfxState) {
      currentState = res.vfxState;
      document.querySelectorAll('video').forEach(attachVideo);
    }
  });
} catch (e) {
  // Fallback for promise-based browser.storage
  if (typeof browser !== 'undefined' && browser.storage?.local?.get) {
    browser.storage.local.get(['vfxState']).then((res) => {
      if (res && res.vfxState) {
        currentState = res.vfxState;
        document.querySelectorAll('video').forEach(attachVideo);
      }
    }).catch(() => {});
  }
}