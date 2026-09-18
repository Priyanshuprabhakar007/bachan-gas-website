import {
  type User, type InsertUser, type Product, type InsertProduct, type Order,
  type Store, type InsertStore, type Inventory, type InsertInventory,
  type GatePass, type InsertGatePass, type ServiceTicket, type InsertServiceTicket,
  type CreateOrderRequest, type DashboardStats, UserRole,
  type Role, type InsertRole, type Permission, type InsertPermission,
  type RolePermission,
  type OrderStatusLog, type InsertOrderStatusLog,
  type StockMovement, type InsertStockMovement,
  type Category, type InsertCategory,
  type Vehicle, type InsertVehicle,
  type PickupRequest, type InsertPickupRequest,
  type PickupRequestItem, type InsertPickupRequestItem,
  type Trip, type InsertTrip,
  type TripInventoryIssuedRow, type InsertTripInventoryIssued,
  type TripStop, type InsertTripStop,
  type TripStopDelivery, type InsertTripStopDelivery,
  type TripStopPayment, type InsertTripStopPayment,
  type TripReturnRequest, type InsertTripReturnRequest,
  type TripReturnItem, type InsertTripReturnItem,
  type ProductImage, type InsertProductImage,
  type SiteSettings, type InsertSiteSettings,
  type ContactInquiry, type InsertContactInquiry,
  type PaymentTransaction, type InsertPaymentTransaction,
  PickupRequestStatus, TripStatus, TripReturnStatus
} from "@shared/schema";
import type { IStorage } from "./storage";

export class MemStorage implements IStorage {
  private users = new Map<number, User>();
  private categories = new Map<number, Category>();
  private products = new Map<number, Product>();
  private productImages = new Map<number, ProductImage>();
  private orders = new Map<number, Order>();
  private orderItems = new Map<number, any>();
  private orderStatusLogs = new Map<number, OrderStatusLog>();
  private inventory = new Map<number, Inventory>();
  private stores = new Map<number, Store>();
  private gatePasses = new Map<number, GatePass>();
  private serviceTickets = new Map<number, ServiceTicket>();
  private stockMovements = new Map<number, StockMovement>();
  private roles = new Map<number, Role>();
  private permissions = new Map<number, Permission>();
  private rolePermissions = new Map<number, RolePermission>();
  private vehicles = new Map<number, Vehicle>();
  private pickupRequests = new Map<number, PickupRequest>();
  private pickupRequestItems = new Map<number, PickupRequestItem>();
  private trips = new Map<number, Trip>();
  private tripInventoryIssued = new Map<number, TripInventoryIssuedRow>();
  private tripStops = new Map<number, TripStop>();
  private tripStopDeliveries = new Map<number, TripStopDelivery>();
  private tripStopPayments = new Map<number, TripStopPayment>();
  private tripReturnRequests = new Map<number, TripReturnRequest>();
  private tripReturnItems = new Map<number, TripReturnItem>();
  private siteSettingsData: SiteSettings = {
    id: 1,
    siteName: "Bachan Gas Service",
    tagline: "Your Premier Gas Delivery Partner",
    logoUrl: null,
    showLogo: true,
    showSiteName: true,
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    email: "support@bachangas.com",
    address: "Patna, Bihar, India",
    workingHours: "8:00 AM - 8:00 PM",
    googleMapsEmbedUrl: null,
    supportMessageTemplate: null,
    homeVideoUrl: null,
    homeVideoTitle: null,
    showHomeVideo: false,
    ccavenueEnabled: false,
    ccavenueFeeEnabled: true,
    ccavenueFeePercent: "0.25",
    ccavenueRoundingMode: "ROUND_2_DECIMALS",
    updatedAt: new Date(),
  };
  private contactInquiries = new Map<number, ContactInquiry>();
  private paymentTransactions = new Map<number, PaymentTransaction>();

  private currentIds: Record<string, number> = {
    users: 1,
    categories: 1,
    products: 1,
    productImages: 1,
    orders: 1,
    orderItems: 1,
    orderStatusLogs: 1,
    inventory: 1,
    stores: 1,
    gatePasses: 1,
    serviceTickets: 1,
    stockMovements: 1,
    roles: 1,
    permissions: 1,
    rolePermissions: 1,
    vehicles: 1,
    pickupRequests: 1,
    pickupRequestItems: 1,
    trips: 1,
    tripInventoryIssued: 1,
    tripStops: 1,
    tripStopDeliveries: 1,
    tripStopPayments: 1,
    tripReturnRequests: 1,
    tripReturnItems: 1,
    siteSettings: 1,
    contactInquiries: 1,
    paymentTransactions: 1,
  };

  private nextId(table: string): number {
    const id = this.currentIds[table] || 1;
    this.currentIds[table] = id + 1;
    return id;
  }

