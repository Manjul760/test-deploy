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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.itemPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
const multer_1 = __importDefault(require("multer"));
const sharp_1 = __importDefault(require("sharp"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
function itemDeletedNotification(itemName) {
    return `${itemName} deleted.`;
}
function itemPaths(app) {
    app.put("/api/item", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { files: 4 } }).array("itemPics", 4), (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { itemName, itemCount, itemDescription, longitude, latitude, category, itemDistrict } = req.body;
        if (!itemName || !itemCount || !itemDescription || !longitude || !latitude || !category) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        try {
            itemCount = parseInt(itemCount);
            longitude = parseFloat(longitude);
            latitude = parseFloat(latitude);
            if (itemCount < 1 || longitude < -180 || longitude > 180 || latitude > 180 || latitude < -180 || isNaN(longitude) || isNaN(longitude)) {
                throw new Error("out of bounds");
            }
        }
        catch (e) {
            res.status(400).json({ message: "neumeric value error" });
        }
        if (!req.files) {
            res.status(400).json({ message: "no image for item?" });
            return;
        }
        if (req.files.length < 2) {
            res.status(400).json({ message: "too less file uploads" });
            return;
        }
        if (req.files.length > 4) {
            res.status(400).json({ message: "too many file uploads" });
            return;
        }
        let files = req.files;
        let itemPicIds = [];
        let fileUploadError = false;
        files.forEach((file) => __awaiter(this, void 0, void 0, function* () {
            if (fileUploadError) {
                return;
            }
            if (!new Set(ExpressApp_1.allowedPicMimeList).has(file.mimetype)) {
                fileUploadError = true;
                return;
            }
            if (file.size > ExpressApp_1.fileSizeLimitInBytes) {
                fileUploadError = true;
                return;
            }
            let uniqueId = crypto_1.default.randomUUID();
            itemPicIds.push(uniqueId);
            yield new Promise((resolve, reject) => {
                (0, sharp_1.default)(file.buffer).webp().toFile(ExpressApp_1.staticFilesPath + (0, ExpressApp_1.itemMultimediaPath)(uniqueId, "webp"), (err, info) => {
                    if (err) {
                        fileUploadError = true;
                        return;
                    }
                    resolve(0);
                });
            });
        }));
        if (fileUploadError) {
            itemPicIds.forEach((id) => {
                fs_1.default.unlinkSync(ExpressApp_1.staticFilesPath + (0, ExpressApp_1.itemMultimediaPath)(id, "webp"));
            });
            res.status(500).json({ message: "unable to upload files" });
            return;
        }
        let itemid = crypto_1.default.randomUUID();
        yield __1.prisma.item.create({
            data: {
                itemId: itemid,
                userId: req.userId,
                itemName: itemName,
                itemCount: itemCount,
                itemAvilableCount: itemCount,
                itemDistrict: itemDistrict,
                itemDescription: itemDescription,
                longitude: (0, ExpressApp_1.encript)("" + longitude, itemid),
                latitude: (0, ExpressApp_1.encript)("" + latitude, itemid),
                category: category,
                ItemMultimedias: {
                    createMany: {
                        data: itemPicIds.map((id) => {
                            return { multimediaId: id, extension: "webp", type: "image" };
                        })
                    }
                },
            },
        }).then((item) => {
            __1.prisma.user.update({
                where: { userId: item.userId },
                data: { posted: { increment: 1 } }
            });
            res.status(200).json({ message: "item created" });
        }).catch((e) => {
            itemPicIds.forEach((id) => {
                fs_1.default.unlinkSync(ExpressApp_1.staticFilesPath + (0, ExpressApp_1.itemMultimediaPath)(id, "webp"));
            });
            res.status(500).json({ message: "couldnt creating item" });
        });
    }));
    app.delete("/api/item", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { itemId } = req.body;
        yield __1.prisma.item.findFirst({
            where: { itemId: { equals: itemId }, userId: req.userId },
            include: {
                User: {
                    select: {
                        userName: true,
                        userNameHash: true
                    }
                },
                ItemMultimedias: true,
                ItemRequests: {
                    select: {
                        userId: true,
                        acceptedDate: true,
                        rejectedDate: true
                    }
                },
                ItemCommentsReceived: {
                    select: {
                        userId: true,
                        Replies: {
                            select: {
                                userId: true
                            }
                        }
                    },
                },
                ItemReportsReceived: {
                    select: {
                        userId: true
                    }
                }
            }
        }).then((item) => __awaiter(this, void 0, void 0, function* () {
            if (!item) {
                res.status(400).json({ message: "invalid attempt" });
                return;
            }
            let usersActionOnItem = {};
            function addAction(uid, action) {
                if (uid === (item === null || item === void 0 ? void 0 : item.userId) && process.env.DEVELOPMENT) {
                    return;
                }
                if (usersActionOnItem[uid]) {
                    usersActionOnItem[uid].add(action);
                }
                else {
                    usersActionOnItem[uid] = new Set([action]);
                }
            }
            item.ItemCommentsReceived.forEach((d) => {
                addAction(d.userId, "Commented");
                d.Replies.forEach((rd) => {
                    addAction(rd.userId, "Replied on Comment");
                });
            });
            item.ItemReportsReceived.forEach((d) => { addAction(d.userId, "Reported"); });
            item.ItemRequests.forEach(d => {
                if (d.acceptedDate) {
                    addAction(d.userId, "Request Accepted");
                }
                else if (!d.acceptedDate && !d.rejectedDate) {
                    addAction(d.userId, "Request pending");
                }
            });
            yield __1.prisma.$transaction([
                __1.prisma.item.delete({
                    where: { itemId: item.itemId },
                    include: {
                        ItemCommentsReceived: true,
                        ItemMultimedias: true,
                        ItemReportsReceived: true,
                        ItemRequests: true,
                    }
                }),
                // ...Object.keys(usersActionOnItem).map((k)=>{
                //     return prisma.userNotification.create({
                //         data:{
                //             userId:k,
                //             description:itemDeletedNotification(item.itemName)
                //         }
                //     })
                // })
            ]).then(([del, ...deletedNotifications]) => {
                res.status(200).json({ message: "deleted successfully" });
                item.ItemMultimedias.forEach((m) => {
                    fs_1.default.unlinkSync(ExpressApp_1.staticFilesPath + (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension));
                });
                // wsNotificationUser(deletedNotifications.map((n)=>{
                //     return {
                //         toUser:n.userId,
                //         eventType:"Item Deleted",
                //         notification:n
                //     }
                // }))
            }).catch(() => { res.status(500).json({ message: "couldnt delete" }); });
        })).catch((e) => { res.status(500).json({ message: "error verifying data" }); });
    }));
    app.delete("/api/admin/item", LoginLogout_1.verifyAdmin, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { itemId } = req.body;
        yield __1.prisma.item.findFirst({
            where: { itemId: { equals: itemId } },
            include: {
                User: {
                    select: {
                        userName: true,
                        userNameHash: true
                    }
                },
                ItemMultimedias: true,
                ItemRequests: {
                    select: {
                        userId: true,
                        acceptedDate: true,
                        rejectedDate: true
                    }
                },
                ItemCommentsReceived: {
                    select: {
                        userId: true,
                        Replies: {
                            select: {
                                userId: true
                            }
                        }
                    },
                },
                ItemReportsReceived: {
                    select: {
                        userId: true
                    }
                }
            }
        }).then((item) => __awaiter(this, void 0, void 0, function* () {
            if (!item) {
                res.status(400).json({ message: "invalid attempt" });
                return;
            }
            let usersActionOnItem = {};
            function addAction(uid, action) {
                if (uid === (item === null || item === void 0 ? void 0 : item.userId) && process.env.DEVELOPMENT) {
                    return;
                }
                if (usersActionOnItem[uid]) {
                    usersActionOnItem[uid].add(action);
                }
                else {
                    usersActionOnItem[uid] = new Set([action]);
                }
            }
            item.ItemCommentsReceived.forEach((d) => {
                addAction(d.userId, "Commented");
                d.Replies.forEach((rd) => {
                    addAction(rd.userId, "Replied on Comment");
                });
            });
            item.ItemReportsReceived.forEach((d) => { addAction(d.userId, "Reported"); });
            item.ItemRequests.forEach(d => {
                if (d.acceptedDate) {
                    addAction(d.userId, "Request Accepted");
                }
                else if (!d.acceptedDate && !d.rejectedDate) {
                    addAction(d.userId, "Request pending");
                }
            });
            yield __1.prisma.$transaction([
                __1.prisma.item.delete({
                    where: { itemId: item.itemId },
                    include: {
                        ItemCommentsReceived: true,
                        ItemMultimedias: true,
                        ItemReportsReceived: true,
                        ItemRequests: true,
                    }
                }),
                // ...Object.keys(usersActionOnItem).map((k)=>{
                //     return prisma.userNotification.create({
                //         data:{
                //             userId:k,
                //             description:itemDeletedNotification(item.itemName)
                //         }
                //     })
                // })
            ]).then(([del, ...deletedNotifications]) => {
                res.status(200).json({ message: "deleted successfully" });
                item.ItemMultimedias.forEach((m) => {
                    fs_1.default.unlinkSync(ExpressApp_1.staticFilesPath + (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension));
                });
                // wsNotificationUser(deletedNotifications.map((n)=>{
                //     return {
                //         toUser:n.userId,
                //         eventType:"Item Deleted",
                //         notification:n
                //     }
                // }))
            }).catch(() => { res.status(500).json({ message: "couldnt delete" }); });
        })).catch((e) => { res.status(500).json({ message: "error verifying data" }); });
    }));
}
exports.itemPaths = itemPaths;
