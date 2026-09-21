import type { IStorage } from "./storageTypes";
import { 
  type User, type InsertUser, type Product, type InsertProduct, type Order, 
  type Store, type InsertStore, type Inventory, type InsertInventory, 
  type GatePass, type InsertGatePass, type ServiceTicket, type InsertServiceTicket,
  type CreateOrderRequest, type DashboardStats, UserRole,
  type Role, type InsertRole, type Permission, type InsertPermission,
  type Category, type InsertCategory,
  type Vehicle, type InsertVehicle,
  type PickupRequest, type InsertPickupRequest,
  type Trip, type InsertTrip,
  type ProductImage, type InsertProductImage,
  type SiteSettings, type InsertSiteSettings,
  type ContactInquiry, type InsertContactInquiry,
  type PaymentTransaction, type InsertPaymentTransaction
} from "@shared/schema";

// Helper to map DB row (snake_case) to JS Object (camelCase)
function mapFromDb(row: any): any {
  if (!row) return undefined;
  if (Array.isArray(row)) return row.map(mapFromDb);
  
  const obj: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Convert integer boolean fields (0 / 1)
    if ([
      'isActive', 'isSystem', 'inStock', 'showOnHomeTabs', 'showLogo', 'showSiteName',
      'showHomeVideo', 'ccavenueEnabled', 'ccavenueFeeEnabled', 'vehicleChecked', 'safetyOk'
    ].includes(camelKey) && (val === 0 || val === 1 || val === '0' || val === '1')) {
      obj[camelKey] = Boolean(Number(val));
    } else {
      obj[camelKey] = val;
    }
  }
  return obj;
}

