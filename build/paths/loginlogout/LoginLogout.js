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
exports.verifyAdminLoginToken = exports.verifyUserLoginToken = exports.verifyAdmin = exports.verifyUser = exports.loginLogoutPaths = void 0;
const __1 = require("../..");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ExpressApp_1 = require("../../components/ExpressApp");
function loginLogoutPaths(app) {
    app.post("/api/user/login", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { userEmail, userPassword, rememberMe } = req.body;
        if (!userEmail || !userPassword) {
            res.status(400).json({ message: "Missing fields" });
            return;
        }
        let userEmailHash = crypto_1.default.createHash("sha512").update(userEmail).digest("hex");
        yield __1.prisma.user.findFirst({ where: {
                OR: [
                    { emailId: userEmailHash },
                    { userNameHash: userEmailHash }
                ],
            } }).then((user) => __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                res.status(404).json({ message: "Email does not match" });
                return;
            }
            yield __1.prisma.user.findUnique({ where: {
                    OR: [
                        { emailId: userEmailHash },
                        { userNameHash: userEmailHash }
                    ],
                    deletedDate: null,
                    userPassword: crypto_1.default.createHash("sha512").update(userPassword).digest("hex")
                } })
                .then((u) => {
                if (!u) {
                    res.status(401).json({ message: "Incorrect password" });
                    return;
                }
                let presentDate = new Date().getTime() + "";
                let identifier = crypto_1.default.randomUUID();
                let OrgOrUser = u.isOrganization ? "O" : "U";
                let signedData = jsonwebtoken_1.default.sign({
                    userId: u.userId,
                    identity: identifier,
                    loginDate: presentDate,
                    orgOrUser: OrgOrUser
                }, ExpressApp_1.jwtkey);
                if (u.unlockTime && new Date(u.unlockTime) > new Date()) {
                    res.status(401).json({ message: "User Banned" });
                    return;
                }
                let expiryDate = rememberMe ? new Date(new Date().setFullYear(new Date().getFullYear() + 1000)) : undefined;
                res.status(200)
                    .cookie("user", signedData, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                    .cookie("LI", identifier, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                    .cookie("_LD", presentDate, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                    .cookie("_DIU_", u.userId, { sameSite: "strict", expires: expiryDate })
                    .cookie("isLoggedIn", "true", { sameSite: "strict", expires: expiryDate })
                    .cookie("OU", OrgOrUser, { sameSite: "strict", expires: expiryDate })
                    .json({ message: "User logged in" });
            }).catch(() => { res.status(500).json({ message: "Internal error" }); });
        }));
    }));
    app.post("/api/admin/login", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { userEmail, userPassword, rememberMe } = req.body;
        if (userEmail == "SabaiShare69" && userPassword == "SabaiShare69") {
            let presentDate = new Date().getTime() + "";
            let identifier = crypto_1.default.randomUUID();
            let OrgOrUser = "U";
            let signedData = jsonwebtoken_1.default.sign({
                userId: "admin",
                identity: identifier,
                loginDate: presentDate,
                orgOrUser: OrgOrUser
            }, ExpressApp_1.jwtkey);
            let expiryDate = rememberMe ? new Date(new Date().setFullYear(new Date().getFullYear() + 1000)) : undefined;
            res.status(200)
                .cookie("_DIU_", "", { sameSite: "strict", expires: new Date() })
                .cookie("user", signedData, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                .cookie("LI", identifier, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                .cookie("_LD", presentDate, { httpOnly: true, sameSite: "strict", expires: expiryDate })
                .cookie("isLoggedIn", "true", { sameSite: "strict", expires: expiryDate })
                .cookie("OU", OrgOrUser, { sameSite: "strict", expires: expiryDate })
                .json({ message: "User logged in" });
        }
        else {
            res.sendStatus(404);
        }
    }));
    app.post("/api/user/logout", ExpressApp_1.CSRFToken, (req, res) => {
        let presentDate = new Date();
        res.status(200)
            .cookie("user", "", { httpOnly: true, sameSite: "strict", expires: presentDate })
            .cookie("LI", "", { httpOnly: true, sameSite: "strict", expires: presentDate })
            .cookie("_LD", "", { httpOnly: true, sameSite: "strict", expires: presentDate })
            .cookie("_DIU_", "", { sameSite: "strict", expires: presentDate })
            .cookie("isLoggedIn", "", { sameSite: "strict", expires: presentDate })
            .cookie("OU", "", { sameSite: "strict", expires: presentDate })
            .json({ message: "User logged out" });
    });
}
exports.loginLogoutPaths = loginLogoutPaths;
function verifyUser(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        yield verifyUserLoginToken(req).then(() => {
            next();
        }).catch((message) => {
            res.status(403).json({ message: message });
        });
    });
}
exports.verifyUser = verifyUser;
function verifyAdmin(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        yield verifyAdminLoginToken(req).then(() => {
            next();
        }).catch((message) => {
            res.status(403).json({ message: message });
        });
    });
}
exports.verifyAdmin = verifyAdmin;
function verifyUserLoginToken(req) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        if (!req.cookies || !req.cookies.user) {
            reject("no user");
            return;
        }
        jsonwebtoken_1.default.verify(req.cookies.user, ExpressApp_1.jwtkey, (e, d) => __awaiter(this, void 0, void 0, function* () {
            if (e) {
                reject("login error");
                return;
            }
            const { LI, _LD, isLoggedIn, OU, _DIU_ } = req.cookies;
            if (!(yield __1.prisma.user.findFirst({
                where: {
                    userId: _DIU_,
                    deletedDate: null,
                    OR: [
                        { unlockTime: null },
                        { unlockTime: { lte: new Date() } }
                    ],
                }
            }))) {
                reject("no user");
                return;
            }
            let data = d;
            if ((_DIU_ && LI && _LD && isLoggedIn && OU) &&
                _DIU_ === data.userId &&
                data.identity === LI &&
                data.loginDate === _LD &&
                isLoggedIn === "true" &&
                data.orgOrUser === OU) {
                req.userId = data.userId;
                req.isOrg = data.orgOrUser === "O";
                resolve(true);
            }
            else {
                reject("error verifying user");
            }
        }));
    }));
}
exports.verifyUserLoginToken = verifyUserLoginToken;
function verifyAdminLoginToken(req) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        if (!req.cookies || !req.cookies.user) {
            reject("no user");
            return;
        }
        jsonwebtoken_1.default.verify(req.cookies.user, ExpressApp_1.jwtkey, (e, d) => __awaiter(this, void 0, void 0, function* () {
            if (e) {
                reject("login error");
                return;
            }
            const { LI, _LD, isLoggedIn, OU } = req.cookies;
            let data = d;
            if ((LI && _LD && isLoggedIn && OU) &&
                "admin" === data.userId &&
                data.identity === LI &&
                data.loginDate === _LD &&
                isLoggedIn === "true" &&
                data.orgOrUser === OU) {
                req.userId = "admin";
                resolve(true);
            }
            else {
                reject("error verifying user");
            }
        }));
    }));
}
exports.verifyAdminLoginToken = verifyAdminLoginToken;
// export function allowOrgsOnly(req:any,res:any,next:NextFunction){
//     if(req.isOrg && req.isOrg==="O"){next()}
//     else{
//         res.status(403).json({message:"only for orgs"})
//     }
// }
// export function allowUsersOnly(req:any,res:any,next:NextFunction){
//     if(req.isOrg && req.isOrg==="O"){next()}
//     else{
//         res.status(403).json({message:"only for users"})
//     }
// }
// export function onlyLocalHostOnly(req:any,res:any,next:NextFunction){
//     cors({
//         origin:process.env.DOMAIN_NAME,
//         credentials:true
//     })(req,res,next)
// }
