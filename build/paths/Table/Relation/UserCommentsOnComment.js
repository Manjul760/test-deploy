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
exports.userCommentsCommentPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const WebSocet_1 = require("../../../components/WebSocet");
function userCommentsCommentPaths(app) {
    app.put("/api/userCommentsComment", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { itemCommentId, description } = req.body;
        const userId = req.userId;
        if (!itemCommentId) {
            res.status(400).json({ message: "which comment?" });
            return;
        }
        if (description.length <= 0) {
            res.status(400).json({ message: "no empty reply" });
            return;
        }
        yield __1.prisma.userCommentsOnComment.create({
            data: {
                userId: userId,
                itemCommentId: itemCommentId,
                itemCommentReplyDescription: description
            },
            include: {
                User: {
                    select: {
                        userId: true,
                        userName: true,
                        userNameHash: true,
                        fullName: true
                    }
                },
                Comment: {
                    select: {
                        itemCommentId: true,
                        Item: {
                            select: {
                                itemId: true
                            }
                        }
                    }
                }
            }
        }).then((userCommentsComment) => {
            if (!userCommentsComment) {
                res.status(500).json({ message: "comment error" });
                return;
            }
            res.status(200).json({ message: "commented" });
            let itemId = userCommentsComment.Comment.Item.itemId;
            let commentId = userCommentsComment.Comment.itemCommentId;
            userCommentsComment.Comment = undefined;
            userCommentsComment.User.fullName = (0, ExpressApp_1.decript)(userCommentsComment.User.fullName, userCommentsComment.User.userId);
            userCommentsComment.User.userName = (0, ExpressApp_1.decript)(userCommentsComment.User.userName, userCommentsComment.User.userNameHash);
            userCommentsComment.User.userNameHash = undefined;
            userCommentsComment.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(userCommentsComment.User.userId);
            (0, WebSocet_1.wsNotificationItemPage)({
                itemId: itemId,
                eventType: "Reply on Comment Received",
                reply: userCommentsComment,
                commentId: commentId
            });
        }).catch(() => { res.status(500).json({ message: "comment error" }); });
    }));
}
exports.userCommentsCommentPaths = userCommentsCommentPaths;
