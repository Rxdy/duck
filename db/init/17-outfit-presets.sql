-- Trois tenues enregistrables ; `outfit` reste celle que le canard porte. Migration additive.
alter table accounts add column if not exists outfit_presets jsonb;
alter table accounts add column if not exists active_preset integer not null default 0;
