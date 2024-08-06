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
exports.postedItemsDisplayPaths = void 0;
const __1 = require("../..");
const ExpressApp_1 = require("../../components/ExpressApp");
function postedItemsDisplayPaths(app) {
    app.get("/api/postedItem/itemList/category/:category/district/:district/count/:limit/pageno/:pageNumber", (req, res) => __awaiter(this, void 0, void 0, function* () {
        let limit;
        let pageNumber;
        try {
            limit = parseInt(req.params.limit);
            pageNumber = parseInt(req.params.pageNumber);
            if (limit < 0 || pageNumber < 0 || isNaN(limit) || isNaN(pageNumber)) {
                throw new Error("out of bounds");
            }
        }
        catch (e) {
            limit = 100;
            pageNumber = 0;
        }
        let whereFilter = {};
        if (req.params.category && req.params.category !== "null") {
            whereFilter["category"] = { equals: req.params.category };
        }
        if (req.params.district && req.params.district !== "null") {
            whereFilter["itemDistrict"] = { equals: req.params.district };
        }
        let data = yield __1.prisma.item.findMany({
            where: Object.assign(Object.assign({}, whereFilter), { discontinuedDate: { equals: null }, revokedDate: { equals: null } }),
            include: {
                ItemMultimedias: true,
                ItemRequests: {
                    orderBy: { requestedDate: "asc" },
                    include: {
                        User: {
                            select: {
                                userId: true,
                                userName: true,
                                userNameHash: true,
                                fullName: true,
                                Phone: {
                                    select: {
                                        phone: true,
                                        phoneId: true
                                    }
                                }
                            }
                        }
                    }
                },
            },
            take: limit,
            skip: limit * pageNumber
        });
        let displayData = [];
        data.forEach((item) => {
            item.ItemMultimedias.forEach((m) => {
                m.path = (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
            });
            let itemAvilableCount = item.itemAvilableCount.toString();
            item.ItemRequests.forEach((request) => {
                request.requestAmount = request.requestAmount.toString();
                request.itemId = undefined;
                request.User.userName = (0, ExpressApp_1.decript)(request.User.userName, request.User.userNameHash);
                request.User.fullName = (0, ExpressApp_1.decript)(request.User.fullName, request.User.userId);
                request.User.profilePicPath = (0, ExpressApp_1.userProfilePicPath)(request.User.userId);
                request.User.userNameHash = undefined;
                if (request.acceptedDate) {
                    request.User.phoneNumber = (0, ExpressApp_1.decript)(request.User.Phone.phone, request.User.Phone.phoneId);
                }
                request.User.Phone = undefined;
            });
            displayData.push(Object.assign(Object.assign({}, item), { latitude: undefined, longitude: undefined, itemAvilableCount: itemAvilableCount, itemCount: undefined }));
        });
        res.status(200).json(displayData);
    }));
}
exports.postedItemsDisplayPaths = postedItemsDisplayPaths;
