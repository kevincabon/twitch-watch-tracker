// options.js

document.addEventListener('DOMContentLoaded', () => {
  const clientIdInput = document.getElementById('clientId');
  const tokenInput = document.getElementById('token');
  const form = document.getElementById('twitchApiForm');
  const message = document.getElementById('optionsMessage');

  // Charger les infos API si elles existent
  chrome.storage.local.get(['twitchApi'], (result) => {
    if (result.twitchApi) {
      clientIdInput.value = result.twitchApi.clientId || '';
      tokenInput.value = result.twitchApi.token || '';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const clientId = clientIdInput.value.trim();
    const token = tokenInput.value.trim();
    chrome.storage.local.set({ twitchApi: { clientId, token } }, () => {
        message.textContent = '✅ Identifiants API sauvegardés !';

        // Appel pour récupérer l'ID utilisateur
        fetch("https://api.twitch.tv/helix/users", {
          headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${token}`
          }
        })
        .then(res => res.json())
        .then(data => {
          const user = data?.data?.[0];
          if (user?.id) {
            chrome.storage.local.set({ twitchApi: { clientId, token, userId: user.id } }, () => {
              console.log("✅ userId ajouté :", user.id);
            });
          }
        })
        .catch(err => console.error("Erreur récupération userId :", err));
      
        setTimeout(() => { message.textContent = ''; }, 2000);
    });
  });

  // Gestion de la sauvegarde automatique
  const autoBackupEnabled = document.getElementById('autoBackupEnabled');
  const autoBackupInterval = document.getElementById('autoBackupInterval');
  const autoBackupStorageType = document.getElementById('autoBackupStorageType');
  const saveAutoBackupSettings = document.getElementById('saveAutoBackupSettings');
  
  // Charger les paramètres de sauvegarde automatique
  chrome.storage.local.get(['autoBackupSettings'], (result) => {
    const settings = result.autoBackupSettings || { enabled: false, interval: 1440, storageType: 'storage' };
    autoBackupEnabled.checked = settings.enabled;
    
    // Gestion de la compatibilité avec les anciennes valeurs (en heures)
    // On détecte si c'est une ancienne valeur en heures seulement si c'est une valeur "typique" en heures
    // (1, 2, 3, 6, 12, 24, 48, 72, 168) ET qu'elle est < 24 heures (1440 minutes)
    // Cela évite de convertir des valeurs en minutes comme 1, 2, 3, 5, 10, etc.
    const typicalHourValues = [24, 48, 72, 168]; // Seulement les valeurs vraiment typiques en heures (> 1 jour)
    if (settings.interval && settings.interval <= 168 && typicalHourValues.includes(settings.interval)) {
      // C'est probablement une ancienne valeur en heures (typique), convertir en minutes
      const convertedValue = settings.interval * 60;
      autoBackupInterval.value = convertedValue;
      // Mettre à jour la valeur dans le storage pour éviter de reconvertir
      chrome.storage.local.set({ 
        autoBackupSettings: { 
          ...settings, 
          interval: convertedValue 
        } 
      });
    } else {
      // Utiliser la valeur telle quelle (déjà en minutes ou valeur non typique)
      autoBackupInterval.value = settings.interval || 1440; // 1440 minutes = 24 heures par défaut
    }
    autoBackupStorageType.value = settings.storageType || 'storage';
    
    // Charger l'info de la prochaine sauvegarde
    updateNextBackupInfo();
  });
  
  // Fonction pour mettre à jour l'affichage de la prochaine sauvegarde
  function updateNextBackupInfo() {
    const nextBackupInfo = document.getElementById('nextBackupInfo');
    const nextBackupTime = document.getElementById('nextBackupTime');
    
    chrome.storage.local.get(['autoBackupSettings'], (result) => {
      const settings = result.autoBackupSettings || { enabled: false, interval: 1440 };
      
      if (!settings.enabled) {
        nextBackupInfo.style.display = 'none';
        return;
      }
      
      nextBackupInfo.style.display = 'block';
      nextBackupTime.textContent = 'Chargement...';
      
      // Récupérer l'alarme
      chrome.alarms.get('autoBackup', (alarm) => {
        if (alarm && alarm.scheduledTime) {
          const nextDate = new Date(alarm.scheduledTime);
          const now = new Date();
          
          // Formater la date/heure
          const dateStr = nextDate.toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          // Calculer le temps restant
          const diffMs = nextDate - now;
          if (diffMs > 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeRemaining = '';
            if (diffHours > 0) {
              timeRemaining = diffMinutes > 0 ? ` (dans ${diffHours}h ${diffMinutes}min)` : ` (dans ${diffHours}h)`;
            } else if (diffMinutes > 0) {
              timeRemaining = ` (dans ${diffMinutes}min)`;
            } else {
              timeRemaining = ' (bientôt)';
            }
            
            nextBackupTime.textContent = `${dateStr}${timeRemaining}`;
          } else {
            // L'alarme est passée, calculer la prochaine occurrence
            const intervalMinutes = settings.interval || 1440; // en minutes maintenant
            const intervalMs = intervalMinutes * 60 * 1000;
            const nextOccurrence = new Date(now.getTime() + intervalMs);
            const nextDateStr = nextOccurrence.toLocaleString('fr-FR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            });
            nextBackupTime.textContent = `${nextDateStr} (calcul en cours...)`;
          }
        } else {
          // Pas d'alarme encore, calculer basé sur l'intervalle
          const intervalMinutes = settings.interval || 1440; // en minutes maintenant
          const now = new Date();
          const nextOccurrence = new Date(now.getTime() + (intervalMinutes * 60 * 1000));
          const nextDateStr = nextOccurrence.toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          nextBackupTime.textContent = `${nextDateStr} (alarme en cours de configuration)`;
        }
      });
    });
  }
  
  // Mettre à jour l'info toutes les minutes
  setInterval(updateNextBackupInfo, 60000);
  
  // Créer une sauvegarde manuelle
  document.getElementById('createManualBackup').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'createManualBackup' }, (response) => {
      if (response && response.success) {
        message.textContent = '✅ Sauvegarde créée !';
        loadBackupsList(); // Recharger la liste
        setTimeout(() => { message.textContent = ''; }, 2000);
      } else {
        message.textContent = '❌ Erreur lors de la création';
        setTimeout(() => { message.textContent = ''; }, 3000);
      }
    });
  });
  
  // Sauvegarder les paramètres de sauvegarde automatique
  saveAutoBackupSettings.addEventListener('click', () => {
    const enabled = autoBackupEnabled.checked;
    const interval = parseInt(autoBackupInterval.value) || 1440; // en minutes
    const storageType = autoBackupStorageType.value;
    
    if (interval < 1 || interval > 10080) {
      message.textContent = '❌ Intervalle invalide (1-10080 minutes)';
      setTimeout(() => { message.textContent = ''; }, 3000);
      return;
    }
    
    chrome.storage.local.set({ autoBackupSettings: { enabled, interval, storageType } }, () => {
      const storageText = storageType === 'download' ? ' (téléchargement automatique)' : ' (stockage local)';
      const intervalText = interval < 60 
        ? `${interval} min` 
        : interval % 60 === 0 
          ? `${interval / 60}h` 
          : `${Math.floor(interval / 60)}h ${interval % 60}min`;
      message.textContent = enabled 
        ? `✅ Sauvegarde automatique activée (toutes les ${intervalText}${storageText})` 
        : '✅ Sauvegarde automatique désactivée';
      setTimeout(() => { message.textContent = ''; }, 3000);
      loadBackupsList(); // Recharger la liste des backups
      updateNextBackupInfo(); // Mettre à jour l'info de la prochaine sauvegarde
    });
  });
  
  // Charger et afficher la liste des backups
  function loadBackupsList() {
    chrome.storage.local.get(['autoBackupSettings'], (settingsResult) => {
      const settings = settingsResult.autoBackupSettings || { storageType: 'storage' };
      const infoDiv = document.getElementById('backupsInfo');
      const infoText = document.getElementById('backupsInfoText');
      
      if (settings.storageType === 'download') {
        infoDiv.style.display = 'block';
        infoText.textContent = '💡 Les backups sont téléchargés automatiquement dans votre dossier Téléchargements. Ils ne sont pas listés ici.';
        document.getElementById('backupsContainer').innerHTML = '<p style="color: #c4c4cc; font-size: 14px;">Les backups en mode téléchargement sont sauvegardés dans votre dossier Téléchargements</p>';
        return;
      }
      
      infoDiv.style.display = 'none';
      
      chrome.runtime.sendMessage({ action: 'getBackups' }, (response) => {
        const container = document.getElementById('backupsContainer');
        if (!response || !response.backups || response.backups.length === 0) {
          container.innerHTML = '<p style="color: #c4c4cc; font-size: 14px;">Aucune sauvegarde automatique disponible</p>';
          return;
        }
      
      container.innerHTML = response.backups.map((backup, index) => {
        const date = new Date(backup.timestamp);
        const dateStr = date.toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return `
          <div style="background: #1f1f23; border: 1px solid #3a3a40; border-radius: 8px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 600; color: #e5e5ff; margin-bottom: 4px;">Sauvegarde #${index + 1}</div>
              <div style="font-size: 13px; color: #c4c4cc;">${dateStr}</div>
            </div>
            <div style="display: flex; gap: 6px;">
              <button class="backup-action-btn" data-action="download" data-key="${backup.key}" style="padding: 6px 12px; background: #9146ff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">📥 Télécharger</button>
              <button class="backup-action-btn" data-action="restore" data-key="${backup.key}" style="padding: 6px 12px; background: #38bdf8; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🔄 Restaurer</button>
              <button class="backup-action-btn" data-action="delete" data-key="${backup.key}" style="padding: 6px 12px; background: #ff4c4c; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
      
      // Ajouter les écouteurs d'événements aux boutons
      container.querySelectorAll('.backup-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const action = btn.getAttribute('data-action');
          const backupKey = btn.getAttribute('data-key');
          
          if (action === 'download') {
            downloadBackup(backupKey);
          } else if (action === 'restore') {
            if (confirm('⚠️ Voulez-vous restaurer cette sauvegarde ? Les données actuelles seront remplacées.')) {
              restoreBackup(backupKey);
            }
          } else if (action === 'delete') {
            if (confirm('⚠️ Voulez-vous supprimer cette sauvegarde ?')) {
              deleteBackup(backupKey);
            }
          }
        });
      });
    });
    });
  }
  
  function downloadBackup(backupKey) {
    chrome.runtime.sendMessage({ action: 'downloadBackup', backupKey: backupKey }, (response) => {
      if (response && response.success) {
        const blob = new Blob([JSON.stringify(response.data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().replace('T', '__').replace(/\..+/, '');
        a.href = url;
        a.download = `twitch_watch_backup_${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);
        message.textContent = '✅ Backup téléchargé !';
        setTimeout(() => { message.textContent = ''; }, 2000);
      } else {
        message.textContent = '❌ Erreur lors du téléchargement';
        setTimeout(() => { message.textContent = ''; }, 3000);
      }
    });
  }
  
  function restoreBackup(backupKey) {
    chrome.runtime.sendMessage({ action: 'restoreBackup', backupKey: backupKey }, (response) => {
      if (response && response.success) {
        message.textContent = '✅ Backup restauré ! Rechargement...';
        setTimeout(() => { window.location.reload(); }, 1500);
      } else {
        message.textContent = '❌ Erreur lors de la restauration';
        setTimeout(() => { message.textContent = ''; }, 3000);
      }
    });
  }
  
  function deleteBackup(backupKey) {
    chrome.runtime.sendMessage({ action: 'deleteBackup', backupKey: backupKey }, (response) => {
      if (response && response.success) {
        message.textContent = '✅ Backup supprimé !';
        loadBackupsList();
        setTimeout(() => { message.textContent = ''; }, 2000);
      } else {
        message.textContent = '❌ Erreur lors de la suppression';
        setTimeout(() => { message.textContent = ''; }, 3000);
      }
    });
  }
  
  // Charger la liste des backups au chargement de la page
  loadBackupsList();
  
  // Import/Export/Reset (identique à la popup)
  document.getElementById('exportButton').addEventListener('click', exportData);
  document.getElementById('importButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('resetButton').addEventListener('click', resetData);
  document.getElementById('fileInput').addEventListener('change', importData);

  function exportData() {
    chrome.storage.local.get(null, (items) => {
      // Ajouter les métadonnées de sauvegarde en premier
      const timestamp = new Date();
      const dataToExport = {
        _backupMetadata: {
          backupDate: timestamp.toISOString(),
          backupDateFormatted: timestamp.toLocaleString('fr-FR', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            timeZoneName: 'short'
          }),
          backupTimestamp: timestamp.getTime(),
          version: '0.5.4'
        }
      };
      
      // Filtrer les données à exporter (exclure les backups précédents et les settings)
      for (const key in items) {
        if (!key.startsWith('autoBackup_') && key !== 'autoBackupSettings') {
          dataToExport[key] = items[key];
        }
      }
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date().toISOString().replace('T', '__').replace(/\..+/, '');
      a.href = url;
      a.download = `twitch_watch_data_${now}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.textContent = '✅ Données exportées !';
      setTimeout(() => { message.textContent = ''; }, 2000);
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
          message.textContent = '✅ Données importées !';
          setTimeout(() => { message.textContent = ''; }, 2000);
          setTimeout(() => { window.location.reload(); }, 800);
        });
      } catch (err) {
        message.textContent = '❌ Fichier invalide.';
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (confirm('⚠️ Êtes-vous sûr de vouloir tout réinitialiser ?')) {
      chrome.storage.local.clear(() => {
        message.textContent = '✅ Données réinitialisées.';
        setTimeout(() => { message.textContent = ''; }, 2000);
        setTimeout(() => { window.location.reload(); }, 800);
      });
    }
  }
}); 

  