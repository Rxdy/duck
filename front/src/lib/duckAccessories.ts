export type AccessoryKind = "none" | "top-hat" | "cap" | "crown";

const KNOWN_ACCESSORIES: readonly string[] = ["none", "top-hat", "cap", "crown"];

/**
 * Le serveur renvoie l'accessoire comme une simple chaîne (voir
 * back/src/skins.ts) : jamais de confiance aveugle, une valeur inconnue
 * (catalogue désynchronisé, futur accessoire pas encore géré ici) retombe
 * sur "none" plutôt que de faire planter le rendu 3D.
 */
export function toAccessoryKind(value: string): AccessoryKind {
  return KNOWN_ACCESSORIES.includes(value) ? (value as AccessoryKind) : "none";
}

/** Libellé affiché dans le sélecteur de skins (voir pages/DuckProfile.vue). */
export function accessoryLabel(accessory: AccessoryKind): string {
  switch (accessory) {
    case "top-hat":
      return "Haut-de-forme";
    case "cap":
      return "Casquette";
    case "crown":
      return "Couronne";
    default:
      return "Aucun";
  }
}

/** Icône affichée dans le sélecteur (voir pages/DuckProfile.vue) — le vrai rendu utilise DuckMesh.vue. */
export function accessoryIcon(accessory: AccessoryKind): string {
  switch (accessory) {
    case "top-hat":
      return "🎩";
    case "cap":
      return "🧢";
    case "crown":
      return "👑";
    default:
      return "🦆";
  }
}
