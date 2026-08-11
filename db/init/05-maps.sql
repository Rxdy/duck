-- Cartes : celles des joueurs (sauvegardées depuis l'éditeur) et, à terme,
-- les cartes officielles. La colonne `kind` les distingue — une carte
-- officielle est jouable en matchmaking, une carte de joueur ne l'est que
-- dans une partie personnalisée (voir docs/04-editeur-cartes.md).
--
-- Les cartes officielles vivent encore dans des fichiers JSON versionnés
-- (back/maps/, voir back/src/officialMaps.ts) : elles rejoindront cette table
-- ensuite. La colonne existe dès maintenant pour ne pas avoir à migrer les
-- lignes des joueurs une deuxième fois.
CREATE TABLE IF NOT EXISTS maps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'player',
    -- Créateur. Sauvegarder demande un compte (voir back/src/maps.ts) : une
    -- carte sans propriétaire ne pourrait ni être retrouvée, ni être
    -- modifiée depuis un autre appareil. NULL est réservé aux cartes
    -- officielles, qui n'appartiennent à personne.
    owner_account_id UUID REFERENCES accounts (id) ON DELETE CASCADE,
    -- Nombre de bases posées : c'est lui qui décide du mode auquel la carte
    -- se prête (voir back/src/shared.ts#GAME_MODES). Stocké pour pouvoir
    -- filtrer sans relire toute la grille.
    spawn_count INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    -- Grille au format éditeur ("wall" | "empty" | "spawn-0".."spawn-3"),
    -- identique à front/src/lib/mapEditor.ts et aux fichiers back/maps/.
    tiles JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La liste "Mes cartes" est la requête la plus fréquente.
CREATE INDEX IF NOT EXISTS maps_owner_idx ON maps (owner_account_id);

-- Choisir une carte officielle pour un mode donné.
CREATE INDEX IF NOT EXISTS maps_kind_spawn_count_idx ON maps (kind, spawn_count);
