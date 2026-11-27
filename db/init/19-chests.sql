-- Coffres (docs/12-recompenses-accessoires.md) : une victoire publique en donne un, qu'on ouvre après
-- un temps d'attente. Migration additive, rejouable.
create table if not exists chests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  -- 'cuivre', 'argent' ou 'or' : décide du temps d'ouverture et du nombre d'accessoires.
  rarity text not null check (rarity in ('cuivre', 'argent', 'or')),
  won_at timestamptz not null default now(),
  -- Ouverture lancée : le coffre est prêt une fois son temps écoulé (horloge du serveur).
  unlock_started_at timestamptz,
  -- Ouvert : ses accessoires sont dans account_items (source 'coffre'). Il ne compte plus dans les places.
  opened_at timestamptz
);
-- Les places d'un compte : ses coffres pas encore ouverts.
create index if not exists chests_waiting_idx on chests (account_id) where opened_at is null;
