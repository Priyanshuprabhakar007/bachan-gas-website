-- Seed Data Migration for Bachan Gas Service D1 Database

-- Seed Roles
INSERT OR IGNORE INTO roles (id, name, slug, is_system, is_active) VALUES
(1, 'Super Admin', 'super_admin', 1, 1),
(2, 'Admin', 'admin', 1, 1),
(3, 'Delivery Man', 'delivery_man', 0, 1),
(4, 'Gate Keeper', 'gate_keeper', 0, 1),
(5, 'Accountant', 'accountant', 0, 1),
(6, 'Customer', 'customer', 1, 1),
(7, 'Staff', 'staff', 0, 1),
(8, 'Manager', 'manager', 0, 1);

-- Seed Permissions
INSERT OR IGNORE INTO permissions (id, key, module, description) VALUES
(1, 'DELIVERY_VIEW_ASSIGNED_ONLY', 'Delivery', 'View assigned deliveries'),
(2, 'DELIVERY_UPDATE_STATUS', 'Delivery', 'Update delivery status'),
(3, 'ORDER_VIEW', 'Orders', 'View orders'),
(4, 'ORDER_STATUS_UPDATE', 'Orders', 'Update order status'),
(5, 'PICKUP_REQUEST_CREATE', 'Delivery', 'Create pickup requests'),
(6, 'TRIP_MANAGE', 'Delivery', 'Start/end delivery trips'),
(7, 'VEHICLE_VIEW', 'Vehicles', 'View vehicles'),
(8, 'GATE_PASS_VIEW', 'Gate Pass', 'View gate passes'),
(9, 'GATE_PASS_CREATE', 'Gate Pass', 'Create gate pass'),
(10, 'STOCK_MOVEMENT_VIEW', 'Inventory', 'View stock movements'),
(11, 'STOCK_MOVEMENT_CREATE', 'Inventory', 'Create stock movement'),
(12, 'INVENTORY_VIEW', 'Inventory', 'View inventory'),
(13, 'PICKUP_APPROVE', 'Gate Keeper', 'Approve/reject pickup requests'),
(14, 'RETURN_VERIFY', 'Gate Keeper', 'Verify godown returns'),
(15, 'PAYMENT_VIEW', 'Payments', 'View payment records'),
(16, 'INVOICE_VIEW', 'Billing', 'View invoices'),
(17, 'REPORTS_VIEW', 'Reports', 'View reports'),
(18, 'BILLING_VIEW', 'Billing', 'View billing'),
(19, 'PRODUCT_CREATE', 'Products', 'Create products'),
(20, 'PRODUCT_EDIT', 'Products', 'Edit products'),
(21, 'PRODUCT_DELETE', 'Products', 'Delete products');

-- Seed Categories
INSERT OR IGNORE INTO categories (id, name, slug, icon, show_on_home_tabs, sort_order, is_active) VALUES
(1, 'Domestic', 'domestic', '🏠', 1, 0, 1),
(2, 'Commercial', 'commercial', '🏢', 1, 1, 1),
(3, 'Safety Parts', 'safety-parts', '🛡️', 1, 2, 1);

-- Seed Products
INSERT OR IGNORE INTO products (id, name, slug, description, type, category_id, price, base_price_paise, weight, unit, stock_qty, in_stock, status, is_active) VALUES
(1, '14.2KG Domestic Refill', 'domestic-14', 'Standard domestic LPG cylinder for household use', 'DOMESTIC_14', 1, '953', 95300, '14.2', 'KG', 450, 1, 'ACTIVE', 1),
(2, '5KG FTL Domestic', 'domestic-5', 'Compact 5kg FTL cylinder for small households', 'DOMESTIC_5', 1, '550', 55000, '5', 'KG', 300, 1, 'ACTIVE', 1),
(3, '19KG Commercial Refill', 'commercial-19', 'Commercial grade LPG cylinder for restaurants and businesses', 'COMMERCIAL_19', 2, '1850', 185000, '19', 'KG', 200, 1, 'ACTIVE', 1),
(4, '47.5KG Industrial Refill', 'industrial-47', 'Large capacity cylinder for industrial applications', 'LARGE_47', 2, '3900', 390000, '47.5', 'KG', 80, 1, 'ACTIVE', 1),
(5, 'Suraksha LPG Hose Pipe', 'hose-pipe', 'ISI certified LPG hose pipe for safe gas connection', 'SAFETY', 3, '350', 35000, NULL, NULL, 150, 1, 'ACTIVE', 1),
(6, 'HP Gas Regulator', 'gas-regulator', 'Standard LPG regulator with safety valve', 'SAFETY', 3, '250', 25000, NULL, NULL, 100, 1, 'ACTIVE', 1),
(7, 'Gas Lighter', 'gas-lighter', 'Long reach electric gas lighter for safe ignition', 'SAFETY', 3, '120', 12000, NULL, NULL, 200, 1, 'ACTIVE', 1);

-- Seed Site Settings
INSERT OR IGNORE INTO site_settings (id, site_name, tagline, show_logo, show_site_name, phone, whatsapp, email, address, working_hours, ccavenue_enabled, ccavenue_fee_enabled, ccavenue_fee_percent, ccavenue_rounding_mode) VALUES
(1, 'Bachan Gas Service', 'Reliable LPG Gas Distribution', 1, 1, '+91 98143 43443', '+919814343443', 'info@bachangas.com', 'Village Bulara, Alamgir Road, Ludhiana, Punjab - 141116', 'Mon - Sat: 8:00 AM - 8:00 PM', 1, 1, '0.25', 'ROUND_2_DECIMALS');

-- Seed Stores
INSERT OR IGNORE INTO stores (id, name, slug, phone, email, address_line, city, state, pincode, is_active, opening_hours, delivery_notes) VALUES
(1, 'Bachan Gas Main Hub', 'bachan-gas-main-hub', '+91 98143 43443', 'hub@bachangas.com', 'Village Bulara, Alamgir Road', 'Ludhiana', 'Punjab', '141116', 1, '08:00 AM - 08:00 PM', 'Serving Rural and Semi-Urban Ludhiana South.');

-- Seed Admin User
INSERT OR IGNORE INTO users (id, username, password, role, role_id, name, email, phone) VALUES
(1, 'admin', '$2b$10$R9h/2ip40m2f26m.0uKx..E8u2e/n2R.w2Zp0/b4k.G2s.', 'ADMIN', 2, 'Bachan Admin', 'admin@bachangas.com', '+91 9876543210');
