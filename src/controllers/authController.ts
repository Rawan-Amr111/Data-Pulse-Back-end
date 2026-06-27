import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { getRequestBody, sendJSON } from "../utils/helpers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface UserPayload {
  id: number;
  name: string;
  email: string;
}
interface SignupRequestBody {
  name?: string;
  email?: string;
  password?: string;
}
interface LoginRequestBody {
  email?: string;
  password?: string;
}

export const signupController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const { name, email, password } =
      await getRequestBody<SignupRequestBody>(req);

    if (!name || !email || !password) {
      return sendJSON(res, 400, { message: "All fields are required" });
    }

    
    const userExist = await prisma.user.findUnique({
      where: { email },
    });

    if (userExist) {
      return sendJSON(res, 400, { message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const newUser = await prisma.user.create({
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

    return sendJSON(res, 201, {
      message: "User created successfully",
      user: newUser, 
    });
  } catch (error) {
    console.error("🚨 SIGNUP ERROR:", error);
    return sendJSON(res, 500, { message: "Server Error" });
  }
};

export const loginController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const { email, password } = await getRequestBody<LoginRequestBody>(req);

    if (!email || !password) {
      return sendJSON(res, 400, { message: "Email and password are required" });
    }


    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return sendJSON(res, 400, { message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendJSON(res, 400, { message: "Invalid credentials" });
    }

    const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "1d" });
    const maxAge = 24 * 60 * 60;
    res.setHeader(
      "Set-Cookie",
      `token=${token}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Path=/`,
    );

    return sendJSON(res, 200, {
      message: "Login successful",
      user: { id: user.id, name: user.name, email: user.email } as UserPayload,
    });
  } catch (error) {
    console.error("🚨 LOGIN ERROR:", error);
    return sendJSON(res, 500, { message: "Server Error" });
  }
};
