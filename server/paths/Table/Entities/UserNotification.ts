import { Express } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { prisma } from "../../..";
import { verifyUser } from "../../loginlogout/LoginLogout";

export function userNotificationPath(app: Express) {
    
    app.delete("/api/usernotification",verifyUser,CSRFToken,async (req,res)=>{
        const {notificationId} = req.body
        if(!notificationId){res.status(400).json({message:"which notification"});return}

        if((notificationId as string).toLowerCase()==="all"){
            await prisma.userNotification.deleteMany({
                where:{  userId:(req as any).userId}
            }).then(()=>{
                res.status(200).json({message:"deleted "})
            }).catch(()=>{
                res.status(500).json({message:"error deleting "})
            })

        }else{
            await prisma.userNotification.delete({
                where:{
                    userId:(req as any).userId,
                    notificationId:notificationId
                }
            }).then(()=>{
                res.status(200).json({message:"deleted "})
            }).catch(()=>{
                res.status(500).json({message:"error deleting "})
            })
        }

    })



}

