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
exports.messagePageDisplayPaths = void 0;
const __1 = require("../..");
const LoginLogout_1 = require("../loginlogout/LoginLogout");
const ExpressApp_1 = require("../../components/ExpressApp");
const client_1 = require("@prisma/client");
function messagePageDisplayPaths(app) {
    app.get("/api/message/messages/userMessageUser/:toUser", LoginLogout_1.verifyUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const myUserId = req.userId;
        yield __1.prisma.$transaction([
            __1.prisma.userMessageUser.updateMany({
                where: { toUser: myUserId, seen: null },
                data: { seen: new Date() }
            }),
            __1.prisma.userMessageUser.findMany({
                where: {
                    OR: [
                        { toUser: req.params.toUser, fromUser: myUserId },
                        { toUser: myUserId, fromUser: req.params.toUser }
                    ]
                },
                orderBy: { createdDate: "asc" }
            }),
            __1.prisma.userMessageUser.count({
                where: {
                    toUser: myUserId,
                    seen: null
                },
            })
        ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then(([up, messages, unseenCount]) => {
            if (!messages) {
                res.status(200).json([]);
                return;
            }
            res.status(200).json({
                messages: messages,
                unseenCount: unseenCount.toString()
            });
        }).catch(() => { res.send(500).json({ message: "error with messages" }); });
    }));
    app.get("/api/message/userlist/userMessageUser", LoginLogout_1.verifyUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            const myUserId = req.userId;
            let data = yield __1.prisma.$queryRaw `
                select 
                    userName,
                    userNameHash,
                    userId,
                    fullName,
                    (select count(*) from usermessageuser where isnull(seen) and toUser = ${myUserId}) as unseenCount
                from user
                where userId in (
                    select  fromUser as userId  from usermessageuser where toUser = ${myUserId}
                    union
                    select  toUser as userId  from usermessageuser where fromUser = ${myUserId}
                )
                order by  (select max(createdDate) from usermessageuser  where toUser = userId ) desc, unseenCount desc;
                
            `;
            data.forEach((v) => {
                v.unseenCount = v.unseenCount.toString();
                v.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(v.userId);
                v.userName = (0, ExpressApp_1.decript)(v.userName, v.userNameHash);
                v.userNameHash = undefined;
                v.fullName = (0, ExpressApp_1.decript)(v.fullName, v.userId);
            });
            res.status(200).json(data);
        }
        catch (e) {
            res.status(500).json({ message: "internal error" });
        }
    }));
}
exports.messagePageDisplayPaths = messagePageDisplayPaths;
