import { IncomingMessage, ServerResponse } from "http";
import { pool } from "../config/db";
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

// 📝 كونترولر الـ Signup
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

    const userExist = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (userExist.rows.length > 0) {
      return sendJSON(res, 400, { message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, hashedPassword],
    );

    return sendJSON(res, 201, {
      message: "User created successfully",
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error(error);
    return sendJSON(res, 500, { message: "Server Error" });
  }
};

// 🔑 كونترولر الـ Login
export const loginController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const { email, password } = await getRequestBody<LoginRequestBody>(req);

    if (!email || !password) {
      return sendJSON(res, 400, { message: "Email and password are required" });
    }

    const userResult = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    if (userResult.rows.length === 0) {
      return sendJSON(res, 400, { message: "Invalid credentials" });
    }

    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendJSON(res, 400, { message: "Invalid credentials" });
    }

    const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: "1d" });

    return sendJSON(res, 200, {
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, email: user.email } as UserPayload,
    });
  } catch (error) {
    console.error(error);
    return sendJSON(res, 500, { message: "Server Error" });
  }
};
