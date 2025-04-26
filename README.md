<p align="center">
  <img src="icons/icon128.png" alt="Twitch Watch Tracker logo" width="180">
</p>

# Twitch Watch Tracker 🎮📈

Une extension Chrome pour **suivre votre temps de visionnage sur Twitch**, par chaîne, par jeu et par période (total, semaine, mois, 7 derniers jours).

---

## 🚀 Fonctionnalités principales

- **Tracking automatique** du temps passé sur chaque chaîne Twitch
- **Catégorisation automatique** par type de contenu (jeu, Just Chatting, etc.)
- **Statistiques** par :
  - Total
  - 7 derniers jours
  - Semaine
  - Mois
  - Catégorie
- **Système de favoris** ✨ pour mettre en avant vos streamers préférés
- **Export/Import** des données au format JSON 📥📤
- **Suppression individuelle** d'une chaîne 🗑️
- **Pagination intelligente** sur les longues listes (catégories et jours)
- **Affichage fluide** avec animation lors du déploiement des listes
- **Design minimaliste** inspiré de Twitch 🟣

---

## 📦 Installation

1. Clonez ou téléchargez ce dépôt.
2. Ouvrez `chrome://extensions/` dans votre navigateur.
3. Activez **Mode développeur**.
4. Cliquez sur **Charger l'extension non empaquetée** et sélectionnez le dossier du projet.
5. L'icône Twitch Watch Tracker apparaîtra à côté de votre barre d'adresse !

---

## 🛠️ Structure du projet

| Fichier | Description |
|:--|:--|
| `manifest.json` | Déclaration de l'extension Chrome |
| `content.js` | Tracking du visionnage directement sur Twitch |
| `popup.html` | Interface principale du popup |
| `popup.js` | Logique d'affichage des statistiques et des filtres |
| `stats.js` | Fonctions utilitaires pour calculer Total, 7 jours, par semaine, par mois |
| `styles.css` | Style du popup |

---

## 📈 À venir (Roadmap)

- Ajout d'**objectifs de visionnage** personnalisables
- **Graphiques d'évolution** du temps de visionnage (par semaine/mois)
- Alertes personnalisées après dépassement de seuils horaires ⏰
- Système de "Top 5 streamers" automatique 🏆

---

## 💬 Contribuer

Toutes les contributions sont les bienvenues !  
N'hésitez pas à ouvrir une **issue** ou une **pull request** si vous avez des idées ou des améliorations.

---

## 📜 Licence

Ce projet est sous licence [MIT](LICENSE).

---

> Fait avec ❤️ pour tous ceux qui veulent mieux suivre leur temps passé sur Twitch !