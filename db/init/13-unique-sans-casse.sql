-- Email unique SANS tenir compte de la casse. Le pseudo, lui, peut être partagé : c'est le code joueur
-- qui identifie un compte (15-player-tag.sql). Ce fichier est rejoué à chaque démarrage : il ne doit
-- donc rien imposer au pseudo.
--
-- S'il existe déjà des doublons, l'index n'est pas créé et un avertissement est émis : on ne renomme ni
-- ne supprime aucun compte automatiquement, et le serveur doit pouvoir démarrer.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM accounts GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE WARNING 'Emails en double (à la casse près) : accounts_email_lower_key non créé';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_key ON accounts (lower(email));
  END IF;
END $$;
