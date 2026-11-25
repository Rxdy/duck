#!/usr/bin/env python3
"""Crée sur GitHub les issues du travail restant, avec la CLI `gh` (après `gh auth login`).

    python3 docs/reprise/issues.py            # montre ce qui serait créé
    python3 docs/reprise/issues.py --creer    # crée ; un titre déjà présent est ignoré
"""
import json
import subprocess
import sys

DUCK = "Rxdy/duck"
HUB = "Rxdy/games-hub"
REGLES = "Règles complètes : `docs/11-nouveaux-modes.md`."

ISSUES = [
    (DUCK, "Équilibrer le toucher : trop une course de vitesse", """On pense manger l'adversaire et c'est lui qui nous mange.

Aujourd'hui celui qui entre sur la case de l'autre gagne, dans l'ordre d'arrivée au serveur. Se placer au contact offre le premier coup ; l'affichage a le retard du réseau et 130 ms de glissade ; les bots n'ont pas de réseau.

- [ ] Choisir : pas de toucher de face (recommandé), maître chez soi, ou temps d'armement
- [ ] Essayer dans le mode libre
- [ ] Appliquer au serveur, aux bots et au tutoriel, avec tests

""" + REGLES),
    (DUCK, "Mode 2v2", """- 2 équipes de 2, un score par équipe, base adverse +3, toucher vole 1 point, premier à 15 (à confirmer)
- Pas de toucher entre coéquipiers

- [ ] Confirmer : bases voisines ou en diagonale, allié bloquant ou traversable, couleurs d'équipe
- [ ] Moteur, matchmaking, bots, classement
- [ ] Interface : carte de mode, scores par équipe, fin de partie

À faire avant les autres modes. """ + REGLES),
    (DUCK, "Mode Conquête : colorier les cases", """- 3 passages (entrées) sur une case pour qu'elle prenne sa couleur ; progression visible
- Progression à 1 ou 2 : l'entrée d'un adversaire la remet à zéro et commence la sienne (à confirmer)
- Le plus de cases à la fin des 3 minutes gagne (durée à confirmer)

- [ ] Confirmer la remise à zéro, la reprise d'une case colorée, les allers-retours, l'égalité
- [ ] Moteur, affichage des cases, mini-carte, bots, tests

""" + REGLES),
    (DUCK, "Mode Roi de la colline", """Règles proposées, à confirmer : zone 3×3 au centre, 1 point par seconde à son seul occupant (joueur ou équipe), rien si disputée, premier à 30.

- [ ] Valider les règles
- [ ] Moteur (premier mode avec une horloge serveur), cartes, affichage, bots, tests

""" + REGLES),
    (DUCK, "Mode Capture du drapeau", """Règles proposées, à confirmer : rapporter le drapeau adverse sur sa base (le sien présent) = 1 capture ; porteur touché = drapeau au sol, retour à sa base après 10 s ou au contact d'un adversaire du porteur ; premier à 3.

- [ ] Valider les règles
- [ ] Moteur, affichage du porteur, bots, tests. Dépend du 2v2

""" + REGLES),
    (DUCK, "Accessoires du canard : enrichir puis intégrer", """Atelier sur la branche `art/accessoires` (27 accessoires, 5 tenues, rendus face et dos), validé comme premier jet. On l'enrichit à part et on intègre quand le catalogue est assez fourni.

Règles : modèle jamais modifié, un couvre-chef masque les antennes, lisible de face et de dos.

- [ ] Ajouter des accessoires
- [ ] Retravailler bandana, veste, gilet, lunettes et nœud papillon de dos, combinaisons qui se masquent
- [ ] Intégrer : skins existants (`back/src/skins.ts`), un accessoire par emplacement, page Mon canard
- [ ] Vérifier lisibilité en partie, couleur du joueur toujours visible, performances sur téléphone"""),
    (DUCK, "Thèmes graphiques de carte (shaders) et affichage tactique", """- [ ] Quelques thèmes intégrés et validés (eau, lave...)
- [ ] Le créateur choisit le thème, enregistré avec la carte et vu par tous
- [ ] Chaque joueur peut revenir à un affichage tactique lisible
- [ ] Pas de shader libre partagé (performances, clignotements, murs cachés)"""),
    (DUCK, "Connexion Google : configurer et tester", """Le code est prêt, le bouton reste masqué sans identifiant. Jamais testé avec un vrai compte. Voir `docs/05-comptes-progression.md`.

- [ ] Créer l'ID client OAuth (origines : https://duck.rxdy.fr, http://localhost:5173, http://localhost)
- [ ] Définir GOOGLE_CLIENT_ID en développement et en production
- [ ] Tester inscription, reconnexion et rattachement d'un compte existant"""),
    (DUCK, "Ardoise sur les écrans restants et défilement", """Compte, Mon canard, Mes cartes et les formulaires n'ont pas été repris dans la mise en page Ardoise.

- [ ] Reprendre ces écrans
- [ ] Supprimer le défilement (Compte, Mon canard ; petits téléphones couchés : jouer/cartes, camp, crédits, fin de partie ; éditeur en 320×568)
- [ ] Relancer un contrôle sur toutes les tailles après les derniers changements"""),
    (DUCK, "Mettre en production et vérifier", """- [ ] PR vers dev, relecture, puis release
- [ ] Base de prod : vérifier au démarrage les avertissements de doublons pseudo/email (migration 13) ; sauvegarde avant
- [ ] Vérifier la bannière de partage (og.png) sur Discord et WhatsApp, le favicon et l'icône installée"""),
    (DUCK, "Recherche de partie et mode libre : finitions", """- [ ] La recherche est perdue si on recharge l'onglet : décider s'il faut la reprendre
- [ ] Mode libre : garder ou retirer les noms de zones (« Passage » est peu parlant)
- [ ] Réglage du gros plan à valider sur téléphone réel (CLOSE_UP_HALF_VIEW)
- [ ] Jouer le match final du tutoriel pour juger sa difficulté"""),
    (HUB, "Vraies captures des jeux et reprise de l'ancien travail", """- [ ] Remplacer les dessins par de vraies captures (Duck a changé de style)
- [ ] Comparer la galerie de la branche `sauvegarde/ancien-front` avec le site actuel et reprendre ce qui manque (ne pas fusionner la branche : conflits)"""),
]

