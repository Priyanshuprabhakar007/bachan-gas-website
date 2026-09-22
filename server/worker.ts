import { D1Storage } from "./d1Storage";
import { verifyOtp, sendOtp, getOtpServiceStatus } from "./otpService";
import { UserRole } from "../shared/schema";
import { encrypt as ccEncrypt, decrypt as ccDecrypt, computeConvenienceFee, generateMerchantTxnId, parseCallbackResponse } from "./ccavenue";

interface Env {
  DB: any;
  ASSETS: any;
  [key: string]: any;
}

async function getAuthenticatedUser(request: Request, env: Env, storage: D1Storage) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  try {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const session = await env.DB.prepare(
      "SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > datetime('now')"
    ).bind(tokenHash).first();

    if (!session) return null;

    const user = await storage.getUser(session.user_id);
    if (!user || !user.isActive) return null;
    return user;
  } catch (err) {
    console.error("[Auth Error]", err);
    return null;
  }
}

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  let allowedOrigin = origin;
  const frontendUrl = env?.FRONTEND_URL || "";
  if (frontendUrl && origin && origin !== frontendUrl) {
    if (
      origin.endsWith(".netlify.app") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("run.app") ||
      origin.includes("ai.studio")
    ) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = frontendUrl;
    }
  } else if (!origin) {
    allowedOrigin = frontendUrl || "*";
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin || origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  };
}

function jsonResponse(data: any, status = 200, request: Request, env: Env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...getCorsHeaders(request, env),
    },
  });
}

function errorResponse(message: string, status = 400, details?: any, request: Request, env: Env) {
  return jsonResponse({ message, ...(details ? { error: details } : {}) }, status, request, env);
}

