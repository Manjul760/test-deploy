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
exports.userRateUserPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const client_1 = require("@prisma/client");
const WebSocet_1 = require("../../../components/WebSocet");
function userRateUserPaths(app) {
    app.put("/api/userRatesUser", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { userId, star } = req.body;
        if (!userId) {
            res.status(400).json({ message: "whom to rate?" });
            return;
        }
        if (userId === req.userId && !process.env.DEVELOPMENT) {
            res.status(400).json({ message: "cannot rate self" });
            return;
        }
        try {
            star = parseInt(star);
            if (star > 5 || star < 0) {
                throw new Error("out of bounds");
            }
        }
        catch (e) {
            res.status(400).json({ message: "error in registering rating to user" });
            return;
        }
        yield __1.prisma.userRatesUser.findFirst({
            where: {
                fromUser: { equals: req.userId },
                toUser: { equals: userId }
            }
        }).then((rating) => __awaiter(this, void 0, void 0, function* () {
            yield __1.prisma.$transaction([
                rating ? __1.prisma.userRatesUser.update({
                    data: { star: star },
                    where: { rateId: rating.rateId }
                }) : __1.prisma.userRatesUser.create({
                    data: {
                        fromUser: req.userId,
                        toUser: userId,
                        star: star,
                    }
                }),
                __1.prisma.userRatesUser.aggregate({
                    where: { toUser: { equals: userId } },
                    _count: true,
                    _avg: { star: true }
                })
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then(([rate, rating]) => {
                res.status(200).json({ message: "rated successfully" });
                (0, WebSocet_1.wsNotificaionProfilePage)({
                    userId: rate.toUser,
                    eventType: "Rated User",
                    rate: {
                        rating: rating._avg.star ? rating._avg.star.toString() : 0,
                        review: rating._count.toString()
                    }
                });
                (0, WebSocet_1.wsNotificationItemPage)({
                    userId: rate.toUser,
                    eventType: "Rated User",
                    rate: {
                        rating: rating._avg.star ? rating._avg.star.toString() : 0,
                        review: rating._count.toString()
                    }
                });
            }).catch(() => { res.status(500).json({ message: "error rating user" }); });
        })).catch(() => { res.status(500).json({ message: "error rating user" }); });
    }));
}
exports.userRateUserPaths = userRateUserPaths;
