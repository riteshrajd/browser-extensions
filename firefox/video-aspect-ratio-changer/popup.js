const api = globalThis.chrome || globalThis.browser;

const slider = document.getElementById('scale');
const display = document.getElementById('val');
const resetBtn = document.getElementById('reset');

// Function to apply the squish inside the page context
function squishVideo(scaleValue) {
  const videos = document.querySelectorAll('video');
  videos.forEach(v => {
    v.style.transform = `scaleX(${scaleValue})`;
  });
}

slider.addEventListener('input', async () => {
  display.innerText = slider.value;
  
  const [tab] = await api.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  api.scripting.executeScript({
    target: { tabId: tab.id },
    func: squishVideo,
    args: [parseFloat(slider.value)]
  });
});

resetBtn.addEventListener('click', () => {
  slider.value = 1;
  slider.dispatchEvent(new Event('input'));
});