import { resolveUrl } from "./queryClient";

/**
 * Unified authentication logger and service layer.
 */

export interface LogPayload {
  phone: string;
  statusCode?: number;
  ok?: boolean;
  message?: string;
  twilioCode?: number;
  channel?: string;
  [key: string]: any;
}

/**
 * Safely redacts sensitive keys from any logging payload
 */
export function sanitizeLogData(data: any): any {
  if (!data) return data;
  const copy = JSON.parse(JSON.stringify(data));
  
  const redact = (obj: any) => {
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        redact(obj[key]);
      } else if (typeof key === "string" && /code|otp|secret|token|password|auth|key/i.test(key)) {
        if (key === "code" && typeof obj[key] === "string" && obj[key].length === 6) {
          obj[key] = "[REDACTED_6_DIGIT_OTP]";
        } else if (key === "devOtp" || key === "otp" || key === "password" || key === "secret") {
          obj[key] = "[REDACTED_SECRET]";
        }
      }
    }
  };
  
  redact(copy);
  return copy;
}

/**
 * Logs diagnostic information to browser console
 */
export async function logToNetlifyServer(level: "info" | "warn" | "error", message: string, data?: LogPayload) {
  const sanitized = sanitizeLogData(data);
  const consoleMsg = `[AuthService] [${level.toUpperCase()}] ${message}`;
  if (level === "error") {
    console.error(consoleMsg, sanitized);
  } else if (level === "warn") {
    console.warn(consoleMsg, sanitized);
  } else {
    console.log(consoleMsg, sanitized);
  }
}

/**
 * Sends OTP using Cloudflare API base URL resolver
 */
export async function sendOtpWithLogging(phone: string): Promise<any> {
  const cleanPhone = phone.replace(/\s/g, "");
  await logToNetlifyServer("info", "Initiating OTP send request", { phone: cleanPhone });

  try {
    const res = await fetch(resolveUrl("/api/send-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone }),
      credentials: "include",
    });

    const data = await res.json();
    
    await logToNetlifyServer(res.ok ? "info" : "error", "Received OTP send response", {
      phone: cleanPhone,
      statusCode: res.status,
      ok: res.ok,
      message: data.message,
      twilioCode: data.code,
      channel: data.channel
    });

    if (!res.ok) {
      throw {
        message: data.message || "Failed to send OTP via SMS",
        code: data.code,
      };
    }
    return data;
  } catch (error: any) {
    await logToNetlifyServer("error", "Exception thrown in OTP send process", {
      phone: cleanPhone,
      message: error.message || String(error)
    });
    throw error;
  }
}

/**
 * Verifies OTP using Cloudflare API base URL resolver
 */
export async function verifyOtpWithLogging(phone: string, code: string): Promise<any> {
  const cleanPhone = phone.replace(/\s/g, "");
  
  await logToNetlifyServer("info", "Initiating OTP verification request", {
    phone: cleanPhone,
    code: code
  });

  try {
    const res = await fetch(resolveUrl("/api/verify-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, code }),
      credentials: "include",
    });

    const data = await res.json();

    await logToNetlifyServer(res.ok ? "info" : "error", "Received OTP verification response", {
      phone: cleanPhone,
      statusCode: res.status,
      ok: res.ok,
      message: data.message,
      twilioCode: data.code
    });

    if (!res.ok) {
      throw new Error(data.message || "Invalid OTP code");
    }
    return data;
  } catch (error: any) {
    await logToNetlifyServer("error", "Exception thrown in OTP verification process", {
      phone: cleanPhone,
      message: error.message || String(error)
    });
    throw error;
  }
}
