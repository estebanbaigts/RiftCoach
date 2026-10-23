# RiftCoach

**Compagnon de progression League of Legends, open source et local-first.**
Comprendre ses performances, repérer ses axes d'amélioration récurrents et les transformer en objectifs mesurables — à partir de ses propres parties.

🇬🇧 [Read in English](README.md)

> **Statut : prototype (v0.1, mode démonstration uniquement).** RiftCoach fonctionne aujourd'hui sur des **données de démonstration synthétiques** clairement signalées. Aucune intégration à l'API Riot n'est activée : elle ne le sera qu'après enregistrement et validation du produit par Riot Games. Voir [docs/RIOT_COMPLIANCE.md](docs/RIOT_COMPLIANCE.md).

## Ce qui fonctionne

| Domaine | État |
|---|---|
| Tableau de bord — parties, winrate avec intervalle de Wilson 95 %, KDA, CS/min, durée moyenne, progression 7/30 jours, tendance glissante, champions et rôles | ✅ données démo, testé |
| Historique — recherche, filtres, tri, signalement des données partielles, détail de partie | ✅ données démo |
| Analyse post-partie vs votre propre référence au même rôle | ✅ données démo (indiquée comme simulée) |
| Coach — règles déterministes, contrôle de la qualité des données, ≤ 3 axes, preuves + confiance, objectifs mesurables, suivi | ✅ |
| Préparation — options et compromis par rôle, vos statistiques par champion | ✅ contenu original ; Data Dragon non intégré |
| Français / anglais, clair / sombre, navigation clavier | ✅ |
| Validation Riot ID / région | ✅ validation seule, **aucune requête envoyée** |
| Données réelles (API Riot) | ⛔ non implémenté — conditionné à la validation Riot |
| Application desktop (Tauri) | ⚠️ configurée ; compilée en CI, pas encore vérifiée sur une machine de publication |
| Stockage SQLite | ⚠️ schéma conçu (`src-tauri/migrations`), non branché |

## Principes

- **Local-first.** Pas de compte, pas de télémétrie, pas de service d'IA externe. Tout reste sur votre machine.
- **Des chiffres honnêtes.** Chaque indicateur précise sa période, sa définition et la taille de l'échantillon. Les données manquantes sont exclues, jamais devinées.
- **Coacher, pas commander.** Les observations décrivent des associations, pas des causes. Les suggestions sont des options avec leurs compromis.
- **Les règles Riot d'abord.** Pas de lecture mémoire, pas d'information cachée en partie, pas de calculateur de MMR, pas de scouting, pas de dé-anonymisation.

## Démarrage rapide (aperçu web de l'interface)

Node.js ≥ 20.18 requis.

```bash
npm ci
npm run dev        # http://127.0.0.1:1420
npm test           # 64 tests
npm run build
```

Application desktop : voir [docs/INSTALL.md](docs/INSTALL.md) (nécessite Rust).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Décisions techniques](docs/DECISIONS.md) · [Design system](docs/DESIGN_SYSTEM.md)
- [Registre de conformité Riot](docs/RIOT_COMPLIANCE.md) · [Modèle de sécurité](docs/SECURITY_MODEL.md) · [Confidentialité](docs/PRIVACY.md)
- [Installation (Windows / macOS)](docs/INSTALL.md) · [Publication](docs/RELEASE.md)
- [Contribuer](CONTRIBUTING.md) · [Signaler une vulnérabilité](SECURITY.md)

## Licence

À confirmer — voir [docs/DECISIONS.md](docs/DECISIONS.md#adr-007--licence-proposed). Tant qu'aucun fichier `LICENSE` n'est présent, aucune licence n'est accordée.

## Mentions légales

RiftCoach is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.
