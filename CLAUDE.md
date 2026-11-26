# Duck — mémoire du projet

À lire en début de session, sur n'importe quel poste. L'état détaillé et la suite sont dans
`docs/reprise/REPRISE.md`.

## Poste

- Nouveau poste : `make poste` (une seule fois), puis `make dev` ; le jeu est sur http://localhost:5173.
- Branche de travail : `fix/responsive`. Avant de pousser : `make check`.
- Le dépôt est **public** : aucun secret, mot de passe de test ni donnée personnelle dans un fichier.

## Façon de travailler attendue

- Répondre en français, tutoyer.
- Commit et push seulement quand c'est demandé.
- Vérifier l'interface dans un navigateur (captures), sur petit téléphone, paysage et ordinateur.
- Les pages tiennent à l'écran sans défiler (seules les longues listes défilent, dans leur zone).
- Interface sobre (« Ardoise ») : seuls les canards brillent un peu.
- Montrer les propositions visuelles ; dire clairement ce qui n'a pas été testé.

## Repères

- Accessoires : `front/src/lib/accessories/`, puis `make accessories`. Après tout ajout, regarder les rendus de face,
  de dos et en vignette (yeux visibles, bec jamais traversé, couleur du joueur visible).
- Pop culture : clins d'œil originaux seulement, ni personnage, ni logo, ni nom protégé.
- Rythme : un pas = 180 ms, imposé par le serveur (`STEP_MS` = `GLIDE_MS`).
- Migrations (`db/init/`) : rejouées à chaque démarrage, donc idempotentes et additives.
