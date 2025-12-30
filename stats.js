function formatDateKey(date) {
    return date.toISOString().split('T')[0];
  }
  
  function getLast7DaysStats(sessions) {
    const dates = getLast7DaysDates(); // exemple : ["2025-04-21", ..., "2025-04-27"]
    const total = {};
  
    console.log("[DEBUG] Dates à chercher :", dates);
  
    for (const date of dates) {
      const dayData = sessions[date];
      if (dayData) {
        console.log("[DEBUG] Données trouvées pour :", date, dayData);
        for (const [channel, seconds] of Object.entries(dayData)) {
          total[channel] = (total[channel] || 0) + seconds;
        }
      } else {
        console.log("[DEBUG] Rien pour :", date);
      }
    }
  
    console.log("[DEBUG] Résultat weeklyAggregate :", total);
    return total;
  }
  
  
  function getTotalByChannel(sessions) {
    const total = {};
    for (const [date, channels] of Object.entries(sessions)) {
      for (const [channel, seconds] of Object.entries(channels)) {
        total[channel] = (total[channel] || 0) + seconds;
      }
    }
    return total;
  }
  
  function getLast7DaysStats(sessions) {
    const dates = getLast7DaysDates();
    const total = {};
    for (const date of dates) {
      if (sessions[date]) {
        for (const [channel, seconds] of Object.entries(sessions[date])) {
          total[channel] = (total[channel] || 0) + seconds;
        }
      }
    }
    return total;
  }
  
  function getWeeklyStats(sessions) {
    const weekly = {};
    for (const [dateStr, channels] of Object.entries(sessions)) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const week = getISOWeek(date);
      const key = `${year}-W${week}`;
      if (!weekly[key]) weekly[key] = {};
      for (const [channel, seconds] of Object.entries(channels)) {
        weekly[key][channel] = (weekly[key][channel] || 0) + seconds;
      }
    }
    return weekly;
  }
  
  function getMonthlyStats(sessions) {
    const monthly = {};
    for (const [dateStr, channels] of Object.entries(sessions)) {
      const date = new Date(dateStr);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[month]) monthly[month] = {};
      for (const [channel, seconds] of Object.entries(channels)) {
        monthly[month][channel] = (monthly[month][channel] || 0) + seconds;
      }
    }
    return monthly;
  }
  
  function getAverageDailyTime(sessions, channel = null) {
    const totals = {};
    const count = {};
    for (const [date, channels] of Object.entries(sessions)) {
      for (const [chan, seconds] of Object.entries(channels)) {
        if (channel && chan !== channel) continue;
        totals[chan] = (totals[chan] || 0) + seconds;
        count[chan] = (count[chan] || 0) + 1;
      }
    }
    const averages = {};
    for (const [chan, totalSeconds] of Object.entries(totals)) {
      averages[chan] = Math.round(totalSeconds / count[chan]);
    }
    return averages;
  }
  
  function getISOWeek(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = new Date(target.getFullYear(), 0, 4);
    const diff = target - firstThursday;
    return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  }
  
  function getStatsForChannel(sessions, channel) {
    let total = 0;
    const byDay = {};
    const byWeek = {};
    const byMonth = {};

    for (const [dateStr, channels] of Object.entries(sessions)) {
      if (channels[channel]) {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const week = getISOWeek(date);
        const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        total += channels[channel];
        byDay[dateStr] = channels[channel];
        byWeek[`${year}-W${week}`] = (byWeek[`${year}-W${week}`] || 0) + channels[channel];
        byMonth[month] = (byMonth[month] || 0) + channels[channel];
      }
    }

    const averagePerDay = total / Object.keys(byDay).length;

    return {
      total,
      byDay,
      byWeek,
      byMonth,
      averagePerDay: Math.round(averagePerDay)
    };
  }

  /**
   * Récupère toutes les sessions pour une chaîne donnée
   * @param {Object} sessions - Les données de sessions
   * @param {string} channel - Le nom de la chaîne (en minuscules)
   * @returns {Array} Tableau d'objets { date: string, time: string, datetime: Date, duration: number }
   */
  function getSessionStartTimes(sessions, channel) {
    const sessionList = [];
    const lowerChannel = channel.toLowerCase();

    for (const [dateStr, channels] of Object.entries(sessions)) {
      const channelData = channels[lowerChannel];
      // Utiliser sessionList si disponible, sinon fallback sur sessionStartTimes (anciennes données)
      if (channelData) {
        if (channelData.sessionList && Array.isArray(channelData.sessionList)) {
          // Nouvelle structure : sessionList avec durée
          for (const session of channelData.sessionList) {
            if (session.duration >= 60) { // Seulement les sessions >= 1 minute
              const datetime = new Date(session.startTime);
              sessionList.push({
                date: dateStr,
                time: datetime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                datetime: datetime,
                iso: session.startTime,
                duration: session.duration
              });
            }
          }
        } else if (channelData.sessionStartTimes && Array.isArray(channelData.sessionStartTimes) && (channelData.total || 0) >= 60) {
          // Ancienne structure : sessionStartTimes (compatibilité)
          for (const timeISO of channelData.sessionStartTimes) {
            const datetime = new Date(timeISO);
            sessionList.push({
              date: dateStr,
              time: datetime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
              datetime: datetime,
              iso: timeISO,
              duration: null // Durée inconnue pour les anciennes données
            });
          }
        }
      }
    }

    // Trier par date/heure (plus ancien en premier)
    return sessionList.sort((a, b) => a.datetime - b.datetime);
  }

  /**
   * Analyse les heures de début de session pour déterminer les horaires de visionnage préférés
   * @param {Object} sessions - Les données de sessions
   * @param {string} channel - Le nom de la chaîne (optionnel, si null analyse toutes les chaînes)
   * @returns {Object} Statistiques par heure (0-23)
   */
  function getWatchingHoursDistribution(sessions, channel = null) {
    const hoursCount = {};
    const lowerChannel = channel ? channel.toLowerCase() : null;

    // Initialiser toutes les heures à 0
    for (let h = 0; h < 24; h++) {
      hoursCount[h] = 0;
    }

    for (const [dateStr, channels] of Object.entries(sessions)) {
      for (const [chan, channelData] of Object.entries(channels)) {
        if (lowerChannel && chan !== lowerChannel) continue;
        
        if (channelData) {
          if (channelData.sessionList && Array.isArray(channelData.sessionList)) {
            // Nouvelle structure : sessionList
            for (const session of channelData.sessionList) {
              if (session.duration >= 60) { // Seulement les sessions >= 1 minute
                const datetime = new Date(session.startTime);
                const hour = datetime.getHours();
                hoursCount[hour] = (hoursCount[hour] || 0) + 1;
              }
            }
          } else if (channelData.sessionStartTimes && Array.isArray(channelData.sessionStartTimes) && (channelData.total || 0) >= 60) {
            // Ancienne structure : sessionStartTimes (compatibilité)
            for (const timeISO of channelData.sessionStartTimes) {
              const datetime = new Date(timeISO);
              const hour = datetime.getHours();
              hoursCount[hour] = (hoursCount[hour] || 0) + 1;
            }
          }
        }
      }
    }

    return hoursCount;
  }