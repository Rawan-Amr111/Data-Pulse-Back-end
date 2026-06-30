"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedUserId = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getCookie = (req, name) => {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader)
        return null;
    const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
    const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));
    return target ? decodeURIComponent(target.slice(name.length + 1)) : null;
};
const getAuthenticatedUserId = (req) => {
    const token = getCookie(req, "token");
    if (!token)
        return null;
    try {
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const payload = jsonwebtoken_1.default.verify(token, jwtSecret);
        return typeof payload.id === "number" ? payload.id : null;
    }
    catch {
        return null;
    }
};
exports.getAuthenticatedUserId = getAuthenticatedUserId;
