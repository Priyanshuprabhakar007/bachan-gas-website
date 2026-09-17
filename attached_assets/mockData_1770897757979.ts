
import { 
  User, UserRole, Customer, InventoryItem, CylinderType, 
  StockStatus, Order, OrderStatus, PaymentStatus, ServiceTicket, 
  PaymentMode, Store, WhatsAppMessageLog, 
  WaProvider, WaDirection, WaStatus, WaMessageType,
  GatePass, GatePassStatus, GatePassCollectionStatus
} from './types';

export const mockGatePasses: GatePass[] = [
  {
    id: 'gp-1',
    gatePassNo: 'GP-20260124-0001',
    date: new Date().toISOString(),
    status: GatePassStatus.OPEN,
    collectionStatus: GatePassCollectionStatus.NOT_SUBMITTED,
    deliveryManId: 'u2',
    deliveryManName: 'Rahul Kumar',
    vehicleNo: 'PB10GK6638',
    odometerStart: 12450,
    deliveriesCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stocks: [
      { id: 'gps-1', gatePassId: 'gp-1', cylinderType: CylinderType.COMMERCIAL_19, loadedFilledQty: 40, remainingFilledQty: 25, collectedEmptyQty: 15 },
      { id: 'gps-2', gatePassId: 'gp-1', cylinderType: CylinderType.LARGE_47, loadedFilledQty: 5, remainingFilledQty: 2, collectedEmptyQty: 3 }
    ]
  },
  {
    id: 'gp-2',
    gatePassNo: 'GP-20260123-0098',
    date: new Date(Date.now() - 86400000).toISOString(),
    status: GatePassStatus.RECONCILED,
    collectionStatus: GatePassCollectionStatus.RECONCILIATION_PENDING,
    deliveryManId: 'u2',
    deliveryManName: 'Rahul Kumar',
    vehicleNo: 'PB10GK6638',
    odometerStart: 12380,
    odometerEnd: 12450,
    deliveriesCount: 8,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 80000000).toISOString(),
    stocks: [
      { id: 'gps-3', gatePassId: 'gp-2', cylinderType: CylinderType.COMMERCIAL_19, loadedFilledQty: 100, remainingFilledQty: 0, collectedEmptyQty: 100, returnedFilledQty: 0 }
    ]
  }
];

