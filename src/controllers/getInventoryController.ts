import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";
import { getAuthenticatedUserId } from "../utils/auth";

export const getInventoryController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJSON(res, 401, { message: "Unauthorized" });
    }

    const inventoryData = await prisma.inventory.findMany({
      where: { userId },
      select: {
        id: true,
        productName: true,
        stock: true,
        month: true,
        orderAtLeast: true,
        avgDailyDemand: true,
        demand: true,
        trend: true,
        minStock: true,

        stockMonth: true,
      },
      orderBy: { id: "desc" },
    });

    sendJSON(res, 200, {
      success: true,
      length: inventoryData.length,
      data: inventoryData,
    });
  } catch (error) {
    console.error("Error in getInventoryController:", error);
    sendJSON(res, 500, { message: "Internal Server Error fetching inventory" });
  }
};
