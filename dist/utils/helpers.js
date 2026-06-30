"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendJSON = exports.getRequestBody = void 0;
const getRequestBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            }
            catch (err) {
                reject(err);
            }
        });
    });
};
exports.getRequestBody = getRequestBody;
const sendJSON = (res, statusCode, data) => {
    res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET, PUT, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
    });
    res.end(JSON.stringify(data));
};
exports.sendJSON = sendJSON;
