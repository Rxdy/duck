# Accessoires du coincoin

Branche d'atelier `art/accessoires` : les accessoires évoluent ici, **sans toucher au jeu**. On les intégrera quand le
catalogue sera assez fourni.

- Code : `front/atelier/accessoires.js` (27 accessoires, 5 tenues). L'atelier n'entre pas dans le build.
- Rendus : `rendus/` (face et dos) et les trois planches `planche-*.png`, refaits par `rendre.mjs` (voir son en-tête).

## Règles

- Le modèle du canard n'est jamais modifié : on ajoute par-dessus.
- Un couvre-chef (`sansAntennes`) masque les antennes.
- Les vêtements reprennent la forme exacte du corps ou de la tête.
- Chaque accessoire doit se lire de face **et** de dos.
- Emplacements : `tete`, `visage`, `corps`, `dos`. Une tenue en combine plusieurs, un seul par emplacement en principe.

## À retravailler

- Bandana de pirate : encore trop plat, comme un couvercle.
- Veste, gilet : se lisent surtout comme une bande autour du corps ; des manches ou un col plus haut aideraient.
- Nœud papillon, lunettes : très discrets de dos.
- Certaines combinaisons se masquent (écharpe sous le bec, bretelles du sac).

## Pour l'intégration (plus tard)

- Le serveur connaît déjà un système de skins (`db/init/04-skin-accessories.sql`, `back/src/skins.ts`) avec
  `top-hat`, `cap` et `crown`, que le coincoin ne dessine pas encore.
- Il faudra passer à un accessoire par emplacement, et vérifier la lisibilité à la taille réelle en partie ainsi que les
  performances sur téléphone.
- La couleur du canard identifie le joueur : un vêtement ne doit pas la cacher entièrement.
