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
      setTimeout(() => { message.textContent = ''; }, 2000);
    });
  });

  // Import/Export/Reset (identique à la popup)
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