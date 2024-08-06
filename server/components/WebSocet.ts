import http  from "http"
import WebSocket from "ws"
import {parse} from "cookie"
import { userLoginCookieFormat, verifyUserLoginToken } from "../paths/loginlogout/LoginLogout"
import { prisma } from ".."



export const activeWebSocketUserList:{[userId:string]: {[sessionId:string]:WebSocket}} = {}
let wss:WebSocket.Server<typeof WebSocket, typeof http.IncomingMessage>|undefined = undefined

interface MyWebSocket extends WebSocket {
    subscriptionPage?: string;
    subscribedItemId?: string;
    subscribedUserId?: string;
}





type subscriptionRequest = {
    responseType:"Subscription",
    page:"Item"|"Profile",
    objectId:string
}

type unsubscriptionRequest= {
    responseType:"Unsubscribe",
}

type readNotification = {
    responseType:"Notification Read",
    notificationId:string|string[]
}

type readMessage = {
    responseType:"Read Message",
    messageId:string|string[]
}

type clientResponse = subscriptionRequest|unsubscriptionRequest|readNotification|readMessage





export function createWebSocket(
    server:http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
){
    if(wss){return wss}
    

    wss =  new WebSocket.Server({server})
    wss.on("connection",async(ws:MyWebSocket,req)=>{

        (req as any).cookies = req.headers.cookie ? parse(req.headers.cookie as string):undefined
        var userId = ((req as any).cookies as userLoginCookieFormat)?._DIU_ as string

        var sessionId = crypto.randomUUID()
        verifyUserLoginToken(req)
        .then(()=>{
            if(!activeWebSocketUserList[userId]){activeWebSocketUserList[userId]={}}
            activeWebSocketUserList[userId][sessionId]=ws
        })
        .catch(()=>{})



        // // for(const k in activeWebSocketUserList){console.log(k)}
        ws.on("message",async (payload)=>{
            try{

                let data:clientResponse =JSON.parse(payload.toString())
                // console.log(data)
                if(data.responseType == "Subscription"){
                    ws.subscriptionPage = data.page
                    if(data.page==="Item"){
                        ws.subscribedItemId = data.objectId
                        await prisma.item.findFirst({
                            where:{itemId:data.objectId},
                            select:{userId:true}
                        }).then((item)=>{ws.subscribedUserId = item?.userId})
                    }else{
                        ws.subscribedUserId = data.objectId

                    }
                }else if(data.responseType==="Unsubscribe"){
                    ws.subscriptionPage = undefined
                    ws.subscribedItemId =  undefined
                    ws.subscribedUserId =  undefined

                }else if(data.responseType==="Notification Read" && (req as any).userId){

                    if(typeof data.notificationId === "string"){
                        prisma.userNotification.update({
                            where: {notificationId: data.notificationId },
                            data: {seen:new Date()}
                        })
                    }else{
                        prisma.userNotification.updateMany({
                            where: {notificationId: {in:data.notificationId} },
                            data: {seen:new Date()}
                        })
                    }

                }else if(data.responseType === "Read Message" && (req as any).userId){
                    if(typeof data.messageId === "string"){
                        prisma.userMessageUser.update({
                            where: {userMessageId: data.messageId },
                            data: {seen:new Date()}
                        })
                    }else{
                        prisma.userMessageUser.updateMany({
                            where: {userMessageId: {in:data.messageId} },
                            data: {seen:new Date()}
                        })
                    }
                }
            }catch(e){console.log("error in web socket")}
        })
    
        ws.on("close",()=>{
            (sessionId as any) = undefined
            ws.subscribedItemId = undefined
            ws.subscribedUserId = undefined
            ws.subscriptionPage = undefined
            if(userId){
                if(activeWebSocketUserList && Object.keys(activeWebSocketUserList[userId]).length == 0){
                    delete activeWebSocketUserList[userId][sessionId]
                    delete activeWebSocketUserList[userId]
                }else{
                    delete activeWebSocketUserList[userId][sessionId]
                }
            }
            // console.log("closed")
        })
    })

    return wss
}

export function closeWebSocket(){
    if(!wss){return}
    wss.close()
}




type ServerWebSocketSignalEventRequest ={
    eventType:"Request Received"|"Request Accepted"|"Request Rejected",
    request:any,
    notification:any
}
type ServerWebSocketSignalEventRequestDeleted = {
    eventType:"Request Deleted",
    notification:any,
    requestId:string,
}
type ServerWebSocketSignalEventItemReStocked = {
    eventType:"Item ReStocked",
    notification:any
}
type ServerWebSocketSignalEventMessageReceived ={
    eventType:"Message Received",
    message:any
}

type ServerWebSocketSignalEventItemDeleted ={
    eventType:"Item Deleted",
    notification:any
}

type ServerWebSocketSignalEventUser ={ toUser:string,dispatchDate?:number }&(
    ServerWebSocketSignalEventItemDeleted|
    ServerWebSocketSignalEventMessageReceived|
    ServerWebSocketSignalEventRequest|
    ServerWebSocketSignalEventRequestDeleted|
    ServerWebSocketSignalEventItemReStocked
)


export function wsNotificationUser(eventList:ServerWebSocketSignalEventUser[]){
    const presentDate = new Date().getTime()
    eventList.forEach(async (event)=>{
        if(!event.toUser){return}
        if(!activeWebSocketUserList[event.toUser]){return} 
        event.dispatchDate = presentDate
        Object.keys(activeWebSocketUserList[event.toUser]).forEach((sessionId)=>{
            if(!activeWebSocketUserList[event.toUser][sessionId]){return}
            activeWebSocketUserList[event.toUser][sessionId].send(JSON.stringify(event))
        })
    })
}














type ServerWebSocketSignalEventCommentedOnItem ={
    eventType:"Comment Received",
    comment:any
}

type ServerWebSocketSignalEventRepliedOnCommentedInItem ={
    eventType:"Reply on Comment Received",
    reply:any,
    commentId:string
}

type ServerWebSocketSignalEventItemPage = ({itemId:string}|{userId:string})&{ dispatchDate?:number} &(
    ServerWebSocketSignalEventCommentedOnItem|
    ServerWebSocketSignalEventRepliedOnCommentedInItem|
    ServerWebSocketSignalEventRatedUser
)

export function wsNotificationItemPage(event:ServerWebSocketSignalEventItemPage){
    let presentDate = new Date().getTime()
    wss?.clients.forEach((client:MyWebSocket)=>{
        if(client.subscriptionPage!=="Item" ){return}
        if('itemId' in event && event.itemId !== event.itemId){return}
        if('userId' in event && event.userId !== event.userId){return}


        if(client.readyState===client.OPEN){
            event.dispatchDate = presentDate
            client.send(JSON.stringify(event))
        }
    })
}






type ServerWebSocketSignalEventRatedUser = {
    eventType:"Rated User",
    rate:any
}

type ServerWebSocketSignalEventProfilePage = {userId:string,dispatchDate?:number} & (
    ServerWebSocketSignalEventRatedUser
)

export function wsNotificaionProfilePage(event:ServerWebSocketSignalEventProfilePage){
    let presentDate = new Date().getTime()
    wss?.clients.forEach((client:MyWebSocket)=>{
        if(client.subscriptionPage!=="Profile" || client.subscribedUserId!==event.userId){return}

        if(client.readyState===client.OPEN){
            event.dispatchDate = presentDate
            client.send(JSON.stringify(event))
        }
    })
}





























