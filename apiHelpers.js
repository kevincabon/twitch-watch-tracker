async function fetchTwitchUser(channelName) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['twitchApi'], async ({ twitchApi }) => {
        if (!twitchApi || !twitchApi.clientId || !twitchApi.token) {
          return reject('Aucune clé API configurée.');
        }
  
        try {
          const response = await fetch(`https://api.twitch.tv/helix/users?login=${channelName}`, {
            headers: {
              'Client-ID': twitchApi.clientId,
              'Authorization': `Bearer ${twitchApi.token}`
            }
          });
  
          if (!response.ok) return reject('Erreur API Twitch');
          const json = await response.json();
          if (!json.data || !json.data.length) return reject('Aucun utilisateur trouvé');
  
          const user = json.data[0];
          resolve({
            id: user.id,
            displayName: user.display_name,
            profileImageUrl: user.profile_image_url
          });
        } catch (err) {
          reject(err);
        }
      });
    });
}

function setAvatar(avatarDiv, channelName, sessionsData, cb) {
  chrome.storage.local.get(["avatars"], async (result) => {
    let avatars = result.avatars || {};
    let avatarInfo = avatars[channelName] || {};

    // Si on a une image récente stockée : l'utiliser
    if (avatarInfo.url && !shouldRefreshAvatar(avatarInfo.fetchedAt)) {
      avatarDiv.innerHTML = `<img src="${avatarInfo.url}" alt="${channelName}" width="32" height="32" style="border-radius:50%;width:32px;height:32px;">`;
      if (cb) cb();
      return;
    }

    // Sinon, on tente via l'API Twitch si elle est dispo
    try {
      const userInfo = await fetchTwitchUser(channelName);
      const url = userInfo.profileImageUrl;
      avatars[channelName] = {
        url,
        twitchId: userInfo.id,
        fetchedAt: Date.now()
      };
      chrome.storage.local.set({ avatars });
      avatarDiv.innerHTML = `<img src="${url}" alt="${channelName}" width="32" height="32" style="border-radius:50%;width:32px;height:32px;">`;
      if (cb) cb();
    } catch (err) {
      // fallback avec initiale
      avatarDiv.innerHTML = `<span>${channelName[0].toUpperCase()}</span>`;
      if (cb) cb();
    }
  });
}