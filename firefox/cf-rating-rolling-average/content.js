(async function () {
  const pathParts = window.location.pathname.split('/');
  const handle = pathParts[pathParts.length - 1];
  if (!handle || pathParts.length < 3) return;

  // ======================================================================
  // CONFIGURATION 
  // ======================================================================
  const REGION_OPACITY = 0.20;
  const HIDDEN_LINE_OPACITY = 0.20; 

  const RANK_BANDS = [
    { max: 1200, color: '#808080', name: 'Newbie' },
    { max: 1400, color: '#088308', name: 'Pupil' },
    { max: 1600, color: '#0ddbcd', name: 'Specialist' },
    { max: 1900, color: '#0000FF', name: 'Expert' },
    { max: 2100, color: '#c80ac8', name: 'Cand. Master' },
    { max: 2300, color: '#FF8C00', name: 'Master' },
    { max: 2400, color: '#FF0000', name: 'Grandmaster' },
    { max: Infinity, color: '#B22222', name: 'Legendary GM' },
  ];

  const COLORS = {
    maLine: '#1a73e8',
    positiveDelta: '#429e47',
    negativeDelta: '#c94343',
    gridLine: 'rgba(128,128,128,0.15)',
    monthLine: 'rgba(128,128,128,0.16)',
    axisText: 'rgba(128,128,128,0.85)',
    baseline: 'rgba(128,128,128,0.45)',
    divider: 'rgba(128,128,128,0.25)',
    pointStroke: 'rgba(0,0,0,0.35)',
    hoverLine: 'rgba(166, 166, 166, 0.55)',
    tooltipBg: 'rgba(20,20,20,0.92)',
    tooltipBorder: 'rgba(255,255,255,0.15)',
    tooltipText: '#ffffff',
  };

  const DEFAULTS = { 
    windowSize: 5, 
    showOverlay: false, 
    useMaDelta: true,
    scaleMode: 'recent', 
    recentCount: 30 
  };
  let settings = { ...DEFAULTS };

  let contests = [];
  let ratings = [];

  // ======================================================================
  // Small safe-DOM helper (replaces innerHTML string building everywhere)
  // ======================================================================
  function h(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.id) node.id = opts.id;
    if (opts.className) node.className = opts.className;
    if (opts.text !== undefined) node.textContent = opts.text;
    if (opts.type) node.type = opts.type;
    if (opts.checked) node.checked = true;
    if (opts.value !== undefined) node.value = opts.value;
    if (opts.title) node.title = opts.title;
    if (opts.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    }
    if (opts.style) Object.assign(node.style, opts.style);
    for (const child of children) {
      if (child) node.appendChild(child);
    }
    return node;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function loadSettings(cb) {
    chrome.storage.local.get(DEFAULTS, (stored) => {
      settings = stored;
      cb();
    });
  }

  function saveSettings() {
    chrome.storage.local.set(settings);
  }

  async function fetchRatings() {
    try {
      const res = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
      const data = await res.json();
      if (data.status === 'OK') {
        contests = data.result;
        ratings = contests.map(c => c.newRating);
      }
    } catch (e) {
      console.error('Failed to fetch ratings:', e);
    }
  }

  function computeMA() {
    const ma = [];
    for (let i = 0; i < ratings.length; i++) {
      if (i < settings.windowSize - 1) {
        ma.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < settings.windowSize; j++) sum += ratings[i - j];
        ma.push(sum / settings.windowSize);
      }
    }
    return ma;
  }

  function rankColor(rating) {
    for (const band of RANK_BANDS) {
      if (rating < band.max) return band.color;
    }
    return RANK_BANDS[RANK_BANDS.length - 1].color;
  }

  function niceStep(range) {
    const rough = range / 6;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
  }

  function niceDeltaStep(maxVal) {
    if (maxVal <= 10) return 2;
    if (maxVal <= 15) return 3;
    if (maxVal <= 20) return 5;
    const rough = maxVal / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    return step * mag;
  }

  function formatDate(sec) {
    const d = new Date(sec * 1000);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  }

  function formatDateFull(sec) {
    const d = new Date(sec * 1000);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  let ui = {};
  let layout = null;
  let hoverIndex = null;

  // ======================================================================
  // buildUI — now constructed entirely with createElement (no innerHTML)
  // ======================================================================
  function buildUI() {
    const targetContainers = document.querySelectorAll('.roundbox');
    if (!targetContainers.length) return;
    const lastBox = targetContainers[targetContainers.length - 1];

    const wrapper = document.createElement('div');
    wrapper.className = 'roundbox borderTop roundbox-mac';
    wrapper.style.marginTop = '1em';
    wrapper.style.padding = '15px';
    wrapper.style.fontFamily = 'Verdana, Arial, sans-serif';
    wrapper.style.position = 'relative';
    wrapper.style.borderRadius = '6px';

    // Style block: built from constant CSS + COLORS only, assigned via
    // textContent (not innerHTML), so it isn't flagged and can't inject HTML.
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        .cfma-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;}
        .cfma-title { margin:0; font-size:14px; font-weight:bold; }
        .cfma-controls { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
        .cfma-toggle-label { font-size:12px; cursor:pointer; display:flex; align-items:center; gap:5px; user-select:none; }
        .cfma-window-group { display:flex; align-items:center; gap:5px; font-size:12px; }
        .cfma-window-group span { opacity:0.75; }
        
        input.cfma-val-box {
          width:32px; text-align:center; font-size:12px; padding:3px;
          border:1px solid rgba(128,128,128,0.5); border-radius:4px;
          display:inline-block; background:transparent; color:inherit; outline:none;
        }
        input.cfma-val-box:focus { border-color: ${COLORS.maLine}; }
        
        .cfma-btn {
          cursor:pointer; background:rgba(128,128,128,0.15); border:1px solid rgba(128,128,128,0.5); 
          border-radius:4px; padding:0 6px; color:inherit; font-weight:bold; font-size:14px; line-height: 18px;
        }
        .cfma-btn:hover { background:rgba(128,128,128,0.3); }
        
        .cfma-scale-btn {
          font-size:12px; padding:3px 9px; border-radius:4px; cursor:pointer;
          background: rgba(128,128,128,0.15); border:1px solid rgba(128,128,128,0.5); color:inherit;
        }
        .cfma-scale-btn:hover { background: rgba(128,128,128,0.3); }
        .cfma-canvas-wrap { position:relative; }
        #cfma-tooltip {
          position:absolute; pointer-events:none; z-index:50; display:none;
          background: ${COLORS.tooltipBg}; color:${COLORS.tooltipText}; border:1px solid ${COLORS.tooltipBorder};
          border-radius:5px; padding:6px 9px; font-size:11px; line-height:1.5; white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.4);
        }
        .cfma-legend { display:flex; gap:12px; font-size:11px; opacity:0.85; margin-top:8px; margin-bottom:12px; align-items:center; flex-wrap:wrap; }
        .cfma-legend span.dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:4px; vertical-align:middle; }
        .cfma-legend .swatch-line { display:inline-block; width:14px; height:2px; margin-right:4px; vertical-align:middle; }
        
        #cfma-analytics {
          display:none; flex-wrap:wrap; gap:16px; margin-top:16px; padding:12px;
          background:rgba(128,128,128,0.05); border:1px solid rgba(128,128,128,0.2); border-radius:6px;
        }
    `;

    // --- header ---
    const title = h('h4', { className: 'cfma-title', text: 'Moving Average Rating' });

    const toggleCheckbox = h('input', { type: 'checkbox', id: 'cfma-toggle', checked: settings.showOverlay });
    const toggleLabel = h('label', { className: 'cfma-toggle-label' }, [
      toggleCheckbox,
      document.createTextNode(' Show Rating Curve'),
    ]);

    const deltaCheckbox = h('input', { type: 'checkbox', id: 'cfma-delta-toggle', checked: settings.useMaDelta });
    const deltaLabel = h('label', { className: 'cfma-toggle-label' }, [
      deltaCheckbox,
      document.createTextNode(' Use MA Delta'),
    ]);

    const winDecBtn = h('button', { className: 'cfma-btn', id: 'cfma-win-dec', type: 'button', text: '-' });
    const winBox = h('input', { className: 'cfma-val-box', id: 'cfma-window', type: 'text', value: settings.windowSize });
    const winIncBtn = h('button', { className: 'cfma-btn', id: 'cfma-win-inc', type: 'button', text: '+' });
    const windowGroup = h('div', { className: 'cfma-window-group' }, [
      h('span', { text: 'Window:' }),
      winDecBtn, winBox, winIncBtn,
    ]);

    const scaleBtn = h('button', { className: 'cfma-scale-btn', id: 'cfma-scale-btn', type: 'button' });
    const scaleDecBtn = h('button', { className: 'cfma-btn', id: 'cfma-scale-dec', type: 'button', text: '-' });
    const scaleBox = h('input', { className: 'cfma-val-box', id: 'cfma-scale-val', type: 'text', value: settings.recentCount });
    const scaleIncBtn = h('button', { className: 'cfma-btn', id: 'cfma-scale-inc', type: 'button', text: '+' });
    const scaleCustom = h('div', {
      id: 'cfma-scale-custom',
      style: { display: settings.scaleMode === 'recent' ? 'flex' : 'none', alignItems: 'center', gap: '5px' },
    }, [scaleDecBtn, scaleBox, scaleIncBtn]);
    const scaleGroup = h('div', { className: 'cfma-window-group' }, [scaleBtn, scaleCustom]);

    const controls = h('div', { className: 'cfma-controls' }, [toggleLabel, deltaLabel, windowGroup, scaleGroup]);
    const header = h('div', { className: 'cfma-header' }, [title, controls]);

    // --- canvas area ---
    const canvasEl = h('canvas', { id: 'cfma-canvas' });
    const tooltipEl = h('div', { id: 'cfma-tooltip' });
    const canvasWrap = h('div', { className: 'cfma-canvas-wrap' }, [canvasEl, tooltipEl]);

    const legendEl = h('div', { className: 'cfma-legend', id: 'cfma-legend' });
    const analyticsEl = h('div', { id: 'cfma-analytics' });

    wrapper.appendChild(styleEl);
    wrapper.appendChild(header);
    wrapper.appendChild(canvasWrap);
    wrapper.appendChild(legendEl);
    wrapper.appendChild(analyticsEl);

    lastBox.insertAdjacentElement('afterend', wrapper);

    ui.canvas = canvasEl;
    ui.tooltip = tooltipEl;
    ui.wrap = canvasWrap;
    ui.scaleBtn = scaleBtn;
    ui.analytics = analyticsEl;
    
    updateScaleBtnLabel();

    // --- legend: built with createElement instead of innerHTML ---
    buildLegend(legendEl);

    toggleCheckbox.addEventListener('change', (e) => {
      settings.showOverlay = e.target.checked;
      saveSettings();
      drawChart();
    });

    deltaCheckbox.addEventListener('change', (e) => {
      settings.useMaDelta = e.target.checked;
      saveSettings();
      drawChart();
    });

    // Window Inputs & Buttons
    function applyWindow(delta) {
      let val = settings.windowSize + delta;
      val = Math.max(2, Math.min(30, val));
      settings.windowSize = val;
      winBox.value = val;
      saveSettings();
      drawChart();
    }
    
    winDecBtn.addEventListener('click', () => applyWindow(-1));
    winIncBtn.addEventListener('click', () => applyWindow(1));
    
    winBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') winBox.blur(); });
    winBox.addEventListener('blur', (e) => {
      let val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        settings.windowSize = Math.max(2, Math.min(30, val));
      }
      winBox.value = settings.windowSize;
      saveSettings();
      drawChart();
    });

    // Scale Inputs & Buttons
    function applyScaleCount(delta) {
      let val = settings.recentCount + delta;
      val = Math.max(2, val); 
      settings.recentCount = val;
      scaleBox.value = val;
      saveSettings();
      drawChart();
    }
    
    scaleDecBtn.addEventListener('click', () => applyScaleCount(-1));
    scaleIncBtn.addEventListener('click', () => applyScaleCount(1));
    
    scaleBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') scaleBox.blur(); });
    scaleBox.addEventListener('blur', (e) => {
      let val = parseInt(e.target.value, 10);
      if (!isNaN(val)) {
        settings.recentCount = Math.max(2, val);
      }
      scaleBox.value = settings.recentCount;
      saveSettings();
      drawChart();
    });

    scaleBtn.addEventListener('click', () => {
      settings.scaleMode = settings.scaleMode === 'all' ? 'recent' : 'all';
      scaleCustom.style.display = settings.scaleMode === 'recent' ? 'flex' : 'none';
      updateScaleBtnLabel();
      saveSettings();
      drawChart();
    });

    ui.canvas.addEventListener('mousemove', onHover);
    ui.canvas.addEventListener('mouseleave', () => {
      hoverIndex = null;
      ui.tooltip.style.display = 'none';
      drawChart();
    });

    window.addEventListener('resize', debounce(drawChart, 150));
  }

  function buildLegend(legend) {
    clearNode(legend);
    for (const b of RANK_BANDS) {
      const dot = h('span', { className: 'dot', style: { background: b.color } });
      const item = h('span', {}, [dot, document.createTextNode(b.name)]);
      legend.appendChild(item);
    }
    const maLineSwatch = h('span', { className: 'swatch-line', style: { background: COLORS.maLine } });
    const maItem = h('span', { style: { marginLeft: '6px' } }, [maLineSwatch, document.createTextNode('Moving Avg')]);
    legend.appendChild(maItem);
  }

  function updateScaleBtnLabel() {
    if (!ui.scaleBtn) return;
    ui.scaleBtn.textContent = settings.scaleMode === 'all'
      ? 'Scale: Full History'
      : 'Scale: Recent';
    ui.scaleBtn.title = 'Toggle vertical scaling between the full rating history and just the latest contests';
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function drawChart() {
    const canvas = ui.canvas;
    if (!canvas || ratings.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.parentElement.clientWidth;

    const padLeft = 44, padRight = 14, padTop = 14, padBottom = 50; 
    const graphH = 240;
    const gap = 18;
    const histH = 160; 
    const cssHeight = padTop + graphH + gap + histH + padBottom;

    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const ma = computeMA();
    const n = ratings.length;

    const graphTop = padTop;
    const graphBottom = graphTop + graphH;
    const histTop = graphBottom + gap;
    const histBottom = histTop + histH;
    
    const plotLeft = padLeft;
    const plotRight = cssWidth - padRight - 10; 
    const plotWidth = plotRight - plotLeft;

    const focusCount = settings.scaleMode === 'recent' ? Math.min(settings.recentCount, n) : n;
    const focusStart = n - focusCount;
    const viewN = n - focusStart;

    const focusRatings = ratings.slice(focusStart);
    const focusMA = ma.slice(focusStart).filter(v => v !== null);
    const scaleVals = focusMA.length ? [...focusRatings, ...focusMA] : focusRatings;

    let minR = Math.min(...scaleVals);
    let maxR = Math.max(...scaleVals);
    const step = niceStep(maxR - minR || 100);
    
    minR = Math.floor(minR / step) * step;
    maxR = Math.ceil(maxR / step) * step;
    if (maxR === minR) maxR += step;

    const getX = i => viewN <= 1 ? plotLeft + plotWidth / 2 : plotLeft + ((i - focusStart) / (viewN - 1)) * plotWidth;
    const getY = val => graphTop + graphH - ((val - minR) / (maxR - minR)) * graphH;

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotLeft, graphTop, plotWidth, graphH);
    ctx.clip();
    let lower = 0;
    for (const band of RANK_BANDS) {
      const yTop = Math.max(graphTop, getY(Math.min(band.max, maxR)));
      const yBottom = Math.min(graphBottom, getY(Math.max(lower, minR)));
      if (yBottom > yTop) {
        ctx.fillStyle = band.color;
        ctx.globalAlpha = REGION_OPACITY;
        ctx.fillRect(plotLeft, yTop, plotWidth, yBottom - yTop);
      }
      lower = band.max;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.font = '10px Verdana, Arial, sans-serif';
    ctx.fillStyle = COLORS.axisText;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = minR; v <= maxR + 0.001; v += step) {
      const y = getY(v);
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      ctx.fillText(Math.round(v), plotLeft - 8, y);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotLeft, graphTop, plotWidth, histBottom - graphTop);
    ctx.clip();
    
    ctx.strokeStyle = COLORS.monthLine;
    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      if (i >= focusStart && i % 5 === 0) {
        const x = getX(i);
        ctx.beginPath();
        ctx.moveTo(x, graphTop);
        ctx.lineTo(x, histBottom);
        ctx.stroke();
      }
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const maxLabels = Math.max(2, Math.floor(plotWidth / 90));
    const labelStep = Math.max(1, Math.ceil(viewN / maxLabels));
    
    for (let i = focusStart; i < n; i += labelStep) {
      ctx.fillStyle = COLORS.axisText;
      ctx.fillText(formatDate(contests[i].ratingUpdateTimeSeconds), getX(i), histBottom + 35);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotLeft, graphTop, plotWidth, graphH);
    ctx.clip();

    const currentLineOpacity = settings.showOverlay ? 0.55 : HIDDEN_LINE_OPACITY;
    const currentPointOpacity = settings.showOverlay ? 1.0 : HIDDEN_LINE_OPACITY;

    ctx.beginPath();
    ctx.strokeStyle = `rgba(160, 160, 160, ${currentLineOpacity})`;
    ctx.lineWidth = 1.6;
    for (let i = focusStart + 1; i < n; i++) {
      ctx.moveTo(getX(i - 1), getY(ratings[i - 1]));
      ctx.lineTo(getX(i), getY(ratings[i]));
    }
    ctx.stroke();

    ctx.globalAlpha = currentPointOpacity;
    for (let i = focusStart; i < n; i++) {
      const x = getX(i), y = getY(ratings[i]);
      ctx.beginPath();
      ctx.fillStyle = rankColor(ratings[i]);
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.pointStroke;
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    ctx.beginPath();
    ctx.strokeStyle = COLORS.maLine;
    ctx.lineWidth = settings.showOverlay ? 2 : 2.5;
    let started = false;
    ma.forEach((val, i) => {
      if (i < focusStart || val === null) return;
      const x = getX(i), y = getY(val);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ma.forEach((val, i) => {
      if (i < focusStart || val === null) return;
      const x = getX(i), y = getY(val);
      ctx.beginPath();
      ctx.fillStyle = COLORS.maLine;
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = COLORS.pointStroke;
      ctx.stroke();
    });
    ctx.restore();

    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, graphBottom + gap / 2);
    ctx.lineTo(plotRight, graphBottom + gap / 2);
    ctx.stroke();

    const deltaAt = (i) => {
      if (settings.useMaDelta) {
        if (i < 1 || ma[i] === null || ma[i - 1] === null) return null;
        return ma[i] - ma[i - 1];
      }
      if (i < 1) return null;
      return ratings[i] - ratings[i - 1];
    };
    
    const deltaVals = [];
    for (let i = focusStart; i < n; i++) {
      const d = deltaAt(i);
      if (d !== null) deltaVals.push(d);
    }
    
    const maxD = Math.max(...deltaVals.map(d => Math.abs(d)), 1);
    const stepD = niceDeltaStep(maxD);
    let maxHistScale = Math.ceil(maxD / stepD) * stepD;
    if (maxHistScale === 0) maxHistScale = stepD;

    const baselineY = histTop + histH / 2;
    const barMaxH = histH / 2 - 10;
    const barW = Math.max(2, (plotWidth / viewN) * 0.6);

    ctx.font = '10px Verdana, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for(let v = -maxHistScale; v <= maxHistScale; v += stepD) {
      const y = baselineY - (v / maxHistScale) * barMaxH;
      ctx.strokeStyle = v === 0 ? COLORS.baseline : COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      
      ctx.fillStyle = COLORS.axisText;
      const sign = v > 0 ? '+' : '';
      ctx.fillText(`${sign}${v}`, plotLeft - 8, y);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotLeft, histTop, plotWidth + barW + 10, histH + padBottom); 
    ctx.clip();

    for (let i = focusStart; i < n; i++) {
      const d = deltaAt(i);
      if (d === null) continue;
      
      const statVal = settings.useMaDelta ? (ma[i] !== null ? Math.round(ma[i]) : null) : ratings[i];
      if (statVal === null) continue;

      const barHeight = (Math.abs(d) / maxHistScale) * barMaxH;
      const isPos = d >= 0;
      const barColor = isPos ? COLORS.positiveDelta : COLORS.negativeDelta;
      
      const x = getX(i);
      const startX = x - barW / 2;
      const y = isPos ? baselineY - barHeight : baselineY;
      
      ctx.fillStyle = barColor;
      ctx.fillRect(startX, y, barW, barHeight);

      const deltaStr = (isPos ? '+' : '') + Math.round(d);
      
      ctx.save();
      ctx.translate(x, histBottom + 4);
      ctx.rotate(Math.PI / 2); 
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '9px Verdana, Arial, sans-serif';
      
      ctx.fillStyle = barColor;
      ctx.fillText(deltaStr, 0, -5); 
      
      ctx.fillStyle = rankColor(statVal);
      ctx.fillText(statVal, 0, 5);
      
      ctx.restore();
    }
    ctx.restore();

    if (hoverIndex !== null && hoverIndex >= focusStart && hoverIndex < n) {
      const x = getX(hoverIndex);
      ctx.strokeStyle = COLORS.hoverLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, graphTop);
      ctx.lineTo(x, histBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    layout = { getX, getY, plotLeft, plotRight, graphTop, graphBottom, histTop, histBottom, n, viewN, focusStart, minR, maxR };
    updateAnalytics();
  }

  // ======================================================================
  // updateAnalytics — rebuilt with createElement instead of innerHTML
  // ======================================================================
  function formatRequirementNode(delta) {
    const val = Math.round(delta);
    if (val <= 0) {
      return h('span', { style: { color: COLORS.positiveDelta }, text: `Safe up to ${Math.abs(val)} drop` });
    }
    return h('span', { style: { color: COLORS.negativeDelta }, text: `Requires +${val} gain` });
  }

  function updateAnalytics() {
    if (!ui.analytics) return;
    
    if (ratings.length < settings.windowSize + 1) {
      ui.analytics.style.display = 'none';
      return;
    }
    
    ui.analytics.style.display = 'flex';

    const w = settings.windowSize;
    const currentMA = computeMA()[ratings.length - 1];
    const prevMA = computeMA()[ratings.length - 2];
    const currentDelta = currentMA - prevMA;
    
    const droppingOut = ratings[ratings.length - w];
    
    const reqZero = droppingOut;
    const reqMaintain = droppingOut + (w * currentDelta);

    const currentRating = ratings[ratings.length - 1];
    const reqZeroDelta = reqZero - currentRating;
    const reqMaintainDelta = reqMaintain - currentRating;

    clearNode(ui.analytics);

    const col1 = h('div', { style: { flex: '1', minWidth: '200px' } }, [
      h('div', { style: { fontSize: '11px', opacity: '0.7', marginBottom: '4px', fontWeight: 'bold' }, text: `Next Contest Projections (Window ${w})` }),
      h('div', { style: { fontSize: '11px', opacity: '0.7' } }, [
        document.createTextNode('Rating dropping out of window: '),
        h('span', { style: { fontWeight: 'bold', color: rankColor(droppingOut) }, text: String(droppingOut) }),
      ]),
    ]);

    const col2 = h('div', { style: { flex: '1', minWidth: '150px' } }, [
      h('div', { style: { fontSize: '11px', opacity: '0.7', marginBottom: '4px' }, text: 'To prevent MA from dropping:' }),
      h('div', { style: { fontSize: '14px', fontWeight: 'bold' } }, [formatRequirementNode(reqZeroDelta)]),
    ]);

    const col3 = h('div', { style: { flex: '1', minWidth: '150px' } }, [
      h('div', { style: { fontSize: '11px', opacity: '0.7', marginBottom: '4px' }, text: `To maintain MA momentum (Δ ${currentDelta >= 0 ? '+' : ''}${Math.round(currentDelta)}):` }),
      h('div', { style: { fontSize: '14px', fontWeight: 'bold' } }, [formatRequirementNode(reqMaintainDelta)]),
    ]);

    ui.analytics.appendChild(col1);
    ui.analytics.appendChild(col2);
    ui.analytics.appendChild(col3);
  }

  function onHover(e) {
    if (!layout) return;
    const rect = ui.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    if (mx < layout.plotLeft || mx > layout.plotRight) {
      hoverIndex = null;
      ui.tooltip.style.display = 'none';
      drawChart();
      return;
    }

    const idx = Math.round(((mx - layout.plotLeft) / (layout.plotRight - layout.plotLeft)) * (layout.viewN - 1)) + layout.focusStart;
    const i = Math.max(layout.focusStart, Math.min(layout.n - 1, idx));
    const c = contests[i];
    if (!c) return;

    hoverIndex = i;
    drawChart(); 

    const ma = computeMA();
    
    let deltaLabel, deltaVal, oldStat, newStat, statLabel;

    if (settings.useMaDelta) {
      statLabel = `MA(${settings.windowSize})`;
      oldStat = (i >= 1 && ma[i - 1] !== null) ? Math.round(ma[i - 1]) : '—';
      newStat = ma[i] !== null ? Math.round(ma[i]) : '—';
      deltaLabel = `${statLabel} Δ`;
      deltaVal = (i >= 1 && ma[i] !== null && ma[i - 1] !== null) ? ma[i] - ma[i - 1] : null;
    } else {
      statLabel = 'Rating';
      oldStat = c.oldRating;
      newStat = c.newRating;
      deltaLabel = 'Rating Δ';
      deltaVal = i >= 1 ? c.newRating - c.oldRating : null;
    }

    const deltaStr = deltaVal === null ? '—' : (deltaVal >= 0 ? '+' : '') + Math.round(deltaVal);
    const deltaColor = deltaVal === null ? 'inherit' : (deltaVal >= 0 ? COLORS.positiveDelta : COLORS.negativeDelta);
    const newStatColor = newStat !== '—' ? rankColor(newStat) : 'inherit';

    // Tooltip rebuilt with createElement + textContent. contestName comes
    // from the Codeforces API, so it is untrusted — textContent keeps it
    // as plain text and can never be parsed as markup.
    clearNode(ui.tooltip);

    const nameDiv = h('div', {
      style: { fontWeight: 'bold', maxWidth: '220px', whiteSpace: 'normal', marginBottom: '3px' },
      text: c.contestName,
    });
    const rankDiv = h('div', { text: `Rank: ${c.rank}` });

    const statDiv = h('div', {}, [
      document.createTextNode(`${statLabel}: ${oldStat} → `),
      h('b', { style: { color: newStatColor }, text: String(newStat) }),
    ]);

    const deltaDiv = h('div', {}, [
      document.createTextNode(`${deltaLabel}: `),
      h('span', { style: { color: deltaColor }, text: deltaStr }),
    ]);

    const dateDiv = h('div', {
      style: { opacity: '0.7', marginTop: '3px' },
      text: formatDateFull(c.ratingUpdateTimeSeconds),
    });

    ui.tooltip.appendChild(nameDiv);
    ui.tooltip.appendChild(rankDiv);
    ui.tooltip.appendChild(statDiv);
    ui.tooltip.appendChild(deltaDiv);
    ui.tooltip.appendChild(dateDiv);

    ui.tooltip.style.display = 'block';

    const wrapRect = ui.wrap.getBoundingClientRect();
    const mouseX = e.clientX - wrapRect.left;
    const mouseY = e.clientY - wrapRect.top;
    
    // Position tooltip offset from the mouse pointer so it doesn't cover the point
    let left = mouseX + 15;
    let top = mouseY + 15;
    
    // Prevent tooltip from overflowing the right side
    if (left + 230 > wrapRect.width) left = mouseX - 245;
    
    ui.tooltip.style.left = left + 'px';
    ui.tooltip.style.top = top + 'px';
  }

  loadSettings(async () => {
    await fetchRatings();
    if (!ratings.length) return;
    buildUI();
    drawChart();
  });
})();