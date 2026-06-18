import { IncomingMessage, ServerResponse } from "http";
import {
  signupController,
  loginController,
} from "../controllers/authController";
import { sendJSON } from "../utils/helpers";

export const handleAuthRoutes = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  const { method, url } = req;

  if (url === "/api/auth/signup" && method === "POST") {
    await signupController(req, res);
  } else if (url === "/api/auth/login" && method === "POST") {
    await loginController(req, res);
  } else {
    sendJSON(res, 404, { message: "Route not found in Auth" });
  }
};
