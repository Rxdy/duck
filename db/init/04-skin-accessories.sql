-- Un skin n'est pas une couleur : le canard garde la couleur assignée par le
-- serveur pour distinguer les joueurs en partie (voir back/src/shared.ts).
-- Un skin est un ACCESSOIRE cosmétique porté par le canard (chapeau...), voir
-- front/src/lib/duckAccessories.ts pour les clés reconnues.
--
-- Migration conditionnelle (pas d'outil de migration pour l'instant, voir
-- db/README.md) : ne s'exécute qu'une fois, tant que l'ancienne colonne
-- "color" existe encore sur skins. Rejouer ce fichier ensuite (déjà migré)
-- est un no-op, comme les autres fichiers de db/init/.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'skins' and column_name = 'color'
  ) then
    -- Les anciens id de skins ne veulent plus rien dire une fois la table
    -- recréée : personne n'a de skin équipé après cette migration (le
    -- premier skin du nouveau catalogue est réattribué à la prochaine
    -- connexion, voir back/src/skins.ts).
    update accounts set equipped_skin_id = null;
    drop table if exists account_skins;
    drop table skins cascade;

    create table skins (
      id uuid primary key default gen_random_uuid(),
      name text not null unique,
      accessory text not null
    );

    insert into skins (name, accessory) values
      ('Aucun', 'none'),
      ('Chapeau haut-de-forme', 'top-hat'),
      ('Casquette', 'cap'),
      ('Couronne', 'crown');

    create table account_skins (
      account_id uuid not null references accounts(id) on delete cascade,
      skin_id uuid not null references skins(id) on delete cascade,
      acquired_at timestamptz not null default now(),
      primary key (account_id, skin_id)
    );

    alter table accounts
      add constraint accounts_equipped_skin_id_fkey
      foreign key (equipped_skin_id) references skins(id);

    -- Rattrape les comptes créés avant cette migration : ils n'ont plus
    -- aucun skin (voir plus haut), on leur redonne le catalogue de départ
    -- comme le ferait grantStarterSkins() à l'inscription (voir
    -- back/src/skins.ts), plutôt que de les laisser sans aucun skin équipé.
    insert into account_skins (account_id, skin_id)
    select accounts.id, skins.id from accounts cross join skins
    on conflict do nothing;

    update accounts
    set equipped_skin_id = (select id from skins where name = 'Aucun')
    where equipped_skin_id is null;
  end if;
end $$;
