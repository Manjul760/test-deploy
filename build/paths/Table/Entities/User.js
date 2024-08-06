"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.userPath = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const multer_1 = __importDefault(require("multer"));
const __1 = require("../../..");
const crypto = __importStar(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const client_1 = require("@prisma/client");
function userPath(app) {
    app.get("/api/user", LoginLogout_1.verifyUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const verifyid = req.headers["verifyid"];
        if (!verifyid) {
            res.status(403).json({ message: "no user found" });
            return;
        }
        yield __1.prisma.$transaction([
            __1.prisma.user.findFirst({
                where: {
                    userId: req.userId,
                    OR: [
                        { unlockTime: null },
                        { unlockTime: { lte: new Date() } }
                    ],
                },
                include: {
                    Phone: {
                        select: {
                            phoneId: true,
                            phone: true
                        }
                    },
                    Email: {
                        select: {
                            email: true,
                            emailId: true
                        }
                    }
                }
            }),
            __1.prisma.userNotification.count({ where: { userId: req.userId, seen: null } }),
            __1.prisma.userMessageUser.count({ where: { toUser: req.userId, seen: null } })
        ]).then(([user, notificationCount, messageCount]) => {
            if (!user) {
                res.status(400).json({ message: "no user found" });
                return;
            }
            let displayUser = user;
            displayUser.email = (0, ExpressApp_1.decript)(displayUser.Email.email, displayUser.Email.emailId);
            displayUser.Email = undefined;
            displayUser.phone = (0, ExpressApp_1.decript)(displayUser.Phone.phone, displayUser.Phone.phoneId);
            displayUser.Phone = undefined;
            displayUser.userName = (0, ExpressApp_1.decript)(displayUser.userName, displayUser.userNameHash);
            displayUser.longitude = (0, ExpressApp_1.decript)(displayUser.longitude, displayUser.userId);
            displayUser.latitude = (0, ExpressApp_1.decript)(displayUser.latitude, displayUser.userId);
            displayUser.fullName = (0, ExpressApp_1.decript)(displayUser.fullName, displayUser.userId);
            displayUser.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(displayUser.userId);
            displayUser.userNameHash = undefined;
            displayUser.phoneId = undefined;
            displayUser.emailId = undefined;
            displayUser.userPassword = undefined;
            displayUser.posted = displayUser.posted.toString();
            // displayUser.describeYourself = decript(displayUser.describeYourself, displayUser.userId)
            displayUser.describeYourself = undefined; //comment if you uncomment above
            let persentDate = new Date();
            let identityId = crypto.randomUUID();
            displayUser.notificationCount = notificationCount.toString();
            displayUser.messageCount = messageCount.toString();
            let fakeuser = crypto.createHash("sha256").update(identityId).digest("hex") +
                crypto.createHash("sha256").update(verifyid).digest("hex");
            let pass = crypto.createHash("sha256").update(`${new Date(persentDate.getTime() + 69).toISOString()} ${verifyid} ${identityId} ${fakeuser}`).digest("hex");
            res.status(200).json({
                mf: (0, ExpressApp_1.encript)(JSON.stringify(displayUser), pass),
                fu: persentDate.getTime(),
                ck: identityId,
                u: fakeuser
            });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
    app.put("/api/user", ExpressApp_1.CSRFToken, (0, multer_1.default)({ storage: multer_1.default.memoryStorage() }).single("userProfilePic"), (req, res) => {
        if (!req.cookies.registryEmail) {
            res.status(400).json({ message: "Error putting user register first" });
            return;
        }
        jsonwebtoken_1.default.verify(req.cookies.registryEmail, ExpressApp_1.jwtkey, (e, email) => __awaiter(this, void 0, void 0, function* () {
            if (e) {
                res.status(400).json({ message: "Error verifying registry" });
                return;
            }
            let { userPhone, userPassword, userName, longitude, latitude, userDOB, userGender, isOrganization, fullName } = req.body;
            if (!userPhone || !userPassword || !userName || !longitude || !latitude || !userDOB || !userGender || !fullName) {
                res.status(400).json({ message: "Missing fields" });
                return;
            }
            let errorMessages = false;
            let error = {};
            let profileId = crypto.randomUUID();
            let phoneHash = crypto.createHash("sha512").update(userPhone).digest("hex");
            let userNameHash = crypto.createHash("sha512").update(userName).digest("hex");
            yield __1.prisma.$transaction([
                __1.prisma.user.findFirst({ where: { phoneId: { equals: phoneHash } } }),
                __1.prisma.user.findFirst({ where: { userNameHash: { equals: userNameHash } } })
            ]).then(([u1, u2]) => {
                if (u1) {
                    error["userPhone"] = "Phone Number exists";
                    errorMessages = true;
                }
                if (u2) {
                    error["userName"] = "Username Exists";
                    errorMessages = true;
                }
            }).catch(() => {
                error["internal"] = "Verify phone email error";
                errorMessages = true;
            });
            try {
                longitude = parseFloat(longitude);
                latitude = parseFloat(latitude);
                if (longitude > 180 || longitude < -180) {
                    throw new Error("out of bounds");
                }
                if (latitude > 180 || latitude < -180) {
                    throw new Error("out of bounds");
                }
            }
            catch (e) {
                errorMessages = true;
                error["longitude"] = "error verifying longitude";
                error["latitude"] = "error verifying latitude";
            }
            let userDOBDate = new Date(userDOB);
            if (isNaN(userDOBDate.getTime()) || userDOB >= new Date()) {
                errorMessages = true;
                error["userDOB"] = "Invalid date";
            }
            if (!new Set(["Male", "Female", "Other"]).has(userGender)) {
                errorMessages = true;
                error["userGender"] = "Invalid date";
            }
            if (errorMessages) {
                res.status(400).json(error);
                return;
            }
            if (!req.file) {
                error["userProfilePic"] = "No Image Uploaded";
                res.status(400).json(error);
                return;
            }
            else if (!new Set(ExpressApp_1.allowedPicMimeList).has(req.file.mimetype)) {
                error["userProfilePic"] = "Wrong image format";
                res.status(400).json(error);
                return;
            }
            else if (req.file.size > ExpressApp_1.fileSizeLimitInBytes) {
                error["userProfilePic"] = "Size greater than 5Mb";
                res.status(400).json(error);
                return;
            }
            else {
                let profilePicPath = ExpressApp_1.staticFilesPath + (0, ExpressApp_1.userProfilePicPath)(profileId);
                (0, sharp_1.default)(req.file.buffer).webp().toFile(profilePicPath, (e, i) => __awaiter(this, void 0, void 0, function* () {
                    if (e) {
                        error["userProfilePic"] = "Error uploading file";
                        res.status(500).json(error);
                        return;
                    }
                    yield __1.prisma.phone.create({
                        data: {
                            phoneId: phoneHash,
                            phone: (0, ExpressApp_1.encript)(userPhone, phoneHash),
                            User: {
                                create: {
                                    userId: profileId,
                                    fullName: (0, ExpressApp_1.encript)(fullName, profileId),
                                    userGender: userGender,
                                    userDateOfBirth: userDOBDate,
                                    userNameHash: userNameHash,
                                    isOrganization: isOrganization,
                                    userPassword: crypto.createHash("sha512").update(userPassword).digest("hex"),
                                    userName: (0, ExpressApp_1.encript)(userName, userNameHash),
                                    longitude: (0, ExpressApp_1.encript)("" + longitude, profileId),
                                    latitude: (0, ExpressApp_1.encript)("" + latitude, profileId),
                                    emailId: email.id
                                }
                            }
                        }
                    })
                        .then(() => __awaiter(this, void 0, void 0, function* () {
                        let expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() - 1);
                        yield __1.prisma.email.update({ where: { emailId: email.id }, data: { isVerified: true } });
                        yield __1.prisma.sentMail.deleteMany({ where: { emailId: { equals: email.id }, type: { equals: "signup email" } } });
                        res.cookie("registryEmail", "ok", { expires: new Date() })
                            .cookie("allowFill", "yes", { expires: new Date() })
                            .status(200).json({ message: "User created" });
                    }))
                        .catch((e) => {
                        res.status(500).json({ message: "Internal error creating user" });
                        fs_1.default.unlinkSync(profilePicPath);
                    });
                }));
            }
        }));
    });
    app.patch("/api/user/password", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { prevPassword, newPassword } = req.body;
        if (!prevPassword || !newPassword) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        yield __1.prisma.user.findUnique({ where: { userId: req.userId } }).then((user) => __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                res.status(400).json({ message: "couldnt verify user" });
                return;
            }
            if (user.userPassword !== crypto.createHash("sha512").update(prevPassword).digest("hex")) {
                res.status(400).json({ message: "user old password doesnt match" });
                return;
            }
            yield __1.prisma.user.update({
                where: { userId: req.userId },
                data: {
                    userPassword: crypto.createHash("sha512").update(newPassword).digest("hex")
                }
            })
                .then(() => { res.status(200).json({ message: "password changed successfully" }); })
                .catch(() => { res.status(500).json({ message: "couldnt change password" }); });
        })).catch(() => { res.status(500).json({ message: "couldnt verify user" }); });
    }));
    app.patch("/api/user/password/email", ExpressApp_1.CSRFToken, (req, res) => {
        const { userPassword } = req.body;
        jsonwebtoken_1.default.verify(req.cookies.registryPass, ExpressApp_1.jwtkey, (e, d) => __awaiter(this, void 0, void 0, function* () {
            if (e) {
                res.status(400).json({ message: "error before reset" });
                return;
            }
            yield __1.prisma.user.findFirst({ where: { emailId: { equals: d.emailId } } })
                .then((user) => __awaiter(this, void 0, void 0, function* () {
                if (!user) {
                    res.status(400).json({ message: "No user exists " });
                    return;
                }
                yield __1.prisma.$transaction([
                    __1.prisma.user.update({
                        where: { userId: user.userId },
                        data: {
                            userPassword: crypto.createHash("sha512").update(userPassword).digest("hex")
                        }
                    }),
                    __1.prisma.sentMail.deleteMany({
                        where: {
                            type: { equals: "forgot password" },
                            emailId: { equals: d.emailId }
                        }
                    })
                ]).then(() => {
                    res.status(200).cookie("registryPass", "", { expires: new Date() })
                        .cookie("allowFill", "yes", { expires: new Date() })
                        .json({ message: "Password changed successfully" });
                }).catch(() => {
                    res.status(500).json({ message: "Internal error " });
                });
            })).catch(() => { res.status(500).json({ message: "Internal error " }); });
        }));
    });
    app.delete("/api/user", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const myId = req.userId;
        yield __1.prisma.user.findFirst({
            where: { userId: myId, deletedDate: null }
        }).then((user) => __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                res.status(400).json({ message: "no user" });
                return;
            }
            yield __1.prisma.$transaction([
                __1.prisma.userCommentsItem.deleteMany({ where: { userId: myId } }),
                __1.prisma.userCommentsOnComment.deleteMany({ where: { userId: myId } }),
                __1.prisma.userMessageUser.deleteMany({ where: {
                        OR: [
                            { toUser: myId }, { fromUser: myId }
                        ]
                    } }),
                __1.prisma.userNotification.deleteMany({ where: { userId: myId } }),
                __1.prisma.userRatesUser.deleteMany({ where: { fromUser: myId } }),
                __1.prisma.userReportAdmin.deleteMany({ where: { fromUser: myId } }),
                __1.prisma.userReportUser.deleteMany({ where: { fromUser: myId } }),
                __1.prisma.userReportsItem.deleteMany({ where: { userId: myId } }),
                __1.prisma.userRequestsItem.deleteMany({ where: { userId: myId } }),
                __1.prisma.user.update({
                    where: { userId: myId },
                    data: { deletedDate: new Date() }
                })
            ]).then(() => {
                res.status(200).json({ message: "account deleted wait 7days to reactivate" });
            }).catch(() => {
                res.status(500).json({ message: "internal error eleting acc" });
            });
        })).catch(() => { res.status(500).json({ message: "internal error" }); return; });
    }));
    app.patch("/api/user/userProfilePic", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (0, multer_1.default)({ storage: multer_1.default.memoryStorage() }).single("userProfilePic"), (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (!req.file) {
            res.status(400).json({ message: "no file to update" });
            return;
        }
        else if (!new Set(ExpressApp_1.allowedPicMimeList).has(req.file.mimetype)) {
            res.status(400).json({ message: "invalid format" });
            return;
        }
        else if (req.file.size > ExpressApp_1.fileSizeLimitInBytes) {
            res.status(400).json({ message: "limit Exceeds expectation" });
            return;
        }
        else {
            try {
                let profilePicPath = ExpressApp_1.staticFilesPath + (0, ExpressApp_1.userProfilePicPath)(req.userId);
                (0, sharp_1.default)(req.file.buffer).webp().toFile(profilePicPath, (e, i) => __awaiter(this, void 0, void 0, function* () {
                    if (e) {
                        res.status(500).json({});
                        return;
                    }
                    res.status(200).json({ message: "profile pic changed" });
                }));
            }
            catch (e) {
                res.status(500).json({});
            }
        }
    }));
    app.patch("/api/user/fullName", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { fullName } = req.body;
        const myId = req.userId;
        if (fullName && fullName.length > 3) {
            yield __1.prisma.user.update({
                where: { userId: myId },
                data: { fullName: (0, ExpressApp_1.encript)(fullName, myId) }
            }).then((mydata) => {
                res.status(200).json({
                    message: "Full Name updated",
                    fullName: fullName
                });
            }).catch(() => {
                res.status(500).json({ message: "internal error" });
            });
        }
        else {
            res.status(400).json({ message: "full name not valid or not provided" });
        }
    }));
    app.patch("/api/user/userName", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { userName } = req.body;
        const myId = req.userId;
        if (userName && userName.length > 3) {
            const userNameHash = crypto.createHash("sha512").update(userName).digest("hex");
            if (yield __1.prisma.user.findFirst({ where: { userNameHash: userNameHash } })) {
                res.status(400).json({ message: "common username detected" });
                return;
            }
            yield __1.prisma.user.update({
                where: { userId: myId },
                data: {
                    userNameHash: userNameHash,
                    userName: (0, ExpressApp_1.encript)(userName, userNameHash)
                }
            }).then(() => {
                res.status(200).json({
                    message: "username updated",
                    userName: userName
                });
            }).catch(() => {
                res.status(500).json({ message: "internal error" });
            });
        }
        else {
            res.status(400).json({ message: "user name not valid or not provided" });
        }
    }));
    app.patch("/api/user/userPhone", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { userPhone } = req.body;
        const myId = req.userId;
        if (userPhone) {
            let phoneHash = crypto.createHash("sha512").update(userPhone).digest("hex");
            yield __1.prisma.$transaction([
                __1.prisma.user.findFirst({ where: { userId: myId } }),
                __1.prisma.user.findFirst({ where: { phoneId: phoneHash } })
            ]).then((_a) => __awaiter(this, [_a], void 0, function* ([mydata, commonPhone]) {
                if (!mydata) {
                    res.status(400).json({ message: "cannot find user" });
                    return;
                }
                if (commonPhone) {
                    res.status(400).json({ message: "common phone number found" });
                    return;
                }
                yield __1.prisma.$transaction([
                    __1.prisma.user.update({
                        where: { userId: mydata.userId },
                        data: {
                            Phone: {
                                create: {
                                    phone: (0, ExpressApp_1.encript)(userPhone, phoneHash),
                                    phoneId: phoneHash
                                }
                            }
                        }
                    }),
                    __1.prisma.phone.delete({ where: { phoneId: mydata.phoneId } })
                ], { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable }).then(() => {
                    res.status(200).json({
                        message: "phone number changed",
                        userPhone: userPhone
                    });
                }).catch(() => { res.status(500).json({ message: "internal error" }); });
            })).catch(() => { res.status(500).json({ message: "internal error" }); });
        }
        else {
            res.status(400).json({ message: "no phonenumber found" });
        }
    }));
    app.patch("/api/user/location", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { longitude, latitude } = req.body;
        if (!longitude || !latitude) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        try {
            const userId = req.userId;
            longitude = parseFloat(longitude);
            latitude = parseFloat(latitude);
            if (longitude > 180 || longitude < -180) {
                throw new Error("out of bounds");
            }
            if (latitude > 180 || latitude < -180) {
                throw new Error("out of bounds");
            }
            yield __1.prisma.user.update({
                where: { userId: userId },
                data: {
                    longitude: (0, ExpressApp_1.encript)("" + longitude, userId),
                    latitude: (0, ExpressApp_1.encript)("" + latitude, userId),
                }
            }).then(() => {
                res.status(200).json({ message: "location updated" });
            }).catch(() => {
                res.status(500).json({ message: "internal error" });
            });
        }
        catch (e) {
            res.status(400).json({ message: "error in logitude latitude value" });
        }
    }));
    app.patch("/api/user/reactivate", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        if (!req.cookies.reRegistryEmail) {
            res.status(400).json({ message: "Error putting user register first" });
            return;
        }
        const { newPassword } = req.body;
        if (!newPassword) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        jsonwebtoken_1.default.verify(req.cookies.reRegistryEmail, ExpressApp_1.jwtkey, (e, email) => __awaiter(this, void 0, void 0, function* () {
            if (e) {
                res.status(400).json({ message: "Error verifying registry" });
                return;
            }
            yield __1.prisma.user.findFirst({
                where: {
                    emailId: email,
                    deletedDate: { not: null }
                }
            }).then((user) => __awaiter(this, void 0, void 0, function* () {
                if (!user || !user.deletedDate) {
                    res.status(400).json({ message: "couldnt find user" });
                    return;
                }
                // let expiryDate = new Date()
                // expiryDate.setDate(expiryDate.getDate()-7)
                // if(user.deletedDate>expiryDate){
                //     res.status(400).json({ message: "cant reactivate account immediately wait 7days" });return
                // }
                yield __1.prisma.user.update({
                    where: {
                        emailId: email,
                        deletedDate: { not: null }
                    },
                    data: {
                        userPassword: crypto.createHash("sha512").update(newPassword).digest("hex"),
                        deletedDate: null
                    }
                }).then(() => {
                    res.status(200).json({ message: "Account activated" });
                }).catch(() => {
                    res.status(500).json({ message: "internal error" });
                });
            })).catch(() => {
                res.status(500).json({ message: "internal error" });
            });
        }));
    }));
    app.patch("/api/user/ban", LoginLogout_1.verifyAdmin, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { userId } = req.body;
        let d = new Date();
        d.setMonth(d.getMonth() + 1);
        yield __1.prisma.user.update({
            where: { userId: userId },
            data: {
                unlockTime: d
            }
        }).then(() => {
            res.status(200).json({ message: "user banned" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
}
exports.userPath = userPath;
