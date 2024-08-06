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
exports.userMessageUserPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const WebSocet_1 = require("../../../components/WebSocet");
function userMessageUserPaths(app) {
    app.put("/api/userMessageUser", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { toUser, description } = req.body;
        const userId = req.userId;
        if (!toUser) {
            res.status(400).json({ message: "whom to message?" });
            return;
        }
        if (!description || description.length <= 0) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        if (toUser === userId && !process.env.DEVELOPMENT) {
            res.status(400).json({ message: "cannot message self" });
            return;
        }
        let Expirydate = new Date();
        Expirydate.setDate(Expirydate.getDate() - 7);
        yield __1.prisma.$transaction([
            __1.prisma.userMessageUser.deleteMany({ where: { createdDate: { lte: Expirydate } } }),
            __1.prisma.userMessageUser.findMany({
                where: {
                    fromUser: userId,
                    toUser: toUser
                },
                orderBy: { createdDate: 'asc' },
            }),
            __1.prisma.userMessageUser.create({
                data: {
                    fromUser: userId,
                    toUser: toUser,
                    description: description
                }
            })
        ]).then(([de, messages, sentMessage]) => {
            res.status(200).json({
                message: "messaged successfully",
                messageObject: sentMessage
            });
            (0, WebSocet_1.wsNotificationUser)([{
                    toUser: sentMessage.toUser,
                    eventType: "Message Received",
                    message: sentMessage
                }]);
            if (messages.length > 100) {
                __1.prisma.userMessageUser.deleteMany({
                    where: { userMessageId: { in: messages.filter((v, i) => i < messages.length - 100).map(v => v.userMessageId) } }
                });
            }
        }).catch(() => { });
    }));
}
exports.userMessageUserPaths = userMessageUserPaths;
