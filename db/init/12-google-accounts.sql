-- Connexion avec Google (voir back/src/google.ts). `google_sub` est
-- l'identifiant stable du compte chez Google : l'email peut changer, pas lui.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS google_sub TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS accounts_google_sub_key
  ON accounts (google_sub)
  WHERE google_sub IS NOT NULL;

-- Un compte créé avec Google n'a pas de mot de passe.
ALTER TABLE accounts ALTER COLUMN password_hash DROP NOT NULL;
