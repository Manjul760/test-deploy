import { PrismaClient } from "@prisma/client"
import { ExpressApp } from "./components/ExpressApp"
import { closeWebSocket, createWebSocket } from "./components/WebSocet";


export const prisma = new PrismaClient();
const app = ExpressApp()

import http from "http"
const server = http.createServer(app)

// //incase ya want a https
// import fs from "fs"
// import https from "https"
// const server = https.createServer({
//     key: fs.readFileSync('keypath'),
//     cert: fs.readFileSync('certificate path'),
// }, app)


const wss = createWebSocket(server) //initialization not needed but just incase

server.listen(process.env.SERVER_PORT, () => { console.log("Server Running") })
server.on("close", () => {
    prisma.$disconnect()
    closeWebSocket()
})

