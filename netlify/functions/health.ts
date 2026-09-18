function isPlaceholderCredential(val?: string) {
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
  return false;
}

export const handler = async (event: any, context: any) => {
  const hasDb = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("@host:"));
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_ACCOUNT_SID) &&
    process.env.TWILIO_AUTH_TOKEN?.trim() && !isPlaceholderCredential(process.env.TWILIO_AUTH_TOKEN) &&
    process.env.TWILIO_VERIFY_SERVICE_SID?.trim() && !isPlaceholderCredential(process.env.TWILIO_VERIFY_SERVICE_SID)
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      success: true,
      environment: "production",
      databaseConfigured: hasDb,
      twilioConfigured: hasTwilio
    }),
  };
};
