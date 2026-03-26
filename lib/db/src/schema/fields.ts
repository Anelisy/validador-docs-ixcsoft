import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const fieldsTable = pgTable("field_mappings", {
  id: serial("id").primaryKey(),
  fieldName: text("field_name").notNull(),
  tableName: text("table_name").notNull(),
  sectionName: text("section_name"),
  module: text("module").notNull(),
  description: text("description"),
  fieldType: text("field_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFieldSchema = createInsertSchema(fieldsTable).omit({ id: true, createdAt: true });
export type InsertField = z.infer<typeof insertFieldSchema>;
export type Field = typeof fieldsTable.$inferSelect;
