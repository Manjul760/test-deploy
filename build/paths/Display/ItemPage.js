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
exports.itemPageDisplayPaths = void 0;
const __1 = require("../..");
const ExpressApp_1 = require("../../components/ExpressApp");
function itemPageDisplayPaths(app) {
    app.get("/api/itempage/item/:itemId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.item.findFirst({
            where: { itemId: req.params.itemId, },
            orderBy: { createdDate: "desc" },
            include: {
                ItemMultimedias: true,
                ItemRequests: {
                    where: {
                        userId: req.cookies._DIU_,
                        acceptedDate: null,
                        rejectedDate: null
                    },
                    select: { itemRequestId: true }
                },
                User: {
                    select: {
                        userId: true,
                        userName: true,
                        userNameHash: true,
                        fullName: true
                    }
                },
                ItemCommentsReceived: {
                    include: {
                        User: {
                            select: {
                                userName: true,
                                fullName: true,
                                userNameHash: true,
                                userId: true
                            }
                        },
                        Replies: {
                            include: {
                                User: {
                                    select: {
                                        userName: true,
                                        fullName: true,
                                        userNameHash: true,
                                        userId: true
                                    }
                                }
                            },
                            orderBy: { createdDate: "desc" }
                        }
                    },
                    orderBy: { createdDate: "desc" }
                }
            }
        }).then((item) => __awaiter(this, void 0, void 0, function* () {
            if (!item) {
                res.sendStatus(404);
                return;
            }
            item.ItemMultimedias.forEach((m) => {
                m.path = (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
            });
            item.latitude = (0, ExpressApp_1.decript)(item.latitude, item.itemId);
            item.longitude = (0, ExpressApp_1.decript)(item.longitude, item.itemId);
            item.User.userName = (0, ExpressApp_1.decript)(item.User.userName, item.User.userNameHash);
            item.itemAvilableCount = item.itemAvilableCount.toString();
            item.itemCount = undefined;
            item.User.userNameHash = undefined;
            item.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(item.User.userId);
            item.User.fullName = (0, ExpressApp_1.decript)(item.User.fullName, item.User.userId);
            yield __1.prisma.userRatesUser.aggregate({
                where: { toUser: { equals: item.userId } },
                _count: true,
                _avg: { star: true }
            }).then((rating) => {
                item.rate = {
                    rating: rating._avg.star,
                    reviews: rating._count
                };
            });
            if (item.ItemRequests.length > 0) {
                item.isRequested = true;
                item.ItemRequests = undefined;
            }
            else {
                item.isRequested = false;
            }
            if (item.ItemCommentsReceived.length > 0) {
                item.ItemCommentsReceived.map((c) => {
                    c.User.fullName = (0, ExpressApp_1.decript)(c.User.fullName, c.User.userId);
                    c.User.userName = (0, ExpressApp_1.decript)(c.User.userName, c.User.userNameHash);
                    c.User.userNameHash = undefined;
                    c.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(c.User.userId);
                    if (!c.Replies) {
                        c.Replies = [];
                    }
                    else {
                        c.Replies.forEach((r) => {
                            r.User.fullName = (0, ExpressApp_1.decript)(r.User.fullName, r.User.userId);
                            r.User.userName = (0, ExpressApp_1.decript)(r.User.userName, r.User.userNameHash);
                            r.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(r.User.userId);
                            r.User.userNameHash = undefined;
                        });
                    }
                    return c;
                });
            }
            res.status(200).json(item);
        }));
    }));
    app.get("/api/itempage/item/:itemId/comment", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.userCommentsItem.findMany({
            where: { itemId: req.params.itemId },
            include: {
                User: {
                    select: {
                        userName: true,
                        fullName: true,
                        userNameHash: true,
                        userId: true
                    }
                },
                Replies: {
                    include: {
                        User: {
                            select: {
                                userName: true,
                                userNameHash: true,
                                userId: true,
                                fullName: true
                            }
                        }
                    },
                    orderBy: { createdDate: "desc" }
                }
            },
            orderBy: { createdDate: "desc" }
        }).then((comments) => {
            if (!comments) {
                res.status(200).json([]);
            }
            res.status(200).json(comments.map((c) => {
                c.User.fullName = (0, ExpressApp_1.decript)(c.User.fullName, c.User.userId);
                c.User.userName = (0, ExpressApp_1.decript)(c.User.userName, c.User.userNameHash);
                c.User.userNameHash = undefined;
                c.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(c.User.userId);
                if (!c.Replies) {
                    c.Replies = [];
                }
                else {
                    c.Replies.forEach((r) => {
                        r.User.fullName = (0, ExpressApp_1.decript)(r.User.fullName, r.User.userId);
                        r.User.userName = (0, ExpressApp_1.decript)(r.User.userName, r.User.userNameHash);
                        r.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(r.User.userId);
                        r.User.userNameHash = undefined;
                    });
                }
                return c;
            }));
        });
    }));
    app.get("/api/itempage/rating/:userId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.$transaction([
            __1.prisma.userRatesUser.findFirst({ where: {
                    fromUser: req.userId,
                    toUser: req.params.userId
                } }),
            __1.prisma.userRatesUser.aggregate({
                where: { toUser: { equals: req.params.userId } },
                _count: true,
                _avg: { star: true }
            })
        ]).then(([rating, rate]) => {
            if (!rating) {
                res.status(200).json({
                    star: 3,
                    ratedDate: null,
                    modifiedDate: null,
                    review: rate._count,
                    avgRate: rate._avg.star,
                });
                return;
            }
            res.status(200).json({
                review: rate._count,
                avgRate: rate._avg.star,
                star: rating.star,
                ratedDate: rating.ratedDate,
                modifiedDate: rating.modifiedDate
            });
        }).catch(() => { res.status(500).json({ message: "internal error" }); });
    }));
}
exports.itemPageDisplayPaths = itemPageDisplayPaths;
