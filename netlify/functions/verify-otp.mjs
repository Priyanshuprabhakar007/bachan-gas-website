import twilio from "twilio";

function normalizePhone(rawPhone) {
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

export const handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Method not allowed" }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Invalid JSON body" }),
      };
    }

    const rawPhone = body.phone;
    const code = body.code?.toString().trim();

    if (!rawPhone) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Phone number is required." }),
      };
    }
    if (!code || !/^\d{6}$/.test(code)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Invalid OTP code. Please enter the 6-digit code." }),
      };
    }

    const phone = normalizePhone(rawPhone);
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

    if (!accountSid || !authToken || !serviceSid) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          errorType: "CONFIGURATION_ERROR",
          message: "OTP service is temporarily unavailable.",
        }),
      };
    }

    const client = twilio(accountSid, authToken);
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phone,
        code: code,
      });

    if (check.status !== "approved") {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          verified: false,
          message: "Incorrect OTP code. Please try again.",
        }),
      };
    }

    // If approved, trigger login session creation on main express server
    const host = event.headers.host;
    const protocol = (host.includes("localhost") || host.includes("127.0.0.1")) ? "http" : "https";
    const loginUrl = `${protocol}://${host}/api/auth/login-after-verify`;

    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: phone,
        secret: authToken,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      return {
        statusCode: loginRes.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          success: false,
          verified: false,
          message: loginData.message || "Failed to establish login session.",
        }),
      };
    }

    // Capture Set-Cookie headers and forward to user browser
    const cookieHeader = loginRes.headers.get("set-cookie");
    const responseHeaders = { "Content-Type": "application/json" };
    if (cookieHeader) {
      responseHeaders["Set-Cookie"] = cookieHeader;
    }

    return {
      statusCode: 200,
      headers: responseHeaders,
      body: JSON.stringify({
        success: true,
        authenticated: true,
        verified: true,
        user: loginData.user,
      }),
    };
  } catch (error) {
    console.error("TWILIO VERIFY OTP ERROR", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    let statusCode = error.status || 500;
    let message = "Could not connect to OTP service.";

    if (error.code === 60202) {
      message = "Too many attempts. Please try again later.";
    }

    return {
      statusCode: statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        verified: false,
        errorType: "TWILIO_ERROR",
        twilioCode: error.code || null,
        message: message,
      }),
    };
  }
};