// Helper to convert object keys to snake_case for DB queries
function toSnakeCaseKey(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export class D1Storage implements IStorage {
  private db: any;

  constructor(d1Database: any) {
    if (!d1Database) {
      throw new Error("D1 Database connection binding is required.");
    }
    this.db = d1Database;
  }

  private async queryAll(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      const res = await stmt.all();
      return (res.results || []).map(mapFromDb);
    } catch (err: any) {
      console.error("[D1 Query Error]", sql, err);
      throw new Error(`D1 Database Query Failed: ${err.message}`);
    }
  }

  private async queryFirst(sql: string, params: any[] = []): Promise<any | undefined> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      const row = await stmt.first();
      return row ? mapFromDb(row) : undefined;
    } catch (err: any) {
      console.error("[D1 Query Error]", sql, err);
      throw new Error(`D1 Database Query Failed: ${err.message}`);
    }
  }

  private async execute(sql: string, params: any[] = []): Promise<void> {
    try {
      const stmt = this.db.prepare(sql).bind(...params);
      await stmt.run();
    } catch (err: any) {
      console.error("[D1 Execute Error]", sql, err);
      throw new Error(`D1 Database Execution Failed: ${err.message}`);
    }
  }

  // --- USERS ---
  async getUser(id: number): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE id = ?", [id]);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE username = ?", [username]);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE google_id = ?", [googleId]);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE email = ?", [email]);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE phone = ?", [phone]);
  }

  async createUser(user: InsertUser): Promise<User> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(user)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    const sql = `INSERT INTO users (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        setClauses.push(`${toSnakeCaseKey(key)} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.getUser(id);
      return existing!;
    }

    values.push(id);
    const sql = `UPDATE users SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async getCustomers(): Promise<User[]> {
    return this.queryAll("SELECT * FROM users WHERE role = 'CUSTOMER' ORDER BY id DESC");
  }

  async getCustomer(id: number): Promise<User | undefined> {
    return this.queryFirst("SELECT * FROM users WHERE id = ? AND role = 'CUSTOMER'", [id]);
  }

  async updateCustomer(id: number, updates: Partial<InsertUser>): Promise<User> {
    return this.updateUser(id, updates);
  }

  async getStaffList(): Promise<User[]> {
    return this.queryAll("SELECT * FROM users WHERE role != 'CUSTOMER' ORDER BY id DESC");
  }

  async getStaffByRole(roleSlug: string): Promise<User[]> {
    return this.queryAll("SELECT u.* FROM users u JOIN roles r ON u.role_id = r.id WHERE r.slug = ? ORDER BY u.id DESC", [roleSlug]);
  }

  async getDeliveryMen(): Promise<User[]> {
    return this.queryAll("SELECT * FROM users WHERE role = 'DELIVERY_MAN' OR role_id IN (SELECT id FROM roles WHERE slug = 'delivery_man') ORDER BY id DESC");
  }

  // --- CATEGORIES ---
  async getCategories(): Promise<Category[]> {
    return this.queryAll("SELECT * FROM categories ORDER BY sort_order ASC, id ASC");
  }

  async getCategoriesForHome(): Promise<Category[]> {
    return this.queryAll("SELECT * FROM categories WHERE is_active = 1 AND show_on_home_tabs = 1 ORDER BY sort_order ASC, id ASC");
  }

  async getCategory(id: number): Promise<Category | undefined> {
    return this.queryFirst("SELECT * FROM categories WHERE id = ?", [id]);
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    return this.queryFirst("SELECT * FROM categories WHERE slug = ?", [slug]);
  }

  async createCategory(cat: InsertCategory): Promise<Category> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(cat)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    const sql = `INSERT INTO categories (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async updateCategory(id: number, updates: Partial<InsertCategory>): Promise<Category> {
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        setClauses.push(`${toSnakeCaseKey(key)} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.getCategory(id);
      return existing!;
    }

    values.push(id);
    const sql = `UPDATE categories SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async deleteCategory(id: number): Promise<void> {
    await this.execute("DELETE FROM categories WHERE id = ?", [id]);
  }

  async reorderCategories(orderedIds: number[]): Promise<void> {
    for (let index = 0; index < orderedIds.length; index++) {
      await this.execute("UPDATE categories SET sort_order = ? WHERE id = ?", [index, orderedIds[index]]);
    }
  }

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    return this.queryAll("SELECT * FROM products ORDER BY id DESC");
  }

  async getActiveProducts(): Promise<Product[]> {
    return this.queryAll("SELECT * FROM products WHERE is_active = 1 AND status = 'ACTIVE' ORDER BY id DESC");
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.queryFirst("SELECT * FROM products WHERE id = ?", [id]);
  }

  async getProductBySlug(slug: string): Promise<Product | undefined> {
    return this.queryFirst("SELECT * FROM products WHERE slug = ?", [slug]);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(product)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    const sql = `INSERT INTO products (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        setClauses.push(`${toSnakeCaseKey(key)} = ?`);
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    if (setClauses.length === 0) {
      const existing = await this.getProduct(id);
      return existing!;
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    const sql = `UPDATE products SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async deleteProduct(id: number): Promise<void> {
    await this.execute("DELETE FROM products WHERE id = ?", [id]);
  }

  async getProductImages(productId: number): Promise<ProductImage[]> {
    return this.queryAll("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC", [productId]);
  }

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    const keys = ["product_id", "image_url", "storage_key", "sort_order"];
    const values = [image.productId, image.imageUrl, image.storageKey || null, image.sortOrder ?? 0];
    return this.queryFirst(`INSERT INTO product_images (${keys.join(", ")}) VALUES (?, ?, ?, ?) RETURNING *`, values);
  }

  async deleteProductImage(imageId: number): Promise<void> {
    await this.execute("DELETE FROM product_images WHERE id = ?", [imageId]);
  }

  async reorderProductImages(productId: number, imageIds: number[]): Promise<void> {
    for (let index = 0; index < imageIds.length; index++) {
      await this.execute("UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?", [index, imageIds[index], productId]);
    }
  }

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    return this.queryAll("SELECT * FROM orders ORDER BY id DESC");
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const order = await this.queryFirst("SELECT * FROM orders WHERE id = ?", [id]);
    if (!order) return undefined;
    const items = await this.queryAll("SELECT * FROM order_items WHERE order_id = ?", [id]);
    return { ...order, items };
  }

  async createOrder(orderReq: CreateOrderRequest): Promise<Order> {
    const orderNum = orderReq.orderNumber || `ORD-HP-${Date.now()}`;
    const totalPaise = orderReq.totalPaise || (parseFloat(orderReq.totalAmount || "0") * 100);

    const keys = [
      "order_number", "user_id", "store_id", "customer_name", "phone",
      "address_line", "city", "state", "pincode", "status",
      "total_amount", "total_paise", "payment_status", "payment_mode"
    ];
    const values = [
      orderNum, orderReq.userId || null, orderReq.storeId || null, orderReq.customerName, orderReq.phone || "",
      orderReq.addressLine || "", orderReq.city || "", orderReq.state || "", orderReq.pincode || "", orderReq.status || "NEW",
      orderReq.totalAmount || "0", totalPaise, orderReq.paymentStatus || "UNPAID", orderReq.paymentMode || "CASH"
    ];

    const order = await this.queryFirst(`INSERT INTO orders (${keys.join(", ")}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`, values);

    if (orderReq.items && orderReq.items.length > 0) {
      for (const item of orderReq.items) {
        const prod = item.productId ? await this.getProduct(item.productId) : undefined;
        const prodName = prod?.name || item.productName || "Product";
        const itemPrice = item.price || prod?.price || "0";
        const totalPrice = (parseFloat(itemPrice) * item.quantity).toString();

        await this.execute(
          "INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total_price) VALUES (?, ?, ?, ?, ?, ?)",
          [order.id, item.productId || null, prodName, item.quantity, itemPrice, totalPrice]
        );
      }
    }

    return this.getOrder(order.id) as Promise<Order>;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order> {
    return this.queryFirst("UPDATE orders SET status = ? WHERE id = ? RETURNING *", [status, id]);
  }

  async assignDeliveryMan(orderId: number, deliveryManId: number): Promise<Order> {
    return this.queryFirst("UPDATE orders SET delivery_man_id = ?, assigned_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *", [deliveryManId, orderId]);
  }

  async getOrdersByDeliveryMan(deliveryManId: number): Promise<Order[]> {
    return this.queryAll("SELECT * FROM orders WHERE delivery_man_id = ? ORDER BY id DESC", [deliveryManId]);
  }

  // --- INVENTORY & STORES ---
  async getInventory(): Promise<Inventory[]> {
    return this.queryAll("SELECT * FROM inventory ORDER BY id DESC");
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    return this.queryFirst(
      "INSERT INTO inventory (type, status, quantity, location) VALUES (?, ?, ?, ?) RETURNING *",
      [item.type, item.status, item.quantity ?? 0, item.location || null]
    );
  }

  async updateInventory(id: number, updates: Partial<InsertInventory>): Promise<Inventory> {
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        setClauses.push(`${toSnakeCaseKey(k)} = ?`);
        values.push(v);
      }
    }
    values.push(id);
    return this.queryFirst(`UPDATE inventory SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`, values);
  }

  async getStores(): Promise<Store[]> {
    return this.queryAll("SELECT * FROM stores ORDER BY id DESC");
  }

  async createStore(store: InsertStore): Promise<Store> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(store)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    return this.queryFirst(`INSERT INTO stores (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`, values);
  }

  // --- GATE PASSES ---
  async getGatePasses(): Promise<GatePass[]> {
    return this.queryAll("SELECT * FROM gate_passes ORDER BY id DESC");
  }

  async getGatePass(id: number): Promise<GatePass | undefined> {
    return this.queryFirst("SELECT * FROM gate_passes WHERE id = ?", [id]);
  }

  async createGatePass(gp: InsertGatePass): Promise<GatePass> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(gp)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
      }
    }

    return this.queryFirst(`INSERT INTO gate_passes (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`, values);
  }

  // --- SERVICE TICKETS ---
  async getServiceTickets(): Promise<ServiceTicket[]> {
    return this.queryAll("SELECT * FROM service_tickets ORDER BY id DESC");
  }

  async createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket> {
    return this.queryFirst(
      "INSERT INTO service_tickets (user_id, customer_name, subject, description, status, priority) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
      [ticket.userId || null, ticket.customerName || null, ticket.subject, ticket.description, ticket.status || 'OPEN', ticket.priority || 'MEDIUM']
    );
  }

  async updateTicketStatus(id: number, status: string): Promise<ServiceTicket> {
    return this.queryFirst("UPDATE service_tickets SET status = ? WHERE id = ? RETURNING *", [status, id]);
  }

  // --- DASHBOARD STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    const totalOrdersRes = await this.queryFirst("SELECT COUNT(*) as count FROM orders");
    const totalCustomersRes = await this.queryFirst("SELECT COUNT(*) as count FROM users WHERE role = 'CUSTOMER'");
    const totalProductsRes = await this.queryFirst("SELECT COUNT(*) as count FROM products WHERE is_active = 1");
    const totalRevenueRes = await this.queryFirst("SELECT SUM(total_paise) as sum FROM orders WHERE payment_status = 'PAID'");

    return {
      totalOrders: Number(totalOrdersRes?.count || 0),
      totalCustomers: Number(totalCustomersRes?.count || 0),
      totalProducts: Number(totalProductsRes?.count || 0),
      totalRevenuePaise: Number(totalRevenueRes?.sum || 0),
    };
  }

  // --- ROLES & PERMISSIONS ---
  async getRoles(): Promise<Role[]> {
    return this.queryAll("SELECT * FROM roles ORDER BY id ASC");
  }

  async getRole(id: number): Promise<Role | undefined> {
    return this.queryFirst("SELECT * FROM roles WHERE id = ?", [id]);
  }

  async getRoleBySlug(slug: string): Promise<Role | undefined> {
    return this.queryFirst("SELECT * FROM roles WHERE slug = ?", [slug]);
  }

  async createRole(role: InsertRole): Promise<Role> {
    return this.queryFirst(
      "INSERT INTO roles (name, slug, is_system, is_active) VALUES (?, ?, ?, ?) RETURNING *",
      [role.name, role.slug, role.isSystem ? 1 : 0, role.isActive !== false ? 1 : 0]
    );
  }

  async updateRole(id: number, updates: Partial<InsertRole>): Promise<Role> {
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) {
        setClauses.push(`${toSnakeCaseKey(k)} = ?`);
        values.push(typeof v === 'boolean' ? (v ? 1 : 0) : v);
      }
    }
    values.push(id);
    return this.queryFirst(`UPDATE roles SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`, values);
  }

  async deleteRole(id: number): Promise<void> {
    await this.execute("DELETE FROM roles WHERE id = ?", [id]);
  }

  async getPermissions(): Promise<Permission[]> {
    return this.queryAll("SELECT * FROM permissions ORDER BY id ASC");
  }

  async getRolePermissions(roleId: number): Promise<any[]> {
    return this.queryAll("SELECT * FROM role_permissions WHERE role_id = ?", [roleId]);
  }

  async setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
    await this.execute("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    for (const permId of permissionIds) {
      await this.execute("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [roleId, permId]);
    }
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const user = await this.getUser(userId);
    if (!user || !user.roleId) return [];
    const perms = await this.queryAll(
      "SELECT p.key FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE rp.role_id = ?",
      [user.roleId]
    );
    return perms.map(p => p.key);
  }

  // --- SITE SETTINGS ---
  async getSiteSettings(): Promise<SiteSettings | undefined> {
    return this.queryFirst("SELECT * FROM site_settings LIMIT 1");
  }

  async upsertSiteSettings(settings: Partial<InsertSiteSettings>): Promise<SiteSettings> {
    const existing = await this.getSiteSettings();
    if (!existing) {
      const keys: string[] = [];
      const placeholders: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(settings)) {
        if (val !== undefined) {
          keys.push(toSnakeCaseKey(key));
          placeholders.push("?");
          values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
      }
      const sql = `INSERT INTO site_settings (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
      return this.queryFirst(sql, values);
    } else {
      const setClauses: string[] = [];
      const values: any[] = [];

      for (const [key, val] of Object.entries(settings)) {
        if (val !== undefined) {
          setClauses.push(`${toSnakeCaseKey(key)} = ?`);
          values.push(typeof val === 'boolean' ? (val ? 1 : 0) : val);
        }
      }

      setClauses.push("updated_at = CURRENT_TIMESTAMP");
      values.push(existing.id);
      const sql = `UPDATE site_settings SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`;
      return this.queryFirst(sql, values);
    }
  }

  // --- CONTACT INQUIRIES ---
  async getContactInquiries(): Promise<ContactInquiry[]> {
    return this.queryAll("SELECT * FROM contact_inquiries ORDER BY id DESC");
  }

  async getContactInquiry(id: number): Promise<ContactInquiry | undefined> {
    return this.queryFirst("SELECT * FROM contact_inquiries WHERE id = ?", [id]);
  }

  async createContactInquiry(inquiry: InsertContactInquiry & { ipAddress?: string }): Promise<ContactInquiry> {
    return this.queryFirst(
      "INSERT INTO contact_inquiries (name, phone, email, inquiry_type, message, status, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *",
      [inquiry.name, inquiry.phone, inquiry.email || null, inquiry.inquiryType || 'Other', inquiry.message, inquiry.status || 'NEW', inquiry.ipAddress || null]
    );
  }

  async updateContactInquiryStatus(id: number, status: string): Promise<ContactInquiry> {
    return this.queryFirst("UPDATE contact_inquiries SET status = ? WHERE id = ? RETURNING *", [status, id]);
  }

  async getRecentInquiriesByIp(ip: string, minutesAgo: number): Promise<number> {
    const cutoff = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    const res = await this.queryFirst("SELECT COUNT(*) as count FROM contact_inquiries WHERE ip_address = ? AND created_at >= ?", [ip, cutoff]);
    return Number(res?.count || 0);
  }

  // --- PAYMENT TRANSACTIONS ---
  async createPaymentTransaction(txn: InsertPaymentTransaction): Promise<PaymentTransaction> {
    const keys: string[] = [];
    const placeholders: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(txn)) {
      if (val !== undefined) {
        keys.push(toSnakeCaseKey(key));
        placeholders.push("?");
        values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }

    const sql = `INSERT INTO payment_transactions (${keys.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async getPaymentTransaction(id: number): Promise<PaymentTransaction | undefined> {
    return this.queryFirst("SELECT * FROM payment_transactions WHERE id = ?", [id]);
  }

  async getPaymentTransactionByMerchantTxnId(merchantTxnId: string): Promise<PaymentTransaction | undefined> {
    return this.queryFirst("SELECT * FROM payment_transactions WHERE merchant_txn_id = ?", [merchantTxnId]);
  }

  async getPaymentTransactionsByOrderId(orderId: number): Promise<PaymentTransaction[]> {
    return this.queryAll("SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY id DESC", [orderId]);
  }

  async updatePaymentTransaction(id: number, updates: Partial<InsertPaymentTransaction>): Promise<PaymentTransaction> {
    const setClauses: string[] = [];
    const values: any[] = [];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        setClauses.push(`${toSnakeCaseKey(key)} = ?`);
        values.push(typeof val === 'object' && val !== null ? JSON.stringify(val) : val);
      }
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    const sql = `UPDATE payment_transactions SET ${setClauses.join(", ")} WHERE id = ? RETURNING *`;
    return this.queryFirst(sql, values);
  }

  async getPaymentTransactions(filters?: { gateway?: string; status?: string }): Promise<PaymentTransaction[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.gateway) {
      conditions.push("gateway = ?");
      params.push(filters.gateway);
    }
    if (filters?.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return this.queryAll(`SELECT * FROM payment_transactions ${whereClause} ORDER BY id DESC`, params);
  }

  // --- VEHICLES, PICKUPS & TRIPS STUBS/SUPPORT ---
  async getVehicles(): Promise<Vehicle[]> {
    return this.queryAll("SELECT * FROM vehicles ORDER BY id DESC");
  }

  async createVehicle(v: InsertVehicle): Promise<Vehicle> {
    return this.queryFirst("INSERT INTO vehicles (number, type, owner_name, owner_phone, is_active) VALUES (?, ?, ?, ?, ?) RETURNING *", [v.number, v.type || null, v.ownerName, v.ownerPhone || null, v.isActive !== false ? 1 : 0]);
  }
}
