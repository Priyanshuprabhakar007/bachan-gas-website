import serverless from "serverless-http";
import { initApp } from "../../server/index.js";

let serverlessHandler;

export const handler = async (event, context) => {
  if (!serverlessHandler) {
    const app = await initApp();
    serverlessHandler = serverless(app);
  }
  
  // Normalize path and method for the Express app router
  event.path = "/api/auth/send-otp";
  event.httpMethod = "POST";
  
  return serverlessHandler(event, context);
};
