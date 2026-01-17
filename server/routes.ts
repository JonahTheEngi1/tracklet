import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, authStorage } from "./replit_integrations/auth";
import { insertLocationSchema, insertPackageSchema, insertStorageLocationSchema, insertAppUserSchema } from "@shared/schema";
import { z } from "zod";

// Backup scheduler
let backupInterval: NodeJS.Timeout | null = null;

function startBackupScheduler(frequencyHours: number) {
  stopBackupScheduler(); // Clear any existing interval
  const intervalMs = frequencyHours * 60 * 60 * 1000;
  console.log(`[Backup] Starting scheduler: every ${frequencyHours} hours`);
  
  backupInterval = setInterval(async () => {
    console.log(`[Backup] Running scheduled backup...`);
    try {
      await runBackupForAllLocations();
    } catch (error) {
      console.error("[Backup] Scheduled backup failed:", error);
    }
  }, intervalMs);
}

function stopBackupScheduler() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
    console.log("[Backup] Scheduler stopped");
  }
}

async function runBackupForAllLocations() {
  const apiKey = process.env.JSONBIN_API_KEY;
  if (!apiKey) {
    console.error("[Backup] No API key configured");
    return;
  }

  const allLocations = await storage.getLocations();
  
  for (const loc of allLocations) {
    try {
      const backupData = await storage.getLocationDataForBackup(loc.id);
      const existingBackups = await storage.getLocationBackups(loc.id);
      
      // Delete oldest if we have 5+
      if (existingBackups.length >= 5) {
        const oldest = existingBackups[existingBackups.length - 1];
        await fetch(`https://api.jsonbin.io/v3/b/${oldest.binId}`, {
          method: "DELETE",
          headers: { "X-Master-Key": apiKey },
        });
        await storage.deleteOldestBackup(loc.id);
      }

      // Create new bin
      const createResponse = await fetch("https://api.jsonbin.io/v3/b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": apiKey,
          "X-Bin-Name": `${loc.name}_${new Date().toISOString().split('T')[0]}`,
        },
        body: JSON.stringify(backupData),
      });

      if (createResponse.ok) {
        const binData = await createResponse.json();
        await storage.addLocationBackup(loc.id, binData.metadata.id);
        console.log(`[Backup] Created backup for ${loc.name}`);
      }
    } catch (err) {
      console.error(`[Backup] Failed for ${loc.name}:`, err);
    }
  }

  await storage.updateBackupSettings({ lastBackupAt: new Date() });
  console.log("[Backup] Completed backup run");
}

// Initialize scheduler on startup if enabled
async function initBackupScheduler() {
  try {
    const settings = await storage.getBackupSettings();
    if (settings?.enabled && settings.apiKeyConfigured && process.env.JSONBIN_API_KEY) {
      startBackupScheduler(settings.frequencyHours);
    }
  } catch (error) {
    console.error("[Backup] Failed to initialize scheduler:", error);
  }
}

