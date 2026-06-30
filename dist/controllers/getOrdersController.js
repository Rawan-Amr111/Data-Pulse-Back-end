"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrdersController = void 0;
const prisma_1 = require("../config/prisma");
const helpers_1 = require("../utils/helpers");
const auth_1 = require("../utils/auth");
const getOrdersController = async (req, res) => {
    try {
        const userId = (0, auth_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, helpers_1.sendJSON)(res, 401, { message: "Unauthorized" });
        }
        const orders = await prisma_1.prisma.order.findMany({
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
        return (0, helpers_1.sendJSON)(res, 200, orders.map((order) => ({
            id: order.id,
            transaction_number: order.transactionNumber,
            transaction_date: order.transactionDate,
            item_name: order.itemName,
            quantity: order.quantity,
            price: order.price,
            total_price: order.totalPrice,
            status: order.status,
        })));
    }
    catch (error) {
        console.error("🚨 Get Orders Controller Error:", error);
        return (0, helpers_1.sendJSON)(res, 500, {
            message: "Server Error while fetching orders.",
        });
    }
};
exports.getOrdersController = getOrdersController;
