
import { db, isMock } from "./db";
import { 
  users, products, orders, orderItems, stores, inventory, gatePasses, serviceTickets,
  roles, permissions, rolePermissions, orderStatusLogs, stockMovements, categories,
  vehicles, pickupRequests, pickupRequestItems, trips, tripInventoryIssued,
  tripStops, tripStopDeliveries, tripStopPayments, tripReturnRequests, tripReturnItems,
  productImages, siteSettings, contactInquiries,
  type User, type InsertUser, type Product, type InsertProduct, type Order, 
  type Store, type InsertStore, type Inventory, type InsertInventory, 
  type GatePass, type InsertGatePass, type ServiceTicket, type InsertServiceTicket,
  type CreateOrderRequest, type DashboardStats, UserRole,
  type Role, type InsertRole, type Permission, type InsertPermission,
  type RolePermission, type InsertRolePermission,
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
  paymentTransactions,
  PickupRequestStatus, TripStatus, TripReturnStatus
} from "@shared/schema";
import { eq, desc, sql, and, ne, inArray, asc, ilike, gte, lte, between, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User>;
  getCustomers(): Promise<User[]>;
  getCustomer(id: number): Promise<User | undefined>;
  updateCustomer(id: number, updates: Partial<InsertUser>): Promise<User>;
  getStaffList(): Promise<User[]>;
  getStaffByRole(roleSlug: string): Promise<User[]>;
  getDeliveryMen(): Promise<User[]>;
  
  getCategories(): Promise<Category[]>;
  getCategoriesForHome(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(cat: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  reorderCategories(orderedIds: number[]): Promise<void>;

  getProducts(): Promise<Product[]>;
  getActiveProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  createOrder(order: CreateOrderRequest): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order>;
  assignDeliveryMan(orderId: number, deliveryManId: number): Promise<Order>;
  getOrdersByDeliveryMan(deliveryManId: number): Promise<Order[]>;
  
  getInventory(): Promise<Inventory[]>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, updates: Partial<InsertInventory>): Promise<Inventory>;
  
  getStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  
  getGatePasses(): Promise<GatePass[]>;
  getGatePass(id: number): Promise<GatePass | undefined>;
  createGatePass(gp: InsertGatePass): Promise<GatePass>;
  
  getServiceTickets(): Promise<ServiceTicket[]>;
  createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket>;
  updateTicketStatus(id: number, status: string): Promise<ServiceTicket>;
  
  getDashboardStats(): Promise<DashboardStats>;

  getRoles(): Promise<Role[]>;
  getRole(id: number): Promise<Role | undefined>;
  getRoleBySlug(slug: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: number, updates: Partial<InsertRole>): Promise<Role>;
  deleteRole(id: number): Promise<void>;

  getPermissions(): Promise<Permission[]>;
  createPermission(perm: InsertPermission): Promise<Permission>;
  getPermissionByKey(key: string): Promise<Permission | undefined>;

  getRolePermissions(roleId: number): Promise<(RolePermission & { permission?: Permission })[]>;
  setRolePermissions(roleId: number, permissionIds: number[]): Promise<void>;
  getUserPermissions(userId: number): Promise<string[]>;

  createOrderStatusLog(log: InsertOrderStatusLog): Promise<OrderStatusLog>;
  getOrderStatusLogs(orderId: number): Promise<OrderStatusLog[]>;

  getStockMovements(): Promise<StockMovement[]>;
  createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

  getProductImages(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  deleteProductImage(id: number): Promise<void>;
  reorderProductImages(productId: number, imageIds: number[]): Promise<void>;

  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(v: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle>;

  createPickupRequest(req: InsertPickupRequest, items: InsertPickupRequestItem[]): Promise<PickupRequest>;
  getPickupRequests(status?: string): Promise<PickupRequest[]>;
  getPickupRequest(id: number): Promise<PickupRequest | undefined>;
  getPickupRequestsByDeliveryMan(userId: number): Promise<PickupRequest[]>;
  getPickupRequestItems(pickupRequestId: number): Promise<PickupRequestItem[]>;
  updatePickupRequest(id: number, updates: Partial<InsertPickupRequest>): Promise<PickupRequest>;
  approvePickupRequest(id: number, gatekeeperId: number, approvedItems: { pickupRequestItemId: number; qtyApproved: number }[], note?: string): Promise<Trip>;
  rejectPickupRequest(id: number, gatekeeperId: number, note?: string): Promise<PickupRequest>;

  createTrip(trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getTripsByDeliveryMan(userId: number): Promise<Trip[]>;
  getTripsByStatus(status: string): Promise<Trip[]>;
  getTripsByDateRange(from: Date, to: Date): Promise<Trip[]>;
  updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip>;
  startTrip(id: number): Promise<Trip>;
  endTrip(id: number, summaryJson: any): Promise<Trip>;
  getTripInventoryIssued(tripId: number): Promise<TripInventoryIssuedRow[]>;
  createTripInventoryIssued(item: InsertTripInventoryIssued): Promise<TripInventoryIssuedRow>;

  createTripStop(stop: InsertTripStop): Promise<TripStop>;
  getTripStops(tripId: number): Promise<TripStop[]>;
  updateTripStop(id: number, updates: Partial<InsertTripStop>): Promise<TripStop>;
  createTripStopDelivery(delivery: InsertTripStopDelivery): Promise<TripStopDelivery>;
  getTripStopDeliveries(tripStopId: number): Promise<TripStopDelivery[]>;
  createTripStopPayment(payment: InsertTripStopPayment): Promise<TripStopPayment>;
  getTripStopPayments(tripStopId: number): Promise<TripStopPayment[]>;

  createTripReturnRequest(req: InsertTripReturnRequest, items: InsertTripReturnItem[]): Promise<TripReturnRequest>;
  getTripReturnRequests(status?: string): Promise<TripReturnRequest[]>;
  getTripReturnRequest(id: number): Promise<TripReturnRequest | undefined>;
  getTripReturnItems(tripReturnRequestId: number): Promise<TripReturnItem[]>;
  verifyTripReturn(id: number, gatekeeperId: number, verifiedItems: { tripReturnItemId: number; qtyFullReturned: number; qtyEmptyReturned: number; qtyDamaged: number }[], note?: string): Promise<TripReturnRequest>;

  getSiteSettings(): Promise<SiteSettings | undefined>;
  upsertSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings>;

  getContactInquiries(): Promise<ContactInquiry[]>;
  getContactInquiry(id: number): Promise<ContactInquiry | undefined>;
  createContactInquiry(inquiry: InsertContactInquiry & { ipAddress?: string }): Promise<ContactInquiry>;
  updateContactInquiryStatus(id: number, status: string): Promise<ContactInquiry>;
  getRecentInquiriesByIp(ip: string, minutesAgo: number): Promise<number>;

  createPaymentTransaction(txn: InsertPaymentTransaction): Promise<PaymentTransaction>;
  getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionByMerchantTxnId(merchantTxnId: string): Promise<PaymentTransaction | undefined>;
  getPaymentTransactionsByOrderId(orderId: number): Promise<PaymentTransaction[]>;
  updatePaymentTransaction(id: number, updates: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction>;
  getPaymentTransactions(filters?: { gateway?: string; status?: string }): Promise<PaymentTransaction[]>;

  getDailyTripsReport(from: Date, to: Date): Promise<{
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
  }[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    if (!phone) return undefined;
    
    // Normalize input digits
    const cleaned = phone.replace(/[^\d+]/g, "");
    let canonical = cleaned;
    let fallback10 = cleaned;
    let fallback91 = cleaned;
    
    if (cleaned.startsWith("+91") && cleaned.length === 13) {
      canonical = cleaned;
      fallback10 = cleaned.substring(3); // 10 digits
      fallback91 = cleaned.substring(1); // 91 + 10 digits
    } else if (cleaned.startsWith("91") && cleaned.length === 12) {
      canonical = "+" + cleaned;
      fallback10 = cleaned.substring(2);
      fallback91 = cleaned;
    } else if (cleaned.length === 10) {
      canonical = "+91" + cleaned;
      fallback10 = cleaned;
      fallback91 = "91" + cleaned;
    }

    // Try finding the user by any of these variations
    const results = await db.select().from(users).where(
      or(
        eq(users.phone, canonical),
        eq(users.phone, fallback10),
        eq(users.phone, fallback91)
      )
    );
    
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    if (!user) {
      // If we are in fallback/mock mode, generate a mock user object with a valid ID
      const mockId = Math.floor(Math.random() * 1000000);
      return {
        id: mockId,
        username: insertUser.username,
        password: insertUser.password,
        role: insertUser.role || UserRole.CUSTOMER,
        roleId: insertUser.roleId || null,
        name: insertUser.name,
        email: insertUser.email || null,
        phone: insertUser.phone || null,
        staffId: insertUser.staffId || null,
        consumerId: insertUser.consumerId || null,
        customerType: insertUser.customerType || null,
        address: insertUser.address || null,
        route: insertUser.route || null,
        outstandingBalance: insertUser.outstandingBalance || 0,
        isActive: insertUser.isActive ?? true,
        joiningDate: insertUser.joiningDate ? new Date(insertUser.joiningDate) : null,
        notes: insertUser.notes || null,
        googleId: insertUser.googleId || null,
        avatarUrl: insertUser.avatarUrl || null,
        createdAt: new Date(),
      };
    }
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getCustomers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, UserRole.CUSTOMER)).orderBy(desc(users.createdAt));
  }

  async getCustomer(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.role, UserRole.CUSTOMER)));
    return user;
  }

  async updateCustomer(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async getStaffList(): Promise<User[]> {
    return await db.select().from(users).where(
      and(ne(users.role, UserRole.CUSTOMER))
    ).orderBy(desc(users.createdAt));
  }

  async getStaffByRole(roleSlug: string): Promise<User[]> {
    const role = await this.getRoleBySlug(roleSlug);
    if (!role) return [];
    return await db.select().from(users).where(eq(users.roleId, role.id)).orderBy(desc(users.createdAt));
  }

  async getDeliveryMen(): Promise<User[]> {
    return await db.select().from(users).where(
      and(eq(users.role, UserRole.DELIVERY_MAN), eq(users.isActive, true))
    ).orderBy(users.name);
  }

  // === CATEGORIES ===
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async getCategoriesForHome(): Promise<Category[]> {
    return await db.select().from(categories)
      .where(and(eq(categories.showOnHomeTabs, true), eq(categories.isActive, true)))
      .orderBy(asc(categories.sortOrder));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.id, id));
    return cat;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [cat] = await db.select().from(categories).where(eq(categories.slug, slug));
    return cat;
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const [newCat] = await db.insert(categories).values(cat).returning();
    return newCat;
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const [cat] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return cat;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.update(products).set({ categoryId: null }).where(eq(products.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
  }

  async reorderCategories(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.update(categories).set({ sortOrder: i }).where(eq(categories.id, orderedIds[i]));
    }
  }

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getActiveProducts(): Promise<Product[]> {
    return await db.select().from(products)
      .where(and(eq(products.isActive, true), eq(products.status, 'ACTIVE')))
      .orderBy(desc(products.createdAt));
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    return product;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(req: CreateOrderRequest): Promise<Order> {
    return await db.transaction(async (tx) => {
      const { items, ...orderData } = req;
      const [order] = await tx.insert(orders).values(orderData).returning();
      if (items && items.length > 0) {
        for (const item of items) {
          const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (product) {
            await tx.insert(orderItems).values({
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
    });
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    const updates: any = { status };
    if (status === 'DELIVERED') {
      updates.deliveredAt = new Date();
    }
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order;
  }

  async assignDeliveryMan(orderId: number, deliveryManId: number): Promise<Order> {
    const [order] = await db.update(orders).set({ 
      deliveryManId, 
      assignedAt: new Date() 
    }).where(eq(orders.id, orderId)).returning();
    return order;
  }

  async getOrdersByDeliveryMan(deliveryManId: number): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.deliveryManId, deliveryManId))
      .orderBy(desc(orders.createdAt));
  }

  async getInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [inv] = await db.insert(inventory).values(item).returning();
    return inv;
  }

  async updateInventory(id: number, updates: Partial<InsertInventory>): Promise<Inventory> {
    const [item] = await db.update(inventory).set(updates).where(eq(inventory.id, id)).returning();
    return item;
  }

  async getStores(): Promise<Store[]> {
    return await db.select().from(stores);
  }

  async createStore(store: InsertStore): Promise<Store> {
    const [s] = await db.insert(stores).values(store).returning();
    return s;
  }

  async getGatePasses(): Promise<GatePass[]> {
    return await db.select().from(gatePasses).orderBy(desc(gatePasses.createdAt));
  }

  async getGatePass(id: number): Promise<GatePass | undefined> {
    const [gp] = await db.select().from(gatePasses).where(eq(gatePasses.id, id));
    return gp;
  }

  async createGatePass(gp: InsertGatePass): Promise<GatePass> {
    const [newGp] = await db.insert(gatePasses).values(gp).returning();
    return newGp;
  }

  async getServiceTickets(): Promise<ServiceTicket[]> {
    return await db.select().from(serviceTickets).orderBy(desc(serviceTickets.createdAt));
  }

  async createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket> {
    const [newTicket] = await db.insert(serviceTickets).values(ticket).returning();
    return newTicket;
  }

  async updateTicketStatus(id: number, status: string): Promise<ServiceTicket> {
    const [ticket] = await db.update(serviceTickets).set({ status }).where(eq(serviceTickets.id, id)).returning();
    return ticket;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const allCustomers = await db.select().from(users).where(eq(users.role, UserRole.CUSTOMER));
    const allProducts = await db.select().from(products);
    const allTickets = await db.select().from(serviceTickets).where(eq(serviceTickets.status, 'OPEN'));
    const allInventory = await db.select().from(inventory);

    const revenueOrders = allOrders.filter(o =>
      o.status !== 'CANCELLED' && o.status !== 'REJECTED' && o.status !== 'PAYMENT_FAILED'
    );
    const totalRevenuePaise = revenueOrders.reduce((acc, o) => acc + (o.totalPaise || 0), 0);
    const activeOrders = allOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED' && o.status !== 'PAYMENT_FAILED').length;

    const statusCounts: Record<string, number> = {};
    allOrders.forEach(o => {
      const s = o.status || 'NEW';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const inventorySummary: { type: string; filled: number; empty: number }[] = [];
    const byType: Record<string, { filled: number; empty: number }> = {};
    allInventory.forEach(i => {
      if (!byType[i.type]) byType[i.type] = { filled: 0, empty: 0 };
      if (i.status === 'FILLED') byType[i.type].filled += i.quantity || 0;
      else byType[i.type].empty += i.quantity || 0;
    });
    Object.entries(byType).forEach(([type, data]) => {
      inventorySummary.push({ type, ...data });
    });

    const recentOrders = allOrders.slice(0, 10);

    const allPayments = await db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt));
    const successPayments = allPayments.filter(p => p.status === 'SUCCESS');
    const pendingPayments = allPayments.filter(p => p.status === 'INITIATED');
    const directPaymentRevenuePaise = successPayments.reduce((acc, p) => acc + (p.baseAmountPaise || 0), 0);

    const recentPayments = allPayments.slice(0, 10).map(p => {
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
        customerName,
        customerPhone,
      };
    });

    return {
      totalOrders: allOrders.length,
      totalRevenuePaise: totalRevenuePaise + directPaymentRevenuePaise,
      totalCustomers: allCustomers.length,
      totalProducts: allProducts.length,
      activeOrders,
      openTickets: allTickets.length,
      inventorySummary,
      recentOrders,
      ordersByStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
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
    return await db.select().from(roles).orderBy(roles.name);
  }

  async getRole(id: number): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role;
  }

  async getRoleBySlug(slug: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.slug, slug));
    return role;
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role> {
    const [role] = await db.update(roles).set(updates).where(eq(roles.id, id)).returning();
    return role;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));
  }

  // === PERMISSIONS ===
  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.module, permissions.key);
  }

  async createPermission(perm: InsertPermission): Promise<Permission> {
    const [newPerm] = await db.insert(permissions).values(perm).returning();
    return newPerm;
  }

  async getPermissionByKey(key: string): Promise<Permission | undefined> {
    const [perm] = await db.select().from(permissions).where(eq(permissions.key, key));
    return perm;
  }

  // === ROLE PERMISSIONS ===
  async getRolePermissions(roleId: number): Promise<(RolePermission & { permission?: Permission })[]> {
    const rps = await db.select().from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    return rps.map(rp => ({
      ...rp.role_permissions,
      permission: rp.permissions,
    }));
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(permissionId => ({ roleId, permissionId }))
      );
    }
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    if (user.role === UserRole.ADMIN || user.role === 'SUPER_ADMIN') {
      const allPerms = await this.getPermissions();
      return allPerms.map(p => p.key);
    }

    if (!user.roleId) return [];
    
    const rps = await db.select().from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, user.roleId));
    
    return rps.map(rp => rp.permissions.key);
  }

  // === ORDER STATUS LOG ===
  async createOrderStatusLog(log: InsertOrderStatusLog): Promise<OrderStatusLog> {
    const [newLog] = await db.insert(orderStatusLogs).values(log).returning();
    return newLog;
  }

  async getOrderStatusLogs(orderId: number): Promise<OrderStatusLog[]> {
    return await db.select().from(orderStatusLogs)
      .where(eq(orderStatusLogs.orderId, orderId))
      .orderBy(desc(orderStatusLogs.createdAt));
  }

  // === STOCK MOVEMENTS ===
  async getStockMovements(): Promise<StockMovement[]> {
    return await db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt));
  }

  async createStockMovement(movement: InsertStockMovement): Promise<StockMovement> {
    const [newMovement] = await db.insert(stockMovements).values(movement).returning();
    return newMovement;
  }

  // === PRODUCT IMAGES (Gallery) ===
  async getProductImages(productId: number): Promise<ProductImage[]> {
    return await db.select().from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(asc(productImages.sortOrder));
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const [newImage] = await db.insert(productImages).values(image).returning();
    return newImage;
  }

  async deleteProductImage(id: number): Promise<void> {
    await db.delete(productImages).where(eq(productImages.id, id));
  }

  async reorderProductImages(productId: number, imageIds: number[]): Promise<void> {
    for (let i = 0; i < imageIds.length; i++) {
      await db.update(productImages)
        .set({ sortOrder: i })
        .where(and(eq(productImages.id, imageIds[i]), eq(productImages.productId, productId)));
    }
  }

  // === VEHICLES ===
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [v] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return v;
  }

  async createVehicle(v: InsertVehicle): Promise<Vehicle> {
    const [newV] = await db.insert(vehicles).values(v).returning();
    return newV;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [v] = await db.update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return v;
  }

  // === PICKUP REQUESTS ===
  async createPickupRequest(req: InsertPickupRequest, items: InsertPickupRequestItem[]): Promise<PickupRequest> {
    return await db.transaction(async (tx) => {
      const [pr] = await tx.insert(pickupRequests).values(req).returning();
      for (const item of items) {
        await tx.insert(pickupRequestItems).values({
          ...item,
          pickupRequestId: pr.id,
        });
      }
      return pr;
    });
  }

  async getPickupRequests(status?: string): Promise<PickupRequest[]> {
    if (status) {
      return await db.select().from(pickupRequests)
        .where(eq(pickupRequests.status, status))
        .orderBy(desc(pickupRequests.createdAt));
    }
    return await db.select().from(pickupRequests).orderBy(desc(pickupRequests.createdAt));
  }

  async getPickupRequest(id: number): Promise<PickupRequest | undefined> {
    const [pr] = await db.select().from(pickupRequests).where(eq(pickupRequests.id, id));
    return pr;
  }

  async getPickupRequestsByDeliveryMan(userId: number): Promise<PickupRequest[]> {
    return await db.select().from(pickupRequests)
      .where(eq(pickupRequests.deliveryManId, userId))
      .orderBy(desc(pickupRequests.createdAt));
  }

  async getPickupRequestItems(pickupRequestId: number): Promise<PickupRequestItem[]> {
    return await db.select().from(pickupRequestItems).where(eq(pickupRequestItems.pickupRequestId, pickupRequestId));
  }

  async updatePickupRequest(id: number, updates: Partial<InsertPickupRequest>): Promise<PickupRequest> {
    const [pr] = await db.update(pickupRequests).set(updates).where(eq(pickupRequests.id, id)).returning();
    return pr;
  }

  async approvePickupRequest(
    id: number,
    gatekeeperId: number,
    approvedItems: { pickupRequestItemId: number; qtyApproved: number }[],
    note?: string
  ): Promise<Trip> {
    return await db.transaction(async (tx) => {
      const [pr] = await tx.update(pickupRequests).set({
        status: PickupRequestStatus.APPROVED,
        gatekeeperId,
        decidedAt: new Date(),
        gatekeeperNote: note || null,
      }).where(eq(pickupRequests.id, id)).returning();

      for (const item of approvedItems) {
        await tx.update(pickupRequestItems).set({
          qtyApproved: item.qtyApproved,
        }).where(eq(pickupRequestItems.id, item.pickupRequestItemId));
      }

      const [trip] = await tx.insert(trips).values({
        pickupRequestId: pr.id,
        deliveryManId: pr.deliveryManId,
        vehicleId: pr.vehicleId,
        status: TripStatus.DRAFT,
      }).returning();

      for (const item of approvedItems) {
        if (item.qtyApproved > 0) {
          const [prItem] = await tx.select().from(pickupRequestItems)
            .where(eq(pickupRequestItems.id, item.pickupRequestItemId));

          await tx.insert(tripInventoryIssued).values({
            tripId: trip.id,
            productId: prItem.productId,
            qtyIssued: item.qtyApproved,
          });

          await tx.insert(stockMovements).values({
            type: 'ISSUE',
            productId: prItem.productId,
            quantity: item.qtyApproved,
            tripId: trip.id,
            pickupRequestId: pr.id,
            note: `Issued for trip #${trip.id}`,
            createdByUserId: gatekeeperId,
          });
        }
      }

      return trip;
    });
  }

  async rejectPickupRequest(id: number, gatekeeperId: number, note?: string): Promise<PickupRequest> {
    const [pr] = await db.update(pickupRequests).set({
      status: PickupRequestStatus.REJECTED,
      gatekeeperId,
      decidedAt: new Date(),
      gatekeeperNote: note || null,
    }).where(eq(pickupRequests.id, id)).returning();
    return pr;
  }

  // === TRIPS ===
  async createTrip(trip: InsertTrip): Promise<Trip> {
    const [newTrip] = await db.insert(trips).values(trip).returning();
    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db.select().from(trips).where(eq(trips.id, id));
    return trip;
  }

  async getTripsByDeliveryMan(userId: number): Promise<Trip[]> {
    return await db.select().from(trips)
      .where(eq(trips.deliveryManId, userId))
      .orderBy(desc(trips.createdAt));
  }

  async getTripsByStatus(status: string): Promise<Trip[]> {
    return await db.select().from(trips)
      .where(eq(trips.status, status))
      .orderBy(desc(trips.createdAt));
  }

  async getTripsByDateRange(from: Date, to: Date): Promise<Trip[]> {
    return await db.select().from(trips)
      .where(between(trips.createdAt, from, to))
      .orderBy(desc(trips.createdAt));
  }

  async updateTrip(id: number, updates: Partial<InsertTrip>): Promise<Trip> {
    const [trip] = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
    return trip;
  }

  async startTrip(id: number): Promise<Trip> {
    const [trip] = await db.update(trips).set({
      status: TripStatus.ACTIVE,
      startTime: new Date(),
    }).where(eq(trips.id, id)).returning();
    return trip;
  }

  async endTrip(id: number, summaryJson: any): Promise<Trip> {
    const [trip] = await db.update(trips).set({
      status: TripStatus.COMPLETED,
      endTime: new Date(),
      endTripSummaryJson: summaryJson,
    }).where(eq(trips.id, id)).returning();
    return trip;
  }

  async getTripInventoryIssued(tripId: number): Promise<TripInventoryIssuedRow[]> {
    return await db.select().from(tripInventoryIssued)
      .where(eq(tripInventoryIssued.tripId, tripId));
  }

  async createTripInventoryIssued(item: InsertTripInventoryIssued): Promise<TripInventoryIssuedRow> {
    const [newItem] = await db.insert(tripInventoryIssued).values(item).returning();
    return newItem;
  }

  // === TRIP STOPS ===
  async createTripStop(stop: InsertTripStop): Promise<TripStop> {
    const [newStop] = await db.insert(tripStops).values(stop).returning();
    return newStop;
  }

  async getTripStops(tripId: number): Promise<TripStop[]> {
    return await db.select().from(tripStops)
      .where(eq(tripStops.tripId, tripId))
      .orderBy(asc(tripStops.sequence));
  }

  async updateTripStop(id: number, updates: Partial<InsertTripStop>): Promise<TripStop> {
    const [stop] = await db.update(tripStops).set(updates).where(eq(tripStops.id, id)).returning();
    return stop;
  }

  async createTripStopDelivery(delivery: InsertTripStopDelivery): Promise<TripStopDelivery> {
    const [newDel] = await db.insert(tripStopDeliveries).values(delivery).returning();
    return newDel;
  }

  async getTripStopDeliveries(tripStopId: number): Promise<TripStopDelivery[]> {
    return await db.select().from(tripStopDeliveries)
      .where(eq(tripStopDeliveries.tripStopId, tripStopId));
  }

  async createTripStopPayment(payment: InsertTripStopPayment): Promise<TripStopPayment> {
    const [newPay] = await db.insert(tripStopPayments).values(payment).returning();
    return newPay;
  }

  async getTripStopPayments(tripStopId: number): Promise<TripStopPayment[]> {
    return await db.select().from(tripStopPayments)
      .where(eq(tripStopPayments.tripStopId, tripStopId));
  }

  // === TRIP RETURNS ===
  async createTripReturnRequest(req: InsertTripReturnRequest, items: InsertTripReturnItem[]): Promise<TripReturnRequest> {
    return await db.transaction(async (tx) => {
      const [trr] = await tx.insert(tripReturnRequests).values(req).returning();
      for (const item of items) {
        await tx.insert(tripReturnItems).values({
          ...item,
          tripReturnRequestId: trr.id,
        });
      }
      return trr;
    });
  }

  async getTripReturnRequests(status?: string): Promise<TripReturnRequest[]> {
    if (status) {
      return await db.select().from(tripReturnRequests)
        .where(eq(tripReturnRequests.status, status))
        .orderBy(desc(tripReturnRequests.submittedAt));
    }
    return await db.select().from(tripReturnRequests).orderBy(desc(tripReturnRequests.submittedAt));
  }

  async getTripReturnRequest(id: number): Promise<TripReturnRequest | undefined> {
    const [trr] = await db.select().from(tripReturnRequests).where(eq(tripReturnRequests.id, id));
    return trr;
  }

  async getTripReturnItems(tripReturnRequestId: number): Promise<TripReturnItem[]> {
    return await db.select().from(tripReturnItems).where(eq(tripReturnItems.tripReturnRequestId, tripReturnRequestId));
  }

  async verifyTripReturn(
    id: number,
    gatekeeperId: number,
    verifiedItems: { tripReturnItemId: number; qtyFullReturned: number; qtyEmptyReturned: number; qtyDamaged: number }[],
    note?: string
  ): Promise<TripReturnRequest> {
    return await db.transaction(async (tx) => {
      const [trr] = await tx.update(tripReturnRequests).set({
        status: TripReturnStatus.VERIFIED,
        verifiedByGatekeeperId: gatekeeperId,
        verifiedAt: new Date(),
        gatekeeperNote: note || null,
      }).where(eq(tripReturnRequests.id, id)).returning();

      for (const item of verifiedItems) {
        await tx.update(tripReturnItems).set({
          qtyFullReturned: item.qtyFullReturned,
          qtyEmptyReturned: item.qtyEmptyReturned,
          qtyDamaged: item.qtyDamaged,
        }).where(eq(tripReturnItems.id, item.tripReturnItemId));

        const [returnItem] = await tx.select().from(tripReturnItems)
          .where(eq(tripReturnItems.id, item.tripReturnItemId));

        if (item.qtyFullReturned > 0) {
          await tx.insert(stockMovements).values({
            type: 'RETURN',
            productId: returnItem.productId,
            quantity: item.qtyFullReturned,
            tripId: trr.tripId,
            tripReturnRequestId: trr.id,
            note: `Full cylinders returned from trip #${trr.tripId}`,
            createdByUserId: gatekeeperId,
          });
        }

        if (item.qtyEmptyReturned > 0) {
          await tx.insert(stockMovements).values({
            type: 'RETURN',
            productId: returnItem.productId,
            quantity: item.qtyEmptyReturned,
            tripId: trr.tripId,
            tripReturnRequestId: trr.id,
            note: `Empty cylinders returned from trip #${trr.tripId}`,
            createdByUserId: gatekeeperId,
          });
        }
      }

      await tx.update(trips).set({
        status: TripStatus.CLOSED,
      }).where(eq(trips.id, trr.tripId));

      return trr;
    });
  }

  // === REPORTS ===
  async getDailyTripsReport(from: Date, to: Date): Promise<{
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
    const tripRows = await db.select().from(trips)
      .where(between(trips.createdAt, from, to))
      .orderBy(desc(trips.createdAt));

    const results: any[] = [];

    for (const trip of tripRows) {
      const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, trip.vehicleId));
      const [deliveryMan] = await db.select().from(users).where(eq(users.id, trip.deliveryManId));

      const issuedRows = await db.select().from(tripInventoryIssued)
        .where(eq(tripInventoryIssued.tripId, trip.id));
      const totalIssued = issuedRows.reduce((sum, r) => sum + (r.qtyIssued || 0), 0);

      const stops = await db.select().from(tripStops).where(eq(tripStops.tripId, trip.id));
      let totalDelivered = 0;
      let totalEmptiesCollected = 0;
      let totalMoneyCollected = 0;

      for (const stop of stops) {
        const deliveries = await db.select().from(tripStopDeliveries)
          .where(eq(tripStopDeliveries.tripStopId, stop.id));
        totalDelivered += deliveries.reduce((sum, d) => sum + (d.qtyDelivered || 0), 0);
        totalEmptiesCollected += deliveries.reduce((sum, d) => sum + (d.qtyEmptiesReturned || 0), 0);

        const payments = await db.select().from(tripStopPayments)
          .where(eq(tripStopPayments.tripStopId, stop.id));
        totalMoneyCollected += payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
      }

      let totalFullReturned = 0;
      let totalEmptyReturned = 0;
      let gatekeeperApprovalName: string | null = null;
      let gatekeeperReturnVerifyName: string | null = null;

      const returnReqs = await db.select().from(tripReturnRequests)
        .where(eq(tripReturnRequests.tripId, trip.id));

      for (const rr of returnReqs) {
        const returnItems = await db.select().from(tripReturnItems)
          .where(eq(tripReturnItems.tripReturnRequestId, rr.id));
        totalFullReturned += returnItems.reduce((sum, ri) => sum + (ri.qtyFullReturned || 0), 0);
        totalEmptyReturned += returnItems.reduce((sum, ri) => sum + (ri.qtyEmptyReturned || 0), 0);

        if (rr.verifiedByGatekeeperId) {
          const [gk] = await db.select().from(users).where(eq(users.id, rr.verifiedByGatekeeperId));
          if (gk) gatekeeperReturnVerifyName = gk.name;
        }
      }

      if (trip.pickupRequestId) {
        const [pr] = await db.select().from(pickupRequests)
          .where(eq(pickupRequests.id, trip.pickupRequestId));
        if (pr?.gatekeeperId) {
          const [gk] = await db.select().from(users).where(eq(users.id, pr.gatekeeperId));
          if (gk) gatekeeperApprovalName = gk.name;
        }
      }

      const discrepancy = totalIssued - totalDelivered - totalFullReturned;

      results.push({
        trip,
        vehicleNumber: vehicle?.number || '',
        vehicleOwnerName: vehicle?.ownerName || '',
        deliveryManName: deliveryMan?.name || '',
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

  async getSiteSettings(): Promise<SiteSettings | undefined> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    return settings;
  }

  async upsertSiteSettings(updates: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    if (existing) {
      const [updated] = await db.update(siteSettings)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(siteSettings.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values(updates as any).returning();
    return created;
  }

  async getContactInquiries(): Promise<ContactInquiry[]> {
    return db.select().from(contactInquiries).orderBy(desc(contactInquiries.createdAt));
  }

  async getContactInquiry(id: number): Promise<ContactInquiry | undefined> {
    const [inquiry] = await db.select().from(contactInquiries).where(eq(contactInquiries.id, id));
    return inquiry;
  }

  async createContactInquiry(inquiry: InsertContactInquiry & { ipAddress?: string }): Promise<ContactInquiry> {
    const [created] = await db.insert(contactInquiries).values(inquiry).returning();
    return created;
  }

  async updateContactInquiryStatus(id: number, status: string): Promise<ContactInquiry> {
    const [updated] = await db.update(contactInquiries)
      .set({ status })
      .where(eq(contactInquiries.id, id))
      .returning();
    return updated;
  }

  async getRecentInquiriesByIp(ip: string, minutesAgo: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(contactInquiries)
      .where(and(
        eq(contactInquiries.ipAddress, ip),
        gte(contactInquiries.createdAt, cutoff)
      ));
    return Number(result[0]?.count || 0);
  }

  async createPaymentTransaction(txn: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const [created] = await db.insert(paymentTransactions).values(txn).returning();
    return created;
  }

  async getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined> {
    const [txn] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id));
    return txn;
  }

  async getPaymentTransactionByMerchantTxnId(merchantTxnId: string): Promise<PaymentTransaction | undefined> {
    const [txn] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.merchantTxnId, merchantTxnId));
    return txn;
  }

  async getPaymentTransactionsByOrderId(orderId: number): Promise<PaymentTransaction[]> {
    return db.select().from(paymentTransactions)
      .where(eq(paymentTransactions.orderId, orderId))
      .orderBy(desc(paymentTransactions.createdAt));
  }

  async updatePaymentTransaction(id: number, updates: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction> {
    const [updated] = await db.update(paymentTransactions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentTransactions.id, id))
      .returning();
    return updated;
  }

  async getPaymentTransactions(filters?: { gateway?: string; status?: string }): Promise<PaymentTransaction[]> {
    const conditions: any[] = [];
    if (filters?.gateway) conditions.push(eq(paymentTransactions.gateway, filters.gateway));
    if (filters?.status) conditions.push(eq(paymentTransactions.status, filters.status));
    if (conditions.length > 0) {
      return db.select().from(paymentTransactions)
        .where(and(...conditions))
        .orderBy(desc(paymentTransactions.createdAt));
    }
    return db.select().from(paymentTransactions).orderBy(desc(paymentTransactions.createdAt));
  }
}

import { MemStorage } from "./memStorage";
export { MemStorage };

export const storage: IStorage = isMock ? new MemStorage() : new DatabaseStorage();

