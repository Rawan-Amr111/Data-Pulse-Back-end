import { IncomingMessage, ServerResponse } from "http";
import { getAuthenticatedUserId } from "../utils/auth";
import { sendJSON } from "../utils/helpers";

export const bundlesController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJSON(res, 401, { message: "Unauthorized" });
    }

    const response = await fetch(
      process.env.MODEL_BUNDLES_API_URL ||
        "http://127.0.0.1:8000/api/bundles?limit=5",
    );

    if (!response.ok) {
      throw new Error(`Bundles model returned ${response.status}`);
    }

    const data = await response.json();
    return sendJSON(res, 200, data);
  } catch (error) {
    console.error("Bundles API Error:", error);
    return sendJSON(res, 200, { bundles: [] });
  }
};
