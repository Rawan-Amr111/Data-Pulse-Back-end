import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";
import { getAuthenticatedUserId } from "../utils/auth";
import * as XLSX from "xlsx";

type AnyRow = Record<string, any>;

const normalizeKey = (key: string) =>
  key
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

const normalizeRow = (row: AnyRow) => {
  const cleaned: AnyRow = {};

  for (const key of Object.keys(row)) {
    cleaned[normalizeKey(key)] = row[key];
  }

  return cleaned;
};

const getValue = (row: AnyRow, keys: string[]) => {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (row[normalized] !== undefined && row[normalized] !== "") {
      return row[normalized];
    }
  }

  return undefined;
};

const excelSerialDateToDate = (serial: number) => {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
};

const parseTransactionDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = excelSerialDateToDate(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, dayValue, monthValue, rawYear] = slashMatch;
    const year =
      rawYear.length === 2 ? Number(`20${rawYear}`) : Number(rawYear);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }

    return null;
  }

  const dashMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dashMatch) {
    const [, yearValue, monthValue, dayValue] = dashMatch;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return date;
    }

    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const uploadController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return sendJSON(res, 401, { message: "Unauthorized" });
    }

    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);

        const workbook = XLSX.read(buffer, {
          type: "buffer",
          raw: false,
        });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils
          .sheet_to_json<AnyRow>(worksheet, {
            defval: "",
          })
          .map(normalizeRow);

        const urlParams = new URL(req.url || "", `http://${req.headers.host}`);
        const fileType = urlParams.searchParams.get("type") || "inventory";

        if (fileType === "new-store") {
          return sendJSON(res, 200, {
            message: "New store initialized successfully!",
            rowsCount: 0,
          });
        }

        const currentYear = new Date().getFullYear();

        for (const row of rows) {
          if (fileType === "inventory") {
            const cleanRow: Record<string, string | number> = {};

            Object.keys(row).forEach((key) => {
              const cleanKey = key.trim().toLowerCase();
              const rawValue = (row as Record<string, string | number>)[key];
              if (rawValue !== undefined) {
                cleanRow[cleanKey] = rawValue;
              }
            });
            const productName = String(
              cleanRow["productname"] ||
                cleanRow["product_name"] ||
                cleanRow["product name"] ||
                "Unknown Product",
            );
            const stock =
              cleanRow["stock"] !== undefined ? Number(cleanRow["stock"]) : 0;
            const monthValue = getValue(row, ["month"]);
            const minValue = getValue(row, ["min", "min_stock", "minStock"]);
            const orderAtLeastValue = getValue(row, [
              "orderAtLeast",
              "order_at_least",
              "order at least",
            ]);
            const avgDailyDemandValue = getValue(row, [
              "avg_daily_demand",
              "avgDailyDemand",
              "avg daily demand",
            ]);
            const demand = String(cleanRow["demand"] || "Stable");
            const trend = String(cleanRow["trend"] || "Flat");
            await prisma.inventory.create({
              data: {
                productName: productName,
                stock: stock,
                month:
                  monthValue !== undefined && monthValue !== ""
                    ? String(monthValue)
                    : null,
                min:
                  minValue !== undefined && minValue !== ""
                    ? Number(minValue)
                    : null,
                orderAtLeast:
                  orderAtLeastValue !== undefined && orderAtLeastValue !== ""
                    ? Number(orderAtLeastValue)
                    : null,
                avgDailyDemand:
                  avgDailyDemandValue !== undefined && avgDailyDemandValue !== ""
                    ? Number(avgDailyDemandValue)
                    : null,
                demand: demand,
                trend: trend,
                userId,
              },
            });

            console.log(
              `✅ Saved perfectly: ${productName} with stock: ${stock}`,
            );
          } else {
            const itemName =
              getValue(row, ["item_name", "itemName"]) || "Unknown Item";

            const quantityValue = getValue(row, [
              "total_units_sold",
              "quantity",
            ]);

            const priceValue = getValue(row, ["price"]);

            const transactionNum =
              getValue(row, ["transaction_number", "transactionNumber"]) ||
              "N/A";

            const dateValue =
              getValue(row, ["transaction_date", "transactionDate"]) || "";

            const quantity = quantityValue ? Number(quantityValue) : 0;
            const price = priceValue ? Number(priceValue) : 0;

            const transactionDate = parseTransactionDate(dateValue);
            if (!transactionDate) {
              return sendJSON(res, 400, {
                message:
                  "Invalid transaction date. Use transaction_date or transactionDate with a valid date.",
                value: dateValue,
              });
            }

            const itemYear = transactionDate.getFullYear();
            const status: "active" | "archive" =
              currentYear - itemYear >= 2 ? "archive" : "active";

            await prisma.order.create({
              data: {
                transactionNumber: String(transactionNum),
                transactionDate,
                itemName: String(itemName),
                quantity: Number.isNaN(quantity) ? 0 : quantity,
                price: Number.isNaN(price) ? 0 : price,
                totalPrice:
                  Number.isNaN(quantity) || Number.isNaN(price)
                    ? 0
                    : quantity * price,
                status,
                userId,
              },
            });
          }
        }

        return sendJSON(res, 200, {
          message: "File processed and saved successfully!",
          rowsCount: rows.length,
        });
      } catch (parseError) {
        console.error("File Parsing Error:", parseError);
        return sendJSON(res, 400, {
          message: "Invalid file format. Please upload valid CSV or Excel.",
        });
      }
    });
  } catch (error) {
    console.error("Upload Controller Error:", error);
    return sendJSON(res, 500, { message: "Server Error during upload." });
  }
};
