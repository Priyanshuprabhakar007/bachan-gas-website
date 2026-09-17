import serverless from "serverless-http";
import { initApp } from "../../server/index";

let handler: any;

export const handler = async (event: any, context: any) => {
  // Initialize app if not already initialized
  if (!handler) {
    const app = await initApp();
    handler = serverless(app);
  }
  return handler(event, context);
};
