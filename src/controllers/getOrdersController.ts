import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";
import { getAuthenticatedUserId } from "../utils/auth";

export const getOrdersController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJSON(res, 401, { message: "Unauthorized" });
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        transactionNumber: true,
        transactionDate: true,
        itemName: true,
        quantity: true,
        price: true,
        totalPrice: true,
        status: true,
      },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
    });

    return sendJSON(
      res,
      200,
      orders.map((order) => ({
        id: order.id,
        transaction_number: order.transactionNumber,
        transaction_date: order.transactionDate,
        item_name: order.itemName,
        quantity: order.quantity,
        price: order.price,
        total_price: order.totalPrice,
        status: order.status,
      })),
    );
  } catch (error) {
    console.error("🚨 Get Orders Controller Error:", error);
    return sendJSON(res, 500, {
      message: "Server Error while fetching orders.",
    });
  }
};
