import { Express,Request, Response } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import { wsNotificationUser } from "../../../components/WebSocet";

export function userMessageUserPaths(app: Express) {

    app.put("/api/userMessageUser",verifyUser,CSRFToken,async (req,res)=>{

        let {toUser,description} = req.body
        const userId = (req as any).userId 
        
        if(!toUser){res.status(400).json({message:"whom to message?"});return}
        if(!description || (description as string).length<=0){res.status(400).json({message:"missing fields"});return}

        if(toUser===userId && !process.env.DEVELOPMENT){res.status(400).json({message:"cannot message self"});return}

        let Expirydate = new Date()
        Expirydate.setDate(Expirydate.getDate()-7)

        await prisma.$transaction([
            prisma.userMessageUser.deleteMany({where:{createdDate:{lte:Expirydate}}}),
            prisma.userMessageUser.findMany({
                where:{
                    fromUser:userId,
                    toUser:toUser
                },
                orderBy:{createdDate:'asc'},
            }),
            prisma.userMessageUser.create({
                data:{
                    fromUser:userId,
                    toUser:toUser,
                    description:description
                }
            })

        ]).then(([de,messages,sentMessage])=>{
            res.status(200).json({
                message:"messaged successfully",
                messageObject:sentMessage
            })

            wsNotificationUser([{
                toUser:sentMessage.toUser as string,
                eventType:"Message Received",
                message:sentMessage
            }])

            if(messages.length>100){
                prisma.userMessageUser.deleteMany({
                    where:{userMessageId:{in:messages.filter((v,i)=>i<messages.length-100).map(v=>v.userMessageId)}}
                })
            }
        }).catch(()=>{})
    })
}