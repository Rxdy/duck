-- Classement Elo par compte (voir back/src/rating.ts). 1000 au départ : une
-- valeur neutre au milieu de l'échelle, qui laisse autant de place pour
-- monter que pour descendre.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS rating INTEGER NOT NULL DEFAULT 1000;

-- Le classement se lit trié par score décroissant, c'est sa seule requête.
CREATE INDEX IF NOT EXISTS accounts_rating_idx ON accounts (rating DESC);
