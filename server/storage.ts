import {
  locations,
  storageLocations,
  pricingTiers,
  packages,
  archivedPackages,
  appUsers,
  users,
  backupSettings,
  locationBackups,
  tickets,
  ticketMessages,
  type Location,
  type InsertLocation,
  type StorageLocation,
  type InsertStorageLocation,
  type PricingTier,
  type InsertPricingTier,
  type Package,
  type InsertPackage,
  type AppUser,
  type InsertAppUser,
  type LocationWithDetails,
  type PackageWithStorageLocation,
  type AppUserWithDetails,
  type RecipientSummary,
  type SearchResult,
  type ArchivedPackage,
  type BackupSettings,
  type LocationBackup,
  type Ticket,
  type InsertTicket,
  type TicketMessage,
  type InsertTicketMessage,
  type TicketWithMessages,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, ilike, sql, desc, count } from "drizzle-orm";

export interface IStorage {
  // Locations
  getLocations(): Promise<LocationWithDetails[]>;
  getLocation(id: string): Promise<LocationWithDetails | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: string): Promise<boolean>;

  // Storage Locations
  getStorageLocations(locationId: string): Promise<StorageLocation[]>;
  createStorageLocation(storageLocation: InsertStorageLocation): Promise<StorageLocation>;
  deleteStorageLocation(id: string): Promise<boolean>;

  // Pricing Tiers
  getPricingTiers(locationId: string): Promise<PricingTier[]>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  deletePricingTiersForLocation(locationId: string): Promise<void>;

  // Packages
  getPackages(locationId: string): Promise<PackageWithStorageLocation[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, pkg: Partial<InsertPackage>): Promise<Package | undefined>;
  searchPackages(locationId: string, searchTerm: string): Promise<SearchResult | null>;
  getLocationStats(locationId: string): Promise<{ totalPackages: number; pendingPackages: number; totalValue: number }>;

  // App Users
  getAppUsers(): Promise<AppUserWithDetails[]>;
  getAppUsersByLocation(locationId: string): Promise<AppUserWithDetails[]>;
  getAppUserByAuthId(authUserId: string): Promise<AppUserWithDetails | undefined>;
  getAppUserById(id: string): Promise<AppUser | undefined>;
  createAppUser(appUser: InsertAppUser): Promise<AppUser>;
  updateAppUser(id: string, appUser: Partial<InsertAppUser>): Promise<AppUser | undefined>;
  deleteAppUser(id: string, locationId?: string): Promise<boolean>;
  deleteAppUserById(id: string): Promise<boolean>;
  createPlaceholderUser(data: { id: string; email: string; firstName: string | null; lastName: string | null }): Promise<void>;

  // Bulk Package Operations
  bulkUpdatePackages(packageIds: string[], updates: Partial<InsertPackage>, locationId?: string): Promise<number>;

  // Admin Stats
  getAdminStats(): Promise<{ totalLocations: number; totalPackages: number; totalUsers: number; pendingPackages: number }>;

  // Archive Operations
  archiveOldPackages(monthsOld?: number): Promise<{ archivedCount: number }>;
  searchArchivedPackages(locationId: string, searchTerm: string): Promise<ArchivedPackage[]>;

  // Backup Operations
  getBackupSettings(): Promise<BackupSettings | null>;
  updateBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings>;
  getLocationBackups(locationId: string): Promise<LocationBackup[]>;
  addLocationBackup(locationId: string, binId: string): Promise<LocationBackup>;
  deleteOldestBackup(locationId: string): Promise<void>;
  getLocationDataForBackup(locationId: string): Promise<any>;

  // Location Suspension
  suspendLocation(id: string): Promise<Location | undefined>;
  unsuspendLocation(id: string): Promise<Location | undefined>;

  // Ticket Operations
  getTickets(): Promise<TicketWithMessages[]>;
  getTicketsByLocation(locationId: string): Promise<TicketWithMessages[]>;
  getTicketsByUser(userId: string): Promise<TicketWithMessages[]>;
  getTicket(id: string): Promise<TicketWithMessages | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: string, ticket: Partial<Ticket>): Promise<Ticket | undefined>;
  addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
}

