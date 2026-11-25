# Accessoires du coincoin

Branche d'atelier `art/accessoires` : les accessoires évoluent ici, **sans toucher au jeu**. On les intégrera quand le
catalogue sera assez fourni.

- Code : `front/atelier/accessoires.js` et `themes.js` (57 accessoires, 25 tenues dont 20 par thème). L'atelier
  n'entre pas dans le build.
- Rendus : `rendus/` (face et dos) et les planches `planche-*.png` (dont `planche-taille-reelle.png`, à la taille du jeu sur téléphone), refaits par `rendre.mjs` (voir son en-tête).

## Règles

- Le modèle du canard n'est jamais modifié : on ajoute par-dessus.
- Un couvre-chef (`sansAntennes`) masque les antennes.
- Les vêtements reprennent la forme exacte du corps ou de la tête.
- Chaque accessoire doit se lire de face **et** de dos.
- Cinq emplacements : `tete`, `visage`, `corps`, `dos`, `main`. Au plus un accessoire par emplacement (vérifié par
  `rendre.mjs`) ; tous les emplacements se combinent librement.
- La main : le canard n'a pas de bras, une moufle à sa couleur tient l'objet. Essai concluant.
- Thèmes : des clins d'œil à des univers connus de tous, **sans personnage, logo ni nom protégé** (publication).

## À retravailler

- Ninja, pharaon, tricorne : formes trop plates ou peu reconnaissables.
- Astronaute : la bulle assombrit le visage.
- Combinaisons : une visière sur une cagoule, une cape avec un autre objet dans le dos, se mélangent mal.
- À la taille du jeu, les petits objets (baguette, fleur, torche) se distinguent à peine : les grossir ?
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
