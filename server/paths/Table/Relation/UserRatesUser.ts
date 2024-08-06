import { Express,Request, Response } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import {  verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import { Prisma } from "@prisma/client";
import { wsNotificaionProfilePage, wsNotificationItemPage } from "../../../components/WebSocet";

export function userRateUserPaths(app: Express) {

    app.put("/api/userRatesUser",verifyUser,CSRFToken,async (req,res)=>{

        let {userId,star} = req.body
        if(!userId){res.status(400).json({message:"whom to rate?"});return}
        if(userId === (req as any).userId && !process.env.DEVELOPMENT){res.status(400).json({message:"cannot rate self"});return}

        try{
            star = parseInt(star)
            if(star>5||star<0){throw new Error("out of bounds")}
        }catch(e){
            res.status(400).json({message:"error in registering rating to user"})
            return
        }

        await prisma.userRatesUser.findFirst({
            where:{
                fromUser:{equals:(req as any).userId},
                toUser:{equals:userId}
            }
        }).then(async (rating)=>{
            await prisma.$transaction([
                rating?prisma.userRatesUser.update({
                    data:{star:star},
                    where:{ rateId:rating.rateId }
                }):prisma.userRatesUser.create({
                    data:{
                        fromUser:(req as any).userId,
                        toUser:userId,
                        star:star,
                    }
                }),
                prisma.userRatesUser.aggregate({
                    where:{toUser:{equals:userId}},
                    _count:true,
                    _avg:{star:true}
                })

            ],{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}
            ).then(([rate,rating])=>{
                res.status(200).json({message:"rated successfully"})
                

                wsNotificaionProfilePage({
                    userId:rate.toUser,
                    eventType:"Rated User",
                    rate:{
                        rating:rating._avg.star?rating._avg.star.toString():0,
                        review:rating._count.toString()
                    }
                })

                wsNotificationItemPage({
                    userId:rate.toUser,
                    eventType:"Rated User",
                    rate:{
                        rating:rating._avg.star?rating._avg.star.toString():0,
                        review:rating._count.toString()
                    }
                })

            }).catch(()=>{res.status(500).json({message:"error rating user"})})
        }).catch(()=>{res.status(500).json({message:"error rating user"})})
    })
    
}