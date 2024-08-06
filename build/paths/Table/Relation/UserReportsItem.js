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
exports.userReportsItemPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
function userReportsItemPaths(app) {
    app.put("/api/userReportsItem", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { itemId, purpose, description } = req.body;
        if (!itemId) {
            res.status(400).json({ message: "what to report?" });
            return;
        }
        if (!purpose || !description) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        const userId = req.userId;
        yield __1.prisma.userReportsItem.create({
            data: {
                userId: userId,
                description: description,
                purpose: purpose,
                itemId: itemId
            }
        }).then((userReportsItem) => {
            if (!userReportsItem) {
                res.status(500).json({ message: "couldnt report item" });
            }
            res.status(200).json({ message: "reported successfully" });
        }).catch(() => { res.status(500).json({ message: "couldnt report item" }); });
    }));
    app.delete("/api/userReportsItem", LoginLogout_1.verifyAdmin, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { itemReportId } = req.body;
        yield __1.prisma.userReportsItem.delete({
            where: { itemReportId: itemReportId }
        }).then(() => {
            res.status(200).json({ message: "report deleted" });
        }).catch(() => {
            res.status(500).json({ message: "error deleting report" });
        });
    }));
}
exports.userReportsItemPaths = userReportsItemPaths;
