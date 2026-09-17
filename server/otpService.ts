import twilio from "twilio";
import { randomInt, timingSafeEqual } from "crypto";

export interface StoredOtp {
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
  purpose: string;
  createdAt: number;
}

export interface SendOtpResult {
  ok: boolean;
  message: string;
  channel: "sms" | "dev" | "verify";
  devOtp?: string;
}

export interface VerifyOtpResult {
  ok: boolean;
  message?: string;
  statusCode?: number;
}

// In-memory store for generated OTPs when using Twilio SMS or Dev mode
const otpStore = new Map<string, StoredOtp>();

// Rate limits: phone -> { sendCount, verifyCount, windowStart }
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SEND_PER_WINDOW = 4;
const MAX_VERIFY_PER_WINDOW = 6;
const otpLimits = new Map<string, { sendCount: number; verifyCount: number; windowStart: number }>();

// Cleanup expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (now > val.expiresAt) {
      otpStore.delete(key);
    }
  }
  for (const [phone, limit] of otpLimits.entries()) {
    if (now - limit.windowStart > RATE_LIMIT_WINDOW_MS) {
      otpLimits.delete(phone);
    }
  }
}, 5 * 60 * 1000);

/**
 * Checks if a credential string is empty or contains known placeholder text
 */
export function isPlaceholderCredential(val?: string | null): boolean {
  if (!val) return true;
  const cleaned = val.trim();
  if (cleaned.length === 0) return true;
  // Patterns like ACxxxx... or SKxxxx... or xxxx...
  if (/^([a-zA-Z]{2})?x+$/i.test(cleaned)) return true;
  if (
    cleaned.toLowerCase().includes("replace-with") ||
    cleaned.toLowerCase().includes("your_") ||
    cleaned.toLowerCase().includes("your-") ||
    cleaned.toLowerCase().includes("placeholder") ||
    cleaned.toLowerCase().includes("example") ||
    cleaned.toLowerCase().includes("dummy")
  ) {
    return true;
  }
  // Twilio Account SID must start with AC and be followed by 32 hex chars
  if (cleaned.startsWith("AC") && !/^AC[0-9a-fA-F]{32}$/.test(cleaned)) {
    return true;
  }
  // Twilio API Key must start with SK and be followed by 32 hex chars
  if (cleaned.startsWith("SK") && !/^SK[0-9a-fA-F]{32}$/.test(cleaned)) {
    return true;
  }
  // Twilio Verify SID must start with VA and be followed by 32 hex chars
  if (cleaned.startsWith("VA") && !/^VA[0-9a-fA-F]{32}$/.test(cleaned)) {
    return true;
  }
  return false;
}

/**
 * Lazy Twilio client initialization to prevent server startup crashes
 * if credentials are unset or invalid.
 */
let cachedTwilioClient: twilio.Twilio | null = null;
let lastClientKey = "";

export function getTwilioClient(): twilio.Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();

  if (!accountSid || isPlaceholderCredential(accountSid)) {
    return null;
  }

  const currentKey = `${accountSid}:${authToken || ""}:${apiKey || ""}:${apiSecret || ""}`;
  if (cachedTwilioClient && lastClientKey === currentKey) {
    return cachedTwilioClient;
  }

  try {
    if (authToken && !isPlaceholderCredential(authToken)) {
      cachedTwilioClient = twilio(accountSid, authToken);
      lastClientKey = currentKey;
      return cachedTwilioClient;
    } else if (apiKey && apiSecret && !isPlaceholderCredential(apiKey) && !isPlaceholderCredential(apiSecret)) {
      cachedTwilioClient = twilio(apiKey, apiSecret, { accountSid });
      lastClientKey = currentKey;
      return cachedTwilioClient;
    }
  } catch (err) {
    console.error("Failed to initialize Twilio client:", err);
    return null;
  }

  return null;
}

export function getOtpServiceStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();

  const validAccount = !isPlaceholderCredential(accountSid);
  const validAuthToken = !isPlaceholderCredential(authToken);
  const validApiKey = !isPlaceholderCredential(apiKey) && !isPlaceholderCredential(apiSecret);
  const hasRealCredentials = Boolean(validAccount && (validAuthToken || validApiKey));
  const isVerify = Boolean(hasRealCredentials && !isPlaceholderCredential(verifySid));
  const isSms = Boolean(hasRealCredentials && (phoneNumber || !isPlaceholderCredential(messagingServiceSid)));

  let mode: "verify" | "sms" | "dev" = "dev";
  if (isVerify) mode = "verify";
  else if (isSms) mode = "sms";

  return {
    configured: hasRealCredentials,
    mode,
    provider: hasRealCredentials ? "Twilio" : "Twilio (Development Mode)",
    hasAccountSid: validAccount,
    hasAuthToken: validAuthToken,
    hasApiKey: validApiKey,
    hasVerifyService: !isPlaceholderCredential(verifySid),
    hasPhoneNumber: Boolean(phoneNumber || messagingServiceSid),
    fromNumber: phoneNumber ? `${phoneNumber.slice(0, 4)}...${phoneNumber.slice(-3)}` : undefined,
  };
}

