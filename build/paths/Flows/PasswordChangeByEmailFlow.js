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
exports.passwordChangeByEmail = void 0;
const __1 = require("../..");
const Resources_1 = require("../../components/Resources");
const ExpressApp_1 = require("../../components/ExpressApp");
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function passwordChangeByEmail(app) {
    app.post("/api/email/forgot/password", ExpressApp_1.CSRFToken, (req, res) => __awaiter(this, void 0, void 0, function* () {
        const { userEmail } = req.body;
        let uniqueId = crypto_1.default.createHash("sha512").update(req.body.userEmail).digest("hex");
        if (!(yield __1.prisma.user.findFirst({ where: { emailId: { equals: uniqueId } } }))) {
            res.status(404).json({ message: "user doesnt exist" });
            return;
        }
        let OTP = "";
        for (let index = 0; index < 6; index++) {
            OTP += Math.floor(Math.random() * 10);
        }
        let mailId = crypto_1.default.createHash("sha512").update(crypto_1.default.randomUUID()).digest("hex");
        let mailValue = crypto_1.default.createHash("sha512").update(OTP).digest("hex");
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - 1);
        let totalSentEmail = yield __1.prisma.sentMail.findMany({ where: {
                emailId: { equals: uniqueId },
                sentDate: { gt: expiryDate },
                type: { equals: "forgot password" }
            } });
        if (totalSentEmail.filter(sm => sm.isSent).length > 2 ||
            totalSentEmail.filter(sm => !sm.isSent).length > 4) {
            res.status(403).json({ message: "Too many signup requests" });
            return;
        }
        yield __1.prisma.sentMail.create({ data: {
                mailId: mailId,
                emailId: uniqueId,
                value: mailValue,
                type: "forgot password"
            } })
            .then(() => {
            (0, Resources_1.sendMail)({ to: userEmail, title: "SabaiShare (Password Reset Link)", body: `
            <h1>Hello from Sabaishare</h1>

            <h3><a href="${req.protocol}://${req.get("host")}/api/user/reset/password/email/${mailId}/${mailValue}">Here is the link to reset password</a></h3>
            
            <span style="color:red">Note: This email expires in 1day.</span>
    
            ` })
                .then(() => __awaiter(this, void 0, void 0, function* () {
                yield __1.prisma.sentMail.update({ where: { mailId: mailId }, data: { isSent: true } });
                res.status(200).json({ message: "email sent and registered" });
            }))
                .catch(() => { res.status(500).json({ message: "counldnt send email" }); });
        })
            .catch(() => { res.status(500).json({ message: "counldnt register email" }); });
    }));
    app.get("/api/user/reset/password/email/:mailId/:mailValue", (req, res) => __awaiter(this, void 0, void 0, function* () {
        let expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - 1);
        yield __1.prisma.sentMail.findFirst({ where: {
                mailId: { equals: req.params.mailId },
                value: { equals: req.params.mailValue },
                isSent: { equals: true },
                type: { equals: "forgot password" },
                sentDate: { gt: expiryDate }
            } }).then((sentMail) => {
            if (!sentMail) {
                res.status(404).json({ message: "No reset link found" });
                return;
            }
            res.cookie("registryPass", jsonwebtoken_1.default.sign({ id: sentMail.emailId }, ExpressApp_1.jwtkey), { httpOnly: true, sameSite: "strict" })
                .cookie("allowFill", "yes")
                .status(200)
                .redirect(`${req.protocol}://${req.get("host")}/form/PasswordChangeByEmail`);
        }).catch(e => { res.status(500).json({ message: "Internal error verifying registry" }); });
    }));
    // "/api/user/password/email" with user password look in user
}
exports.passwordChangeByEmail = passwordChangeByEmail;
