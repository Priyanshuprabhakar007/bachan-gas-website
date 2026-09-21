import twilio from "twilio";
import { getDb } from "./firebase";

export interface SendOtpResult {
  ok: boolean;
  message: string;
  channel: "sms" | "verify";
}

export interface VerifyOtpResult {
  ok: boolean;
  message?: string;
  statusCode?: number;
}

// Rate limits: phone -> { sendCount, verifyCount, windowStart }
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SEND_PER_WINDOW = 4;
const MAX_VERIFY_PER_WINDOW = 6;
const otpLimits = new Map<string, { sendCount: number; verifyCount: number; windowStart: number }>();

// Cleanup expired OTP limits every 5 minutes
setInterval(() => {
  const now = Date.now();
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
  if (cleaned.startsWith("AC") && !/^AC[0-9a-zA-Z]{32}$/.test(cleaned)) {
    return true;
  }
  if (cleaned.startsWith("SK") && !/^SK[0-9a-zA-Z]{32}$/.test(cleaned)) {
    return true;
  }
  if (cleaned.startsWith("VA") && !/^VA[0-9a-zA-Z]{32}$/.test(cleaned)) {
    return true;
  }
  return false;
}

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
  
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  const digits = cleaned.replace(/\D/g, "");
  
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
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
 * Sends an OTP to the given phone number using Twilio Verify
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

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const missingCreds = !accountSid || isPlaceholderCredential(accountSid) ||
                        !authToken || isPlaceholderCredential(authToken) ||
                        !verifySid || isPlaceholderCredential(verifySid);

  if (missingCreds) {
    console.error("[Twilio Verify] Configuration missing or invalid", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasVerifySid: !!verifySid,
      accountSidValid: !isPlaceholderCredential(accountSid),
      authSidValid: !isPlaceholderCredential(authToken),
      verifySidValid: !isPlaceholderCredential(verifySid)
    });
    throw new Error("Twilio credentials are not configured correctly.");
  }

  try {
    console.log(`[Twilio Verify] Sending verification to ${phone} using service ${verifySid!.substring(0, 4)}...`);
    const client = twilio(accountSid, authToken);
    await client.verify.v2.services(verifySid!).verifications.create({
      to: phone,
      channel: "sms",
    });
    console.log(`[Twilio Verify] Verification sent successfully to ${phone}`);
    return {
      ok: true,
      message: "OTP sent to your phone via SMS",
      channel: "verify",
    };
  } catch (error: any) {
    console.error("[Twilio Verify]", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    throw new Error(`Unable to send verification code. Please try again.`);
  }
}

/**
 * Verifies an OTP code for a given phone number using Twilio Verify
 */
export async function verifyOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);
  const cleanedCode = code.trim();

  if (!/^\+\d{10,15}$/.test(phone)) {
    return { ok: false, statusCode: 400, message: "Invalid phone number format" };
  }
  if (!/^\d{6}$/.test(cleanedCode)) {
    return { ok: false, statusCode: 400, message: "Invalid OTP code." };
  }

  const rateLimit = checkRateLimit(phone, "verify");
  if (!rateLimit.allowed) {
    return { ok: false, statusCode: 429, message: rateLimit.message };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  const missingCreds = !accountSid || isPlaceholderCredential(accountSid) ||
                        !authToken || isPlaceholderCredential(authToken) ||
                        !verifySid || isPlaceholderCredential(verifySid);

  if (missingCreds) {
    console.error("[Twilio Verify] Configuration missing or invalid", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasVerifySid: !!verifySid,
      accountSidValid: !isPlaceholderCredential(accountSid),
      authSidValid: !isPlaceholderCredential(authToken),
      verifySidValid: !isPlaceholderCredential(verifySid)
    });
    return {
      ok: false,
      statusCode: 401,
      message: "Twilio credentials are not configured correctly."
    };
  }

  try {
    console.log(`[Twilio Verify] Checking verification for ${phone} using service ${verifySid!.substring(0, 4)}...`);
    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(verifySid!)
      .verificationChecks.create({
        to: phone,
        code: cleanedCode,
      });

    console.log("[OTP Login] Twilio verification status:", {
      status: check.status
    });

    if (check.status === "approved") {
      return { ok: true };
    }
    
    return { 
      ok: false, 
      statusCode: 401, 
      message: "Invalid or expired verification code. Please request a new OTP." 
    };
  } catch (error: any) {
    console.error("[Twilio Verify]", {
      code: error.code,
      status: error.status,
      message: error.message,
    });
    
    return {
      ok: false,
      statusCode: error.status || 400,
      message: "Verification check failed. Please try again.",
    };
  }
}