// Helper to calculate package cost
function calculatePackageCost(
  weight: number,
  pricingEnabled: boolean,
  pricingType: string | null,
  perPoundRate: string | null,
  tiers: PricingTier[]
): number {
  if (!pricingEnabled) return 0;

  if (pricingType === "per_pound" && perPoundRate) {
    return weight * parseFloat(perPoundRate);
  }

  if (pricingType === "range_based" && tiers.length > 0) {
    for (const tier of tiers) {
      const min = parseFloat(tier.minWeight);
      const max = parseFloat(tier.maxWeight);
      if (weight >= min && weight <= max) {
        return parseFloat(tier.price);
      }
    }
    // If no tier matches, use the highest tier
    const sortedTiers = [...tiers].sort((a, b) => parseFloat(b.maxWeight) - parseFloat(a.maxWeight));
    if (weight > parseFloat(sortedTiers[0].maxWeight)) {
      return parseFloat(sortedTiers[0].price);
    }
  }

  return 0;
}

export class DatabaseStorage implements IStorage {
  // Locations
  async getLocations(): Promise<LocationWithDetails[]> {
    const allLocations = await db.select().from(locations).orderBy(desc(locations.createdAt));
    
    const result: LocationWithDetails[] = [];
    for (const loc of allLocations) {
      const [packageCountResult] = await db.select({ count: count() }).from(packages).where(eq(packages.locationId, loc.id));
      const [userCountResult] = await db.select({ count: count() }).from(appUsers).where(eq(appUsers.locationId, loc.id));
      const storages = await db.select().from(storageLocations).where(eq(storageLocations.locationId, loc.id));
      const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.locationId, loc.id));
      
