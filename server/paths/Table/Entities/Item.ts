import { Express, Request, Response } from "express";
import { CSRFToken, allowedPicMimeList, encript,decript, fileSizeLimitInBytes, itemMultimediaPath, staticFilesPath } from "../../../components/ExpressApp";
import {  verifyAdmin, verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import multer from "multer"
import sharp from "sharp";
import crypto from "crypto"
import fs from "fs"

function itemDeletedNotification(itemName:string,){
    return `${itemName} deleted.`
}

export function itemPaths(app: Express) {

    app.put("/api/item",verifyUser,CSRFToken, multer({ storage: multer.memoryStorage(),limits:{files:4} }).array("itemPics", 4), async (req, res) => {
            let { itemName, itemCount, itemDescription, longitude, latitude, category,itemDistrict } = req.body

            if (!itemName || !itemCount || !itemDescription || !longitude || !latitude || !category) {
                res.status(400).json({ message: "missing fields" });
                return
            }

            try {
                itemCount = parseInt(itemCount)
                longitude = parseFloat(longitude)
                latitude = parseFloat(latitude)
                if (itemCount < 1 || longitude < -180 || longitude > 180 || latitude > 180 || latitude < -180 ||isNaN(longitude)||isNaN(longitude)) { 
                    throw new Error("out of bounds")
                }
            } catch (e) {
                res.status(400).json({ message: "neumeric value error" })
            }



            if (!req.files) { res.status(400).json({ message: "no image for item?" }); return }

            if ((req.files as Express.Multer.File[]).length < 2) { res.status(400).json({ message: "too less file uploads" }); return }
            if ((req.files as Express.Multer.File[]).length > 4) { res.status(400).json({ message: "too many file uploads" }); return }
            let files = req.files as Express.Multer.File[]
            let itemPicIds: string[] = []

            let fileUploadError = false
            files.forEach(async (file) => {
                if (fileUploadError) { return }
                if (!new Set(allowedPicMimeList).has(file.mimetype)) { fileUploadError = true; return }
                if (file.size > fileSizeLimitInBytes) { fileUploadError = true; return }
                let uniqueId = crypto.randomUUID()
                itemPicIds.push(uniqueId)
                await new Promise((resolve,reject)=>{
                    sharp(file.buffer).webp().toFile(staticFilesPath+itemMultimediaPath(uniqueId,"webp"), (err, info) => {
                        if (err) { fileUploadError = true; return }
                        resolve(0)
                    })
                })
            })
            if (fileUploadError) {
                itemPicIds.forEach((id) => {
                    fs.unlinkSync(staticFilesPath+itemMultimediaPath(id,"webp"))
                })
                res.status(500).json({ message: "unable to upload files" })
                return
            }


            let itemid = crypto.randomUUID()
            await prisma.item.create({
                data: {
                    itemId:itemid,
                    userId: (req as any).userId,
                    itemName: itemName,
                    itemCount: itemCount,
                    itemAvilableCount: itemCount,
                    itemDistrict: itemDistrict,
                    itemDescription: itemDescription,
                    longitude: encript(""+longitude,itemid),
                    latitude: encript(""+latitude,itemid),
                    category: category,
                    ItemMultimedias: {
                        createMany: {
                            data: itemPicIds.map((id) => {
                                return { multimediaId: id, extension: "webp", type: "image" }
                            })
                        }
                    },
                },
            }).then((item) => {
                prisma.user.update({
                    where:{userId:item.userId},
                    data:{ posted:{increment:1} }
                })
                res.status(200).json({ message: "item created" })
            }).catch((e) => {
                itemPicIds.forEach((id) => {
                    fs.unlinkSync(staticFilesPath+itemMultimediaPath(id,"webp"))
                })
                res.status(500).json({ message: "couldnt creating item" })
            })
    })




    app.delete("/api/item",verifyUser,CSRFToken,async (req,res)=>{
        const {itemId} = req.body
        await prisma.item.findFirst({
            where:{itemId:{equals:itemId},userId:(req as any).userId},
            include:{ 
                User:{
                    select:{
                        userName:true,
                        userNameHash:true
                    }
                },
                ItemMultimedias:true,
                ItemRequests:{
                    select:{
                        userId:true,
                        acceptedDate:true,
                        rejectedDate:true
                    }
                },
                ItemCommentsReceived:{
                    select:{
                        userId:true,
                        Replies:{
                            select:{
                                userId:true
                            }
                        }
                    },
                },
                ItemReportsReceived:{
                    select:{
                        userId:true
                    }
                }
            }
        }).then(async (item)=>{
            if(!item){res.status(400).json({message:"invalid attempt"});return}


            let usersActionOnItem:{[key:string]:Set<string>} = {}
            function addAction(uid:string,action:string){
                if(uid===item?.userId && process.env.DEVELOPMENT){return}
                if(usersActionOnItem[uid]){ usersActionOnItem[uid].add(action)  }
                else{ usersActionOnItem[uid] = new Set([action]) }
            }

            item.ItemCommentsReceived.forEach((d)=>{
                addAction(d.userId,"Commented")
                d.Replies.forEach((rd)=>{
                    addAction(rd.userId,"Replied on Comment")
                })
            })
            item.ItemReportsReceived.forEach((d)=>{addAction(d.userId,"Reported")})
            item.ItemRequests.forEach(d=>{
                if(d.acceptedDate){ addAction(d.userId,"Request Accepted")}
                else if(!d.acceptedDate&&!d.rejectedDate){
                    addAction(d.userId,"Request pending")
                }
            })


            await prisma.$transaction([
                prisma.item.delete({
                    where:{itemId:item.itemId},
                    include:{
                        ItemCommentsReceived:true,
                        ItemMultimedias:true,
                        ItemReportsReceived:true,
                        ItemRequests:true,
                    }
                }),
                // ...Object.keys(usersActionOnItem).map((k)=>{
                //     return prisma.userNotification.create({
                //         data:{
                //             userId:k,
                //             description:itemDeletedNotification(item.itemName)
                //         }
                //     })
                // })
            ]).then(([del,...deletedNotifications])=>{
                res.status(200).json({message:"deleted successfully"})
                item.ItemMultimedias.forEach((m)=>{
                    fs.unlinkSync(staticFilesPath+itemMultimediaPath(m.multimediaId,m.extension))
                })
                // wsNotificationUser(deletedNotifications.map((n)=>{
                //     return {
                //         toUser:n.userId,
                //         eventType:"Item Deleted",
                //         notification:n
                //     }
                // }))

                
            }).catch(()=>{  res.status(500).json({message:"couldnt delete"})   })
        }).catch((e)=>{ res.status(500).json({message:"error verifying data"}) })

    })
    app.delete("/api/admin/item",verifyAdmin,CSRFToken,async (req,res)=>{
        const {itemId} = req.body
        await prisma.item.findFirst({
            where:{itemId:{equals:itemId}},
            include:{ 
                User:{
                    select:{
                        userName:true,
                        userNameHash:true
                    }
                },
                ItemMultimedias:true,
                ItemRequests:{
                    select:{
                        userId:true,
                        acceptedDate:true,
                        rejectedDate:true
                    }
                },
                ItemCommentsReceived:{
                    select:{
                        userId:true,
                        Replies:{
                            select:{
                                userId:true
                            }
                        }
                    },
                },
                ItemReportsReceived:{
                    select:{
                        userId:true
                    }
                }
            }
        }).then(async (item)=>{
            if(!item){res.status(400).json({message:"invalid attempt"});return}


            let usersActionOnItem:{[key:string]:Set<string>} = {}
            function addAction(uid:string,action:string){
                if(uid===item?.userId && process.env.DEVELOPMENT){return}
                if(usersActionOnItem[uid]){ usersActionOnItem[uid].add(action)  }
                else{ usersActionOnItem[uid] = new Set([action]) }
            }

            item.ItemCommentsReceived.forEach((d)=>{
                addAction(d.userId,"Commented")
                d.Replies.forEach((rd)=>{
                    addAction(rd.userId,"Replied on Comment")
                })
            })
            item.ItemReportsReceived.forEach((d)=>{addAction(d.userId,"Reported")})
            item.ItemRequests.forEach(d=>{
                if(d.acceptedDate){ addAction(d.userId,"Request Accepted")}
                else if(!d.acceptedDate&&!d.rejectedDate){
                    addAction(d.userId,"Request pending")
                }
            })


            await prisma.$transaction([
                prisma.item.delete({
                    where:{itemId:item.itemId},
                    include:{
                        ItemCommentsReceived:true,
                        ItemMultimedias:true,
                        ItemReportsReceived:true,
                        ItemRequests:true,
                    }
                }),
                // ...Object.keys(usersActionOnItem).map((k)=>{
                //     return prisma.userNotification.create({
                //         data:{
                //             userId:k,
                //             description:itemDeletedNotification(item.itemName)
                //         }
                //     })
                // })
            ]).then(([del,...deletedNotifications])=>{
                res.status(200).json({message:"deleted successfully"})
                item.ItemMultimedias.forEach((m)=>{
                    fs.unlinkSync(staticFilesPath+itemMultimediaPath(m.multimediaId,m.extension))
                })
                // wsNotificationUser(deletedNotifications.map((n)=>{
                //     return {
                //         toUser:n.userId,
                //         eventType:"Item Deleted",
                //         notification:n
                //     }
                // }))

                
            }).catch(()=>{  res.status(500).json({message:"couldnt delete"})   })
        }).catch((e)=>{ res.status(500).json({message:"error verifying data"}) })

    })
}