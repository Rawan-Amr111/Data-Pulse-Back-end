import http, { IncomingMessage, ServerResponse } from "http";
import { handleAuthRoutes } from "./routes/authRoutes";
import { sendJSON } from "./utils/helpers";
import dotenv from "dotenv";

dotenv.config();

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    const { method, url } = req;
    if (method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      });
      return res.end();
    }
    if (url?.startsWith("/api/auth")) {
      await handleAuthRoutes(req, res);
    } else {
      sendJSON(res, 404, { message: "Global Route not found" });
    }
  },
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Pure TypeScript MVC Server running on port ${PORT}`),
);
