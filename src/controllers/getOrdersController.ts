import { IncomingMessage, ServerResponse } from "http";
import { pool } from "../config/db";
import { sendJSON } from "../utils/helpers";

export const getOrdersController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const result = await pool.query(
      "SELECT id, transaction_number, transaction_date, item_name, quantity, price, total_price, status FROM orders ORDER BY transaction_date DESC, id DESC",
    );
    return sendJSON(res, 200, result.rows);
  } catch (error) {
    console.error("🚨 Get Orders Controller Error:", error);
    return sendJSON(res, 500, {
      message: "Server Error while fetching orders.",
    });
  }
};
