function getTodayDate() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getChannelName() {
  const match = location.pathname.match(/\/([^\/]+)/);
  if (match) {
    const name = match[1].toLowerCase();
    if (['directory', 'videos', 'settings', 'search', 'discover'].includes(name)) {
      return null;
    }
    return name;
  }
  return null;
}

function getCurrentCategory() {
  const links = document.querySelectorAll('a[data-a-target="stream-game-link"]');
  for (const link of links) {
      const text = link.innerText.trim().toLowerCase();
      if (!text.includes("streamer ensemble") && !text.includes("stream together")) {
          return link.innerText.trim();
      }
  }
  return "Autre";
}

function isVideoPlayingAndNotMuted() {
  const video = document.querySelector('video');
  if (!video) {
    return false;
  }
  const playing = !video.paused;
  const notMuted = !video.muted && video.volume > 0;
  return playing && notMuted;
}

let currentChannel = null;
let startTime = null;
let watchInterval = null;

function saveWatchTime() {
  try {
    if (currentChannel && startTime && isVideoPlayingAndNotMuted()) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const today = getTodayDate();
      const category = getCurrentCategory();

      chrome.storage.local.get(["sessions"], (result) => {
        const sessions = result.sessions || {};
        const lowerChannel = currentChannel.toLowerCase();

        if (!sessions[today]) sessions[today] = {};
        if (!sessions[today][lowerChannel]) {
          sessions[today][lowerChannel] = { total: 0, categories: {} };
        }

        sessions[today][lowerChannel].total += elapsedSeconds;
        sessions[today][lowerChannel].categories[category] =
          (sessions[today][lowerChannel].categories[category] || 0) + elapsedSeconds;

        chrome.storage.local.set({ sessions }, () => {
          //console.log("[DEBUG] Session data updated successfully.");
        });
      });

      startTime = Date.now();
    } else {
      //console.log("[DEBUG] Not saving time (maybe video paused/muted?)");
      startTime = Date.now();
    }
  } catch (err) {
    console.warn("[WARN] saveWatchTime error:", err);
  }
}

function updateCurrentWatching() {
  const name = getChannelName();
  const video = document.querySelector('video');

  if (name && video) {
    const isReallyPaused = video.paused && video.readyState <= 2;
    const isMutedOrVolumeZero = video.muted || video.volume === 0;

    chrome.storage.local.get(["currentWatching"], (result) => {
      const currentWatching = result.currentWatching || {};

      currentWatching[name.toLowerCase()] = {
        isPaused: isReallyPaused,
        isMuted: !isReallyPaused && isMutedOrVolumeZero,
        lastUpdate: Date.now()
      };
      

      chrome.storage.local.set({ currentWatching });
    });
  }
}

function startTracking() {
  updateCurrentWatching();
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('volumechange', updateCurrentWatching);
  }
  currentChannel = getChannelName();
  startTime = Date.now();
  
  if (watchInterval) clearInterval(watchInterval);
  setTimeout(() => {
    watchInterval = setInterval(() => {
      saveWatchTime();
      updateCurrentWatching();
    }, 30000);
  }, 3000);
}

function stopTracking() {
  saveWatchTime();
  if (watchInterval) clearInterval(watchInterval);
}

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    stopTracking();
    lastUrl = location.href;
    startTracking();
  }
}, 1000);

startTracking();
window.addEventListener("beforeunload", stopTracking);