import { Express, Request, Response } from "express";
import { CSRFToken, decript, userProfilePicPath } from "../../../components/ExpressApp";
import {  verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import { wsNotificationItemPage } from "../../../components/WebSocet";

export function userCommentsItemPaths(app: Express) {

    app.put("/api/userCommentsItem",verifyUser,CSRFToken, async (req, res) => {

        let { itemId, description } = req.body
        const userId = (req as any).userId 
        
        if (!itemId) { res.status(400).json({ message: "which item?" }); return }
        if((description as string).length<=0){ res.status(400).json({ message: "no empty comment" }); return }

        await prisma.userCommentsItem.create({
            data: {
                userId: userId,
                itemId: itemId,
                itemCommentDescription: description
            },
            include:{
                User:{
                    select:{
                        userId:true,
                        userName:true,
                        userNameHash:true,
                        fullName:true
                    }
                }
            }
        }).then((userCommentsItem) => {
            if (!userCommentsItem) { res.status(500).json({ message: "comment error" }); return }
            res.status(200).json({ message: "commented"  })

            userCommentsItem.User.userName = decript(userCommentsItem.User.userName,userCommentsItem.User.userNameHash);
            userCommentsItem.User.fullName = decript(userCommentsItem.User.fullName,userCommentsItem.User.userId);
            (userCommentsItem.User as any).userNameHash = undefined;
            (userCommentsItem.User as any).profilePicPath = userProfilePicPath(userCommentsItem.User.userId)

            //broadcast comment
            wsNotificationItemPage({
                itemId:itemId,
                eventType:"Comment Received",
                comment:userCommentsItem
            })

        }).catch(() => { res.status(500).json({ message: "comment error" }) })
    })


}