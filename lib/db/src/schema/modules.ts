import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const modulesTable = pgTable("modules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Module = typeof modulesTable.$inferSelect;
