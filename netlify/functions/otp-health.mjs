function isPlaceholderCredential(val) {
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

export const handler = async (event, context) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      working: true,
      accountSidConfigured: Boolean(accountSid && !isPlaceholderCredential(accountSid)),
      authTokenConfigured: Boolean(authToken && !isPlaceholderCredential(authToken)),
      verifyServiceConfigured: Boolean(serviceSid && !isPlaceholderCredential(serviceSid)),
    }),
  };
};
