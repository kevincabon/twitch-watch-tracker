// popup.js (avec favoris + pagination)

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

document.addEventListener('DOMContentLoaded', () => {
  const mainView = document.getElementById('mainView');
  const detailsView = document.getElementById('detailsView');
  const container = document.getElementById('weeklyStats');
  const detailsContainer = document.getElementById('channelDetails');
  const filterSelect = document.getElementById('timeFilter');

  let sessionsData = {};
  let favorites = [];
  let showingAll = false;

  mainView.classList.remove('hidden');
  detailsView.classList.add('hidden');
  container.innerHTML = '';

  const optionsButton = document.getElementById('optionsButton');
  const optionsMenu = document.getElementById('optionsMenu');

  optionsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    optionsMenu.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!optionsMenu.contains(e.target) && e.target !== optionsButton) {
      optionsMenu.classList.add('hidden');
    }
  });

  document.getElementById('exportButton').addEventListener('click', exportData);
  document.getElementById('importButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('resetButton').addEventListener('click', resetData);
  document.getElementById('fileInput').addEventListener('change', importData);

function exportData() {
  chrome.storage.local.get(null, (items) => {
    const blob = new Blob([JSON.stringify(items)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'twitch_watch_data.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

function importData() {
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      chrome.storage.local.set(data, () => {
        alert('✅ Données importées !');
        window.location.reload();
      });
    } catch (err) {
      alert('❌ Fichier invalide.');
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (confirm('⚠️ Êtes-vous sûr de vouloir tout réinitialiser ?')) {
    chrome.storage.local.clear(() => {
      alert('✅ Données réinitialisées.');
      window.location.reload();
    });
  }
}

  let currentWatching = {};

  chrome.storage.local.get(["sessions", "favorites", "currentWatching"], (result) => {
    sessionsData = result.sessions || {};
    favorites = result.favorites || [];
    currentWatching = result.currentWatching || {};
    // Auto-clean des entrées orphelines
    const activeChannels = Object.keys(getTotalStreamTimes(sessionsData));

    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes (modifiable)

    // Nettoyage automatique des streams inactifs
    for (const [channel, info] of Object.entries(currentWatching)) {
      if (!info.lastUpdate || now - info.lastUpdate > threshold) {
        delete currentWatching[channel];
      }
    }

    // Sauvegarde seulement si on a supprimé des entrées
    chrome.storage.local.set({ currentWatching });
    
    displayStreamers('total');
  });


  filterSelect.addEventListener('change', () => {
    displayStreamers(filterSelect.value);
  });

  document.getElementById('backButton').addEventListener('click', () => {
    detailsView.classList.add('hidden');
    mainView.classList.remove('hidden');
    detailsContainer.innerHTML = '';
    document.getElementById('backButton').style.display = 'none';
  });

  document.getElementById('backButton').style.display = 'none';

  function displayStreamers(mode) {
    const totalWatchTimeElement = document.getElementById('totalWatchTime');

    function formatTotalTime(seconds) {
      if (seconds <= 0) return "0s";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h}h ${m}m ${s}s`;
    }
    
    function updateTotalWatchTime(streamTimes, mode) {
      const totalSeconds = Object.values(streamTimes).reduce((sum, seconds) => sum + seconds, 0);
      let label = "Temps total";
      if (mode === '7days') label = "Temps sur 7 derniers jours";
      if (mode === 'week') label = "Temps cumulé par semaine";
      if (mode === 'month') label = "Temps cumulé par mois";
      if (mode === 'category') label = "Temps cumulé par catégorie";
      totalWatchTimeElement.textContent = `${label} : ${formatTotalTime(totalSeconds)}`;
    }

    container.innerHTML = '';
    let streamTimes = {};

    if (mode === 'total') {
      streamTimes = getTotalStreamTimes(sessionsData);
    } else if (mode === '7days') {
      streamTimes = getLast7DaysStats(sessionsData);
    } else if (mode === 'week') {
      streamTimes = getStatsGroupedByWeek(sessionsData);
    } else if (mode === 'month') {
      streamTimes = getStatsGroupedByMonth(sessionsData);
    } else if (mode === 'category') {
      streamTimes = getTotalByCategory(sessionsData);
    }

    let items = Object.entries(streamTimes);
    items.sort((a, b) => b[1] - a[1]);

    updateTotalWatchTime(streamTimes, mode);

    const favItems = items.filter(([name]) => favorites.includes(name.toLowerCase()));
    const nonFavItems = items.filter(([name]) => !favorites.includes(name.toLowerCase()));

    const limitedNonFav = showingAll ? nonFavItems : nonFavItems.slice(0, 6);

    for (const [listName, list] of [["Favoris", favItems], ["Autres", limitedNonFav]]) {
      if (list.length > 0 && listName === "Autres" && favItems.length > 0) {
        const hr = document.createElement('hr');
        container.appendChild(hr);
      }
    
      for (const [key, seconds] of list) {
        const card = document.createElement('div');
        card.className = 'channel-card clickable';
    
        let overlayHTML = '';
    
        const watchingStatus = currentWatching[key.toLowerCase()];
    
        if (mode !== 'category' && watchingStatus) {
          card.classList.add('watching-now');
    
          if (watchingStatus.isPaused) {
            overlayHTML = `<div class="status-overlay paused">Pause</div>`;
          } else if (watchingStatus.isMuted) {
            overlayHTML = `<div class="status-overlay muted">Muted</div>`;
          }
        }
    
        card.innerHTML = `
          ${overlayHTML}
          <div class="top-row">
            <div class="left">
              ${mode === 'category' ? `<span class="icon">🎮</span>` : ''}
              <strong class="channel-name">${key}</strong>
            </div>
            <div class="right">
              <span class="channel-time">${formatTime(seconds)}</span>
            </div>
          </div>
        `;
    
        if (mode === 'total' || mode === '7days') {
          card.addEventListener('click', () => {
            showChannelDetails(key.toLowerCase(), sessionsData);
          });
        } else if (mode === 'category') {
          card.addEventListener('click', () => {
            showCategoryDetails(key, sessionsData);
          });
        }
    
        container.appendChild(card);
      }
    }      

    if (!showingAll && nonFavItems.length > 6) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'reset-button';
      moreBtn.textContent = 'Voir plus...';
      moreBtn.addEventListener('click', () => {
        showingAll = true;
        displayStreamers(mode);
      });
      container.appendChild(moreBtn);
    }
  }

  function toggleFavorite(channelName) {
    const lower = channelName.toLowerCase();
    if (favorites.includes(lower)) {
      favorites = favorites.filter(fav => fav !== lower);
    } else {
      favorites.push(lower);
    }
    chrome.storage.local.set({ favorites }, () => {
      displayStreamers(filterSelect.value);
    });
  }

  function deleteChannelData(channelName) {
    chrome.storage.local.get(["sessions"], (result) => {
      const sessions = result.sessions || {};
      const lower = channelName.toLowerCase();
  
      for (const [date, channels] of Object.entries(sessions)) {
        if (channels[lower]) {
          delete channels[lower];
        }
        if (Object.keys(channels).length === 0) {
          delete sessions[date];
        }
      }
  
      chrome.storage.local.set({ sessions }, () => {
        alert("✅ Chaîne supprimée !");
        document.getElementById('backButton').click();
      });
    });
  }  

  function showChannelDetails(channel, sessions) {
    function createExpandableList(title, items, formatter) {
      const container = document.createElement('div');
      container.className = 'detail-block';
    
      const sectionTitle = document.createElement('div');
      sectionTitle.className = 'section-title';
      sectionTitle.innerHTML = title;
      container.appendChild(sectionTitle);
    
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      container.appendChild(list);
    
      let showingAll = false;
      const limit = 5;
    
      function render() {
        list.innerHTML = '';
    
        const displayedItems = showingAll ? items : items.slice(0, limit);
        for (const [key, value] of displayedItems) {
          const p = document.createElement('p');
          p.className = 'expandable-item';
          p.textContent = formatter(key, value);
          list.appendChild(p);
        
          // Animation légère
          setTimeout(() => {
            p.classList.add('show');
          }, 10);
        }        
    
        if (items.length > limit) {
          const toggleButton = document.createElement('button');
          toggleButton.className = 'reset-button';
          toggleButton.textContent = showingAll ? 'Voir moins...' : 'Voir plus...';
          toggleButton.addEventListener('click', () => {
            showingAll = !showingAll;
            render();
          });
          list.appendChild(toggleButton);
        }
      }
    
      render();
      return container;
    }    
    const detailsContainer = document.getElementById('channelDetails');
    detailsContainer.innerHTML = '';
  
    let total = 0;
    const byDay = {};
    const byCategory = {};
  
    for (const [date, channels] of Object.entries(sessions)) {
      const lower = channel.toLowerCase();
      const entry = channels[lower];
      if (entry) {
        total += entry.total || 0;
        byDay[date] = (byDay[date] || 0) + (entry.total || 0);
  
        for (const [cat, sec] of Object.entries(entry.categories || {})) {
          byCategory[cat] = (byCategory[cat] || 0) + sec;
        }
      }
    }
  
    const average = total / Object.keys(byDay).length || 0;
  
    const title = document.createElement('h2');
    title.textContent = `Détails : ${channel}`;
    detailsContainer.appendChild(title);
  
    const totalText = document.createElement('p');
    totalText.innerHTML = `⏱ <strong>Temps total</strong> : ${formatTime(total)}`;
    detailsContainer.appendChild(totalText);
  
    const avgText = document.createElement('p');
    avgText.innerHTML = `📊 <strong>Moyenne par jour</strong> : ${formatTime(Math.round(average))}`;
    detailsContainer.appendChild(avgText);
  
    const favBtn = document.createElement('button');
    favBtn.className = 'reset-button';
    favBtn.textContent = favorites.includes(channel.toLowerCase()) ? '❌ Retirer des favoris' : '⭐ Ajouter aux favoris';
    favBtn.addEventListener('click', () => {
      toggleFavorite(channel);
      document.getElementById('backButton').click();
    });
    detailsContainer.appendChild(favBtn);
  
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'reset-button';
    deleteBtn.textContent = '🗑️ Supprimer cette chaîne';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Supprimer toutes les données pour ${channel} ?`)) {
        deleteChannelData(channel);
      }
    });
    detailsContainer.appendChild(deleteBtn);
  
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const catSection = createExpandableList("🎮 Par catégorie :", sortedCats, (cat, sec) => `${cat} : ${formatTime(sec)}`);
    detailsContainer.appendChild(catSection);
  
    const sortedDays = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
    const daySection = createExpandableList("📅 Par jour :", sortedDays, (date, sec) => `${date} : ${formatTime(sec)}`);
    detailsContainer.appendChild(daySection);
  
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    document.getElementById('backButton').style.display = 'block';
  }  

  function showCategoryDetails(category, sessions) {
    const detailsContainer = document.getElementById('channelDetails');
    detailsContainer.innerHTML = '';

    let total = 0;
    const byStreamer = {};

    for (const [date, channels] of Object.entries(sessions)) {
      for (const [streamer, data] of Object.entries(channels)) {
        const sec = data.categories?.[category];
        if (sec) {
          total += sec;
          byStreamer[streamer] = (byStreamer[streamer] || 0) + sec;
        }
      }
    }

    const title = document.createElement('h2');
    title.textContent = `Catégorie : ${category}`;
    detailsContainer.appendChild(title);

    const totalText = document.createElement('p');
    totalText.innerHTML = `⏱ <strong>Temps total</strong> : ${formatTime(total)}`;
    detailsContainer.appendChild(totalText);

    const list = document.createElement('div');
    list.className = 'detail-block';
    list.innerHTML = `<div class="section-title">🎥 Par streamer :</div>`;
    const sorted = Object.entries(byStreamer).sort((a, b) => b[1] - a[1]);
    for (const [name, seconds] of sorted) {
      const p = document.createElement('p');
      p.textContent = `${name} : ${formatTime(seconds)}`;
      list.appendChild(p);
    }
    detailsContainer.appendChild(list);

    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    document.getElementById('backButton').style.display = 'block';
  }

  // Reste des fonctions helpers inchangées (getTotalStreamTimes, etc.)
});

