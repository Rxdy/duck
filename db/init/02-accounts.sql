-- Comptes utilisateurs (voir docs/05-comptes-progression.md). Volontairement
-- minimal : uuid, pseudo, email, mot de passe — pas de champs de profil
-- (avatar, bio, stats...) tant qu'ils ne servent à rien de concret. Email +
-- mot de passe pour commencer ; les connexions Google/Discord/GitHub
-- mentionnées dans la doc viendront plus tard (nécessitent d'enregistrer une
-- app côté de chaque fournisseur).
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  -- Id anonyme actif au moment de l'inscription (voir front/src/lib/anonId.ts)
  -- : permet de retrouver les parties jouées avant la création du compte
  -- (matches.players contient cet anonId) sans avoir à réécrire
  -- l'historique existant.
  anon_id text,
  created_at timestamptz not null default now()
);

-- Session simple par token opaque plutôt qu'un JWT : révocable immédiatement
-- (déconnexion = delete), pas de dépendance de signature à gérer.
create table if not exists sessions (
  token text primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);
