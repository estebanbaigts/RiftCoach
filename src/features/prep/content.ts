import type { Role } from "../../domain/model";

/**
 * Original preparation content written for RiftCoach (not copied from any guide or tool).
 * Deliberately generic and pre-game: options with trade-offs, no imposed build, no
 * matchup "answers", nothing computed from other players' live data.
 */
export interface PrepOption {
  title: { fr: string; en: string };
  body: { fr: string; en: string };
  tradeoffs: { fr: string; en: string };
}

export const ROLE_PREP: Record<Role, PrepOption[]> = {
  TOP: [
    {
      title: { fr: "Jouer pour le long terme", en: "Play for the long game" },
      body: { fr: "Prioriser le farm et l'expérience, accepter un début calme, viser la puissance en fin de partie.", en: "Prioritise farm and experience, accept a quiet start, aim for late-game strength." },
      tradeoffs: { fr: "Peu d'influence sur la carte au début ; dépend de l'équipe pour tenir jusque-là.", en: "Little map influence early; relies on the team holding out until then." },
    },
    {
      title: { fr: "Pression latérale", en: "Side-lane pressure" },
      body: { fr: "Pousser sa voie pour attirer des adversaires et créer de l'espace ailleurs.", en: "Push your lane to draw opponents and create space elsewhere." },
      tradeoffs: { fr: "Exposé sans vision ; exige de bien suivre la carte.", en: "Exposed without vision; requires close map awareness." },
    },
  ],
  JUNGLE: [
    {
      title: { fr: "Farm et objectifs", en: "Farm and objectives" },
      body: { fr: "Optimiser ses camps et se positionner tôt pour les objectifs neutres.", en: "Optimise your camps and set up early for neutral objectives." },
      tradeoffs: { fr: "Moins d'actions directes en voie ; les voies peuvent se sentir seules.", en: "Fewer direct lane plays; lanes may feel left alone." },
    },
    {
      title: { fr: "Jouer autour d'une voie", en: "Play around one lane" },
      body: { fr: "Choisir avant la partie la voie la plus prometteuse et y concentrer ses passages.", en: "Pick the most promising lane before the game and focus your visits there." },
      tradeoffs: { fr: "Prévisible si l'adversaire lit le plan ; abandonne l'autre côté.", en: "Predictable if the opponent reads it; concedes the other side." },
    },
  ],
  MIDDLE: [
    {
      title: { fr: "Contrôle de la voie", en: "Lane control" },
      body: { fr: "Garder la priorité de voie pour pouvoir bouger en premier lors des escarmouches.", en: "Keep lane priority so you can move first when skirmishes start." },
      tradeoffs: { fr: "Demande une bonne gestion des vagues ; risqué sans vision des côtés.", en: "Needs solid wave management; risky without side vision." },
    },
    {
      title: { fr: "Farm sécurisé", en: "Safe farming" },
      body: { fr: "Minimiser les morts, viser un CS régulier, et rejoindre les combats quand ils sont prévisibles.", en: "Minimise deaths, aim for steady CS, join fights when they are predictable." },
      tradeoffs: { fr: "Laisse l'initiative à l'adversaire ; peut manquer des fenêtres.", en: "Hands the initiative to the opponent; can miss windows." },
    },
  ],
  BOTTOM: [
    {
      title: { fr: "Échanges en duo", en: "Duo trading" },
      body: { fr: "Se coordonner avec le support pour échanger quand ses compétences sont disponibles.", en: "Coordinate with your support to trade when their abilities are available." },
      tradeoffs: { fr: "Dépend de la communication ; pénalisant si le duo est désynchronisé.", en: "Depends on communication; costly if the duo is out of sync." },
    },
    {
      title: { fr: "Scaling prudent", en: "Careful scaling" },
      body: { fr: "Accepter de céder un peu de terrain pour atteindre ses objets clés sans mourir.", en: "Give up a little ground to reach key items without dying." },
      tradeoffs: { fr: "Peut céder les premiers objectifs ; demande de la patience.", en: "Can concede early objectives; requires patience." },
    },
  ],
  UTILITY: [
    {
      title: { fr: "Vision d'abord", en: "Vision first" },
      body: { fr: "Planifier les zones à éclairer avant chaque objectif neutre.", en: "Plan which areas to light up before each neutral objective." },
      tradeoffs: { fr: "Moins de présence en voie pendant les trajets.", en: "Less lane presence while roaming for wards." },
    },
    {
      title: { fr: "Roaming ponctuel", en: "Timed roams" },
      body: { fr: "Quitter la voie quand la vague le permet pour aider le milieu ou la jungle.", en: "Leave lane when the wave allows to help mid or jungle." },
      tradeoffs: { fr: "Le tireur reste seul ; mauvais timing = double perte.", en: "Your carry is left alone; bad timing costs both lanes." },
    },
  ],
};
