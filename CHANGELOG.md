# 📝 Changelog

Toutes les modifications importantes de Twitch Watch Tracker seront listées ici.

## [v0.4.7-beta] - 2025-05-14

### Ajouté
- 🆕 Ajout d’une barre de recherche permettant de filtrer dynamiquement les chaînes dans la popup
- Fonctionne sur tous les modes d'affichage (total, 7 jours, semaine, mois, catégorie)
- Supporte la recherche partielle (saisie en direct)

### Technique
- Ajout d’un attribut `data-channel` aux cartes pour faciliter le filtrage

---

## [v0.4.6-beta] - 2025-05-14

### Ajouté
- Section "📺 En cours de lecture" dans la popup, affichant les chaînes actives en temps réel
- Statuts visuels (▶️, ⏸️, 🔇) en fonction de l’état du stream
- Lien vers TwitchTracker sur la page de détails des chaînes

### Amélioré
- Affichage plus compact du lien externe sous le nom de la chaîne
- Séparateur visuel harmonisé pour une interface plus propre

### Corrigé
- Nettoyage automatique des chaînes inactives dans `currentWatching`

---

## [0.4.5-beta] - 2025-05-12

### Ajouté
- Affichage dans les graphiques des jours sans activité (0 minute ou équivalent).
- Indicateurs visuels clairs pour les jours non visionnés dans les vues par semaine.

### Modifié
- Classement des semaines et des mois passé en ordre chronologique (au lieu du temps de visionnage).

---

## [0.4.4-beta] - 2025-04-27

## Nouveautés
- 🚀 Ajout d'une vue détaillée lorsqu'on clique sur un mois dans la section "Par mois".
- 📈 Affichage des semaines du mois sélectionné avec leur durée de visionnage.
- 🖼️ Ajout d'un graphique dynamique via Chart.js pour voir la répartition du temps de visionnage par semaine.
- 🎨 Amélioration visuelle pour garder une cohérence entre l'affichage des jours, des semaines, et des mois.

## Corrections mineures
- Optimisation du code pour une meilleure maintenabilité.
- Uniformisation des noms de semaines et de mois.

---

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