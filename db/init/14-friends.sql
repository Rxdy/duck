-- Amis : une ligne par paire de comptes, "pending" tant que le destinataire n'a pas accepté.
create table if not exists friendships (
  requester_id uuid not null references accounts(id) on delete cascade,
  addressee_id uuid not null references accounts(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- Une seule relation par paire, quel que soit le sens de la demande.
create unique index if not exists friendships_pair_key
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on friendships (addressee_id);
