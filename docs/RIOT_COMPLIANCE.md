# RiftCoach — Conformité Riot / Riot compliance

> Document vivant. Dernière revue : **2026-10-23**. Toute nouvelle fonctionnalité doit ajouter
> ou mettre à jour une ligne de ce document **avant** d'être fusionnée.
>
> Une possibilité technique n'est **jamais** une autorisation. Seules les politiques publiées par
> Riot ou une réponse écrite de Riot permettent de passer une fonctionnalité au statut « Autorisée ».

## 1. Sources consultées

| Source | Statut de la consultation (2026-10-23) |
|---|---|
| https://developer.riotgames.com/docs/lol | Lue. Identifiants (Riot ID, PUUID), Data Dragon, LCU, Live Client Data, mention légale. |
| https://developer.riotgames.com/policies/general | Lue. Clés API, enregistrement, monétisation, usages interdits. |
| https://support-developer.riotgames.com/hc/en-us/articles/22698698001939-League-of-Legends | **Non lisible (HTTP 403 depuis l'outil de lecture).** À relire manuellement par un mainteneur avant toute publication. |
| https://support.riotgames.com/en-us/riot/performance/game-memory-access-removed-for-third-party-apps | Lue. Blocage par défaut de l'accès mémoire depuis le 6 oct. 2026, fin de la période de grâce en avril 2027. |
| https://www.riotgames.com/en/legal | Lue. Politique « Legal Jibber Jabber » (usage non commercial de l'IP, pas de logos Riot). |

### Points clés retenus

- **Identifiants** : utiliser le **Riot ID** (`gameName#tagLine`) et le **PUUID** via Account-v1. Les endpoints *by-name* sont dépréciés et « will be removed in the future ».
- **Clés API** : ne jamais intégrer une clé dans un binaire distribué ; ne pas partager de clé hors de l'organisation ; une clé de production = un produit.
- **Enregistrement** : tout produit doit être « registered in, and audited by Riot Games through the Developer Portal », et toute nouvelle fonctionnalité doit être ré-auditée.
- **Interdits explicites** : alternatives aux classements officiels (calculateurs MMR/ELO), dé-anonymisation de joueurs, informations « previously unknown to the player » en partie, applications qui « dictate player decisions », winrates d'Augments/objets Arena, courtage de données (*data broker*), paris.
- **LCU** : « not officially supported for use with third party applications ».
- **Mémoire du jeu** : bloquée par défaut pour les applications tierces inconnues depuis le **6 octobre 2026**. RiftCoach ne l'a jamais utilisée et ne l'utilisera pas.
- **IP Riot** : seuls les assets approuvés (Data Dragon, Press Kit) ; pas de logos ni de marques Riot ; usage non commercial sauf clé API accordée pour le projet.
- **Limites de débit** : les valeurs exactes ne figurent pas dans les pages lues. Elles doivent être lues dans le Developer Portal et respectées via les en-têtes `X-App-Rate-Limit` / `X-Method-Rate-Limit` et `Retry-After`. **Aucun contournement.**

## 2. Mention légale (affichée dans l'app : pied de la barre latérale + écran « À propos », et dans les README)

> RiftCoach is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

Texte source : `src/i18n/legal.ts` (non traduit volontairement : la formulation anglaise est celle exigée).

## 3. Modes d'exécution

| Mode | Réseau | Clé Riot | État actuel |
|---|---|---|---|
| `demo` | Aucun | Aucune | **Implémenté.** Données synthétiques générées localement, étiquetées « Données de démonstration ». |
| `local-development` | Riot API uniquement | Clé personnelle du développeur, saisie localement, stockée dans le trousseau OS | **Non implémenté.** Prévu étape 7. Désactivé dans l'interface. |
| `production` | Service RiftCoach contrôlé (quotas, auth, rate limiting) | Clé de production détenue côté serveur, jamais côté client | **Non implémenté.** Bloqué tant que Riot n'a pas approuvé le produit et l'architecture. |

Règles invariantes : aucune clé dans le dépôt, les builds, installateurs, captures, journaux ou configs par défaut ; aucune clé partagée entre utilisateurs ; aucun proxy public adossé à une clé personnelle.

## 4. Registre des fonctionnalités

