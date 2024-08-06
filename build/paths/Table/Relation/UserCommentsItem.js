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
exports.userCommentsItemPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const WebSocet_1 = require("../../../components/WebSocet");
function userCommentsItemPaths(app) {
    app.put("/api/userCommentsItem", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { itemId, description } = req.body;
        const userId = req.userId;
        if (!itemId) {
            res.status(400).json({ message: "which item?" });
            return;
        }
        if (description.length <= 0) {
            res.status(400).json({ message: "no empty comment" });
            return;
        }
        yield __1.prisma.userCommentsItem.create({
            data: {
                userId: userId,
                itemId: itemId,
                itemCommentDescription: description
            },
            include: {
                User: {
                    select: {
                        userId: true,
                        userName: true,
                        userNameHash: true,
                        fullName: true
                    }
                }
            }
        }).then((userCommentsItem) => {
            if (!userCommentsItem) {
                res.status(500).json({ message: "comment error" });
                return;
            }
            res.status(200).json({ message: "commented" });
            userCommentsItem.User.userName = (0, ExpressApp_1.decript)(userCommentsItem.User.userName, userCommentsItem.User.userNameHash);
            userCommentsItem.User.fullName = (0, ExpressApp_1.decript)(userCommentsItem.User.fullName, userCommentsItem.User.userId);
            userCommentsItem.User.userNameHash = undefined;
            userCommentsItem.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(userCommentsItem.User.userId);
            //broadcast comment
            (0, WebSocet_1.wsNotificationItemPage)({
                itemId: itemId,
                eventType: "Comment Received",
                comment: userCommentsItem
            });
        }).catch(() => { res.status(500).json({ message: "comment error" }); });
    }));
}
exports.userCommentsItemPaths = userCommentsItemPaths;
