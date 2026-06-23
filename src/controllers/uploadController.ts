import { IncomingMessage, ServerResponse } from "http";
import { prisma } from "../config/prisma";
import { sendJSON } from "../utils/helpers";
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

export const uploadController = async (
  req: IncomingMessage,
  res: ServerResponse,
) => {
  try {
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

        const currentYear = 2026;

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
            const demand = String(cleanRow["demand"] || "Stable");
            const trend = String(cleanRow["trend"] || "Flat");
            await prisma.inventory.create({
              data: {
                productName: productName,
                stock: stock,
                demand: demand,
                trend: trend,
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

            const dateStr =
              getValue(row, ["transaction_date", "transactionDate"]) || "";

            const quantity = quantityValue ? Number(quantityValue) : 0;
            const price = priceValue ? Number(priceValue) : 0;

            let itemYear = currentYear;
            let formattedDate = "2026-01-01";

            if (dateStr && typeof dateStr === "string") {
              const dateParts = dateStr.split("/");
              if (dateParts.length === 3) {
                const day = dateParts[0].padStart(2, "0");
                const month = dateParts[1].padStart(2, "0");
                const year = dateParts[2];
                itemYear = parseInt(year, 10);
                formattedDate = `${year}-${month}-${day}`;
              }
            }

            const status: "active" | "archive" =
              currentYear - itemYear >= 2 ? "archive" : "active";

            await prisma.order.create({
              data: {
                transactionNumber: String(transactionNum),
                transactionDate: new Date(formattedDate),
                itemName: String(itemName),
                quantity: Number.isNaN(quantity) ? 0 : quantity,
                price: Number.isNaN(price) ? 0 : price,
                totalPrice:
                  Number.isNaN(quantity) || Number.isNaN(price)
                    ? 0
                    : quantity * price,
                status,
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
