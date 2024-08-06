import { Express } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { verifyUser } from "../loginlogout/LoginLogout";
import { decript, itemMultimediaPath, userProfilePicPath } from "../../components/ExpressApp";

export function postedItemsDisplayPaths(app: Express) {

    app.get("/api/postedItem/itemList/category/:category/district/:district/count/:limit/pageno/:pageNumber",async (req,res)=>{
        let limit :number
        let pageNumber :number
        try{
            limit = parseInt(req.params.limit)
            pageNumber = parseInt(req.params.pageNumber)
            if(limit<0||pageNumber<0||isNaN(limit)||isNaN(pageNumber)){
                throw new Error("out of bounds")
            }
        }catch(e){
            limit=100
            pageNumber=0
        }

        let whereFilter:any = {}
        if(req.params.category&&req.params.category!=="null"){
            whereFilter["category"]={equals:req.params.category}
        }
        if(req.params.district&&req.params.district!=="null"){
            whereFilter["itemDistrict"]={equals:req.params.district}
        }
        


        let data = await prisma.item.findMany({
            where:{
                ...whereFilter,
                discontinuedDate:{equals:null},
                revokedDate:{equals:null}
            },
            include:{
                ItemMultimedias:true,
                ItemRequests:{
                    orderBy:{requestedDate:"asc"},
                    include:{
                        User:{
                            select:{
                                userId:true,
                                userName:true,
                                userNameHash:true,
                                fullName:true,
                                Phone:{
                                    select:{
                                        phone:true,
                                        phoneId:true
                                    }
                                }
                            }
                        }
                    }
                },
            },
            take:limit,
            skip:limit*pageNumber
        })

        let displayData:any[] = []

        data.forEach((item)=>{
            item.ItemMultimedias.forEach((m :any)=>{
                m.path = itemMultimediaPath(m.multimediaId,m.extension)
            })
            let itemAvilableCount = item.itemAvilableCount.toString()

            item.ItemRequests.forEach((request:any)=>{
                request.requestAmount = request.requestAmount.toString()
                request.itemId=undefined

                request.User.userName = decript(request.User.userName,request.User.userNameHash)
                request.User.fullName = decript(request.User.fullName,request.User.userId)
                request.User.profilePicPath = userProfilePicPath(request.User.userId)
                request.User.userNameHash=undefined

                if(request.acceptedDate){
                    request.User.phoneNumber = decript(request.User.Phone.phone,request.User.Phone.phoneId)
                }
                request.User.Phone = undefined

            })

            displayData.push({
                ...item,
                latitude:undefined,
                longitude:undefined,
                itemAvilableCount:itemAvilableCount,
                itemCount:undefined
            })

        })

        res.status(200).json(displayData) 
    })
    
}




