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

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SEND_PER_WINDOW = 4;
const MAX_VERIFY_PER_WINDOW = 6;

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

function getTwilioCredentials(env?: any) {
  const accountSid = (env?.TWILIO_ACCOUNT_SID ?? (typeof process !== "undefined" ? process.env?.TWILIO_ACCOUNT_SID : undefined))?.trim();
  const authToken = (env?.TWILIO_AUTH_TOKEN ?? (typeof process !== "undefined" ? process.env?.TWILIO_AUTH_TOKEN : undefined))?.trim();
  const verifySid = (env?.TWILIO_VERIFY_SERVICE_SID ?? (typeof process !== "undefined" ? process.env?.TWILIO_VERIFY_SERVICE_SID : undefined))?.trim();
  const db = env?.DB;

  return { accountSid, authToken, verifySid, db };
}

export function getOtpServiceStatus(env?: any) {
  const { accountSid, authToken, verifySid } = getTwilioCredentials(env);

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
 * Asynchronously checks and records rate limits for a given phone number using Cloudflare D1
 */
async function checkRateLimit(
  phone: string,
  action: "send" | "verify",
  db?: any
): Promise<{ allowed: boolean; message?: string }> {
  if (!db) {
    return { allowed: true };
  }

  const now = Date.now();

  try {
    const existing = await db
      .prepare("SELECT * FROM otp_rate_limits WHERE phone = ? LIMIT 1")
      .bind(phone)
      .first();

    if (!existing) {
      const initialSend = action === "send" ? 1 : 0;
      const initialVerify = action === "verify" ? 1 : 0;
      await db
        .prepare(
          "INSERT INTO otp_rate_limits (phone, send_count, verify_count, window_start) VALUES (?, ?, ?, ?)"
        )
        .bind(phone, initialSend, initialVerify, new Date(now).toISOString())
        .run();
      return { allowed: true };
    }

    const windowStartMs =
      typeof existing.window_start === "number"
        ? existing.window_start
        : new Date(existing.window_start).getTime();

    // Check if window is older than 10 minutes -> reset counters
    if (isNaN(windowStartMs) || now - windowStartMs > RATE_LIMIT_WINDOW_MS) {
      const newSend = action === "send" ? 1 : 0;
      const newVerify = action === "verify" ? 1 : 0;
      await db
        .prepare(
          "UPDATE otp_rate_limits SET send_count = ?, verify_count = ?, window_start = ? WHERE phone = ?"
        )
        .bind(newSend, newVerify, new Date(now).toISOString(), phone)
        .run();
      return { allowed: true };
    }

    // Active 10-minute window
    if (action === "send") {
      if ((existing.send_count ?? 0) >= MAX_SEND_PER_WINDOW) {
        return {
          allowed: false,
          message: "Too many OTP requests. Please wait a few minutes before trying again.",
        };
      }
      await db
        .prepare("UPDATE otp_rate_limits SET send_count = send_count + 1 WHERE phone = ?")
        .bind(phone)
        .run();
    } else {
      if ((existing.verify_count ?? 0) >= MAX_VERIFY_PER_WINDOW) {
        return {
          allowed: false,
          message: "Too many failed attempts. Please request a new OTP.",
        };
      }
      await db
        .prepare("UPDATE otp_rate_limits SET verify_count = verify_count + 1 WHERE phone = ?")
        .bind(phone)
        .run();
    }

    return { allowed: true };
  } catch (err) {
    console.error("[OTP Rate Limit Error]", err);
    return { allowed: true };
  }
}

/**
 * Sends an OTP to the given phone number using Twilio Verify REST API via native fetch
 */
export async function sendOtp(
  rawPhone: string,
  purpose: string = "login",
  env?: any
): Promise<SendOtpResult> {
  const phone = normalizePhone(rawPhone);
  if (!/^\+\d{10,15}$/.test(phone)) {
    throw new Error(
      "Invalid phone number format. Please provide a valid number with country code (e.g. +919876543210)"
    );
  }

  const { accountSid, authToken, verifySid, db } = getTwilioCredentials(env);

  const rateLimit = await checkRateLimit(phone, "send", db);
  if (!rateLimit.allowed) {
    const err: any = new Error(rateLimit.message);
    err.statusCode = 429;
    throw err;
  }

  const missingCreds =
    !accountSid ||
    isPlaceholderCredential(accountSid) ||
    !authToken ||
    isPlaceholderCredential(authToken) ||
    !verifySid ||
    isPlaceholderCredential(verifySid);

  if (missingCreds) {
    console.error("[Twilio Verify] Configuration missing or invalid", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasVerifySid: !!verifySid,
      accountSidValid: !isPlaceholderCredential(accountSid),
      authSidValid: !isPlaceholderCredential(authToken),
      verifySidValid: !isPlaceholderCredential(verifySid),
    });
    throw new Error("Twilio credentials are not configured correctly.");
  }

  try {
    console.log(
      `[Twilio Verify] Sending verification to ${phone} using service ${verifySid!.substring(0, 4)}...`
    );

    const auth = btoa(`${accountSid}:${authToken}`);
    const body = new URLSearchParams({
      To: phone,
      Channel: "sms",
    });

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[Twilio Verify Error]", response.status, data);
      throw new Error("Unable to send verification code. Please try again.");
    }

    console.log(`[Twilio Verify] Verification sent successfully to ${phone}`);
    return {
      ok: true,
      message: "OTP sent to your phone via SMS",
      channel: "verify",
    };
  } catch (error: any) {
    console.error("[Twilio Verify Error]", error.message || error);
    throw new Error(error.message || "Unable to send verification code. Please try again.");
  }
}

