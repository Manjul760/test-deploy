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
exports.wsNotificaionProfilePage = exports.wsNotificationItemPage = exports.wsNotificationUser = exports.closeWebSocket = exports.createWebSocket = exports.activeWebSocketUserList = void 0;
const ws_1 = __importDefault(require("ws"));
const cookie_1 = require("cookie");
const LoginLogout_1 = require("../paths/loginlogout/LoginLogout");
const __1 = require("..");
exports.activeWebSocketUserList = {};
let wss = undefined;
function createWebSocket(server) {
    if (wss) {
        return wss;
    }
    wss = new ws_1.default.Server({ server });
    wss.on("connection", (ws, req) => __awaiter(this, void 0, void 0, function* () {
        var _a;
        req.cookies = req.headers.cookie ? (0, cookie_1.parse)(req.headers.cookie) : undefined;
        var userId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a._DIU_;
        var sessionId = crypto.randomUUID();
        (0, LoginLogout_1.verifyUserLoginToken)(req)
            .then(() => {
            if (!exports.activeWebSocketUserList[userId]) {
                exports.activeWebSocketUserList[userId] = {};
            }
            exports.activeWebSocketUserList[userId][sessionId] = ws;
        })
            .catch(() => { });
        // // for(const k in activeWebSocketUserList){console.log(k)}
        ws.on("message", (payload) => __awaiter(this, void 0, void 0, function* () {
            try {
                let data = JSON.parse(payload.toString());
                // console.log(data)
                if (data.responseType == "Subscription") {
                    ws.subscriptionPage = data.page;
                    if (data.page === "Item") {
                        ws.subscribedItemId = data.objectId;
                        yield __1.prisma.item.findFirst({
                            where: { itemId: data.objectId },
                            select: { userId: true }
                        }).then((item) => { ws.subscribedUserId = item === null || item === void 0 ? void 0 : item.userId; });
                    }
                    else {
                        ws.subscribedUserId = data.objectId;
                    }
                }
                else if (data.responseType === "Unsubscribe") {
                    ws.subscriptionPage = undefined;
                    ws.subscribedItemId = undefined;
                    ws.subscribedUserId = undefined;
                }
                else if (data.responseType === "Notification Read" && req.userId) {
                    if (typeof data.notificationId === "string") {
                        __1.prisma.userNotification.update({
                            where: { notificationId: data.notificationId },
                            data: { seen: new Date() }
                        });
                    }
                    else {
                        __1.prisma.userNotification.updateMany({
                            where: { notificationId: { in: data.notificationId } },
                            data: { seen: new Date() }
                        });
                    }
                }
                else if (data.responseType === "Read Message" && req.userId) {
                    if (typeof data.messageId === "string") {
                        __1.prisma.userMessageUser.update({
                            where: { userMessageId: data.messageId },
                            data: { seen: new Date() }
                        });
                    }
                    else {
                        __1.prisma.userMessageUser.updateMany({
                            where: { userMessageId: { in: data.messageId } },
                            data: { seen: new Date() }
                        });
                    }
                }
            }
            catch (e) {
                console.log("error in web socket");
            }
        }));
        ws.on("close", () => {
            sessionId = undefined;
            ws.subscribedItemId = undefined;
            ws.subscribedUserId = undefined;
            ws.subscriptionPage = undefined;
            if (userId) {
                if (exports.activeWebSocketUserList && Object.keys(exports.activeWebSocketUserList[userId]).length == 0) {
                    delete exports.activeWebSocketUserList[userId][sessionId];
                    delete exports.activeWebSocketUserList[userId];
                }
                else {
                    delete exports.activeWebSocketUserList[userId][sessionId];
                }
            }
            // console.log("closed")
        });
    }));
    return wss;
}
exports.createWebSocket = createWebSocket;
function closeWebSocket() {
    if (!wss) {
        return;
    }
    wss.close();
}
exports.closeWebSocket = closeWebSocket;
function wsNotificationUser(eventList) {
    const presentDate = new Date().getTime();
    eventList.forEach((event) => __awaiter(this, void 0, void 0, function* () {
        if (!event.toUser) {
            return;
        }
        if (!exports.activeWebSocketUserList[event.toUser]) {
            return;
        }
        event.dispatchDate = presentDate;
        Object.keys(exports.activeWebSocketUserList[event.toUser]).forEach((sessionId) => {
            if (!exports.activeWebSocketUserList[event.toUser][sessionId]) {
                return;
            }
            exports.activeWebSocketUserList[event.toUser][sessionId].send(JSON.stringify(event));
        });
    }));
}
exports.wsNotificationUser = wsNotificationUser;
function wsNotificationItemPage(event) {
    let presentDate = new Date().getTime();
    wss === null || wss === void 0 ? void 0 : wss.clients.forEach((client) => {
        if (client.subscriptionPage !== "Item") {
            return;
        }
        if ('itemId' in event && event.itemId !== event.itemId) {
            return;
        }
        if ('userId' in event && event.userId !== event.userId) {
            return;
        }
        if (client.readyState === client.OPEN) {
            event.dispatchDate = presentDate;
            client.send(JSON.stringify(event));
        }
    });
}
exports.wsNotificationItemPage = wsNotificationItemPage;
function wsNotificaionProfilePage(event) {
    let presentDate = new Date().getTime();
    wss === null || wss === void 0 ? void 0 : wss.clients.forEach((client) => {
        if (client.subscriptionPage !== "Profile" || client.subscribedUserId !== event.userId) {
            return;
        }
        if (client.readyState === client.OPEN) {
            event.dispatchDate = presentDate;
            client.send(JSON.stringify(event));
        }
    });
}
exports.wsNotificaionProfilePage = wsNotificaionProfilePage;
