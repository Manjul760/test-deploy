import { Express } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { verifyUser } from "../loginlogout/LoginLogout";
import { decript, itemMultimediaPath, userProfilePicPath } from "../../components/ExpressApp";

export function myRequestListPageDisplayPaths(app: Express) {

    app.get("/api/myRequestList",verifyUser, async (req, res) => {
        await prisma.userRequestsItem.findMany({
            where:{userId:(req as any).userId},
            include:{
                Item:{
                    include:{
                        ItemMultimedias:true,
                        User:{
                            select:{
                                userId:true,
                                userName:true,
                                userNameHash:true,
                                fullName:true
                            }
                        }
                    }
                }
            }
        })
        .then((requestedItems)=>{
            if(!requestedItems){ res.status(200).json([]) ;return}

            requestedItems.forEach((request:any)=>{
                request.requestAmount = request.requestAmount.toString()
                request.Item.itemAvilableCount = request.Item.itemAvilableCount.toString()
                request.Item.itemCount = undefined
                request.userId = undefined
                request.Item.latitude = undefined
                request.Item.longitude = undefined
                request.Item.itemDistrict = decript(request.Item.itemDistrict,request.Item.itemId)
                request.Item.User.userName = decript(request.Item.User.userName,request.Item.User.userNameHash)
                request.Item.User.userNameHash = undefined
                request.Item.User.fullName = decript(request.Item.User.fullName,request.Item.User.userId)
                request.Item.User.profilePicPath = userProfilePicPath(request.Item.User.userId)
                request.Item.ItemMultimedias.forEach((m:any)=>{
                    m.path = itemMultimediaPath(m.multimediaId,m.extension)
                })
            })

            res.status(200).json(requestedItems)
            

        }).catch(()=>{res.status(500).json({message:"internal error"})})
    })

}




