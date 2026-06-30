"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = exports.analyticsController = void 0;
const prisma_1 = require("../config/prisma");
const auth_1 = require("../utils/auth");
const helpers_1 = require("../utils/helpers");
const monthFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
});
const roundMoney = (value) => Math.round(value * 100) / 100;
const fetchJsonWithTimeout = async (url, payload, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`Model API returned ${response.status}`);
        }
        return (await response.json());
    }
    finally {
        clearTimeout(timeout);
    }
};
const buildLocalAnalytics = async (userId) => {
    const [orders, inventory] = await Promise.all([
        prisma_1.prisma.order.findMany({
            where: { userId },
            select: {
                itemName: true,
                quantity: true,
                totalPrice: true,
                transactionDate: true,
            },
            orderBy: { transactionDate: "asc" },
        }),
        prisma_1.prisma.inventory.findMany({
            where: { userId },
            select: {
                productName: true,
                stock: true,
                minStock: true,
                orderAtLeast: true,
                avgDailyDemand: true,
                stockMonth: true,
            },
            orderBy: { stock: "asc" },
        }),
    ]);
    const monthlySales = new Map();
    const productSales = new Map();
    let totalRevenue = 0;
    for (const order of orders) {
        const month = monthFormatter.format(order.transactionDate);
        const orderTotal = Number(order.totalPrice);
        totalRevenue += orderTotal;
        monthlySales.set(month, roundMoney((monthlySales.get(month) ?? 0) + orderTotal));
        productSales.set(order.itemName, (productSales.get(order.itemName) ?? 0) + order.quantity);
    }
    const months = Array.from(monthlySales.keys());
    const sales = Array.from(monthlySales.values());
    const previousMonthSales = sales.at(-2) ?? 0;
    const latestMonthSales = sales.at(-1) ?? 0;
    const growthPercent = previousMonthSales > 0
        ? roundMoney(((latestMonthSales - previousMonthSales) / previousMonthSales) * 100)
        : 0;
    const bestMonth = sales.length > 0 ? months[sales.indexOf(Math.max(...sales))] : "N/A";
    const recentSales = sales.slice(-3);
    const forecastNextMonth = recentSales.length > 0
        ? roundMoney(recentSales.reduce((sum, value) => sum + value, 0) /
            recentSales.length)
        : 0;
    const nextMonthLabel = orders.length > 0
        ? monthFormatter.format(new Date(orders[orders.length - 1].transactionDate.getFullYear(), orders[orders.length - 1].transactionDate.getMonth() + 1, 1))
        : "Next Month";
    const topProducts = Array.from(productSales.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, salesVolume]) => ({ name, salesVolume }));
    const lowStockItems = inventory
        .filter((item) => item.stock <= 10)
        .slice(0, 6)
        .map((item) => ({
        name: item.productName,
        current: item.stock,
        min: 10,
        orderAtLeast: Math.max(0, 30 - item.stock),
    }));
    const analytics = {
        kpis: {
            totalRevenue: roundMoney(totalRevenue),
            growthPercent,
            bestMonth,
            forecastNextMonth,
            forecastAccuracy: 0,
        },
        alerts: {
            isDropComing: forecastNextMonth < latestMonthSales,
        },
        salesTrendChart: {
            months,
            sales,
        },
        forecastChart: {
            months: [...months, nextMonthLabel],
            actualSales: [...sales, null],
            forecastedSales: [...sales.map(() => null), forecastNextMonth],
        },
        topProductsChart: {
            products: topProducts,
        },
        lowStock: {
            items: lowStockItems,
        },
    };
    const criticalItemsCount = lowStockItems.length;
    const totalProducts = inventory.reduce((sum, item) => sum + item.stock, 0);
    const capacityUsed = inventory.length > 0
        ? roundMoney((totalProducts / Math.max(inventory.length * 30, 1)) * 100)
        : 0;
    const dashboard = {
        stockAlert: {
            criticalItemsCount,
            message: `Critical Stock Alert: ${criticalItemsCount} items are below safety stock levels.`,
        },
        statBoxes: [
            {
                title: "Total Products",
                value: totalProducts,
                valueType: "number",
                changeValue: 0,
                changeDirection: "up",
                comparisonLabel: "from current inventory",
            },
            {
                title: "Capacity Used",
                value: capacityUsed,
                valueType: "percent",
                changePercent: 0,
                changeDirection: "down",
                comparisonLabel: "from estimated capacity",
            },
            {
                title: "Inventory Shortage",
                value: criticalItemsCount,
                valueType: "number",
                changeValue: 0,
                changeDirection: criticalItemsCount > 0 ? "down" : "up",
                comparisonLabel: "current low stock",
            },
            {
                title: "Growth Index",
                value: growthPercent,
                valueType: "percent",
                changePercent: growthPercent,
                changeDirection: growthPercent >= 0 ? "up" : "down",
                comparisonLabel: "vs previous month",
            },
        ],
        demandSupplyTrendChart: {
            period: "recent_months",
            granularity: "monthly",
            labels: months.slice(-6),
            demandUnits: sales.slice(-6),
            supplyUnits: sales.slice(-6).map((value) => Math.round(value * 1.1)),
        },
        topTrendingStockChart: {
            title: "Top Trending Stock",
            subtitle: "Top sellers from uploaded order data",
            products: topProducts.map((product) => ({
                name: product.name,
                category: "Uncategorized",
                growthPercent: 0,
                currentStock: inventory.find((item) => item.productName === product.name)?.stock ??
                    0,
            })),
        },
    };
    return {
        analytics,
        dashboard,
        modelPayload: {
            orders: orders.map((order) => ({
                itemName: order.itemName,
                quantity: order.quantity,
                totalPrice: Number(order.totalPrice),
                transactionDate: order.transactionDate.toISOString(),
            })),
            inventory: inventory.map((item) => ({
                productName: item.productName,
                stock: item.stock,
                ...(item.stockMonth
                    ? { month: item.stockMonth.toISOString().slice(0, 7) }
                    : {}),
                ...(item.minStock !== null ? { min: item.minStock } : {}),
                ...(item.orderAtLeast !== null
                    ? { orderAtLeast: item.orderAtLeast }
                    : {}),
                ...(item.avgDailyDemand !== null
                    ? { avg_daily_demand: Number(item.avgDailyDemand) }
                    : {}),
            })),
            fallbackAnalytics: analytics,
            fallbackDashboard: dashboard,
        },
    };
};
const getDashboardModelUrl = () => {
    if (process.env.MODEL_DASHBOARD_API_URL) {
        return process.env.MODEL_DASHBOARD_API_URL;
    }
    return process.env.MODEL_API_URL?.replace(/\/analytics\/?$/, "/dashboard");
};
const getModelAnalytics = async (modelPayload) => {
    const modelApiUrl = process.env.MODEL_API_URL;
    if (!modelApiUrl)
        return null;
    return fetchJsonWithTimeout(modelApiUrl, modelPayload);
};
const getModelDashboard = async (modelPayload) => {
    const modelDashboardApiUrl = getDashboardModelUrl();
    if (!modelDashboardApiUrl)
        return null;
    const body = await fetchJsonWithTimeout(modelDashboardApiUrl, modelPayload);
    const normalizedBody = body;
    return "dashboard" in normalizedBody && normalizedBody.dashboard
        ? normalizedBody.dashboard
        : normalizedBody;
};
const analyticsController = async (req, res) => {
    try {
        const userId = (0, auth_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, helpers_1.sendJSON)(res, 401, { message: "Unauthorized" });
        }
        const { analytics, modelPayload } = await buildLocalAnalytics(userId);
        try {
            const modelAnalytics = await getModelAnalytics(modelPayload);
            return (0, helpers_1.sendJSON)(res, 200, modelAnalytics ?? analytics);
        }
        catch (modelError) {
            console.error("Model API Error, using local analytics:", modelError);
            return (0, helpers_1.sendJSON)(res, 200, analytics);
        }
    }
    catch (error) {
        console.error("Analytics Controller Error:", error);
        return (0, helpers_1.sendJSON)(res, 500, {
            message: "Server Error while building analytics.",
        });
    }
};
exports.analyticsController = analyticsController;
const dashboardController = async (req, res) => {
    try {
        const userId = (0, auth_1.getAuthenticatedUserId)(req);
        if (!userId) {
            return (0, helpers_1.sendJSON)(res, 401, { message: "Unauthorized" });
        }
        const { dashboard, modelPayload } = await buildLocalAnalytics(userId);
        try {
            const modelDashboard = await getModelDashboard(modelPayload);
            return (0, helpers_1.sendJSON)(res, 200, modelDashboard ?? dashboard);
        }
        catch (modelError) {
            console.error("Model Dashboard API Error, using local dashboard:", modelError);
            return (0, helpers_1.sendJSON)(res, 200, dashboard);
        }
    }
    catch (error) {
        console.error("Dashboard Controller Error:", error);
        return (0, helpers_1.sendJSON)(res, 500, {
            message: "Server Error while building dashboard.",
        });
    }
};
exports.dashboardController = dashboardController;
