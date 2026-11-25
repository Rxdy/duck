-- Pseudo et email uniques SANS tenir compte de la casse : « Rudy » et « rudy »
-- désignent la même personne dans le classement comme à la connexion.
--
-- S'il existe déjà des doublons, l'index n'est pas créé et un avertissement est
-- émis : on ne renomme ni ne supprime aucun compte automatiquement, et le serveur
-- doit pouvoir démarrer. L'application refuse de toute façon les nouveaux.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accounts GROUP BY lower(username) HAVING count(*) > 1) THEN
    RAISE WARNING 'Pseudos en double (à la casse près) : accounts_username_lower_key non créé';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_lower_key ON accounts (lower(username));
  END IF;

  IF EXISTS (SELECT 1 FROM accounts GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE WARNING 'Emails en double (à la casse près) : accounts_email_lower_key non créé';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_key ON accounts (lower(email));
  END IF;
END $$;