COMMENTAIRES = {
    30: "Fait sur `fix/responsive` : podium, top 10 sans défilement, ta ligne avec ton vrai rang.\n\nReste : filtres saison/période, évolution, victoires/défaites, lien vers le profil.",
    35: "Fait sur `fix/responsive` : tutoriel guidé de 5 étapes et mode libre à quatre salles, côté navigateur.\n\nReste : cartes fournies par le back, progression liée au compte, cases spéciales quand elles existeront.",
    37: "Les écrans ont été contrôlés sur des tailles simulées seulement. Reste : essai sur vrais iOS et Android.",
    36: "À prendre en compte : chaque nouveau mode (2v2, conquête, colline, drapeau) demande aux bots d'apprendre son objectif.",
}


def gh(*args):
    return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout


def main():
    creer = "--creer" in sys.argv
    existants = {}
    for depot, titre, corps in ISSUES:
        if creer and depot not in existants:
            liste = gh("issue", "list", "-R", depot, "--state", "all", "--limit", "500", "--json", "title")
            existants[depot] = {i["title"] for i in json.loads(liste)}
        if not creer:
            print(f"[{depot}] {titre}")
        elif titre in existants[depot]:
            print(f"déjà là : {titre}")
        else:
            print(gh("issue", "create", "-R", depot, "--title", titre, "--body", corps).strip())
    for numero, texte in COMMENTAIRES.items():
        if not creer:
            print(f"commentaire sur #{numero}")
            continue
        vus = gh("issue", "view", str(numero), "-R", DUCK, "--json", "comments")
        if all(c["body"].strip() != texte for c in json.loads(vus)["comments"]):
            gh("issue", "comment", str(numero), "-R", DUCK, "--body", texte)
            print(f"commenté #{numero}")


if __name__ == "__main__":
    main()
