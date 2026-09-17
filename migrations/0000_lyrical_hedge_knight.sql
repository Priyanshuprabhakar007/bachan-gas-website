CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text,
	"icon_image_url" text,
	"banner_image_url" text,
	"show_on_home_tabs" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"inquiry_type" text DEFAULT 'Other' NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gate_passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"gate_pass_no" text NOT NULL,
	"delivery_man_id" integer,
	"delivery_man_name" text,
	"vehicle_no" text,
	"status" text DEFAULT 'OPEN',
	"odometer_start" integer,
	"odometer_end" integer,
	"deliveries_count" integer DEFAULT 0,
	"date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "gate_passes_gate_pass_no_unique" UNIQUE("gate_pass_no")
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"quantity" integer DEFAULT 0,
	"location" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric NOT NULL,
	"total_price" numeric NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"status" text NOT NULL,
	"changed_by_user_id" integer,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_number" text NOT NULL,
	"user_id" integer,
	"store_id" integer,
	"customer_name" text NOT NULL,
	"phone" text,
	"address_line" text,
	"city" text,
	"state" text,
	"pincode" text,
	"status" text DEFAULT 'NEW',
	"total_amount" numeric,
	"total_paise" integer,
	"payment_status" text DEFAULT 'UNPAID',
	"payment_mode" text DEFAULT 'CASH',
	"delivery_man_id" integer,
	"assigned_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"delivery_date" timestamp,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "otp_rate_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"send_count" integer DEFAULT 0 NOT NULL,
	"verify_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "otp_rate_limits_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"gateway" text NOT NULL,
	"base_amount_paise" integer NOT NULL,
	"convenience_fee_amount_paise" integer DEFAULT 0,
	"total_amount_paise" integer NOT NULL,
	"currency" text DEFAULT 'INR',
	"status" text DEFAULT 'INITIATED' NOT NULL,
	"merchant_txn_id" text NOT NULL,
	"gateway_order_id" text,
	"gateway_tracking_id" text,
	"bank_ref_no" text,
	"request_payload_json" jsonb,
	"response_payload_json" jsonb,
	"fee_percent" numeric,
	"rounding_mode" text,
	"customer_name" text,
	"customer_phone" text,
	"user_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_transactions_merchant_txn_id_unique" UNIQUE("merchant_txn_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"module" text NOT NULL,
	"description" text,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "pickup_request_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pickup_request_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_requested" integer NOT NULL,
	"qty_approved" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "pickup_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_man_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"gatekeeper_id" integer,
	"vehicle_checked" boolean DEFAULT false,
	"safety_ok" boolean DEFAULT false,
	"gatekeeper_note" text,
	"created_at" timestamp DEFAULT now(),
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"image_url" text NOT NULL,
	"storage_key" text,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"category_id" integer,
	"price" numeric NOT NULL,
	"base_price_paise" integer NOT NULL,
	"weight" text,
	"unit" text,
	"stock_qty" integer DEFAULT 0,
	"in_stock" boolean DEFAULT true,
	"status" text DEFAULT 'ACTIVE',
	"is_active" boolean DEFAULT true,
	"image_url" text,
	"sku" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name"),
	CONSTRAINT "roles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "service_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"customer_name" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'OPEN',
	"priority" text DEFAULT 'MEDIUM',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'Bachan Gas Service' NOT NULL,
	"tagline" text,
	"logo_url" text,
	"show_logo" boolean DEFAULT true,
	"show_site_name" boolean DEFAULT true,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"address" text,
	"working_hours" text,
	"google_maps_embed_url" text,
	"support_message_template" text,
	"home_video_url" text,
	"home_video_title" text,
	"show_home_video" boolean DEFAULT true,
	"ccavenue_enabled" boolean DEFAULT false,
	"ccavenue_fee_enabled" boolean DEFAULT true,
	"ccavenue_fee_percent" numeric DEFAULT '0.25',
	"ccavenue_rounding_mode" text DEFAULT 'ROUND_2_DECIMALS',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"product_id" integer,
	"quantity" integer NOT NULL,
	"trip_id" integer,
	"pickup_request_id" integer,
	"trip_return_request_id" integer,
	"note" text,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"phone" text,
	"email" text,
	"address_line" text,
	"city" text,
	"state" text,
	"pincode" text,
	"is_active" boolean DEFAULT true,
	"opening_hours" text,
	"delivery_notes" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "stores_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "trip_inventory_issued" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_issued" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_return_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_return_request_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_full_returned" integer DEFAULT 0,
	"qty_empty_returned" integer DEFAULT 0,
	"qty_damaged" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "trip_return_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"status" text DEFAULT 'PENDING_VERIFY' NOT NULL,
	"submitted_by_delivery_man_id" integer NOT NULL,
	"verified_by_gatekeeper_id" integer,
	"submitted_at" timestamp DEFAULT now(),
	"verified_at" timestamp,
	"delivery_man_note" text,
	"gatekeeper_note" text
);
--> statement-breakpoint
CREATE TABLE "trip_stop_deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_stop_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"qty_delivered" integer DEFAULT 0,
	"qty_empties_returned" integer DEFAULT 0,
	"empty_due" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "trip_stop_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_stop_id" integer NOT NULL,
	"method" text NOT NULL,
	"amount" numeric NOT NULL,
	"status" text DEFAULT 'PAID',
	"reference_no" text,
	"bank_name" text
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"trip_id" integer NOT NULL,
	"order_id" integer,
	"customer_id" integer,
	"sequence" integer DEFAULT 0,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"arrived_at" timestamp,
	"delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" serial PRIMARY KEY NOT NULL,
	"pickup_request_id" integer,
	"delivery_man_id" integer NOT NULL,
	"vehicle_id" integer NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"end_trip_summary_json" jsonb,
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'CUSTOMER' NOT NULL,
	"role_id" integer,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"staff_id" text,
	"consumer_id" text,
	"customer_type" text,
	"address" text,
	"route" text,
	"outstanding_balance" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"joining_date" timestamp,
	"notes" text,
	"google_id" text,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" text NOT NULL,
	"type" text,
	"owner_name" text NOT NULL,
	"owner_phone" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicles_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_delivery_man_id_users_id_fk" FOREIGN KEY ("delivery_man_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_logs" ADD CONSTRAINT "order_status_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_man_id_users_id_fk" FOREIGN KEY ("delivery_man_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_request_items" ADD CONSTRAINT "pickup_request_items_pickup_request_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_request_items" ADD CONSTRAINT "pickup_request_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_delivery_man_id_users_id_fk" FOREIGN KEY ("delivery_man_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_gatekeeper_id_users_id_fk" FOREIGN KEY ("gatekeeper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pickup_request_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_trip_return_request_id_trip_return_requests_id_fk" FOREIGN KEY ("trip_return_request_id") REFERENCES "public"."trip_return_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_inventory_issued" ADD CONSTRAINT "trip_inventory_issued_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_inventory_issued" ADD CONSTRAINT "trip_inventory_issued_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_return_items" ADD CONSTRAINT "trip_return_items_trip_return_request_id_trip_return_requests_id_fk" FOREIGN KEY ("trip_return_request_id") REFERENCES "public"."trip_return_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_return_items" ADD CONSTRAINT "trip_return_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_return_requests" ADD CONSTRAINT "trip_return_requests_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_return_requests" ADD CONSTRAINT "trip_return_requests_submitted_by_delivery_man_id_users_id_fk" FOREIGN KEY ("submitted_by_delivery_man_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_return_requests" ADD CONSTRAINT "trip_return_requests_verified_by_gatekeeper_id_users_id_fk" FOREIGN KEY ("verified_by_gatekeeper_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stop_deliveries" ADD CONSTRAINT "trip_stop_deliveries_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stop_deliveries" ADD CONSTRAINT "trip_stop_deliveries_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stop_payments" ADD CONSTRAINT "trip_stop_payments_trip_stop_id_trip_stops_id_fk" FOREIGN KEY ("trip_stop_id") REFERENCES "public"."trip_stops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_pickup_request_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_delivery_man_id_users_id_fk" FOREIGN KEY ("delivery_man_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;