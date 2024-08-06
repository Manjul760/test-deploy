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
exports.adminPageDisplayPaths = void 0;
const __1 = require("../..");
const ExpressApp_1 = require("../../components/ExpressApp");
function adminPageDisplayPaths(app) {
    app.get("/api/admin/data", (req, res) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield __1.prisma.$transaction([
                __1.prisma.feedback.findMany({
                    orderBy: {
                        postedDate: "desc"
                    }
                }),
                __1.prisma.career.findMany({
                    orderBy: {
                        createdDate: "desc"
                    }
                }),
                __1.prisma.userReportUser.findMany({
                    include: {
                        From: {
                            select: {
                                fullName: true,
                                userId: true,
                                Email: true,
                                Phone: true
                            }
                        },
                        To: {
                            select: {
                                fullName: true,
                                userId: true,
                                Email: true,
                                Phone: true
                            }
                        },
                    },
                    orderBy: { reportedDate: "desc" }
                }),
                __1.prisma.userReportsItem.findMany({
                    include: {
                        User: {
                            select: {
                                fullName: true,
                                userId: true,
                                Email: true,
                                Phone: true
                            }
                        },
                        Item: {
                            select: {
                                itemName: true,
                                itemId: true,
                                User: {
                                    select: {
                                        fullName: true,
                                        userId: true,
                                        Email: true,
                                        Phone: true
                                    }
                                },
                                ItemMultimedias: {
                                    select: {
                                        multimediaId: true,
                                        type: true,
                                        extension: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { reportedDate: "desc" }
                }),
                __1.prisma.user.findMany({
                    include: {
                        Email: true,
                        Phone: true
                    }
                }),
                __1.prisma.item.findMany({
                    where: {},
                    include: {
                        ItemMultimedias: true,
                        User: {
                            select: {
                                userId: true,
                                fullName: true,
                            }
                        }
                    }
                })
            ]).then((_a) => __awaiter(this, [_a], void 0, function* ([feedbacks, careers, userReports, itemReports, userList, itemList]) {
                let promiseList = [];
                let sendFeedBacks = feedbacks.map((f) => {
                    f.email = (0, ExpressApp_1.decript)(f.email, f.feedbackId);
                    f.name = (0, ExpressApp_1.decript)(f.name, f.feedbackId);
                    return f;
                });
                let sendUserList = userList.map((u) => {
                    u.phone = (0, ExpressApp_1.decript)(u.Phone.phone, u.Phone.phoneId);
                    u.Phone = undefined;
                    u.email = (0, ExpressApp_1.decript)(u.Email.email, u.Email.emailId);
                    u.Email = undefined;
                    u.fullName = (0, ExpressApp_1.decript)(u.fullName, u.userId);
                    u.latitude = undefined;
                    u.longitude = undefined;
                    u.posted = u.posted.toString();
                    u.profilePic = (0, ExpressApp_1.userProfilePicPath)(u.userId);
                    return u;
                });
                let sendItemList = itemList.map((i) => {
                    i.User.profilePic = (0, ExpressApp_1.userProfilePicPath)(i.User.userId);
                    i.User.fullName = (0, ExpressApp_1.decript)(i.User.fullName, i.User.userId);
                    i.ItemMultimedias = i.ItemMultimedias.map((m) => {
                        return (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
                    });
                    i.itemAvilableCount = i.itemAvilableCount.toString();
                    i.itemCount = i.itemCount.toString();
                    return i;
                });
                let sendUserReports = userReports.map((r) => {
                    r.From.email = (0, ExpressApp_1.decript)(r.From.Email.email, r.From.Email.emailId);
                    r.To.email = (0, ExpressApp_1.decript)(r.To.Email.email, r.To.Email.emailId);
                    r.From.phone = (0, ExpressApp_1.decript)(r.From.Phone.phone, r.From.Phone.phoneId);
                    r.To.phone = (0, ExpressApp_1.decript)(r.To.Phone.phone, r.To.Phone.phoneId);
                    r.To.Phone = undefined;
                    r.To.Email = undefined;
                    r.From.Phone = undefined;
                    r.From.Email = undefined;
                    promiseList.push(__1.prisma.userReportUser.count({
                        where: { toUser: r.toUser }
                    }).then((c) => {
                        r.toUserCount = c.toString();
                    }));
                    r.From.fullName = (0, ExpressApp_1.decript)(r.From.fullName, r.From.userId);
                    r.To.fullName = (0, ExpressApp_1.decript)(r.To.fullName, r.To.userId);
                    r.To.profilePic = (0, ExpressApp_1.userProfilePicPath)(r.To.userId);
                    r.From.profilePic = (0, ExpressApp_1.userProfilePicPath)(r.From.userId);
                    return r;
                });
                let sendItemReports = itemReports.map((r) => {
                    r.User.email = (0, ExpressApp_1.decript)(r.User.Email.email, r.User.Email.emailId);
                    r.User.phone = (0, ExpressApp_1.decript)(r.User.Phone.phone, r.User.Phone.phoneId);
                    r.User.Phone = undefined;
                    r.User.Email = undefined;
                    r.User.fullName = (0, ExpressApp_1.decript)(r.User.fullName, r.User.userId);
                    r.User.profilePic = (0, ExpressApp_1.userProfilePicPath)(r.User.userId);
                    promiseList.push(__1.prisma.userReportUser.count({
                        where: { toUser: r.Item.User.userId }
                    }).then((c) => {
                        r.toUserCount = c.toString();
                    }));
                    promiseList.push(__1.prisma.userReportsItem.count({
                        where: { itemId: r.Item.itemId }
                    }).then((c) => {
                        r.toItemCount = c.toString();
                    }));
                    r.Item.User.email = (0, ExpressApp_1.decript)(r.Item.User.Email.email, r.Item.User.Email.emailId);
                    r.Item.User.phone = (0, ExpressApp_1.decript)(r.Item.User.Phone.phone, r.Item.User.Phone.phoneId);
                    r.Item.User.Phone = undefined;
                    r.Item.User.Email = undefined;
                    r.Item.User.fullName = (0, ExpressApp_1.decript)(r.Item.User.fullName, r.Item.User.userId);
                    r.Item.User.profilePic = (0, ExpressApp_1.userProfilePicPath)(r.Item.User.userId);
                    r.Item.ItemMultimedias = r.Item.ItemMultimedias.map((m) => {
                        return (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
                    });
                    return r;
                });
                for (let index = 0; index < promiseList.length; index++) {
                    yield promiseList[index];
                }
                res.status(200).json({
                    feedbacks: sendFeedBacks,
                    careers: careers,
                    userReports: sendUserReports,
                    itemReports: sendItemReports,
                    userList: sendUserList,
                    itemList: sendItemList
                });
            }));
        }
        catch (e) {
            res.status(500).json({ message: "error bhaexo internal" });
        }
    }));
}
exports.adminPageDisplayPaths = adminPageDisplayPaths;
