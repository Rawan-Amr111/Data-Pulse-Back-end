"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAuthRoutes = void 0;
const authController_1 = require("../controllers/authController");
const helpers_1 = require("../utils/helpers");
const handleAuthRoutes = async (req, res) => {
    const { method, url } = req;
    if (url === "/api/auth/signup" && method === "POST") {
        await (0, authController_1.signupController)(req, res);
    }
    else if (url === "/api/auth/login" && method === "POST") {
        await (0, authController_1.loginController)(req, res);
    }
    else {
        (0, helpers_1.sendJSON)(res, 404, { message: "Route not found in Auth" });
    }
};
exports.handleAuthRoutes = handleAuthRoutes;
