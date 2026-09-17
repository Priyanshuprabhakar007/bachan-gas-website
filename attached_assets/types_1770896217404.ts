export enum UserRole {
  ADMIN = 'ADMIN',
  SUBADMIN = 'SUBADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  ACCOUNTANT = 'ACCOUNTANT',
  GODOWN_KEEPER = 'GODOWN_KEEPER',
  CUSTOMER = 'CUSTOMER'
}

export enum CustomerType {
  DOMESTIC = 'DOMESTIC',
  COMMERCIAL = 'COMMERCIAL'
}

export enum DiscountType {
  NONE = 'NONE',
  PERCENT = 'PERCENT',
  FLAT = 'FLAT'
}

export enum OrderStatus {
  NEW = 'NEW',
  CONFIRMED = 'CONFIRMED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  ARRIVED = 'ARRIVED',
  SERVICE_STARTED = 'SERVICE_STARTED',
  CHALLAN_GENERATED = 'CHALLAN_GENERATED',
  AWAITING_ACCEPTANCE = 'AWAITING_ACCEPTANCE',
  ACCEPTED = 'ACCEPTED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum DeliveryPaymentMode {
  CASH = 'CASH',
  PAYTM = 'PAYTM',
  RTGS = 'RTGS',
  ONLINE = 'ONLINE',
  CCAVENUE = 'CCAVENUE',
  CREDIT = 'CREDIT'
}

export enum CylinderType {
  DOMESTIC_14 = 'DOMESTIC_14',
  DOMESTIC = 'DOMESTIC',
  COMPOSITE = 'COMPOSITE',
  COMMERCIAL_19 = 'COMMERCIAL_19',
  COMMERCIAL = 'COMMERCIAL',
  LARGE_47 = 'LARGE_47',
  JUMBO = 'JUMBO'
}

export enum StockStatus {
  FILLED = 'FILLED',
  EMPTY = 'EMPTY',
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK'
}

export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  PENDING = 'PENDING'
}

export enum PaymentMode {
  CASH = 'CASH',
  ONLINE = 'ONLINE',
  BANK = 'BANK',
  UPI = 'UPI',
  CCAVENUE = 'CCAVENUE',
  PAYTM = 'PAYTM'
}

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED'
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  HIDDEN = 'HIDDEN'
}

export enum GalleryCategory {
  INSTALLATIONS = 'INSTALLATIONS',
  SAFETY_TRAINING = 'SAFETY_TRAINING',
  OFFICE_WAREHOUSE = 'OFFICE_WAREHOUSE',
  CUSTOMER_SERVICE = 'CUSTOMER_SERVICE',
  EVENTS = 'EVENTS'
}

export enum WaProvider {
  META = 'META',
  TWILIO = 'TWILIO'
}

export enum WaDirection {
  OUTBOUND = 'OUTBOUND',
  INBOUND = 'INBOUND'
}

export enum WaStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export enum WaMessageType {
  ORDER = 'ORDER',
  BALANCE = 'BALANCE',
  OTP = 'OTP',
  TEXT = 'TEXT',
  PAYMENT = 'PAYMENT',
  REMINDER = 'REMINDER',
  TEMPLATE = 'TEMPLATE'
}

export enum GatePassStatus {
  OPEN = 'OPEN',
  RECONCILED = 'RECONCILED',
  CLOSED = 'CLOSED'
}

export enum GatePassCollectionStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  RECONCILIATION_PENDING = 'RECONCILIATION_PENDING',
  READY_TO_CLOSE = 'READY_TO_CLOSE',
  CLOSED = 'CLOSED'
}

export enum LedgerEntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

export enum ContactStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  SPAM = 'SPAM'
}

export enum RateSettingMode {
  FIXED_RATE = 'FIXED_RATE',
  DISCOUNT_ON_BASE = 'DISCOUNT_ON_BASE'
}

export interface HelpVideo {
  id: string;
  pageId: string; 
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  description?: string;
  createdAt: string;
}

export interface InventoryBalance {
  type: string;
  fullQty: number;          
  emptyQty: number;         
  securityFreeQty: number;
  normalHoldingQty: number;
  returnDueQty: number;
  accruedPenaltyPaise: number;
  holdingDays: number;
  isPenaltyActive: boolean;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  name?: string;
  phone?: string;
}

export interface User {
  id: string;
  consumerId?: string; 
  staffId?: string; 
  subscriptionNumber?: string; 
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  customerType?: CustomerType;
  coins?: number;
  referralCode?: string;
  isSecurityExempt?: boolean;
  inventoryBalances?: InventoryBalance[];
  addresses?: Address[];
  permissions?: string[];
  defaultTermDays?: number;
  isActive?: boolean;
  totalCylindersTaken?: number;
  currentNetHolding?: number;
  lastRefillBookedDate?: string; 
  lastRefillReceivedDate?: string; 
  openingBalancePaise?: number;
  creditLimitPaise?: number;
}

export interface OrderItem {
  productId?: string;
  nameSnapshot: string;
  qty: number;
  baseRatePaise: number;
  finalUnitPricePaise: number;
  lineTotalPaise: number;
  type?: string;
}

