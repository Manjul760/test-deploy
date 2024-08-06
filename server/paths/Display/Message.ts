import { Express } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { verifyUser } from "../loginlogout/LoginLogout";
import { decript, userProfilePicPath } from "../../components/ExpressApp";
import { Prisma } from "@prisma/client";

export function messagePageDisplayPaths(app: Express) {

    app.get("/api/message/messages/userMessageUser/:toUser", verifyUser, async (req, res) => {

        const myUserId = (req as any).userId

        await prisma.$transaction([
            prisma.userMessageUser.updateMany({
                where: { toUser: myUserId, seen: null },
                data: { seen: new Date() }
            }),
            prisma.userMessageUser.findMany({
                where: {
                    OR: [
                        { toUser: req.params.toUser, fromUser: myUserId },
                        { toUser: myUserId, fromUser: req.params.toUser }
                    ]
                },
                orderBy: { createdDate: "asc" }
            }),
            prisma.userMessageUser.count({
                where: {
                    toUser: myUserId,
                    seen:null
                },
            })
        ],
        {isolationLevel:Prisma.TransactionIsolationLevel.Serializable}
        ).then(([up,messages,unseenCount])=>{
            if (!messages) { res.status(200).json([]); return }
            res.status(200).json({
                messages:messages,
                unseenCount:unseenCount.toString()
            })
        }).catch(() => { res.send(500).json({ message: "error with messages" }) })
    })

    app.get("/api/message/userlist/userMessageUser", verifyUser, async (req, res) => {
        try{
            type output = {
                  userName: string,
                  fullName:string,
                  userNameHash: string,
                  userId: string,
                  unseenCount: BigInt,
                  profilePicPath:string
                }[]
            
            const myUserId = (req as any).userId
    
            let data:output = await prisma.$queryRaw`
                select 
                    userName,
                    userNameHash,
                    userId,
                    fullName,
                    (select count(*) from usermessageuser where isnull(seen) and toUser = ${myUserId}) as unseenCount
                from user
                where userId in (
                    select  fromUser as userId  from usermessageuser where toUser = ${myUserId}
                    union
                    select  toUser as userId  from usermessageuser where fromUser = ${myUserId}
                )
                order by  (select max(createdDate) from usermessageuser  where toUser = userId ) desc, unseenCount desc;
                
            `
    
            data.forEach((v:any)=>{
                v.unseenCount=v.unseenCount.toString()
                v.profilePicPath = userProfilePicPath(v.userId)
                v.userName = decript(v.userName,v.userNameHash)
                v.userNameHash = undefined
                v.fullName = decript(v.fullName,v.userId)
            })
            res.status(200).json(data)

        }catch(e){res.status(500).json({message:"internal error"})}


    })

}




