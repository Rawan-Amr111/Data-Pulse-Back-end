import dotenv from "dotenv";
dotenv.config();
import http, { IncomingMessage, ServerResponse } from "http";
import { handleAuthRoutes } from "./routes/authRoutes";
import { sendJSON } from "./utils/helpers";
import { getOrdersController } from "./controllers/getOrdersController";
import { getInventoryController } from "./controllers/getInventoryController";
import {
  analyticsController,
  dashboardController,
} from "./controllers/analyticsController";
import { bundlesController } from "./controllers/bundlesController";
import { reorderPlanController } from "./controllers/reorderPlanController";

dotenv.config();

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const { method, url } = req;
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "OPTIONS, POST, GET, PUT, DELETE",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    if (url?.startsWith("/api/auth")) {
      await handleAuthRoutes(req, res);
    } else if (url?.startsWith("/api/upload") && method === "POST") {
      const { uploadController } = require("./controllers/uploadController");
      await uploadController(req, res);
    } else if (req.url === "/api/orders" && req.method === "GET") {
      await getOrdersController(req, res);
    } else if (req.url === "/api/inventory" && req.method === "GET") {
      await getInventoryController(req, res);
    } else if (req.url === "/api/analytics" && req.method === "GET") {
      await analyticsController(req, res);
    } else if (req.url === "/api/dashboard" && req.method === "GET") {
      await dashboardController(req, res);
    } else if (req.url === "/api/bundles" && req.method === "GET") {
      await bundlesController(req, res);
    } else if (req.url === "/api/reorder-plan" && req.method === "GET") {
      await reorderPlanController(req, res);
    } else {
      sendJSON(res, 404, { message: "Global Route not found" });
    }
  },
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Pure TypeScript MVC Server running on port ${PORT}`),
);
