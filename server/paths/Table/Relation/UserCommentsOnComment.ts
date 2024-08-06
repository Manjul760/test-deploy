import { Express, Request, Response } from "express";
import { CSRFToken, decript, userProfilePicPath } from "../../../components/ExpressApp";
import {  verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";
import { wsNotificationItemPage } from "../../../components/WebSocet";

export function userCommentsCommentPaths(app: Express) {

    app.put("/api/userCommentsComment",verifyUser,CSRFToken, async (req, res) => {

        let { itemCommentId, description } = req.body
        const userId = (req as any).userId 
        
        if (!itemCommentId) { res.status(400).json({ message: "which comment?" }); return }
        if((description as string).length<=0){ res.status(400).json({ message: "no empty reply" }); return }


        await prisma.userCommentsOnComment.create({
            data: {
                userId: userId,
                itemCommentId: itemCommentId,
                itemCommentReplyDescription: description
            },
            include:{
                User:{
                    select:{
                        userId:true,
                        userName:true,
                        userNameHash:true,
                        fullName:true
                    }
                },
                Comment:{ 
                    select:{
                        itemCommentId:true,
                        Item:{
                            select:{
                                itemId:true
                            }
                        }
                    }
                }
            }
        }).then((userCommentsComment) => {
            if (!userCommentsComment) { res.status(500).json({ message: "comment error" }); return }
            res.status(200).json({ message: "commented" })
            let itemId = userCommentsComment.Comment.Item.itemId;
            let commentId = userCommentsComment.Comment.itemCommentId;
            (userCommentsComment as any).Comment=undefined

            userCommentsComment.User.fullName = decript(userCommentsComment.User.fullName,userCommentsComment.User.userId);
            userCommentsComment.User.userName = decript(userCommentsComment.User.userName,userCommentsComment.User.userNameHash);
            (userCommentsComment.User as any).userNameHash = undefined;
            (userCommentsComment.User as any).profilePicPath = userProfilePicPath(userCommentsComment.User.userId)

            wsNotificationItemPage({
                itemId:itemId,
                eventType:"Reply on Comment Received",
                reply:userCommentsComment,
                commentId:commentId
            })

            
        }).catch(() => { res.status(500).json({ message: "comment error" }) })
    })


}

type reply = {
    "itemCommentReplyId": string;
    "itemCommentReplyDescription": string;
    "createdDate": string;
    "userId": string;
    "itemCommentId": string;
    "User": {
        "userName": string;
        "userId": string;
        "profilePicPath": string;
    };
}