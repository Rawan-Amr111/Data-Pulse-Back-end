"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginController = exports.signupController = void 0;
const prisma_1 = require("../config/prisma");
const helpers_1 = require("../utils/helpers");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const signupController = async (req, res) => {
    try {
        const { name, email, password } = await (0, helpers_1.getRequestBody)(req);
        if (!name || !email || !password) {
            return (0, helpers_1.sendJSON)(res, 400, { message: "All fields are required" });
        }
        const userExist = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (userExist) {
            return (0, helpers_1.sendJSON)(res, 400, { message: "Email already registered" });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        const newUser = await prisma_1.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
            },
            select: {
                id: true,
                name: true,
                email: true,
            },
        });
        return (0, helpers_1.sendJSON)(res, 201, {
            message: "User created successfully",
            user: newUser,
        });
    }
    catch (error) {
        console.error("🚨 SIGNUP ERROR:", error);
        return (0, helpers_1.sendJSON)(res, 500, { message: "Server Error" });
    }
};
exports.signupController = signupController;
const loginController = async (req, res) => {
    try {
        const { email, password } = await (0, helpers_1.getRequestBody)(req);
        if (!email || !password) {
            return (0, helpers_1.sendJSON)(res, 400, { message: "Email and password are required" });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return (0, helpers_1.sendJSON)(res, 400, { message: "Invalid credentials" });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return (0, helpers_1.sendJSON)(res, 400, { message: "Invalid credentials" });
        }
        const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
        const token = jsonwebtoken_1.default.sign({ id: user.id }, jwtSecret, { expiresIn: "1d" });
        const maxAge = 24 * 60 * 60;
        res.setHeader("Set-Cookie", `token=${token}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/`);
        return (0, helpers_1.sendJSON)(res, 200, {
            message: "Login successful",
            user: { id: user.id, name: user.name, email: user.email },
        });
    }
    catch (error) {
        console.error("🚨 LOGIN ERROR:", error);
        return (0, helpers_1.sendJSON)(res, 500, { message: "Server Error" });
    }
};
exports.loginController = loginController;
