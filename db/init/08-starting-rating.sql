-- Le classement démarre à ZÉRO, pas au milieu de l'échelle : un nouveau
-- joueur voit son score monter dès sa première victoire, et la protection
-- "jamais en dessous de zéro" (voir back/src/rating.ts) fait qu'il ne peut
-- rien perdre tant qu'il n'a rien gagné.
ALTER TABLE accounts ALTER COLUMN rating SET DEFAULT 0;
