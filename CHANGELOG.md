# 📝 Changelog

Toutes les modifications importantes de Twitch Watch Tracker seront listées ici.

## [0.4.3-beta] - 2025-04-26

### Fixed
- Résolution d'un bug où la catégorie du jeu n'était pas correctement détectée lorsqu'un streamer utilisait la fonctionnalité "Streamer ensemble" ou "Stream Together" de Twitch.
- La catégorie réelle du jeu est maintenant correctement récupérée pour le tracking.

### Misc
- Légères optimisations de la fonction `getCurrentCategory()` pour une meilleure robustesse.

---

## [0.4.2-beta] - 2025-04-26

### Ajouts
- Support complet du **multi-streams** : plusieurs streams ouverts peuvent être suivis en parallèle (Pause, Mute, Playing).
- Chaque stream sauvegarde désormais son **propre statut** dans `currentWatching`.
- Affichage d'un **overlay** stylisé (semi-transparent, centré) en cas de Pause ou Mute sur un stream actif.
- Ajout d'un **nettoyage automatique** des streams inactifs (plus de 5 minutes sans mise à jour).

### Corrections
- Correction du bug où les bordures violettes restaient affichées sur des streams fermés.
- Correction de l'affichage erroné de l'overlay lorsque plusieurs streams sont ouverts.
- Suppression des entrées "fantômes" dans les statuts actifs.

### Qualité de vie
- Nettoyage automatique des données inutiles à chaque ouverture du popup.
- Code rendu plus scalable pour de futurs ajouts d'options de suivi avancé.

---

## [0.4.1-beta] - 2025-04-26
### Ajouté
- 🎯 Mise en évidence du streamer actuellement regardé dans la liste (bordure violette animée)
- 💾 Enregistrement de la chaîne en cours de visionnage (`currentChannelWatching`) dans `chrome.storage.local`
- 🎨 Nouveau style CSS "watching-now" (bordure et glow violet)
- 🧠 Amélioration UX pour mieux repérer en un coup d'œil le stream en cours

---

## [0.4.0-beta] - 2025-04-26
### Ajouté
- 🎥 Tracking automatique du temps passé sur Twitch
- 📊 Statistiques par chaîne, par catégorie, par jour, semaine, mois, 7 derniers jours
- ⭐ Gestion des favoris (ajout/retrait rapide)
- 🗑️ Suppression individuelle des données d'une chaîne
- 📈 Pagination pour éviter d'afficher trop de chaînes d'un coup
- 🧹 Nettoyage du design général inspiré de Twitch
- 📦 Import et export de données en JSON
- 🛡️ Ajout de la licence MIT