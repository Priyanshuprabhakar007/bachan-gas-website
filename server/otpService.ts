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
  // Twilio Account SID must start with AC and be followed by 32 alphanumeric chars
  if (cleaned.startsWith("AC") && !/^AC[0-9a-zA-Z]{32}$/.test(cleaned)) {
    return true;
  }
  // Twilio API Key must start with SK and be followed by 32 alphanumeric chars
  if (cleaned.startsWith("SK") && !/^SK[0-9a-zA-Z]{32}$/.test(cleaned)) {
    return true;
  }
  // Twilio Verify SID must start with VA and be followed by 32 alphanumeric chars
  if (cleaned.startsWith("VA") && !/^VA[0-9a-zA-Z]{32}$/.test(cleaned)) {
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

export function getOtpServiceStatus() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const validAccount = !isPlaceholderCredential(accountSid);
  const validAuthToken = !isPlaceholderCredential(authToken);
  const validVerifySid = !isPlaceholderCredential(verifySid);
  const hasRealCredentials = Boolean(validAccount && validAuthToken && validVerifySid);

  return {
    configured: hasRealCredentials,
    mode: "verify",
    provider: "Twilio Verify",
    hasAccountSid: validAccount,
    hasAuthToken: validAuthToken,
    hasVerifyService: validVerifySid,
  };
}

/**
 * Normalizes input phone to standard E.164 (+<country_code><digits>)
 */
export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.trim().replace(/[^\d+]/g, "");
  
  // If it already starts with +, return it directly
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  const digits = cleaned.replace(/\D/g, "");
  
  // 10 digits -> Indian number without country code, prefix with +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  // 12 digits starting with 91 -> Indian number with country code but no +, prefix with +
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  
  // For other lengths/cases, prefix with +
  return `+${digits}`;
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

  // Check environment context
  const isNetlify = process.env.NETLIFY === "true" || process.env.LAMBDA_TASK_ROOT !== undefined || process.env.NODE_ENV === "production";

  // Validate environment variables strictly
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const missingCreds = !accountSid || isPlaceholderCredential(accountSid) ||
                        !authToken || isPlaceholderCredential(authToken) ||
                        !verifySid || isPlaceholderCredential(verifySid);

  if (missingCreds) {
    if (isNetlify) {
      // In production/deployment, strictly require credentials and fail
      throw new Error("Missing or invalid TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID environment variable in your Netlify settings.");
    }

    // In local development / preview sandbox, gracefully fallback to local mock OTP generation so testing works
    console.warn("[Twilio OTP] Twilio credentials not configured in development. Falling back to local mock OTP.");
    const otp = generateNumericOtp(6);
    const now = Date.now();
    otpStore.set(phone, {
      phone,
      code: otp,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes
      attempts: 0,
      purpose,
      createdAt: now,
    });

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

  // Log configuration status safely (do not log the secret values)
  console.log("TWILIO_ACCOUNT_SID configured: true");
  console.log("TWILIO_AUTH_TOKEN configured: true");
  console.log("TWILIO_VERIFY_SERVICE_SID configured: true");

  console.log(`[Twilio OTP] Sending Verify OTP to ${phone} via service ${verifySid!.substring(0, 6)}...`);

  try {
    const client = twilio(accountSid, authToken);
    await client.verify.v2.services(verifySid!).verifications.create({
      to: phone,
      channel: "sms",
    });

    return {
      ok: true,
      message: "OTP sent to your phone via SMS",
      channel: "verify",
    };
  } catch (error: any) {
    console.error("Twilio OTP Error", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    // Throw a cleaner error that is caught in the router to be sent as JSON
    const cleanErr: any = new Error(error.message || "Unable to send verification code.");
    cleanErr.code = error.code;
    cleanErr.statusCode = error.status || 400;
    throw cleanErr;
  }
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

  // Check environment context
  const isNetlify = process.env.NETLIFY === "true" || process.env.LAMBDA_TASK_ROOT !== undefined || process.env.NODE_ENV === "production";

  // Validate environment variables strictly
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const missingCreds = !accountSid || isPlaceholderCredential(accountSid) ||
                        !authToken || isPlaceholderCredential(authToken) ||
                        !verifySid || isPlaceholderCredential(verifySid);

  if (missingCreds) {
    if (isNetlify) {
      throw new Error("Missing or invalid TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_VERIFY_SERVICE_SID environment variable in your Netlify settings.");
    }

    // Checking local mock store in development fallback
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

    // Timing-safe comparison
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

    // Success
    otpStore.delete(phone);
    return { ok: true };
  }

  console.log("TWILIO_ACCOUNT_SID configured: true");
  console.log("TWILIO_AUTH_TOKEN configured: true");
  console.log("TWILIO_VERIFY_SERVICE_SID configured: true");

  try {
    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(verifySid!)
      .verificationChecks.create({
        to: phone,
        code: cleanedCode,
      });

    if (check.status === "approved") {
      return { ok: true };
    }
    
    return { 
      ok: false, 
      statusCode: 401, 
      message: "Incorrect OTP code. Please check and try again." 
    };
  } catch (error: any) {
    console.error("Twilio OTP Error", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    return {
      ok: false,
      statusCode: error.status || 400,
      message: error.message || "Verification check failed",
    };
  }
}