      result.push({
        ...loc,
        packageCount: packageCountResult?.count || 0,
        userCount: userCountResult?.count || 0,
        storageLocations: storages,
        pricingTiers: tiers,
      });
    }
    
    return result;
  }

  async getLocation(id: string): Promise<LocationWithDetails | undefined> {
    const [loc] = await db.select().from(locations).where(eq(locations.id, id));
    if (!loc) return undefined;

    const [packageCountResult] = await db.select({ count: count() }).from(packages).where(eq(packages.locationId, id));
    const [userCountResult] = await db.select({ count: count() }).from(appUsers).where(eq(appUsers.locationId, id));
    const storages = await db.select().from(storageLocations).where(eq(storageLocations.locationId, id));
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.locationId, id));

    return {
      ...loc,
      packageCount: packageCountResult?.count || 0,
      userCount: userCountResult?.count || 0,
      storageLocations: storages,
      pricingTiers: tiers,
    };
  }

  async createLocation(location: InsertLocation): Promise<Location> {
    const [loc] = await db.insert(locations).values(location).returning();
    return loc;
  }

  async updateLocation(id: string, location: Partial<InsertLocation>): Promise<Location | undefined> {
    const [loc] = await db.update(locations).set(location).where(eq(locations.id, id)).returning();
    return loc;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const result = await db.delete(locations).where(eq(locations.id, id));
    return true;
  }

  // Storage Locations
  async getStorageLocations(locationId: string): Promise<StorageLocation[]> {
    return db.select().from(storageLocations).where(eq(storageLocations.locationId, locationId));
  }

  async createStorageLocation(storageLocation: InsertStorageLocation): Promise<StorageLocation> {
    const [storage] = await db.insert(storageLocations).values(storageLocation).returning();
    return storage;
  }

  async deleteStorageLocation(id: string): Promise<boolean> {
    await db.update(packages).set({ storageLocationId: null }).where(eq(packages.storageLocationId, id));
    await db.delete(storageLocations).where(eq(storageLocations.id, id));
    return true;
  }

  // Pricing Tiers
  async getPricingTiers(locationId: string): Promise<PricingTier[]> {
    return db.select().from(pricingTiers).where(eq(pricingTiers.locationId, locationId));
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const [t] = await db.insert(pricingTiers).values(tier).returning();
    return t;
  }

  async deletePricingTiersForLocation(locationId: string): Promise<void> {
    await db.delete(pricingTiers).where(eq(pricingTiers.locationId, locationId));
  }

  // Packages
  async getPackages(locationId: string): Promise<PackageWithStorageLocation[]> {
    const pkgs = await db
      .select()
      .from(packages)
      .where(eq(packages.locationId, locationId))
      .orderBy(desc(packages.createdAt));

    const location = await this.getLocation(locationId);
    const tiers = location?.pricingTiers || [];

    const result: PackageWithStorageLocation[] = [];
    for (const pkg of pkgs) {
      let storageLocation = null;
      if (pkg.storageLocationId) {
        const [storage] = await db.select().from(storageLocations).where(eq(storageLocations.id, pkg.storageLocationId));
        storageLocation = storage || null;
      }

      const calculatedCost = location
        ? calculatePackageCost(
            parseFloat(pkg.weight),
            location.pricingEnabled,
            location.pricingType,
            location.perPoundRate,
            tiers
          )
        : 0;

      result.push({
        ...pkg,
        storageLocation,
        calculatedCost,
      });
    }

    return result;
  }

  async getPackage(id: string): Promise<Package | undefined> {
    const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
    return pkg;
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [p] = await db.insert(packages).values(pkg).returning();
    return p;
  }

  async updatePackage(id: string, pkg: Partial<InsertPackage> & { pickedUpByLastName?: string }): Promise<Package | undefined> {
    const updateData: any = { ...pkg };
    if (pkg.isDelivered) {
      updateData.deliveredAt = new Date();
    }
    const [p] = await db.update(packages).set(updateData).where(eq(packages.id, id)).returning();
    return p;
  }

  async searchPackages(locationId: string, searchTerm: string): Promise<SearchResult | null> {
    // Search by recipient name OR tracking number with fuzzy/partial matching
    const pkgs = await db
      .select()
      .from(packages)
      .where(
        and(
          eq(packages.locationId, locationId),
          sql`(${packages.recipientName} ILIKE ${'%' + searchTerm + '%'} OR ${packages.trackingNumber} ILIKE ${'%' + searchTerm + '%'})`
        )
      )
      .orderBy(desc(packages.createdAt));

    if (pkgs.length === 0) return null;

    const location = await this.getLocation(locationId);
    const tiers = location?.pricingTiers || [];

    // Build packages with details and group by recipient
    const packagesWithDetails: PackageWithStorageLocation[] = [];
    const recipientGroups: Map<string, PackageWithStorageLocation[]> = new Map();

    for (const pkg of pkgs) {
      let storageLocation = null;
      if (pkg.storageLocationId) {
        const [storage] = await db.select().from(storageLocations).where(eq(storageLocations.id, pkg.storageLocationId));
        storageLocation = storage || null;
      }

      const calculatedCost = location
        ? calculatePackageCost(
            parseFloat(pkg.weight),
            location.pricingEnabled,
            location.pricingType,
            location.perPoundRate,
            tiers
          )
        : 0;

      const pkgWithDetails: PackageWithStorageLocation = {
        ...pkg,
        storageLocation,
        calculatedCost,
      };

      packagesWithDetails.push(pkgWithDetails);

      // Group by recipient name (case-insensitive)
      const recipientKey = pkg.recipientName.toLowerCase().trim();
      if (!recipientGroups.has(recipientKey)) {
        recipientGroups.set(recipientKey, []);
      }
      recipientGroups.get(recipientKey)!.push(pkgWithDetails);
    }

    // Check if too many recipients (more than 3)
    const uniqueRecipients = Array.from(recipientGroups.keys());
    const tooManyRecipients = uniqueRecipients.length > 3;

    // Build recipient summaries
    const recipientSummaries: RecipientSummary[] = [];
    for (const recipientKey of Array.from(recipientGroups.keys())) {
      const recipientPackages = recipientGroups.get(recipientKey)!;
      const displayName = recipientPackages[0].recipientName;
      const pendingCount = recipientPackages.filter((p: PackageWithStorageLocation) => !p.isDelivered).length;
      const deliveredCount = recipientPackages.filter((p: PackageWithStorageLocation) => p.isDelivered).length;
      const totalCost = recipientPackages
        .filter((p: PackageWithStorageLocation) => !p.isDelivered)
        .reduce((sum: number, p: PackageWithStorageLocation) => sum + (p.calculatedCost || 0), 0);

      recipientSummaries.push({
        recipientName: displayName,
        totalPackages: recipientPackages.length,
        pendingPackages: pendingCount,
        deliveredPackages: deliveredCount,
        totalCost,
        packages: recipientPackages,
      });
    }

    return {
      recipientSummaries,
      tooManyRecipients,
      allPackages: packagesWithDetails,
    };
  }

  async getLocationStats(locationId: string): Promise<{ totalPackages: number; pendingPackages: number; totalValue: number }> {
    const [totalResult] = await db.select({ count: count() }).from(packages).where(eq(packages.locationId, locationId));
    const [pendingResult] = await db
      .select({ count: count() })
      .from(packages)
      .where(and(eq(packages.locationId, locationId), eq(packages.isDelivered, false)));

    const location = await this.getLocation(locationId);
    const tiers = location?.pricingTiers || [];

    let totalValue = 0;
    if (location?.pricingEnabled) {
      const pendingPkgs = await db
        .select()
        .from(packages)
        .where(and(eq(packages.locationId, locationId), eq(packages.isDelivered, false)));

      for (const pkg of pendingPkgs) {
        totalValue += calculatePackageCost(
          parseFloat(pkg.weight),
          location.pricingEnabled,
          location.pricingType,
          location.perPoundRate,
          tiers
        );
      }
    }

    return {
      totalPackages: totalResult?.count || 0,
      pendingPackages: pendingResult?.count || 0,
      totalValue,
    };
  }

  // App Users
  async getAppUsers(): Promise<AppUserWithDetails[]> {
    const appUsersList = await db.select().from(appUsers);
    
    const result: AppUserWithDetails[] = [];
    for (const appUser of appUsersList) {
      const [authUser] = await db.select().from(users).where(eq(users.id, appUser.authUserId));
      result.push({
        ...appUser,
        email: authUser?.email || undefined,
        firstName: authUser?.firstName || undefined,
        lastName: authUser?.lastName || undefined,
        profileImageUrl: authUser?.profileImageUrl || undefined,
      });
    }
    
    return result;
  }

  async getAppUsersByLocation(locationId: string): Promise<AppUserWithDetails[]> {
    const appUsersList = await db.select().from(appUsers).where(eq(appUsers.locationId, locationId));
    
    const result: AppUserWithDetails[] = [];
    for (const appUser of appUsersList) {
      const [authUser] = await db.select().from(users).where(eq(users.id, appUser.authUserId));
      result.push({
        ...appUser,
        email: authUser?.email || undefined,
        firstName: authUser?.firstName || undefined,
        lastName: authUser?.lastName || undefined,
        profileImageUrl: authUser?.profileImageUrl || undefined,
      });
    }
    
    return result;
  }

  async getAppUserByAuthId(authUserId: string): Promise<AppUserWithDetails | undefined> {
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.authUserId, authUserId));
    if (!appUser) return undefined;

    const [authUser] = await db.select().from(users).where(eq(users.id, authUserId));
    
    return {
      ...appUser,
      email: authUser?.email || undefined,
      firstName: authUser?.firstName || undefined,
      lastName: authUser?.lastName || undefined,
      profileImageUrl: authUser?.profileImageUrl || undefined,
    };
  }

  async createAppUser(appUser: InsertAppUser): Promise<AppUser> {
    const [user] = await db.insert(appUsers).values(appUser).returning();
    return user;
  }

  async updateAppUser(id: string, appUser: Partial<InsertAppUser>): Promise<AppUser | undefined> {
    const [user] = await db.update(appUsers).set(appUser).where(eq(appUsers.id, id)).returning();
    return user;
  }

  async deleteAppUser(id: string, locationId?: string): Promise<boolean> {
    let result;
    if (locationId) {
      result = await db.delete(appUsers).where(
        and(eq(appUsers.id, id), eq(appUsers.locationId, locationId))
      ).returning();
    } else {
      result = await db.delete(appUsers).where(eq(appUsers.id, id)).returning();
    }
    return result.length > 0;
  }

  async getAppUserById(id: string): Promise<AppUser | undefined> {
    const [appUser] = await db.select().from(appUsers).where(eq(appUsers.id, id));
    return appUser;
  }

  async deleteAppUserById(id: string): Promise<boolean> {
    const result = await db.delete(appUsers).where(eq(appUsers.id, id)).returning();
    return result.length > 0;
  }

  async bulkUpdatePackages(packageIds: string[], updates: Partial<InsertPackage>, locationId?: string): Promise<number> {
    if (packageIds.length === 0) return 0;
    
    const safeUpdates: Partial<InsertPackage> & { deliveredAt?: Date } = {};
    if (updates.isDelivered !== undefined) {
      safeUpdates.isDelivered = updates.isDelivered;
      if (updates.isDelivered) {
        safeUpdates.deliveredAt = new Date();
      }
    }
    if (updates.recipientName !== undefined) safeUpdates.recipientName = updates.recipientName;
    if ((updates as any).pickedUpByLastName !== undefined) (safeUpdates as any).pickedUpByLastName = (updates as any).pickedUpByLastName;
    
    if (Object.keys(safeUpdates).length === 0) return 0;
    
    let updatedCount = 0;
    for (const pkgId of packageIds) {
      let result;
      if (locationId) {
        result = await db.update(packages).set(safeUpdates).where(
          and(eq(packages.id, pkgId), eq(packages.locationId, locationId))
        ).returning();
      } else {
        result = await db.update(packages).set(safeUpdates).where(eq(packages.id, pkgId)).returning();
      }
      if (result.length > 0) {
        updatedCount++;
      }
    }
    return updatedCount;
  }

  async createPlaceholderUser(data: { id: string; email: string; firstName: string | null; lastName: string | null }): Promise<void> {
    await db.insert(users).values({
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    });
  }

  // Admin Stats
  async getAdminStats(): Promise<{ totalLocations: number; totalPackages: number; totalUsers: number; pendingPackages: number }> {
    const [locResult] = await db.select({ count: count() }).from(locations);
    const [pkgResult] = await db.select({ count: count() }).from(packages);
    const [userResult] = await db.select({ count: count() }).from(appUsers);
    const [pendingResult] = await db.select({ count: count() }).from(packages).where(eq(packages.isDelivered, false));

    return {
      totalLocations: locResult?.count || 0,
      totalPackages: pkgResult?.count || 0,
      totalUsers: userResult?.count || 0,
      pendingPackages: pendingResult?.count || 0,
    };
  }

  // Archive old delivered packages to cold storage
  async archiveOldPackages(monthsOld: number = 2): Promise<{ archivedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    // Find delivered packages older than cutoff
    const oldPackages = await db.select().from(packages).where(
      and(
        eq(packages.isDelivered, true),
        sql`${packages.deliveredAt} < ${cutoffDate}`
      )
    );

    if (oldPackages.length === 0) {
      return { archivedCount: 0 };
    }

    // Insert into archived_packages with condensed data
    for (const pkg of oldPackages) {
      await db.insert(archivedPackages).values({
        locationId: pkg.locationId,
        trackingNumber: pkg.trackingNumber,
        recipientName: pkg.recipientName,
        pickedUpByLastName: pkg.pickedUpByLastName,
        deliveredAt: pkg.deliveredAt!,
      });
    }

    // Delete the archived packages from main table
    const idsToDelete = oldPackages.map(p => p.id);
    for (const id of idsToDelete) {
      await db.delete(packages).where(eq(packages.id, id));
    }

    return { archivedCount: oldPackages.length };
  }

  // Search archived packages
  async searchArchivedPackages(locationId: string, searchTerm: string): Promise<ArchivedPackage[]> {
    const results = await db
      .select()
      .from(archivedPackages)
      .where(
        and(
          eq(archivedPackages.locationId, locationId),
          sql`(${archivedPackages.recipientName} ILIKE ${'%' + searchTerm + '%'} OR ${archivedPackages.trackingNumber} ILIKE ${'%' + searchTerm + '%'})`
        )
      )
      .orderBy(desc(archivedPackages.deliveredAt));

    return results;
  }

  // Backup Settings
  async getBackupSettings(): Promise<BackupSettings | null> {
    const results = await db.select().from(backupSettings).limit(1);
    return results[0] || null;
  }

  async updateBackupSettings(settings: Partial<BackupSettings>): Promise<BackupSettings> {
    const existing = await this.getBackupSettings();
    if (existing) {
      const [updated] = await db
        .update(backupSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(backupSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(backupSettings)
        .values({
          apiKeyConfigured: settings.apiKeyConfigured || false,
          frequencyHours: settings.frequencyHours || 24,
          enabled: settings.enabled || false,
          lastBackupAt: settings.lastBackupAt,
        })
        .returning();
      return created;
    }
  }

  async getLocationBackups(locationId: string): Promise<LocationBackup[]> {
    return db
      .select()
      .from(locationBackups)
      .where(eq(locationBackups.locationId, locationId))
      .orderBy(desc(locationBackups.createdAt));
  }

  async addLocationBackup(locationId: string, binId: string): Promise<LocationBackup> {
    const [backup] = await db
      .insert(locationBackups)
      .values({ locationId, binId })
      .returning();
    return backup;
  }

  async deleteOldestBackup(locationId: string): Promise<void> {
    const backups = await this.getLocationBackups(locationId);
    if (backups.length > 0) {
      const oldest = backups[backups.length - 1];
      await db.delete(locationBackups).where(eq(locationBackups.id, oldest.id));
    }
  }

  async getLocationDataForBackup(locationId: string): Promise<any> {
    const location = await this.getLocation(locationId);
    const storageLocationsList = await this.getStorageLocations(locationId);
    const pricingTiersList = await this.getPricingTiers(locationId);
    const packagesList = await this.getPackages(locationId);
    const usersList = await this.getAppUsersByLocation(locationId);

    return {
      location,
      storageLocations: storageLocationsList,
      pricingTiers: pricingTiersList,
      packages: packagesList,
      users: usersList,
      backupDate: new Date().toISOString(),
    };
  }

  // Location Suspension
  async suspendLocation(id: string): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({ isSuspended: true })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async unsuspendLocation(id: string): Promise<Location | undefined> {
    const [location] = await db
      .update(locations)
      .set({ isSuspended: false })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  // Ticket Operations
  async getTickets(): Promise<TicketWithMessages[]> {
    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.createdAt));
    const result: TicketWithMessages[] = [];
    
    for (const ticket of allTickets) {
      const messages = await this.getTicketMessages(ticket.id);
      const [user] = await db.select().from(users).where(eq(users.id, ticket.userId));
      const [location] = await db.select().from(locations).where(eq(locations.id, ticket.locationId));
      
      result.push({
        ...ticket,
        messages,
        userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
        locationName: location?.name || 'Unknown',
      });
    }
    
    return result;
  }

  async getTicketsByLocation(locationId: string): Promise<TicketWithMessages[]> {
    const locationTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.locationId, locationId))
      .orderBy(desc(tickets.createdAt));
    
    const result: TicketWithMessages[] = [];
    
    for (const ticket of locationTickets) {
      const messages = await this.getTicketMessages(ticket.id);
      const [user] = await db.select().from(users).where(eq(users.id, ticket.userId));
      
      result.push({
        ...ticket,
        messages,
        userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
      });
    }
    
    return result;
  }

  async getTicketsByUser(userId: string): Promise<TicketWithMessages[]> {
    const userTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
    
    const result: TicketWithMessages[] = [];
    
    for (const ticket of userTickets) {
      const messages = await this.getTicketMessages(ticket.id);
      const [location] = await db.select().from(locations).where(eq(locations.id, ticket.locationId));
      
      result.push({
        ...ticket,
        messages,
        locationName: location?.name || 'Unknown',
      });
    }
    
    return result;
  }

  async getTicket(id: string): Promise<TicketWithMessages | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    if (!ticket) return undefined;
    
    const messages = await this.getTicketMessages(id);
    const [user] = await db.select().from(users).where(eq(users.id, ticket.userId));
    const [location] = await db.select().from(locations).where(eq(locations.id, ticket.locationId));
    
    return {
      ...ticket,
      messages,
      userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
      locationName: location?.name || 'Unknown',
    };
  }

  async createTicket(ticket: InsertTicket): Promise<Ticket> {
    const [created] = await db.insert(tickets).values(ticket).returning();
    return created;
  }

  async updateTicket(id: string, ticketUpdate: Partial<Ticket>): Promise<Ticket | undefined> {
    const [updated] = await db
      .update(tickets)
      .set({ ...ticketUpdate, updatedAt: new Date() })
      .where(eq(tickets.id, id))
      .returning();
    return updated;
  }

  async addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(message).returning();
    return created;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);
  }
}

export const storage = new DatabaseStorage();
