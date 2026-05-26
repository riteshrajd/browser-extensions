const slider = document.getElementById('scale');
const display = document.getElementById('val');
const resetBtn = document.getElementById('reset');

// Function to apply the squish
function squishVideo(scaleValue) {
  const videos = document.querySelectorAll('video');
  videos.forEach(v => {
    v.style.transform = `scaleX(${scaleValue})`;
  });
}

slider.addEventListener('input', async () => {
  display.innerText = slider.value;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: squishVideo,
    args: [slider.value]
  });
});

resetBtn.addEventListener('click', () => {
  slider.value = 1;
  slider.dispatchEvent(new Event('input'));
});