(function() {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const originalUrl = urlParams.get('u') || 'unknown';
  const initialRemaining = parseInt(urlParams.get('remaining'), 10) || 0;
  
  // DOM elements
  const blockedUrlSpan = document.getElementById('blockedUrl');
  const timerSpan = document.getElementById('timer');
  const retryBtn = document.getElementById('retryBtn');
  
  // Display the blocked URL (truncated for readability)
  let displayUrl = originalUrl;
  try {
    const urlObj = new URL(originalUrl);
    displayUrl = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    if (displayUrl.length > 60) displayUrl = displayUrl.substring(0, 57) + '...';
  } catch(e) {
    // keep original
  }
  blockedUrlSpan.textContent = displayUrl;
  blockedUrlSpan.title = originalUrl;
  
  let currentRemaining = initialRemaining;
  let timerInterval = null;
  
  // Format milliseconds to HH:MM:SS
  function formatTime(ms) {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Update timer display
  function updateDisplay() {
    timerSpan.textContent = formatTime(currentRemaining);
    if (currentRemaining <= 0) {
      timerSpan.style.color = '#a0ffa0';
      timerSpan.style.background = '#1e3a1e00';
    } else {
      timerSpan.style.color = '#f0f0f0';
      timerSpan.style.background = '#1e1e2a00';
    }
  }
  
  // Fetch latest lock state from background script
  async function refreshLockState() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_STATE' });
      if (response && typeof response.remainingMs === 'number') {
        currentRemaining = Math.max(0, response.remainingMs);
        updateDisplay();
        
        // If lock has expired, show message and enable retry button action
        if (currentRemaining === 0) {
          if (timerInterval) clearInterval(timerInterval);
          timerInterval = null;
          // Change timer label hint
          const timerLabel = document.querySelector('.timer-label');
          if (timerLabel) timerLabel.textContent = 'Lock expired:';
          retryBtn.textContent = 'Retry Now →';
        } else {
          retryBtn.textContent = 'Check Again';
        }
      }
    } catch (err) {
      console.warn('Failed to get lock state:', err);
    }
  }
  
  // Manual countdown tick (decrement by 1 second)
  function tick() {
    if (currentRemaining > 0) {
      currentRemaining -= 1000;
      if (currentRemaining < 0) currentRemaining = 0;
      updateDisplay();
      
      if (currentRemaining === 0) {
        // lock just expired
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        const timerLabel = document.querySelector('.timer-label');
        if (timerLabel) timerLabel.textContent = 'Lock expired:';
        retryBtn.textContent = 'Retry Now →';
        // Optional: refresh state one more time to confirm
        refreshLockState();
      }
    }
  }
  
  // Initialize timer: sync with background, then start local countdown
  async function initTimer() {
    await refreshLockState();
    
    // If lock is active, start local interval; otherwise just show expired
    if (currentRemaining > 0) {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        tick();
        // Cross-check with background every 10 seconds to stay accurate
        if (currentRemaining > 0 && (currentRemaining % 10000 < 1000)) {
          refreshLockState();
        }
      }, 1000);
    } else {
      // already expired
      const timerLabel = document.querySelector('.timer-label');
      if (timerLabel) timerLabel.textContent = 'Lock expired:';
      retryBtn.textContent = 'Retry Now →';
    }
  }
  
  // Retry / check again: reload the original URL (or reload page to let extension re-evaluate)
  function retry() {
    if (originalUrl && originalUrl !== 'unknown') {
      window.location.href = originalUrl;
    } else {
      window.location.reload();
    }
  }
  
  retryBtn.addEventListener('click', retry);
  
  // Also listen for storage changes or lock expiration events?
  // Periodically re-check background every 10 seconds to keep timer exact
  setInterval(() => {
    refreshLockState();
  }, 10000);
  
  // Start everything
  initTimer();
})();