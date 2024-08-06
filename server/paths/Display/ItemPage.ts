import { Express } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { decript, itemMultimediaPath, userProfilePicPath } from "../../components/ExpressApp";

export function itemPageDisplayPaths(app: Express) {

    app.get("/api/itempage/item/:itemId", async (req, res) => {
        await prisma.item.findFirst({
            where: { itemId: req.params.itemId, },
            orderBy:{createdDate:"desc"},
            include: {
                ItemMultimedias: true,
                ItemRequests:{
                    where:{
                        userId:req.cookies._DIU_,
                        acceptedDate:null,
                        rejectedDate:null
                    },
                    select:{itemRequestId:true}
                },
                User: {
                    select: {
                        userId: true,
                        userName: true,
                        userNameHash: true,
                        fullName:true
                    }
                },
                ItemCommentsReceived:{
                    include:{
                        User:{
                            select:{
                                userName:true,
                                fullName:true,
                                userNameHash:true,
                                userId:true
                            }
                        },
                        Replies:{
                            include:{
                                User:{
                                    select:{
                                        userName:true,
                                        fullName:true,
                                        userNameHash:true,
                                        userId:true
                                    }
                                }
                            },
                            orderBy:{createdDate:"desc"}
                        }
                    },
                    orderBy:{createdDate:"desc"}
                }
            }
        }).then(async (item:any) => {
            if (!item) { res.sendStatus(404); return }

            item.ItemMultimedias.forEach((m:any)=>{
                m.path = itemMultimediaPath(m.multimediaId,m.extension)
            })
            item.latitude = decript(item.latitude, item.itemId)
            item.longitude = decript(item.longitude, item.itemId)
            item.User.userName = decript(item.User.userName, item.User.userNameHash)
            item.itemAvilableCount = item.itemAvilableCount.toString()
            item.itemCount = undefined
            item.User.userNameHash = undefined
            item.User.profilePicPath = userProfilePicPath(item.User.userId)
            item.User.fullName = decript(item.User.fullName, item.User.userId)
            await prisma.userRatesUser.aggregate({
                where:{toUser:{equals:item.userId}},
                _count:true,
                _avg:{star:true}
            }).then((rating)=>{
                item.rate = {
                    rating:rating._avg.star,
                    reviews:rating._count
                }
            })

            if(item.ItemRequests.length>0){
                item.isRequested = true
                item.ItemRequests=undefined
            }else{
                item.isRequested = false
            }

            if(item.ItemCommentsReceived.length>0){
                item.ItemCommentsReceived.map((c:any)=>{
                    c.User.fullName = decript(c.User.fullName,c.User.userId)
                    c.User.userName = decript(c.User.userName,c.User.userNameHash)
                    c.User.userNameHash = undefined
                    c.User.profilePicPath = userProfilePicPath(c.User.userId)
                    if(!c.Replies){c.Replies=[]}
                    else{
                        c.Replies.forEach((r:any)=>{
                            r.User.fullName = decript(r.User.fullName,r.User.userId)
                            r.User.userName = decript(r.User.userName,r.User.userNameHash);
                            r.User.profilePicPath =  userProfilePicPath(r.User.userId)
                            r.User.userNameHash = undefined
                        })
                    }
                    return c
                })
            }

            res.status(200).json(item)
            
        })
    })

    app.get("/api/itempage/item/:itemId/comment",async (req,res)=>{
        await prisma.userCommentsItem.findMany({
            where:{itemId:req.params.itemId},
            include:{
                User:{
                    select:{
                        userName:true,
                        fullName:true,
                        userNameHash:true,
                        userId:true
                    }
                },
                Replies:{
                    include:{
                        User:{
                            select:{
                                userName:true,
                                userNameHash:true,
                                userId:true,
                                fullName:true
                            }
                        }
                    },
                    orderBy:{createdDate:"desc"}
                }
            },
            orderBy:{createdDate:"desc"}
        }).then((comments)=>{
            if(!comments){res.status(200).json([])}

            res.status(200).json(
                comments.map((c:any)=>{
                    c.User.fullName = decript(c.User.fullName,c.User.userId)
                    c.User.userName = decript(c.User.userName,c.User.userNameHash)
                    c.User.userNameHash = undefined
                    c.User.profilePicPath = userProfilePicPath(c.User.userId)
                    if(!c.Replies){c.Replies=[]}
                    else{
                        c.Replies.forEach((r:any)=>{
                            r.User.fullName = decript(r.User.fullName,r.User.userId)
                            r.User.userName = decript(r.User.userName,r.User.userNameHash);
                            r.User.profilePicPath =  userProfilePicPath(r.User.userId)
                            r.User.userNameHash = undefined
                        })
                    }
                    return c
                })
            )
        })
    })


    app.get("/api/itempage/rating/:userId", async (req,res)=>{
        await prisma.$transaction([
            prisma.userRatesUser.findFirst({where:{
                fromUser:(req as any).userId,
                toUser:req.params.userId
            }}),
            prisma.userRatesUser.aggregate({
                where:{toUser:{equals:req.params.userId}},
                _count:true,
                _avg:{star:true}
            })
        ]).then(([rating,rate])=>{
            if(!rating){res.status(200).json({
                star:3,
                ratedDate:null,
                modifiedDate:null,
                review:rate._count,
                avgRate:rate._avg.star,
            });return}

            res.status(200).json({
                review:rate._count,
                avgRate:rate._avg.star,
                star:rating.star,
                ratedDate:rating.ratedDate,
                modifiedDate:rating.modifiedDate
            })

        }).catch(()=>{res.status(500).json({message:"internal error"})})
    })
}




