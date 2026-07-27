(async function () {
  const pathParts = window.location.pathname.split('/');
  const handle = pathParts[pathParts.length - 1];
  if (!handle || pathParts.length < 3) return;

  const DEFAULTS = { range: 15, baseline: 3, shortRange: 5 };
  let settings = { ...DEFAULTS };
  let dailyCounts = new Map();

  function loadSettings(cb) {
    chrome.storage.local.get(DEFAULTS, (stored) => {
      settings = stored;
      cb();
    });
  }

  function saveSettings() {
    chrome.storage.local.set(settings);
  }

  async function fetchSubmissions() {
    try {
      const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
      const data = await res.json();
      if (data.status !== 'OK') return;

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      data.result.forEach(sub => {
        if (sub.verdict === 'OK') {
          const subDate = new Date(sub.creationTimeSeconds * 1000);
          subDate.setHours(0, 0, 0, 0);
          const diffTime = Math.abs(now - subDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 150) { 
            let count = dailyCounts.get(diffDays) || new Set();
            count.add(sub.problem.name); 
            dailyCounts.set(diffDays, count);
          }
        }
      });
    } catch (e) {
      console.error('Failed to fetch status:', e);
    }
  }

  function getSum(startDay, endDay) {
    let sum = 0;
    for (let i = startDay; i <= endDay; i++) {
      sum += dailyCounts.has(i) ? dailyCounts.get(i).size : 0;
    }
    return sum;
  }

  function buildUI() {
    const targetContainers = document.querySelectorAll('.roundbox');
    if (!targetContainers.length) return;
    const lastBox = targetContainers[targetContainers.length - 1];

    const wrapper = document.createElement('div');
    wrapper.className = 'roundbox borderTop roundbox-mac';
    wrapper.style.marginTop = '1em';
    wrapper.style.padding = '15px';

    wrapper.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-family: sans-serif;">
        <h4 style="margin: 0; font-size: 14px;">Daily Problems Solved</h4>
        <div style="display: flex; gap: 15px; align-items: center;">
          <div style="font-size: 12px;">
            Target: 
            <input type="number" id="cf-baseline" value="${settings.baseline}" min="1" max="50" style="width: 40px; padding: 2px; border: 1px solid #777; border-radius: 3px; background: transparent; color: inherit;">
          </div>
          <div style="font-size: 12px;">
            Chart Days: 
            <input type="number" id="cf-range" value="${settings.range}" min="5" max="100" style="width: 40px; padding: 2px; border: 1px solid #777; border-radius: 3px; background: transparent; color: inherit;">
          </div>
          <div style="font-size: 12px;">
            Avg Days: 
            <input type="number" id="cf-short-range" value="${settings.shortRange}" min="1" max="30" style="width: 40px; padding: 2px; border: 1px solid #777; border-radius: 3px; background: transparent; color: inherit;">
          </div>
        </div>
      </div>
      <canvas id="cf-daily-canvas" width="800" height="200" style="width: 100%; display: block;"></canvas>
      <div id="cf-stats-bar" style="margin-top: 15px; font-size: 13px; font-family: sans-serif; color: #444; background: #f9f9f9; padding: 10px; border-radius: 4px; border: 1px solid #eee;"></div>
    `;

    lastBox.insertAdjacentElement('afterend', wrapper);

    document.getElementById('cf-baseline').addEventListener('change', (e) => {
      settings.baseline = parseInt(e.target.value, 10) || 3;
      saveSettings();
      drawChart();
    });

    document.getElementById('cf-range').addEventListener('change', (e) => {
      settings.range = parseInt(e.target.value, 10) || 15;
      saveSettings();
      drawChart();
    });

    document.getElementById('cf-short-range').addEventListener('change', (e) => {
      settings.shortRange = parseInt(e.target.value, 10) || 5;
      saveSettings();
      drawChart();
    });
  }

  function drawChart() {
    const canvas = document.getElementById('cf-daily-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const { range, baseline } = settings;
    const dataToPlot = [];
    let maxCount = baseline;

    for (let i = range - 1; i >= 0; i--) {
      const count = dailyCounts.has(i) ? dailyCounts.get(i).size : 0;
      dataToPlot.push(count);
      if (count > maxCount) maxCount = count;
    }

    const paddingX = 10;
    const paddingY = 25;
    const graphW = w - paddingX * 2;
    const graphH = h - paddingY * 2;
    const barW = (graphW / range) * 0.8;
    const spacing = (graphW / range) * 0.2;

    const getY = val => h - paddingY - (val / maxCount) * graphH;

    // Draw baseline
    const baselineY = getY(baseline);
    ctx.beginPath();
    ctx.strokeStyle = '#888';
    ctx.setLineDash([4, 4]);
    ctx.moveTo(paddingX, baselineY);
    ctx.lineTo(w - paddingX, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw bars and zero lines
    dataToPlot.forEach((count, idx) => {
      const x = paddingX + idx * (barW + spacing);
      
      if (count === 0) {
        ctx.fillStyle = '#e53935';
        ctx.fillRect(x, h - paddingY - 2, barW, 2);
      } else {
        const barH = (count / maxCount) * graphH;
        const y = h - paddingY - barH;
        ctx.fillStyle = count >= baseline ? '#40c545' : '#ff6a00';
        ctx.fillRect(x, y, barW, barH);
        
        ctx.fillStyle = '#777';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(count, x + barW / 2, y - 6);
      }
    });

    updateStats();
  }

  function updateStats() {
    const statsBar = document.getElementById('cf-stats-bar');
    if (!statsBar) return;

    const target30Total = 30 * settings.baseline;
    const currentShortSum = getSum(0, settings.shortRange - 1);
    const current30Sum = getSum(0, 29);
    
    const shortAvg = (currentShortSum / settings.shortRange).toFixed(1);
    const avg30 = (current30Sum / 30).toFixed(1);

    let html = `
      <div style="display: flex; gap: 20px; align-items: center;">
        <div><span style="font-weight: bold; color: #222;">${settings.shortRange}-Day Avg:</span> ${shortAvg} / day</div>
        <div><span style="font-weight: bold; color: #222;">30-Day Avg:</span> ${avg30} / day</div>
      </div>
    `;

    if ((current30Sum / 30) < settings.baseline) {
      const retained25 = getSum(0, 24);
      const needed5 = Math.max(0, target30Total - retained25);
      const daily5 = (needed5 / 5).toFixed(1); 

      const retained20 = getSum(0, 19);
      const needed10 = Math.max(0, target30Total - retained20);
      const daily10 = (needed10 / 10).toFixed(1); 

      const retained15 = getSum(0, 14);
      const needed15 = Math.max(0, target30Total - retained15);
      const daily15 = (needed15 / 15).toFixed(1);

      html += `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
          <div style="font-weight: bold; color: #444; margin-bottom: 8px;">Target Recovery for 30-Day Average to Baseline (${settings.baseline}/day):</div>
          <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <div style="background: #fff3e0; border-left: 3px solid #ffa000; padding: 6px 12px; border-radius: 3px;">
              <strong>5-Day Plan:</strong> ${daily5} / day
            </div>
            <div style="background: #fff3e0; border-left: 3px solid #ffa000; padding: 6px 12px; border-radius: 3px;">
              <strong>10-Day Plan:</strong> ${daily10} / day
            </div>
            <div style="background: #fff3e0; border-left: 3px solid #ffa000; padding: 6px 12px; border-radius: 3px;">
              <strong>15-Day Plan:</strong> ${daily15} / day
            </div>
          </div>
        </div>
      `;
    }

    statsBar.innerHTML = html;
  }

  loadSettings(async () => {
    await fetchSubmissions();
    buildUI();
    drawChart();
  });
})();