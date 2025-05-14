// popup.js (avec favoris + pagination)

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

function isTwitchApiAvailable(callback) {
  chrome.storage.local.get(['twitchApi'], (result) => {
    const api = result.twitchApi || {};
    callback(api.clientId && api.token);
  });
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

  chrome.storage.local.get(['twitchApi'], (result) => {
    const twitchApi = result.twitchApi;
    if (twitchApi?.clientId && twitchApi?.token && !twitchApi.userId) {
      fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Client-ID': twitchApi.clientId,
          'Authorization': `Bearer ${twitchApi.token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        const user = data?.data?.[0];
        if (user?.id) {
          twitchApi.userId = user.id;
          chrome.storage.local.set({ twitchApi });
          console.log('[Twitch Watch Tracker] ✅ ID utilisateur Twitch enregistré:', user.id);
        }
      });
    }
  });


function showWeekDetails(weekKey) {
  const detailsContainer = document.getElementById('channelDetails');
  detailsContainer.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = `Détails semaine : ${weekKey}`;
  detailsContainer.appendChild(title);

  // ← Obtenir les vraies dates ISO du lundi au dimanche
  const weekDates = getDatesOfWeek(weekKey); // tableau de 7 dates (lundi à dimanche)

  // Associer les secondes pour chaque jour
  const daysData = {};
  for (const dateStr of weekDates) {
    daysData[dateStr] = 0;
  }

  for (const dateStr of Object.keys(sessionsData)) {
    if (daysData.hasOwnProperty(dateStr)) {
      let totalSeconds = 0;
      for (const data of Object.values(sessionsData[dateStr])) {
        totalSeconds += data.total || 0;
      }
      daysData[dateStr] = totalSeconds;
    }
  }

  // Affichage texte
  const dayList = document.createElement('div');
  dayList.className = 'detail-block';
  for (const date of weekDates) {
    const p = document.createElement('p');
    p.textContent = `${formatDayDate(date)} - ${formatTime(daysData[date])}`;
    dayList.appendChild(p);
  }
  detailsContainer.appendChild(dayList);

  // Graphique Chart.js
  const canvas = document.createElement('canvas');
  canvas.id = 'weekChart';
  canvas.style.marginTop = '20px';
  detailsContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekDates.map(getShortDayName),
      datasets: [{
        label: 'Temps par jour (minutes)',
        data: weekDates.map(d => Math.round(daysData[d] / 60)),
        backgroundColor: '#9146ff',
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      layout: { padding: 12 },
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => `${val} min`
          }
        }
      }
    }
  });

  document.getElementById('mainView').classList.add('hidden');
  document.getElementById('detailsView').classList.remove('hidden');
  document.getElementById('backButton').style.display = 'block';
}

function showMonthDetails(monthKey) {
  const detailsContainer = document.getElementById('channelDetails');
  detailsContainer.innerHTML = '';

  const title = document.createElement('h2');
  title.textContent = `Détails mois : ${monthKey}`;
  detailsContainer.appendChild(title);

  const weeksData = {};

  for (const [dateStr, channels] of Object.entries(sessionsData)) {
    if (dateStr.startsWith(monthKey)) {
      const date = new Date(dateStr);
      const week = getISOWeek(date);
      const weekKey = `${date.getFullYear()}-W${week}`;

      let totalSeconds = 0;
      for (const data of Object.values(channels)) {
        totalSeconds += data.total || 0;
      }

      weeksData[weekKey] = (weeksData[weekKey] || 0) + totalSeconds;
    }
  }

  // Affichage texte
  const weekList = document.createElement('div');
  weekList.className = 'detail-block';
  for (const [week, seconds] of Object.entries(weeksData)) {
    const p = document.createElement('p');
    p.textContent = `${week} - ${formatTime(seconds)}`;
    weekList.appendChild(p);
  }
  detailsContainer.appendChild(weekList);

  // Création du canvas Chart.js
  const canvas = document.createElement('canvas');
  canvas.id = 'monthChart';
  canvas.style.marginTop = '20px';
  detailsContainer.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(weeksData),
      datasets: [{
        label: 'Temps par semaine (minutes)',
        data: Object.values(weeksData).map(sec => Math.round(sec / 60)),
        backgroundColor: '#9146ff',
        barPercentage: 0.6,
        categoryPercentage: 0.7
      }]
    },
    options: {
      responsive: true,
      layout: { padding: 12 },
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => Math.floor(val / 60) + ' min'
          }
        }
      }
    }
  });

  document.getElementById('mainView').classList.add('hidden');
  document.getElementById('detailsView').classList.remove('hidden');
  document.getElementById('backButton').style.display = 'block';
}

function formatDayDate(dateStr) {
  const date = new Date(dateStr);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('fr-FR', options);
}

function getShortDayName(dateStr) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short' }).format(date);
}

function formatShortDay(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'short' });
}

function getDatesOfWeek(weekKey) {
  const [year, week] = weekKey.split('-W').map(Number);
  const targetThursday = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7 + 1));
  
  const targetMonday = new Date(targetThursday);
  targetMonday.setDate(targetThursday.getDate() - 3);
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(targetMonday);
    date.setDate(targetMonday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
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
    renderNowWatchingSection(currentWatching);
  });

  function renderNowWatchingSection(currentWatching) {
    const activeNowContainer = document.getElementById('nowWatching');
    if (!activeNowContainer) return;
  
    const now = Date.now();
    const threshold = 5 * 60 * 1000;
  
    const activeChannels = Object.entries(currentWatching)
      .filter(([_, info]) => info.lastUpdate && now - info.lastUpdate <= threshold);
  
    if (activeChannels.length === 0) {
      activeNowContainer.style.display = 'none';
      return;
    }
    activeNowContainer.style.display = '';
    activeNowContainer.innerHTML = '';
  
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = '📺 En cours de lecture';
    activeNowContainer.appendChild(title);
  
    for (const [channel, info] of activeChannels) {
      const statusIcon = info.isPaused ? '⏸️' : info.isMuted ? '🔇' : '▶️';
      const avatar = `<span class="now-avatar" data-channel="${channel}"><span>${channel[0].toUpperCase()}</span></span>`;
      const p = document.createElement('p');
      p.className = 'channel-now';
      p.innerHTML = `${avatar} <span>${statusIcon}</span> <strong>${channel}</strong>`;
      p.addEventListener('click', () => {
        showChannelDetails(channel, sessionsData);
      });
      activeNowContainer.appendChild(p);
      setTimeout(() => {
        const avatarDiv = p.querySelector('.now-avatar');
        if (avatarDiv) {
          setAvatar(avatarDiv, channel.toLowerCase(), sessionsData);
        }
      }, 0);
    }
  }  

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
    container.innerHTML = '';
  
    const streamTimes = getStreamTimesByMode(mode);
    const sortedItems = sortStreamItems(streamTimes, mode);
    const [favItems, nonFavItems] = splitByFavorites(sortedItems);
  
    updateTotalWatchTimeDisplay(streamTimes, mode);
    renderFavorites(favItems, mode);
    renderOthers(nonFavItems, mode, favItems.length > 0);
  
    setupShowMoreButton(nonFavItems);
    setupSearchInput(mode);
  }
  
  function getStreamTimesByMode(mode) {
    switch (mode) {
      case '7days': return getLast7DaysStats(sessionsData);
      case 'week': return getStatsGroupedByWeek(sessionsData);
      case 'month': return getStatsGroupedByMonth(sessionsData);
      case 'category': return getTotalByCategory(sessionsData);
      default: return getTotalStreamTimes(sessionsData);
    }
  }
  
  function sortStreamItems(items, mode) {
    let entries = Object.entries(items);
    if (mode === 'week' || mode === 'month') {
      entries.sort((a, b) => b[0].localeCompare(a[0]));
    } else {
      entries.sort((a, b) => b[1] - a[1]);
    }
    return entries;
  }
  
  function splitByFavorites(items) {
    const fav = items.filter(([name]) => favorites.includes(name.toLowerCase()));
    const nonFav = items.filter(([name]) => !favorites.includes(name.toLowerCase()));
    return [fav, nonFav];
  }
  
  function updateTotalWatchTimeDisplay(times, mode) {
    const totalWatchTimeElement = document.getElementById('totalWatchTime');
    const totalSeconds = Object.values(times).reduce((sum, sec) => sum + sec, 0);
    const labels = {
      total: "Temps total",
      '7days': "Temps sur 7 derniers jours",
      week: "Temps cumulé par semaine",
      month: "Temps cumulé par mois",
      category: "Temps cumulé par catégorie"
    };
    totalWatchTimeElement.textContent = `${labels[mode]} : ${formatTime(totalSeconds)}`;
  }
  
  function renderFavorites(items, mode) {
    if (!items.length) return;
    const favTitle = document.createElement('div');
    favTitle.className = 'fav-section-title';
    favTitle.innerHTML = '⭐ Favoris';
    container.appendChild(favTitle);
  
    const favBg = document.createElement('div');
    favBg.className = 'fav-section-bg';
    favBg.id = 'favSectionBg';
    container.appendChild(favBg);
  
    for (const [key, seconds] of items) {
      const card = createChannelCard(key, seconds, mode, true);
      renderAvatarWithLiveStatus(card, key);
      favBg.appendChild(card);
    }
  }
  
  function renderOthers(items, mode, insertHr) {
    const shownItems = showingAll ? items : items.slice(0, 6);
    if (insertHr && shownItems.length > 0) {
      const hr = document.createElement('hr');
      container.appendChild(hr);
    }
  
    for (const [key, seconds] of shownItems) {
      const card = createChannelCard(key, seconds, mode, false);
      renderAvatarWithLiveStatus(card, key);
      container.appendChild(card);
    }
  }

  function renderAvatarWithLiveStatus(card, channel) {
    const avatarDiv = card.querySelector('.avatar');
    if (avatarDiv) {
      setTimeout(() => {
        setAvatar(avatarDiv, channel.toLowerCase(), sessionsData);
      }, 0);
    }
  }  
  
  function setupShowMoreButton(items) {
    const isSearching = document.getElementById('searchInput')?.value.trim().length > 0;
    if (!showingAll && !isSearching && items.length > 6) {
      const moreBtn = document.createElement('button');
      moreBtn.className = 'reset-button';
      moreBtn.textContent = 'Voir plus...';
      moreBtn.addEventListener('click', () => {
        showingAll = true;
        displayStreamers(filterSelect.value);
      });
      container.appendChild(moreBtn);
    }
  }
  
  function setupSearchInput(mode) {
    const input = document.getElementById('searchInput');
    input.removeEventListener('input', handleSearch);
    input.addEventListener('input', handleSearch);
  
    function handleSearch(e) {
      const searchTerm = e.target.value.toLowerCase();
      if (searchTerm.length === 0 && showingAll) {
        displayStreamers(mode);
      }
      if (!showingAll && searchTerm.length >= 1) {
        showingAll = true;
        displayStreamers(mode);
        return;
      }
  
      document.querySelectorAll('.channel-card').forEach(card => {
        const channel = card.dataset.channel?.toLowerCase();
        card.style.display = channel.includes(searchTerm) ? 'flex' : 'none';
      });
    }
  }  

  function createChannelCard(channelName, seconds, mode, isFavorite = false) {
    const lowerName = channelName.toLowerCase();
    const card = document.createElement('div');
    card.className = 'channel-card clickable';
    if (isFavorite) card.classList.add('fav-card');
    card.dataset.channel = lowerName;
  
    // Overlay (pause/mute)
    let overlayHTML = '';
    const watchingStatus = currentWatching[lowerName];
    if (mode !== 'category' && watchingStatus) {
      card.classList.add('watching-now');
      if (watchingStatus.isPaused) {
        overlayHTML = `<div class="status-overlay paused">Pause</div>`;
      } else if (watchingStatus.isMuted) {
        overlayHTML = `<div class="status-overlay muted">Muted</div>`;
      }
    }
  
    // Avatar avec placeholder (LIVE badge sera ajouté plus tard si nécessaire)
    const avatarHTML = `<div class="avatar" data-channel="${channelName}">
      <span>${channelName[0].toUpperCase()}</span>
    </div>`;
  
    // Construction de la carte HTML
    card.innerHTML = `
      ${overlayHTML}
      <div class="top-row">
        <div class="left">
          ${avatarHTML}
          <strong class="channel-name">${channelName}</strong>
        </div>
        <div class="right">
          <span class="channel-time">${formatTime(seconds)}</span>
        </div>
      </div>
    `;
  
    // Ajoute l’avatar (récupération locale ou API)
    setTimeout(() => {
      const avatarDiv = card.querySelector('.avatar');
      if (avatarDiv) {
        setAvatar(avatarDiv, lowerName, sessionsData, () => {
          // Une fois avatar chargé, on peut potentiellement y ajouter le badge LIVE
          maybeAddLiveBadge(avatarDiv, lowerName);
        });
      }
    }, 0);
  
    // Ajoute le bon comportement au clic selon le mode
    const handlerMap = {
      total: () => showChannelDetails(lowerName, sessionsData),
      '7days': () => showChannelDetails(lowerName, sessionsData),
      week: () => showWeekDetails(channelName, sessionsData),
      month: () => showMonthDetails(channelName, sessionsData),
      category: () => showCategoryDetails(channelName, sessionsData)
    };
    card.addEventListener('click', handlerMap[mode]);
  
    return card;
  }
  
  function maybeAddLiveBadge(avatarDiv, channelName) {
    chrome.storage.local.get(['twitchApi', 'avatars', 'sessions'], (result) => {
      const { twitchApi, avatars = {}, sessions = {} } = result;
      const meta = avatars[channelName];
      const userId = meta?.twitchId;
  
      // Conditions minimales
      if (!twitchApi?.clientId || !twitchApi?.token || !userId) return;
  
      const totalSeconds = Object.values(sessions).reduce((acc, channels) => {
        return acc + (channels[channelName]?.total || 0);
      }, 0);
  
      if (totalSeconds < 600) return; // Moins de 10 min, on skip
  
      // Vérifie si on a déjà une info live récente
      const now = Date.now();
      if (meta.liveCheckedAt && now - meta.liveCheckedAt < 5 * 60 * 1000) return; // < 5 min, skip
  
      const headers = {
        'Client-ID': twitchApi.clientId,
        'Authorization': `Bearer ${twitchApi.token}`
      };
  
      fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, { headers })
        .then(res => res.json())
        .then(data => {
          const stream = data?.data?.[0];
          if (stream) {
            // Ajoute un badge LIVE
            const liveBadge = document.createElement('span');
            liveBadge.textContent = 'LIVE';
            liveBadge.className = 'live-badge';
            avatarDiv.appendChild(liveBadge);
  
            // Sauvegarde l'état + date pour éviter les appels répétitifs
            avatars[channelName] = {
              ...meta,
              isLive: true,
              liveCheckedAt: now
            };
          } else {
            avatars[channelName] = {
              ...meta,
              isLive: false,
              liveCheckedAt: now
            };
          }
  
          chrome.storage.local.set({ avatars });
        })
        .catch(() => {});
    });
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

  function showChannelDetails(channel, sessions, liveInfo = null) {
    window.scrollTo(0, 0);

    fetchAndStoreTwitchMeta(channel, (meta) => {
      if (!meta) return;
    
      const infoContainer = document.createElement('div');
      infoContainer.className = 'meta-summary';
      
      if (meta?.isFollowing && meta?.followedAt) {
        const date = new Date(meta.followedAt).toLocaleDateString('fr-FR');
        infoContainer.innerHTML += `
          <div class="meta-item">
            <div class="meta-icon">👤</div>
            <div class="meta-label">Depuis</div>
            <div class="meta-value">${date}</div>
          </div>
        `;
      }
      
      if (meta.broadcasterType === 'affiliate' || meta.broadcasterType === 'partner') {
        const icon = meta.broadcasterType === 'partner' ? '🏆' : '🎉';
        const label = meta.broadcasterType === 'partner' ? 'Partenaire' : 'Affiliée';
        infoContainer.innerHTML += `
          <div class="meta-item">
            <div class="meta-icon">${icon}</div>
            <div class="meta-label">${label}</div>
          </div>
        `;
      }

      if (liveInfo) {
        const liveEl = document.createElement('p');
        liveEl.innerHTML = `🔴 <strong>En direct</strong> — ${liveInfo.title} <br> 🎮 ${liveInfo.gameName} | ${formatDurationSince(liveInfo.startedAt)}`;
        detailsContainer.insertBefore(liveEl, detailsContainer.children[2]);
      }
      
      if (meta.createdAt) {
        const created = new Date(meta.createdAt).toLocaleDateString('fr-FR');
        infoContainer.innerHTML += `
          <div class="meta-item">
            <div class="meta-icon">📅</div>
            <div class="meta-label">Créée</div>
            <div class="meta-value">${created}</div>
          </div>
        `;
      }
      
      detailsContainer.insertBefore(infoContainer, detailsContainer.children[1]);      
    }); 


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
          const formatted = formatter(key, value);
          if (/<.*>/.test(formatted)) {
            p.innerHTML = formatted;
          } else {
            p.textContent = formatted;
          }
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
  
    const avatarRow = document.createElement('div');
    avatarRow.style.display = 'flex';
    avatarRow.style.alignItems = 'center';
    avatarRow.style.justifyContent = 'center';
    avatarRow.style.gap = '14px';
    avatarRow.style.margin = '0 0 18px 0';
    const avatarProfile = document.createElement('div');
    avatarProfile.className = 'avatar';
    avatarProfile.style.margin = '0';
    avatarProfile.innerHTML = `<span>${channel[0].toUpperCase()}</span>`;
    const nameLink = document.createElement('a');
    nameLink.href = `https://twitch.tv/${channel}`;
    nameLink.target = '_blank';
    nameLink.className = 'channel-link';
    nameLink.style.fontSize = '20px';
    nameLink.style.fontWeight = 'bold';
    nameLink.textContent = channel;
    avatarRow.appendChild(avatarProfile);
    avatarRow.appendChild(nameLink);
    detailsContainer.appendChild(avatarRow);

    insertLiveInfo(channel.toLowerCase(), detailsContainer);

    setAvatar(avatarProfile, channel.toLowerCase(), sessions);  
  
    const externalLink = document.createElement('p');
    externalLink.innerHTML = `🔗 <a href="https://twitchtracker.com/${channel}" target="_blank" class="external-link">Voir sur TwitchTracker</a>`;
    detailsContainer.appendChild(externalLink);
  
    const totalText = document.createElement('p');
    totalText.innerHTML = `⏱ <strong>Temps total</strong> : ${formatTime(total)}`;
    detailsContainer.appendChild(totalText);
  
    const avgText = document.createElement('p');
    avgText.innerHTML = `📊 <strong>Moyenne par jour</strong> : ${formatTime(Math.round(average))}`;
    detailsContainer.appendChild(avgText);
  
    const favBtn = document.createElement('button');
    favBtn.className = 'reset-button fav-btn';
    favBtn.innerHTML = favorites.includes(channel.toLowerCase())
      ? '⭐ Retirer des favoris'
      : '⭐ Ajouter aux favoris';
    favBtn.addEventListener('click', () => {
      toggleFavorite(channel);
      document.getElementById('backButton').click();
    });
    detailsContainer.appendChild(favBtn);
  
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'reset-button delete-btn';
    deleteBtn.innerHTML = '🗑️ Supprimer cette chaîne';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Supprimer toutes les données pour ${channel} ?`)) {
        deleteChannelData(channel);
      }
    });
    detailsContainer.appendChild(deleteBtn);
  
    const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    const catSection = createExpandableList(
      "🎮 Par catégorie :",
      sortedCats,
      (cat, sec) => `<span class=\"cat-label\" title=\"${cat}\">${cat}</span> : ${formatTime(sec)}`
    );
    detailsContainer.appendChild(catSection);
  
    const sortedDays = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));
    const daySection = createExpandableList("📅 Par jour :", sortedDays, (date, sec) => `${date} : ${formatTime(sec)}`);
    detailsContainer.appendChild(daySection);

    isTwitchApiAvailable((hasApi) => {
      if (!hasApi) return;
    
      const refreshBtn = document.createElement('button');
      refreshBtn.className = 'reset-button';
      refreshBtn.textContent = '🔄 Mettre à jour';
    
      const feedbackMsg = document.createElement('p');
      feedbackMsg.style.color = '#38bdf8';
      feedbackMsg.style.fontSize = '14px';
      feedbackMsg.style.marginTop = '6px';
    
      refreshBtn.addEventListener('click', () => {
        const lowerChannel = channel.toLowerCase();
      
        // Supprimer l'avatar en cache
        chrome.storage.local.get(['avatars'], (result) => {
          const avatars = result.avatars || {};
          delete avatars[lowerChannel];
          chrome.storage.local.set({ avatars }, () => {
            const avatarDiv = detailsContainer.querySelector('.avatar');
            if (avatarDiv) {
              setAvatar(avatarDiv, lowerChannel, sessions, () => {
                // Maintenant mettre à jour les données Twitch
                fetchAndStoreTwitchMeta(lowerChannel, (meta) => {
                  if (meta) {
                    showChannelDetails(lowerChannel, sessions);
                    feedbackMsg.textContent = '✅ Mise à jour effectuée';
                  } else {
                    feedbackMsg.textContent = '❌ Erreur lors de la mise à jour';
                  }
                  setTimeout(() => (feedbackMsg.textContent = ''), 2500);
                }, true); // 🔁 Force refresh
              });
            }
          });
        });
      });      
    
      // 🔼 Ajoute les éléments AVANT le bouton supprimer
      detailsContainer.insertBefore(refreshBtn, deleteBtn);
      detailsContainer.insertBefore(feedbackMsg, deleteBtn);
    });     
  
    detailsContainer.appendChild(deleteBtn);
  
    document.getElementById('mainView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    document.getElementById('backButton').style.display = 'block';
  }  

  function insertLiveInfo(channelName, container) {
    chrome.storage.local.get(['twitchApi', 'avatars'], (result) => {
      const { twitchApi, avatars = {} } = result;
      const meta = avatars[channelName.toLowerCase()];
      const userId = meta?.twitchId;
  
      if (!twitchApi?.clientId || !twitchApi?.token || !userId) return;
  
      const headers = {
        'Client-ID': twitchApi.clientId,
        'Authorization': `Bearer ${twitchApi.token}`
      };
  
      fetch(`https://api.twitch.tv/helix/streams?user_id=${userId}`, { headers })
        .then(res => res.json())
        .then(data => {
          const stream = data?.data?.[0];
          if (!stream) return;
  
          const game = stream.game_name;
          const title = stream.title;
          const diffMs = Date.now() - new Date(stream.started_at).getTime();
          const hours = Math.floor(diffMs / 3600000);
          const minutes = Math.floor((diffMs % 3600000) / 60000);
          const duration = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
          const liveText = `
            <div class="live-banner">
              🟣 En live depuis <strong>${duration}</strong> — 
              <span class="game-name">${stream.game_name}</span><br>
              <span class="stream-title">"${stream.title}"</span>
            </div>
          `;
            
          const p = document.createElement('p');
          p.innerHTML = liveText;
          p.style.marginTop = '8px';
          p.style.color = '#38bdf8';
          p.style.fontSize = '14px';
  
          container.insertBefore(p, container.querySelector('p')); // juste après l'avatar
        });
    });
  }  

function showCategoryDetails(category, sessions) {
  window.scrollTo(0, 0);
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
    p.innerHTML = `<span class="channel-link" style="cursor:pointer;">${name}</span> : ${formatTime(seconds)}`;
  
    const span = p.querySelector('span.channel-link');
    span.addEventListener('click', () => {
      showChannelDetails(name.toLowerCase(), sessions);
    });
  
    list.appendChild(p);
  }  

  detailsContainer.appendChild(list);

  document.getElementById('mainView').classList.add('hidden');
  document.getElementById('detailsView').classList.remove('hidden');
  document.getElementById('backButton').style.display = 'block';
}

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

// Ajoute une fonction utilitaire pour savoir si l'avatar doit être rafraîchi
function shouldRefreshAvatar(fetchedAt) {
  if (!fetchedAt) return true;
  const now = Date.now();
  const threeWeeks = 21 * 24 * 60 * 60 * 1000;
  return now - fetchedAt > threeWeeks;
}