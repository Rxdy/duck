# 10. Audit technique et pistes graphiques

Notes du 25/11/2026, tirées d'une **lecture du code** de la branche `dev` et de Train Tracks. Les jeux n'ont pas
été lancés : les rendus n'ont pas été comparés à l'écran.

## Décisions

- **Deux modes d'affichage**, au choix du joueur :
  - **tactique** : sans habillage graphique, pour lire le plateau ;
  - **graphique** : les cartes avec des éléments de décor.
- **Recréer les canards**, avec un nouveau design et de la texture.
- La base technique est gardée (Vue 3, TresJS / Three.js, serveur qui fait autorité).

## À trancher

- La technique 3D du décor et des canards (voir plus bas).
- Mode tactique : vue de dessus ou isométrique, et mode par défaut.

## Pistes pour les deux modes

- Les deux modes lisent le même état de partie et montrent les mêmes informations de jeu : le décor ne doit ni
  cacher ni ajouter une information.
- `BoardPreview.vue` a déjà une vue `topDown` (utilisée pour l'éditeur) : point de départ possible du mode tactique.
- Un mode tactique en SVG ou canvas 2D, sans WebGL, servirait aussi de repli quand la 3D n'est pas disponible.
- Le choix peut être gardé dans les réglages (`settingsStore`).

## Façons de faire la 3D

Toutes s'affichent avec Three.js ; ce qui change, c'est la fabrication des objets.

| Méthode | Pour | Contre |
|---|---|---|
| Formes et textures générées par le code (Train Tracks) | Aucun fichier à charger, couleurs faciles à changer | Long à écrire, difficile pour un personnage expressif |
| Modèles faits dans Blender, exportés en glTF (`.glb`) | Contrôle total, textures et animations | Il faut apprendre Blender |
| Packs prêts à l'emploi (Kenney, Quaternius) | Décor rapide et cohérent | Moins personnel ; vérifier la licence de chaque pack |
| Voxels (MagicaVoxel) | Simple à prendre en main, style marqué | Style « cubes » |
| Modèles générés par IA | Premier jet rapide | Résultat à retoucher ; vérifier les droits d'usage |
| Modèle 3D rendu à l'avance en sprites | Garde le système de sprites actuel | Chaque direction, animation et couleur ajoute des images |

Proposition (non validée) : décor à partir d'un pack ou de Blender en `.glb`, regroupé par instances ; un canard
modélisé dans Blender, essayé en sprites et en modèle 3D avant de choisir.

## Améliorations graphiques

1. Optimiser : un objet par case aujourd'hui. Voir `front/src/scenery3d/batching.ts` (instances, à adapter à TresJS
   et à la version de Three.js) et `adaptive.ts` (résolution adaptative) dans Train Tracks.
2. Textures : blocs de couleur unie aujourd'hui.
3. Ombres : invisibles car le soleil est dans l'axe de la caméra (`front/src/lib/board.ts`, `SUN_POSITION`) ;
   déplacer le soleil avant de les réactiver.
4. Décor et effets : obstacles, eau animée, effet quand on marque.
5. Canard : déplacement par téléportation (choix assumé) ; tout bond ajouté doit rester très court.
6. Garder la caméra isométrique en mode graphique.

## À corriger avant une mise en ligne

- Reconnexion : `useGameSocket.ts` ne gère pas la perte de connexion ; aucune reconnexion trouvée.
- Serveur : ni `maxPayload` (100 Mo par défaut avec `ws`) ni détection des connexions mortes trouvés.
- Pages : routeur en `createWebHistory` mais nginx sans configuration ; recharger `/ranking` devrait donner une 404
  (à vérifier).
- Déploiement : pas de publication d'images ni de configuration de production (modèle : Train Tracks).
- Tests : pas de tests e2e trouvés ; la CI ne lance pas `scripts/screenshot.mjs`.

## BPMN

À faire. Train Tracks fournit un outil réutilisable : copier `bpmn/bpmn_kit/` et `bpmn/generate.py`, puis écrire le
`processes.py` de Duck. Processus à décrire en premier : rejoindre une partie, un déplacement, marquer et gagner,
les bots, la déconnexion, l'éditeur.

Ordre proposé : BPMN, fiabilité, optimisation, graphismes, mise en ligne.

## Personnage validé : le coincoin fluo (25/11/2026)

Prototype : [`art/coincoin/prototype.html`](../art/coincoin/prototype.html), à ouvrir dans un navigateur (Three.js
est chargé depuis un CDN). Il remplace les pistes précédentes sur les canards.

- Forme : socle gris, corps en deux blocs (le bas dépasse derrière), grand bec plat, deux antennes.
- Rendus retenus : **lisse** et **mat texturé**.
- Antennes : toujours allumées, elles changent de couleur toutes les 500 ms (1,5 s si les animations sont
  réduites). Ordre actuel : rose, jaune, vert, bleu (proposé, constante `ANTENNA_COLORS`).
- Pas de violet : la 4e couleur de joueur est passée de `#9B5DE5` à `#3FC46B`.
- Halo discret : légère lueur au sol.
- Déplacement : glissade de case en case en `ease-in-out`, sans saut ni téléportation, rotation douce dans les
  virages. 520 ms par case dans le prototype ; à raccourcir en jeu pour suivre les touches enchaînées.
- Droits : l'objet vient de Habbo (Sulake). Avant une mise en ligne, personnaliser les détails.

### Intégré au jeu

- `front/src/lib/coincoin.ts` (modèle), `composables/useDuckMotion.ts` (glissade de 130 ms),
  `components/organisms/CoincoinDuck.vue`. Le choix lisse / mat est dans les Options.
- Un retour à la base est replacé d'un coup, sans glisser à travers les murs.
- L'immunité fait toujours pulser le canard.
- `DuckSprite.vue`, `lib/duckSprite.ts` et `assets/ducks/` ne sont plus utilisés par le plateau. Gardés pour
  pouvoir revenir en arrière ; à supprimer une fois le nouveau canard confirmé.
