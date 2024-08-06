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
exports.decript = exports.encript = exports.fileSizeLimitInBytes = exports.allowedPicMimeList = exports.itemMultimediasStaticPath = exports.userProfilePicsStaticPath = exports.serverStaticPath = exports.staticFilesPath = exports.templateFilesPath = exports.itemMultimediaPath = exports.userProfilePicPath = exports.ExpressApp = exports.CSRFToken = exports.jwtkey = exports.sessionsecret = void 0;
const crypto = __importStar(require("crypto"));
const express_1 = __importDefault(require("express"));
// import session = require("express-session")
const cors = require("cors");
// const MySQLStore = require("express-mysql-session")(session)
const paths_1 = require("../paths/paths");
const multer = require("multer");
const fs_1 = __importDefault(require("fs"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const __1 = require("..");
let app = undefined;
exports.sessionsecret = crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex");
exports.jwtkey = crypto.createHash("sha256").update("sabaishare 2024 ∞").digest("hex");
function tokenHash(path, method, expiryDate, reqIp, agent, tokenId) {
    return crypto
        .createHash("sha256")
        .update(`path[${path}] ∞ 
            method:${method}
            expiryDate=${expiryDate} ∞ 
            reqIp:${reqIp} ,
            user:${agent}
            tokenId:${tokenId}`)
        .digest("hex");
}
function CSRFTokenCreation(req, res, path, method) {
    let expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 15);
    let expiryDateString = expiryDate.toISOString();
    let tokenId = crypto.randomUUID();
    return {
        token: tokenHash(path, method, expiryDateString, req.ip, req.get("User-Agent"), tokenId),
        expiryDate: expiryDateString,
        tokenId: tokenId
    };
}
function CSRFToken(req, res, next) {
    if (req.headers["request-purpose"] === "token") {
        res.status(200).json(CSRFTokenCreation(req, res, req.path, req.method));
    }
    else if (req.headers["request-purpose"] === "submit") {
        const { expirydate, tokenid, token } = req.headers;
        if (!expirydate || !tokenid || !token) {
            res.sendStatus(404);
        }
        else if (new Date(expirydate) < new Date()) {
            res.status(403).json({ message: "token expired" });
        }
        else if (token === tokenHash(req.path, req.method, expirydate, req.ip, req.get("User-Agent"), tokenid)) {
            next();
        }
        else {
            res.status(403).json({ message: "invalid token" });
        }
    }
    else {
        res.status(403).json({ message: "header error" });
    }
}
exports.CSRFToken = CSRFToken;
function ExpressApp() {
    if (app) {
        return app;
    }
    [
        exports.staticFilesPath,
        exports.staticFilesPath + exports.serverStaticPath,
        exports.staticFilesPath + exports.userProfilePicsStaticPath,
        exports.staticFilesPath + exports.itemMultimediasStaticPath
    ].forEach((path) => {
        if (!fs_1.default.existsSync(path)) {
            fs_1.default.mkdirSync(path);
        }
    });
    app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(require("cookie-parser")());
    app.use(cors({
        credentials: true,
        // origin:"http://localhost:5173" //for testing purpose later noneed
        // origin:"http://192.168.1.71:5173" //for testing purpose later noneed
    }));
    // app.use(session({
    //     cookie: {httpOnly: true, maxAge: 1800000 },
    //     secret: sessionsecret,
    //     saveUninitialized: false,
    //     resave: false,
    //     store: new MySQLStore({
    //         host: process.env.DATABASE_HOST,
    //         port: process.env.DATABASE_PORT,
    //         user: process.env.DATABASE_USER,
    //         password: process.env.DATABASE_PASS,
    //         database: process.env.DATABASE_NAME
    //     })
    // }))
    app.use(express_1.default.static(exports.staticFilesPath));
    app.use(express_1.default.static("./build-frontend"));
    app.set('views', exports.templateFilesPath);
    app.set('view engine', 'ejs');
    paths_1.websitePaths.forEach((path) => { path(app); });
    app.use((err, req, res, next) => {
        if (err instanceof multer.MulterError) {
            res.status(400).json({ message: "File error: " + err.message });
        }
        else {
            res.status(500).send('Internal server error');
        }
    });
    app.get("/item/:itemId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.item.findFirst({
            where: {
                itemId: req.params.itemId,
                revokedDate: null,
                discontinuedDate: null
            },
            include: {
                ItemMultimedias: {
                    where: {
                        type: { equals: "image" }
                    }
                }
            }
        }).then((item) => {
            if (!item) {
                res.status(200).redirect("/");
                return;
            }
            let randomindex = Math.floor(Math.random() * item.ItemMultimedias.length);
            let multimedia = item.ItemMultimedias.find((v, i) => i === randomindex);
            if (!multimedia) {
                res.status(200).redirect("/");
                return;
            }
            let baseurl = req.get("host");
            res.status(200).render("index/item", {
                baseurl: baseurl,
                itemName: item.itemName,
                itemPicPath: baseurl + itemMultimediaPath(multimedia.multimediaId, multimedia.extension),
                itemurl: baseurl + "/item/" + item.itemId,
                itemDescription: item.itemDescription
            });
        }).catch(() => { res.status(500).json({ message: "internal error" }); });
    }));
    app.get(["/", "index.html", "/*", "*"], (req, res) => { res.status(200).render("index/normal", { baseurl: req.get("host") }); });
    return app;
}
exports.ExpressApp = ExpressApp;
//always start with / other wise get error
function userProfilePicPath(userId) { return `${exports.userProfilePicsStaticPath}/${userId}.webp`; }
exports.userProfilePicPath = userProfilePicPath;
function itemMultimediaPath(multimediaId, ext) {
    return `${exports.itemMultimediasStaticPath}/${multimediaId}.${ext}`;
}
exports.itemMultimediaPath = itemMultimediaPath;
exports.templateFilesPath = "./templates";
exports.staticFilesPath = "./static";
exports.serverStaticPath = "/serverImages";
exports.userProfilePicsStaticPath = "/serverImages/UserProfilePics";
exports.itemMultimediasStaticPath = "/serverImages/ItemMultimedias";
exports.allowedPicMimeList = ["image/jpg", "image/jpeg", "image/png", "image/heic", "image/webp"];
exports.fileSizeLimitInBytes = 5 * 1024 * 1024;
function encript(v, k) {
    return crypto_js_1.default.AES.encrypt(v, k).toString();
}
exports.encript = encript;
function decript(v, k) {
    return crypto_js_1.default.AES.decrypt(v, k).toString(crypto_js_1.default.enc.Utf8);
}
exports.decript = decript;
