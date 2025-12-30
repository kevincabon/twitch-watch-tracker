# 📝 Changelog

Toutes les modifications importantes de Twitch Watch Tracker seront listées ici.

## [v0.5.4] - 2025-12-30

### 🐛 Corrigé
- **Bug critique du watch time total** : Correction d'une race condition entre `saveWatchTime()` et `saveSession()` qui empêchait l'accumulation du temps total après quelques secondes
  - Ajout d'une double vérification dans `saveSession()` pour préserver le total mis à jour par `saveWatchTime()`
  - Utilisation de `Math.max()` pour éviter d'écraser les mises à jour récentes
  - Délai de 500ms pour éviter les conflits entre les deux fonctions
  - Le watch time total s'accumule maintenant correctement pendant toute la durée de visionnage

### ✨ Ajouté
- 💾 **Système de backup automatique** :
  - Sauvegarde périodique automatique via `chrome.alarms` (configurable dans les options)
  - Deux modes de sauvegarde : stockage local ou téléchargement de fichier JSON
  - Nettoyage automatique : conservation des 10 derniers backups
  - Métadonnées incluses dans chaque backup : date, version, timestamp
  - Interface de gestion complète dans les options :
    - Liste des backups disponibles
    - Restauration d'un backup
    - Suppression de backups
    - Téléchargement manuel d'un backup
    - Création manuelle d'un backup
    - Affichage de la prochaine sauvegarde automatique
  - Fallback automatique vers stockage local en cas d'erreur de téléchargement
  - Permissions ajoutées : `alarms` et `downloads` dans le manifest

### 🔧 Amélioré
- **Robustesse** : Meilleure gestion des race conditions dans les opérations de stockage
- **Performance** : Optimisation des appels asynchrones pour éviter les conflits

---

## [v0.5.3-beta] - 2025-12-29

### ✨ Ajouté
- 🕐 **Tracking des sessions individuelles** :
  - Enregistrement de l'heure de début de chaque session
  - Durée précise de chaque session
  - Catégories visionnées par session
- 📊 **Section "Horaires de visionnage"** dans les détails des chaînes :
  - Graphique en barres montrant la distribution des sessions par heure (0h-23h)
  - Liste des 10 dernières sessions avec date, heure de début et durée
  - Statistiques : heure préférée et total de sessions
- 🗑️ **Suppression de sessions individuelles** :
  - Bouton de suppression (🗑️) à côté de chaque session
  - Confirmation avant suppression
  - Mise à jour automatique des statistiques après suppression

### 🔧 Amélioré
- ⏱️ **Filtrage intelligent** : seules les sessions d'au moins 1 minute sont comptabilisées
- 🔄 **Mise à jour automatique** : les sessions existantes sont mises à jour si la durée augmente (au lieu de créer des doublons)
- 💾 **Sauvegarde automatique** :
  - Sauvegarde périodique toutes les 2 minutes si la session dure >= 1 minute
  - Sauvegarde à la fermeture de l'onglet ou changement d'onglet
- ⏸️ **Gestion des pauses/muets** : le temps ne s'accumule pas pendant les pauses ou quand le stream est muet, mais la session continue (cohérent avec le watch time total)

### 🐛 Corrigé
- 🔒 **Robustesse améliorée** : gestion des erreurs "Extension context invalidated"
- 🛡️ **Protection contre les valeurs null** : vérifications supplémentaires pour éviter les erreurs lors des changements de page
- 🧹 **Nettoyage** : suppression de tous les logs de debug

### Technique
- Structure de données étendue : `sessionList` dans chaque entrée de chaîne pour stocker les sessions individuelles
- Compatibilité ascendante : les anciennes données continuent de fonctionner
- Optimisation : évite les sauvegardes multiples de la même session

---

## [v0.5.2-beta] - 2025-05-14

### Ajouté
- 🟣 Intégration partielle de l’API Twitch (si activée via options)
- Affichage d’un badge **LIVE** sur les avatars des chaînes en direct (si plus de 10 minutes de visionnage)
- Détails enrichis dans la vue d’une chaîne :
  - 🎮 Jeu en cours de stream
  - 🕒 Durée depuis le début du live
  - ✏️ Titre du stream en cours
- 🧾 Informations Twitch ajoutées dans les détails :
  - Suivi de la chaîne (depuis quand)
  - Statut partenaire/affilié
  - Date de création de la chaîne
- 🔄 Bouton "Mettre à jour" dans la page détails pour forcer une actualisation des avatars et métadonnées (API requise)

### Amélioré
- 💅 Présentation plus élégante des métadonnées de chaîne
- 🔍 Refactor partiel de `displayStreamers()` pour séparer les favoris et autres streamers

### Limitations connues
- 🚧 Les badges **LIVE** peuvent parfois ne pas apparaître immédiatement sur les 6 premières chaînes si l’API Twitch a été lente à répondre ou en cas de quota.

---

## [v0.5.1-beta] - 2025-05-14

### Ajouté
- 🔍 **Nouvelles informations affichées dans les détails des chaînes** :
  - Suivi de la chaîne (si l'utilisateur suit et depuis quand)
  - Statut partenaire ou affilié
  - Date de création de la chaîne
- 📦 **Stockage local** des métadonnées (`twitchMeta`) pour limiter les requêtes API
- 🔄 **Bouton “Mettre à jour”** dans les détails d'une chaîne pour forcer le rafraîchissement des infos (avatar, follow, etc.)

### Technique
- 📁 Nouveau fichier `twitchMeta.js` pour gérer l’appel à l’API Twitch Helix
- ⌛ Les métadonnées expirent après 3 semaines (comme les avatars)
- 🔒 Vérification automatique de la connexion à l’API via `twitchApi` dans le stockage local

### Amélioré
- 🎨 Refonte du bloc d'affichage des métadonnées dans la vue détaillée (meilleure lisibilité, disposition en ligne)

---

## [v0.5.0-beta] - 2025-05-14

### ✨ Ajouté
- 🧠 Nouvelle page `options.html` :
  - Saisie du **Client-ID Twitch** et du **token OAuth**
  - Gestion centralisée de l’export, import et reset des données
- 🖼️ **Affichage automatique des images de profil Twitch** :
  - En utilisant l’API Twitch (si disponible)
  - En fallback via decapi.me
- 🧩 **Système de cache intelligent des avatars** :
  - Stockage local (`chrome.storage.local.avatars`) des images + `twitchId` + `fetchedAt`
  - Mise à jour automatique tous les 21 jours
- 🔄 Bouton **“Mettre à jour”** (visible uniquement si l’API est configurée) dans la page de détails pour rafraîchir les données manuellement
- 📦 Nouveau fichier `apiHelpers.js` pour les appels à l'API Twitch

### 🎨 Design/UI
- 💅 **Refonte globale du style** :
  - Avatars ronds, animés, avec gradient Twitch
  - Style responsive, plus moderne, épuré et cohérent
- ⭐ **Section Favoris** retravaillée :
  - Encadré visuel dédié, séparation claire avec les autres chaînes
  - Cartes favorites légèrement surélevées avec effet doré
- 📺 **Section "En cours de lecture"** repensée :
  - Avatars animés avec statut clair (▶️ / ⏸️ / 🔇)
  - Bloc visuellement isolé en haut de l’interface

### 🧪 Technique
- Refactorisation de `setAvatar()` avec logique centralisée
- Détection automatique de l’état de connexion à l’API avec `isTwitchApiAvailable()`
- Support des chaînes sans image (fallback texte) si aucun accès API ou image invalide

---

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