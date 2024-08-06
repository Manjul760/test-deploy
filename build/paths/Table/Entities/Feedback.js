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
exports.feedbackPath = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const __1 = require("../../..");
const crypto_1 = require("crypto");
function feedbackPath(app) {
    app.delete("/api/feedback", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { feedbackId } = req.body;
        yield __1.prisma.feedback.delete({ where: { feedbackId: feedbackId } })
            .then(() => {
            res.status(200).json({ message: "feedback deleted" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
    app.delete("/api/feedback/all", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.feedback.deleteMany()
            .then(() => {
            res.status(200).json({ message: "feedbacks deleted" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
    app.put("/api/feedback", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { name, email, description } = req.body;
        let d = new Date();
        d.setDate(d.getDate() - 1);
        yield __1.prisma.feedback.findMany({ where: {
                postedDate: { gt: d }
            } }).then((f) => __awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < f.length; index++) {
                if ((0, ExpressApp_1.decript)(f[index].email, f[index].feedbackId) == email) {
                    res.status(400).json({ message: "Cannot provide multiple feedback in 1 day" });
                    return;
                }
            }
            let uniqueId = (0, crypto_1.randomUUID)();
            yield __1.prisma.feedback.create({
                data: {
                    email: (0, ExpressApp_1.encript)(email, uniqueId),
                    feedbackId: uniqueId,
                    description: description,
                    name: (0, ExpressApp_1.encript)(name, uniqueId)
                }
            }).then(() => {
                res.status(200).json({ message: "feedback Provided" });
            });
        })).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
}
exports.feedbackPath = feedbackPath;
