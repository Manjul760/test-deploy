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
exports.myRequestListPageDisplayPaths = void 0;
const __1 = require("../..");
const LoginLogout_1 = require("../loginlogout/LoginLogout");
const ExpressApp_1 = require("../../components/ExpressApp");
function myRequestListPageDisplayPaths(app) {
    app.get("/api/myRequestList", LoginLogout_1.verifyUser, (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.userRequestsItem.findMany({
            where: { userId: req.userId },
            include: {
                Item: {
                    include: {
                        ItemMultimedias: true,
                        User: {
                            select: {
                                userId: true,
                                userName: true,
                                userNameHash: true,
                                fullName: true
                            }
                        }
                    }
                }
            }
        })
            .then((requestedItems) => {
            if (!requestedItems) {
                res.status(200).json([]);
                return;
            }
            requestedItems.forEach((request) => {
                request.requestAmount = request.requestAmount.toString();
                request.Item.itemAvilableCount = request.Item.itemAvilableCount.toString();
                request.Item.itemCount = undefined;
                request.userId = undefined;
                request.Item.latitude = undefined;
                request.Item.longitude = undefined;
                request.Item.itemDistrict = (0, ExpressApp_1.decript)(request.Item.itemDistrict, request.Item.itemId);
                request.Item.User.userName = (0, ExpressApp_1.decript)(request.Item.User.userName, request.Item.User.userNameHash);
                request.Item.User.userNameHash = undefined;
                request.Item.User.fullName = (0, ExpressApp_1.decript)(request.Item.User.fullName, request.Item.User.userId);
                request.Item.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(request.Item.User.userId);
                request.Item.ItemMultimedias.forEach((m) => {
                    m.path = (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
                });
            });
            res.status(200).json(requestedItems);
        }).catch(() => { res.status(500).json({ message: "internal error" }); });
    }));
}
exports.myRequestListPageDisplayPaths = myRequestListPageDisplayPaths;
