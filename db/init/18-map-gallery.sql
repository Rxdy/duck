-- Galerie des cartes publiques (#33). Une carte de joueur reste privée tant que son auteur ne la
-- publie pas ; published_at date sa mise en galerie. Migration additive, rejouable.
alter table maps add column if not exists visibility text not null default 'private';
alter table maps add column if not exists published_at timestamptz;
-- La galerie liste les cartes publiques, les plus récentes d'abord.
create index if not exists maps_gallery_idx on maps (visibility, published_at desc);
