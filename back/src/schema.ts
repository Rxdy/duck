import { jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Reflète db/init/01-schema.sql — les deux doivent rester synchronisés à la
 * main (pas d'outil de migration pour l'instant, un seul schéma pour une
 * seule table, voir db/README.md). `players` est un tableau JSON
 * ({ anonId, name, color, score, isWinner }[]), pas de table séparée : pas
 * besoin de requêter un joueur individuellement pour l'instant.
 */
export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  mapName: text("map_name").notNull(),
  players: jsonb("players").notNull(),
  winnerAnonId: text("winner_anon_id"),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Reflète db/init/02-accounts.sql et db/init/03-skins.sql. Volontairement
 * minimal (uuid, pseudo, email, mot de passe) : pas de champs de profil tant
 * qu'ils ne servent à rien de concret. `anonId` est l'id anonyme actif au
 * moment de l'inscription (voir front/src/lib/anonId.ts) : permet de
 * retrouver les parties jouées avant la création du compte sans réécrire
 * matches. `equippedSkinId` doit toujours faire partie des skins possédés
 * (voir accountSkins) — contrainte applicative, voir back/src/skins.ts.
 */
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  anonId: text("anon_id"),
  equippedSkinId: uuid("equipped_skin_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Token opaque plutôt qu'un JWT : révocable immédiatement (déconnexion = delete). */
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Catalogue de skins (voir db/init/04-skin-accessories.sql). Un skin n'est
 * pas une couleur : le canard garde la couleur assignée par le serveur pour
 * distinguer les joueurs en partie (voir shared.ts#PLAYER_COLORS). Un skin
 * est un accessoire cosmétique porté par-dessus (chapeau...), voir
 * front/src/lib/duckAccessories.ts pour les clés reconnues.
 */
export const skins = pgTable("skins", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  accessory: text("accessory").notNull(),
});

/** Possession d'un skin par un compte : binaire, pas de doublon (clé composite). */
export const accountSkins = pgTable(
  "account_skins",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    skinId: uuid("skin_id")
      .notNull()
      .references(() => skins.id, { onDelete: "cascade" }),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.skinId] })],
);
