"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const authRoutes_1 = require("./routes/authRoutes");
const helpers_1 = require("./utils/helpers");
const getOrdersController_1 = require("./controllers/getOrdersController");
const getInventoryController_1 = require("./controllers/getInventoryController");
const analyticsController_1 = require("./controllers/analyticsController");
dotenv_1.default.config();
const server = http_1.default.createServer(async (req, res) => {
    const { method, url } = req;
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET, PUT, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }
    if (url?.startsWith("/api/auth")) {
        await (0, authRoutes_1.handleAuthRoutes)(req, res);
    }
    else if (url?.startsWith("/api/upload") && method === "POST") {
        const { uploadController } = require("./controllers/uploadController");
        await uploadController(req, res);
    }
    else if (req.url === "/api/orders" && req.method === "GET") {
        await (0, getOrdersController_1.getOrdersController)(req, res);
    }
    else if (req.url === "/api/inventory" && req.method === "GET") {
        await (0, getInventoryController_1.getInventoryController)(req, res);
    }
    else if (req.url === "/api/analytics" && req.method === "GET") {
        await (0, analyticsController_1.analyticsController)(req, res);
    }
    else if (req.url === "/api/dashboard" && req.method === "GET") {
        await (0, analyticsController_1.dashboardController)(req, res);
    }
    else {
        (0, helpers_1.sendJSON)(res, 404, { message: "Global Route not found" });
    }
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Pure TypeScript MVC Server running on port ${PORT}`));
