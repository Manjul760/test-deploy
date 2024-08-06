import { Express,Request, Response } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { verifyUser } from "../loginlogout/LoginLogout";
import { Prisma } from "@prisma/client";

export function notificationPageDisplayPaths(app: Express) {

    app.get("/api/notificationpage/notifications/count/:count/page/:pageNumber",verifyUser,async (req,res)=>{
        let count = 10
        let pageNumber = 0
        try{
            count=parseInt(req.params.count)
            pageNumber = parseInt(req.params.pageNumber)
            if(count<1||pageNumber<0 || isNaN(count) || isNaN(pageNumber)){throw new Error("value low range")}
        }catch(e){
            count = 100
            pageNumber = 0
        }


        
        await prisma.userNotification.findMany({
            where:{userId:{equals:(req as any).userId}},
            orderBy:[{seen:"asc"},{createdDate:'desc'}],
            take:count,
            skip:count*pageNumber
        }).then(async (notifications)=>{
            
            let presentDate = new Date()
            let expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate()-3)

            await prisma.$transaction([
                prisma.userNotification.updateMany({
                    where:{ notificationId:{in:notifications.map((n)=>n.notificationId)}  },
                    data:{seen:presentDate}
                }),
                prisma.userNotification.count({where:{userId:{equals:(req as any).userId},seen:{equals:null}}}),  
                prisma.userNotification.deleteMany({ where:{seen:{lte:expiryDate}} })
            ],
            {isolationLevel:Prisma.TransactionIsolationLevel.Serializable}
            ).then(([up,totalUnread])=>{
                res.status(200).json({
                    totalUnread: totalUnread.toString(),
                    notifications:notifications
                })
            }).catch(()=>{res.status(500).json({message:"processing error"})})
        }).catch((e)=>{res.status(500).json({message:"error getting data"})})
    })
}





