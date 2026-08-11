# 3. Rendu graphique 3D

## Faisabilité

La 3D est tout à fait envisageable sans rendre le projet complexe, à condition de ne **pas** partir sur un FPS ou une caméra libre. L'approche retenue : une **vue isométrique 3D**, un peu comme les vieux jeux de plateau.

## Direction artistique

- Style **low poly**
- Caméra **fixe**, inclinée à environ 45° (vue isométrique)
- Le plateau reste basé sur une grille — la 3D est un habillage visuel, pas un changement de logique de jeu

## Ce que le joueur voit

- un plateau constitué de cases en 3D
- des murs avec du relief
- des canards se déplaçant d'une case à la fois (finalement dessinés en sprites plutôt que
  modélisés en low-poly, voir plus bas)
- les obstacles, bonus et effets (particules lors d'un point, etc.)
- des animations fluides : rotation du canard, petit rebond lors du déplacement...

## Le personnage : un sprite, pas un modèle 3D

Le plateau (cases, murs, relief) est bien en 3D, mais le canard lui-même est une **image plate qui
reste toujours face à la caméra** — exactement la technique de Habbo Hotel, dont le jeu s'inspire.
Un dessin garde un cachet qu'un modèle low-poly de cette taille n'aurait pas, et le déplacement se
faisant par téléportation d'une case à l'autre, aucune animation de transition n'est nécessaire.

- Le dessin d'origine existe en 8 orientations (`art/duck/`). Seules les 4 diagonales servent
  aujourd'hui : le déplacement est orthogonal sur la grille, mais la caméra isométrique le fait
  apparaître en diagonale à l'écran (voir `front/src/lib/board.ts#directionFacing`).
- Chaque couleur de joueur a son propre jeu d'images, **pré-généré** par
  `scripts/generate-duck-sprites.py` (palette normale + palette daltonien) plutôt que reteinté dans
  le navigateur : le rendu est celui qu'on a validé à l'œil, sans travail au chargement.
- À relancer (`python3 scripts/generate-duck-sprites.py`) après toute modification du dessin
  source ou de la palette des joueurs.

## Technologies envisagées

- **Three.js** ou **Babylon.js**
- Côté React : **React Three Fiber** (wrapper Three.js) pour rester dans l'écosystème front

## Pourquoi ce choix

Cette approche garde la simplicité du gameplay sur grille (le moteur de jeu ne connaît que des coordonnées entières) tout en donnant un rendu beaucoup plus moderne qu'un plateau 2D plat. Le rendu 3D est une couche purement client, découplée du [moteur de jeu](06-architecture-technique.md#architecture-du-projet).