/**
 * Normalizes input phone to standard E.164 (+<country_code><digits>)
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    const digits = cleaned.replace(/\D/g, "");
    // If 10 digits (typical for India without country code), default to +91
    if (digits.length === 10) {
      cleaned = `+91${digits}`;
    } else {
      cleaned = `+${digits}`;
    }
  }
  return cleaned;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP
 */
export function generateNumericOtp(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return randomInt(min, max + 1).toString();
}

/**
 * Checks rate limits for a given phone number
 */
function checkRateLimit(phone: string, action: "send" | "verify"): { allowed: boolean; message?: string } {
  const now = Date.now();
  const record = otpLimits.get(phone);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    otpLimits.set(phone, {
      sendCount: action === "send" ? 1 : 0,
      verifyCount: action === "verify" ? 1 : 0,
      windowStart: now,
    });
    return { allowed: true };
  }

  if (action === "send") {
    if (record.sendCount >= MAX_SEND_PER_WINDOW) {
      return {
        allowed: false,
        message: "Too many OTP requests. Please wait a few minutes before trying again.",
      };
    }
    record.sendCount += 1;
  } else {
    if (record.verifyCount >= MAX_VERIFY_PER_WINDOW) {
      return {
        allowed: false,
        message: "Too many failed attempts. Please request a new OTP.",
      };
    }
    record.verifyCount += 1;
  }

  return { allowed: true };
}

/**
 * Sends an OTP to the given phone number using Twilio Verify, Twilio SMS, or Dev fallback
 */
