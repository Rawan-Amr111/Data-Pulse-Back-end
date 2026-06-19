import { IncomingMessage, ServerResponse } from "http";
import { pool } from "../config/db";
import { sendJSON } from "../utils/helpers";
import * as XLSX from "xlsx";

interface ExcelOrderRow {
  item_name?: string;
  transaction_number?: string | number;
  total_units_sold?: string | number;
  price?: string | number;
  transaction_date?: string;
}

interface CleanedOrder {
  itemName: string;
  quantity: number;
  price: number;
  totalPrice: number;
  status: "active" | "archive";
  transactionDate: string;
}

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
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as ExcelOrderRow[];
        const urlParams = new URL(req.url || "", `http://${req.headers.host}`);
        const fileType = urlParams.searchParams.get("type") || "inventory";

        const currentYear = 2026;

        for (const row of rows) {
          const itemName: string = row.item_name || "Unknown Item";
          const quantity: number =
            row.total_units_sold !== undefined
              ? Number(row.total_units_sold)
              : 0;
          const price: number = row.price !== undefined ? Number(row.price) : 0;
          const transactionNum = row.transaction_number
            ? String(row.transaction_number)
            : "N/A";
          const dateStr: string = row.transaction_date || "";
          let itemYear: number = currentYear;
          let formattedDate: string = "2026-01-01";

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

          let status: "active" | "archive" = "active";
          if (currentYear - itemYear >= 2) {
            status = "archive";
          }

          const cleanedOrder: CleanedOrder = {
            itemName,
            quantity,
            price,
            totalPrice: quantity * price,
            status,
            transactionDate: formattedDate,
          };
          if (fileType === "inventory") {
            await pool.query(
              "INSERT INTO inventory (item_name, quantity, price, status) VALUES ($1, $2, $3, $4)",
              [
                cleanedOrder.itemName,
                cleanedOrder.quantity,
                cleanedOrder.price,
                cleanedOrder.status,
              ],
            );
          } else {
            await pool.query(
              "INSERT INTO orders (transaction_number,transaction_date, item_name, quantity, price, total_price, status) VALUES ($1, $2, $3, $4, $5, $6)",
              [
                transactionNum,
                cleanedOrder.transactionDate,
                cleanedOrder.itemName,
                cleanedOrder.quantity,
                cleanedOrder.price,
                cleanedOrder.totalPrice,
                cleanedOrder.status,
              ],
            );
          }
        }

        return sendJSON(res, 200, {
          message: "File processed and saved successfully!",
        });
      } catch (parseError) {
        console.error("🚨 File Parsing Error:", parseError);
        return sendJSON(res, 400, {
          message: "Invalid file format. Please upload valid CSV or Excel.",
        });
      }
    });
  } catch (error) {
    console.error("🚨 Upload Controller Error:", error);
    return sendJSON(res, 500, { message: "Server Error during upload." });
  }
};
