import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";

export const getInventoryController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const inventoryData = await prisma.inventory.findMany();
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
