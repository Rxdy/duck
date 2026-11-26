/** Les pages rangées sous le profil : la même liste pour la page (téléphone) et le menu (ordinateur). */
export interface ProfileEntry {
  to: string;
  label: string;
  description: string;
  icon: string;
}

export interface ProfileSection {
  title: string;
  entries: ProfileEntry[];
}

const ACCOUNT: ProfileSection[] = [
  {
    title: "Mon canard",
    entries: [
      {
        to: "/canard",
        label: "Garde-robe",
        description: "Accessoires et tenues",
        icon: "ri-t-shirt-line",
      },
    ],
  },
  {
    title: "Mon compte",
    entries: [
      {
        to: "/compte",
        label: "Mon compte",
        description: "Informations et statistiques",
        icon: "ri-user-line",
      },
      {
        to: "/amis",
        label: "Amis",
        description: "Ma liste et les demandes",
        icon: "ri-group-line",
      },
    ],
  },
];

const GUEST: ProfileSection[] = [
  {
    title: "Compte",
    entries: [
      {
        to: "/inscription",
        label: "S'inscrire",
        description: "Garder sa progression",
        icon: "ri-user-add-line",
      },
      {
        to: "/connexion",
        label: "Se connecter",
        description: "J'ai déjà un compte",
        icon: "ri-login-box-line",
      },
    ],
  },
];

const GAME: ProfileSection = {
  title: "Le jeu",
  entries: [
    {
      to: "/options",
      label: "Options",
      description: "Son, commandes, accessibilité",
      icon: "ri-settings-3-line",
    },
    {
      to: "/credits",
      label: "Crédits",
      description: "Qui a fait Duck",
      icon: "ri-information-line",
    },
  ],
};

export const profileSections = (signedIn: boolean): ProfileSection[] => [
  ...(signedIn ? ACCOUNT : GUEST),
  GAME,
];
