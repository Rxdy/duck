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
- des canards modélisés en low-poly, se déplaçant d'une case à la fois
- les obstacles, bonus et effets (particules lors d'un point, etc.)
- des animations fluides : rotation du canard, petit rebond lors du déplacement...

## Technologies envisagées

- **Three.js** ou **Babylon.js**
- Côté React : **React Three Fiber** (wrapper Three.js) pour rester dans l'écosystème front

## Pourquoi ce choix

Cette approche garde la simplicité du gameplay sur grille (le moteur de jeu ne connaît que des coordonnées entières) tout en donnant un rendu beaucoup plus moderne qu'un plateau 2D plat. Le rendu 3D est une couche purement client, découplée du [moteur de jeu](06-architecture-technique.md#architecture-du-projet).
