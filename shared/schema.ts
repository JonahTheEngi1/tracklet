import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, decimal, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "employee"]);
export const pricingTypeEnum = pgEnum("pricing_type", ["per_pound", "range_based"]);

// App Users (distinct from auth users - contains role and location assignment)
export const appUsers = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  authUserId: varchar("auth_user_id").notNull().unique(),
  role: userRoleEnum("role").notNull().default("employee"),
  locationId: varchar("location_id"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Locations (businesses using the app)
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  pricingEnabled: boolean("pricing_enabled").notNull().default(false),
  pricingType: pricingTypeEnum("pricing_type").default("per_pound"),
  perPoundRate: decimal("per_pound_rate", { precision: 10, scale: 2 }),
  isSuspended: boolean("is_suspended").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Storage Locations (for inventory organization within a location)
export const storageLocations = pgTable("storage_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pricing Tiers (for range-based pricing)
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }).notNull(),
  maxWeight: decimal("max_weight", { precision: 10, scale: 2 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Packages/Parcels
export const packages = pgTable("packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  recipientName: text("recipient_name").notNull(),
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  storageLocationId: varchar("storage_location_id"),
  notes: text("notes"),
  isDelivered: boolean("is_delivered").notNull().default(false),
  pickedUpByLastName: text("picked_up_by_last_name"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Archived Packages (cold storage for old delivered packages - condensed data)
export const archivedPackages = pgTable("archived_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  recipientName: text("recipient_name").notNull(),
  pickedUpByLastName: text("picked_up_by_last_name"),
  deliveredAt: timestamp("delivered_at").notNull(),
  archivedAt: timestamp("archived_at").defaultNow(),
});

// Backup Settings (global settings for JSONBin backups)
export const backupSettings = pgTable("backup_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyConfigured: boolean("api_key_configured").notNull().default(false),
  frequencyHours: integer("frequency_hours").notNull().default(24),
  enabled: boolean("enabled").notNull().default(false),
  lastBackupAt: timestamp("last_backup_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Location Backup Bins (tracks JSONBin IDs for each location's backups)
export const locationBackups = pgTable("location_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  binId: text("bin_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Ticket Status Enum
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);

// Support Tickets
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  locationId: varchar("location_id").notNull(),
  userId: varchar("user_id").notNull(),
  subject: text("subject").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  archivedBinId: text("archived_bin_id"),
});

// Ticket Messages
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const locationsRelations = relations(locations, ({ many }) => ({
  storageLocations: many(storageLocations),
  pricingTiers: many(pricingTiers),
  packages: many(packages),
  appUsers: many(appUsers),
}));

export const storageLocationsRelations = relations(storageLocations, ({ one }) => ({
  location: one(locations, {
    fields: [storageLocations.locationId],
    references: [locations.id],
  }),
}));

export const pricingTiersRelations = relations(pricingTiers, ({ one }) => ({
  location: one(locations, {
    fields: [pricingTiers.locationId],
    references: [locations.id],
  }),
}));

export const packagesRelations = relations(packages, ({ one }) => ({
  location: one(locations, {
    fields: [packages.locationId],
    references: [locations.id],
  }),
  storageLocation: one(storageLocations, {
    fields: [packages.storageLocationId],
    references: [storageLocations.id],
  }),
}));

export const appUsersRelations = relations(appUsers, ({ one }) => ({
  location: one(locations, {
    fields: [appUsers.locationId],
    references: [locations.id],
  }),
}));

export const archivedPackagesRelations = relations(archivedPackages, ({ one }) => ({
  location: one(locations, {
    fields: [archivedPackages.locationId],
    references: [locations.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  location: one(locations, {
    fields: [tickets.locationId],
    references: [locations.id],
  }),
  messages: many(ticketMessages),
}));

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
}));

// Insert schemas
export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  createdAt: true,
});

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  createdAt: true,
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
  createdAt: true,
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  deliveredAt: true,
});

export const insertAppUserSchema = createInsertSchema(appUsers).omit({
  id: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  archivedBinId: true,
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

// Types
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

export type StorageLocation = typeof storageLocations.$inferSelect;
export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;

export type AppUser = typeof appUsers.$inferSelect;
export type InsertAppUser = z.infer<typeof insertAppUserSchema>;

export type ArchivedPackage = typeof archivedPackages.$inferSelect;

export type BackupSettings = typeof backupSettings.$inferSelect;
export type LocationBackup = typeof locationBackups.$inferSelect;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;

export type TicketWithMessages = Ticket & {
  messages: TicketMessage[];
  userName?: string;
  locationName?: string;
};

// Extended types for frontend
export type PackageWithStorageLocation = Package & {
  storageLocation?: StorageLocation | null;
  calculatedCost?: number;
};

export type LocationWithDetails = Location & {
  storageLocations?: StorageLocation[];
  pricingTiers?: PricingTier[];
  packageCount?: number;
  userCount?: number;
};

export type AppUserWithDetails = AppUser & {
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
};

export type RecipientSummary = {
  recipientName: string;
  totalPackages: number;
  pendingPackages: number;
  deliveredPackages: number;
  totalCost: number;
  packages: PackageWithStorageLocation[];
};

export type SearchResult = {
  recipientSummaries: RecipientSummary[];
  tooManyRecipients: boolean;
  allPackages: PackageWithStorageLocation[];
};
