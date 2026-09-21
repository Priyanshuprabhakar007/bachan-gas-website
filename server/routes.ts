
import type { Express } from "express";
import express from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, hashPassword, sanitizeUser } from "./auth";
import { normalizePhone } from "./otpService";
import { randomBytes } from "crypto";
import { UserRole, DEFAULT_PERMISSIONS, PickupRequestStatus, TripStatus, TripReturnStatus, pickupRequestItems, tripReturnItems, pickupRequests as pickupRequestsTable, orders as ordersTable, users as usersTable, products as productsTable, categories as categoriesTable, siteSettings as siteSettingsTable } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ObjectStorageService, objectStorageClient } from "./replit_integrations/object_storage";
import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed."));
    }
  },
});

async function seedDatabase() {
  const existingRoles = await storage.getRoles();
  if (existingRoles.length === 0) {
    const defaultRoles = [
      { name: 'Super Admin', slug: 'super_admin', isSystem: true, isActive: true },
      { name: 'Admin', slug: 'admin', isSystem: true, isActive: true },
      { name: 'Delivery Man', slug: 'delivery_man', isSystem: false, isActive: true },
      { name: 'Gate Keeper', slug: 'gate_keeper', isSystem: false, isActive: true },
      { name: 'Accountant', slug: 'accountant', isSystem: false, isActive: true },
      { name: 'Customer', slug: 'customer', isSystem: true, isActive: true },
      { name: 'Staff', slug: 'staff', isSystem: false, isActive: true },
      { name: 'Manager', slug: 'manager', isSystem: false, isActive: true },
    ];
    for (const role of defaultRoles) {
      await storage.createRole(role);
    }
    console.log("Seeded default roles");
  }

  const existingPerms = await storage.getPermissions();
  if (existingPerms.length === 0) {
    for (const perm of DEFAULT_PERMISSIONS) {
      await storage.createPermission(perm);
    }
    console.log("Seeded default permissions");

    const allPerms = await storage.getPermissions();
    const allPermIds = allPerms.map(p => p.id);

    const superAdminRole = await storage.getRoleBySlug('super_admin');
    if (superAdminRole) {
      await storage.setRolePermissions(superAdminRole.id, allPermIds);
    }
    const adminRole = await storage.getRoleBySlug('admin');
    if (adminRole) {
      await storage.setRolePermissions(adminRole.id, allPermIds);
    }

    const deliveryRole = await storage.getRoleBySlug('delivery_man');
    if (deliveryRole) {
      const deliveryPerms = allPerms.filter(p => 
        ['DELIVERY_VIEW_ASSIGNED_ONLY', 'DELIVERY_UPDATE_STATUS', 'ORDER_VIEW', 'ORDER_STATUS_UPDATE', 'PICKUP_REQUEST_CREATE', 'TRIP_MANAGE', 'VEHICLE_VIEW'].includes(p.key)
      );
      await storage.setRolePermissions(deliveryRole.id, deliveryPerms.map(p => p.id));
    }

    const gateKeeperRole = await storage.getRoleBySlug('gate_keeper');
    if (gateKeeperRole) {
      const gkPerms = allPerms.filter(p => 
        ['GATE_PASS_VIEW', 'GATE_PASS_CREATE', 'STOCK_MOVEMENT_VIEW', 'STOCK_MOVEMENT_CREATE', 'INVENTORY_VIEW', 'PICKUP_APPROVE', 'RETURN_VERIFY', 'VEHICLE_VIEW'].includes(p.key)
      );
      await storage.setRolePermissions(gateKeeperRole.id, gkPerms.map(p => p.id));
    }

    const accountantRole = await storage.getRoleBySlug('accountant');
    if (accountantRole) {
      const accPerms = allPerms.filter(p => 
        ['PAYMENT_VIEW', 'INVOICE_VIEW', 'REPORTS_VIEW', 'ORDER_VIEW', 'BILLING_VIEW'].includes(p.key)
      );
      await storage.setRolePermissions(accountantRole.id, accPerms.map(p => p.id));
    }

    console.log("Seeded role permissions");
  }

  const adminRole = await storage.getRoleBySlug('admin');
  const existingAdmin = await storage.getUserByUsername("admin");
  if (!existingAdmin) {
    const adminPassword = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: adminPassword,
      name: "Bachan Admin",
      email: "admin@bachangas.com",
      role: UserRole.ADMIN,
      roleId: adminRole?.id,
      phone: "+91 9876543210",
    });
    console.log("Seeded admin user");
  } else if (!existingAdmin.roleId && adminRole) {
    await storage.updateUser(existingAdmin.id, { roleId: adminRole.id });
  }

  const deliveryRole = await storage.getRoleBySlug('delivery_man');
  const existingDelivery = await storage.getUserByUsername("delivery1");
  if (!existingDelivery) {
    const deliveryPassword = await hashPassword("delivery123");
    await storage.createUser({
      username: "delivery1",
      password: deliveryPassword,
      name: "Sukhwinder Singh",
      email: "sukhwinder@bachangas.com",
      role: UserRole.DELIVERY_MAN,
      roleId: deliveryRole?.id,
      phone: "+91 98765 11111",
      staffId: "DLV-001",
    });
    console.log("Seeded delivery man");
  }

  const gateKeeperRole = await storage.getRoleBySlug('gate_keeper');
  const existingGK = await storage.getUserByUsername("gatekeeper1");
  if (!existingGK) {
    const gkPassword = await hashPassword("gate123");
    await storage.createUser({
      username: "gatekeeper1",
      password: gkPassword,
      name: "Harpreet Singh",
      email: "harpreet@bachangas.com",
      role: UserRole.GATE_KEEPER,
      roleId: gateKeeperRole?.id,
      phone: "+91 98765 22222",
      staffId: "GK-001",
    });
    console.log("Seeded gate keeper");
  }

  const accountantRoleObj = await storage.getRoleBySlug('accountant');
  const existingAcc = await storage.getUserByUsername("accountant1");
  if (!existingAcc) {
    const accPassword = await hashPassword("account123");
    await storage.createUser({
      username: "accountant1",
      password: accPassword,
      name: "Gurpreet Kaur",
      email: "gurpreet@bachangas.com",
      role: UserRole.ACCOUNTANT,
      roleId: accountantRoleObj?.id,
      phone: "+91 98765 33333",
      staffId: "ACC-001",
    });
    console.log("Seeded accountant");
  }

  const staffRole = await storage.getRoleBySlug('staff');
  const existingStaff = await storage.getUserByUsername("rahul");
  if (!existingStaff) {
    const staffPassword = await hashPassword("staff123");
    await storage.createUser({
      username: "rahul",
      password: staffPassword,
      name: "Rahul Kumar",
      email: "rahul@bachangas.com",
      role: UserRole.STAFF,
      roleId: staffRole?.id,
      phone: "+91 91234 56789",
      staffId: "STF-4920",
    });
    console.log("Seeded staff user");
  } else if (!existingStaff.roleId && staffRole) {
    await storage.updateUser(existingStaff.id, { roleId: staffRole.id });
  }

  const existingCustomers = await storage.getCustomers();
  if (existingCustomers.length === 0) {
    const custPassword = await hashPassword("customer123");
    const customerRole = await storage.getRoleBySlug('customer');
    await storage.createUser({
      username: "john.doe",
      password: custPassword,
      name: "John Doe",
      email: "john@demo.com",
      role: UserRole.CUSTOMER,
      roleId: customerRole?.id,
      phone: "9988776655",
      consumerId: "CUS-100293",
      customerType: "DOMESTIC",
      address: "123 Street, Delhi",
      route: "North Delhi",
      outstandingBalance: 500,
    });
    await storage.createUser({
      username: "elite.cuisines",
      password: custPassword,
      name: "Elite Cuisines",
      email: "elite@demo.com",
      role: UserRole.CUSTOMER,
      roleId: customerRole?.id,
      phone: "8877665544",
      consumerId: "CUS-200941",
      customerType: "COMMERCIAL",
      address: "Sector 45, Gurgaon",
      route: "Gurgaon-A",
      outstandingBalance: 2500,
    });
    await storage.createUser({
      username: "jaspreet.kaur",
      password: custPassword,
      name: "Jaspreet Kaur",
      email: "jaspreet@demo.com",
      role: UserRole.CUSTOMER,
      roleId: customerRole?.id,
      phone: "7766554433",
      consumerId: "CUS-492019",
      customerType: "DOMESTIC",
      address: "Green Avenue, Ludhiana",
      route: "Ludhiana-South",
      outstandingBalance: 0,
    });
    await storage.createUser({
      username: "modern.industries",
      password: custPassword,
      name: "Modern Industries",
      email: "modern@demo.com",
      role: UserRole.CUSTOMER,
      roleId: customerRole?.id,
      phone: "9911223344",
      consumerId: "CUS-881203",
      customerType: "COMMERCIAL",
      address: "Plot 42, Industrial Area",
      route: "Industrial-B",
      outstandingBalance: 15400,
    });
    console.log("Seeded customers");
  }

  // Seed categories
  const existingCategories = await storage.getCategories();
  if (existingCategories.length === 0) {
    await storage.createCategory({ name: "Domestic", slug: "domestic", icon: "🏠", showOnHomeTabs: true, sortOrder: 0, isActive: true });
    await storage.createCategory({ name: "Commercial", slug: "commercial", icon: "🏢", showOnHomeTabs: true, sortOrder: 1, isActive: true });
    await storage.createCategory({ name: "Safety Parts", slug: "safety-parts", icon: "🛡️", showOnHomeTabs: true, sortOrder: 2, isActive: true });
    console.log("Seeded categories");
  }

  const allCategories = await storage.getCategories();
  const domesticCat = allCategories.find(c => c.slug === 'domestic');
  const commercialCat = allCategories.find(c => c.slug === 'commercial');
  const safetyCat = allCategories.find(c => c.slug === 'safety-parts');

  const existingProducts = await storage.getProducts();
  if (existingProducts.length === 0) {
    await storage.createProduct({ name: "14.2KG Domestic Refill", slug: "domestic-14", type: "DOMESTIC_14", categoryId: domesticCat?.id, price: "953", basePricePaise: 95300, weight: "14.2", unit: "KG", stockQty: 450, inStock: true, status: "ACTIVE", isActive: true, description: "Standard domestic LPG cylinder for household use" });
    await storage.createProduct({ name: "5KG FTL Domestic", slug: "domestic-5", type: "DOMESTIC_5", categoryId: domesticCat?.id, price: "550", basePricePaise: 55000, weight: "5", unit: "KG", stockQty: 300, inStock: true, status: "ACTIVE", isActive: true, description: "Compact 5kg FTL cylinder for small households" });
    await storage.createProduct({ name: "19KG Commercial Refill", slug: "commercial-19", type: "COMMERCIAL_19", categoryId: commercialCat?.id, price: "1850", basePricePaise: 185000, weight: "19", unit: "KG", stockQty: 200, inStock: true, status: "ACTIVE", isActive: true, description: "Commercial grade LPG cylinder for restaurants and businesses" });
    await storage.createProduct({ name: "47.5KG Industrial Refill", slug: "industrial-47", type: "LARGE_47", categoryId: commercialCat?.id, price: "3900", basePricePaise: 390000, weight: "47.5", unit: "KG", stockQty: 80, inStock: true, status: "ACTIVE", isActive: true, description: "Large capacity cylinder for industrial applications" });
    await storage.createProduct({ name: "Suraksha LPG Hose Pipe", slug: "hose-pipe", type: "SAFETY", categoryId: safetyCat?.id, price: "350", basePricePaise: 35000, stockQty: 150, inStock: true, status: "ACTIVE", isActive: true, description: "ISI certified LPG hose pipe for safe gas connection" });
    await storage.createProduct({ name: "HP Gas Regulator", slug: "gas-regulator", type: "SAFETY", categoryId: safetyCat?.id, price: "250", basePricePaise: 25000, stockQty: 100, inStock: true, status: "ACTIVE", isActive: true, description: "Standard LPG regulator with safety valve" });
    await storage.createProduct({ name: "Gas Lighter", slug: "gas-lighter", type: "SAFETY", categoryId: safetyCat?.id, price: "120", basePricePaise: 12000, stockQty: 200, inStock: true, status: "ACTIVE", isActive: true, description: "Long reach electric gas lighter for safe ignition" });
    console.log("Seeded products");
  } else if (existingProducts.some(p => !p.categoryId)) {
    // Backfill categoryId for existing products
    for (const p of existingProducts) {
      if (!p.categoryId) {
        let catId: number | undefined = undefined;
        if (p.type?.includes('DOMESTIC')) catId = domesticCat?.id;
        else if (p.type?.includes('COMMERCIAL') || p.type?.includes('LARGE')) catId = commercialCat?.id;
        else if (p.type?.includes('SAFETY') || p.type?.includes('COMPOSITE')) catId = safetyCat?.id;
        if (catId) {
          await storage.updateProduct(p.id, { categoryId: catId });
        }
      }
    }
    console.log("Backfilled product categories");
  }

  const existingInventory = await storage.getInventory();
  if (existingInventory.length === 0) {
    await storage.createInventoryItem({ type: "DOMESTIC_14", status: "FILLED", quantity: 450, location: "Main Warehouse" });
    await storage.createInventoryItem({ type: "DOMESTIC_14", status: "EMPTY", quantity: 120, location: "Main Warehouse" });
    await storage.createInventoryItem({ type: "COMMERCIAL_19", status: "FILLED", quantity: 200, location: "Main Warehouse" });
    await storage.createInventoryItem({ type: "COMMERCIAL_19", status: "EMPTY", quantity: 85, location: "Main Warehouse" });
    await storage.createInventoryItem({ type: "LARGE_47", status: "FILLED", quantity: 80, location: "Godown B" });
    await storage.createInventoryItem({ type: "LARGE_47", status: "EMPTY", quantity: 30, location: "Godown B" });
    console.log("Seeded inventory");
  }

  const existingStores = await storage.getStores();
  if (existingStores.length === 0) {
    await storage.createStore({ name: "Bachan Gas Main Hub", slug: "bachan-gas-main-hub", phone: "+91 98143 43443", email: "hub@bachangas.com", addressLine: "Village Bulara, Alamgir Road", city: "Ludhiana", state: "Punjab", pincode: "141116", isActive: true, openingHours: "08:00 AM - 08:00 PM", deliveryNotes: "Serving Rural and Semi-Urban Ludhiana South." });
    console.log("Seeded stores");
  }

  const existingOrders = await storage.getOrders();
  if (existingOrders.length === 0) {
    const customers = await storage.getCustomers();
    const prods = await storage.getProducts();
    if (customers.length > 0 && prods.length > 0) {
      await storage.createOrder({
        orderNumber: "ORD-HP-1001",
        userId: customers[0].id,
        customerName: customers[0].name,
        phone: customers[0].phone || "",
        addressLine: customers[0].address || "123 Street",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        status: "OUT_FOR_DELIVERY",
        totalAmount: "953",
        totalPaise: 95300,
        paymentStatus: "UNPAID",
        paymentMode: "CASH",
        items: [{ productId: prods[0].id, quantity: 1 }],
      });
      await storage.createOrder({
        orderNumber: "ORD-HP-1002",
        userId: customers[1].id,
        customerName: customers[1].name,
        phone: customers[1].phone || "",
        addressLine: customers[1].address || "Sector 45",
        city: "Gurgaon",
        state: "Haryana",
        pincode: "122003",
        status: "CONFIRMED",
        totalAmount: "5250",
        totalPaise: 525000,
        paymentStatus: "UNPAID",
        paymentMode: "CASH",
        items: [{ productId: prods[1].id, quantity: 3 }],
      });
      await storage.createOrder({
        orderNumber: "ORD-HP-1003",
        userId: customers[2].id,
        customerName: customers[2].name,
        phone: customers[2].phone || "",
        addressLine: customers[2].address || "Green Avenue",
        city: "Ludhiana",
        state: "Punjab",
        pincode: "141001",
        status: "DELIVERED",
        totalAmount: "953",
        totalPaise: 95300,
        paymentStatus: "PAID",
        paymentMode: "UPI",
        items: [{ productId: prods[0].id, quantity: 1 }],
      });
      await storage.createOrder({
        orderNumber: "ORD-HP-1004",
        userId: customers[3].id,
        customerName: customers[3].name,
        phone: customers[3].phone || "",
        addressLine: customers[3].address || "Plot 42",
        city: "Ludhiana",
        state: "Punjab",
        pincode: "141002",
        status: "NEW",
        totalAmount: "16000",
        totalPaise: 1600000,
        paymentStatus: "UNPAID",
        paymentMode: "BANK",
        items: [{ productId: prods[2].id, quantity: 5 }],
      });
      console.log("Seeded orders");
    }
  }

  const existingTickets = await storage.getServiceTickets();
  if (existingTickets.length === 0) {
    const customers = await storage.getCustomers();
    if (customers.length > 0) {
      await storage.createServiceTicket({ userId: customers[0].id, customerName: customers[0].name, subject: "Leakage Alert", description: "Urgent: Gas smell reported in kitchen area.", status: "OPEN", priority: "HIGH" });
      await storage.createServiceTicket({ userId: customers[1].id, customerName: customers[1].name, subject: "Late Delivery", description: "Order was supposed to arrive yesterday but still not received.", status: "OPEN", priority: "MEDIUM" });
      await storage.createServiceTicket({ userId: customers[2].id, customerName: customers[2].name, subject: "Billing Inquiry", description: "Need clarification on last month's invoice charges.", status: "RESOLVED", priority: "LOW" });
    }
    console.log("Seeded tickets");
  }

  const existingGP = await storage.getGatePasses();
  if (existingGP.length === 0) {
    const staffUser = await storage.getUserByUsername("rahul");
    if (staffUser) {
      await storage.createGatePass({ gatePassNo: "GP-20260124-0001", deliveryManId: staffUser.id, deliveryManName: staffUser.name, vehicleNo: "PB10GK6638", status: "OPEN", odometerStart: 12450, deliveriesCount: 3 });
      await storage.createGatePass({ gatePassNo: "GP-20260123-0098", deliveryManId: staffUser.id, deliveryManName: staffUser.name, vehicleNo: "PB10GK6638", status: "RECONCILED", odometerStart: 12380, odometerEnd: 12450, deliveriesCount: 8 });
    }
    console.log("Seeded gate passes");
  }

  const existingVehicles = await storage.getVehicles();
  if (existingVehicles.length === 0) {
    await storage.createVehicle({ number: "PB10GK6638", type: "Ashok Leyland", ownerName: "Gurmail Singh", isActive: true });
    await storage.createVehicle({ number: "PB10AB1234", type: "Tata Ace", ownerName: "Rajinder Kumar", isActive: true });
    console.log("Seeded vehicles");
  }

  const existingSettings = await storage.getSiteSettings();
  if (!existingSettings) {
    await storage.upsertSiteSettings({
      siteName: "Bachan Gas Service",
      tagline: "Reliable LPG Gas Distribution",
      showLogo: true,
      showSiteName: true,
      phone: "+91 98143 43443",
      whatsapp: "+919814343443",
      email: "info@bachangas.com",
      address: "Village Bulara, Alamgir Road, Ludhiana, Punjab - 141116",
      workingHours: "Mon - Sat: 8:00 AM - 8:00 PM",
    });
    console.log("Seeded site settings");
  }

  const newTripPerms = ['PICKUP_REQUEST_CREATE', 'PICKUP_APPROVE', 'TRIP_MANAGE', 'RETURN_VERIFY', 'VEHICLE_VIEW', 'VEHICLE_MANAGE'];
  const allPermsNow = await storage.getPermissions();
  const existingPermKeys = allPermsNow.map(p => p.key);
  const missingTripPerms = newTripPerms.filter(k => !existingPermKeys.includes(k));
  if (missingTripPerms.length > 0) {
    const permDefs: Record<string, { module: string; description: string }> = {
      PICKUP_REQUEST_CREATE: { module: 'Delivery', description: 'Create pickup requests' },
      PICKUP_APPROVE: { module: 'Gate Keeper', description: 'Approve/reject pickup requests' },
      TRIP_MANAGE: { module: 'Delivery', description: 'Start/end delivery trips' },
      RETURN_VERIFY: { module: 'Gate Keeper', description: 'Verify godown returns' },
      VEHICLE_VIEW: { module: 'Vehicles', description: 'View vehicles' },
      VEHICLE_MANAGE: { module: 'Vehicles', description: 'Create/edit vehicles' },
    };
    for (const key of missingTripPerms) {
      await storage.createPermission({ key, ...permDefs[key] });
    }
    console.log("Seeded missing trip/delivery permissions");

    const updatedPerms = await storage.getPermissions();
    const deliveryRoleForPerms = await storage.getRoleBySlug('delivery_man');
    if (deliveryRoleForPerms) {
      const currentDeliveryPerms = await storage.getRolePermissions(deliveryRoleForPerms.id);
      const currentIds = currentDeliveryPerms.map(rp => rp.permissionId);
      const addKeys = ['PICKUP_REQUEST_CREATE', 'TRIP_MANAGE', 'VEHICLE_VIEW'];
      const addIds = updatedPerms.filter(p => addKeys.includes(p.key) && !currentIds.includes(p.id)).map(p => p.id);
      if (addIds.length > 0) {
        await storage.setRolePermissions(deliveryRoleForPerms.id, [...currentIds, ...addIds]);
      }
    }

    const gkRoleForPerms = await storage.getRoleBySlug('gate_keeper');
    if (gkRoleForPerms) {
      const currentGkPerms = await storage.getRolePermissions(gkRoleForPerms.id);
      const currentIds = currentGkPerms.map(rp => rp.permissionId);
      const addKeys = ['PICKUP_APPROVE', 'RETURN_VERIFY', 'VEHICLE_VIEW'];
      const addIds = updatedPerms.filter(p => addKeys.includes(p.key) && !currentIds.includes(p.id)).map(p => p.id);
      if (addIds.length > 0) {
        await storage.setRolePermissions(gkRoleForPerms.id, [...currentIds, ...addIds]);
      }
    }
  }
}