Légende statut : ✅ Autorisée selon la documentation · ❓ À confirmer auprès de Riot · ⛔ Exclue

| # | Fonctionnalité | Finalité | Données | Source exacte | Conditions d'accès | Impact intégrité compétitive | Statut | Restrictions / alternatives |
|---|---|---|---|---|---|---|---|---|
| F1 | Dashboard (winrate, KDA, CS/min, durée, tendances) | Comprendre ses performances | Statistiques post-partie de ses propres matchs | Démo : générateur local. Réel : Match-v5 (par PUUID) | Démo : aucune. Réel : clé (dev/prod) + produit enregistré | Nul : hors partie, données du joueur lui-même | ✅ (démo) / ❓ (réel, en attente d'enregistrement) | Aucun winrate d'Augments/objets Arena. Pas de score de compétence assimilable à un MMR. |
| F2 | Historique + détail de partie | Revoir ses parties | Idem F1 | Idem F1 | Idem F1 | Nul | ✅ (démo) / ❓ (réel) | Les autres participants ne sont affichés que tels que Riot les expose ; aucun ré-identification de joueurs anonymisés (« streamer mode »). |
| F3 | Profil par Riot ID + région | Retrouver son compte | Riot ID, PUUID, niveau, rangs officiels | Account-v1 (by-riot-id), Summoner-v4 (by-puuid), League-v4 | Clé + produit enregistré | Nul | ❓ | Pas d'endpoints by-name. Pas d'exposition d'identifiants historiques. Affichage du rang **officiel** uniquement. |
| F4 | Coach déterministe (tendances, 3 axes, objectifs) | Progresser | Agrégats de ses propres parties | Calcul local | Aucune | Nul : post-partie, suggestions non impératives | ✅ | Recommandations formulées comme options, jamais comme ordres. Corrélation ≠ causalité affiché. |
| F5 | Objectifs mesurables + suivi | Transformer en actions | Idem F4 | Calcul local | Aucune | Nul | ✅ | — |
| F6 | Analyse post-partie | Débrief d'une partie terminée | Stats de la partie vs moyennes personnelles | Calcul local | Aucune | Nul : après la partie | ✅ | Jamais pendant la partie. |
| F7 | Fiches de préparation (par rôle/champion) | Préparer hors partie | Données statiques + contenu original | Contenu rédigé par le projet ; Data Dragon pour noms/stats de base (plus tard) | Data Dragon : public | Faible : informations publiques, pré-partie | ✅ (contenu original) / ❓ (assets Data Dragon redistribués) | Présenter des options avec compromis, pas de « build imposé ». Pas d'images Riot embarquées dans le dépôt sans vérification. |
| F8 | Assistant IA (LLM) externe | Reformuler les insights | Agrégats | Service tiers choisi par l'utilisateur | **Consentement explicite** + clé de l'utilisateur | Nul si post-partie | ❓ (non implémenté) | Désactivé par défaut. Jamais d'envoi sans consentement. Vérifier qu'il ne s'agit pas de « data brokering ». |
| F9 | Overlay en partie | — | — | Live Client Data API | — | Potentiellement élevé | ⛔ (non prévu) | Toute idée d'overlay passe d'abord par une demande écrite à Riot. Version hors partie privilégiée. |
| F10 | Lecture/écriture mémoire, injection, hooking | — | — | — | — | Critique | ⛔ | Interdit, bloqué par Riot depuis le 2026-10-06. |
| F11 | Timers/cooldowns ennemis, prédictions en temps réel | — | — | — | — | Élevé | ⛔ | — |
| F12 | Calculateur MMR/ELO | — | — | — | — | Interdit explicitement | ⛔ | Afficher uniquement le rang officiel. |
| F13 | Scouting automatique du lobby / champ select | — | — | LCU | — | Élevé ; LCU non supporté | ⛔ | Préparation manuelle hors partie (F7). |
| F14 | Dé-anonymisation | — | — | — | — | Interdit explicitement | ⛔ | — |
| F15 | Import de fichiers (export JSON personnel) | Analyser des données déjà détenues | Fichier fourni par l'utilisateur | Fichier local, validé par schéma | Aucune | Nul | ❓ | Format et provenance à définir ; validation stricte obligatoire (déjà en place côté domaine). |

### 4.1 Extension demandée le 2026-10-23 : « partie en direct », picks, counters, builds, runes

Objectif produit exprimé par le mainteneur : voir sa partie en direct, avec des champions conseillés selon leur winrate, les counters du champion adverse, les meilleurs objets et les runes.

| # | Fonctionnalité | Données / source | Impact intégrité | Statut | Conditions et forme autorisable |
|---|---|---|---|---|---|
| F16 | Partie en cours : participants, champions, rangs officiels, à l'écran de chargement | Spectator-v5 (active game par PUUID), League-v4 | Faible si limité à l'info publique visible à l'écran de chargement | ❓ | Clé de production + produit approuvé. Ne jamais ré-identifier un joueur masqué (mode streamer / noms cachés en sélection). Pas de rang « estimé ». |
| F17 | Sélection des champions : options de pick classées par winrate, counters du champion adverse | Statistiques **agrégées** sur un grand nombre de parties (Match-v5) + session de sélection via LCU | Moyen : risque de « dictate player decisions » | ❓ | Présenter **plusieurs options avec leurs compromis**, taille d'échantillon et confiance ; jamais un choix imposé. LCU « not officially supported » : à faire valider. Aucune info sur un joueur dont le nom est caché. |
| F18 | Builds et runes conseillés pour un champion / matchup, consultés avant la partie | Agrégats Match-v5 + Data Dragon (noms, icônes) | Faible : information publique, hors partie | ✅ (principe) / ❓ (source des agrégats) | Plusieurs builds avec winrate, pick rate et échantillon. Assets Data Dragon uniquement. |
| F19 | Import automatique des runes / sets d'objets dans le client | LCU (écriture) | Faible mais action automatisée dans le client | ❓ | Uniquement sur action explicite du joueur (bouton), jamais automatique. Confirmation écrite de Riot requise avant distribution. |
| F20 | Overlay en jeu affichant le build / les runes choisis | Données statiques déjà connues du joueur | Faible : « Game overlays that provide static data » est cité comme cas autorisé | ❓ | Contenu strictement statique et pré-partie. Aucune donnée dynamique sur l'adversaire. |
| F21 | En partie : timers d'objectifs ou de sorts ennemis, cooldowns, positions, estimation d'or, prédictions | Live Client Data / mémoire | Élevé | ⛔ | Interdit (« previously unknown to the player », mémoire bloquée depuis le 2026-10-06). |
| F22 | Winrates d'Augments / objets Arena | — | Interdit explicitement | ⛔ | Ne pas afficher, même hors partie. |

**Bloquant principal (F17, F18) : la source des statistiques agrégées.** Un winrate par champion ou par matchup fiable demande des centaines de milliers de parties récentes par patch. Cela suppose :

- **(a)** un pipeline d'agrégation propre (clé de production, serveur, quotas, coûts, politique de confidentialité) ;
- **(b)** un fournisseur tiers sous licence explicite autorisant cet usage. Le scraping de sites tiers est exclu (CGU, et risque de *data brokering*) ;
- **(c)** ou, en attendant, les seules statistiques **personnelles** du joueur (faisable immédiatement, mais petits échantillons, à afficher comme tels).

**État au 2026-10-23 :** l'écran de sélection (F17) existe en mode démo, alimenté par `src/domain/demo/aggregates.ts` (statistiques fictives, étiquetées comme telles), moteur `src/domain/draft/recommend.ts` (options multiples, lissage, échantillon minimum).

Le prototype peut être construit **en mode démo** (données agrégées synthétiques, clairement étiquetées) sans attendre, mais rien de F16–F20 n'est distribué avec des données réelles avant l'accord de Riot.

## 5. Avant toute publication publique (checklist)

- [ ] Relire manuellement l'article support LoL (403 lors de la revue automatisée).
- [ ] Enregistrer le produit sur le Developer Portal ; joindre ce document.
- [ ] Obtenir le statut Approved/Acknowledged avant toute intégration réelle distribuée.
- [ ] Concevoir le service `production` (quotas, auth, rate limiting, politique de confidentialité) et le faire valider.
- [ ] Vérifier les droits de redistribution de tout asset Data Dragon embarqué.
- [ ] Re-vérifier ce registre après chaque changement de politique Riot.
