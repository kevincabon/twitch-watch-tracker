// background.js - Service Worker pour les sauvegardes automatiques

// Initialiser les alarmes au démarrage de l'extension
chrome.runtime.onInstalled.addListener(() => {
  initializeAutoBackup();
});

// Initialiser aussi au démarrage du service worker (au cas où onInstalled n'est pas appelé)
initializeAutoBackup();

// Écouter les changements de configuration de sauvegarde automatique
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.autoBackupSettings) {
    initializeAutoBackup();
  }
});

// Fonction pour initialiser/configurer la sauvegarde automatique
function initializeAutoBackup() {
  chrome.storage.local.get(['autoBackupSettings'], (result) => {
    const settings = result.autoBackupSettings || { enabled: false, interval: 1440, storageType: 'storage' };
    
    // Supprimer l'alarme existante si elle existe
    chrome.alarms.clear('autoBackup', () => {
      if (settings.enabled && settings.interval > 0) {
        // Créer une nouvelle alarme
        // interval est maintenant en minutes, utiliser directement
        const periodInMinutes = settings.interval;
        
        chrome.alarms.create('autoBackup', {
          periodInMinutes: periodInMinutes
        });
        const storageText = settings.storageType === 'download' ? ' (téléchargement)' : ' (stockage local)';
        const intervalText = periodInMinutes < 60 
          ? `${periodInMinutes} min` 
          : periodInMinutes % 60 === 0 
            ? `${periodInMinutes / 60}h` 
            : `${Math.floor(periodInMinutes / 60)}h ${periodInMinutes % 60}min`;
        console.log(`[AutoBackup] Sauvegarde automatique activée (toutes les ${intervalText}${storageText})`);
      } else {
        console.log('[AutoBackup] Sauvegarde automatique désactivée');
      }
    });
  });
}

// Écouter les alarmes
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoBackup') {
    performAutoBackup();
  }
});

// Fonction pour effectuer la sauvegarde automatique
function performAutoBackup() {
  chrome.storage.local.get(null, (allData) => {
    const settings = allData.autoBackupSettings || { storageType: 'storage' };
    
    // Filtrer les données à sauvegarder (exclure les backups précédents et les settings)
    const dataToBackup = {};
    for (const key in allData) {
      if (!key.startsWith('autoBackup_') && key !== 'autoBackupSettings') {
        dataToBackup[key] = allData[key];
      }
    }
    
    const timestamp = new Date();
    
    // Ajouter les métadonnées de sauvegarde dans les données exportées
    dataToBackup._backupMetadata = {
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
    };
    // Formater la date de manière sûre pour les noms de fichiers (format: YYYY-MM-DD_HH-MM-SS)
    const year = timestamp.getFullYear();
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getDate()).padStart(2, '0');
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    const timestampStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    
    if (settings.storageType === 'download') {
      // Convertir les données en JSON
      const jsonData = JSON.stringify(dataToBackup, null, 2);
      
      // Créer une data URL (méthode la plus fiable pour chrome.downloads dans un service worker)
      // Utiliser encodeURIComponent pour créer une data URL
      try {
        const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);
        const filename = `twitch_watch_backup_${timestampStr}.json`;
        
        // Télécharger le fichier avec gestion des conflits
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: false,
          conflictAction: 'uniquify' // Ajouter un numéro si le fichier existe déjà
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            const errorMsg = chrome.runtime.lastError.message || 'Erreur inconnue';
            console.error('[AutoBackup] Erreur téléchargement:', errorMsg);
            
            // Fallback : stocker dans le storage local
            const backupKey = `autoBackup_${Date.now()}`;
            const backupData = {
              data: dataToBackup,
              timestamp: timestamp,
              version: '0.5.4'
            };
            chrome.storage.local.set({ [backupKey]: backupData }, () => {
              console.log(`[AutoBackup] Fallback: sauvegarde créée dans storage local: ${backupKey}`);
              cleanupOldBackups();
            });
          } else {
            console.log(`[AutoBackup] Backup téléchargé avec succès: ${filename} (ID: ${downloadId})`);
          }
        });
      } catch (error) {
        console.error('[AutoBackup] Erreur lors de la création de la data URL:', error);
        // Fallback : stocker dans le storage local
        const backupKey = `autoBackup_${Date.now()}`;
        const backupData = {
          data: dataToBackup,
          timestamp: timestamp,
          version: '0.5.4'
        };
        chrome.storage.local.set({ [backupKey]: backupData }, () => {
          console.log(`[AutoBackup] Fallback (erreur): sauvegarde créée dans storage local: ${backupKey}`);
          cleanupOldBackups();
        });
      }
    } else {
      // Stocker dans chrome.storage.local (comportement par défaut)
      const backupKey = `autoBackup_${Date.now()}`;
      const backupData = {
        data: dataToBackup,
        timestamp: timestamp,
        version: '0.5.4'
      };
      
      chrome.storage.local.set({ [backupKey]: backupData }, () => {
        console.log(`[AutoBackup] Sauvegarde créée: ${backupKey}`);
        
        // Nettoyer les anciens backups (garder seulement les 10 derniers)
        cleanupOldBackups();
      });
    }
  });
}

