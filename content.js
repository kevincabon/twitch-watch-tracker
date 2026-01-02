function getTodayDate() {
  const now = new Date();
  // Utiliser le fuseau horaire local au lieu d'UTC
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
let sessionStartTime = null; // Heure de début de la session actuelle
let sessionDuration = 0; // Durée accumulée de la session actuelle (en secondes)
let sessionCategories = {}; // Catégories accumulées pour la session actuelle
let sessionSaved = false; // Flag pour éviter de sauvegarder plusieurs fois la même session
let sessionSavedDuration = 0; // Durée de la session lors de la dernière sauvegarde

function saveWatchTime() {
  try {
    if (currentChannel && startTime && isVideoPlayingAndNotMuted()) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const today = getTodayDate();
      const category = getCurrentCategory();

      // Accumuler la durée et les catégories pour la session en cours
      sessionDuration += elapsedSeconds;
      sessionCategories[category] = (sessionCategories[category] || 0) + elapsedSeconds;

      // Vérifier que le contexte de l'extension est toujours valide
      if (!chrome.storage || !chrome.storage.local) {
        return;
      }

      chrome.storage.local.get(["sessions"], (result) => {
        try {
          // Vérifier que le contexte de l'extension est toujours valide
          if (!chrome.storage || !chrome.storage.local) {
            return;
          }

          if (chrome.runtime.lastError) {
            console.warn("[WARN] saveWatchTime error:", chrome.runtime.lastError);
            return;
          }

          if (!result) {
            console.warn("[WARN] saveWatchTime: result is null or undefined");
            return;
          }

          const sessions = result.sessions || {};
          
          // Vérifier que currentChannel est toujours valide dans le callback
          // (peut être null si on est sur une page sans stream actif, comme /directory/following)
          if (!currentChannel) {
            // Pas de warning, c'est normal sur certaines pages Twitch
            return;
          }
          
          const lowerChannel = currentChannel.toLowerCase();

          if (!sessions[today]) sessions[today] = {};
          if (!sessions[today][lowerChannel]) {
            sessions[today][lowerChannel] = { 
              total: 0, 
              categories: {},
              sessionList: [] // Liste des sessions individuelles
            };
          }

          // Initialiser sessionList si absent (compatibilité avec anciennes données)
          if (!sessions[today][lowerChannel].sessionList) {
            sessions[today][lowerChannel].sessionList = [];
          }

          // Mettre à jour le total et les catégories globales
          sessions[today][lowerChannel].total += elapsedSeconds;
          sessions[today][lowerChannel].categories[category] =
            (sessions[today][lowerChannel].categories[category] || 0) + elapsedSeconds;

          chrome.storage.local.set({ sessions }, () => {
            if (!chrome.storage || !chrome.storage.local) {
              return;
            }
            if (chrome.runtime.lastError) {
              console.warn("[WARN] saveWatchTime set error:", chrome.runtime.lastError);
            }
            // Note: saveSession() est appelée périodiquement dans l'intervalle, pas ici
            // pour éviter les race conditions avec les mises à jour du total
          });
        } catch (err) {
          console.warn("[WARN] saveWatchTime error:", err);
        }
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

function saveSession() {
  // Enregistrer la session complète seulement si elle dure au moins 1 minute
  if (!sessionStartTime || sessionDuration < 60 || !currentChannel) {
    return;
  }

  // Ne pas bloquer si la durée a augmenté significativement (plus de 10 secondes)
  // Cela permet de mettre à jour la session si l'utilisateur continue à regarder
  const lastSavedDuration = sessionSaved ? (sessionSavedDuration || 0) : 0;
  if (sessionSaved && sessionDuration <= lastSavedDuration + 10) {
    return;
  }

  const today = getTodayDate();
  const lowerChannel = currentChannel.toLowerCase();
  if (!lowerChannel) return;

  // Vérifier que le contexte de l'extension est toujours valide
  if (!chrome.storage || !chrome.storage.local) {
    return;
  }

  chrome.storage.local.get(["sessions"], (result) => {
    try {
      // Vérifier que le contexte de l'extension est toujours valide
      if (!chrome.storage || !chrome.storage.local) {
        return;
      }

      if (chrome.runtime.lastError) {
        console.warn("[WARN] saveSession error:", chrome.runtime.lastError);
        return;
      }

      if (!result) {
        console.warn("[WARN] saveSession: result is null or undefined");
        return;
      }

      const sessions = result.sessions || {};
      
      // Vérifier que today et lowerChannel sont valides
      if (!today || !lowerChannel) {
        console.warn("[WARN] saveSession: invalid today or lowerChannel");
        return;
      }
      
      // IMPORTANT: Sauvegarder le total existant AVANT toute modification
      // pour éviter d'écraser les mises à jour de saveWatchTime()
      let existingTotal = 0;
      let existingCategories = {};
      
      if (sessions[today] && sessions[today][lowerChannel]) {
        existingTotal = sessions[today][lowerChannel].total || 0;
        existingCategories = sessions[today][lowerChannel].categories || {};
      }
      
      if (!sessions[today]) sessions[today] = {};
      if (!sessions[today][lowerChannel]) {
        sessions[today][lowerChannel] = { 
          total: 0, 
          categories: {},
          sessionList: []
        };
      } else {
        // S'assurer que total et categories existent (ne pas les écraser)
        if (typeof sessions[today][lowerChannel].total !== 'number') {
          sessions[today][lowerChannel].total = 0;
        }
        if (!sessions[today][lowerChannel].categories) {
          sessions[today][lowerChannel].categories = {};
        }
      }
      
      // PRÉSERVER le total existant (géré uniquement par saveWatchTime())
      // Ne jamais le réinitialiser ou le modifier ici
      // Utiliser le maximum pour éviter d'écraser les mises à jour récentes de saveWatchTime()
      sessions[today][lowerChannel].total = Math.max(
        sessions[today][lowerChannel].total || 0,
        existingTotal
      );

      if (!sessions[today][lowerChannel].sessionList) {
        sessions[today][lowerChannel].sessionList = [];
      }

      // Vérifier que toutes les variables nécessaires sont définies
      if (!sessionStartTime || isNaN(sessionStartTime)) {
        console.warn("[WARN] saveSession: invalid sessionStartTime");
        return;
      }

      if (typeof sessionDuration !== 'number' || isNaN(sessionDuration)) {
        console.warn("[WARN] saveSession: invalid sessionDuration");
        return;
      }

      if (!sessions || !sessions[today] || !sessions[today][lowerChannel]) {
        console.warn("[WARN] saveSession: invalid sessions structure");
        return;
      }

      // Créer l'entrée de session
      const sessionEntry = {
        startTime: new Date(sessionStartTime).toISOString(),
        duration: sessionDuration,
        categories: sessionCategories ? { ...sessionCategories } : {}
      };

      // Vérifier si cette session existe déjà (même startTime)
      const sessionList = sessions[today][lowerChannel].sessionList;
      if (!Array.isArray(sessionList)) {
        console.warn("[WARN] saveSession: sessionList is not an array");
        sessions[today][lowerChannel].sessionList = [];
      }
      
      // Chercher une session existante avec le même startTime (tolérance de 5 secondes)
      const existingSessionIndex = sessionList.findIndex(
        s => s && s.startTime && sessionEntry.startTime && 
        Math.abs(new Date(s.startTime).getTime() - new Date(sessionEntry.startTime).getTime()) < 5000
      );

      if (existingSessionIndex >= 0) {
        // Mettre à jour la session existante
        const existingSession = sessionList[existingSessionIndex];
        if (sessionEntry.duration > existingSession.duration) {
          existingSession.duration = sessionEntry.duration;
          existingSession.categories = sessionEntry.categories;
        } else {
          sessionSaved = true;
          sessionSavedDuration = sessionDuration;
          return;
        }
      } else {
        // Créer une nouvelle session
        sessionList.push(sessionEntry);
      }

      // Sauvegarder les modifications
      // IMPORTANT: Ne jamais modifier le total ici, il est géré uniquement par saveWatchTime()
      // Le total doit rester tel quel pour éviter d'écraser les mises à jour de saveWatchTime()
      // On a déjà préservé le total avec Math.max() plus haut, donc on peut sauvegarder
      
      // Dernière vérification : récupérer le total le plus récent juste avant de sauvegarder
      // pour éviter d'écraser les mises à jour de saveWatchTime() qui pourraient arriver entre temps
      chrome.storage.local.get(["sessions"], (lastCheck) => {
        if (!chrome.runtime.lastError && lastCheck && lastCheck.sessions && 
            lastCheck.sessions[today] && lastCheck.sessions[today][lowerChannel]) {
          const latestTotal = lastCheck.sessions[today][lowerChannel].total || 0;
          // Utiliser le maximum pour préserver les mises à jour récentes
          sessions[today][lowerChannel].total = Math.max(
            sessions[today][lowerChannel].total || 0,
            latestTotal
          );
        }
        
        // Maintenant sauvegarder avec le total préservé
        chrome.storage.local.set({ sessions }, () => {
          if (!chrome.storage || !chrome.storage.local) {
            return;
          }
          if (chrome.runtime.lastError) {
            console.warn("[WARN] saveSession set error:", chrome.runtime.lastError);
          } else {
            sessionSaved = true; // Marquer comme sauvegardée
            sessionSavedDuration = sessionDuration; // Enregistrer la durée sauvegardée
          }
        });
      });
    } catch (err) {
      console.warn("[WARN] saveSession error:", err);
    }
  });
}

function updateCurrentWatching() {
  const name = getChannelName();
  const video = document.querySelector('video');

  if (name && video) {
    const isReallyPaused = video.paused && video.readyState <= 2;
    const isMutedOrVolumeZero = video.muted || video.volume === 0;
    const lowerName = name.toLowerCase();

    // Vérifier que le contexte de l'extension est toujours valide
    if (!chrome.storage || !chrome.storage.local) {
      return;
    }

    chrome.storage.local.get(["currentWatching"], (result) => {
      try {
        // Vérifier que le contexte de l'extension est toujours valide
        if (!chrome.storage || !chrome.storage.local) {
          return;
        }

        if (chrome.runtime.lastError) {
          console.warn("[WARN] updateCurrentWatching error:", chrome.runtime.lastError);
          return;
        }

        if (!result) {
          console.warn("[WARN] updateCurrentWatching: result is null or undefined");
          return;
        }

        // Vérifier que name est toujours valide dans le callback
        if (!name || !lowerName) {
          return;
        }

        const currentWatching = result.currentWatching || {};

        currentWatching[lowerName] = {
          isPaused: isReallyPaused,
          isMuted: !isReallyPaused && isMutedOrVolumeZero,
          lastUpdate: Date.now()
        };
        
        chrome.storage.local.set({ currentWatching }, () => {
          if (!chrome.storage || !chrome.storage.local) {
            return;
          }
          if (chrome.runtime.lastError) {
            console.warn("[WARN] updateCurrentWatching set error:", chrome.runtime.lastError);
          }
        });
      } catch (err) {
        console.warn("[WARN] updateCurrentWatching error:", err);
      }
    });
  }
}

function startTracking() {
  updateCurrentWatching();
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('volumechange', updateCurrentWatching);
  }
  const newChannel = getChannelName();
  
  // Détecter si c'est une nouvelle session (nouvelle chaîne ou retour après pause)
  const isNewSession = newChannel !== currentChannel || !sessionStartTime;
  
  // Si on change de chaîne, sauvegarder la session précédente avant de commencer une nouvelle
  if (isNewSession && currentChannel && sessionStartTime) {
    saveSession();
  }
  
  currentChannel = newChannel;
  startTime = Date.now();
  
  // Si c'est une nouvelle session, initialiser les variables
  if (isNewSession && currentChannel) {
    sessionStartTime = Date.now();
    sessionDuration = 0;
    sessionCategories = {};
    sessionSaved = false; // Réinitialiser le flag
    sessionSavedDuration = 0;
  } else if (currentChannel && !sessionStartTime) {
    // Si on a un channel mais pas de sessionStartTime (par exemple après un rechargement), initialiser
    sessionStartTime = Date.now();
    sessionDuration = 0;
    sessionCategories = {};
    sessionSaved = false; // Réinitialiser le flag
    sessionSavedDuration = 0;
  }
  
  if (watchInterval) clearInterval(watchInterval);
  setTimeout(() => {
    watchInterval = setInterval(() => {
      saveWatchTime();
      updateCurrentWatching();
      
      // Sauvegarder automatiquement la session toutes les 2 minutes si elle dure >= 1 minute
      // Cela permet de sauvegarder même si l'utilisateur ne quitte pas la page
      // Utiliser setTimeout pour éviter les conflits avec saveWatchTime()
      if (sessionStartTime && sessionDuration >= 60) {
        setTimeout(() => {
          saveSession();
        }, 500); // Délai pour laisser saveWatchTime() finir sa mise à jour
      }
    }, 30000);
  }, 3000);
}

function stopTracking() {
  saveWatchTime(); // Sauvegarder le temps restant
  saveSession(); // Enregistrer la session complète si elle dure >= 1 minute
  if (watchInterval) clearInterval(watchInterval);
  // Réinitialiser les variables pour la prochaine session
  sessionStartTime = null;
  sessionDuration = 0;
  sessionCategories = {};
  sessionSaved = false;
  sessionSavedDuration = 0;
}

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    stopTracking();
    lastUrl = location.href;
    startTracking();
  }
}, 1000);

// Sauvegarder la session quand l'utilisateur quitte la page
window.addEventListener('beforeunload', () => {
  saveWatchTime();
  saveSession();
});

// Sauvegarder aussi quand la page devient invisible (changement d'onglet)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    saveWatchTime();
    saveSession();
  }
});

startTracking();
window.addEventListener("beforeunload", stopTracking);