export async function sendOtp(rawPhone: string, purpose: string = "login"): Promise<SendOtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{10,15}$/.test(phone)) {
    throw new Error("Invalid phone number format. Please provide a valid number with country code (e.g. +919876543210)");
  }

  const rateLimit = checkRateLimit(phone, "send");
  if (!rateLimit.allowed) {
    const err: any = new Error(rateLimit.message);
    err.statusCode = 429;
    throw err;
  }

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  const client = getTwilioClient();

  let twilioAuthFailed = false;

  // Mode 1: Twilio Verify Service
  if (client && verifySid && !isPlaceholderCredential(verifySid)) {
    try {
      console.log(`[Twilio OTP] Sending Verify OTP to ${phone} via service ${verifySid.substring(0, 6)}...`);
      await client.verify.v2.services(verifySid).verifications.create({
        to: phone,
        channel: "sms",
      });
      return {
        ok: true,
        message: "OTP sent to your phone via SMS",
        channel: "verify",
      };
    } catch (twilioErr: any) {
      console.error("[Twilio Verify Error]", {
        code: twilioErr?.code,
        message: twilioErr?.message,
        status: twilioErr?.status,
      });

      if (twilioErr?.code === 70051 || twilioErr?.status === 401 || twilioErr?.code === 20003) {
        console.warn("[Twilio Verify] Twilio authentication failed. In development/sandbox, falling back to local OTP generation.");
        twilioAuthFailed = true;
      } else if (twilioErr?.code === 20404) {
        console.warn("[Twilio Verify] Twilio Verify Service SID not found. Falling back to local OTP generation.");
        twilioAuthFailed = true;
      } else if (twilioErr?.code === 60203) {
        const err: any = new Error("Max delivery attempts reached for this phone number. Please try again later.");
        err.statusCode = 429;
        throw err;
      } else if (twilioErr?.code === 60200) {
        const err: any = new Error("Invalid phone number format for SMS delivery.");
        err.statusCode = 400;
        throw err;
      } else {
        console.warn("[Twilio Verify] Encountered error:", twilioErr?.message, "- falling back to local OTP generation.");
        twilioAuthFailed = true;
      }
    }
  }

  // Generate 6-digit OTP for SMS or Dev mode
  const otp = generateNumericOtp(6);
  const now = Date.now();
  const ttlMs = client && !twilioAuthFailed ? 5 * 60 * 1000 : 10 * 60 * 1000;

  otpStore.set(phone, {
    phone,
    code: otp,
    expiresAt: now + ttlMs,
    attempts: 0,
    purpose,
    createdAt: now,
  });

  // Mode 2: Twilio Programmable SMS with In-App OTP Generation
  if (client && !twilioAuthFailed && (phoneNumber || !isPlaceholderCredential(messagingServiceSid))) {
    try {
      console.log(`[Twilio OTP] Sending generated OTP to ${phone} via Twilio Programmable SMS...`);
      const messagePayload: any = {
        to: phone,
        body: `Your Bachan Gas verification code is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
      };

      if (messagingServiceSid && !isPlaceholderCredential(messagingServiceSid)) {
        messagePayload.messagingServiceSid = messagingServiceSid;
      } else if (phoneNumber) {
        messagePayload.from = phoneNumber;
      }

      await client.messages.create(messagePayload);
      return {
        ok: true,
        message: "OTP sent to your phone via SMS",
        channel: "sms",
      };
    } catch (smsErr: any) {
      console.error("[Twilio SMS Error]", smsErr);
      if (smsErr?.code === 21608) {
        throw new Error("Trial Twilio Account: destination number is unverified. Verify this number in Twilio console or upgrade.");
      }
      if (smsErr?.code === 20003 || smsErr?.status === 401 || smsErr?.code === 70051 || smsErr?.code === 20404) {
        console.warn("[Twilio SMS] Twilio authentication failed (Error 20003). Falling back to local OTP generation.");
        // Fall through to Mode 3
      } else {
        console.warn("[Twilio SMS] Dispatch failed, falling back to development OTP:", smsErr?.message);
        // Fall through to Mode 3
      }
    }
  }

  // Mode 3: Development / Sandbox Fallback (if Twilio credentials are not set or failed authentication)
  console.log(`\n========================================`);
  console.log(`[TWILIO OTP - DEV/SANDBOX MODE]`);
  console.log(`Recipient Phone : ${phone}`);
  console.log(`Generated OTP   : ${otp}`);
  console.log(`Expires In      : 10 minutes`);
  console.log(`========================================\n`);

  return {
    ok: true,
    message: "OTP generated successfully (Development / Preview Mode)",
    channel: "dev",
    devOtp: otp,
  };
}

/**
 * Verifies an OTP code for a given phone number
 */
export async function verifyOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);
  const cleanedCode = code.trim();

  if (!/^\+\d{10,15}$/.test(phone)) {
    return { ok: false, statusCode: 400, message: "Invalid phone number format" };
  }
  if (!/^\d{6}$/.test(cleanedCode)) {
    return { ok: false, statusCode: 400, message: "Invalid OTP code. Please enter the 6-digit code." };
  }

  const rateLimit = checkRateLimit(phone, "verify");
  if (!rateLimit.allowed) {
    return { ok: false, statusCode: 429, message: rateLimit.message };
  }

  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  const client = getTwilioClient();

  // Mode 1: Twilio Verify Service
  if (client && verifySid && !isPlaceholderCredential(verifySid)) {
    try {
      const check = await client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to: phone,
          code: cleanedCode,
        });

      if (check.status === "approved") {
        return { ok: true };
      }
      return { ok: false, statusCode: 401, message: "Incorrect OTP code. Please check and try again." };
    } catch (verifyErr: any) {
      console.error("[Twilio Verify Check Error]", verifyErr);
      if (otpStore.has(phone)) {
        console.log("[Twilio Verify] Checking in-app generated OTP store as fallback...");
      } else {
        if (verifyErr?.code === 60202) {
          return { ok: false, statusCode: 429, message: "Max check attempts reached. Please request a new OTP." };
        }
        if (verifyErr?.code === 20404) {
          return { ok: false, statusCode: 404, message: "Verification session expired. Please request a new OTP." };
        }
        if (verifyErr?.code === 70051 || verifyErr?.status === 401 || verifyErr?.code === 20003) {
          return { ok: false, statusCode: 401, message: "Invalid or expired OTP code. Please request a new OTP." };
        }
        return { ok: false, statusCode: 400, message: verifyErr?.message || "Verification check failed" };
      }
    }
  }

  // Mode 2 & 3: Stored In-App Generated OTP
  const stored = otpStore.get(phone);
  if (!stored) {
    return {
      ok: false,
      statusCode: 404,
      message: "No active OTP found for this number or it has expired. Please request a new code.",
    };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone);
    return {
      ok: false,
      statusCode: 410,
      message: "This OTP has expired. Please request a fresh verification code.",
    };
  }

  if (stored.attempts >= 5) {
    otpStore.delete(phone);
    return {
      ok: false,
      statusCode: 429,
      message: "Too many incorrect attempts. For security, please request a new OTP.",
    };
  }

  // Timing-safe comparison to prevent timing attacks
  const inputBuf = Buffer.from(cleanedCode);
  const storedBuf = Buffer.from(stored.code);

  const isMatch = inputBuf.length === storedBuf.length && timingSafeEqual(inputBuf, storedBuf);

  if (!isMatch) {
    stored.attempts += 1;
    const remaining = 5 - stored.attempts;
    return {
      ok: false,
      statusCode: 401,
      message: `Incorrect OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new code."}`,
    };
  }

  // Successful verification - clear OTP from memory
  otpStore.delete(phone);
  return { ok: true };
}