function requirePermission(permKey: string) {
  return async (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role === UserRole.ADMIN || req.user.role === 'SUPER_ADMIN') {
      return next();
    }
    const perms = await storage.getUserPermissions(req.user.id);
    if (perms.includes(permKey)) {
      return next();
    }
    return res.status(403).json({ message: "Forbidden: insufficient permissions" });
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log("[Database] Environment", {
    databaseConfigured: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV
  });
  setupAuth(app);

  app.get('/api/database-health', async (_req, res) => {
    try {
      const usersCount = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
      const productsCount = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
      const categoriesCount = await db.select({ count: sql<number>`count(*)` }).from(categoriesTable);
      const settingsCount = await db.select({ count: sql<number>`count(*)` }).from(siteSettingsTable);

      res.json({
        databaseConnected: true,
        usersCount: Number(usersCount[0].count),
        productsCount: Number(productsCount[0].count),
        categoriesCount: Number(categoriesCount[0].count),
        settingsCount: Number(settingsCount[0].count)
      });
    } catch (error) {
      console.error("Database health check failed:", error);
      res.status(500).json({ databaseConnected: false, error: "Health check failed" });
    }
  });

  app.patch('/api/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { name, email, phone, address } = req.body;
      const updates: Record<string, any> = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email || null;
      if (phone !== undefined) updates.phone = phone || null;
      if (address !== undefined) updates.address = address || null;
      const updated = await storage.updateUser(req.user.id, updates);
      res.json(sanitizeUser(updated));
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update profile" });
    }
  });

  if (fs.existsSync(UPLOADS_DIR)) {
    app.use("/uploads", express.static(UPLOADS_DIR));
  }

  registerObjectStorageRoutes(app);

  const objectStorageService = new ObjectStorageService();

  app.post('/api/admin/upload', (req, res, next) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.STAFF)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  }, memoryUpload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    try {
      let objectPath: string;
      try {
        const uploadURL = await objectStorageService.getObjectEntityUploadURL();
        objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

        const putRes = await fetch(uploadURL, {
          method: "PUT",
          body: req.file.buffer,
          headers: { "Content-Type": req.file.mimetype },
        });
        if (!putRes.ok) {
          throw new Error(`Storage upload failed: ${putRes.status}`);
        }
      } catch {
        // Fallback to local uploads directory
        if (!fs.existsSync(UPLOADS_DIR)) {
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        objectPath = `/uploads/${filename}`;
      }

      res.json({ url: objectPath, key: objectPath });
    } catch (err: any) {
      console.error("Error uploading file:", err);
      res.status(500).json({ message: err.message || "Failed to upload file" });
    }
  });

  app.delete('/api/admin/upload', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.STAFF)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json({ success: true });
  });

  // === PUBLIC SITE SETTINGS ===
  app.get('/api/settings', async (_req, res) => {
    const settings = await storage.getSiteSettings();
    if (!settings) {
      return res.json({
        siteName: "Bachan Gas Service",
        tagline: null,
        logoUrl: null,
        showLogo: true,
        showSiteName: true,
        phone: null,
        whatsapp: null,
        email: null,
        address: null,
        workingHours: null,
        googleMapsEmbedUrl: null,
        ccavenueEnabled: false,
        ccavenueFeeEnabled: true,
        ccavenueFeePercent: "0.25",
        ccavenueRoundingMode: "ROUND_2_DECIMALS",
      });
    }
    res.json(settings);
  });

  // === PUBLIC CONTACT FORM ===
  app.post('/api/contact', async (req, res) => {
    const honeypot = req.body._website;
    if (honeypot) {
      return res.json({ success: true });
    }

    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      phone: z.string().min(1, "Phone is required"),
      email: z.string().email().optional().or(z.literal("")),
      inquiryType: z.string().min(1),
      message: z.string().min(1, "Message is required"),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid form data", errors: parsed.error.errors });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const recentCount = await storage.getRecentInquiriesByIp(ip, 15);
    if (recentCount >= 3) {
      return res.status(429).json({ message: "Too many inquiries. Please try again later." });
    }

    const inquiry = await storage.createContactInquiry({
      ...parsed.data,
      email: parsed.data.email || null,
      ipAddress: ip,
    });

    res.status(201).json({ success: true, id: inquiry.id });
  });

  app.get('/api/payments/ccavenue/config', (_req, res) => {
    res.json({
      configured: !!(process.env.CCAVENUE_MERCHANT_ID && process.env.CCAVENUE_ACCESS_CODE && process.env.CCAVENUE_WORKING_KEY),
    });
  });

  // === ADMIN SETTINGS ===
  app.get('/api/admin/settings', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const settings = await storage.getSiteSettings();
    res.json(settings || {});
  });

  app.patch('/api/admin/settings', async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const settingsSchema = z.object({
      siteName: z.string().min(1).optional(),
      tagline: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      showLogo: z.boolean().optional(),
      showSiteName: z.boolean().optional(),
      phone: z.string().nullable().optional(),
      whatsapp: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      workingHours: z.string().nullable().optional(),
      googleMapsEmbedUrl: z.string().nullable().optional(),
      supportMessageTemplate: z.string().nullable().optional(),
      homeVideoUrl: z.string().nullable().optional(),
      homeVideoTitle: z.string().nullable().optional(),
      showHomeVideo: z.boolean().optional(),
      ccavenueEnabled: z.boolean().optional(),
      ccavenueFeeEnabled: z.boolean().optional(),
      ccavenueFeePercent: z.string().optional(),
      ccavenueRoundingMode: z.enum(["ROUND_2_DECIMALS", "ROUND_UP_TO_RUPEE"]).optional(),
    });
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid settings data", errors: parsed.error.errors });
    }
    const settings = await storage.upsertSiteSettings(parsed.data);
    res.json(settings);
  });

  // === ADMIN INQUIRIES ===
  app.get('/api/admin/inquiries', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.STAFF)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const inquiries = await storage.getContactInquiries();
    res.json(inquiries);
  });

  app.patch('/api/admin/inquiries/:id', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.STAFF)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status required" });
    const updated = await storage.updateContactInquiryStatus(Number(req.params.id), status);
    res.json(updated);
  });

  // === PROFILE UPDATE (Customer self-service) ===
  app.patch('/api/me/profile', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const schema = z.object({
      name: z.string().trim().min(2, "Name must be at least 2 characters"),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid input" });
    }
    const updated = await storage.updateUser(req.user.id, { name: parsed.data.name });
    res.json(sanitizeUser(updated));
  });

  // === PAYMENT SETTINGS (Public) ===
  app.get('/api/payment/settings', async (_req, res) => {
    const settings = await storage.getSiteSettings();
    res.json({
      ccavenueEnabled: settings?.ccavenueEnabled ?? false,
      ccavenueFeeEnabled: settings?.ccavenueFeeEnabled ?? true,
      ccavenueFeePercent: settings?.ccavenueFeePercent ?? "0.25",
      ccavenueRoundingMode: settings?.ccavenueRoundingMode ?? "ROUND_2_DECIMALS",
    });
  });

  // === CCAVENUE PAYMENT ROUTES ===
  app.post('/api/payments/ccavenue/initiate', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const { encrypt: ccEncrypt, computeConvenienceFee, generateMerchantTxnId } = await import("./ccavenue");

    const settings = await storage.getSiteSettings();
    if (!settings?.ccavenueEnabled) {
      return res.status(400).json({ message: "CCAvenue payments are currently disabled" });
    }

    const merchantId = process.env.CCAVENUE_MERCHANT_ID;
    const accessCode = process.env.CCAVENUE_ACCESS_CODE;
    const workingKey = process.env.CCAVENUE_WORKING_KEY;

    if (!merchantId || !accessCode || !workingKey) {
      return res.status(500).json({ message: "CCAvenue is not configured. Please contact administrator." });
    }

    const schema = z.object({
      orderId: z.number().int().positive(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
    }

    const order = await storage.getOrder(parsed.data.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const baseAmountPaise = order.totalPaise || 0;
    let convenienceFeeAmountPaise = 0;
    let totalAmountPaise = baseAmountPaise;
    const feePercent = parseFloat(settings?.ccavenueFeePercent || "0.25");
    const roundingMode = settings?.ccavenueRoundingMode || "ROUND_2_DECIMALS";

    if (settings?.ccavenueFeeEnabled) {
      const feeResult = computeConvenienceFee(baseAmountPaise, feePercent, roundingMode);
      convenienceFeeAmountPaise = feeResult.convenienceFeeAmountPaise;
      totalAmountPaise = feeResult.totalAmountPaise;
    }

    const merchantTxnId = generateMerchantTxnId();
    const totalAmountRupees = (totalAmountPaise / 100).toFixed(2);

    const txn = await storage.createPaymentTransaction({
      orderId: order.id,
      gateway: "CCAVENUE",
      baseAmountPaise,
      convenienceFeeAmountPaise,
      totalAmountPaise,
      currency: "INR",
      status: "INITIATED",
      merchantTxnId,
      feePercent: feePercent.toString(),
      roundingMode,
      customerName: order.customerName || (req.user?.name) || "Customer",
      customerPhone: order.phone || (req.user?.phone) || "",
      userId: req.user?.id,
    });

    const baseUrlRaw = process.env.APP_URL || process.env.BASE_URL;
    const baseUrl = baseUrlRaw
      ? baseUrlRaw.replace(/\/$/, "")
      : `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers["x-forwarded-host"] || req.headers.host}`;
    const redirectUrl = process.env.CCAVENUE_REDIRECT_URL || `${baseUrl}/api/payments/ccavenue/callback`;
    const cancelUrl = process.env.CCAVENUE_CANCEL_URL || `${baseUrl}/api/payments/ccavenue/callback`;

    const params = [
      `merchant_id=${merchantId}`,
      `order_id=${merchantTxnId}`,
      `currency=INR`,
      `amount=${totalAmountRupees}`,
      `redirect_url=${redirectUrl}`,
      `cancel_url=${cancelUrl}`,
      `language=EN`,
      `billing_name=${encodeURIComponent(order.customerName)}`,
      `billing_tel=${encodeURIComponent(order.phone || "")}`,
      `billing_email=${encodeURIComponent(req.user.email || "")}`,
      `billing_address=${encodeURIComponent(order.addressLine || "")}`,
      `billing_city=${encodeURIComponent(order.city || "")}`,
      `billing_state=${encodeURIComponent(order.state || "")}`,
      `billing_zip=${encodeURIComponent(order.pincode || "")}`,
      `billing_country=India`,
      `merchant_param1=${order.id}`,
      `merchant_param2=${txn.id}`,
    ].join("&");

    const encRequest = ccEncrypt(params, workingKey);

    await storage.updatePaymentTransaction(txn.id, {
      requestPayloadJson: { params } as any,
    });

    const ccavenueBase = process.env.CCAVENUE_URL || "https://secure.ccavenue.com";
    const ccavenueUrl = `${ccavenueBase.replace(/\/$/, "")}/transaction/transaction.do?command=initiateTransaction`;
    if (process.env.NODE_ENV !== "test") {
      console.log("[payment] CCAvenue initiate: orderId=%s merchantTxnId=%s amount=%s redirectUrl=%s", order.id, merchantTxnId, totalAmountRupees, redirectUrl);
    }
    const formHtml = `<form id="ccavenue_payment_form" method="post" action="${ccavenueUrl}">
      <input type="hidden" name="encRequest" value="${encRequest}" />
      <input type="hidden" name="access_code" value="${accessCode}" />
    </form>
    <script>document.getElementById("ccavenue_payment_form").submit();</script>`;

    res.json({
      transactionId: txn.id,
      merchantTxnId,
      baseAmountPaise,
      convenienceFeeAmountPaise,
      totalAmountPaise,
      formHtml,
    });
  });

  async function handleCcavenueCallback(encResp: string, res: express.Response) {
    const { parseCallbackResponse } = await import("./ccavenue");
    const workingKey = process.env.CCAVENUE_WORKING_KEY;

    if (!workingKey) {
      return res.redirect('/payment/failure?error=config');
    }

    try {
      const responseParams = parseCallbackResponse(encResp, workingKey);
      const merchantTxnId = responseParams.order_id;
      const orderStatus = responseParams.order_status;
      const trackingId = responseParams.tracking_id;
      const bankRefNo = responseParams.bank_ref_no;
      const amount = responseParams.amount;

      if (process.env.NODE_ENV !== "test") {
        console.log("[payment] CCAvenue callback: merchantTxnId=%s orderStatus=%s", merchantTxnId, orderStatus);
      }

      const txn = await storage.getPaymentTransactionByMerchantTxnId(merchantTxnId);
      if (!txn) {
        if (process.env.NODE_ENV !== "test") console.warn("[payment] CCAvenue callback: txn not found merchantTxnId=%s", merchantTxnId);
        return res.redirect('/payment/failure?error=txn_not_found');
      }

      if (orderStatus === "Success" && txn.status === "PAID") {
        if (process.env.NODE_ENV !== "test") console.log("[payment] CCAvenue callback: idempotent success txnId=%s", txn.id);
        return res.redirect(`/payment/success?txnId=${txn.id}`);
      }

      const receivedPaise = Math.round(parseFloat(amount || "0") * 100);
      if (receivedPaise !== txn.totalAmountPaise) {
        await storage.updatePaymentTransaction(txn.id, {
          status: "FAILED",
          responsePayloadJson: responseParams as any,
          gatewayTrackingId: trackingId,
          bankRefNo: bankRefNo || null,
        });
        return res.redirect(`/payment/failure?txnId=${txn.id}&error=amount_mismatch`);
      }

      if (orderStatus === "Success") {
        await storage.updatePaymentTransaction(txn.id, {
          status: "PAID",
          responsePayloadJson: responseParams as any,
          gatewayTrackingId: trackingId,
          bankRefNo: bankRefNo || null,
        });
        if (txn.orderId) {
          await storage.updateOrderStatus(txn.orderId, "CONFIRMED");
        }
        return res.redirect(`/payment/success?txnId=${txn.id}`);
      }

      await storage.updatePaymentTransaction(txn.id, {
        status: "FAILED",
        responsePayloadJson: responseParams as any,
        gatewayTrackingId: trackingId,
        bankRefNo: bankRefNo || null,
      });
      if (txn.orderId) {
        await storage.updateOrderStatus(txn.orderId, "PAYMENT_FAILED");
      }
      return res.redirect(`/payment/failure?txnId=${txn.id}&reason=${encodeURIComponent(orderStatus || "Unknown")}`);
    } catch (err: any) {
      if (process.env.NODE_ENV !== "test") console.error("[payment] CCAvenue callback error:", err?.message || err);
      return res.redirect('/payment/failure?error=decrypt_error');
    }
  }

  app.post('/api/payments/ccavenue/callback', express.urlencoded({ extended: true }), async (req, res) => {
    const encResp = req.body?.encResp;
    if (!encResp) {
      return res.redirect('/payment/failure?error=no_response');
    }
    return handleCcavenueCallback(encResp, res);
  });

  app.get('/api/payments/ccavenue/callback', async (req, res) => {
    const encResp = req.query?.encResp as string | undefined;
    if (!encResp) {
      return res.redirect('/payment/failure?error=no_response');
    }
    return handleCcavenueCallback(encResp, res);
  });

  app.post('/api/payments/ccavenue/direct', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });

    const { encrypt: ccEncrypt, computeConvenienceFee, generateMerchantTxnId } = await import("./ccavenue");

    const settings = await storage.getSiteSettings();
    if (!settings?.ccavenueEnabled) {
      return res.status(400).json({ message: "CCAvenue payments are currently disabled" });
    }

    const merchantId = process.env.CCAVENUE_MERCHANT_ID;
    const accessCode = process.env.CCAVENUE_ACCESS_CODE;
    const workingKey = process.env.CCAVENUE_WORKING_KEY;

    if (!merchantId || !accessCode || !workingKey) {
      return res.status(500).json({ message: "CCAvenue is not configured. Please contact administrator." });
    }

    const schema = z.object({
      amountRupees: z.number().positive().min(1).max(500000),
      purpose: z.string().max(200).optional(),
      customerName: z.string().trim().min(2).max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
    }

    let currentUser = req.user;
    const isNameMissing = !currentUser.name || currentUser.name === "Customer";
    if (isNameMissing && parsed.data.customerName) {
      currentUser = await storage.updateUser(currentUser.id, { name: parsed.data.customerName });
    } else if (isNameMissing && !parsed.data.customerName) {
      return res.status(400).json({ message: "Please enter your name" });
    }

    const resolvedName = currentUser.name || parsed.data.customerName || "Customer";
    const resolvedPhone = currentUser.phone || "";

    const baseAmountPaise = Math.round(parsed.data.amountRupees * 100);
    let convenienceFeeAmountPaise = 0;
    let totalAmountPaise = baseAmountPaise;
    const feePercent = parseFloat(settings.ccavenueFeePercent || "0.25");
    const roundingMode = settings.ccavenueRoundingMode || "ROUND_2_DECIMALS";

    if (settings.ccavenueFeeEnabled) {
      const feeResult = computeConvenienceFee(baseAmountPaise, feePercent, roundingMode);
      convenienceFeeAmountPaise = feeResult.convenienceFeeAmountPaise;
      totalAmountPaise = feeResult.totalAmountPaise;
    }

    const merchantTxnId = generateMerchantTxnId();
    const totalAmountRupees = (totalAmountPaise / 100).toFixed(2);

    const txn = await storage.createPaymentTransaction({
      orderId: null,
      gateway: "CCAVENUE",
      baseAmountPaise,
      convenienceFeeAmountPaise,
      totalAmountPaise,
      currency: "INR",
      status: "INITIATED",
      merchantTxnId,
      feePercent: feePercent.toString(),
      roundingMode,
      customerName: resolvedName,
      customerPhone: resolvedPhone,
      userId: currentUser.id,
    });

    const baseUrlRaw = process.env.APP_URL || process.env.BASE_URL;
    const baseUrl = baseUrlRaw
      ? baseUrlRaw.replace(/\/$/, "")
      : `${req.headers["x-forwarded-proto"] || req.protocol}://${req.headers["x-forwarded-host"] || req.headers.host}`;
    const redirectUrl = process.env.CCAVENUE_REDIRECT_URL || `${baseUrl}/api/payments/ccavenue/callback`;
    const cancelUrl = process.env.CCAVENUE_CANCEL_URL || `${baseUrl}/api/payments/ccavenue/callback`;

    const userName = resolvedName;
    const params = [
      `merchant_id=${merchantId}`,
      `order_id=${merchantTxnId}`,
      `currency=INR`,
      `amount=${totalAmountRupees}`,
      `redirect_url=${redirectUrl}`,
      `cancel_url=${cancelUrl}`,
      `language=EN`,
      `billing_name=${encodeURIComponent(userName)}`,
      `billing_tel=${encodeURIComponent(resolvedPhone)}`,
      `billing_email=${encodeURIComponent(currentUser.email || "")}`,
      `billing_address=${encodeURIComponent(currentUser.address || "")}`,
      `billing_city=`,
      `billing_state=`,
      `billing_zip=`,
      `billing_country=India`,
      `merchant_param1=direct_payment`,
      `merchant_param2=${txn.id}`,
      `merchant_param3=${encodeURIComponent(parsed.data.purpose || "Direct Payment")}`,
    ].join("&");

    const encRequest = ccEncrypt(params, workingKey);

    await storage.updatePaymentTransaction(txn.id, {
      requestPayloadJson: { params } as any,
    });

    const ccavenueBase = process.env.CCAVENUE_URL || "https://secure.ccavenue.com";
    const ccavenueUrl = `${ccavenueBase.replace(/\/$/, "")}/transaction/transaction.do?command=initiateTransaction`;
    if (process.env.NODE_ENV !== "test") {
      console.log("[payment] CCAvenue direct payment: txnId=%s merchantTxnId=%s amount=%s", txn.id, merchantTxnId, totalAmountRupees);
    }
    const formHtml = `<form id="ccavenue_payment_form" method="post" action="${ccavenueUrl}">
      <input type="hidden" name="encRequest" value="${encRequest}" />
      <input type="hidden" name="access_code" value="${accessCode}" />
    </form>
    <script>document.getElementById("ccavenue_payment_form").submit();</script>`;

    res.json({
      transactionId: txn.id,
      merchantTxnId,
      baseAmountPaise,
      convenienceFeeAmountPaise,
      totalAmountPaise,
      formHtml,
    });
  });

  app.get('/api/payments/transaction/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const txn = await storage.getPaymentTransaction(Number(req.params.id));
    if (!txn) return res.status(404).json({ message: "Transaction not found" });
    res.json(txn);
  });

  app.get('/api/admin/transactions', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.ACCOUNTANT)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const gateway = req.query.gateway as string | undefined;
    const status = req.query.status as string | undefined;
    const txns = await storage.getPaymentTransactions({ gateway, status });
    res.json(txns);
  });

  // Payment export (XLSX)
  app.get('/api/admin/payments/export', async (req, res) => {
    if (!req.isAuthenticated() || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.ACCOUNTANT)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const statusFilter = req.query.status as string | undefined;
      const q = req.query.q as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;

      let allPayments = await storage.getPaymentTransactions({ status: statusFilter || undefined });
      const allOrders = await storage.getOrders();

      if (from) {
        const fromDate = new Date(from);
        allPayments = allPayments.filter(p => p.createdAt && new Date(p.createdAt) >= fromDate);
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        allPayments = allPayments.filter(p => p.createdAt && new Date(p.createdAt) <= toDate);
      }

      const rows = allPayments.map(p => {
        let customerName = p.customerName || "";
        let customerPhone = p.customerPhone || "";
        if (!customerName || customerName === "Customer") {
          if (p.orderId) {
            const order = allOrders.find(o => o.id === p.orderId);
            if (order) {
              customerName = order.customerName || customerName;
              if (!customerPhone) customerPhone = order.phone || "";
            }
          }
        }
        if (!customerName || customerName === "Customer" || customerName === "Unknown") {
          try {
            const payload = p.requestPayloadJson as any;
            if (payload?.params) {
              const params = new URLSearchParams(payload.params);
              const billingName = decodeURIComponent(params.get("billing_name") || "");
              if (billingName && billingName !== "Customer") customerName = billingName;
              if (!customerPhone) customerPhone = decodeURIComponent(params.get("billing_tel") || "");
            }
          } catch {}
        }
        if (!customerName) customerName = "Unknown";
        return {
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "-",
          txnId: p.merchantTxnId,
          type: p.orderId ? `Order #${p.orderId}` : "Direct",
          status: p.status,
          customerName,
          mobile: customerPhone || "-",
          amount: (p.baseAmountPaise / 100).toFixed(2),
          fee: ((p.convenienceFeeAmountPaise || 0) / 100).toFixed(2),
          total: (p.totalAmountPaise / 100).toFixed(2),
        };
      });

      if (q) {
        const search = q.toLowerCase();
        const filteredRows = rows.filter(r =>
          r.txnId.toLowerCase().includes(search) ||
          r.customerName.toLowerCase().includes(search) ||
          r.mobile.includes(search)
        );
        rows.length = 0;
        rows.push(...filteredRows);
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Payments");
      sheet.columns = [
        { header: "Date", key: "date", width: 15 },
        { header: "Transaction ID", key: "txnId", width: 30 },
        { header: "Type", key: "type", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Customer Name", key: "customerName", width: 20 },
        { header: "Mobile", key: "mobile", width: 15 },
        { header: "Amount", key: "amount", width: 15 },
        { header: "Fee", key: "fee", width: 12 },
        { header: "Total", key: "total", width: 15 },
      ];

      sheet.getRow(1).font = { bold: true };
      rows.forEach(r => sheet.addRow(r));

      const today = new Date().toISOString().slice(0, 10);
      const fileName = `bachangas_payments_${today}.xlsx`;
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      await workbook.xlsx.write(res);
      res.end();
    } catch (err: any) {
      console.error("Payment export error:", err);
      res.status(500).json({ message: "Export failed" });
    }
  });

  // Dashboard
  app.get(api.dashboard.stats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // User permissions
  app.get(api.userPermissions.me.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const perms = await storage.getUserPermissions(req.user.id);
    res.json(perms);
  });

  // Categories (public - only active home tabs)
  app.get(api.categories.list.path, async (_req, res) => {
    const cats = await storage.getCategoriesForHome();
    console.log("[Categories API]", {
      count: cats.length
    });
    res.json(cats);
  });

  app.get(api.categories.get.path, async (req, res) => {
    const cat = await storage.getCategory(Number(req.params.id));
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  });

  // Admin category routes
  app.get('/api/admin/categories', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.post(api.categories.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const cat = await storage.createCategory(req.body);
      res.status(201).json(cat);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create category" });
    }
  });

  app.put(api.categories.reorder.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.reorderCategories(req.body.orderedIds);
    const cats = await storage.getCategories();
    res.json(cats);
  });

  app.put(api.categories.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const cat = await storage.updateCategory(Number(req.params.id), req.body);
    res.json(cat);
  });

  app.delete(api.categories.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const cat = await storage.getCategory(Number(req.params.id));
    if (!cat) return res.status(404).json({ message: "Category not found" });
    if (req.body && req.body.moveToCategory) {
      const prods = await storage.getProducts();
      const affectedProds = prods.filter(p => p.categoryId === cat.id);
      for (const p of affectedProds) {
        await storage.updateProduct(p.id, { categoryId: req.body.moveToCategory });
      }
    }
    await storage.deleteCategory(Number(req.params.id));
    res.sendStatus(204);
  });

  // Products
  app.get(api.products.list.path, async (_req, res) => {
    const prods = await storage.getProducts();
    console.log("[Products API]", {
      count: prods.length
    });
    res.json(prods);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, requirePermission('PRODUCT_CREATE'), async (req, res) => {
    const product = await storage.createProduct(req.body);
    res.status(201).json(product);
  });

  app.put(api.products.update.path, requirePermission('PRODUCT_EDIT'), async (req, res) => {
    const product = await storage.updateProduct(Number(req.params.id), req.body);
    res.json(product);
  });

  app.delete(api.products.delete.path, requirePermission('PRODUCT_DELETE'), async (req, res) => {
    await storage.deleteProduct(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get('/api/products/:id/images', async (req, res) => {
    const images = await storage.getProductImages(Number(req.params.id));
    res.json(images);
  });

  app.post('/api/products/:id/images', requirePermission('PRODUCT_EDIT'), async (req, res) => {
    const schema = z.object({
      imageUrl: z.string().min(1),
      storageKey: z.string().nullable().optional(),
      sortOrder: z.number().int().min(0).optional().default(0),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid image data", errors: parsed.error.errors });
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    const image = await storage.createProductImage({
      productId: product.id,
      imageUrl: parsed.data.imageUrl,
      storageKey: parsed.data.storageKey || null,
      sortOrder: parsed.data.sortOrder,
    });
    res.status(201).json(image);
  });

  app.delete('/api/products/:id/images/:imageId', requirePermission('PRODUCT_EDIT'), async (req, res) => {
    await storage.deleteProductImage(Number(req.params.imageId));
    res.sendStatus(204);
  });

  app.put('/api/products/:id/images/reorder', requirePermission('PRODUCT_EDIT'), async (req, res) => {
    const schema = z.object({ imageIds: z.array(z.number().int()) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    await storage.reorderProductImages(Number(req.params.id), parsed.data.imageIds);
    res.json({ success: true });
  });

  // Customers
  app.get(api.customers.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const customers = await storage.getCustomers();
    res.json(customers.map(sanitizeUser));
  });

  app.get(api.customers.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(sanitizeUser(customer));
  });

  app.post(api.customers.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const hashedPass = await hashPassword(req.body.password || "default123");
    const customerRole = await storage.getRoleBySlug('customer');
    const customer = await storage.createUser({ ...req.body, password: hashedPass, role: UserRole.CUSTOMER, roleId: customerRole?.id });
    res.status(201).json(sanitizeUser(customer));
  });

  app.put(api.customers.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const customer = await storage.updateCustomer(Number(req.params.id), req.body);
    res.json(sanitizeUser(customer));
  });

  // Orders
  app.get(api.orders.list.path, async (req, res) => {
    const queryPhone = req.query.phone ? normalizePhone(String(req.query.phone)) : null;

    if (!req.isAuthenticated()) {
      if (queryPhone) {
        let allOrders = await storage.getOrders();
        allOrders = allOrders.sort((a, b) => b.id - a.id);
        const phoneOrders = allOrders.filter(
          (o) => o.phone && normalizePhone(o.phone) === queryPhone
        );
        return res.json(phoneOrders);
      }
      return res.status(401).json({ message: "Unauthorized" });
    }

    let allOrders = await storage.getOrders();
    allOrders = allOrders.sort((a, b) => b.id - a.id);
    // For customers, show only their orders or orders matching their phone number
    if (req.user?.role === UserRole.CUSTOMER) {
      const userPhone = req.user.phone ? normalizePhone(req.user.phone) : null;
      const customerOrders = allOrders.filter(
        (o) => (o.userId != null && Number(o.userId) === Number(req.user.id)) ||
               (userPhone && o.phone && normalizePhone(o.phone) === userPhone) ||
               (queryPhone && o.phone && normalizePhone(o.phone) === queryPhone)
      );
      return res.json(customerOrders);
    }
    res.json(allOrders);
  });

  app.get(api.orders.get.path, async (req, res) => {
    const order = await storage.getOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      let user: any = req.user;

      const rawPhone = (req.body.phone || "").trim();
      const consumerNumber = (req.body.consumerNumber || "").trim();
      const customerName = (req.body.customerName || "").trim();
      const deliveryAddress = (req.body.deliveryAddress || req.body.addressLine || "").trim();

      // If user is not already authenticated via session, support guest / phone-based order creation
      if (!user) {
        if (!rawPhone && !consumerNumber) {
          return res.status(400).json({ 
            message: "Please enter your contact phone number or log in to place your order." 
          });
        }

        const formattedPhone = rawPhone ? normalizePhone(rawPhone) : null;
        if (formattedPhone) {
          user = await storage.getUserByPhone(formattedPhone);
        }

        // If not found by phone, check by consumerId among customers
        if (!user && consumerNumber) {
          const customers = await storage.getCustomers();
          user = customers.find((c: any) => c.consumerId && c.consumerId.trim() === consumerNumber);
        }

        // If still no user exists, automatically register a new customer account
        if (!user) {
          const randomSuffix = randomBytes(4).toString("hex");
          const phoneDigits = formattedPhone ? formattedPhone.replace(/\D/g, "") : randomSuffix;
          const username = `cust_${phoneDigits}_${randomSuffix}`;
          const placeholderPassword = await hashPassword(randomBytes(32).toString("hex"));

          user = await storage.createUser({
            username,
            password: placeholderPassword,
            name: customerName || (consumerNumber ? `Consumer ${consumerNumber}` : "Customer"),
            email: null,
            phone: formattedPhone || null,
            consumerId: consumerNumber || null,
            address: deliveryAddress || null,
            role: UserRole.CUSTOMER,
            isActive: true,
          });
        }
      }

      // Update customer profile with latest details if available
      if (user && user.id) {
        const userUpdates: any = {};
        if (rawPhone) {
          const formattedPhone = normalizePhone(rawPhone);
          if (!user.phone) userUpdates.phone = formattedPhone;
        }
        if (deliveryAddress && !user.address) userUpdates.address = deliveryAddress;
        if (consumerNumber && !user.consumerId) userUpdates.consumerId = consumerNumber;
        if (customerName && (user.name === "Customer" || !user.name) && customerName !== "Customer") {
          userUpdates.name = customerName;
        }
        if (Object.keys(userUpdates).length > 0) {
          try {
            user = await storage.updateUser(user.id, userUpdates);
          } catch (updateErr) {
            console.warn("Could not update user details from order:", updateErr);
          }
        }
      }

      // Ensure active session exists and is persisted for the customer
      if (req.login && user) {
        await new Promise<void>((resolve) => {
          req.login(user, (err) => {
            if (err) console.warn("Failed to persist customer login after order creation:", err);
            req.session.save(() => resolve());
          });
        });
      }

      // Calculate totals
      let totalAmount = req.body.totalAmount;
      let totalPaise = req.body.totalPaise;
      if ((!totalAmount || totalAmount === "0") && req.body.items?.length) {
        const calculatedTotal = req.body.items.reduce(
          (sum: number, item: any) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 1)),
          0
        );
        totalAmount = String(calculatedTotal);
        totalPaise = calculatedTotal * 100;
      }

      const paymentMode = req.body.paymentMode || "CASH";
      const isCod = paymentMode === "CASH";

      const orderData: any = {
        orderNumber: `ORD-${Date.now()}`,
        userId: user ? user.id : null,
        storeId: req.body.storeId || null,
        customerName: customerName || user?.name || "Customer",
        phone: rawPhone ? normalizePhone(rawPhone) : (user?.phone || null),
        addressLine: deliveryAddress || user?.address || null,
        city: req.body.city || null,
        state: req.body.state || null,
        pincode: req.body.pincode || null,
        status: isCod ? "NEW" : "PENDING_PAYMENT",
        paymentMode: paymentMode,
        paymentStatus: isCod ? "COD" : "UNPAID",
        totalAmount: totalAmount ? String(totalAmount) : "0",
        totalPaise: totalPaise ? Number(totalPaise) : Number(totalAmount || 0) * 100,
        items: req.body.items || [],
        deliveryDate: req.body.preferredDate ? new Date(req.body.preferredDate) : null,
      };

      const order = await storage.createOrder(orderData);
      console.log(`[Order Created] ID: ${order.id}, Number: ${order.orderNumber}, Customer: ${orderData.customerName}, Phone: ${orderData.phone}, Total: Rs.${order.totalAmount}`);
      res.status(201).json({
        ...order,
        user: user ? sanitizeUser(user) : null,
      });
    } catch (err: any) {
      console.error("[Order Creation Error]:", err);
      res.status(400).json({ message: err?.message || "Failed to create order" });
    }
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const order = await storage.updateOrderStatus(Number(req.params.id), req.body.status);
    await storage.createOrderStatusLog({
      orderId: order.id,
      status: req.body.status,
      changedByUserId: req.user.id,
      note: req.body.note || null,
    });
    res.json(order);
  });

  app.patch(api.orders.assignDelivery.path, requirePermission('ORDER_ASSIGN_DELIVERY'), async (req, res) => {
    const order = await storage.assignDeliveryMan(Number(req.params.id), req.body.deliveryManId);
    await storage.createOrderStatusLog({
      orderId: order.id,
      status: `ASSIGNED_TO_DELIVERY`,
      changedByUserId: req.user!.id,
      note: `Assigned to delivery man ID ${req.body.deliveryManId}`,
    });
    res.json(order);
  });

  app.get(api.orders.byDeliveryMan.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deliveryOrders = await storage.getOrdersByDeliveryMan(Number(req.params.deliveryManId));
    res.json(deliveryOrders);
  });

  // Inventory
  app.get(api.inventory.list.path, async (_req, res) => {
    const items = await storage.getInventory();
    res.json(items);
  });

  app.post(api.inventory.create.path, requirePermission('INVENTORY_EDIT'), async (req, res) => {
    const item = await storage.createInventoryItem(req.body);
    res.status(201).json(item);
  });

  app.put(api.inventory.update.path, requirePermission('INVENTORY_EDIT'), async (req, res) => {
    const item = await storage.updateInventory(Number(req.params.id), req.body);
    res.json(item);
  });

  // Stores
  app.get(api.stores.list.path, async (_req, res) => {
    const allStores = await storage.getStores();
    res.json(allStores);
  });

  app.post(api.stores.create.path, requirePermission('STORE_CREATE'), async (req, res) => {
    const store = await storage.createStore(req.body);
    res.status(201).json(store);
  });

  // Gate Passes
  app.get(api.gatePasses.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const passes = await storage.getGatePasses();
    res.json(passes);
  });

  app.get(api.gatePasses.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const gp = await storage.getGatePass(Number(req.params.id));
    if (!gp) return res.status(404).json({ message: "Gate pass not found" });
    res.json(gp);
  });

  app.post(api.gatePasses.create.path, requirePermission('GATE_PASS_CREATE'), async (req, res) => {
    const gp = await storage.createGatePass(req.body);
    res.status(201).json(gp);
  });

  // Tickets
  app.get(api.tickets.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const tickets = await storage.getServiceTickets();
    res.json(tickets);
  });

  app.post(api.tickets.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const ticket = await storage.createServiceTicket({ ...req.body, userId: req.user.id });
    res.status(201).json(ticket);
  });

  app.patch(api.tickets.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const ticket = await storage.updateTicketStatus(Number(req.params.id), req.body.status);
    res.json(ticket);
  });

  // Staff
  app.get(api.staff.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const staff = await storage.getStaffList();
    res.json(staff.map(sanitizeUser));
  });

  app.post(api.staff.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const hashedPass = await hashPassword(req.body.password || "default123");
      const staffUser = await storage.createUser({ ...req.body, password: hashedPass });
      res.status(201).json(sanitizeUser(staffUser));
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Failed to create staff" });
    }
  });

  app.put(api.staff.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const updates = { ...req.body };
      if (updates.password) {
        updates.password = await hashPassword(updates.password);
      }
      const staffUser = await storage.updateUser(Number(req.params.id), updates);
      res.json(sanitizeUser(staffUser));
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Failed to update staff" });
    }
  });

  app.get(api.staff.byRole.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const staff = await storage.getStaffByRole(req.params.roleSlug);
    res.json(staff.map(sanitizeUser));
  });

  app.get(api.staff.deliveryMen.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deliveryMen = await storage.getDeliveryMen();
    res.json(deliveryMen.map(sanitizeUser));
  });

  // Roles
  app.get(api.roles.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const allRoles = await storage.getRoles();
    res.json(allRoles);
  });

  app.get(api.roles.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const role = await storage.getRole(Number(req.params.id));
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  });

  app.post(api.roles.create.path, requirePermission('ROLE_CREATE'), async (req, res) => {
    try {
      const role = await storage.createRole(req.body);
      res.status(201).json(role);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create role" });
    }
  });

  app.put(api.roles.update.path, requirePermission('ROLE_EDIT'), async (req, res) => {
    const role = await storage.updateRole(Number(req.params.id), req.body);
    res.json(role);
  });

  app.delete(api.roles.delete.path, requirePermission('ROLE_DELETE'), async (req, res) => {
    const role = await storage.getRole(Number(req.params.id));
    if (!role) return res.status(404).json({ message: "Role not found" });
    if (role.isSystem) return res.status(400).json({ message: "Cannot delete system role" });
    const staffInRole = await storage.getStaffByRole(role.slug);
    if (staffInRole.length > 0) {
      return res.status(400).json({ message: `Cannot delete role: ${staffInRole.length} users still assigned` });
    }
    await storage.deleteRole(Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.roles.permissions.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const rps = await storage.getRolePermissions(Number(req.params.id));
    res.json(rps);
  });

  app.put(api.roles.setPermissions.path, requirePermission('PERMISSION_EDIT'), async (req, res) => {
    await storage.setRolePermissions(Number(req.params.id), req.body.permissionIds);
    const rps = await storage.getRolePermissions(Number(req.params.id));
    res.json(rps);
  });

  // Permissions
  app.get(api.permissions.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const perms = await storage.getPermissions();
    res.json(perms);
  });

  // Stock Movements
  app.get(api.stockMovements.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const movements = await storage.getStockMovements();
    res.json(movements);
  });

  app.post(api.stockMovements.create.path, requirePermission('STOCK_MOVEMENT_CREATE'), async (req, res) => {
    const movement = await storage.createStockMovement({ ...req.body, createdByUserId: req.user!.id });
    res.status(201).json(movement);
  });

  // === VEHICLES CRUD ===
  app.get('/api/vehicles', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const allVehicles = await storage.getVehicles();
    res.json(allVehicles);
  });

  app.post('/api/vehicles', requirePermission('VEHICLE_MANAGE'), async (req, res) => {
    try {
      const vehicle = await storage.createVehicle(req.body);
      res.status(201).json(vehicle);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create vehicle" });
    }
  });

  app.put('/api/vehicles/:id', requirePermission('VEHICLE_MANAGE'), async (req, res) => {
    try {
      const vehicle = await storage.updateVehicle(Number(req.params.id), req.body);
      res.json(vehicle);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update vehicle" });
    }
  });

  // === DELIVERY MAN ROUTES ===
  app.post('/api/delivery/pickup-requests', requirePermission('PICKUP_REQUEST_CREATE'), async (req, res) => {
    try {
      const { vehicleId, items } = req.body;
      if (!vehicleId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "vehicleId and items are required" });
      }
      const pr = await storage.createPickupRequest(
        { deliveryManId: req.user!.id, vehicleId, status: PickupRequestStatus.PENDING },
        items.map((item: any) => ({ productId: item.productId, qtyRequested: item.qtyRequested, pickupRequestId: 0 }))
      );
      res.status(201).json(pr);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create pickup request" });
    }
  });

  app.get('/api/delivery/pickup-requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const requests = await storage.getPickupRequestsByDeliveryMan(req.user!.id);
    const enriched = await Promise.all(requests.map(async (r) => {
      const items = await storage.getPickupRequestItems(r.id);
      const vehicle = r.vehicleId ? await storage.getVehicle(r.vehicleId) : null;
      return { ...r, items, vehicle };
    }));
    res.json(enriched);
  });

  app.get('/api/delivery/trips', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userTrips = await storage.getTripsByDeliveryMan(req.user!.id);
    res.json(userTrips);
  });

  app.post('/api/delivery/trip/:id/start', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.deliveryManId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Not your trip" });
      }
      if (trip.status !== TripStatus.DRAFT) {
        return res.status(400).json({ message: "Trip must be in DRAFT status to start" });
      }
      const started = await storage.startTrip(trip.id);
      res.json(started);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to start trip" });
    }
  });

  app.post('/api/delivery/trip/:id/end', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.deliveryManId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Not your trip" });
      }
      if (trip.status !== TripStatus.ACTIVE) {
        return res.status(400).json({ message: "Trip must be ACTIVE to end" });
      }
      const ended = await storage.endTrip(trip.id, req.body.endTripSummaryJson || {});
      res.json(ended);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to end trip" });
    }
  });

  app.post('/api/delivery/trip/:id/stops', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.deliveryManId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Not your trip" });
      }
      if (trip.status !== TripStatus.ACTIVE) {
        return res.status(400).json({ message: "Trip must be ACTIVE to add stops" });
      }
      const stop = await storage.createTripStop({ ...req.body, tripId: trip.id });
      res.status(201).json(stop);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to add stop" });
    }
  });

  app.patch('/api/delivery/trip/stop/:id', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const stop = await storage.updateTripStop(Number(req.params.id), req.body);
      res.json(stop);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to update stop" });
    }
  });

  app.post('/api/delivery/trip/stop/:id/delivery', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const delivery = await storage.createTripStopDelivery({ ...req.body, tripStopId: Number(req.params.id) });
      res.status(201).json(delivery);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to record delivery" });
    }
  });

  app.post('/api/delivery/trip/stop/:id/payment', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const payment = await storage.createTripStopPayment({ ...req.body, tripStopId: Number(req.params.id) });
      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to record payment" });
    }
  });

  app.post('/api/delivery/trip/:id/return', requirePermission('TRIP_MANAGE'), async (req, res) => {
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });
      if (trip.deliveryManId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Not your trip" });
      }
      const { items, note } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items are required" });
      }
      const trr = await storage.createTripReturnRequest(
        { tripId: trip.id, submittedByDeliveryManId: req.user!.id, status: TripReturnStatus.PENDING_VERIFY, deliveryManNote: note || null },
        items.map((item: any) => ({
          productId: item.productId,
          qtyFullReturned: item.qtyFullReturned || 0,
          qtyEmptyReturned: item.qtyEmptyReturned || 0,
          qtyDamaged: item.qtyDamaged || 0,
          tripReturnRequestId: 0,
        }))
      );
      res.status(201).json(trr);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to submit return" });
    }
  });

  // === GATEKEEPER ROUTES ===
  app.get('/api/staff', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const staffList = await storage.getStaffList();
    res.json(staffList.map(u => ({ id: u.id, name: u.name, role: u.role, phone: u.phone })));
  });

  app.get('/api/gatekeeper/pickup-requests/:id/items', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getPickupRequestItems(Number(req.params.id));
    res.json(items);
  });

  app.get('/api/gatekeeper/returns/:id/items', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getTripReturnItems(Number(req.params.id));
    res.json(items);
  });

  app.get('/api/gatekeeper/pickup-requests', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user!.role !== UserRole.GATE_KEEPER && req.user!.role !== UserRole.ADMIN && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const status = (req.query.status as string) || PickupRequestStatus.PENDING;
    const requests = await storage.getPickupRequests(status);
    res.json(requests);
  });

  app.post('/api/gatekeeper/pickup-requests/:id/approve', requirePermission('PICKUP_APPROVE'), async (req, res) => {
    try {
      const prId = Number(req.params.id);
      const pr = await storage.getPickupRequest(prId);
      if (!pr) return res.status(404).json({ message: "Pickup request not found" });
      if (pr.status !== PickupRequestStatus.PENDING) {
        return res.status(400).json({ message: "Pickup request is not pending" });
      }
      const { items, vehicleChecked, safetyOk, note } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "items array is required" });
      }

      if (vehicleChecked !== undefined || safetyOk !== undefined) {
        const updateFields: any = {};
        if (vehicleChecked !== undefined) updateFields.vehicleChecked = vehicleChecked;
        if (safetyOk !== undefined) updateFields.safetyOk = safetyOk;
        await storage.updatePickupRequest(prId, updateFields);
      }

      const prItems = await storage.getPickupRequestItems(prId);
      const approvedItems = items.map((item: any) => {
        const prItem = prItems.find(pi => pi.productId === item.productId);
        if (!prItem) throw new Error(`No pickup request item found for product ${item.productId}`);
        return { pickupRequestItemId: prItem.id, qtyApproved: item.qtyApproved };
      });

      const trip = await storage.approvePickupRequest(prId, req.user!.id, approvedItems, note);
      res.json(trip);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to approve pickup request" });
    }
  });

  app.post('/api/gatekeeper/pickup-requests/:id/reject', requirePermission('PICKUP_APPROVE'), async (req, res) => {
    try {
      const prId = Number(req.params.id);
      const pr = await storage.getPickupRequest(prId);
      if (!pr) return res.status(404).json({ message: "Pickup request not found" });
      if (pr.status !== PickupRequestStatus.PENDING) {
        return res.status(400).json({ message: "Pickup request is not pending" });
      }
      const rejected = await storage.rejectPickupRequest(prId, req.user!.id, req.body.note);
      res.json(rejected);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to reject pickup request" });
    }
  });

  app.get('/api/gatekeeper/returns', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    if (req.user!.role !== UserRole.GATE_KEEPER && req.user!.role !== UserRole.ADMIN && req.user!.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: "Forbidden" });
    }
    const status = (req.query.status as string) || TripReturnStatus.PENDING_VERIFY;
    const returns = await storage.getTripReturnRequests(status);
    res.json(returns);
  });

  app.post('/api/gatekeeper/returns/:id/verify', requirePermission('RETURN_VERIFY'), async (req, res) => {
    try {
      const trrId = Number(req.params.id);
      const trr = await storage.getTripReturnRequest(trrId);
      if (!trr) return res.status(404).json({ message: "Return request not found" });
      if (trr.status !== TripReturnStatus.PENDING_VERIFY) {
        return res.status(400).json({ message: "Return request is not pending verification" });
      }
      const { items, note } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "items array is required" });
      }

      const returnItems = await storage.getTripReturnItems(trrId);
      const verifiedItems = items.map((item: any) => {
        const ri = returnItems.find(r => r.productId === item.productId);
        if (!ri) throw new Error(`No return item found for product ${item.productId}`);
        return {
          tripReturnItemId: ri.id,
          qtyFullReturned: item.qtyFullReturned,
          qtyEmptyReturned: item.qtyEmptyReturned,
          qtyDamaged: item.qtyDamaged,
        };
      });

      const verified = await storage.verifyTripReturn(trrId, req.user!.id, verifiedItems, note);
      res.json(verified);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to verify return" });
    }
  });

  // === ADMIN REPORTS ===
  app.get('/api/admin/reports/daily-trips', requirePermission('REPORTS_VIEW'), async (req, res) => {
    try {
      let from: Date;
      let to: Date;
      if (req.query.from && req.query.to) {
        from = new Date(req.query.from as string);
        to = new Date(req.query.to as string);
        to.setHours(23, 59, 59, 999);
      } else if (req.query.date) {
        from = new Date(req.query.date as string);
        to = new Date(req.query.date as string);
        to.setHours(23, 59, 59, 999);
      } else {
        from = new Date();
        from.setHours(0, 0, 0, 0);
        to = new Date();
        to.setHours(23, 59, 59, 999);
      }
      const report = await storage.getDailyTripsReport(from, to);
      res.json(report);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to generate report" });
    }
  });

  app.get('/api/admin/reports/trips/:id', requirePermission('REPORTS_VIEW'), async (req, res) => {
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      const inventoryIssued = await storage.getTripInventoryIssued(trip.id);
      const stops = await storage.getTripStops(trip.id);
      const stopsWithDetails: any[] = [];
      for (const stop of stops) {
        const deliveries = await storage.getTripStopDeliveries(stop.id);
        const payments = await storage.getTripStopPayments(stop.id);
        stopsWithDetails.push({ ...stop, deliveries, payments });
      }
      const returnRequests = await storage.getTripReturnRequests();
      const tripReturns = returnRequests.filter(r => r.tripId === trip.id);

      res.json({ trip, inventoryIssued, stops: stopsWithDetails, returns: tripReturns });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to get trip detail" });
    }
  });

  app.get('/api/admin/reports/daily-trips/export.csv', requirePermission('REPORTS_VIEW'), async (req, res) => {
    try {
      let from: Date;
      let to: Date;
      if (req.query.from && req.query.to) {
        from = new Date(req.query.from as string);
        to = new Date(req.query.to as string);
        to.setHours(23, 59, 59, 999);
      } else if (req.query.date) {
        from = new Date(req.query.date as string);
        to = new Date(req.query.date as string);
        to.setHours(23, 59, 59, 999);
      } else {
        from = new Date();
        from.setHours(0, 0, 0, 0);
        to = new Date();
        to.setHours(23, 59, 59, 999);
      }
      const report = await storage.getDailyTripsReport(from, to);

      const headers = ['Trip ID', 'Date', 'Delivery Man', 'Vehicle', 'Owner', 'Status', 'Total Issued', 'Total Delivered', 'Empties Collected', 'Full Returned', 'Empty Returned', 'Money Collected', 'Discrepancy', 'GK Approval', 'GK Return Verify'];
      const rows = report.map(r => [
        r.trip.id,
        r.trip.createdAt ? new Date(r.trip.createdAt).toISOString().split('T')[0] : '',
        `"${r.deliveryManName}"`,
        r.vehicleNumber,
        `"${r.vehicleOwnerName}"`,
        r.trip.status,
        r.totalIssued,
        r.totalDelivered,
        r.totalEmptiesCollected,
        r.totalFullReturned,
        r.totalEmptyReturned,
        r.totalMoneyCollected,
        r.discrepancy,
        `"${r.gatekeeperApprovalName || ''}"`,
        `"${r.gatekeeperReturnVerifyName || ''}"`,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="daily-trips-report.csv"');
      res.send(csv);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to export CSV" });
    }
  });

  // === TRIP DETAIL (any auth user) ===
  app.get('/api/trips/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const trip = await storage.getTrip(Number(req.params.id));
      if (!trip) return res.status(404).json({ message: "Trip not found" });

      const inventoryIssued = await storage.getTripInventoryIssued(trip.id);
      const stops = await storage.getTripStops(trip.id);
      const stopsWithDetails: any[] = [];
      for (const stop of stops) {
        const deliveries = await storage.getTripStopDeliveries(stop.id);
        const payments = await storage.getTripStopPayments(stop.id);
        stopsWithDetails.push({ ...stop, deliveries, payments });
      }
      const returnRequests = await storage.getTripReturnRequests();
      const tripReturns = returnRequests.filter(r => r.tripId === trip.id);

      res.json({ trip, inventoryIssued, stops: stopsWithDetails, returns: tripReturns });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to get trip details" });
    }
  });

  seedDatabase().catch(console.error);

  return httpServer;
}
