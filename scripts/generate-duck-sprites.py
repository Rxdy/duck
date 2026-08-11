#!/usr/bin/env python3
"""Décline les frames du canard (art/duck/) dans chaque couleur de joueur.

Le sprite d'origine est rouge : plutôt que de le reteinter dans le navigateur
à chaque partie, on pré-génère une image par couleur ET par direction dans
front/src/assets/ducks/<hex>/<direction>.png (voir front/src/lib/duckSprite.ts
qui les retrouve à partir de la couleur envoyée par le serveur).

Les couleurs sont LUES dans le code front (theme.ts + colorblind.ts) : ajouter
une couleur de joueur là-bas puis relancer ce script suffit, aucune liste à
tenir à jour ici.

Prérequis : python3 + Pillow (`pip install pillow`). Script d'atelier lancé à
la main quand l'art change, pas une étape du build (les PNG générés sont
commités).

    python3 scripts/generate-duck-sprites.py
"""

from __future__ import annotations

import colorsys
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "art" / "duck"
OUTPUT_DIR = ROOT / "front" / "src" / "assets" / "ducks"
PALETTE_FILES = (ROOT / "front" / "src" / "theme.ts", ROOT / "front" / "src" / "lib" / "colorblind.ts")

# Seules les 4 diagonales sont atteignables en jeu : le déplacement est
# orthogonal sur la grille (UP/DOWN/LEFT/RIGHT) mais la caméra isométrique
# (voir front/src/lib/board.ts#computeIsometricFrame) les fait apparaître en
# diagonale à l'écran (voir directionFacing).
#
# Quel dessin pour quelle pose est un CHOIX ARTISTIQUE, pas une déduction du
# nom des fichiers : les orientations qui rendent le mieux en jeu ne sont pas
# celles que leur nom laisserait croire. C'est l'unique endroit à modifier
# pour changer d'avis (puis relancer le script).
POSE_SOURCES = {
    "se": "east",  # descend vers la droite de l'écran (flèche droite)
    "sw": "south",  # descend vers la gauche (flèche bas)
    "ne": "north-east",  # remonte vers la droite (flèche haut)
    "nw": "north-west",  # remonte vers la gauche (flèche gauche)
}

# Teinte du corps à remplacer : tout le rouge du canard d'origine tourne
# autour de cette teinte (les becs/pattes orange commencent vers 14°).
BODY_HUE_MAX = 13.0
BODY_HUE_MIN = 340.0

# Couleur dominante du corps sur les frames d'origine : sert de référence pour
# que la couleur du joueur tombe EXACTEMENT dessus après remappage, les autres
# tons (ombres, reflets) suivant proportionnellement.
REFERENCE_BODY = (209, 58, 42)

# Un pixel presque noir (contour) ou presque blanc (œil, reflet) n'est pas de
# la couleur de plumage : le reteinter baverait sur le trait et le regard, qui
# doivent rester identiques d'une couleur à l'autre.
OUTLINE_MAX_LIGHTNESS = 0.09
HIGHLIGHT_MIN_LIGHTNESS = 0.80
NEUTRAL_MAX_SATURATION = 0.20


def read_palette() -> list[str]:
    """Couleurs joueur possibles, lues dans le front (palette normale + daltonien)."""
    colors: list[str] = []
    for path in PALETTE_FILES:
        for match in re.findall(r"#[0-9A-Fa-f]{6}", path.read_text(encoding="utf-8")):
            color = match.lower()
            if color not in colors:
                colors.append(color)
    if not colors:
        raise SystemExit(f"aucune couleur trouvée dans {[str(p) for p in PALETTE_FILES]}")
    return colors


def hex_to_hls(color: str) -> tuple[float, float, float]:
    r, g, b = (int(color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return colorsys.rgb_to_hls(r, g, b)


def remap(value: float, reference: float, target: float) -> float:
    """Étire `value` pour que `reference` tombe sur `target`, en gardant 0 et 1 fixes.

    Deux segments linéaires plutôt qu'un simple facteur : la couleur de base du
    canard devient pile la couleur du joueur, sans que les ombres soient
    écrasées à 0 ni les reflets brûlés à 1.
    """
    if value <= reference:
        return value * (target / reference) if reference > 0 else target
    return 1 - (1 - value) * ((1 - target) / (1 - reference))


def is_body(hue_degrees: float, lightness: float, saturation: float) -> bool:
    if lightness <= OUTLINE_MAX_LIGHTNESS or lightness >= HIGHLIGHT_MIN_LIGHTNESS:
        return False
    if saturation <= NEUTRAL_MAX_SATURATION:
        return False
    return hue_degrees <= BODY_HUE_MAX or hue_degrees >= BODY_HUE_MIN


def recolor(image: Image.Image, color: str) -> Image.Image:
    target_hue, target_lightness, target_saturation = hex_to_hls(color)
    ref_hue, ref_lightness, ref_saturation = colorsys.rgb_to_hls(*(c / 255 for c in REFERENCE_BODY))
    hue_shift = target_hue - ref_hue

    out = image.copy()
    pixels = out.load()
    width, height = out.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            hue, lightness, saturation = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if not is_body(hue * 360, lightness, saturation):
                continue
            new_r, new_g, new_b = colorsys.hls_to_rgb(
                (hue + hue_shift) % 1.0,
                remap(lightness, ref_lightness, target_lightness),
                remap(saturation, ref_saturation, target_saturation),
            )
            pixels[x, y] = (round(new_r * 255), round(new_g * 255), round(new_b * 255), a)
    return out


def main() -> None:
    frames = {
        pose: Image.open(SOURCE_DIR / f"{source}.png").convert("RGBA")
        for pose, source in POSE_SOURCES.items()
    }

    # Un cadrage COMMUN à toutes les poses (l'union des zones dessinées) :
    # recadrer chaque frame sur son propre contenu ferait sauter le canard d'une
    # direction à l'autre, sa taille et sa position à l'écran changeant à chaque
    # fois. On garde donc les décalages voulus par le dessin.
    boxes = [frame.getbbox() for frame in frames.values()]
    crop = (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )

    # Les fichiers portent le nom de la POSE (se/sw/ne/nw), pas celui du dessin
    # d'origine : le front les retrouve directement à partir de la direction
    # affichée, sans avoir à connaître le choix artistique fait ici.
    for color in read_palette():
        directory = OUTPUT_DIR / color.lstrip("#")
        directory.mkdir(parents=True, exist_ok=True)
        for pose, frame in frames.items():
            recolor(frame.crop(crop), color).save(directory / f"{pose}.png", optimize=True)
        print(f"{color} -> {directory.relative_to(ROOT)}/ ({len(frames)} poses)")

    # Le cadrage change dès qu'on choisit d'autres dessins : le front lit ces
    # dimensions pour ne jamais déformer le sprite, plutôt qu'une constante à
    # penser à mettre à jour ici (voir front/src/lib/duckSprite.ts).
    width, height = crop[2] - crop[0], crop[3] - crop[1]
    metadata = {
        "width": width,
        "height": height,
        "poses": POSE_SOURCES,
    }
    (OUTPUT_DIR / "frame.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"cadrage commun {crop} -> {width}x{height} px")


if __name__ == "__main__":
    main()