  // === USERS ===
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((u) => u.googleId === googleId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    if (!phone) return undefined;
    const cleaned = phone.replace(/[^\d+]/g, "");
    let canonical = cleaned;
    let fallback10 = cleaned;
    let fallback91 = cleaned;
    
    if (cleaned.startsWith("+91") && cleaned.length === 13) {
      canonical = cleaned;
      fallback10 = cleaned.substring(3);
      fallback91 = cleaned.substring(1);
    } else if (cleaned.startsWith("91") && cleaned.length === 12) {
      canonical = "+" + cleaned;
      fallback10 = cleaned.substring(2);
      fallback91 = cleaned;
    } else if (cleaned.length === 10) {
      canonical = "+91" + cleaned;
      fallback10 = cleaned;
      fallback91 = "91" + cleaned;
    }

    return Array.from(this.users.values()).find((u) => {
      if (!u.phone) return false;
      const up = u.phone.replace(/[^\d+]/g, "");
      return up === canonical || up === fallback10 || up === fallback91;
    });
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextId("users");
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      name: insertUser.name,
      email: insertUser.email || null,
      phone: insertUser.phone || null,
      role: insertUser.role || UserRole.CUSTOMER,
      roleId: insertUser.roleId ?? null,
      staffId: insertUser.staffId ?? null,
      consumerId: insertUser.consumerId ?? null,
      customerType: insertUser.customerType ?? "DOMESTIC",
      address: insertUser.address ?? null,
      route: insertUser.route ?? null,
      outstandingBalance: insertUser.outstandingBalance ?? 0,
      googleId: insertUser.googleId ?? null,
      avatarUrl: insertUser.avatarUrl ?? null,
      joiningDate: insertUser.joiningDate ?? null,
      notes: insertUser.notes ?? null,
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error(`User with id ${id} not found`);
    const updated: User = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
    };
    this.users.set(id, updated);
    return updated;
  }

  async getCustomers(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter((u) => u.role === UserRole.CUSTOMER)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getCustomer(id: number): Promise<User | undefined> {
    const u = this.users.get(id);
    return u?.role === UserRole.CUSTOMER ? u : undefined;
  }

  async updateCustomer(id: number, updates: Partial<InsertUser>): Promise<User> {
    return this.updateUser(id, updates);
  }

  async getStaffList(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter((u) => u.role !== UserRole.CUSTOMER)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getStaffByRole(roleSlug: string): Promise<User[]> {
    const role = await this.getRoleBySlug(roleSlug);
    if (!role) return [];
    return Array.from(this.users.values())
      .filter((u) => u.roleId === role.id)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getDeliveryMen(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter((u) => u.role === UserRole.DELIVERY_MAN && u.isActive)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  // === CATEGORIES ===
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values()).sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name)
    );
  }

  async getCategoriesForHome(): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter((c) => c.showOnHomeTabs && c.isActive)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return Array.from(this.categories.values()).find((c) => c.slug === slug);
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const id = this.nextId("categories");
    const newCat: Category = {
      id,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || null,
      iconImageUrl: cat.iconImageUrl ?? null,
      bannerImageUrl: cat.bannerImageUrl ?? null,
      showOnHomeTabs: cat.showOnHomeTabs ?? true,
      sortOrder: cat.sortOrder ?? 0,
      isActive: cat.isActive ?? true,
      createdAt: new Date(),
    };
    this.categories.set(id, newCat);
    return newCat;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const existing = this.categories.get(id);
    if (!existing) throw new Error(`Category ${id} not found`);
    const updated: Category = { ...existing, ...updates, id: existing.id };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: number): Promise<void> {
    for (const p of this.products.values()) {
      if (p.categoryId === id) {
        this.products.set(p.id, { ...p, categoryId: null });
      }
    }
    this.categories.delete(id);
  }

  async reorderCategories(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      const cat = this.categories.get(orderedIds[i]);
      if (cat) {
        this.categories.set(cat.id, { ...cat, sortOrder: i });
      }
    }
  }

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getActiveProducts(): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter((p) => p.isActive && p.status === "ACTIVE")
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find((p) => p.slug === slug);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.nextId("products");
    const newProduct: Product = {
      id,
      name: product.name,
      slug: product.slug,
      type: product.type,
      categoryId: product.categoryId ?? null,
      price: product.price,
      basePricePaise: product.basePricePaise ?? Number(product.price) * 100,
      description: product.description ?? null,
      weight: product.weight ?? null,
      unit: product.unit ?? "KG",
      imageUrl: product.imageUrl ?? null,
      sku: product.sku ?? null,
      inStock: product.inStock ?? true,
      stockQty: product.stockQty ?? 0,
      status: product.status ?? "ACTIVE",
      isActive: product.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error(`Product ${id} not found`);
    const updated: Product = { ...existing, ...updates, id: existing.id };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: number): Promise<void> {
    this.products.delete(id);
  }

  // === ORDERS ===
  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(req: CreateOrderRequest): Promise<Order> {
    const id = this.nextId("orders");
    const { items, ...orderData } = req;
    const now = new Date();
    const order: Order = {
      id,
      orderNumber: orderData.orderNumber || `ORD-${Date.now()}`,
      userId: orderData.userId ?? null,
      storeId: orderData.storeId ?? null,
      customerName: orderData.customerName,
      phone: orderData.phone ?? null,
      addressLine: orderData.addressLine ?? null,
      city: orderData.city ?? null,
      state: orderData.state ?? null,
      pincode: orderData.pincode ?? null,
      status: orderData.status || "NEW",
      paymentMode: orderData.paymentMode || "COD",
      paymentStatus: orderData.paymentStatus || "PENDING",
      totalAmount: orderData.totalAmount || "0",
      totalPaise: orderData.totalPaise ?? Number(orderData.totalAmount || 0) * 100,
      deliveryDate: orderData.deliveryDate ?? null,
      assignedAt: orderData.assignedAt ?? null,
      deliveredAt: orderData.deliveredAt ?? null,
      deliveryManId: orderData.deliveryManId ?? null,
      createdAt: now,
    };
    this.orders.set(id, order);

    if (items && items.length > 0) {
      for (const item of items) {
        const product = this.products.get(item.productId);
        if (product) {
          const itemId = this.nextId("orderItems");
          this.orderItems.set(itemId, {
            id: itemId,
            orderId: order.id,
            productId: product.id,
            productName: product.name,
            quantity: item.quantity,
            price: product.price,
            totalPrice: (Number(product.price) * item.quantity).toString(),
          });
        }
      }
    }
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error(`Order ${id} not found`);
    const updates: Partial<Order> = { status };
    if (status === "DELIVERED") {
      updates.deliveredAt = new Date();
    }
    const updated = { ...order, ...updates };
    this.orders.set(id, updated);
    return updated;
  }

  async assignDeliveryMan(orderId: number, deliveryManId: number): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    const updated = { ...order, deliveryManId, assignedAt: new Date() };
    this.orders.set(orderId, updated);
    return updated;
  }

  async getOrdersByDeliveryMan(deliveryManId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter((o) => o.deliveryManId === deliveryManId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // === INVENTORY ===
  async getInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = this.nextId("inventory");
    const inv: Inventory = {
      id,
      type: item.type,
      status: item.status,
      quantity: item.quantity ?? 0,
      location: item.location || "Main Warehouse",
      updatedAt: new Date(),
    };
    this.inventory.set(id, inv);
    return inv;
  }

  async updateInventory(id: number, updates: Partial<InsertInventory>): Promise<Inventory> {
    const existing = this.inventory.get(id);
    if (!existing) throw new Error(`Inventory item ${id} not found`);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.inventory.set(id, updated);
    return updated;
  }

  // === STORES ===
  async getStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }

  async createStore(store: InsertStore): Promise<Store> {
    const id = this.nextId("stores");
    const s: Store = {
      id,
      name: store.name,
      slug: store.slug,
      phone: store.phone ?? null,
      email: store.email ?? null,
      addressLine: store.addressLine ?? null,
      city: store.city ?? null,
      state: store.state ?? null,
      pincode: store.pincode ?? null,
      isActive: store.isActive ?? true,
      openingHours: store.openingHours ?? null,
      deliveryNotes: store.deliveryNotes ?? null,
      createdAt: new Date(),
    };
    this.stores.set(id, s);
    return s;
  }

  // === GATE PASSES ===
  async getGatePasses(): Promise<GatePass[]> {
    return Array.from(this.gatePasses.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getGatePass(id: number): Promise<GatePass | undefined> {
    return this.gatePasses.get(id);
  }

  async createGatePass(gp: InsertGatePass): Promise<GatePass> {
    const id = this.nextId("gatePasses");
    const newGp: GatePass = {
      id,
      gatePassNo: gp.gatePassNo,
      deliveryManId: gp.deliveryManId ?? null,
      deliveryManName: gp.deliveryManName ?? null,
      vehicleNo: gp.vehicleNo ?? null,
      status: gp.status || "OPEN",
      odometerStart: gp.odometerStart ?? null,
      odometerEnd: gp.odometerEnd ?? null,
      deliveriesCount: gp.deliveriesCount ?? 0,
      date: gp.date ? new Date(gp.date) : new Date(),
      createdAt: new Date(),
    };
    this.gatePasses.set(id, newGp);
    return newGp;
  }

  // === SERVICE TICKETS ===
  async getServiceTickets(): Promise<ServiceTicket[]> {
    return Array.from(this.serviceTickets.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket> {
    const id = this.nextId("serviceTickets");
    const newTicket: ServiceTicket = {
      id,
      userId: ticket.userId ?? null,
      customerName: ticket.customerName ?? null,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status || "OPEN",
      priority: ticket.priority || "MEDIUM",
      createdAt: new Date(),
    };
    this.serviceTickets.set(id, newTicket);
    return newTicket;
  }

  async updateTicketStatus(id: number, status: string): Promise<ServiceTicket> {
    const t = this.serviceTickets.get(id);
    if (!t) throw new Error(`Ticket ${id} not found`);
    const updated = { ...t, status };
    this.serviceTickets.set(id, updated);
    return updated;
  }

  // === DASHBOARD STATS ===
  async getDashboardStats(): Promise<DashboardStats> {
    const allOrders = Array.from(this.orders.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
    const allCustomers = Array.from(this.users.values()).filter(
      (u) => u.role === UserRole.CUSTOMER
    );
    const allProducts = Array.from(this.products.values());
    const allTickets = Array.from(this.serviceTickets.values()).filter(
      (t) => t.status === "OPEN"
    );
    const allInventory = Array.from(this.inventory.values());

    const revenueOrders = allOrders.filter(
      (o) =>
        o.status !== "CANCELLED" &&
        o.status !== "REJECTED" &&
        o.status !== "PAYMENT_FAILED"
    );
    const totalRevenuePaise = revenueOrders.reduce(
      (acc, o) => acc + (o.totalPaise || 0),
      0
    );
    const activeOrders = allOrders.filter(
      (o) =>
        o.status !== "DELIVERED" &&
        o.status !== "CANCELLED" &&
        o.status !== "REJECTED" &&
        o.status !== "PAYMENT_FAILED"
    ).length;

    const statusCounts: Record<string, number> = {};
    allOrders.forEach((o) => {
      const s = o.status || "NEW";
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const inventorySummary: { type: string; filled: number; empty: number }[] = [];
    const byType: Record<string, { filled: number; empty: number }> = {};
    allInventory.forEach((i) => {
      if (!byType[i.type]) byType[i.type] = { filled: 0, empty: 0 };
      if (i.status === "FILLED") byType[i.type].filled += i.quantity || 0;
      else byType[i.type].empty += i.quantity || 0;
    });
    Object.entries(byType).forEach(([type, data]) => {
      inventorySummary.push({ type, ...data });
    });

    const recentOrders = allOrders.slice(0, 10);
    const allPayments = Array.from(this.paymentTransactions.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
    const successPayments = allPayments.filter((p) => p.status === "SUCCESS");
    const pendingPayments = allPayments.filter((p) => p.status === "INITIATED");
    const directPaymentRevenuePaise = successPayments.reduce(
      (acc, p) => acc + (p.baseAmountPaise || 0),
      0
    );

    const recentPayments = allPayments.slice(0, 10).map((p) => ({
      id: p.id,
      merchantTxnId: p.merchantTxnId,
      baseAmountPaise: p.baseAmountPaise,
      convenienceFeeAmountPaise: p.convenienceFeeAmountPaise || 0,
      totalAmountPaise: p.totalAmountPaise,
      status: p.status,
      orderId: p.orderId,
      gatewayTrackingId: p.gatewayTrackingId,
      bankRefNo: p.bankRefNo,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      customerName: p.customerName || "Customer",
      customerPhone: p.customerPhone || "",
    }));

    return {
      totalOrders: allOrders.length,
      totalRevenuePaise: totalRevenuePaise + directPaymentRevenuePaise,
      totalCustomers: allCustomers.length,
      totalProducts: allProducts.length,
      activeOrders,
      openTickets: allTickets.length,
      inventorySummary,
      recentOrders,
      ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      })),
      directPayments: {
        total: allPayments.length,
        totalAmountPaise: allPayments.reduce((acc, p) => acc + (p.totalAmountPaise || 0), 0),
        successCount: successPayments.length,
        pendingCount: pendingPayments.length,
      },
      recentPayments,
    };
  }

  // === ROLES ===
  async getRoles(): Promise<Role[]> {
    return Array.from(this.roles.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getRole(id: number): Promise<Role | undefined> {
    return this.roles.get(id);
  }

  async getRoleBySlug(slug: string): Promise<Role | undefined> {
    return Array.from(this.roles.values()).find((r) => r.slug === slug);
  }

  async createRole(role: InsertRole): Promise<Role> {
    const id = this.nextId("roles");
    const newRole: Role = {
      id,
      name: role.name,
      slug: role.slug,
      isSystem: role.isSystem ?? false,
      isActive: role.isActive ?? true,
      createdAt: new Date(),
    };
    this.roles.set(id, newRole);
    return newRole;
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role> {
    const existing = this.roles.get(id);
    if (!existing) throw new Error(`Role ${id} not found`);
    const updated = { ...existing, ...updates };
    this.roles.set(id, updated);
    return updated;
  }

  async deleteRole(id: number): Promise<void> {
    for (const [rpId, rp] of this.rolePermissions.entries()) {
      if (rp.roleId === id) this.rolePermissions.delete(rpId);
    }
    this.roles.delete(id);
  }

  // === PERMISSIONS ===
  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values()).sort(
      (a, b) => a.module.localeCompare(b.module) || a.key.localeCompare(b.key)
    );
  }

  async createPermission(perm: InsertPermission): Promise<Permission> {
    const id = this.nextId("permissions");
    const newPerm: Permission = {
      id,
      module: perm.module,
      key: perm.key,
      description: perm.description ?? null,
    };
    this.permissions.set(id, newPerm);
    return newPerm;
  }

  async getPermissionByKey(key: string): Promise<Permission | undefined> {
    return Array.from(this.permissions.values()).find((p) => p.key === key);
  }

  // === ROLE PERMISSIONS ===
  async getRolePermissions(
    roleId: number
  ): Promise<(RolePermission & { permission?: Permission })[]> {
    const list: (RolePermission & { permission?: Permission })[] = [];
    for (const rp of this.rolePermissions.values()) {
      if (rp.roleId === roleId) {
        const perm = this.permissions.get(rp.permissionId);
        list.push({ ...rp, permission: perm });
      }
    }
    return list;
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    for (const [id, rp] of Array.from(this.rolePermissions.entries())) {
      if (rp.roleId === roleId) this.rolePermissions.delete(id);
    }
    for (const permissionId of permissionIds) {
      const id = this.nextId("rolePermissions");
      this.rolePermissions.set(id, { id, roleId, permissionId });
    }
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = this.users.get(userId);
    if (!user) return [];
    if (user.role === UserRole.ADMIN || user.role === "SUPER_ADMIN") {
      return Array.from(this.permissions.values()).map((p) => p.key);
    }
    if (!user.roleId) return [];
    const keys: string[] = [];
    for (const rp of this.rolePermissions.values()) {
      if (rp.roleId === user.roleId) {
        const perm = this.permissions.get(rp.permissionId);
        if (perm) keys.push(perm.key);
      }
    }
    return keys;
  }

  // === ORDER STATUS LOG ===
  async createOrderStatusLog(log: InsertOrderStatusLog): Promise<OrderStatusLog> {
    const id = this.nextId("orderStatusLogs");
    const newLog: OrderStatusLog = {
      id,
      orderId: log.orderId,
      status: log.status,
      changedByUserId: log.changedByUserId ?? null,
      note: log.note ?? null,
      createdAt: new Date(),
    };
    this.orderStatusLogs.set(id, newLog);
    return newLog;
  }

  async getOrderStatusLogs(orderId: number): Promise<OrderStatusLog[]> {
    return Array.from(this.orderStatusLogs.values())
      .filter((l) => l.orderId === orderId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // === STOCK MOVEMENTS ===
  async getStockMovements(): Promise<StockMovement[]> {
    return Array.from(this.stockMovements.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const id = this.nextId("stockMovements");
    const newMovement: StockMovement = {
      id,
      type: movement.type,
      productId: movement.productId ?? null,
      quantity: movement.quantity,
      tripId: movement.tripId ?? null,
      pickupRequestId: movement.pickupRequestId ?? null,
      tripReturnRequestId: movement.tripReturnRequestId ?? null,
      note: movement.note ?? null,
      createdByUserId: movement.createdByUserId ?? null,
      createdAt: new Date(),
    };
    this.stockMovements.set(id, newMovement);
    return newMovement;
  }

  // === PRODUCT IMAGES ===
  async getProductImages(productId: number): Promise<ProductImage[]> {
    return Array.from(this.productImages.values())
      .filter((img) => img.productId === productId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const id = this.nextId("productImages");
    const newImg: ProductImage = {
      id,
      productId: image.productId,
      imageUrl: image.imageUrl,
      storageKey: image.storageKey ?? null,
      sortOrder: image.sortOrder ?? 0,
      createdAt: new Date(),
    };
    this.productImages.set(id, newImg);
    return newImg;
  }

  async deleteProductImage(id: number): Promise<void> {
    this.productImages.delete(id);
  }

  async reorderProductImages(productId: number, imageIds: number[]): Promise<void> {
    for (let i = 0; i < imageIds.length; i++) {
      const img = this.productImages.get(imageIds[i]);
      if (img && img.productId === productId) {
        this.productImages.set(img.id, { ...img, sortOrder: i });
      }
    }
  }

  // === VEHICLES ===
  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async createVehicle(v: InsertVehicle): Promise<Vehicle> {
    const id = this.nextId("vehicles");
    const newV: Vehicle = {
      id,
      number: v.number,
      ownerName: v.ownerName,
      ownerPhone: v.ownerPhone ?? null,
      type: v.type ?? null,
      isActive: v.isActive ?? true,
      createdAt: new Date(),
    };
    this.vehicles.set(id, newV);
    return newV;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const existing = this.vehicles.get(id);
    if (!existing) throw new Error(`Vehicle ${id} not found`);
    const updated = { ...existing, ...updates };
    this.vehicles.set(id, updated);
    return updated;
  }

  // === PICKUP REQUESTS ===
  async createPickupRequest(
    req: InsertPickupRequest,
    items: InsertPickupRequestItem[]
  ): Promise<PickupRequest> {
    const id = this.nextId("pickupRequests");
    const pr: PickupRequest = {
      id,
      deliveryManId: req.deliveryManId,
      vehicleId: req.vehicleId,
      status: req.status || PickupRequestStatus.PENDING,
      gatekeeperId: req.gatekeeperId ?? null,
      gatekeeperNote: req.gatekeeperNote ?? null,
      vehicleChecked: req.vehicleChecked ?? false,
      safetyOk: req.safetyOk ?? false,
      decidedAt: null,
      createdAt: new Date(),
    };
    this.pickupRequests.set(id, pr);

    for (const item of items) {
      const itemId = this.nextId("pickupRequestItems");
      this.pickupRequestItems.set(itemId, {
        id: itemId,
        pickupRequestId: pr.id,
        productId: item.productId,
        qtyRequested: item.qtyRequested,
        qtyApproved: item.qtyApproved ?? 0,
      });
    }
    return pr;
  }

  async getPickupRequests(status?: string): Promise<PickupRequest[]> {
    return Array.from(this.pickupRequests.values())
      .filter((pr) => (!status ? true : pr.status === status))
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPickupRequest(id: number): Promise<PickupRequest | undefined> {
    return this.pickupRequests.get(id);
  }

  async getPickupRequestsByDeliveryMan(userId: number): Promise<PickupRequest[]> {
    return Array.from(this.pickupRequests.values())
      .filter((pr) => pr.deliveryManId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPickupRequestItems(pickupRequestId: number): Promise<PickupRequestItem[]> {
    return Array.from(this.pickupRequestItems.values()).filter(
      (item) => item.pickupRequestId === pickupRequestId
    );
  }

  async updatePickupRequest(id: number, updates: Partial<InsertPickupRequest>): Promise<PickupRequest> {
    const pr = this.pickupRequests.get(id);
    if (!pr) throw new Error(`Pickup request ${id} not found`);
    const updated: PickupRequest = { ...pr, ...updates };
    this.pickupRequests.set(id, updated);
    return updated;
  }

  async approvePickupRequest(
    id: number,
    gatekeeperId: number,
    approvedItems: { pickupRequestItemId: number; qtyApproved: number }[],
    note?: string
  ): Promise<Trip> {
    const pr = this.pickupRequests.get(id);
    if (!pr) throw new Error(`Pickup request ${id} not found`);

    const updatedPr: PickupRequest = {
      ...pr,
      status: PickupRequestStatus.APPROVED,
      gatekeeperId,
      decidedAt: new Date(),
      gatekeeperNote: note || null,
    };
    this.pickupRequests.set(id, updatedPr);

    for (const item of approvedItems) {
      const prItem = this.pickupRequestItems.get(item.pickupRequestItemId);
      if (prItem) {
        this.pickupRequestItems.set(prItem.id, {
          ...prItem,
          qtyApproved: item.qtyApproved,
        });
      }
    }

    const tripId = this.nextId("trips");
    const trip: Trip = {
      id: tripId,
      pickupRequestId: pr.id,
      deliveryManId: pr.deliveryManId,
      vehicleId: pr.vehicleId,
      status: TripStatus.DRAFT,
      startTime: null,
      endTime: null,
      note: null,
      endTripSummaryJson: null,
      createdAt: new Date(),
    };
    this.trips.set(tripId, trip);

    for (const item of approvedItems) {
      if (item.qtyApproved > 0) {
        const prItem = this.pickupRequestItems.get(item.pickupRequestItemId);
        if (prItem) {
          const issuedId = this.nextId("tripInventoryIssued");
          this.tripInventoryIssued.set(issuedId, {
            id: issuedId,
            tripId: trip.id,
            productId: prItem.productId,
            qtyIssued: item.qtyApproved,
          });

          await this.createStockMovement({
            type: "ISSUE",
            productId: prItem.productId,
            quantity: item.qtyApproved,
            tripId: trip.id,
            pickupRequestId: pr.id,
            note: `Issued for trip #${trip.id}`,
            createdByUserId: gatekeeperId,
          });
        }
      }
    }

    return trip;
  }

  async rejectPickupRequest(
    id: number,
    gatekeeperId: number,
    note?: string
  ): Promise<PickupRequest> {
    const pr = this.pickupRequests.get(id);
    if (!pr) throw new Error(`Pickup request ${id} not found`);

    const updatedPr: PickupRequest = {
      ...pr,
      status: PickupRequestStatus.REJECTED,
      gatekeeperId,
      decidedAt: new Date(),
      gatekeeperNote: note || null,
    };
    this.pickupRequests.set(id, updatedPr);
    return updatedPr;
  }

  // === TRIPS ===
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const id = this.nextId("trips");
    const newTrip: Trip = {
      id,
      pickupRequestId: trip.pickupRequestId ?? null,
      deliveryManId: trip.deliveryManId,
      vehicleId: trip.vehicleId,
      status: trip.status || TripStatus.DRAFT,
      startTime: trip.startTime ?? null,
      endTime: trip.endTime ?? null,
      note: trip.note ?? null,
      endTripSummaryJson: trip.endTripSummaryJson ?? null,
      createdAt: new Date(),
    };
    this.trips.set(id, newTrip);
    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    return this.trips.get(id);
  }

  async getTripsByDeliveryMan(userId: number): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .filter((t) => t.deliveryManId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTripsByStatus(status: string): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .filter((t) => t.status === status)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTripsByDateRange(from: Date, to: Date): Promise<Trip[]> {
    return Array.from(this.trips.values())
      .filter((t) => {
        const time = t.createdAt?.getTime() || 0;
        return time >= from.getTime() && time <= to.getTime();
      })
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip> {
    const trip = this.trips.get(id);
    if (!trip) throw new Error(`Trip ${id} not found`);
    const updated: Trip = { ...trip, ...updates };
    this.trips.set(id, updated);
    return updated;
  }

  async startTrip(id: number): Promise<Trip> {
    const trip = this.trips.get(id);
    if (!trip) throw new Error(`Trip ${id} not found`);
    const updated = {
      ...trip,
      status: TripStatus.ACTIVE,
      startTime: new Date(),
    };
    this.trips.set(id, updated);
    return updated;
  }

  async endTrip(id: number, summaryJson: any): Promise<Trip> {
    const trip = this.trips.get(id);
    if (!trip) throw new Error(`Trip ${id} not found`);
    const updated = {
      ...trip,
      status: TripStatus.COMPLETED,
      endTime: new Date(),
      endTripSummaryJson: summaryJson,
    };
    this.trips.set(id, updated);
    return updated;
  }

  async getTripInventoryIssued(tripId: number): Promise<TripInventoryIssuedRow[]> {
    return Array.from(this.tripInventoryIssued.values()).filter(
      (r) => r.tripId === tripId
    );
  }

  async createTripInventoryIssued(
    item: InsertTripInventoryIssued
  ): Promise<TripInventoryIssuedRow> {
    const id = this.nextId("tripInventoryIssued");
    const row: TripInventoryIssuedRow = {
      id,
      tripId: item.tripId,
      productId: item.productId,
      qtyIssued: item.qtyIssued,
    };
    this.tripInventoryIssued.set(id, row);
    return row;
  }

  // === TRIP STOPS ===
  async createTripStop(stop: InsertTripStop): Promise<TripStop> {
    const id = this.nextId("tripStops");
    const newStop: TripStop = {
      id,
      tripId: stop.tripId,
      orderId: stop.orderId ?? null,
      customerId: stop.customerId ?? null,
      sequence: stop.sequence ?? 0,
      status: stop.status || "PENDING",
      arrivedAt: stop.arrivedAt ?? null,
      deliveredAt: stop.deliveredAt ?? null,
    };
    this.tripStops.set(id, newStop);
    return newStop;
  }

  async getTripStops(tripId: number): Promise<TripStop[]> {
    return Array.from(this.tripStops.values())
      .filter((s) => s.tripId === tripId)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  async updateTripStop(id: number, updates: Partial<InsertTripStop>): Promise<TripStop> {
    const stop = this.tripStops.get(id);
    if (!stop) throw new Error(`Trip stop ${id} not found`);
    const updated = { ...stop, ...updates };
    this.tripStops.set(id, updated);
    return updated;
  }

  async createTripStopDelivery(
    delivery: InsertTripStopDelivery
  ): Promise<TripStopDelivery> {
    const id = this.nextId("tripStopDeliveries");
    const d: TripStopDelivery = {
      id,
      tripStopId: delivery.tripStopId,
      productId: delivery.productId,
      qtyDelivered: delivery.qtyDelivered ?? 0,
      qtyEmptiesReturned: delivery.qtyEmptiesReturned ?? 0,
      emptyDue: delivery.emptyDue ?? 0,
    };
    this.tripStopDeliveries.set(id, d);
    return d;
  }

  async getTripStopDeliveries(tripStopId: number): Promise<TripStopDelivery[]> {
    return Array.from(this.tripStopDeliveries.values()).filter(
      (d) => d.tripStopId === tripStopId
    );
  }

  async createTripStopPayment(
    payment: InsertTripStopPayment
  ): Promise<TripStopPayment> {
    const id = this.nextId("tripStopPayments");
    const p: TripStopPayment = {
      id,
      tripStopId: payment.tripStopId,
      method: payment.method,
      amount: payment.amount,
      status: payment.status || "PAID",
      referenceNo: payment.referenceNo ?? null,
      bankName: payment.bankName ?? null,
    };
    this.tripStopPayments.set(id, p);
    return p;
  }

  async getTripStopPayments(tripStopId: number): Promise<TripStopPayment[]> {
    return Array.from(this.tripStopPayments.values()).filter(
      (p) => p.tripStopId === tripStopId
    );
  }

  // === TRIP RETURNS ===
  async createTripReturnRequest(
    req: InsertTripReturnRequest,
    items: InsertTripReturnItem[]
  ): Promise<TripReturnRequest> {
    const id = this.nextId("tripReturnRequests");
    const trr: TripReturnRequest = {
      id,
      tripId: req.tripId,
      status: req.status || TripReturnStatus.PENDING_VERIFY,
      submittedByDeliveryManId: req.submittedByDeliveryManId,
      verifiedByGatekeeperId: req.verifiedByGatekeeperId ?? null,
      submittedAt: new Date(),
      verifiedAt: null,
      deliveryManNote: req.deliveryManNote ?? null,
      gatekeeperNote: req.gatekeeperNote ?? null,
    };
    this.tripReturnRequests.set(id, trr);

    for (const item of items) {
      const itemId = this.nextId("tripReturnItems");
      this.tripReturnItems.set(itemId, {
        id: itemId,
        tripReturnRequestId: trr.id,
        productId: item.productId,
        qtyFullReturned: item.qtyFullReturned ?? 0,
        qtyEmptyReturned: item.qtyEmptyReturned ?? 0,
        qtyDamaged: item.qtyDamaged ?? 0,
      });
    }
    return trr;
  }

  async getTripReturnRequests(status?: string): Promise<TripReturnRequest[]> {
    return Array.from(this.tripReturnRequests.values())
      .filter((r) => (!status ? true : r.status === status))
      .sort((a, b) => (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0));
  }

  async getTripReturnRequest(id: number): Promise<TripReturnRequest | undefined> {
    return this.tripReturnRequests.get(id);
  }

  async getTripReturnItems(tripReturnRequestId: number): Promise<TripReturnItem[]> {
    return Array.from(this.tripReturnItems.values()).filter(
      (item) => item.tripReturnRequestId === tripReturnRequestId
    );
  }

  async verifyTripReturn(
    id: number,
    gatekeeperId: number,
    verifiedItems: {
      tripReturnItemId: number;
      qtyFullReturned: number;
      qtyEmptyReturned: number;
      qtyDamaged: number;
    }[],
    note?: string
  ): Promise<TripReturnRequest> {
    const trr = this.tripReturnRequests.get(id);
    if (!trr) throw new Error(`Trip return request ${id} not found`);

    const updatedTrr: TripReturnRequest = {
      ...trr,
      status: TripReturnStatus.VERIFIED,
      verifiedByGatekeeperId: gatekeeperId,
      verifiedAt: new Date(),
      gatekeeperNote: note || null,
    };
    this.tripReturnRequests.set(id, updatedTrr);

    for (const item of verifiedItems) {
      const rItem = this.tripReturnItems.get(item.tripReturnItemId);
      if (rItem) {
        this.tripReturnItems.set(rItem.id, {
          ...rItem,
          qtyFullReturned: item.qtyFullReturned,
          qtyEmptyReturned: item.qtyEmptyReturned,
          qtyDamaged: item.qtyDamaged,
        });

        if (item.qtyFullReturned > 0) {
          await this.createStockMovement({
            type: "RETURN",
            productId: rItem.productId,
            quantity: item.qtyFullReturned,
            tripId: trr.tripId,
            tripReturnRequestId: trr.id,
            note: `Full cylinders returned from trip #${trr.tripId}`,
            createdByUserId: gatekeeperId,
          });
        }

        if (item.qtyEmptyReturned > 0) {
          await this.createStockMovement({
            type: "RETURN",
            productId: rItem.productId,
            quantity: item.qtyEmptyReturned,
            tripId: trr.tripId,
            tripReturnRequestId: trr.id,
            note: `Empty cylinders returned from trip #${trr.tripId}`,
            createdByUserId: gatekeeperId,
          });
        }
      }
    }

    const trip = this.trips.get(trr.tripId);
    if (trip) {
      this.trips.set(trip.id, { ...trip, status: TripStatus.CLOSED });
    }

    return updatedTrr;
  }

  // === REPORTS ===
  async getDailyTripsReport(
    from: Date,
    to: Date
  ): Promise<{
    trip: Trip;
    vehicleNumber: string;
    vehicleOwnerName: string;
    deliveryManName: string;
    totalIssued: number;
    totalDelivered: number;
    totalEmptiesCollected: number;
    totalFullReturned: number;
    totalEmptyReturned: number;
    totalMoneyCollected: number;
    gatekeeperApprovalName: string | null;
    gatekeeperReturnVerifyName: string | null;
    discrepancy: number;
  }[]> {
    const tripRows = Array.from(this.trips.values())
      .filter((t) => {
        const time = t.createdAt?.getTime() || 0;
        return time >= from.getTime() && time <= to.getTime();
      })
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));

    const results: any[] = [];
    for (const trip of tripRows) {
      const vehicle = this.vehicles.get(trip.vehicleId);
      const deliveryMan = this.users.get(trip.deliveryManId);

      const issuedRows = Array.from(this.tripInventoryIssued.values()).filter(
        (r) => r.tripId === trip.id
      );
      const totalIssued = issuedRows.reduce((sum, r) => sum + (r.qtyIssued || 0), 0);

      const stops = Array.from(this.tripStops.values()).filter(
        (s) => s.tripId === trip.id
      );
      let totalDelivered = 0;
      let totalEmptiesCollected = 0;
      let totalMoneyCollected = 0;

      for (const stop of stops) {
        const deliveries = Array.from(this.tripStopDeliveries.values()).filter(
          (d) => d.tripStopId === stop.id
        );
        totalDelivered += deliveries.reduce((sum, d) => sum + (d.qtyDelivered || 0), 0);
        totalEmptiesCollected += deliveries.reduce(
          (sum, d) => sum + (d.qtyEmptiesReturned || 0),
          0
        );

        const payments = Array.from(this.tripStopPayments.values()).filter(
          (p) => p.tripStopId === stop.id
        );
        totalMoneyCollected += payments.reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );
      }

      let totalFullReturned = 0;
      let totalEmptyReturned = 0;
      let gatekeeperApprovalName: string | null = null;
      let gatekeeperReturnVerifyName: string | null = null;

      const returnReqs = Array.from(this.tripReturnRequests.values()).filter(
        (rr) => rr.tripId === trip.id
      );

      for (const rr of returnReqs) {
        const rItems = Array.from(this.tripReturnItems.values()).filter(
          (ri) => ri.tripReturnRequestId === rr.id
        );
        totalFullReturned += rItems.reduce(
          (sum, ri) => sum + (ri.qtyFullReturned || 0),
          0
        );
        totalEmptyReturned += rItems.reduce(
          (sum, ri) => sum + (ri.qtyEmptyReturned || 0),
          0
        );

        if (rr.verifiedByGatekeeperId) {
          const gk = this.users.get(rr.verifiedByGatekeeperId);
          if (gk) gatekeeperReturnVerifyName = gk.name;
        }
      }

      if (trip.pickupRequestId) {
        const pr = this.pickupRequests.get(trip.pickupRequestId);
        if (pr?.gatekeeperId) {
          const gk = this.users.get(pr.gatekeeperId);
          if (gk) gatekeeperApprovalName = gk.name;
        }
      }

      const discrepancy = totalIssued - totalDelivered - totalFullReturned;

      results.push({
        trip,
        vehicleNumber: vehicle?.number || "",
        vehicleOwnerName: vehicle?.ownerName || "",
        deliveryManName: deliveryMan?.name || "",
        totalIssued,
        totalDelivered,
        totalEmptiesCollected,
        totalFullReturned,
        totalEmptyReturned,
        totalMoneyCollected,
        gatekeeperApprovalName,
        gatekeeperReturnVerifyName,
        discrepancy,
      });
    }

    return results;
  }

  // === SITE SETTINGS ===
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    return this.siteSettingsData;
  }

  async upsertSiteSettings(updates: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    this.siteSettingsData = {
      ...this.siteSettingsData,
      ...updates,
      updatedAt: new Date(),
    };
    return this.siteSettingsData;
  }

  // === CONTACT INQUIRIES ===
  async getContactInquiries(): Promise<ContactInquiry[]> {
    return Array.from(this.contactInquiries.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getContactInquiry(id: number): Promise<ContactInquiry | undefined> {
    return this.contactInquiries.get(id);
  }

  async createContactInquiry(
    inquiry: InsertContactInquiry & { ipAddress?: string }
  ): Promise<ContactInquiry> {
    const id = this.nextId("contactInquiries");
    const newInquiry: ContactInquiry = {
      id,
      name: inquiry.name,
      email: inquiry.email ?? null,
      phone: inquiry.phone,
      inquiryType: inquiry.inquiryType || "Other",
      message: inquiry.message,
      status: "NEW",
      ipAddress: inquiry.ipAddress ?? null,
      createdAt: new Date(),
    };
    this.contactInquiries.set(id, newInquiry);
    return newInquiry;
  }

  async updateContactInquiryStatus(id: number, status: string): Promise<ContactInquiry> {
    const inq = this.contactInquiries.get(id);
    if (!inq) throw new Error(`Contact inquiry ${id} not found`);
    const updated = { ...inq, status };
    this.contactInquiries.set(id, updated);
    return updated;
  }

  async getRecentInquiriesByIp(ip: string, minutesAgo: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
    return Array.from(this.contactInquiries.values()).filter(
      (inq) =>
        inq.ipAddress === ip &&
        inq.createdAt &&
        inq.createdAt.getTime() >= cutoff.getTime()
    ).length;
  }

  // === PAYMENT TRANSACTIONS ===
  async createPaymentTransaction(
    txn: InsertPaymentTransaction
  ): Promise<PaymentTransaction> {
    const id = this.nextId("paymentTransactions");
    const newTxn: PaymentTransaction = {
      id,
      merchantTxnId: txn.merchantTxnId,
      gateway: txn.gateway || "CCAVENUE",
      baseAmountPaise: txn.baseAmountPaise,
      convenienceFeeAmountPaise: txn.convenienceFeeAmountPaise ?? 0,
      totalAmountPaise: txn.totalAmountPaise,
      status: txn.status || "INITIATED",
      orderId: txn.orderId ?? null,
      userId: txn.userId ?? null,
      customerName: txn.customerName ?? null,
      customerPhone: txn.customerPhone ?? null,
      currency: txn.currency || "INR",
      gatewayOrderId: txn.gatewayOrderId ?? null,
      gatewayTrackingId: txn.gatewayTrackingId ?? null,
      bankRefNo: txn.bankRefNo ?? null,
      requestPayloadJson: txn.requestPayloadJson ?? null,
      responsePayloadJson: txn.responsePayloadJson ?? null,
      feePercent: txn.feePercent ?? null,
      roundingMode: txn.roundingMode ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.paymentTransactions.set(id, newTxn);
    return newTxn;
  }

  async getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined> {
    return this.paymentTransactions.get(id);
  }

  async getPaymentTransactionByMerchantTxnId(
    merchantTxnId: string
  ): Promise<PaymentTransaction | undefined> {
    return Array.from(this.paymentTransactions.values()).find(
      (p) => p.merchantTxnId === merchantTxnId
    );
  }

  async getPaymentTransactionsByOrderId(
    orderId: number
  ): Promise<PaymentTransaction[]> {
    return Array.from(this.paymentTransactions.values())
      .filter((p) => p.orderId === orderId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updatePaymentTransaction(
    id: number,
    updates: Partial<InsertPaymentTransaction>
  ): Promise<PaymentTransaction> {
    const txn = this.paymentTransactions.get(id);
    if (!txn) throw new Error(`Payment transaction ${id} not found`);
    const updated: PaymentTransaction = {
      ...txn,
      ...updates,
      updatedAt: new Date(),
    };
    this.paymentTransactions.set(id, updated);
    return updated;
  }

  async getPaymentTransactions(filters?: {
    gateway?: string;
    status?: string;
  }): Promise<PaymentTransaction[]> {
    return Array.from(this.paymentTransactions.values())
      .filter((p) => {
        if (filters?.gateway && p.gateway !== filters.gateway) return false;
        if (filters?.status && p.status !== filters.status) return false;
        return true;
      })
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }
}
