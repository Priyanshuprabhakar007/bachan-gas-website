-- SQLite / Cloudflare D1 Compatible Migration

PRAGMA foreign_keys = OFF;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  is_system INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  description TEXT
);

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  role_id INTEGER REFERENCES roles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  staff_id TEXT,
  consumer_id TEXT,
  customer_type TEXT,
  address TEXT,
  route TEXT,
  outstanding_balance INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  joining_date TEXT,
  notes TEXT,
  google_id TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Categories
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  icon_image_url TEXT,
  banner_image_url TEXT,
  show_on_home_tabs INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  price TEXT NOT NULL,
  base_price_paise INTEGER NOT NULL,
  weight TEXT,
  unit TEXT,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  in_stock INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'ACTIVE',
  is_active INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  sku TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. Stores
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  phone TEXT,
  email TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  opening_hours TEXT,
  delivery_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 9. Orders
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  store_id INTEGER REFERENCES stores(id),
  customer_name TEXT NOT NULL,
  phone TEXT,
  address_line TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  status TEXT DEFAULT 'NEW',
  total_amount TEXT,
  total_paise INTEGER,
  payment_status TEXT DEFAULT 'UNPAID',
  payment_mode TEXT DEFAULT 'CASH',
  delivery_man_id INTEGER REFERENCES users(id),
  assigned_at TEXT,
  delivered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  delivery_date TEXT
);

-- 10. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price TEXT NOT NULL,
  total_price TEXT NOT NULL
);

-- 11. Order Status Logs
CREATE TABLE IF NOT EXISTS order_status_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by_user_id INTEGER REFERENCES users(id),
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 12. Inventory
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  location TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 13. Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  type TEXT,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 14. Pickup Requests
CREATE TABLE IF NOT EXISTS pickup_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_man_id INTEGER NOT NULL REFERENCES users(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  gatekeeper_id INTEGER REFERENCES users(id),
  vehicle_checked INTEGER DEFAULT 0,
  safety_ok INTEGER DEFAULT 0,
  gatekeeper_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  decided_at TEXT
);

-- 15. Pickup Request Items
CREATE TABLE IF NOT EXISTS pickup_request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pickup_request_id INTEGER NOT NULL REFERENCES pickup_requests(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty_requested INTEGER NOT NULL,
  qty_approved INTEGER DEFAULT 0
);

-- 16. Trips
CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pickup_request_id INTEGER REFERENCES pickup_requests(id),
  delivery_man_id INTEGER NOT NULL REFERENCES users(id),
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  start_time TEXT,
  end_time TEXT,
  end_trip_summary_json TEXT,
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 17. Trip Inventory Issued
CREATE TABLE IF NOT EXISTS trip_inventory_issued (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty_issued INTEGER NOT NULL
);

-- 18. Trip Stops
CREATE TABLE IF NOT EXISTS trip_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id),
  customer_id INTEGER REFERENCES users(id),
  sequence INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  arrived_at TEXT,
  delivered_at TEXT
);

-- 19. Trip Stop Deliveries
CREATE TABLE IF NOT EXISTS trip_stop_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_stop_id INTEGER NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty_delivered INTEGER DEFAULT 0,
  qty_empties_returned INTEGER DEFAULT 0,
  empty_due INTEGER DEFAULT 0
);

-- 20. Trip Stop Payments
CREATE TABLE IF NOT EXISTS trip_stop_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_stop_id INTEGER NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount TEXT NOT NULL,
  status TEXT DEFAULT 'PAID',
  reference_no TEXT,
  bank_name TEXT
);

-- 21. Trip Return Requests
CREATE TABLE IF NOT EXISTS trip_return_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFY',
  submitted_by_delivery_man_id INTEGER NOT NULL REFERENCES users(id),
  verified_by_gatekeeper_id INTEGER REFERENCES users(id),
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
  verified_at TEXT,
  delivery_man_note TEXT,
  gatekeeper_note TEXT
);

-- 22. Trip Return Items
CREATE TABLE IF NOT EXISTS trip_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trip_return_request_id INTEGER NOT NULL REFERENCES trip_return_requests(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  qty_full_returned INTEGER DEFAULT 0,
  qty_empty_returned INTEGER DEFAULT 0,
  qty_damaged INTEGER DEFAULT 0
);

-- 23. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  trip_id INTEGER REFERENCES trips(id),
  pickup_request_id INTEGER REFERENCES pickup_requests(id),
  trip_return_request_id INTEGER REFERENCES trip_return_requests(id),
  note TEXT,
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 24. Gate Passes
CREATE TABLE IF NOT EXISTS gate_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gate_pass_no TEXT NOT NULL UNIQUE,
  delivery_man_id INTEGER REFERENCES users(id),
  delivery_man_name TEXT,
  vehicle_no TEXT,
  status TEXT DEFAULT 'OPEN',
  odometer_start INTEGER,
  odometer_end INTEGER,
  deliveries_count INTEGER DEFAULT 0,
  date TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 25. Payments
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  user_id INTEGER REFERENCES users(id),
  amount TEXT NOT NULL,
  base_amount TEXT NOT NULL,
  gateway_fee TEXT DEFAULT '0',
  currency TEXT DEFAULT 'INR',
  gateway TEXT DEFAULT 'CCAVENUE',
  status TEXT DEFAULT 'PENDING',
  tracking_id TEXT,
  bank_reference TEXT,
  payment_mode TEXT,
  failure_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 26. Service Tickets
CREATE TABLE IF NOT EXISTS service_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  customer_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN',
  priority TEXT DEFAULT 'MEDIUM',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 27. Site Settings
CREATE TABLE IF NOT EXISTS site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_name TEXT NOT NULL DEFAULT 'Bachan Gas Service',
  tagline TEXT,
  logo_url TEXT,
  show_logo INTEGER NOT NULL DEFAULT 1,
  show_site_name INTEGER NOT NULL DEFAULT 1,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  working_hours TEXT,
  google_maps_embed_url TEXT,
  support_message_template TEXT,
  home_video_url TEXT,
  home_video_title TEXT,
  show_home_video INTEGER NOT NULL DEFAULT 0,
  ccavenue_enabled INTEGER NOT NULL DEFAULT 0,
  ccavenue_fee_enabled INTEGER NOT NULL DEFAULT 1,
  ccavenue_fee_percent TEXT DEFAULT '0.25',
  ccavenue_rounding_mode TEXT DEFAULT 'ROUND_2_DECIMALS',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 28. Contact Inquiries
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  inquiry_type TEXT NOT NULL DEFAULT 'Other',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 29. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  gateway TEXT NOT NULL,
  base_amount_paise INTEGER NOT NULL,
  convenience_fee_amount_paise INTEGER NOT NULL DEFAULT 0,
  total_amount_paise INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'INITIATED',
  merchant_txn_id TEXT NOT NULL UNIQUE,
  gateway_order_id TEXT,
  gateway_tracking_id TEXT,
  bank_ref_no TEXT,
  request_payload_json TEXT,
  response_payload_json TEXT,
  fee_percent TEXT,
  rounding_mode TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 30. OTP Rate Limits
CREATE TABLE IF NOT EXISTS otp_rate_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone TEXT NOT NULL UNIQUE,
  send_count INTEGER NOT NULL DEFAULT 0,
  verify_count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payment_txns_merchant_txn ON payment_transactions(merchant_txn_id);

PRAGMA foreign_keys = ON;
