import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { getAuthenticatedUserId } from "../utils/auth";
import { sendJSON } from "../utils/helpers";

const MIN_DAILY_DEMAND_FOR_CRITICAL = 1;

const getPriority = (
  stock: number,
  minStock: number,
  avgDailyDemand: number,
) => {
  const shortage = Math.max(minStock - stock, 0);
  const shortageRatio = minStock > 0 ? shortage / minStock : 0;

  if (shortageRatio >= 0.5 || avgDailyDemand >= 10) return "High";
  if (shortageRatio >= 0.2 || avgDailyDemand >= 3) return "Medium";
  return "Low";
};

export const reorderPlanController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJSON(res, 401, { message: "Unauthorized" });
    }

    const inventory = await prisma.inventory.findMany({
      where: { userId },
      select: {
        id: true,
        productName: true,
        stock: true,
        minStock: true,
        orderAtLeast: true,
        avgDailyDemand: true,
        stockMonth: true,
      },
      orderBy: [{ stockMonth: "desc" }, { id: "desc" }],
    });

    const latestStockMonth = inventory
      .map((item) => item.stockMonth?.toISOString().slice(0, 7))
      .filter(Boolean)
      .sort()
      .at(-1);

    const latestInventory = latestStockMonth
      ? inventory.filter(
          (item) =>
            item.stockMonth?.toISOString().slice(0, 7) === latestStockMonth,
        )
      : inventory;

    const latestByProduct = new Map<string, (typeof latestInventory)[number]>();

    for (const item of latestInventory) {
      if (!latestByProduct.has(item.productName)) {
        latestByProduct.set(item.productName, item);
      }
    }

    const plan = Array.from(latestByProduct.values())
      .map((item) => {
        const stock = item.stock ?? 0;
        const minStock = item.minStock ?? 10;
        const avgDailyDemand = Number(item.avgDailyDemand ?? 0);
        const orderAtLeast = item.orderAtLeast ?? 0;

        const shortage = Math.max(minStock - stock, 0);
        const suggestedOrder = Math.max(orderAtLeast, shortage);
        const priority = getPriority(stock, minStock, avgDailyDemand);

        return {
          productName: item.productName,
          currentStock: stock,
          safetyStock: minStock,
          avgDailyDemand,
          suggestedOrder,
          priority,
          reason:
            `Current stock is ${shortage} units below safety stock ` +
            `with average daily demand of ${avgDailyDemand}.`,
        };
      })
      .filter(
        (item) =>
          item.currentStock < item.safetyStock &&
          item.avgDailyDemand >= MIN_DAILY_DEMAND_FOR_CRITICAL,
      )
      .sort((a, b) => {
        const rank = { High: 3, Medium: 2, Low: 1 };
        return (
          rank[b.priority as keyof typeof rank] -
          rank[a.priority as keyof typeof rank]
        );
      });

    return sendJSON(res, 200, {
      count: plan.length,
      items: plan,
    });
  } catch (error) {
    console.error("Reorder Plan Controller Error:", error);
    return sendJSON(res, 500, {
      message: "Server Error while building reorder plan.",
    });
  }
};
