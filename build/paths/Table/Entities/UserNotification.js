"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userNotificationPath = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const __1 = require("../../..");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
function userNotificationPath(app) {
    app.delete("/api/usernotification", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { notificationId } = req.body;
        if (!notificationId) {
            res.status(400).json({ message: "which notification" });
            return;
        }
        if (notificationId.toLowerCase() === "all") {
            yield __1.prisma.userNotification.deleteMany({
                where: { userId: req.userId }
            }).then(() => {
                res.status(200).json({ message: "deleted " });
            }).catch(() => {
                res.status(500).json({ message: "error deleting " });
            });
        }
        else {
            yield __1.prisma.userNotification.delete({
                where: {
                    userId: req.userId,
                    notificationId: notificationId
                }
            }).then(() => {
                res.status(200).json({ message: "deleted " });
            }).catch(() => {
                res.status(500).json({ message: "error deleting " });
            });
        }
    }));
}
exports.userNotificationPath = userNotificationPath;
