#!/usr/bin/env python3
"""Génère le favicon et les icônes PWA à partir du canard de face.

Une seule source (art/duck/south.png, le même dessin qu'en jeu) pour que
l'onglet, l'écran d'accueil du téléphone et le personnage soient bien la même
chose. Relancer après toute modification du dessin :

    python3 scripts/generate-icons.py

Prérequis : python3 + Pillow. Script d'atelier lancé à la main, pas une étape
du build — les images générées sont commitées dans front/public/.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "art" / "duck" / "south.png"
OUTPUT_DIR = ROOT / "front" / "public"

# Fond des icônes = theme_color du manifest (voir front/vite.config.ts).
BACKGROUND = (11, 18, 32, 255)


def render(duck: Image.Image, size: int, padding: float, transparent: bool = False) -> Image.Image:
    """Canard centré, avec `padding` de marge de chaque côté (en fraction).

    L'échelle tient compte des DEUX dimensions : le canard est plus haut que
    large, le mettre à l'échelle sur sa seule largeur le faisait dépasser du
    carré et lui coupait la tête et les pattes.
    """
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else BACKGROUND)
    inner = size * (1 - 2 * padding)
    scale = min(inner / duck.width, inner / duck.height)
    scaled = duck.resize((round(duck.width * scale), round(duck.height * scale)), Image.NEAREST)
    canvas.alpha_composite(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2))
    return canvas


def main() -> None:
    source = Image.open(SOURCE).convert("RGBA")
    # Le dessin flotte dans une zone transparente : on le recadre d'abord,
    # sinon la marge du fichier s'ajoute à celle qu'on veut vraiment.
    duck = source.crop(source.getbbox())

    render(duck, 192, 0.12).save(OUTPUT_DIR / "icon-192.png")
    render(duck, 512, 0.12).save(OUTPUT_DIR / "icon-512.png")
    # "maskable" : le système rogne jusqu'à 20 % de chaque bord pour inscrire
    # l'icône dans sa forme (cercle, goutte...). D'où une marge bien plus large.
    render(duck, 512, 0.22).save(OUTPUT_DIR / "icon-maskable-512.png")
    render(duck, 180, 0.10).save(OUTPUT_DIR / "apple-touch-icon.png")
    # Favicon transparent : la barre d'onglets a déjà sa propre couleur.
    render(duck, 32, 0.02, transparent=True).save(OUTPUT_DIR / "favicon-32.png")
    # Marque transparente, pour l'INTERFACE (en-tête, accueil, crédits) : un
    # fond opaque y ferait une vignette sombre posée sur la page, visible
    # surtout en thème clair. Les icônes ci-dessus gardent le leur, elles sont
    # affichées par le système sur un fond qu'on ne maîtrise pas.
    # 8 % de marge : à 32 px dans l'en-tête, un canard qui touche les bords de
    # son cadre se lit comme rogné, même quand il est entier.
    render(duck, 256, 0.08, transparent=True).save(OUTPUT_DIR / "duck-mark.png")

    print(f"icônes écrites dans {OUTPUT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
