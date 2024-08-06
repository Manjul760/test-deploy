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
exports.notificationPageDisplayPaths = void 0;
const __1 = require("../..");
const LoginLogout_1 = require("../loginlogout/LoginLogout");
const client_1 = require("@prisma/client");
function notificationPageDisplayPaths(app) {
    app.get("/api/notificationpage/notifications/count/:count/page/:pageNumber", LoginLogout_1.verifyUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let count = 10;
        let pageNumber = 0;
        try {
            count = parseInt(req.params.count);
            pageNumber = parseInt(req.params.pageNumber);
            if (count < 1 || pageNumber < 0 || isNaN(count) || isNaN(pageNumber)) {
                throw new Error("value low range");
            }
        }
        catch (e) {
            count = 100;
            pageNumber = 0;
        }
        yield __1.prisma.userNotification.findMany({
            where: { userId: { equals: req.userId } },
            orderBy: [{ seen: "asc" }, { createdDate: 'desc' }],
            take: count,
            skip: count * pageNumber
        }).then((notifications) => __awaiter(this, void 0, void 0, function* () {
            let presentDate = new Date();
            let expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() - 3);
            yield __1.prisma.$transaction([
                __1.prisma.userNotification.updateMany({
                    where: { notificationId: { in: notifications.map((n) => n.notificationId) } },
                    data: { seen: presentDate }
                }),
                __1.prisma.userNotification.count({ where: { userId: { equals: req.userId }, seen: { equals: null } } }),
                __1.prisma.userNotification.deleteMany({ where: { seen: { lte: expiryDate } } })
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then(([up, totalUnread]) => {
                res.status(200).json({
                    totalUnread: totalUnread.toString(),
                    notifications: notifications
                });
            }).catch(() => { res.status(500).json({ message: "processing error" }); });
        })).catch((e) => { res.status(500).json({ message: "error getting data" }); });
    }));
}
exports.notificationPageDisplayPaths = notificationPageDisplayPaths;
