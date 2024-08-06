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
exports.userRequestItemPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const client_1 = require("@prisma/client");
const WebSocet_1 = require("../../../components/WebSocet");
function requestItemNotification(itemName, userName) {
    return `${itemName}, requested by ${userName}.`;
}
function acceptRequestNotification(itemName) {
    return `${itemName}, request accepted.`;
}
function acceptRequestDeletedNotification(itemName) {
    return `Accepted request on ${itemName} deleted.`;
}
function itemRestokedNotification(itemName) {
    return `${itemName}, restocked.`;
}
function acceptedItemRejectedLessStockNotification(itemName) {
    return `${itemName}, request rejected (less stock).`;
}
function requestRejectedNottification(itemName) {
    return `${itemName}, request rejected.`;
}
function userRequestItemPaths(app) {
    app.put("/api/userRequestItem", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { itemId, requestAmount } = req.body;
        if (!itemId) {
            res.status(400).json({ message: "which item?" });
            return;
        }
        if (!requestAmount) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        const myUserId = req.userId;
        try {
            requestAmount = parseInt(requestAmount);
            if (requestAmount < 1 || isNaN(requestAmount)) {
                throw new Error("out of bounds");
            }
        }
        catch (e) {
            res.status(400).json({ message: "request eror amount unverified" });
            return;
        }
        yield __1.prisma.$transaction([
            __1.prisma.userRequestsItem.findFirst({
                where: {
                    itemId: { equals: itemId },
                    Item: {
                        userId: { not: myUserId }
                    },
                    userId: { equals: myUserId },
                    acceptedDate: { equals: null },
                    rejectedDate: { equals: null }
                }
            }),
            __1.prisma.userRequestsItem.count({
                where: {
                    itemId: { equals: itemId },
                    acceptedDate: { equals: null },
                    rejectedDate: { equals: null }
                }
            }),
            __1.prisma.item.findFirst({
                where: {
                    itemId: itemId,
                    itemAvilableCount: { gt: 0 },
                    discontinuedDate: null,
                    revokedDate: null
                }
            }),
            __1.prisma.user.findFirst({
                where: { userId: myUserId }
            })
        ]).then((_a) => __awaiter(this, [_a], void 0, function* ([request, requestCount, requestedItem, me]) {
            if (!me) {
                res.status(400).json({ message: "cannot find you in our db" });
                return;
            }
            if (!requestedItem) {
                res.status(400).json({ message: "no such item or out of stock or banned" });
                return;
            }
            if (requestedItem.itemAvilableCount < requestAmount) {
                res.status(400).json({ message: "request exceeds quantity" });
                return;
            }
            if (!process.env.DEVELOPMENT) {
                if (request) {
                    res.status(400).json({ message: "request already pending" });
                    return;
                }
                if (requestedItem.userId === myUserId) {
                    res.status(400).json({ message: "cannot request posted Item" });
                    return;
                }
                if (requestCount >= 4) {
                    res.status(403).json({ message: "too many requests" });
                    return;
                }
            }
            yield __1.prisma.$transaction([
                __1.prisma.userRequestsItem.deleteMany({
                    where: {
                        userId: myUserId,
                        itemId: itemId,
                        rejectedDate: { not: null }
                    }
                }),
                __1.prisma.userRequestsItem.create({
                    data: {
                        userId: myUserId,
                        itemId: itemId,
                        requestAmount: requestAmount
                    },
                    include: {
                        User: {
                            select: {
                                userId: true,
                                userName: true,
                                fullName: true,
                                userNameHash: true
                            }
                        }
                    }
                }),
                __1.prisma.userNotification.create({
                    data: {
                        userId: requestedItem.userId,
                        description: requestItemNotification(requestedItem.itemName, (0, ExpressApp_1.decript)(me.fullName, me.userId))
                    }
                })
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then(([del, myRequest, requesteeNotification]) => {
                myRequest.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(myRequest.User.userId);
                myRequest.User.userName = (0, ExpressApp_1.decript)(myRequest.User.fullName, myRequest.User.userId);
                myRequest.User.userNameHash = undefined;
                myRequest.requestAmount = myRequest.requestAmount.toString();
                //notify the items creator request received
                (0, WebSocet_1.wsNotificationUser)([{
                        toUser: requestedItem.userId,
                        eventType: "Request Received",
                        notification: requesteeNotification,
                        request: myRequest
                    }]);
                // wsNotificationCountUpdate([requestedItem.userId])
                // send request in response to render if necessary
                res.status(200).json({
                    message: "requested ",
                    request: myRequest
                });
            }).catch((e) => { res.status(500).json({ message: "requeste error" }); });
        })).catch(() => { res.status(500).json({ message: "requested error" }); });
    }));
    app.patch("/api/userRequestItem/acceptedDate", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { requestId } = req.body;
        if (!requestId) {
            res.status(400).json({ message: "which request?" });
            return;
        }
        yield __1.prisma.userRequestsItem.findFirst({
            where: {
                itemRequestId: requestId,
                Item: {
                    userId: { equals: req.userId }
                }
            },
            include: {
                Item: {
                    select: {
                        itemAvilableCount: true,
                        revokedDate: true,
                        itemId: true,
                        itemName: true,
                        discontinuedDate: true
                    }
                }
            }
        })
            .then((request) => __awaiter(this, void 0, void 0, function* () {
            if (!request) {
                res.status(400).json({ message: "no request" });
                return;
            }
            if (request.Item.revokedDate) {
                res.status(400).json({ message: "item already revoked" });
                return;
            }
            if (request.Item.discontinuedDate) {
                res.status(400).json({ message: "item already discontinued" });
                return;
            }
            if (request.acceptedDate || request.rejectedDate) {
                res.status(400).json({ message: "cannot reupdate status" });
                return;
            }
            if (request.requestAmount > request.Item.itemAvilableCount) {
                res.status(400).json({ message: "item crossed limit" });
                return;
            }
            yield __1.prisma.$transaction([
                __1.prisma.userRequestsItem.update({
                    where: { itemRequestId: request.itemRequestId },
                    data: {
                        acceptedDate: new Date(),
                        Item: {
                            update: {
                                itemAvilableCount: { decrement: request.requestAmount }
                            }
                        }
                    },
                    include: {
                        User: {
                            select: {
                                Phone: {
                                    select: {
                                        phone: true,
                                        phoneId: true
                                    }
                                }
                            }
                        }
                    }
                }),
                __1.prisma.userNotification.create({
                    data: {
                        userId: request.userId,
                        description: acceptRequestNotification(request.Item.itemName)
                    }
                }),
                __1.prisma.userRequestsItem.findMany({
                    where: {
                        requestAmount: { gt: request.Item.itemAvilableCount - request.requestAmount },
                        acceptedDate: { equals: null },
                        rejectedDate: { equals: null },
                        Item: {
                            itemId: { equals: request.Item.itemId },
                            userId: { equals: req.userId },
                        }
                    }
                }),
                __1.prisma.userRequestsItem.updateMany({
                    where: {
                        requestAmount: { gt: request.Item.itemAvilableCount - request.requestAmount },
                        acceptedDate: { equals: null },
                        rejectedDate: { equals: null },
                        Item: {
                            itemId: { equals: request.Item.itemId },
                            userId: { equals: req.userId },
                        }
                    },
                    data: { rejectedDate: new Date() }
                })
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then((_b) => __awaiter(this, [_b], void 0, function* ([updatedRequest, requestorNotification, rejectedRequests, upm]) {
                updatedRequest.User.phoneNumber = (0, ExpressApp_1.decript)(updatedRequest.User.Phone.phone, updatedRequest.User.Phone.phoneId);
                updatedRequest.requestAmount = updatedRequest.requestAmount.toString();
                updatedRequest.User.Phone = undefined;
                res.status(200).json({
                    message: "updated successfully",
                    request: updatedRequest
                });
                updatedRequest.User = undefined;
                //notify requestor
                (0, WebSocet_1.wsNotificationUser)([{
                        toUser: updatedRequest.userId,
                        eventType: "Request Accepted",
                        notification: requestorNotification,
                        request: updatedRequest
                    }]);
                // wsNotificationCountUpdate([request.userId])
                __1.prisma.$transaction([
                    ...rejectedRequests.map((rejectedRequest) => {
                        return __1.prisma.userNotification.create({
                            data: {
                                userId: rejectedRequest.userId,
                                description: acceptedItemRejectedLessStockNotification(request.Item.itemName)
                            }
                        });
                    })
                ]).then((rejectedRequestNotifications) => {
                    //notify rejected req users
                    (0, WebSocet_1.wsNotificationUser)(rejectedRequestNotifications.map((n) => {
                        return {
                            toUser: n.userId,
                            eventType: "Request Rejected",
                            notification: n,
                            request: rejectedRequests.find(r => r.userId === n.userId)
                        };
                    }));
                }).catch(() => { });
            })).catch(() => { res.status(500).json({ message: "error updating" }); });
        }));
    }));
    app.patch("/api/userRequestItem/rejectedDate", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { requestId } = req.body;
        if (!requestId) {
            res.status(400).json({ message: "which request?" });
            return;
        }
        yield __1.prisma.userRequestsItem.findFirst({
            where: {
                itemRequestId: requestId,
                Item: {
                    userId: { equals: req.userId }
                }
            },
            include: {
                Item: {
                    select: {
                        itemAvilableCount: true,
                        itemName: true
                    }
                }
            }
        })
            .then((request) => __awaiter(this, void 0, void 0, function* () {
            if (!request) {
                res.status(400).json({ message: "no request" });
                return;
            }
            if (request.acceptedDate || request.rejectedDate) {
                res.status(400).json({ message: "cannot reupdate status" });
                return;
            }
            yield __1.prisma.$transaction([
                __1.prisma.userRequestsItem.update({
                    where: { itemRequestId: request.itemRequestId },
                    data: { rejectedDate: new Date() }
                }),
                __1.prisma.userNotification.create({
                    data: {
                        userId: request.userId,
                        description: requestRejectedNottification(request.Item.itemName)
                    }
                })
            ]).then(([updatedRequest, notification]) => {
                updatedRequest.requestAmount = updatedRequest.requestAmount.toString();
                res.status(200).json({
                    message: "updated successfully",
                    request: updatedRequest
                });
                //notify user
                (0, WebSocet_1.wsNotificationUser)([{
                        toUser: request.userId,
                        eventType: "Request Rejected",
                        notification: notification,
                        request: updatedRequest
                    }]);
            }).catch((e) => {
                // console.log(e)
                res.status(500).json({ message: "error updating" });
            });
        }));
    }));
    app.delete("/api/userRequestItem/acceptedDate", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { requestId } = req.body;
        if (!requestId) {
            res.status(400).json({ message: "which request?" });
            return;
        }
        yield __1.prisma.userRequestsItem.findFirst({
            where: {
                itemRequestId: requestId,
                Item: {
                    userId: req.userId
                }
            },
            include: {
                Item: true
            }
        }).then((request) => __awaiter(this, void 0, void 0, function* () {
            if (!request) {
                res.status(400).json({ message: "no request" });
                return;
            }
            yield __1.prisma.$transaction([
                __1.prisma.item.update({
                    where: { itemId: request.itemId },
                    data: { itemAvilableCount: { increment: request.requestAmount } }
                }),
                __1.prisma.userRequestsItem.findMany({
                    where: {
                        itemId: request.itemId,
                        rejectedDate: { not: null },
                        requestAmount: { lte: request.Item.itemAvilableCount + request.requestAmount }
                    },
                }),
                __1.prisma.userRequestsItem.delete({ where: { itemRequestId: requestId } }),
                __1.prisma.userNotification.create({
                    data: {
                        userId: request.userId,
                        description: acceptRequestDeletedNotification(request.Item.itemName)
                    }
                })
            ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then((_c) => __awaiter(this, [_c], void 0, function* ([up, rejectedRequests, del, deletedNotification]) {
                (0, WebSocet_1.wsNotificationUser)([{
                        toUser: request.userId,
                        eventType: "Request Deleted",
                        requestId: request.itemRequestId,
                        notification: deletedNotification
                    }]);
                res.status(200).json({
                    message: "request deleted successfully",
                    requestId: request.itemRequestId
                });
                __1.prisma.$transaction([
                    ...rejectedRequests.map((r) => {
                        return __1.prisma.userNotification.create({
                            data: {
                                userId: r.userId,
                                description: itemRestokedNotification(request.Item.itemName)
                            }
                        });
                    })
                ]).then((rejectedRequestsNotifications) => {
                    (0, WebSocet_1.wsNotificationUser)(rejectedRequestsNotifications.map((n) => {
                        return {
                            toUser: n.userId,
                            eventType: "Item ReStocked",
                            notification: n
                        };
                    }));
                }).catch(() => { });
            })).catch(() => { res.status(500).json({ message: "couldnt complete deletion" }); });
        })).catch(() => { res.status(500).json({ message: "internal error" }); });
    }));
    app.delete("/api/userRequestItem/pending", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { requestId } = req.body;
        yield __1.prisma.userRequestsItem.delete({
            where: {
                itemRequestId: requestId,
                userId: req.userId,
                acceptedDate: null
            },
            include: {
                Item: true
            }
        }).then((req) => __awaiter(this, void 0, void 0, function* () {
            res.status(200).json({
                message: "request deleted",
                requestId: req.itemRequestId
            });
        })).catch(() => { res.status(500).json({ message: "error deleting request" }); });
    }));
}
exports.userRequestItemPaths = userRequestItemPaths;
