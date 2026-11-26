-- Accessoires possédés et tenue portée (docs/12-recompenses-accessoires.md). Migration additive.
-- La table des comptes d'abord : prendre son verrou le plus fort dès le début évite un interblocage
-- avec des écritures en cours quand le fichier est rejoué.
alter table accounts add column if not exists outfit jsonb;

create table if not exists account_items (
  account_id uuid not null references accounts(id) on delete cascade,
  item_id text not null,
  -- 'signup', 'tutorial', 'ancien' (reprise des anciens chapeaux)...
  source text not null,
  acquired_at timestamptz not null default now(),
  -- On ne regagne jamais un accessoire.
  primary key (account_id, item_id)
);
-- Chaque cadeau ne se reçoit qu'une fois par compte.
create unique index if not exists account_items_gift_key
  on account_items (account_id, source) where source in ('signup', 'tutorial');


-- Les comptes existants gardent leurs anciens chapeaux, devenus des accessoires du nouveau catalogue.
insert into account_items (account_id, item_id, source)
select owned.account_id,
       case skins.accessory when 'top-hat' then 'hautdeforme' when 'cap' then 'casquette' else 'couronne' end,
       'ancien'
from account_skins owned
join skins on skins.id = owned.skin_id
where skins.accessory in ('top-hat', 'cap', 'crown')
on conflict do nothing;

update accounts
set outfit = jsonb_build_array(
      case skins.accessory when 'top-hat' then 'hautdeforme' when 'cap' then 'casquette' else 'couronne' end)
from skins
where accounts.equipped_skin_id = skins.id
  and skins.accessory in ('top-hat', 'cap', 'crown')
  and accounts.outfit is null;
