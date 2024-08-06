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
exports.profilePageDisplayPaths = void 0;
const __1 = require("../..");
const ExpressApp_1 = require("../../components/ExpressApp");
const crypto_1 = __importDefault(require("crypto"));
function profilePageDisplayPaths(app) {
    app.get("/api/profile/:userId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.user.findFirst({
            where: {
                OR: [
                    { userId: req.params.userId },
                    { userNameHash: crypto_1.default.createHash("sha512").update(req.params.userId).digest("hex") }
                ],
            },
            select: {
                userId: true,
                userName: true,
                userNameHash: true,
                fullName: true
            }
        }).then((user) => __awaiter(this, void 0, void 0, function* () {
            if (!user) {
                res.status(404).json({ message: "No user Found" });
                return;
            }
            let rating = yield __1.prisma.userRatesUser.aggregate({
                where: {
                    toUser: req.params.userId
                },
                _count: true,
                _avg: { star: true }
            });
            let displayUser = user;
            displayUser.fullName = (0, ExpressApp_1.decript)(displayUser.fullName, displayUser.userId);
            displayUser.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(displayUser.userId);
            displayUser.userName = (0, ExpressApp_1.decript)(displayUser.userName, displayUser.userNameHash),
                displayUser.userNameHash = undefined;
            displayUser.rating = rating._avg.star;
            displayUser.reviewCount = rating._count;
            res.status(200).json(displayUser);
        }));
    }));
    app.get("/api/profile/ItemList/:userId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.user.findFirst({
            where: {
                OR: [
                    { userId: req.params.userId },
                    { userNameHash: crypto_1.default.createHash("sha512").update(req.params.userId).digest("hex") }
                ],
            },
            include: {
                CreatedItems: {
                    include: {
                        ItemMultimedias: true
                    }
                }
            }
        }).then((user) => {
            if (!user) {
                res.status(404).json({ message: "no user found" });
                return;
            }
            let data = user.CreatedItems;
            let displayData = [];
            data.forEach((item) => {
                item.ItemMultimedias.forEach((m) => {
                    m.path = (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
                });
                item.itemDistrict = item.itemDistrict;
                let itemAvilableCount = item.itemAvilableCount.toString();
                displayData.push(Object.assign(Object.assign({}, item), { latitude: undefined, longitude: undefined, itemAvilableCount: itemAvilableCount.toString(), itemCount: undefined }));
            });
            res.status(200).json(displayData);
        });
    }));
}
exports.profilePageDisplayPaths = profilePageDisplayPaths;
