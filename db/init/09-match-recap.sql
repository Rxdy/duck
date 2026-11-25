-- Récapitulatif des parties sur la page Compte (voir
-- docs/05-comptes-progression.md) : la table matches gardait déjà QUI a joué,
-- avec quel score, et QUAND. Il lui manquait le mode et la durée.
--
-- Les deux colonnes sont NULLABLES, sans valeur par défaut : les parties
-- enregistrées avant cette version n'ont jamais été chronométrées, et leur
-- inventer une durée de zéro afficherait "0 s" sur des parties qui ont bien
-- duré. Une donnée absente doit se dire absente.

-- Mode de jeu (voir back/src/shared.ts#GAME_MODES) : "duel", "ffa3", "ffa4".
-- Redondant avec le nombre de joueurs aujourd'hui, mais ce ne sera plus vrai
-- dès qu'un mode se distinguera par ses règles et non par son effectif — d'où
-- la colonne plutôt qu'un calcul.
alter table matches add column if not exists mode text;

-- Durée réelle de la manche, du premier joueur entré au point gagnant.
alter table matches add column if not exists duration_ms integer;
