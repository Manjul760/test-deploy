"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const ExpressApp_1 = require("./components/ExpressApp");
const WebSocet_1 = require("./components/WebSocet");
exports.prisma = new client_1.PrismaClient();
const app = (0, ExpressApp_1.ExpressApp)();
const http_1 = __importDefault(require("http"));
const server = http_1.default.createServer(app);
// //incase ya want a https
// import fs from "fs"
// import https from "https"
// const server = https.createServer({
//     key: fs.readFileSync('keypath'),
//     cert: fs.readFileSync('certificate path'),
// }, app)
const wss = (0, WebSocet_1.createWebSocket)(server); //initialization not needed but just incase
server.listen(process.env.SERVER_PORT, () => { console.log("Server Running"); });
server.on("close", () => {
    exports.prisma.$disconnect();
    (0, WebSocet_1.closeWebSocket)();
});
