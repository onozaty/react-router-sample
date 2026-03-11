import { relations } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ユーザ基本情報テーブル
export const users = pgTable("users", {
  userId: serial("user_id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdateFn(() => new Date())
    .defaultNow(),
});

// ユーザ認証情報テーブル
export const userAuths = pgTable("user_auths", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.userId, { onDelete: "cascade" }),
  hashedPassword: varchar("hashed_password", { length: 255 }).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$onUpdateFn(() => new Date())
    .defaultNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  userAuth: one(userAuths, {
    fields: [users.userId],
    references: [userAuths.userId],
  }),
}));

export const userAuthsRelations = relations(userAuths, ({ one }) => ({
  user: one(users, {
    fields: [userAuths.userId],
    references: [users.userId],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserAuth = typeof userAuths.$inferSelect;
export type NewUserAuth = typeof userAuths.$inferInsert;
