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
exports.careerPaths = void 0;
const ExpressApp_1 = require("../../../components/ExpressApp");
const __1 = require("../../..");
function careerPaths(app) {
    app.get("/api/career/:careerId", (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { careerId } = req.params;
        yield __1.prisma.career.findFirst({
            where: { careerId: careerId }
        }).then((c) => {
            if (!c) {
                res.status(404).json({ message: "no such career" });
                return;
            }
            res.status(200).json(c);
        }).catch(() => {
            res.status(500).json({ message: "Internal error" });
        });
    }));
    app.delete("/api/career", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { careerId } = req.body;
        yield __1.prisma.career.delete({ where: { careerId: careerId } })
            .then(() => {
            res.status(200).json({ message: "career deleted" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
    app.delete("/api/career/all", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        yield __1.prisma.career.deleteMany()
            .then(() => {
            res.status(200).json({ message: "careers deleted" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
    app.put("/api/career", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { jobTitle, natureOfJob, jobLocation, jobType, jobDescription, jobRequirements, jobBenefits } = req.body;
        let d = new Date();
        d.setDate(d.getDate() - 1);
        yield __1.prisma.career.create({
            data: {
                jobBenefits: jobBenefits,
                jobDescription: jobDescription,
                jobLocation: jobLocation,
                jobRequirements: jobRequirements,
                jobTitle: jobTitle,
                jobType: jobType,
                natureOfJob: natureOfJob,
            }
        }).then(() => {
            res.status(200).json({ message: "feedback Provided" });
        }).catch(() => {
            res.status(500).json({ message: "internal error" });
        });
    }));
}
exports.careerPaths = careerPaths;
