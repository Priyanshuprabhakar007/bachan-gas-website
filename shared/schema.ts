
import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  ADMIN: 'ADMIN',
  SUBADMIN: 'SUBADMIN',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
  ACCOUNTANT: 'ACCOUNTANT',
  GODOWN_KEEPER: 'GODOWN_KEEPER',
  DELIVERY_MAN: 'DELIVERY_MAN',
  GATE_KEEPER: 'GATE_KEEPER',
  CUSTOMER: 'CUSTOMER'
} as const;

export const OrderStatus = {
  NEW: 'NEW',
  CONFIRMED: 'CONFIRMED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED'
} as const;

export const CylinderType = {
  DOMESTIC_14: 'DOMESTIC_14',
  COMMERCIAL_19: 'COMMERCIAL_19',
  LARGE_47: 'LARGE_47',
  COMPOSITE: 'COMPOSITE',
} as const;

export const StockStatus = {
  FILLED: 'FILLED',
  EMPTY: 'EMPTY',
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const;

export const PickupRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export const TripStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export const TripStopStatus = {
  PENDING: 'PENDING',
  ARRIVED: 'ARRIVED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export const TripReturnStatus = {
  PENDING_VERIFY: 'PENDING_VERIFY',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
} as const;

// === ROLES (Dynamic RBAC) ===
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });

// === PERMISSIONS ===
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  module: text("module").notNull(),
  description: text("description"),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true });

// === ROLE PERMISSIONS (junction) ===
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ id: true });

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default(UserRole.CUSTOMER).notNull(),
  roleId: integer("role_id").references(() => roles.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  staffId: text("staff_id"),
  consumerId: text("consumer_id"),
  customerType: text("customer_type"),
  address: text("address"),
  route: text("route"),
  outstandingBalance: integer("outstanding_balance").default(0),
  isActive: boolean("is_active").default(true),
  joiningDate: timestamp("joining_date"),
  notes: text("notes"),
  googleId: text("google_id"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// === CATEGORIES ===
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  icon: text("icon"),
  iconImageUrl: text("icon_image_url"),
  bannerImageUrl: text("banner_image_url"),
  showOnHomeTabs: boolean("show_on_home_tabs").default(true),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });

// === PRODUCTS ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  description: text("description"),
  type: text("type").notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  price: decimal("price").notNull(),
  basePricePaise: integer("base_price_paise").notNull(),
  weight: text("weight"),
  unit: text("unit"),
  stockQty: integer("stock_qty").default(0),
  inStock: boolean("in_stock").default(true),
  status: text("status").default('ACTIVE'),
  isActive: boolean("is_active").default(true),
  imageUrl: text("image_url"),
  sku: text("sku"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });

