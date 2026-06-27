import { IncomingMessage } from "http";
import jwt from "jsonwebtoken";

interface AuthTokenPayload {
  id: number;
}

const getCookie = (req: IncomingMessage, name: string) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return target ? decodeURIComponent(target.slice(name.length + 1)) : null;
};

export const getAuthenticatedUserId = (req: IncomingMessage) => {
  const token = getCookie(req, "token");
  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || "fallback_secret";
    const payload = jwt.verify(token, jwtSecret) as AuthTokenPayload;

    return typeof payload.id === "number" ? payload.id : null;
  } catch {
    return null;
  }
};
