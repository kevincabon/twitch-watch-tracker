function fetchAndStoreTwitchMeta(channelName, callback, forceRefresh = false) {
    chrome.storage.local.get(['twitchApi', 'twitchMeta'], (result) => {
      const { twitchApi, twitchMeta = {} } = result;
      const lowerName = channelName.toLowerCase();
  
      if (!twitchApi?.clientId || !twitchApi?.token) return callback(null);
  
      if (!forceRefresh && twitchMeta[lowerName] && !shouldRefreshMeta(twitchMeta[lowerName].fetchedAt)) {
        return callback(twitchMeta[lowerName]);
      }      
  
      const headers = {
        'Client-ID': twitchApi.clientId,
        'Authorization': `Bearer ${twitchApi.token}`
      };
  
      // Obtenir les infos de base (id, login, etc.)
      fetch(`https://api.twitch.tv/helix/users?login=${lowerName}`, { headers })
        .then(res => res.json())
        .then(data => {
          const user = data?.data?.[0];
          if (!user) return callback(null);
  
          const userId = user.id;
          const createdAt = user.created_at;
  
          // Ensuite, on vérifie le follow
          fetch(`https://api.twitch.tv/helix/channels/followed?user_id=${twitchApi.userId}&broadcaster_id=${userId}`, { headers })
            .then(res => res.json())
            .then(followData => {
                const isFollowing = Array.isArray(followData.data) && followData.data.length > 0;
                const followedAt = isFollowing ? followData.data[0].followed_at : null;                
  
              // On ne peut pas savoir si partenaire/affilié via l’API Helix, sauf à deviner par `broadcaster_type`
              const meta = {
                displayName: user.display_name,
                id: userId,
                createdAt,
                isFollowing,
                followedAt,
                broadcasterType: user.broadcaster_type,
                fetchedAt: Date.now()
              };
  
              twitchMeta[lowerName] = meta;
              chrome.storage.local.set({ twitchMeta }, () => {
                callback(meta);
              });
            });
        })
        .catch(() => callback(null));
    });
  }
  
  function shouldRefreshMeta(fetchedAt) {
    if (!fetchedAt) return true;
    const now = Date.now();
    const threeWeeks = 21 * 24 * 60 * 60 * 1000;
    return now - fetchedAt > threeWeeks;
  }  