// === PRODUCT IMAGES (Gallery) ===
export const productImages = pgTable("product_images", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  imageUrl: text("image_url").notNull(),
  storageKey: text("storage_key"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductImageSchema = createInsertSchema(productImages).omit({ id: true, createdAt: true });
export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

// === STORES ===
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  phone: text("phone"),
  email: text("email"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  isActive: boolean("is_active").default(true),
  openingHours: text("opening_hours"),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({ id: true, createdAt: true });

// === ORDERS ===
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").unique().notNull(),
  userId: integer("user_id").references(() => users.id),
  storeId: integer("store_id").references(() => stores.id),
  customerName: text("customer_name").notNull(),
  phone: text("phone"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  pincode: text("pincode"),
  status: text("status").default(OrderStatus.NEW),
  totalAmount: decimal("total_amount"),
  totalPaise: integer("total_paise"),
  paymentStatus: text("payment_status").default('UNPAID'),
  paymentMode: text("payment_mode").default('CASH'),
  deliveryManId: integer("delivery_man_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  deliveryDate: timestamp("delivery_date"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });

// === ORDER ITEMS ===
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price").notNull(),
  totalPrice: decimal("total_price").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

// === ORDER STATUS LOG ===
export const orderStatusLogs = pgTable("order_status_logs", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  status: text("status").notNull(),
  changedByUserId: integer("changed_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderStatusLogSchema = createInsertSchema(orderStatusLogs).omit({ id: true, createdAt: true });

// === INVENTORY ===
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  quantity: integer("quantity").default(0),
  location: text("location"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });

// === VEHICLES ===
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  number: text("number").unique().notNull(),
  type: text("type"),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });

// === PICKUP REQUESTS ===
export const pickupRequests = pgTable("pickup_requests", {
  id: serial("id").primaryKey(),
  deliveryManId: integer("delivery_man_id").references(() => users.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  status: text("status").default(PickupRequestStatus.PENDING).notNull(),
  gatekeeperId: integer("gatekeeper_id").references(() => users.id),
  vehicleChecked: boolean("vehicle_checked").default(false),
  safetyOk: boolean("safety_ok").default(false),
  gatekeeperNote: text("gatekeeper_note"),
  createdAt: timestamp("created_at").defaultNow(),
  decidedAt: timestamp("decided_at"),
});

export const insertPickupRequestSchema = createInsertSchema(pickupRequests).omit({ id: true, createdAt: true, decidedAt: true });

// === PICKUP REQUEST ITEMS ===
export const pickupRequestItems = pgTable("pickup_request_items", {
  id: serial("id").primaryKey(),
  pickupRequestId: integer("pickup_request_id").references(() => pickupRequests.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  qtyRequested: integer("qty_requested").notNull(),
  qtyApproved: integer("qty_approved").default(0),
});

export const insertPickupRequestItemSchema = createInsertSchema(pickupRequestItems).omit({ id: true });

// === TRIPS ===
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  pickupRequestId: integer("pickup_request_id").references(() => pickupRequests.id),
  deliveryManId: integer("delivery_man_id").references(() => users.id).notNull(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  status: text("status").default(TripStatus.DRAFT).notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  endTripSummaryJson: jsonb("end_trip_summary_json"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTripSchema = createInsertSchema(trips).omit({ id: true, createdAt: true });

// === TRIP INVENTORY ISSUED ===
export const tripInventoryIssued = pgTable("trip_inventory_issued", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  qtyIssued: integer("qty_issued").notNull(),
});

export const insertTripInventoryIssuedSchema = createInsertSchema(tripInventoryIssued).omit({ id: true });

// === TRIP STOPS ===
export const tripStops = pgTable("trip_stops", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  customerId: integer("customer_id").references(() => users.id),
  sequence: integer("sequence").default(0),
  status: text("status").default(TripStopStatus.PENDING).notNull(),
  arrivedAt: timestamp("arrived_at"),
  deliveredAt: timestamp("delivered_at"),
});

export const insertTripStopSchema = createInsertSchema(tripStops).omit({ id: true });

// === TRIP STOP DELIVERIES ===
export const tripStopDeliveries = pgTable("trip_stop_deliveries", {
  id: serial("id").primaryKey(),
  tripStopId: integer("trip_stop_id").references(() => tripStops.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  qtyDelivered: integer("qty_delivered").default(0),
  qtyEmptiesReturned: integer("qty_empties_returned").default(0),
  emptyDue: integer("empty_due").default(0),
});

export const insertTripStopDeliverySchema = createInsertSchema(tripStopDeliveries).omit({ id: true });

// === TRIP STOP PAYMENTS ===
export const tripStopPayments = pgTable("trip_stop_payments", {
  id: serial("id").primaryKey(),
  tripStopId: integer("trip_stop_id").references(() => tripStops.id).notNull(),
  method: text("method").notNull(),
  amount: decimal("amount").notNull(),
  status: text("status").default('PAID'),
  referenceNo: text("reference_no"),
  bankName: text("bank_name"),
});

export const insertTripStopPaymentSchema = createInsertSchema(tripStopPayments).omit({ id: true });

// === TRIP RETURN REQUESTS ===
export const tripReturnRequests = pgTable("trip_return_requests", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").references(() => trips.id).notNull(),
  status: text("status").default(TripReturnStatus.PENDING_VERIFY).notNull(),
  submittedByDeliveryManId: integer("submitted_by_delivery_man_id").references(() => users.id).notNull(),
  verifiedByGatekeeperId: integer("verified_by_gatekeeper_id").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  deliveryManNote: text("delivery_man_note"),
  gatekeeperNote: text("gatekeeper_note"),
});

export const insertTripReturnRequestSchema = createInsertSchema(tripReturnRequests).omit({ id: true, submittedAt: true, verifiedAt: true });

// === TRIP RETURN ITEMS ===
export const tripReturnItems = pgTable("trip_return_items", {
  id: serial("id").primaryKey(),
  tripReturnRequestId: integer("trip_return_request_id").references(() => tripReturnRequests.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  qtyFullReturned: integer("qty_full_returned").default(0),
  qtyEmptyReturned: integer("qty_empty_returned").default(0),
  qtyDamaged: integer("qty_damaged").default(0),
});

export const insertTripReturnItemSchema = createInsertSchema(tripReturnItems).omit({ id: true });

// === STOCK MOVEMENTS (for gate keeper) ===
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  tripId: integer("trip_id").references(() => trips.id),
  pickupRequestId: integer("pickup_request_id").references(() => pickupRequests.id),
  tripReturnRequestId: integer("trip_return_request_id").references(() => tripReturnRequests.id),
  note: text("note"),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({ id: true, createdAt: true });

// === GATE PASSES ===
export const gatePasses = pgTable("gate_passes", {
  id: serial("id").primaryKey(),
  gatePassNo: text("gate_pass_no").unique().notNull(),
  deliveryManId: integer("delivery_man_id").references(() => users.id),
  deliveryManName: text("delivery_man_name"),
  vehicleNo: text("vehicle_no"),
  status: text("status").default('OPEN'),
  odometerStart: integer("odometer_start"),
  odometerEnd: integer("odometer_end"),
  deliveriesCount: integer("deliveries_count").default(0),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGatePassSchema = createInsertSchema(gatePasses).omit({ id: true, createdAt: true });

// === SERVICE TICKETS ===
export const serviceTickets = pgTable("service_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  customerName: text("customer_name"),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").default('OPEN'),
  priority: text("priority").default('MEDIUM'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceTicketSchema = createInsertSchema(serviceTickets).omit({ id: true, createdAt: true });

// === RELATIONS ===
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  users: many(users),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  userRole: one(roles, { fields: [users.roleId], references: [roles.id] }),
  orders: many(orders),
  tickets: many(serviceTickets),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  store: one(stores, { fields: [orders.storeId], references: [stores.id] }),
  statusLogs: many(orderStatusLogs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const orderStatusLogsRelations = relations(orderStatusLogs, ({ one }) => ({
  order: one(orders, { fields: [orderStatusLogs.orderId], references: [orders.id] }),
}));

// === TYPES ===
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type GatePass = typeof gatePasses.$inferSelect;
export type InsertGatePass = z.infer<typeof insertGatePassSchema>;
export type ServiceTicket = typeof serviceTickets.$inferSelect;
export type InsertServiceTicket = z.infer<typeof insertServiceTicketSchema>;
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type OrderStatusLog = typeof orderStatusLogs.$inferSelect;
export type InsertOrderStatusLog = z.infer<typeof insertOrderStatusLogSchema>;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type PickupRequest = typeof pickupRequests.$inferSelect;
export type InsertPickupRequest = z.infer<typeof insertPickupRequestSchema>;
export type PickupRequestItem = typeof pickupRequestItems.$inferSelect;
export type InsertPickupRequestItem = z.infer<typeof insertPickupRequestItemSchema>;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type TripInventoryIssuedRow = typeof tripInventoryIssued.$inferSelect;
export type InsertTripInventoryIssued = z.infer<typeof insertTripInventoryIssuedSchema>;
export type TripStop = typeof tripStops.$inferSelect;
export type InsertTripStop = z.infer<typeof insertTripStopSchema>;
export type TripStopDelivery = typeof tripStopDeliveries.$inferSelect;
export type InsertTripStopDelivery = z.infer<typeof insertTripStopDeliverySchema>;
export type TripStopPayment = typeof tripStopPayments.$inferSelect;
export type InsertTripStopPayment = z.infer<typeof insertTripStopPaymentSchema>;
export type TripReturnRequest = typeof tripReturnRequests.$inferSelect;
export type InsertTripReturnRequest = z.infer<typeof insertTripReturnRequestSchema>;
export type TripReturnItem = typeof tripReturnItems.$inferSelect;
export type InsertTripReturnItem = z.infer<typeof insertTripReturnItemSchema>;

// === SITE SETTINGS (single row) ===
export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").default("Bachan Gas Service").notNull(),
  tagline: text("tagline"),
  logoUrl: text("logo_url"),
  showLogo: boolean("show_logo").default(true),
  showSiteName: boolean("show_site_name").default(true),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  email: text("email"),
  address: text("address"),
  workingHours: text("working_hours"),
  googleMapsEmbedUrl: text("google_maps_embed_url"),
  supportMessageTemplate: text("support_message_template"),
  homeVideoUrl: text("home_video_url"),
  homeVideoTitle: text("home_video_title"),
  showHomeVideo: boolean("show_home_video").default(true),
  ccavenueEnabled: boolean("ccavenue_enabled").default(false),
  ccavenueFeeEnabled: boolean("ccavenue_fee_enabled").default(true),
  ccavenueFeePercent: decimal("ccavenue_fee_percent").default("0.25"),
  ccavenueRoundingMode: text("ccavenue_rounding_mode").default("ROUND_2_DECIMALS"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({ id: true, updatedAt: true });
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;

// === CONTACT INQUIRIES ===
export const InquiryType = {
  DOMESTIC: 'Domestic',
  COMMERCIAL: 'Commercial',
  SAFETY_PARTS: 'Safety Parts',
  COMPLAINT: 'Complaint',
  OTHER: 'Other',
} as const;

export const InquiryStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
} as const;

export const contactInquiries = pgTable("contact_inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  inquiryType: text("inquiry_type").default(InquiryType.OTHER).notNull(),
  message: text("message").notNull(),
  status: text("status").default(InquiryStatus.NEW).notNull(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContactInquirySchema = createInsertSchema(contactInquiries).omit({ id: true, createdAt: true, ipAddress: true, status: true });
export type ContactInquiry = typeof contactInquiries.$inferSelect;
export type InsertContactInquiry = z.infer<typeof insertContactInquirySchema>;

// === PAYMENT TRANSACTIONS ===
export const PaymentGateway = {
  CCAVENUE: 'CCAVENUE',
  CASH: 'CASH',
  UPI: 'UPI',
  RTGS_CHEQUE: 'RTGS_CHEQUE',
} as const;

export const PaymentTransactionStatus = {
  INITIATED: 'INITIATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  gateway: text("gateway").notNull(),
  baseAmountPaise: integer("base_amount_paise").notNull(),
  convenienceFeeAmountPaise: integer("convenience_fee_amount_paise").default(0),
  totalAmountPaise: integer("total_amount_paise").notNull(),
  currency: text("currency").default("INR"),
  status: text("status").default(PaymentTransactionStatus.INITIATED).notNull(),
  merchantTxnId: text("merchant_txn_id").unique().notNull(),
  gatewayOrderId: text("gateway_order_id"),
  gatewayTrackingId: text("gateway_tracking_id"),
  bankRefNo: text("bank_ref_no"),
  requestPayloadJson: jsonb("request_payload_json"),
  responsePayloadJson: jsonb("response_payload_json"),
  feePercent: decimal("fee_percent"),
  roundingMode: text("rounding_mode"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({ id: true, createdAt: true, updatedAt: true });
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;

export type CreateOrderRequest = z.infer<typeof insertOrderSchema> & {
  items: { productId: number; quantity: number }[];
};

export interface DashboardStats {
  totalOrders: number;
  totalRevenuePaise: number;
  totalCustomers: number;
  totalProducts: number;
  activeOrders: number;
  openTickets: number;
  inventorySummary: { type: string; filled: number; empty: number }[];
  recentOrders: Order[];
  ordersByStatus: { status: string; count: number }[];
  directPayments: {
    total: number;
    totalAmountPaise: number;
    successCount: number;
    pendingCount: number;
  };
  recentPayments: {
    id: number;
    merchantTxnId: string;
    baseAmountPaise: number;
    convenienceFeeAmountPaise: number;
    totalAmountPaise: number;
    status: string;
    orderId: number | null;
    gatewayTrackingId: string | null;
    bankRefNo: string | null;
    createdAt: string | null;
    customerName?: string;
    customerPhone?: string;
  }[];
}

// === OTP RATE LIMITS ===
export const otpRateLimits = pgTable("otp_rate_limits", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  sendCount: integer("send_count").default(0).notNull(),
  verifyCount: integer("verify_count").default(0).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
});

export const insertOtpRateLimitSchema = createInsertSchema(otpRateLimits).omit({ id: true });
export type OtpRateLimit = typeof otpRateLimits.$inferSelect;

export const DEFAULT_PERMISSIONS = [
  { key: 'PRODUCT_VIEW', module: 'Products', description: 'View products' },
  { key: 'PRODUCT_CREATE', module: 'Products', description: 'Create products' },
  { key: 'PRODUCT_EDIT', module: 'Products', description: 'Edit products' },
  { key: 'PRODUCT_DELETE', module: 'Products', description: 'Delete products' },
  { key: 'ORDER_VIEW', module: 'Orders', description: 'View all orders' },
  { key: 'ORDER_CREATE', module: 'Orders', description: 'Create orders' },
  { key: 'ORDER_EDIT', module: 'Orders', description: 'Edit orders' },
  { key: 'ORDER_ASSIGN_DELIVERY', module: 'Orders', description: 'Assign delivery man to orders' },
  { key: 'ORDER_STATUS_UPDATE', module: 'Orders', description: 'Update order status' },
  { key: 'ORDER_CANCEL', module: 'Orders', description: 'Cancel orders' },
  { key: 'DELIVERY_VIEW_ASSIGNED_ONLY', module: 'Delivery', description: 'View only assigned deliveries' },
  { key: 'DELIVERY_UPDATE_STATUS', module: 'Delivery', description: 'Update delivery status' },
  { key: 'DELIVERY_VIEW_ALL', module: 'Delivery', description: 'View all deliveries' },
  { key: 'CUSTOMER_VIEW', module: 'Customers', description: 'View customers' },
  { key: 'CUSTOMER_CREATE', module: 'Customers', description: 'Create customers' },
  { key: 'CUSTOMER_EDIT', module: 'Customers', description: 'Edit customers' },
  { key: 'INVENTORY_VIEW', module: 'Inventory', description: 'View inventory' },
  { key: 'INVENTORY_EDIT', module: 'Inventory', description: 'Edit inventory' },
  { key: 'STOCK_MOVEMENT_VIEW', module: 'Inventory', description: 'View stock movements' },
  { key: 'STOCK_MOVEMENT_CREATE', module: 'Inventory', description: 'Create stock movements' },
  { key: 'PAYMENT_VIEW', module: 'Accounting', description: 'View payments' },
  { key: 'INVOICE_VIEW', module: 'Accounting', description: 'View invoices' },
  { key: 'REPORTS_VIEW', module: 'Accounting', description: 'View reports' },
  { key: 'STAFF_VIEW', module: 'Staff', description: 'View staff' },
  { key: 'STAFF_CREATE', module: 'Staff', description: 'Create staff' },
  { key: 'STAFF_EDIT', module: 'Staff', description: 'Edit staff' },
  { key: 'STAFF_DEACTIVATE', module: 'Staff', description: 'Deactivate staff' },
  { key: 'STAFF_CREATE_SAME_ROLE', module: 'Staff', description: 'Create users of same role' },
  { key: 'ROLE_CREATE', module: 'Roles', description: 'Create roles' },
  { key: 'ROLE_EDIT', module: 'Roles', description: 'Edit roles' },
  { key: 'ROLE_DELETE', module: 'Roles', description: 'Delete roles' },
  { key: 'PERMISSION_EDIT', module: 'Roles', description: 'Edit role permissions' },
  { key: 'PICKUP_REQUEST_CREATE', module: 'Delivery', description: 'Create pickup requests' },
  { key: 'PICKUP_APPROVE', module: 'Gate Keeper', description: 'Approve/reject pickup requests' },
  { key: 'TRIP_MANAGE', module: 'Delivery', description: 'Start/end delivery trips' },
  { key: 'RETURN_VERIFY', module: 'Gate Keeper', description: 'Verify godown returns' },
  { key: 'VEHICLE_VIEW', module: 'Vehicles', description: 'View vehicles' },
  { key: 'VEHICLE_MANAGE', module: 'Vehicles', description: 'Create/edit vehicles' },
  { key: 'GATE_PASS_VIEW', module: 'Gate Pass', description: 'View gate passes' },
  { key: 'GATE_PASS_CREATE', module: 'Gate Pass', description: 'Create gate passes' },
  { key: 'TICKET_VIEW', module: 'Tickets', description: 'View tickets' },
  { key: 'TICKET_CREATE', module: 'Tickets', description: 'Create tickets' },
  { key: 'TICKET_UPDATE', module: 'Tickets', description: 'Update tickets' },
  { key: 'STORE_VIEW', module: 'Stores', description: 'View stores' },
  { key: 'STORE_CREATE', module: 'Stores', description: 'Create stores' },
  { key: 'STORE_EDIT', module: 'Stores', description: 'Edit stores' },
  { key: 'SETTINGS_EDIT', module: 'Settings', description: 'Edit site settings' },
  { key: 'BILLING_VIEW', module: 'Billing', description: 'View billing' },
  { key: 'DASHBOARD_VIEW', module: 'Dashboard', description: 'View dashboard' },
];
