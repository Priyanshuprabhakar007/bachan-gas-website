-- Migration: Update Bachan Gas product catalogue and IOCL pricing (Migration 0004)

-- 1. Update Category 2 display name to Non Domestic
UPDATE categories SET name = 'Non Domestic' WHERE id = 2;

-- 2. Upsert Products using unique slug to ensure idempotency and preserve existing images & stock quantities
INSERT INTO products (name, slug, description, type, category_id, price, base_price_paise, weight, unit, stock_qty, in_stock, status, is_active)
VALUES 
  ('14.2Kg', 'domestic-14', 'Standard domestic LPG cylinder for household use', 'DOMESTIC_14', 1, '969.00', 96900, '14.2', 'KG', 450, 1, 'ACTIVE', 1),
  ('5Kg', 'domestic-5', 'Compact 5kg FTL cylinder for small households', 'DOMESTIC_5', 1, '359.50', 35950, '5', 'KG', 300, 1, 'ACTIVE', 1),
  ('10Kg Composite', 'domestic-10-composite', 'Lightweight composite LPG cylinder for modern households', 'DOMESTIC_10_COMPOSITE', 1, '692.00', 69200, '10', 'KG', 150, 1, 'ACTIVE', 1),
  ('5Kg Composite', 'domestic-5-composite', 'Lightweight 5kg composite LPG cylinder', 'DOMESTIC_5_COMPOSITE', 1, '359.50', 35950, '5', 'KG', 150, 1, 'ACTIVE', 1),
  ('19Kg', 'commercial-19', 'Commercial grade LPG cylinder for restaurants and businesses', 'COMMERCIAL_19', 2, '2830.00', 283000, '19', 'KG', 200, 1, 'ACTIVE', 1),
  ('5Kg FTL-New Connection', 'non-domestic-5-ftl-new', '5Kg FTL New Connection', 'NON_DOMESTIC_5_NEW', 2, '1907.00', 190700, '5', 'KG', 100, 1, 'ACTIVE', 1),
  ('5Kg FTL-Refill', 'non-domestic-5-ftl-refill', '5Kg FTL Refill', 'NON_DOMESTIC_5_REFILL', 2, '786.00', 78600, '5', 'KG', 150, 1, 'ACTIVE', 1),
  ('2Kg FTL POS-New Connection', 'non-domestic-2-ftl-pos-new', '2Kg FTL POS New Connection', 'NON_DOMESTIC_2_NEW', 2, '1035.50', 103550, '2', 'KG', 100, 1, 'ACTIVE', 1),
  ('2Kg FTL POS-Refill', 'non-domestic-2-ftl-pos-refill', '2Kg FTL POS Refill', 'NON_DOMESTIC_2_REFILL', 2, '327.50', 32750, '2', 'KG', 150, 1, 'ACTIVE', 1),
  ('47.5Kg', 'industrial-47', 'Large capacity cylinder for industrial applications', 'LARGE_47', 2, '7070.50', 707050, '47.5', 'KG', 80, 1, 'ACTIVE', 1),
  ('19Kg Nano Cut', 'commercial-19-nano-cut', '19Kg Nano Cut Commercial Cylinder', 'COMMERCIAL_19_NANOCUT', 2, '3007.00', 300700, '19', 'KG', 100, 1, 'ACTIVE', 1),
  ('19Kg XtraTeJ', 'commercial-19-xtratej', '19Kg XtraTeJ Commercial Cylinder', 'COMMERCIAL_19_XTRATEJ', 2, '2852.00', 285200, '19', 'KG', 100, 1, 'ACTIVE', 1),
  ('47.5Kg XtraTeJ', 'industrial-47-xtratej', '47.5Kg XtraTeJ Industrial Cylinder', 'LARGE_47_XTRATEJ', 2, '7126.50', 712650, '47.5', 'KG', 50, 1, 'ACTIVE', 1)
ON CONFLICT(slug) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  type = excluded.type,
  category_id = excluded.category_id,
  price = excluded.price,
  base_price_paise = excluded.base_price_paise,
  weight = excluded.weight,
  unit = excluded.unit,
  stock_qty = COALESCE(products.stock_qty, excluded.stock_qty),
  in_stock = excluded.in_stock,
  status = excluded.status,
  is_active = excluded.is_active,
  image_url = products.image_url,
  updated_at = CURRENT_TIMESTAMP;
