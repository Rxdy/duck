-- Un `anon_id` ne peut appartenir qu'à UN seul compte.
--
-- `anon_id` est l'identifiant du navigateur au moment de l'inscription (voir
-- front/src/lib/anonId.ts) : il sert à rattacher au compte les parties jouées
-- AVANT sa création. Rien ne l'empêchait jusqu'ici d'être revendiqué deux
-- fois — deux comptes créés depuis le même navigateur héritaient du même id,
-- et voyaient donc tous les deux le même historique, chacun s'y reconnaissant
-- (« (toi) » sur les parties de l'autre, voir back/src/db.ts#listMatchesFor).
--
-- Ce n'est pas qu'un problème d'affichage : deux comptes distincts ne
-- partagent pas une identité, et la base doit le garantir plutôt que d'espérer
-- que le code applicatif y pense.

-- Les collisions déjà en base : seul le compte le PLUS ANCIEN garde la
-- revendication. C'est lui qui jouait quand ces parties ont été enregistrées ;
-- les suivants n'ont fait qu'hériter d'un id que le navigateur n'avait pas
-- renouvelé. `id` départage les créations à la même seconde, pour que le
-- script donne le même résultat à chaque exécution.
update accounts a
set anon_id = null
where a.anon_id is not null
  and exists (
    select 1 from accounts b
    where b.anon_id = a.anon_id
      and (b.created_at, b.id) < (a.created_at, a.id)
  );

-- Index PARTIEL : plusieurs comptes peuvent parfaitement n'avoir aucun
-- `anon_id` (inscription depuis un navigateur neuf, ou id déjà pris), et
-- NULL ne doit pas entrer en conflit avec NULL.
create unique index if not exists accounts_anon_id_key
  on accounts (anon_id)
  where anon_id is not null;