export const mockWhatsAppLogs: WhatsAppMessageLog[] = [
  { id: 'wa1', provider: WaProvider.META, direction: WaDirection.OUTBOUND, toPhone: '+919876543210', messageType: WaMessageType.ORDER, templateKey: 'order_confirmed', textPreview: 'Your order BG-1001 is confirmed.', status: WaStatus.READ, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'wa2', provider: WaProvider.META, direction: WaDirection.OUTBOUND, toPhone: '+919876543210', messageType: WaMessageType.BALANCE, templateKey: 'balance_reminder', textPreview: 'Outstanding balance: ₹1,850', status: WaStatus.DELIVERED, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

export const mockUser: User = {
  id: 'u1',
  staffId: 'MGT-001',
  name: 'Bachan Admin',
  email: 'bachangas@gmail.com',
  role: UserRole.ADMIN,
  phone: '+91 9876543210'
};

export const mockStaffUser: User = {
  id: 'u2',
  staffId: 'STF-4920',
  name: 'Rahul Kumar',
  email: 'rahul@bachangas.com',
  role: UserRole.STAFF,
  phone: '+91 91234 56789'
};

export const mockGodownKeeperUser: User = {
  id: 'u5',
  staffId: 'GDK-7720',
  name: 'Harman Preet',
  email: 'harman@bachangas.com',
  role: UserRole.GODOWN_KEEPER,
  phone: '+91 98765 11223'
};

export const mockAccountantUser: User = {
  id: 'u4',
  staffId: 'ACT-2022',
  name: 'Suresh Mehta',
  email: 'suresh@bachangas.com',
  role: UserRole.ACCOUNTANT,
  phone: '+91 98888 77777'
};

export const mockCustomerUser: User = {
  id: 'u3',
  consumerId: 'CUS-492019',
  subscriptionNumber: 'SV-882019442031',
  name: 'Jaspreet Kaur',
  email: 'jaspreet@demo.com',
  role: UserRole.CUSTOMER,
  phone: '+91 98123 45678',
  coins: 450,
  referralCode: 'BACHAN-98123',
  addresses: [
    {
      id: 'addr1',
      label: 'Home',
      line1: 'House 42, Green Avenue',
      city: 'Ludhiana',
      state: 'Punjab',
      pincode: '141001',
      isDefault: true
    }
  ],
  inventoryBalances: [
    { 
      type: '14.2kg Domestic', 
      fullQty: 1, 
      emptyQty: 1, 
      securityFreeQty: 2, 
      normalHoldingQty: 2, 
      returnDueQty: 1, 
      accruedPenaltyPaise: 0, 
      holdingDays: 2, 
      isPenaltyActive: false 
    }
  ],
  totalCylindersTaken: 42,
  currentNetHolding: 2,
  lastRefillBookedDate: '2026-01-20',
  lastRefillReceivedDate: '2026-01-21'
};

export const mockStores: Store[] = [
  {
    id: 'st1',
    name: 'Bachan Gas Main Hub',
    slug: 'bachan-gas-main-hub',
    phone: '+91 98143 43443',
    whatsapp: '919814343443',
    email: 'hub@bachangas.com',
    addressLine: 'Village Bulara, Alamgir Road',
    city: 'Ludhiana',
    state: 'Punjab',
    pincode: '141116',
    isActive: true,
    openingHours: '08:00 AM - 08:00 PM',
    deliveryNotes: 'Serving Rural and Semi-Urban Ludhiana South.',
    coveragePincodes: ['141116', '141001', '141003', '141008']
  }
];

export const mockCustomers: Customer[] = [
  { id: 'c1', consumerId: 'CUS-100293', subscriptionNumber: 'SV-1002930012', name: 'John Doe', phone: '9988776655', address: '123 Street, Delhi', route: 'North Delhi', type: 'DOMESTIC', outstandingBalance: 500, totalTaken: 12, currentlyHeld: 1, lastRefillBookedDate: '2026-01-15', lastRefillReceivedDate: '2026-01-16' },
  { id: 'c2', consumerId: 'CUS-200941', subscriptionNumber: 'SV-2009419942', name: 'Elite Cuisines', phone: '8877665544', address: 'Sector 45, Gurgaon', route: 'Gurgaon-A', type: 'COMMERCIAL', outstandingBalance: 2500, totalTaken: 450, currentlyHeld: 12, lastRefillBookedDate: '2026-01-22', lastRefillReceivedDate: '2026-01-23' },
  { id: 'c3', consumerId: 'CUS-492019', subscriptionNumber: 'SV-882019442031', name: 'Jaspreet Kaur', phone: '7766554433', address: 'Green Avenue, Ludhiana', route: 'Ludhiana-South', type: 'DOMESTIC', outstandingBalance: 0, totalTaken: 42, currentlyHeld: 2, lastRefillBookedDate: '2026-01-20', lastRefillReceivedDate: '2026-01-21' },
  { id: 'c4', consumerId: 'CUS-881203', subscriptionNumber: 'SV-8812034451', name: 'Modern Industries', phone: '9911223344', address: 'Plot 42, Industrial Area', route: 'Industrial-B', type: 'COMMERCIAL', outstandingBalance: 15400, totalTaken: 1240, currentlyHeld: 48, lastRefillBookedDate: '2026-01-10', lastRefillReceivedDate: '2026-01-12' },
];

export const mockInventory: InventoryItem[] = [
  { id: 'i1', type: CylinderType.DOMESTIC_14, status: StockStatus.FILLED, quantity: 450, location: 'Main Warehouse' },
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-HP-1001',
    orderNumber: 'ORD-HP-1001',
    storeId: 'st1',
    userId: 'c1',
    customerName: 'John Doe',
    phone: '9988776655',
    addressLine: '123 Street, Delhi',
    city: 'Delhi',
    state: 'Delhi',
    pincode: '110001',
    subtotalPaise: 95300,
    totalPaise: 95300,
    paymentMode: PaymentMode.CASH,
    items: [{ 
      productId: 'p1',
      type: CylinderType.DOMESTIC_14, 
      qty: 1, 
      nameSnapshot: '14.2kg Domestic', 
      baseRatePaise: 95300,
      finalUnitPricePaise: 95300,
      lineTotalPaise: 95300
    }],
    status: OrderStatus.OUT_FOR_DELIVERY,
    orderStatus: OrderStatus.OUT_FOR_DELIVERY,
    totalAmount: 953,
    total: 953,
    paymentStatus: PaymentStatus.UNPAID,
    createdAt: new Date().toISOString(),
  }
];

export const mockTickets: ServiceTicket[] = [
  { id: 't1', customerId: 'c1', type: 'Leakage Alert', status: 'OPEN', priority: 'HIGH', description: 'Urgent: Gas smell reported in kitchen area.', createdAt: new Date().toISOString() },
];
