import type { 
  User, InsertUser, Product, InsertProduct, Order, 
  Store, InsertStore, Inventory, InsertInventory, 
  GatePass, InsertGatePass, ServiceTicket, InsertServiceTicket,
  CreateOrderRequest, DashboardStats,
  Role, InsertRole, Permission, InsertPermission,
  RolePermission, InsertRolePermission,
  OrderStatusLog, InsertOrderStatusLog,
  StockMovement, InsertStockMovement,
  Category, InsertCategory,
  Vehicle, InsertVehicle,
  PickupRequest, InsertPickupRequest,
  PickupRequestItem, InsertPickupRequestItem,
  Trip, InsertTrip,
  TripInventoryIssuedRow, InsertTripInventoryIssued,
  TripStop, InsertTripStop,
  TripStopDelivery, InsertTripStopDelivery,
  TripStopPayment, InsertTripStopPayment,
  TripReturnRequest, InsertTripReturnRequest,
  TripReturnItem, InsertTripReturnItem,
  ProductImage, InsertProductImage,
  SiteSettings, InsertSiteSettings,
  ContactInquiry, InsertContactInquiry,
  PaymentTransaction, InsertPaymentTransaction
} from "@shared/schema";

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
