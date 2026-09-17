import serverless from "serverless-http";
import { initApp } from "../../server/index";

let serverlessHandler: any;

export const handler = async (event: any, context: any) => {
  // Initialize app if not already initialized
  if (!serverlessHandler) {
    const app = await initApp();
    serverlessHandler = serverless(app);
  }
  return serverlessHandler(event, context);
};
