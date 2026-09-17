export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      working: true,
      accountSidConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID),
      authTokenConfigured: Boolean(process.env.TWILIO_AUTH_TOKEN),
      verifyServiceConfigured: Boolean(process.env.TWILIO_VERIFY_SERVICE_SID),
    }),
  };
};