/**
 * Verifies an OTP code for a given phone number using Twilio Verify REST API via native fetch
 */
export async function verifyOtp(
  rawPhone: string,
  code: string,
  env?: any
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);
  const cleanedCode = code.trim();

  if (!/^\+\d{10,15}$/.test(phone)) {
    return { ok: false, statusCode: 400, message: "Invalid phone number format" };
  }
  if (!/^\d{6}$/.test(cleanedCode)) {
    return { ok: false, statusCode: 400, message: "Invalid OTP code." };
  }

  const { accountSid, authToken, verifySid, db } = getTwilioCredentials(env);

  const rateLimit = await checkRateLimit(phone, "verify", db);
  if (!rateLimit.allowed) {
    return { ok: false, statusCode: 429, message: rateLimit.message };
  }

  const missingCreds =
    !accountSid ||
    isPlaceholderCredential(accountSid) ||
    !authToken ||
    isPlaceholderCredential(authToken) ||
    !verifySid ||
    isPlaceholderCredential(verifySid);

  if (missingCreds) {
    console.error("[Twilio Verify] Configuration missing or invalid", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasVerifySid: !!verifySid,
      accountSidValid: !isPlaceholderCredential(accountSid),
      authSidValid: !isPlaceholderCredential(authToken),
      verifySidValid: !isPlaceholderCredential(verifySid),
    });
    return {
      ok: false,
      statusCode: 401,
      message: "Twilio credentials are not configured correctly.",
    };
  }

  try {
    console.log(
      `[Twilio Verify] Checking verification for ${phone} using service ${verifySid!.substring(0, 4)}...`
    );

    const auth = btoa(`${accountSid}:${authToken}`);
    const body = new URLSearchParams({
      To: phone,
      Code: cleanedCode,
    });

    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("[Twilio Verify Check Error]", response.status, data);
      return {
        ok: false,
        statusCode: response.status || 400,
        message: "Verification check failed. Please try again.",
      };
    }

    console.log("[OTP Login] Twilio verification status:", {
      status: data.status,
    });

    if (data.status === "approved") {
      return { ok: true };
    }

    return {
      ok: false,
      statusCode: 401,
      message: "Invalid or expired verification code. Please request a new OTP.",
    };
  } catch (error: any) {
    console.error("[Twilio Verify Error]", error.message || error);
    return {
      ok: false,
      statusCode: error.status || 400,
      message: "Verification check failed. Please try again.",
    };
  }
}
