import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";

export const getOrdersController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const orders = await prisma.order.findMany({
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

    return sendJSON(res, 200, orders);
  } catch (error) {
    console.error("🚨 Get Orders Controller Error:", error);
    return sendJSON(res, 500, {
      message: "Server Error while fetching orders.",
    });
  }
};
