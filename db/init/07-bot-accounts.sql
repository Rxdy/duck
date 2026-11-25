-- Les bots sont des COMPTES comme les autres (voir back/src/botAccounts.ts) :
-- même table, même Elo, mêmes parties enregistrées. Seule cette colonne les
-- distingue, et elle ne doit jamais être affichée — un joueur ne doit pas
-- pouvoir dire, en regardant l'interface, s'il affronte un humain.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'human';

-- Le matchmaking cherche un bot dont le classement est proche du joueur.
CREATE INDEX IF NOT EXISTS accounts_role_rating_idx ON accounts (role, rating);
