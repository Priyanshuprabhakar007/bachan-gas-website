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
    if (!rawPhone) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Phone number is required." }),
      };
    }

    const phone = normalizePhone(rawPhone);
    if (!/^\+\d{10,15}$/.test(phone)) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Please enter a valid mobile number." }),
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

    if (!accountSid || !authToken || !serviceSid) {
      console.error("TWILIO CONFIGURATION MISSING", {
        accountSidConfigured: Boolean(accountSid),
        authTokenConfigured: Boolean(authToken),
        verifyServiceConfigured: Boolean(serviceSid),
      });

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
    const verification = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    console.log("Twilio verification created", {
      status: verification.status,
      destination: phone,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        status: verification.status,
      }),
    };
  } catch (error) {
    console.error("TWILIO SEND OTP ERROR", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    let statusCode = error.status || 500;
    let message = "SMS verification could not be sent.";

    if (error.code === 21608) {
      message = "This number is unverified in this trial account. Please use a verified recipient.";
    } else if (error.code === 60200) {
      message = "Please enter a valid mobile number.";
    } else if (error.code === 60203) {
      message = "Too many attempts. Please try again later.";
    } else if (error.code === 20003 || error.code === 70051) {
      message = "OTP service is temporarily unavailable.";
    }

    return {
      statusCode: statusCode,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        errorType: "TWILIO_ERROR",
        twilioCode: error.code || null,
        message: message,
      }),
    };
  }
};
