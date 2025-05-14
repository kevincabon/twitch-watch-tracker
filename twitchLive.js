function fetchLiveStatuses(channelIds, callback) {
    chrome.storage.local.get(['twitchApi'], (result) => {
      const { twitchApi } = result;
      if (!twitchApi?.clientId || !twitchApi?.token || !Array.isArray(channelIds) || channelIds.length === 0) {
        return callback({});
      }
  
      const headers = {
        'Client-ID': twitchApi.clientId,
        'Authorization': `Bearer ${twitchApi.token}`
      };
  
      const params = new URLSearchParams();
      channelIds.slice(0, 100).forEach(id => params.append('user_id', id));
  
      fetch(`https://api.twitch.tv/helix/streams?${params.toString()}`, { headers })
        .then(res => res.json())
        .then(data => {
          const liveMap = {};
          for (const stream of data.data || []) {
            liveMap[stream.user_id] = {
              title: stream.title,
              gameName: stream.game_name,
              startedAt: stream.started_at,
              isLive: true
            };
          }
          callback(liveMap);
        })
        .catch(() => callback({}));
    });
  }
  
  function formatDurationSince(isoStartTime) {
    const start = new Date(isoStartTime);
    const now = new Date();
    const diffMs = now - start;
  
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  }
  