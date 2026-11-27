import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  // Mode et durée : nullables, parce que les parties enregistrées avant
  // db/init/09-match-recap.sql n'ont jamais été chronométrées. Leur inventer
  // une durée de zéro afficherait "0 s" sur des parties qui ont bien duré.
  mode: text("mode"),
  durationMs: integer("duration_ms"),
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
  // Libre : plusieurs joueurs peuvent porter le même. C'est `tag` qui les distingue.
  username: text("username").notNull(),
  // Code joueur public et unique, attribué par la base (db/init/15-player-tag.sql).
  tag: text("tag")
    .notNull()
    .default(sql`upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))`),
  email: text("email").notNull().unique(),
  // NULL pour un compte qui ne se connecte qu'avec Google.
  passwordHash: text("password_hash"),
  googleSub: text("google_sub"),
  anonId: text("anon_id"),
  // Classement Elo (voir back/src/rating.ts), mis à jour à chaque fin de
  // partie. Démarre à zéro (db/init/08-starting-rating.sql) : un nouveau
  // joueur ne peut rien perdre tant qu'il n'a rien gagné.
  rating: integer("rating").notNull().default(0),
  // "human" ou "bot" (voir back/src/botAccounts.ts). Jamais transmis au
  // client : un joueur ne doit pas pouvoir dire, en regardant l'interface,
  // s'il affronte un humain. Reflète db/init/07-bot-accounts.sql.
  role: text("role").notNull().default("human"),
  // Niveau de jeu d'un bot (clé de bots.ts#BOT_LEVELS), NULL pour un humain.
  // C'est son intelligence, fixée à la création et jamais réécrite : le
  // classement bouge avec les résultats, le cerveau non. Reflète
  // db/init/11-bot-level.sql.
  level: text("level"),
  equippedSkinId: uuid("equipped_skin_id"),
  // Identifiants des accessoires portés (voir wardrobe.ts).
  outfit: jsonb("outfit"),
  // Les tenues enregistrées et le numéro de celle qui est portée.
  outfitPresets: jsonb("outfit_presets"),
  activePreset: integer("active_preset").notNull().default(0),
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

/**
 * Reflète db/init/05-maps.sql. Une seule table pour les cartes des joueurs et
 * les cartes officielles, distinguées par `kind` : ce sont les mêmes données
 * (une grille), seule leur provenance et leur usage diffèrent. `spawnCount`
 * est dérivé de la grille à l'enregistrement (voir back/src/maps.ts) et
 * stocké pour pouvoir choisir une carte par mode sans la relire.
 */
export const maps = pgTable("maps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("player"),
  // NULL uniquement pour une carte officielle : celle d'un joueur a toujours
  // un compte propriétaire (sauvegarder exige d'être connecté).
  ownerAccountId: uuid("owner_account_id").references(() => accounts.id, { onDelete: "cascade" }),
  spawnCount: integer("spawn_count").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  tiles: jsonb("tiles").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // Reflète db/init/18-map-gallery.sql : « private » ou « public » (en galerie).
  visibility: text("visibility").notNull().default("private"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});

/** Reflète db/init/14-friends.sql. L'unicité par paire (dans les deux sens) est portée par la base. */
export const friendships = pgTable(
  "friendships",
  {
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.requesterId, table.addresseeId] })],
);

/** Reflète db/init/16-wardrobe.sql : les accessoires possédés, jamais deux fois le même. */
export const accountItems = pgTable(
  "account_items",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    source: text("source").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.itemId] })],
);

/** Reflète db/init/19-chests.sql : les coffres gagnés, en attente, en cours d'ouverture ou ouverts. */
export const chests = pgTable("chests", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  rarity: text("rarity").notNull(),
  wonAt: timestamp("won_at", { withTimezone: true }).notNull().defaultNow(),
  unlockStartedAt: timestamp("unlock_started_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
});
