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
exports.userReportUserPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const LoginLogout_1 = require("../../loginlogout/LoginLogout");
const __1 = require("../../..");
function userReportUserPaths(app) {
    app.put("/api/userReportUser", LoginLogout_1.verifyUser, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        let { toUser, purpose, description } = req.body;
        if (!toUser) {
            res.status(400).json({ message: "whom to report?" });
            return;
        }
        if (!purpose || !description) {
            res.status(400).json({ message: "missing fields" });
            return;
        }
        const userId = req.userId;
        if (toUser === userId && !process.env.DEVELOPMENT) {
            res.status(400).json({ message: "cannot report self" });
            return;
        }
        yield __1.prisma.userReportUser.create({
            data: {
                fromUser: userId,
                toUser: toUser,
                description: description,
                purpose: purpose
            }
        }).then((userReportUser) => {
            if (!userReportUser) {
                res.status(500).json({ message: "couldnt report user" });
            }
            res.status(200).json({ message: "reportd successfully" });
        }).catch(() => { res.status(500).json({ message: "couldnt report user" }); });
    }));
    app.delete("/api/userReportUser", LoginLogout_1.verifyAdmin, ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { userReportId } = req.body;
        yield __1.prisma.userReportUser.delete({
            where: { userReportId: userReportId }
        }).then(() => {
            res.status(200).json({ message: "report deleted" });
        }).catch(() => {
            res.status(500).json({ message: "error deleting report" });
        });
    }));
}
exports.userReportUserPaths = userReportUserPaths;
