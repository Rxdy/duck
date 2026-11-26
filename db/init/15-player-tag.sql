-- Code joueur : l'identité publique d'un compte (« Pseudo#A3F9C2 »). Le pseudo n'est donc plus unique.
-- L'email, lui, le reste (13-unique-sans-casse.sql). Aucune donnée n'est modifiée ni supprimée.
alter table accounts
  add column if not exists tag text not null
  default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
create unique index if not exists accounts_tag_key on accounts (tag);

alter table accounts drop constraint if exists accounts_username_key;
drop index if exists accounts_username_lower_key;
