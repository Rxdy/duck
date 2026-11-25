/** Les règles, telles que le serveur les applique (voir back/src/game-engine/game.ts). */
export const RULES: { icon: string; title: string; text: string }[] = [
  {
    icon: "ri-gamepad-line",
    title: "Se déplacer",
    text: "Une case par appui. Contre un mur, le canard se tourne sans avancer.",
  },
  {
    icon: "ri-flag-fill",
    title: "Marquer",
    text: "Entre sur la base d'un adversaire : +3 points, puis retour chez toi.",
  },
  {
    icon: "ri-flashlight-fill",
    title: "Toucher",
    text: "Fonce sur un adversaire : il retourne chez lui et tu lui voles 1 point.",
  },
  {
    icon: "ri-shield-fill",
    title: "Immunité",
    text: "Après un retour à la base, 1,5 s sans pouvoir toucher ni être touché.",
  },
  { icon: "ri-trophy-fill", title: "Gagner", text: "Le premier à 15 points remporte la partie." },
];
