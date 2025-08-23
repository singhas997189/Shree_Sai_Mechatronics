import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["inventory", "engineer", "admin"] }),
  qrToken: varchar("qr_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// QR tokens table for secure QR-based authentication
export const qrTokens = pgTable("qr_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  used: timestamp("used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Shelf locations for QR-coded storage
export const shelfLocations = pgTable("shelf_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationName: varchar("location_name").notNull(),
  qrCode: varchar("qr_code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products table for repair tracking
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  uniqueRepairId: varchar("unique_repair_id").notNull().unique(),
  productName: varchar("product_name").notNull(),
  companyName: varchar("company_name").notNull(),
  problemDescription: text("problem_description").notNull(),
  isRepeatedItem: boolean("is_repeated_item").default(false),
  qrCodeData: varchar("qr_code_data").unique(),
  shelfLocationId: varchar("shelf_location_id").references(() => shelfLocations.id),
  status: varchar("status", { enum: ["pending", "in_progress", "completed"] }).default("pending"),
  assignedEngineerId: varchar("assigned_engineer_id").references(() => users.id),
  estimatedCompletionTime: integer("estimated_completion_time"), // in hours
  reward: integer("reward"), // monetary reward if applicable
  schematicUrl: varchar("schematic_url"), // URL to schematic files
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Components/parts inventory
export const components = pgTable("components", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  componentName: varchar("component_name").notNull(),
  qrCode: varchar("qr_code").notNull().unique(),
  imageUrl: varchar("image_url"),
  datasheetUrl: varchar("datasheet_url"),
  shelfLocationId: varchar("shelf_location_id").references(() => shelfLocations.id),
  stockQuantity: integer("stock_quantity").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Component requests from engineers
export const componentRequests = pgTable("component_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  componentId: varchar("component_id").notNull().references(() => components.id),
  requestedQuantity: integer("requested_quantity").notNull(),
  status: varchar("status", { enum: ["pending", "fulfilled", "cancelled"] }).default("pending"),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  fulfilledBy: varchar("fulfilled_by").references(() => users.id),
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fulfillment logs for Google Sheets integration
export const fulfillmentLogs = pgTable("fulfillment_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  componentId: varchar("component_id").notNull().references(() => components.id),
  requestId: varchar("request_id").notNull().references(() => componentRequests.id),
  quantity: integer("quantity").notNull(),
  inventoryPersonId: varchar("inventory_person_id").notNull().references(() => users.id),
  googleSheetsLogged: boolean("google_sheets_logged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product timeline events
export const productEvents = pgTable("product_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  eventType: varchar("event_type", { enum: ["received", "assigned", "component_requested", "component_received", "in_progress", "completed"] }).notNull(),
  description: text("description").notNull(),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// System permissions for role management
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  role: varchar("role", { enum: ["inventory", "engineer", "admin"] }).notNull(),
  permission: varchar("permission").notNull(), // e.g., "can_request_components", "can_view_analytics"
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// System activity logs
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type"), // e.g., "product", "user", "component"
  entityId: varchar("entity_id"),
  description: text("description"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  role: true,
});

export const insertQRTokenSchema = createInsertSchema(qrTokens).pick({
  userId: true,
  expiresAt: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  productName: true,
  companyName: true,
  problemDescription: true,
  isRepeatedItem: true,
  shelfLocationId: true,
});

export const insertComponentRequestSchema = createInsertSchema(componentRequests).pick({
  productId: true,
  componentId: true,
  requestedQuantity: true,
});

export const insertProductEventSchema = createInsertSchema(productEvents).pick({
  productId: true,
  eventType: true,
  description: true,
  userId: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type QRToken = typeof qrTokens.$inferSelect;
export type InsertQRToken = z.infer<typeof insertQRTokenSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ShelfLocation = typeof shelfLocations.$inferSelect;
export type Component = typeof components.$inferSelect;
export type ComponentRequest = typeof componentRequests.$inferSelect;
export type InsertComponentRequest = z.infer<typeof insertComponentRequestSchema>;
export type FulfillmentLog = typeof fulfillmentLogs.$inferSelect;
export type ProductEvent = typeof productEvents.$inferSelect;
export type InsertProductEvent = z.infer<typeof insertProductEventSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