function getTotalByCategory(sessions) {
  const categories = {};
  for (const [_, channels] of Object.entries(sessions)) {
    for (const [, data] of Object.entries(channels)) {
      for (const [cat, sec] of Object.entries(data.categories || {})) {
        categories[cat] = (categories[cat] || 0) + sec;
      }
    }
  }
  return categories;
}

function getTotalStreamTimes(sessions) {
  const streamTimes = {};
  for (const [date, channels] of Object.entries(sessions)) {
    for (const [channel, data] of Object.entries(channels)) {
      const lower = channel.toLowerCase();
      const total = data.total || 0;
      streamTimes[lower] = (streamTimes[lower] || 0) + total;
    }
  }
  return streamTimes;
}

function getLast7DaysStats(sessions) {
  const dates = getLast7DaysDates();
  const streamTimes = {};
  for (const date of dates) {
    if (sessions[date]) {
      for (const [channel, data] of Object.entries(sessions[date])) {
        const total = data.total || 0;
        streamTimes[channel.toLowerCase()] = (streamTimes[channel.toLowerCase()] || 0) + total;
      }
    }
  }
  return streamTimes;
}

function getStatsGroupedByWeek(sessions) {
  const weekly = {};
  for (const [dateStr, channels] of Object.entries(sessions)) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const week = getISOWeek(date);
    const key = `${year}-W${week}`;
    weekly[key] = (weekly[key] || 0);
    for (const data of Object.values(channels)) {
      weekly[key] += data.total || 0;
    }
  }
  return weekly;
}

function getStatsGroupedByMonth(sessions) {
  const monthly = {};
  for (const [dateStr, channels] of Object.entries(sessions)) {
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] || 0);
    for (const data of Object.values(channels)) {
      monthly[key] += data.total || 0;
    }
  }
  return monthly;
}

function getLast7DaysDates() {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}
