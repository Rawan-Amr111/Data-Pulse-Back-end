"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInventoryController = void 0;
const prisma_1 = require("../config/prisma");
const helpers_1 = require("../utils/helpers");
const auth_1 = require("../utils/auth");
const getInventoryController = async (req, res) => {
    try {
        const userId = (0, auth_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, helpers_1.sendJSON)(res, 401, { message: "Unauthorized" });
        }
        const inventoryData = await prisma_1.prisma.inventory.findMany({
            where: { userId },
            select: {
                id: true,
                productName: true,
                stock: true,
                demand: true,
                trend: true,
                minStock: true,
                orderAtLeast: true,
                avgDailyDemand: true,
                stockMonth: true,
            },
            orderBy: { id: "desc" },
        });
        (0, helpers_1.sendJSON)(res, 200, {
            success: true,
            length: inventoryData.length,
            data: inventoryData,
        });
    }
    catch (error) {
        console.error("Error in getInventoryController:", error);
        (0, helpers_1.sendJSON)(res, 500, { message: "Internal Server Error fetching inventory" });
    }
};
exports.getInventoryController = getInventoryController;
