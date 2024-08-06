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
exports.homePageDisplayPaths = void 0;
const __1 = require("../..");
const ExpressApp_1 = require("../../components/ExpressApp");
function homePageDisplayPaths(app) {
    app.get("/api/itemList/category/:category/district/:district/count/:limit/pageno/:pageNumber/text/:text?", (req, res) => __awaiter(this, void 0, void 0, function* () {
        let limit;
        let pageNumber;
        try {
            limit = parseInt(req.params.limit);
            pageNumber = parseInt(req.params.pageNumber);
            if (pageNumber < 0 || limit < 1) {
                throw new Error("limit too low");
            }
        }
        catch (e) {
            limit = 100;
            pageNumber = 0;
        }
        let whereFilter = {};
        if (req.params.category && req.params.category !== "All") {
            whereFilter["category"] = { contains: req.params.category };
        }
        if (req.params.district && req.params.district !== "All") {
            whereFilter["itemDistrict"] = { contains: req.params.district };
        }
        if (req.params.text) {
            whereFilter["itemName"] = { contains: req.params.text };
        }
        if (req.cookies._DIU_) {
            whereFilter["userId"] = { not: req.cookies._DIU_ };
        }
        yield __1.prisma.item.findMany({
            where: Object.assign(Object.assign({}, whereFilter), { itemAvilableCount: { gt: 0 }, discontinuedDate: { equals: null }, revokedDate: { equals: null }, User: {
                    OR: [
                        { unlockTime: null },
                        { unlockTime: { lte: new Date() } }
                    ],
                } }),
            orderBy: { createdDate: "desc" },
            include: {
                ItemMultimedias: true
            },
            take: limit,
            skip: limit * pageNumber
        }).then((data) => {
            if (!data) {
                res.status(404).json({ message: "nodata" });
                return;
            }
            res.status(200).json(data.map((item) => {
                item.ItemMultimedias.forEach((m) => {
                    m.path = (0, ExpressApp_1.itemMultimediaPath)(m.multimediaId, m.extension);
                });
                let itemAvilableCount = item.itemAvilableCount.toString();
                return Object.assign(Object.assign({}, item), { latitude: undefined, longitude: undefined, itemAvilableCount: itemAvilableCount.toString(), itemCount: undefined });
            }));
        }).catch((e) => {
            console.log(e);
            res.status(500).json({ message: "internal error" });
        });
    }));
}
exports.homePageDisplayPaths = homePageDisplayPaths;
