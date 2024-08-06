"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
function sendMail({ to, title, body }) {
    return new Promise((resolve, reject) => {
        try {
            nodemailer_1.default.createTransport({
                service: process.env.SYSTEM_EMAIL_SERVICE_PROVIDER,
                auth: {
                    user: process.env.SYSTEM_EMAIL,
                    pass: process.env.SYSTEM_EMAIL_PASSWORD
                }
            }).sendMail({
                from: process.env.SYSTEM_EMAIL,
                to: to,
                subject: title,
                text: body,
                html: body
            }, function (error, info) {
                if (error) {
                    reject(error);
                }
                resolve(info.response);
            });
        }
        catch (e) {
            reject(e);
        }
    });
}
exports.sendMail = sendMail;
