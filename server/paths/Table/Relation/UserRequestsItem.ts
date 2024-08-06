import { Express, Request, Response } from "express";
import { CSRFToken, decript, userProfilePicPath, } from "../../../components/ExpressApp";
import { verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import { Prisma } from "@prisma/client";
import {  wsNotificationUser } from "../../../components/WebSocet";


function requestItemNotification(itemName:string,userName:string){
    return `${itemName}, requested by ${userName}.`
}
function acceptRequestNotification(itemName:string){
    return `${itemName}, request accepted.`
}
function acceptRequestDeletedNotification(itemName:string){
    return `Accepted request on ${itemName} deleted.`
}
function itemRestokedNotification(itemName:string){
    return `${itemName}, restocked.`
}
function acceptedItemRejectedLessStockNotification(itemName:string){
    return `${itemName}, request rejected (less stock).`
}
function requestRejectedNottification(itemName:string){
    return `${itemName}, request rejected.`
}

export function userRequestItemPaths(app: Express) {

    app.put("/api/userRequestItem", verifyUser, CSRFToken, async (req, res) => {
        let { itemId, requestAmount } = req.body
        if (!itemId) { res.status(400).json({ message: "which item?" }); return }
        if (!requestAmount) { res.status(400).json({ message: "missing fields" }); return }
        const myUserId = (req as any).userId

        try {
            requestAmount = parseInt(requestAmount)
            if (requestAmount < 1||isNaN(requestAmount)) { throw new Error("out of bounds") }
        } catch (e) {
            res.status(400).json({ message: "request eror amount unverified" })
            return
        }

        await prisma.$transaction([
            prisma.userRequestsItem.findFirst({
                where: {
                    itemId: { equals: itemId },
                    Item:{
                      userId:{not:myUserId}  
                    },
                    userId: { equals: myUserId },
                    acceptedDate: { equals: null },
                    rejectedDate: { equals: null }
                }
            }),
            prisma.userRequestsItem.count({
                where: {
                    itemId: { equals: itemId },
                    acceptedDate: { equals: null },
                    rejectedDate: { equals: null }
                }
            }),
            prisma.item.findFirst({
                where:{
                    itemId:itemId,
                    itemAvilableCount:{gt:0},
                    discontinuedDate:null,
                    revokedDate:null
                }
            }),
            prisma.user.findFirst({
                where:{userId:myUserId}
            })

        ]).then(async ([request,requestCount,requestedItem,me])=>{
            if(!me){res.status(400).json({ message: "cannot find you in our db" }); return}
            if(!requestedItem){res.status(400).json({ message: "no such item or out of stock or banned" }); return}
            if(requestedItem.itemAvilableCount <requestAmount){res.status(400).json({ message: "request exceeds quantity" }); return}

            if(!process.env.DEVELOPMENT){
                if(request){res.status(400).json({ message: "request already pending" }); return}
                if(requestedItem.userId === myUserId){res.status(400).json({ message: "cannot request posted Item" }); return }
                if (requestCount >= 4) { res.status(403).json({ message: "too many requests" }); return }
            }


            await prisma.$transaction([
                prisma.userRequestsItem.deleteMany({
                    where: {
                        userId: myUserId,
                        itemId: itemId,
                        rejectedDate:{not:null}
                    }
                }),
                prisma.userRequestsItem.create({
                    data: {
                        userId: myUserId,
                        itemId: itemId,
                        requestAmount: requestAmount
                    },
                    include:{
                        User:{
                            select:{
                                userId:true,
                                userName:true,
                                fullName:true,
                                userNameHash:true
                            }
                        }
                    }
                    
                }),
                prisma.userNotification.create({
                    data:{
                        userId:requestedItem.userId,
                        description:requestItemNotification(requestedItem.itemName,decript(me.fullName,me.userId))
                    }
                })
            ],
            {isolationLevel:Prisma.TransactionIsolationLevel.Serializable}
            ).then(([del,myRequest,requesteeNotification])=>{

                (myRequest.User as any).profilePicPath = userProfilePicPath(myRequest.User.userId)
                myRequest.User.userName = decript(myRequest.User.fullName,myRequest.User.userId);
                (myRequest.User as any).userNameHash = undefined;
                (myRequest as any).requestAmount = myRequest.requestAmount.toString();


                //notify the items creator request received
                wsNotificationUser([{
                    toUser:requestedItem.userId,
                    eventType:"Request Received",
                    notification:requesteeNotification,
                    request:myRequest
                }])

                // wsNotificationCountUpdate([requestedItem.userId])

                // send request in response to render if necessary
                res.status(200).json({ 
                    message: "requested ",
                    request: myRequest
                })
            }).catch((e) => { res.status(500).json({ message: "requeste error" }) })
        }).catch(() => { res.status(500).json({ message: "requested error" }) })
    })

    app.patch("/api/userRequestItem/acceptedDate", verifyUser, CSRFToken, async (req, res) => {
        const { requestId } = req.body
        if (!requestId) { res.status(400).json({ message: "which request?" }); return }
        
        await prisma.userRequestsItem.findFirst({
            where: {
                itemRequestId: requestId,
                Item: {
                    userId: { equals: (req as any).userId }
                }
            },
            include: {
                Item: {
                    select: {
                        itemAvilableCount: true,
                        revokedDate: true,
                        itemId: true,
                        itemName: true,
                        discontinuedDate:true
                    }
                }
            }
        })
        .then(async (request) => {
            if (!request) { res.status(400).json({ message: "no request" }); return }

            if (request.Item.revokedDate) { res.status(400).json({ message: "item already revoked" }); return }
            if (request.Item.discontinuedDate) { res.status(400).json({ message: "item already discontinued" }); return }
            if (request.acceptedDate || request.rejectedDate) { res.status(400).json({ message: "cannot reupdate status" }); return }
            if (request.requestAmount > request.Item.itemAvilableCount) { res.status(400).json({ message: "item crossed limit" }); return }

            await prisma.$transaction([
                prisma.userRequestsItem.update({
                    where: { itemRequestId: request.itemRequestId },
                    data: {
                        acceptedDate: new Date(),
                        Item: {
                            update: {
                                itemAvilableCount: { decrement: request.requestAmount }
                            }
                        }
                    },
                    include:{
                        User:{
                            select:{
                                Phone:{
                                    select:{
                                        phone:true,
                                        phoneId:true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.userNotification.create({
                    data: {
                        userId: request.userId,
                        description: acceptRequestNotification(request.Item.itemName)
                    }
                }),
                prisma.userRequestsItem.findMany({
                    where: {
                        requestAmount: { gt: request.Item.itemAvilableCount - request.requestAmount },
                        acceptedDate: { equals: null },
                        rejectedDate: { equals: null },
                        Item: {
                            itemId: { equals: request.Item.itemId },
                            userId: { equals: (req as any).userId },
                        }
                    }
                }),
                prisma.userRequestsItem.updateMany({
                    where: {
                        requestAmount: { gt: request.Item.itemAvilableCount - request.requestAmount },
                        acceptedDate: { equals: null },
                        rejectedDate: { equals: null },
                        Item: {
                            itemId: { equals: request.Item.itemId },
                            userId: { equals: (req as any).userId },
                        }
                    },
                    data: { rejectedDate: new Date() }
                })
            ],
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            ).then(async ([updatedRequest,requestorNotification,rejectedRequests,upm]) => {

                (updatedRequest.User as any).phoneNumber = decript(updatedRequest.User.Phone.phone,updatedRequest.User.Phone.phoneId);
                (updatedRequest as any).requestAmount = updatedRequest.requestAmount.toString();
                (updatedRequest.User as any).Phone = undefined
                res.status(200).json({
                    message: "updated successfully",
                    request:updatedRequest
                });
                (updatedRequest as any).User = undefined

                
                //notify requestor
                wsNotificationUser([{
                    toUser:updatedRequest.userId,
                    eventType:"Request Accepted",
                    notification:requestorNotification,
                    request:updatedRequest
                }])


                // wsNotificationCountUpdate([request.userId])

                prisma.$transaction([
                    ...rejectedRequests.map((rejectedRequest)=>{
                        return prisma.userNotification.create({
                            data:{
                                userId:rejectedRequest.userId,
                                description: acceptedItemRejectedLessStockNotification(request.Item.itemName)
                            }
                        })
                    })
                ]).then((rejectedRequestNotifications)=>{

                    //notify rejected req users
                    wsNotificationUser(rejectedRequestNotifications.map((n)=>{
                        return {
                            toUser:n.userId,
                            eventType:"Request Rejected",
                            notification:n,
                            request:rejectedRequests.find(r=>r.userId===n.userId)
                        }
                    }))
                }).catch(()=>{})


            }).catch(() => { res.status(500).json({ message: "error updating" }) })
        })
    })

    app.patch("/api/userRequestItem/rejectedDate", verifyUser, CSRFToken, async (req, res) => {
        const { requestId } = req.body
        if (!requestId) { res.status(400).json({ message: "which request?" }); return }

        await prisma.userRequestsItem.findFirst({
            where: {
                itemRequestId: requestId,
                Item: {
                    userId: { equals: (req as any).userId }
                }
            },
            include: {
                Item: {
                    select: {
                        itemAvilableCount: true,
                        itemName: true
                    }
                }
            }
        })
        .then(async (request) => {
            if (!request) { res.status(400).json({ message: "no request" }); return }
            if (request.acceptedDate || request.rejectedDate) { res.status(400).json({ message: "cannot reupdate status" }); return }

            await prisma.$transaction([
                prisma.userRequestsItem.update({
                    where: { itemRequestId: request.itemRequestId },
                    data: { rejectedDate: new Date() }
                }),
                prisma.userNotification.create({
                    data: {
                        userId: request.userId,
                        description: requestRejectedNottification(request.Item.itemName)
                    }
                })
            ]).then(([updatedRequest,notification]) => {
                (updatedRequest as any).requestAmount = updatedRequest.requestAmount.toString()

                res.status(200).json({ 
                    message: "updated successfully",
                    request:updatedRequest
                })

                //notify user
                wsNotificationUser([{
                    toUser:request.userId,
                    eventType:"Request Rejected",
                    notification:notification,
                    request:updatedRequest
                }])


            }).catch((e) => {
                // console.log(e)
                res.status(500).json({ message: "error updating" })
            })
        })
    })

    app.delete("/api/userRequestItem/acceptedDate", verifyUser, CSRFToken, async (req, res) => {
        const { requestId } = req.body
        if (!requestId) { res.status(400).json({ message: "which request?" }); return }

        await prisma.userRequestsItem.findFirst({
            where: {  
                itemRequestId: requestId,
                Item:{
                    userId:(req as any).userId
                }
            },
            include:{
                Item:true
            }
        }).then(async (request) => {
            if (!request) { res.status(400).json({ message: "no request" }); return }

            await prisma.$transaction([
                prisma.item.update({
                    where: { itemId: request.itemId },
                    data: { itemAvilableCount: { increment: request.requestAmount } }
                }),
                prisma.userRequestsItem.findMany({
                    where: {
                        itemId: request.itemId,
                        rejectedDate: { not: null },
                        requestAmount: { lte: request.Item.itemAvilableCount+request.requestAmount }
                    },
                }),
                prisma.userRequestsItem.delete({ where: { itemRequestId: requestId } }),
                prisma.userNotification.create({
                    data:{
                        userId:request.userId,
                        description:acceptRequestDeletedNotification(request.Item.itemName)
                    }
                })
            ],
                { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
            ).then(async ([up,rejectedRequests,del,deletedNotification]) => {

                wsNotificationUser([{
                    toUser:request.userId,
                    eventType:"Request Deleted",
                    requestId:request.itemRequestId,
                    notification:deletedNotification
                }])
                res.status(200).json({ 
                    message: "request deleted successfully",
                    requestId:request.itemRequestId
                })

                
                prisma.$transaction([
                    ...rejectedRequests.map((r)=>{
                        return prisma.userNotification.create({
                            data:{
                                userId:r.userId,
                                description:itemRestokedNotification(request.Item.itemName)
                            }
                        })
                    })
                ]).then((rejectedRequestsNotifications)=>{
                    wsNotificationUser(rejectedRequestsNotifications.map((n)=>{
                        return {
                            toUser:n.userId,
                            eventType:"Item ReStocked",
                            notification:n
                        }
                    }))
                }).catch(()=>{})
            }).catch(() => { res.status(500).json({ message: "couldnt complete deletion" }) })
        }).catch(() => { res.status(500).json({ message: "internal error" }) })
    })


    app.delete("/api/userRequestItem/pending",verifyUser, CSRFToken, async (req,res)=>{
        const {requestId} = req.body
        await prisma.userRequestsItem.delete({
            where: {  
                itemRequestId: requestId,
                userId:(req as any).userId,
                acceptedDate:null
            },
            include:{
                Item:true
            }
        }).then(async (req)=>{
            res.status(200).json({
                message:"request deleted",
                requestId:req.itemRequestId
            })
        }).catch(()=>{res.status(500).json({message:"error deleting request"})})
    })
}









