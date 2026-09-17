(function() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    alert("No video found on this page.");
    return;
  }

  // Identify the largest video on the page
  let video = videos[0];
  let maxArea = 0;
  videos.forEach(v => {
    const rect = v.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > maxArea) {
      maxArea = area;
      video = v;
    }
  });

  // Track rotation angle: 0 -> 90 -> 180 -> 270 -> 0
  const currentAngle = parseInt(video.dataset.rotationAngle || '0', 10);
  const nextAngle = (currentAngle + 90) % 360;

  if (currentAngle === 0) {
    video.dataset.originalCss = video.style.cssText;
  }

  if (nextAngle === 0) {
    // Reset back to original state
    video.style.cssText = video.dataset.originalCss || "";
    video.dataset.rotationAngle = '0';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
    return;
  }

  video.dataset.rotationAngle = String(nextAngle);

  // Swap dimensions when rotated sideways (90deg or 270deg)
  const isPerpendicular = nextAngle === 90 || nextAngle === 270;
  const width = isPerpendicular ? '100vh' : '100vw';
  const height = isPerpendicular ? '100vw' : '100vh';

  // Apply styles
  video.style.setProperty('position', 'fixed', 'important');
  video.style.setProperty('top', '50%', 'important');
  video.style.setProperty('left', '50%', 'important');
  video.style.setProperty('width', width, 'important');
  video.style.setProperty('height', height, 'important');
  video.style.setProperty('transform', `translate(-50%, -50%) rotate(${nextAngle}deg)`, 'important');
  video.style.setProperty('z-index', '2147483647', 'important');
  video.style.setProperty('object-fit', 'contain', 'important');
  video.style.setProperty('background-color', 'black', 'important');

  // Trigger fullscreen on initial rotation
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Native fullscreen request failed. Faux-fullscreen applied instead.", err);
    });
  }
})();