export interface CylinderSettlement {
  cylinderType: string;
  deliveredQty: number;
  returnedQty: number;
  shortfallQty: number;
  securityFreeQty: number;
  isSecurityFree: boolean;
  securityAmountPaise: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  status: OrderStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  deliveredAt?: string;
  arrivalAt?: string;
  serviceStartAt?: string;
  items: OrderItem[];
  total: number;
  totalPaise: number;
  subtotalPaise: number;
  securityDepositPaise?: number;
  settlements?: CylinderSettlement[];
  waitingMinutes?: number;
  returnShortfall?: number;
  emptiesReturnedQty?: number;
  supplyDeliveredQty?: number;
  storeId?: string;
  totalAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  paymentLines?: any[];
  userId?: string;
  returnShortfallQty?: number;
  dueDate?: Date;
  duePaise?: number;
  discountAmountPaise?: number;
  discountTotalPaise?: number;
  invoice?: any;
}

export interface Customer {
  id: string;
  consumerId?: string; 
  subscriptionNumber?: string; 
  name: string;
  phone: string;
  address: string;
  route: string;
  type: string;
  outstandingBalance: number;
  defaultTermDays?: number;
  totalTaken?: number;
  currentlyHeld?: number;
  lastRefillBookedDate?: string; 
  lastRefillReceivedDate?: string; 
}

export interface InventoryItem {
  id: string;
  type: CylinderType;
  status?: StockStatus;
  quantity?: number;
  location: string;
  filledQty?: number;
  emptyQty?: number;
  inTransitQty?: number;
  customerHoldingQty?: number;
  productName?: string;
  productId?: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  thumbUrl: string;
  isPrimary: boolean;
  sortOrder: number;
  altText?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  type: CylinderType;
  price: number;
  basePricePaise: number;
  defaultDiscountType: DiscountType;
  defaultDiscountValue: number;
  gstPercent: number;
  stockQty: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  categoryName: string;
  imageUrl: string;
  description: string;
  isNew?: boolean;
  images?: ProductImage[];
}

export interface WhatsAppMessageLog {
  id: string;
  provider: WaProvider;
  direction: WaDirection;
  toPhone: string;
  messageType: WaMessageType;
  templateKey?: string;
  textPreview: string;
  status: WaStatus;
  error?: string;
  createdAt: string;
}

export interface GatePassStock {
  id: string;
  gatePassId: string;
  cylinderType: CylinderType | string;
  loadedFilledQty: number;
  remainingFilledQty: number;
  collectedEmptyQty: number;
  returnedFilledQty?: number;
}

export interface GatePass {
  id: string;
  gatePassNo: string;
  date: string;
  status: GatePassStatus;
  collectionStatus: GatePassCollectionStatus;
  deliveryManId: string;
  deliveryManName: string;
  vehicleNo: string;
  odometerStart?: number;
  odometerEnd?: number;
  deliveriesCount?: number;
  createdAt: string;
  updatedAt: string;
  stocks: GatePassStock[];
  expectedCashPaise?: number;
  expectedPaytmPaise?: number;
  expectedRtgsPaise?: number;
  expectedCcavenuePaise?: number;
  expectedCreditPaise?: number;
  submittedCashPaise?: number;
  submittedPaytmPaise?: number;
  submittedRtgsPaise?: number;
  submittedCcavenuePaise?: number;
  varianceCashPaise?: number;
  variancePaytmPaise?: number;
  varianceRtgsPaise?: number;
  varianceCcavenuePaise?: number;
  handoverNote?: string;
  adminApprovalNote?: string;
  adminApprovedAt?: string;
}

export interface ServiceTicket {
  id: string;
  customerId: string;
  type: string;
  status: string;
  priority: string;
  description: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  isActive: boolean;
  openingHours: string;
  deliveryNotes: string;
  coveragePincodes: string[];
}

export interface GalleryImage {
  id: string;
  category: GalleryCategory;
  imageUrl: string;
  thumbUrl: string;
  caption: string;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
  pricePaise?: number;
  tier?: string;
}

export interface PermissionDefinition {
  key: string;
  label: string;
  module: string;
}

export interface CreditDashboard {
  balancePaise: number;
  balanceLabel: string;
  creditLimitPaise: number;
  availableCreditPaise: number | null;
  overdueInvoicesCount: number;
  overdueAmountPaise: number;
  oldestOverdueDays: number;
  aging: {
    current: number;
    days7: number;
    days15: number;
    days30: number;
    daysOver30: number;
  };
  recentInvoices: any[];
}

export interface LedgerEntry {
  id: string;
  userId: string;
  entryType: LedgerEntryType;
  source: string;
  amountPaise: number;
  entryDate: string;
  runningBalancePaise?: number;
  description: string;
}

export interface CustomerPricing {
  id: string;
  userId: string;
  productId: string;
  negotiatedBasePricePaise?: number;
  discountType: DiscountType;
  discountValue: number;
  gstPercentOverride?: number;
}

export interface ContactRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: ContactStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}
