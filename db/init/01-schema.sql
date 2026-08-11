-- Historique des parties (voir docs/05-comptes-progression.md). Pas encore
-- de comptes : chaque joueur est identifié par un UUID anonyme généré et
-- conservé côté navigateur (front/src/lib/anonId.ts). Quand un vrai système
-- de comptes existera, une migration reliera anon_id -> account_id et cette
-- table n'aura pas besoin de changer de forme.
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  map_name text not null,
  -- Un élément par joueur de la partie : { anonId, name, color, score, isWinner }.
  players jsonb not null,
  winner_anon_id text,
  played_at timestamptz not null default now()
);
