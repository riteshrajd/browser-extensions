(function() {
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    alert("No video found on this page.");
    return;
  }

  // Identify the largest video on the page (ignores tiny background/ad videos)
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

  if (video.dataset.isRotated === 'true') {
    // Revert to original state
    video.style.cssText = video.dataset.originalCss || "";
    video.dataset.isRotated = 'false';
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.error(err));
    }
  } else {
    // Save original state and apply rotation
    video.dataset.originalCss = video.style.cssText;
    video.dataset.isRotated = 'true';

    // Force video to break out of containers and fit screen dimensions inverted
    video.style.setProperty('position', 'fixed', 'important');
    video.style.setProperty('top', '50%', 'important');
    video.style.setProperty('left', '50%', 'important');
    video.style.setProperty('width', '100vh', 'important'); 
    video.style.setProperty('height', '100vw', 'important');
    video.style.setProperty('transform', 'translate(-50%, -50%) rotate(90deg)', 'important');
    video.style.setProperty('z-index', '2147483647', 'important');
    video.style.setProperty('object-fit', 'contain', 'important');
    video.style.setProperty('background-color', 'black', 'important');

    // Trigger native fullscreen to hide the browser UI
    document.documentElement.requestFullscreen().catch(err => {
      console.warn("Native fullscreen request failed. Faux-fullscreen applied instead.", err);
    });
  }
})();