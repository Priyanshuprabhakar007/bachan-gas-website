import { D1Storage } from "./d1Storage";
import { verifyOtp, sendOtp, getOtpServiceStatus } from "./otpService";
import { UserRole } from "../shared/schema";

interface Env {
  DB: any;
  ASSETS: any;
  [key: string]: any;
}

// CORS headers for API requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400, details?: any) {
  return jsonResponse({ message, ...(details ? { error: details } : {}) }, status);
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Initialize D1 Storage for this request
    if (!env.DB) {
      return errorResponse("Cloudflare D1 Database binding 'DB' is missing", 500);
    }

    const storage = new D1Storage(env.DB);

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // === HEALTH CHECK ===
      if (path === "/api/health" && method === "GET") {
        let d1Ok = false;
        try {
          const testRes = await env.DB.prepare("SELECT 1 as ok").first();
          d1Ok = !!testRes;
        } catch (e) {
          d1Ok = false;
        }

        const r2Ok = !!env.ASSETS;
        const twilioOk = getOtpServiceStatus(env).configured;
        const ccavenueOk = !!(
          env.CCAVENUE_MERCHANT_ID &&
          env.CCAVENUE_ACCESS_CODE &&
          env.CCAVENUE_WORKING_KEY
        );

        return jsonResponse({
          api: true,
          d1: d1Ok,
          r2: r2Ok,
          twilioConfigured: twilioOk,
          ccavenueConfigured: ccavenueOk,
        });
      }

      // === MEDIA / ASSET SERVING FROM R2 ===
      if ((path.startsWith("/media/") || path.startsWith("/uploads/")) && method === "GET") {
        if (!env.ASSETS) {
          return errorResponse("R2 Bucket binding 'ASSETS' is not configured", 500);
        }
        const key = path.replace(/^\/(media|uploads)\//, "");
        const object = await env.ASSETS.get(key);

        if (!object) {
          return new Response("Asset not found", { status: 404, headers: corsHeaders });
        }

        const headers = new Headers();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");

        return new Response(object.body, { headers });
      }

      // === R2 IMAGE UPLOAD ===
      if (path === "/api/admin/upload" && method === "POST") {
        if (!env.ASSETS) {
          return errorResponse("R2 Bucket binding 'ASSETS' is not configured", 500);
        }

        const contentType = request.headers.get("content-type") || "";
        let buffer: ArrayBuffer;
        let mimeType = "image/png";
        let folder = "uploads";

        const prefixParam = url.searchParams.get("prefix") || "products";
        if (["products", "categories", "site", "logos"].includes(prefixParam)) {
          folder = prefixParam;
        }

        if (contentType.includes("multipart/form-data")) {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          if (!file) {
            return errorResponse("No file provided in form data");
          }
          buffer = await file.arrayBuffer();
          mimeType = file.type || "image/png";
        } else {
          buffer = await request.arrayBuffer();
          mimeType = contentType || "image/png";
        }

        if (buffer.byteLength > 5 * 1024 * 1024) {
          return errorResponse("File size exceeds 5MB limit");
        }

        const ext = mimeType.split("/")[1] || "png";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const key = `${folder}/${filename}`;

        await env.ASSETS.put(key, buffer, {
          httpMetadata: { contentType: mimeType },
        });

        const publicUrl = `/media/${key}`;
        return jsonResponse({
          success: true,
          key,
          url: publicUrl,
        }, 201);
      }

      // === CATEGORIES ENDPOINTS ===
      if (path === "/api/categories" && method === "GET") {
        const categories = await storage.getCategoriesForHome();
        return jsonResponse(categories);
      }

      if (path === "/api/admin/categories" && method === "GET") {
        const categories = await storage.getCategories();
        return jsonResponse(categories);
      }

      if ((path === "/api/categories" || path === "/api/admin/categories") && method === "POST") {
        const body = await request.json();
        const category = await storage.createCategory(body);
        return jsonResponse(category, 201);
      }

      if (path.match(/^\/api\/(admin\/)?categories\/\d+$/) && (method === "PUT" || method === "PATCH")) {
        const id = Number(path.split("/").pop());
        const body = await request.json();
        const category = await storage.updateCategory(id, body);
        return jsonResponse(category);
      }

      if (path.match(/^\/api\/(admin\/)?categories\/\d+$/) && method === "DELETE") {
        const id = Number(path.split("/").pop());
        await storage.deleteCategory(id);
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // === PRODUCTS ENDPOINTS ===
      if (path === "/api/products" && method === "GET") {
        const products = await storage.getProducts();
        return jsonResponse(products);
      }

      if (path.match(/^\/api\/products\/\d+$/) && method === "GET") {
        const id = Number(path.split("/").pop());
        const product = await storage.getProduct(id);
        if (!product) return errorResponse("Product not found", 404);
        return jsonResponse(product);
      }

      if ((path === "/api/products" || path === "/api/admin/products") && method === "POST") {
        const body = await request.json();
        const product = await storage.createProduct(body);
        return jsonResponse(product, 201);
      }

      if (path.match(/^\/api\/(admin\/)?products\/\d+$/) && (method === "PUT" || method === "PATCH")) {
        const id = Number(path.split("/").pop());
        const body = await request.json();
        const product = await storage.updateProduct(id, body);
        return jsonResponse(product);
      }

      if (path.match(/^\/api\/(admin\/)?products\/\d+$/) && method === "DELETE") {
        const id = Number(path.split("/").pop());
        await storage.deleteProduct(id);
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // === SETTINGS ENDPOINTS ===
      if ((path === "/api/settings" || path === "/api/payment/settings") && method === "GET") {
        let settings = await storage.getSiteSettings();
        if (!settings) {
          settings = {
            id: 1,
            siteName: "Bachan Gas Service",
            tagline: "Reliable LPG Gas Distribution",
            showLogo: true,
            showSiteName: true,
            phone: "+91 98143 43443",
            whatsapp: "+919814343443",
            email: "info@bachangas.com",
            address: "Village Bulara, Alamgir Road, Ludhiana, Punjab - 141116",
            workingHours: "Mon - Sat: 8:00 AM - 8:00 PM",
            ccavenueEnabled: true,
            ccavenueFeeEnabled: true,
            ccavenueFeePercent: "0.25",
            ccavenueRoundingMode: "ROUND_2_DECIMALS",
          } as any;
        }
        return jsonResponse(settings);
      }

      if ((path === "/api/settings" || path === "/api/admin/settings") && (method === "POST" || method === "PATCH" || method === "PUT")) {
        const body = await request.json();
        const settings = await storage.upsertSiteSettings(body);
        return jsonResponse(settings);
      }

      // === OTP AUTHENTICATION & TWILIO VERIFY ===
      if (path === "/api/send-otp" && method === "POST") {
        const body = await request.json();
        const result = await sendOtp(body.phone, body.purpose || "login", env);
        return jsonResponse(result);
      }

      if (path === "/api/verify-otp" && method === "POST") {
        const body = await request.json();
        const { phone, code } = body;
        const result = await verifyOtp(phone, code, env);

        if (!result.ok) {
          return jsonResponse({ success: false, message: result.message || "OTP verification failed" }, result.statusCode || 401);
        }

        // Retrieve or create customer in D1 database upon successful verification
        let user = await storage.getUserByPhone(phone);
        if (!user) {
          const custRole = await storage.getRoleBySlug("customer");
          user = await storage.createUser({
            username: `cust_${phone.replace(/\D/g, "")}`,
            password: "",
            name: `Customer ${phone.slice(-4)}`,
            phone,
            role: UserRole.CUSTOMER,
            roleId: custRole?.id,
            isActive: true,
          });
        }

        return jsonResponse({
          success: true,
          message: "OTP verified successfully",
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
          },
        });
      }

      // === ORDERS ENDPOINTS ===
      if (path === "/api/orders" && method === "GET") {
        const orders = await storage.getOrders();
        return jsonResponse(orders);
      }

      if (path.match(/^\/api\/orders\/\d+$/) && method === "GET") {
        const id = Number(path.split("/").pop());
        const order = await storage.getOrder(id);
        if (!order) return errorResponse("Order not found", 404);
        return jsonResponse(order);
      }

      if (path === "/api/orders" && method === "POST") {
        const body = await request.json();
        const order = await storage.createOrder(body);
        return jsonResponse(order, 201);
      }

      // Unhandled route fallback
      return errorResponse(`Route '${method} ${path}' not found`, 404);
    } catch (err: any) {
      console.error("[Worker Error]", path, err);
      return errorResponse("Internal server error", 500, err.message || String(err));
    }
  },
};