// Fonction pour nettoyer les anciens backups
function cleanupOldBackups() {
  chrome.storage.local.get(null, (allData) => {
    const backupKeys = [];
    
    // Collecter toutes les clés de backup
    for (const key in allData) {
      if (key.startsWith('autoBackup_')) {
        backupKeys.push(key);
      }
    }
    
    // Trier par timestamp (du plus récent au plus ancien)
    backupKeys.sort((a, b) => {
      const timestampA = parseInt(a.replace('autoBackup_', ''));
      const timestampB = parseInt(b.replace('autoBackup_', ''));
      return timestampB - timestampA; // Ordre décroissant
    });
    
    // Supprimer les backups au-delà des 10 derniers
    const MAX_BACKUPS = 10;
    if (backupKeys.length > MAX_BACKUPS) {
      const keysToRemove = backupKeys.slice(MAX_BACKUPS);
      chrome.storage.local.remove(keysToRemove, () => {
        console.log(`[AutoBackup] ${keysToRemove.length} ancien(s) backup(s) supprimé(s)`);
      });
    }
  });
}

// Fonction pour récupérer la liste des backups (appelée depuis options.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBackups') {
    chrome.storage.local.get(null, (allData) => {
      const backups = [];
      for (const key in allData) {
        if (key.startsWith('autoBackup_')) {
          const backup = allData[key];
          backups.push({
            key: key,
            timestamp: backup.timestamp,
            timestampNumber: parseInt(key.replace('autoBackup_', ''))
          });
        }
      }
      // Trier par date (du plus récent au plus ancien)
      backups.sort((a, b) => b.timestampNumber - a.timestampNumber);
      sendResponse({ backups: backups });
    });
    return true; // Indique une réponse asynchrone
  }
  
  if (request.action === 'restoreBackup') {
    chrome.storage.local.get([request.backupKey], (result) => {
      if (result[request.backupKey]) {
        const backupData = result[request.backupKey].data;
        chrome.storage.local.set(backupData, () => {
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: false, error: 'Backup non trouvé' });
      }
    });
    return true;
  }
  
  if (request.action === 'deleteBackup') {
    chrome.storage.local.remove([request.backupKey], () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'downloadBackup') {
    chrome.storage.local.get([request.backupKey], (result) => {
      if (result[request.backupKey]) {
        const backupData = result[request.backupKey].data;
        sendResponse({ success: true, data: backupData });
      } else {
        sendResponse({ success: false, error: 'Backup non trouvé' });
      }
    });
    return true;
  }
  
  if (request.action === 'createManualBackup') {
    performAutoBackup();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'getNextBackupTime') {
    chrome.alarms.get('autoBackup', (alarm) => {
      if (alarm && alarm.scheduledTime) {
        sendResponse({ success: true, scheduledTime: alarm.scheduledTime });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }
});

