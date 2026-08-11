-- Un joueur contrôle un seul canard, mais peut posséder plusieurs skins et
-- n'en équipe qu'un seul à la fois (voir docs/05-comptes-progression.md).
-- Catalogue minimal pour commencer : les 4 couleurs déjà utilisées pour les
-- canards en partie (voir front/src/theme.ts#PLAYER_COLORS) deviennent les 4
-- premiers skins, offerts à l'inscription (pas encore de boutique/déblocage).
create table if not exists skins (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null
);

-- Conditionnel : db/init/04-skin-accessories.sql remplace ensuite cette
-- table par une version sans colonne "color" (un skin est un accessoire, pas
-- une couleur). Sans cette garde, rejouer ce fichier après cette migration
-- échouerait en tentant d'insérer dans une colonne qui n'existe plus.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'skins' and column_name = 'color'
  ) then
    insert into skins (name, color) values
      ('Rouge', '#FF4D6D'),
      ('Cyan', '#00C2D1'),
      ('Jaune', '#FFB100'),
      ('Violet', '#9B5DE5')
    on conflict (name) do nothing;
  end if;
end $$;

-- Un skin ne peut être possédé qu'une fois par compte (clé primaire
-- composite) : pas de compteur de doublons, la possession est binaire.
create table if not exists account_skins (
  account_id uuid not null references accounts(id) on delete cascade,
  skin_id uuid not null references skins(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (account_id, skin_id)
);

-- Le skin équipé doit faire partie des skins possédés (contrainte applicative,
-- voir back/src/skins.ts) ; nullable pour ne pas bloquer la création du
-- compte si l'attribution des skins de départ échouait pour une raison ou
-- une autre.
alter table accounts add column if not exists equipped_skin_id uuid references skins(id);