// Call after DB is ready
setTimeout(initBackupScheduler, 5000);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // Get current app user (extends auth user with role info)
  app.get("/api/auth/app-user", isAuthenticated, async (req: any, res) => {
    try {
      const authUserId = req.user?.id;
      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appUser = await storage.getAppUserByAuthId(authUserId);
      if (!appUser) {
        return res.status(404).json({ message: "User not found in system" });
      }

      if (!appUser.isActive) {
        return res.status(403).json({ message: "Account is deactivated" });
      }

      // Check if user's location is suspended (skip for admins who have no location)
      if (appUser.locationId && appUser.role !== "admin") {
        const location = await storage.getLocation(appUser.locationId);
        if (location?.isSuspended) {
          return res.status(403).json({ message: "Location is suspended", code: "LOCATION_SUSPENDED" });
        }
      }

      res.json(appUser);
    } catch (error) {
      console.error("Error fetching app user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    try {
      const authUserId = req.user?.id;
      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appUser = await storage.getAppUserByAuthId(authUserId);
      if (!appUser || appUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      req.appUser = appUser;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

  // Location access middleware
  const canAccessLocation = async (req: any, res: any, next: any) => {
    try {
      const authUserId = req.user?.id;
      const locationId = req.params.id;

      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const appUser = await storage.getAppUserByAuthId(authUserId);
      if (!appUser) {
        return res.status(403).json({ message: "User not found" });
      }

      if (appUser.role === "admin") {
        req.appUser = appUser;
        return next();
      }

      if (appUser.locationId !== locationId) {
        return res.status(403).json({ message: "Access denied to this location" });
      }

      req.appUser = appUser;
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

  // ======== ADMIN ROUTES ========

  // Admin stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get all locations (admin)
  app.get("/api/admin/locations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Get single location (admin)
  app.get("/api/admin/locations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Get location users (admin)
  app.get("/api/admin/locations/:id/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAppUsersByLocation(req.params.id);
      res.json(users);
    } catch (error) {
      console.error("Error fetching location users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create location (admin)
  app.post("/api/admin/locations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { pricingTiers, ...locationData } = req.body;
      
      // Convert empty strings to null for numeric fields
      if (locationData.perPoundRate === "" || locationData.perPoundRate === undefined) {
        locationData.perPoundRate = null;
      }
      
      const parsed = insertLocationSchema.parse(locationData);
      const location = await storage.createLocation(parsed);

      // Create pricing tiers if provided
      if (pricingTiers && Array.isArray(pricingTiers)) {
        for (const tier of pricingTiers) {
          await storage.createPricingTier({
            locationId: location.id,
            minWeight: tier.minWeight,
            maxWeight: tier.maxWeight,
            price: tier.price,
          });
        }
      }

      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating location:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create location" });
    }
  });

  // Update location (admin)
  app.patch("/api/admin/locations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { pricingTiers, ...locationData } = req.body;
      
      // Convert empty strings to null for numeric fields
      if (locationData.perPoundRate === "" || locationData.perPoundRate === undefined) {
        locationData.perPoundRate = null;
      }
      
      const location = await storage.updateLocation(req.params.id, locationData);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Update pricing tiers if provided
      if (pricingTiers && Array.isArray(pricingTiers)) {
        await storage.deletePricingTiersForLocation(req.params.id);
        for (const tier of pricingTiers) {
          await storage.createPricingTier({
            locationId: req.params.id,
            minWeight: tier.minWeight,
            maxWeight: tier.maxWeight,
            price: tier.price,
          });
        }
      }

      res.json(location);
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  // Suspend location (admin)
  app.post("/api/admin/locations/:id/suspend", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const location = await storage.suspendLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error suspending location:", error);
      res.status(500).json({ message: "Failed to suspend location" });
    }
  });

  // Unsuspend location (admin)
  app.post("/api/admin/locations/:id/unsuspend", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const location = await storage.unsuspendLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error unsuspending location:", error);
      res.status(500).json({ message: "Failed to unsuspend location" });
    }
  });

  // Delete location with backup (admin)
  app.delete("/api/admin/locations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { confirmName } = req.body;
      const location = await storage.getLocation(req.params.id);
      
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }

      // Verify confirmation name matches
      if (confirmName !== location.name) {
        return res.status(400).json({ message: "Location name does not match" });
      }

      // Create a final backup to JSONBin before deletion
      const apiKey = process.env.JSONBIN_API_KEY;
      if (apiKey) {
        try {
          const backupData = await storage.getLocationDataForBackup(req.params.id);
          backupData.deletedAt = new Date().toISOString();
          backupData.deleteReason = "Location deleted by admin";
          
          await fetch("https://api.jsonbin.io/v3/b", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Master-Key": apiKey,
              "X-Bin-Name": `DELETED_${location.name}_${new Date().toISOString().split('T')[0]}`,
            },
            body: JSON.stringify(backupData),
          });
          console.log(`[Backup] Created deletion backup for ${location.name}`);
        } catch (backupError) {
          console.error("[Backup] Failed to create deletion backup:", backupError);
        }
      }

      await storage.deleteLocation(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting location:", error);
      res.status(500).json({ message: "Failed to delete location" });
    }
  });

  // Get all users (admin)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAppUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user (admin)
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, password, role, locationId } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if email already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }

      // Hash the password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user record with credentials
      const user = await authStorage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      // Create the app user record with role and location
      const appUser = await storage.createAppUser({
        authUserId: user.id,
        role,
        locationId: locationId || null,
        isActive: true,
      });

      res.status(201).json(appUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update user (admin)
  app.patch("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const user = await storage.updateAppUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin)
  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Get the app user first to find the auth user ID
      const appUser = await storage.getAppUserById(req.params.id);
      if (!appUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete the app user record
      await storage.deleteAppUserById(req.params.id);

      // Also delete the auth user record if it exists
      if (appUser.authUserId) {
        await authStorage.deleteUser(appUser.authUserId);
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // ======== LOCATION ROUTES ========

  // Get location (for location users)
  app.get("/api/locations/:id", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const location = await storage.getLocation(req.params.id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Get location stats
  app.get("/api/locations/:id/stats", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const stats = await storage.getLocationStats(req.params.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get packages for location
  app.get("/api/locations/:id/packages", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const packages = await storage.getPackages(req.params.id);
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  // Search packages by recipient name or tracking number
  app.get("/api/locations/:id/search/:query", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const summary = await storage.searchPackages(req.params.id, req.params.query);
      res.json(summary);
    } catch (error) {
      console.error("Error searching packages:", error);
      res.status(500).json({ message: "Failed to search packages" });
    }
  });

  // Create package
  app.post("/api/locations/:id/packages", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const packageData = {
        ...req.body,
        locationId: req.params.id,
        storageLocationId: req.body.storageLocationId || null,
      };

      const pkg = await storage.createPackage(packageData);
      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  // Search archived packages (must be before :packageId route to avoid matching "archive" as a package ID)
  app.get("/api/locations/:id/packages/archive/search", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      const searchTerm = req.query.q as string;
      if (!searchTerm || searchTerm.trim().length === 0) {
        return res.json([]);
      }

      const results = await storage.searchArchivedPackages(req.params.id, searchTerm.trim());
      res.json(results);
    } catch (error) {
      console.error("Error searching archived packages:", error);
      res.status(500).json({ message: "Failed to search archived packages" });
    }
  });

  // Bulk update packages (must be before :packageId route to avoid matching "bulk" as a package ID)
  app.patch("/api/locations/:id/packages/bulk", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      const { packageIds, updates } = req.body;
      
      if (!packageIds || !Array.isArray(packageIds) || packageIds.length === 0) {
        return res.status(400).json({ message: "Package IDs are required" });
      }

      // Pass locationId to ensure packages belong to this location
      const count = await storage.bulkUpdatePackages(packageIds, updates, req.params.id);
      res.json({ updated: count });
    } catch (error) {
      console.error("Error bulk updating packages:", error);
      res.status(500).json({ message: "Failed to update packages" });
    }
  });

  // Update package
  app.patch("/api/locations/:id/packages/:packageId", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const pkg = await storage.updatePackage(req.params.packageId, req.body);
      if (!pkg) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(pkg);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  // Get storage locations
  app.get("/api/locations/:id/storage-locations", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const storageLocations = await storage.getStorageLocations(req.params.id);
      res.json(storageLocations);
    } catch (error) {
      console.error("Error fetching storage locations:", error);
      res.status(500).json({ message: "Failed to fetch storage locations" });
    }
  });

  // Create storage location
  app.post("/api/locations/:id/storage-locations", isAuthenticated, canAccessLocation, async (req, res) => {
    try {
      const storageLocation = await storage.createStorageLocation({
        ...req.body,
        locationId: req.params.id,
      });
      res.status(201).json(storageLocation);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(500).json({ message: "Failed to create storage location" });
    }
  });

  // Delete storage location
  app.delete("/api/locations/:id/storage-locations/:storageId", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      // Only managers and admins can delete storage locations
      if (req.appUser.role === "employee") {
        return res.status(403).json({ message: "Permission denied" });
      }

      await storage.deleteStorageLocation(req.params.storageId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting storage location:", error);
      res.status(500).json({ message: "Failed to delete storage location" });
    }
  });

  // Get location users
  app.get("/api/locations/:id/users", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      // Only managers and admins can view users
      if (req.appUser.role === "employee") {
        return res.status(403).json({ message: "Permission denied" });
      }

      const users = await storage.getAppUsersByLocation(req.params.id);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create location user (manager only)
  app.post("/api/locations/:id/users", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      // Only managers and admins can create users
      if (req.appUser.role === "employee") {
        return res.status(403).json({ message: "Permission denied" });
      }

      const { email, firstName, lastName, password, role } = req.body;

      // Managers can only create employees
      if (req.appUser.role === "manager" && role !== "employee") {
        return res.status(403).json({ message: "Managers can only create employees" });
      }

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if email already exists
      const existingUser = await authStorage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }

      // Hash the password
      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the user record with credentials
      const user = await authStorage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      // Create the app user record with role and location
      const appUser = await storage.createAppUser({
        authUserId: user.id,
        role: role || "employee",
        locationId: req.params.id,
        isActive: true,
      });

      res.status(201).json(appUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Update location user
  app.patch("/api/locations/:id/users/:userId", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      // Only managers and admins can update users
      if (req.appUser.role === "employee") {
        return res.status(403).json({ message: "Permission denied" });
      }

      const user = await storage.updateAppUser(req.params.userId, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete location user
  app.delete("/api/locations/:id/users/:userId", isAuthenticated, canAccessLocation, async (req: any, res) => {
    try {
      // Only managers and admins can delete users
      if (req.appUser.role === "employee") {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Pass locationId to ensure user belongs to this location
      const deleted = await storage.deleteAppUser(req.params.userId, req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Archive old packages (admin only - moves delivered packages older than 2 months to cold storage)
  app.post("/api/archive/run", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const monthsOld = req.body.monthsOld || 2;
      const result = await storage.archiveOldPackages(monthsOld);
      res.json(result);
    } catch (error) {
      console.error("Error archiving packages:", error);
      res.status(500).json({ message: "Failed to archive packages" });
    }
  });

  // ============= BACKUP ROUTES (Admin Only) =============

  // Get backup settings
  app.get("/api/admin/backup/settings", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const settings = await storage.getBackupSettings();
      res.json(settings || { apiKeyConfigured: false, frequencyHours: 24, enabled: false });
    } catch (error) {
      console.error("Error fetching backup settings:", error);
      res.status(500).json({ message: "Failed to fetch backup settings" });
    }
  });

  // Update backup settings (frequency)
  app.patch("/api/admin/backup/settings", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { frequencyHours, enabled } = req.body;
      const updates: any = {};
      if (frequencyHours !== undefined) updates.frequencyHours = frequencyHours;
      if (enabled !== undefined) updates.enabled = enabled;
      
      const settings = await storage.updateBackupSettings(updates);
      
      // Restart scheduler if frequency changed and backups are enabled
      if (frequencyHours !== undefined && settings.enabled) {
        startBackupScheduler(settings.frequencyHours);
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating backup settings:", error);
      res.status(500).json({ message: "Failed to update backup settings" });
    }
  });

  // Validate JSONBin API key (expects key to be set in JSONBIN_API_KEY secret)
  app.post("/api/admin/backup/validate-key", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const apiKey = process.env.JSONBIN_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ 
          message: "Please add your JSONBin API key as a secret named JSONBIN_API_KEY in your Replit secrets panel, then try again." 
        });
      }

      // Validate API key by making a test request to JSONBin (list bins endpoint)
      const response = await fetch("https://api.jsonbin.io/v3/b", {
        headers: {
          "X-Master-Key": apiKey,
        },
      });

      // 200 = success, 401 = invalid key
      if (response.status === 401) {
        return res.status(400).json({ message: "Invalid API key. Please check your JSONBIN_API_KEY secret." });
      }
      
      if (!response.ok && response.status !== 200) {
        // Other errors - still try to mark as configured if not auth error
        console.log("JSONBin validation response:", response.status);
      }

      await storage.updateBackupSettings({ apiKeyConfigured: true });
      
      res.json({ success: true, message: "API key validated successfully" });
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ message: "Failed to validate API key" });
    }
  });

  // Enable/disable backups
  app.post("/api/admin/backup/toggle", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { enabled } = req.body;
      const settings = await storage.getBackupSettings();

      if (enabled && !settings?.apiKeyConfigured) {
        return res.status(400).json({ message: "Please validate your API key first" });
      }

      if (enabled && !process.env.JSONBIN_API_KEY) {
        return res.status(400).json({ message: "JSONBIN_API_KEY secret not found. Please add it to your Replit secrets." });
      }

      const updated = await storage.updateBackupSettings({ enabled });
      
      // Start or stop the backup scheduler
      if (enabled) {
        startBackupScheduler(updated.frequencyHours);
      } else {
        stopBackupScheduler();
      }
      
      res.json({ 
        success: true, 
        enabled: updated.enabled,
        message: enabled ? `Backups enabled every ${updated.frequencyHours} hours` : "Backups disabled"
      });
    } catch (error) {
      console.error("Error toggling backups:", error);
      res.status(500).json({ message: "Failed to toggle backups" });
    }
  });

  // Get backup status for all locations
  app.get("/api/admin/backup/locations", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allLocations = await storage.getLocations();
      const locationsWithBackups = await Promise.all(
        allLocations.map(async (loc) => {
          const backups = await storage.getLocationBackups(loc.id);
          return {
            ...loc,
            backupCount: backups.length,
            lastBackup: backups[0]?.createdAt || null,
          };
        })
      );
      res.json(locationsWithBackups);
    } catch (error) {
      console.error("Error fetching backup locations:", error);
      res.status(500).json({ message: "Failed to fetch backup locations" });
    }
  });

  // Run backup for all locations manually
  app.post("/api/admin/backup/run", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const apiKey = process.env.JSONBIN_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ message: "API key not configured" });
      }

      const allLocations = await storage.getLocations();
      const results: any[] = [];

      for (const loc of allLocations) {
        try {
          // Get location data for backup
          const backupData = await storage.getLocationDataForBackup(loc.id);
          
          // Check existing backups for this location
          const existingBackups = await storage.getLocationBackups(loc.id);
          
          // If we have 5+ backups, delete oldest and its JSONBin entry
          if (existingBackups.length >= 5) {
            const oldest = existingBackups[existingBackups.length - 1];
            // Delete from JSONBin
            await fetch(`https://api.jsonbin.io/v3/b/${oldest.binId}`, {
              method: "DELETE",
              headers: { "X-Master-Key": apiKey },
            });
            await storage.deleteOldestBackup(loc.id);
          }

          // Create new bin on JSONBin
          const createResponse = await fetch("https://api.jsonbin.io/v3/b", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Master-Key": apiKey,
              "X-Bin-Name": `${loc.name}_${new Date().toISOString().split('T')[0]}`,
            },
            body: JSON.stringify(backupData),
          });

          if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.error(`JSONBin create error for ${loc.name}:`, createResponse.status, errorText);
            throw new Error(`Failed to create backup bin for ${loc.name}`);
          }

          const binData = await createResponse.json();
          await storage.addLocationBackup(loc.id, binData.metadata.id);
          
          results.push({ locationId: loc.id, name: loc.name, success: true, binId: binData.metadata.id });
        } catch (err: any) {
          results.push({ locationId: loc.id, name: loc.name, success: false, error: err.message });
        }
      }

      // Update last backup time
      await storage.updateBackupSettings({ lastBackupAt: new Date() });

      res.json({ results, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error running backup:", error);
      res.status(500).json({ message: "Failed to run backup" });
    }
  });

  // ======== TICKET ROUTES ========

  // Get all tickets (admin only)
  app.get("/api/admin/tickets", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allTickets = await storage.getTickets();
      res.json(allTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get single ticket (admin only)
  app.get("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Update ticket status (admin only)
  app.patch("/api/admin/tickets/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { status } = req.body;
      const ticket = await storage.getTicket(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const updates: any = { status };
      
      // If resolving, set resolved timestamp
      if (status === "resolved" || status === "closed") {
        updates.resolvedAt = new Date();
        
        // Archive to JSONBin when resolved
        const apiKey = process.env.JSONBIN_API_KEY;
        if (apiKey) {
          try {
            const archiveData = {
              ...ticket,
              resolvedAt: updates.resolvedAt,
              archivedAt: new Date().toISOString(),
            };
            
            const response = await fetch("https://api.jsonbin.io/v3/b", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Master-Key": apiKey,
                "X-Bin-Name": `TICKET_${ticket.id}_${new Date().toISOString().split('T')[0]}`,
              },
              body: JSON.stringify(archiveData),
            });

            if (response.ok) {
              const binData = await response.json();
              updates.archivedBinId = binData.metadata.id;
              console.log(`[Tickets] Archived ticket ${ticket.id} to JSONBin`);
            }
          } catch (archiveError) {
            console.error("[Tickets] Failed to archive ticket:", archiveError);
          }
        }
      }

      const updated = await storage.updateTicket(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Add message to ticket (admin)
  app.post("/api/admin/tickets/:id/messages", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { message } = req.body;
      const ticket = await storage.getTicket(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      const ticketMessage = await storage.addTicketMessage({
        ticketId: req.params.id,
        senderId: req.user.id,
        isAdmin: true,
        message,
      });

      // Update ticket to in_progress if it was open
      if (ticket.status === "open") {
        await storage.updateTicket(req.params.id, { status: "in_progress" });
      }

      res.status(201).json(ticketMessage);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  // ======== USER TICKET ROUTES ========

  // Get user's tickets
  app.get("/api/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const tickets = await storage.getTicketsByUser(req.user.id);
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Get single ticket (user)
  app.get("/api/tickets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Verify user owns this ticket
      if (ticket.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this ticket" });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error fetching ticket:", error);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  // Create ticket (user)
  app.post("/api/tickets", isAuthenticated, async (req: any, res) => {
    try {
      const { subject, message } = req.body;
      
      if (!subject || !message) {
        return res.status(400).json({ message: "Subject and message are required" });
      }

      // Get user's app user record to find their location
      const appUser = await storage.getAppUserByAuthId(req.user.id);
      if (!appUser || !appUser.locationId) {
        return res.status(400).json({ message: "User must be assigned to a location to create tickets" });
      }

      const ticket = await storage.createTicket({
        locationId: appUser.locationId,
        userId: req.user.id,
        subject,
        status: "open",
      });

      // Add the initial message
      await storage.addTicketMessage({
        ticketId: ticket.id,
        senderId: req.user.id,
        isAdmin: false,
        message,
      });

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating ticket:", error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Add message to ticket (user)
  app.post("/api/tickets/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      const ticket = await storage.getTicket(req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Verify user owns this ticket
      if (ticket.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to message this ticket" });
      }

      // Don't allow messages on closed tickets
      if (ticket.status === "closed") {
        return res.status(400).json({ message: "Cannot add messages to closed tickets" });
      }

      const ticketMessage = await storage.addTicketMessage({
        ticketId: req.params.id,
        senderId: req.user.id,
        isAdmin: false,
        message,
      });

      res.status(201).json(ticketMessage);
    } catch (error) {
      console.error("Error adding message:", error);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  return httpServer;
}