export default {
  async fetch(request: Request, env: Env, _ctx: any): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
    }

    // Initialize D1 Storage for this request
    if (!env.DB) {
      return errorResponse("Cloudflare D1 Database binding 'DB' is missing", 500, undefined, request, env);
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
        }, 200, request, env);
      }

      // === MEDIA / ASSET SERVING FROM R2 ===
      if ((path.startsWith("/media/") || path.startsWith("/uploads/")) && method === "GET") {
        if (!env.ASSETS) {
          return errorResponse("R2 Bucket binding 'ASSETS' is not configured", 500, undefined, request, env);
        }
        const key = path.replace(/^\/(media|uploads)\//, "");
        const object = await env.ASSETS.get(key);

        if (!object) {
          return new Response("Asset not found", { status: 404, headers: getCorsHeaders(request, env) });
        }

        const headers = new Headers();
        const origin = request.headers.get("Origin") || "*";
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Access-Control-Allow-Credentials", "true");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
        headers.set("Content-Type", object.httpMetadata?.contentType || "image/png");

        return new Response(object.body, { headers });
      }

      // === R2 IMAGE UPLOAD ===
      if (path === "/api/admin/upload" && method === "POST") {
        if (!env.ASSETS) {
          return errorResponse("R2 Bucket binding 'ASSETS' is not configured", 500, undefined, request, env);
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
            return errorResponse("No file provided in form data", 400, undefined, request, env);
          }
          buffer = await file.arrayBuffer();
          mimeType = file.type || "image/png";
        } else {
          buffer = await request.arrayBuffer();
          mimeType = contentType || "image/png";
        }

        if (buffer.byteLength > 5 * 1024 * 1024) {
          return errorResponse("File size exceeds 5MB limit", 400, undefined, request, env);
        }

        const ext = mimeType.split("/")[1] || "png";
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const key = `${folder}/${filename}`;

        await env.ASSETS.put(key, buffer, {
          httpMetadata: { contentType: mimeType },
        });

        const publicUrl = `${new URL(request.url).origin}/media/${key}`;
        return jsonResponse({
          success: true,
          key,
          url: publicUrl,
        }, 201, request, env);
      }

      // === CATEGORIES ENDPOINTS ===
      if (path === "/api/categories" && method === "GET") {
        const categories = await storage.getCategoriesForHome();
        return jsonResponse(categories, 200, request, env);
      }

      if (path === "/api/admin/categories" && method === "GET") {
        const categories = await storage.getCategories();
        return jsonResponse(categories, 200, request, env);
      }

      if ((path === "/api/categories" || path === "/api/admin/categories") && method === "POST") {
        const body = await request.json();
        const category = await storage.createCategory(body);
        return jsonResponse(category, 201, request, env);
      }

      if (path.match(/^\/api\/(admin\/)?categories\/\d+$/) && (method === "PUT" || method === "PATCH")) {
        const id = Number(path.split("/").pop());
        const body = await request.json();
        const category = await storage.updateCategory(id, body);
        return jsonResponse(category, 200, request, env);
      }

      if (path.match(/^\/api\/(admin\/)?categories\/\d+$/) && method === "DELETE") {
        const id = Number(path.split("/").pop());
        await storage.deleteCategory(id);
        return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
      }

      // === PRODUCTS ENDPOINTS ===
      if (path === "/api/products" && method === "GET") {
        const products = await storage.getProducts();
        return jsonResponse(products, 200, request, env);
      }

      if (path.match(/^\/api\/products\/\d+$/) && method === "GET") {
        const id = Number(path.split("/").pop());
        const product = await storage.getProduct(id);
        if (!product) return errorResponse("Product not found", 404, undefined, request, env);
        return jsonResponse(product, 200, request, env);
      }

      if ((path === "/api/products" || path === "/api/admin/products") && method === "POST") {
        const body = await request.json();
        const product = await storage.createProduct(body);
        return jsonResponse(product, 201, request, env);
      }

      if (path.match(/^\/api\/(admin\/)?products\/\d+$/) && (method === "PUT" || method === "PATCH")) {
        const id = Number(path.split("/").pop());
        const body = await request.json();
        const product = await storage.updateProduct(id, body);
        return jsonResponse(product, 200, request, env);
      }

      if (path.match(/^\/api\/(admin\/)?products\/\d+$/) && method === "DELETE") {
        const id = Number(path.split("/").pop());
        await storage.deleteProduct(id);
        return new Response(null, { status: 204, headers: getCorsHeaders(request, env) });
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
        return jsonResponse(settings, 200, request, env);
      }

      if ((path === "/api/settings" || path === "/api/admin/settings") && (method === "POST" || method === "PATCH" || method === "PUT")) {
        const body = await request.json();
        const settings = await storage.upsertSiteSettings(body);
        return jsonResponse(settings, 200, request, env);
      }

      // === AUTHENTICATION & SESSIONS ===
      if (path === "/api/user" && method === "GET") {
        const user = await getAuthenticatedUser(request, env, storage);
        if (!user) {
          return errorResponse("Unauthorized", 401, undefined, request, env);
        }
        return jsonResponse({
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          staffId: user.staffId,
          consumerId: user.consumerId,
          customerType: user.customerType,
          address: user.address,
          route: user.route,
          outstandingBalance: user.outstandingBalance,
          isActive: user.isActive,
          avatarUrl: user.avatarUrl,
        }, 200, request, env);
      }

      if (path === "/api/logout" && method === "POST") {
        const authHeader = request.headers.get("Authorization") || "";
        const token = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (token) {
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
          const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash).run();
        }
        return jsonResponse({ success: true }, 200, request, env);
      }

      // === ADMIN / STAFF LOGIN ===
      if (path === "/api/login" && method === "POST") {
        const body = await request.json().catch(() => ({}));
        const inputUsername = (body.username || "").trim();
        const inputPassword = (body.password || "").trim();

        const adminUsername = env.ADMIN_USERNAME || "admin";
        const adminPassword = env.ADMIN_PASSWORD;

        if (!adminPassword) {
          return errorResponse("Admin login is not configured", 500, undefined, request, env);
        }

        if (inputUsername !== adminUsername || inputPassword !== adminPassword) {
          return errorResponse("Invalid username or password", 401, undefined, request, env);
        }

        const user = await storage.getUserByUsername(inputUsername);
        if (!user || user.isActive === false) {
          return errorResponse("Invalid username or password", 401, undefined, request, env);
        }

        const roleUpper = (user.role || "").toUpperCase();
        if (roleUpper === "CUSTOMER") {
          return errorResponse("Invalid username or password", 401, undefined, request, env);
        }

        // Generate session token (30 days)
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
        const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
        ).bind(user.id, tokenHash, expiresAt).run();

        return jsonResponse({
          success: true,
          authenticated: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            email: user.email,
            phone: user.phone,
          },
        }, 200, request, env);
      }

      // === OTP AUTHENTICATION & TWILIO VERIFY ===
      if (path === "/api/send-otp" && method === "POST") {
        const body = await request.json();
        const result = await sendOtp(body.phone, body.purpose || "login", env);
        return jsonResponse(result, 200, request, env);
      }

      if (path === "/api/verify-otp" && method === "POST") {
        const body = await request.json();
        const { phone, code } = body;
        const result = await verifyOtp(phone, code, env);

        if (!result.ok) {
          return jsonResponse({ success: false, message: result.message || "Invalid or expired verification code. Please request a new OTP." }, result.statusCode || 401, request, env);
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

        // Generate session token (30 days)
        const randomBytes = new Uint8Array(32);
        crypto.getRandomValues(randomBytes);
        const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
        const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)"
        ).bind(user.id, tokenHash, expiresAt).run();

        return jsonResponse({
          success: true,
          authenticated: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
          },
        }, 200, request, env);
      }

      // === CCAVENUE PAYMENT ROUTES ===
      if (path === "/api/payments/ccavenue/config" && method === "GET") {
        const configured = !!(
          env.CCAVENUE_MERCHANT_ID &&
          env.CCAVENUE_ACCESS_CODE &&
          env.CCAVENUE_WORKING_KEY
        );
        return jsonResponse({ configured }, 200, request, env);
      }

      if (path === "/api/payments/ccavenue/initiate" && method === "POST") {
        const user = await getAuthenticatedUser(request, env, storage);
        if (!user) return errorResponse("Unauthorized", 401, undefined, request, env);

        const body = await request.json().catch(() => ({}));
        const orderId = Number(body.orderId);
        if (isNaN(orderId) || orderId <= 0 || !Number.isInteger(orderId)) {
          return errorResponse("Invalid order ID", 400, undefined, request, env);
        }

        const order = await storage.getOrder(orderId);
        if (!order) {
          return errorResponse("Order not found", 404, undefined, request, env);
        }

        const settings = await storage.getSiteSettings();
        if (!settings?.ccavenueEnabled) {
          return errorResponse("CCAvenue payments are currently disabled", 400, undefined, request, env);
        }

        const merchantId = env.CCAVENUE_MERCHANT_ID;
        const accessCode = env.CCAVENUE_ACCESS_CODE;
        const workingKey = env.CCAVENUE_WORKING_KEY;

        if (!merchantId || !accessCode || !workingKey) {
          return errorResponse("CCAvenue is not configured. Please contact administrator.", 500, undefined, request, env);
        }

        const baseAmountPaise = Number(order.totalPaise || 0);
        if (baseAmountPaise <= 0) {
          return errorResponse("Invalid order amount", 400, undefined, request, env);
        }

        let convenienceFeeAmountPaise = 0;
        let totalAmountPaise = baseAmountPaise;
        const feePercent = parseFloat(settings.ccavenueFeePercent || "0.25");
        const roundingMode = settings.ccavenueRoundingMode || "ROUND_2_DECIMALS";

        if (settings.ccavenueFeeEnabled) {
          const feeResult = computeConvenienceFee(baseAmountPaise, feePercent, roundingMode);
          convenienceFeeAmountPaise = feeResult.convenienceFeeAmountPaise;
          totalAmountPaise = feeResult.totalAmountPaise;
        }

        const merchantTxnId = generateMerchantTxnId();
        const totalAmountRupees = (totalAmountPaise / 100).toFixed(2);

        const txn = await storage.createPaymentTransaction({
          orderId: order.id,
          gateway: "CCAVENUE",
          baseAmountPaise,
          convenienceFeeAmountPaise,
          totalAmountPaise,
          currency: "INR",
          status: "INITIATED",
          merchantTxnId,
          feePercent: feePercent.toString(),
          roundingMode,
          customerName: order.customerName || user.name || "Customer",
          customerPhone: order.phone || user.phone || "",
          userId: user.id,
        });

        const workerApiUrl = "https://bachan-gar-api.goyalaclasses.workers.dev";
        const redirectUrl = env.CCAVENUE_REDIRECT_URL || `${workerApiUrl}/api/payments/ccavenue/callback`;
        const cancelUrl = env.CCAVENUE_CANCEL_URL || redirectUrl;

        const resolvedName = order.customerName || user.name || "Customer";
        const resolvedPhone = order.phone || user.phone || "";
        const resolvedEmail = user.email || "";
        const resolvedAddress = order.deliveryAddress || user.address || "";

        const params = [
          `merchant_id=${merchantId}`,
          `order_id=${merchantTxnId}`,
          `currency=INR`,
          `amount=${totalAmountRupees}`,
          `redirect_url=${redirectUrl}`,
          `cancel_url=${cancelUrl}`,
          `language=EN`,
          `billing_name=${encodeURIComponent(resolvedName)}`,
          `billing_tel=${encodeURIComponent(resolvedPhone)}`,
          `billing_email=${encodeURIComponent(resolvedEmail)}`,
          `billing_address=${encodeURIComponent(resolvedAddress)}`,
          `billing_city=`,
          `billing_state=`,
          `billing_zip=`,
          `billing_country=India`,
          `merchant_param1=${order.id}`,
          `merchant_param2=${txn.id}`,
        ].join("&");

        const encRequest = ccEncrypt(params, workingKey);

        await storage.updatePaymentTransaction(txn.id, {
          requestPayloadJson: { params } as any,
        });

        const ccavenueBase = env.CCAVENUE_URL || "https://secure.ccavenue.com";
        const ccavenueUrl = `${ccavenueBase.replace(/\/$/, "")}/transaction/transaction.do?command=initiateTransaction`;

        const formHtml = `<form id="ccavenue_payment_form" method="post" action="${ccavenueUrl}">
          <input type="hidden" name="encRequest" value="${encRequest}" />
          <input type="hidden" name="access_code" value="${accessCode}" />
        </form>
        <script>document.getElementById("ccavenue_payment_form").submit();</script>`;

        return jsonResponse({
          transactionId: txn.id,
          merchantTxnId,
          baseAmountPaise,
          convenienceFeeAmountPaise,
          totalAmountPaise,
          formHtml,
        }, 200, request, env);
      }

      if (path === "/api/payments/ccavenue/direct" && method === "POST") {
        const user = await getAuthenticatedUser(request, env, storage);
        if (!user) return errorResponse("Unauthorized", 401, undefined, request, env);

        const settings = await storage.getSiteSettings();
        if (!settings?.ccavenueEnabled) {
          return errorResponse("CCAvenue payments are currently disabled", 400, undefined, request, env);
        }

        const merchantId = env.CCAVENUE_MERCHANT_ID;
        const accessCode = env.CCAVENUE_ACCESS_CODE;
        const workingKey = env.CCAVENUE_WORKING_KEY;

        if (!merchantId || !accessCode || !workingKey) {
          return errorResponse("CCAvenue is not configured. Please contact administrator.", 500, undefined, request, env);
        }

        const body = await request.json().catch(() => ({}));
        const amountRupees = Number(body.amountRupees);
        if (isNaN(amountRupees) || amountRupees < 1 || amountRupees > 500000) {
          return errorResponse("Invalid amount. Must be between 1 and 500000.", 400, undefined, request, env);
        }

        let currentUser = user;
        const isNameMissing = !currentUser.name || currentUser.name === "Customer";
        if (isNameMissing && body.customerName) {
          currentUser = await storage.updateUser(currentUser.id, { name: body.customerName });
        } else if (isNameMissing && !body.customerName) {
          return errorResponse("Please enter your name", 400, undefined, request, env);
        }

        const resolvedName = currentUser.name || body.customerName || "Customer";
        const resolvedPhone = currentUser.phone || "";

        const baseAmountPaise = Math.round(amountRupees * 100);
        let convenienceFeeAmountPaise = 0;
        let totalAmountPaise = baseAmountPaise;
        const feePercent = parseFloat(settings.ccavenueFeePercent || "0.25");
        const roundingMode = settings.ccavenueRoundingMode || "ROUND_2_DECIMALS";

        if (settings.ccavenueFeeEnabled) {
          const feeResult = computeConvenienceFee(baseAmountPaise, feePercent, roundingMode);
          convenienceFeeAmountPaise = feeResult.convenienceFeeAmountPaise;
          totalAmountPaise = feeResult.totalAmountPaise;
        }

        const merchantTxnId = generateMerchantTxnId();
        const totalAmountRupees = (totalAmountPaise / 100).toFixed(2);

        const txn = await storage.createPaymentTransaction({
          orderId: null,
          gateway: "CCAVENUE",
          baseAmountPaise,
          convenienceFeeAmountPaise,
          totalAmountPaise,
          currency: "INR",
          status: "INITIATED",
          merchantTxnId,
          feePercent: feePercent.toString(),
          roundingMode,
          customerName: resolvedName,
          customerPhone: resolvedPhone,
          userId: currentUser.id,
        });

        const workerApiUrl = "https://bachan-gar-api.goyalaclasses.workers.dev";
        const redirectUrl = env.CCAVENUE_REDIRECT_URL || `${workerApiUrl}/api/payments/ccavenue/callback`;
        const cancelUrl = env.CCAVENUE_CANCEL_URL || `${workerApiUrl}/api/payments/ccavenue/callback`;

        const params = [
          `merchant_id=${merchantId}`,
          `order_id=${merchantTxnId}`,
          `currency=INR`,
          `amount=${totalAmountRupees}`,
          `redirect_url=${redirectUrl}`,
          `cancel_url=${cancelUrl}`,
          `language=EN`,
          `billing_name=${encodeURIComponent(resolvedName)}`,
          `billing_tel=${encodeURIComponent(resolvedPhone)}`,
          `billing_email=${encodeURIComponent(currentUser.email || "")}`,
          `billing_address=${encodeURIComponent(currentUser.address || "")}`,
          `billing_city=`,
          `billing_state=`,
          `billing_zip=`,
          `billing_country=India`,
          `merchant_param1=direct_payment`,
          `merchant_param2=${txn.id}`,
          `merchant_param3=${encodeURIComponent(body.purpose || "Direct Payment")}`,
        ].join("&");

        const encRequest = ccEncrypt(params, workingKey);

        await storage.updatePaymentTransaction(txn.id, {
          requestPayloadJson: { params } as any,
        });

        const ccavenueBase = env.CCAVENUE_URL || "https://secure.ccavenue.com";
        const ccavenueUrl = `${ccavenueBase.replace(/\/$/, "")}/transaction/transaction.do?command=initiateTransaction`;
        
        const formHtml = `<form id="ccavenue_payment_form" method="post" action="${ccavenueUrl}">
          <input type="hidden" name="encRequest" value="${encRequest}" />
          <input type="hidden" name="access_code" value="${accessCode}" />
        </form>
        <script>document.getElementById("ccavenue_payment_form").submit();</script>`;

        return jsonResponse({
          transactionId: txn.id,
          merchantTxnId,
          baseAmountPaise,
          convenienceFeeAmountPaise,
          totalAmountPaise,
          formHtml,
        }, 200, request, env);
      }

      if (path === "/api/payments/ccavenue/callback") {
        let encResp = "";
        if (method === "POST") {
          const contentType = request.headers.get("content-type") || "";
          if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await request.formData();
            encResp = formData.get("encResp") as string || "";
          } else {
            const body = await request.json().catch(() => ({}));
            encResp = body.encResp || "";
          }
        } else if (method === "GET") {
          encResp = url.searchParams.get("encResp") || "";
        }

        const frontendUrl = (env.FRONTEND_URL || "").replace(/\/+$/, "");
        if (!encResp) {
          return Response.redirect(`${frontendUrl}/payment/failure?error=no_response`, 302);
        }

        const workingKey = env.CCAVENUE_WORKING_KEY;
        if (!workingKey) {
          return Response.redirect(`${frontendUrl}/payment/failure?error=config`, 302);
        }

        try {
          const responseParams = parseCallbackResponse(encResp, workingKey);
          const merchantTxnId = responseParams.order_id;
          const orderStatus = responseParams.order_status;
          const trackingId = responseParams.tracking_id;
          const bankRefNo = responseParams.bank_ref_no;
          const amount = responseParams.amount;

          const txn = await storage.getPaymentTransactionByMerchantTxnId(merchantTxnId);
          if (!txn) {
            return Response.redirect(`${frontendUrl}/payment/failure?error=txn_not_found`, 302);
          }

          if (orderStatus === "Success" && txn.status === "PAID") {
            return Response.redirect(`${frontendUrl}/payment/success?txnId=${txn.id}`, 302);
          }

          const receivedPaise = Math.round(parseFloat(amount || "0") * 100);
          if (receivedPaise !== txn.totalAmountPaise) {
            await storage.updatePaymentTransaction(txn.id, {
              status: "FAILED",
              responsePayloadJson: responseParams as any,
              gatewayTrackingId: trackingId,
              bankRefNo: bankRefNo || null,
            });
            return Response.redirect(`${frontendUrl}/payment/failure?txnId=${txn.id}&error=amount_mismatch`, 302);
          }

          if (orderStatus === "Success") {
            await storage.updatePaymentTransaction(txn.id, {
              status: "PAID",
              responsePayloadJson: responseParams as any,
              gatewayTrackingId: trackingId,
              bankRefNo: bankRefNo || null,
            });
            if (txn.orderId) {
              await storage.updateOrderStatus(txn.orderId, "CONFIRMED");
            }
            return Response.redirect(`${frontendUrl}/payment/success?txnId=${txn.id}`, 302);
          }

          await storage.updatePaymentTransaction(txn.id, {
            status: "FAILED",
            responsePayloadJson: responseParams as any,
            gatewayTrackingId: trackingId,
            bankRefNo: bankRefNo || null,
          });
          if (txn.orderId) {
            await storage.updateOrderStatus(txn.orderId, "PAYMENT_FAILED");
          }
          return Response.redirect(`${frontendUrl}/payment/failure?txnId=${txn.id}&reason=${encodeURIComponent(orderStatus || "Unknown")}`, 302);
        } catch (err: any) {
          console.error("[CCAvenue Callback Error]", err);
          return Response.redirect(`${frontendUrl}/payment/failure?error=decrypt_error`, 302);
        }
      }

      // === ORDERS ENDPOINTS ===
      if (path === "/api/orders" && method === "GET") {
        const orders = await storage.getOrders();
        return jsonResponse(orders, 200, request, env);
      }

      if (path.match(/^\/api\/orders\/\d+$/) && method === "GET") {
        const id = Number(path.split("/").pop());
        const order = await storage.getOrder(id);
        if (!order) return errorResponse("Order not found", 404, undefined, request, env);
        return jsonResponse(order, 200, request, env);
      }

      if (path === "/api/orders" && method === "POST") {
        const body = await request.json();
        const order = await storage.createOrder(body);
        return jsonResponse(order, 201, request, env);
      }

      // Unhandled route fallback
      return errorResponse(`Route '${method} ${path}' not found`, 404, undefined, request, env);
    } catch (err: any) {
      console.error("[Worker Error]", path, err);
      return errorResponse("Internal server error", 500, err.message || String(err), request, env);
    }
  },
};
