-- Le NIVEAU d'un bot, c'est-à-dire son intelligence de jeu (voir
-- back/src/bots.ts#BOT_LEVELS). Jusqu'ici il n'était pas stocké : on le
-- déduisait du classement, et un bot changeait donc de cerveau à chaque
-- victoire. Un adversaire dont l'intelligence monte et descend au gré des
-- résultats n'a pas de niveau — il n'a qu'un score, et le classement ne
-- mesure plus rien puisque le mesuré change avec la mesure.
--
-- Désormais : le niveau est une propriété du compte, fixée à la création et
-- jamais réécrite. Le classement, lui, bouge librement — c'est son rôle.
--
-- NULL pour les humains : un joueur n'a pas de niveau de bot.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS level TEXT;

-- Reprise de l'existant : les bots créés avant cette colonne reçoivent le
-- niveau que l'ancienne déduction leur donnait à cet instant. Ils gardent donc
-- exactement l'intelligence qu'ils avaient hier — c'est le gel de la
-- déduction, pas une redistribution.
--
-- Les bornes sont les milieux entre les classements de référence des niveaux
-- (200, 600, 1000, 1400, 1800), qui sont ce que calculait
-- botAccounts.ts#levelForRating.
UPDATE accounts
SET level = CASE
    WHEN rating <  400 THEN 'debutant'
    WHEN rating <  800 THEN 'intermediaire'
    WHEN rating < 1200 THEN 'confirme'
    WHEN rating < 1600 THEN 'expert'
    ELSE 'impossible'
  END
WHERE role = 'bot' AND level IS NULL;

-- Le matchmaking lit le niveau en même temps que le classement (voir
-- botAccounts.ts#pickBotOpponents), et le rééquilibrage de population compte
-- les bots par niveau à chaque démarrage.
CREATE INDEX IF NOT EXISTS accounts_role_level_idx ON accounts (role, level);
