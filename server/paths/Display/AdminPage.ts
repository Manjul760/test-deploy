import { Express, Request, Response } from "express";
import { prisma } from "../..";
import { decript, itemMultimediaPath, userProfilePicPath } from "../../components/ExpressApp";

export function adminPageDisplayPaths(app: Express) {

    app.get("/api/admin/data",async (req,res)=>{
        try{
            await prisma.$transaction([
                prisma.feedback.findMany({
                    orderBy:{
                        postedDate:"desc"
                    }
                }),
                prisma.career.findMany({
                    orderBy:{
                        createdDate:"desc"
                    }
                }),
                prisma.userReportUser.findMany({
                    include:{
                        From:{
                            select:{
                                fullName:true,
                                userId:true,
                                Email:true,
                                Phone:true
                            }
                        },
                        To:{
                            select:{
                                fullName:true,
                                userId:true,
                                Email:true,
                                Phone:true
                            }
                        },
                    },
                    orderBy:{reportedDate:"desc"}
                }),
                prisma.userReportsItem.findMany({
                    include:{
                        User:{
                            select:{
                                fullName:true,
                                userId:true,
                                Email:true,
                                Phone:true
                            }
                        },
                        Item:{
                            select:{
                                itemName:true,
                                itemId:true,
                                User:{
                                    select:{
                                        fullName:true,
                                        userId:true,
                                        Email:true,
                                        Phone:true
                                    }
                                },
                                ItemMultimedias:{
                                    select:{
                                        multimediaId:true,
                                        type:true,
                                        extension:true
                                    }
                                }
                            }
                        }
                    },
                    orderBy:{reportedDate:"desc"}
                }),
                prisma.user.findMany({
                    include:{
                        Email:true,
                        Phone:true
                    }
                }),
                prisma.item.findMany({
                    where:{},
                    include:{
                        ItemMultimedias:true,
                        User:{
                            select:{
                                userId:true,
                                fullName:true,                          
                            }
                        }
                    }
                })
            ]).then(async ([feedbacks,careers,userReports,itemReports,userList,itemList])=>{

                let promiseList:Promise<any>[] = []
                let sendFeedBacks = feedbacks.map((f)=>{
                    f.email = decript(f.email,f.feedbackId)
                    f.name = decript(f.name,f.feedbackId)
                    return f
                })

                let sendUserList = userList.map((u)=>{
                    (u as any).phone = decript(u.Phone.phone,u.Phone.phoneId);
                    (u as any).Phone = undefined;
                    (u as any).email = decript(u.Email.email,u.Email.emailId);
                    (u as any).Email = undefined;
                    u.fullName = decript(u.fullName,u.userId);

                    (u as any).latitude = undefined;
                    (u as any).longitude = undefined;
                    (u as any).posted = u.posted.toString();
                    (u as any).profilePic = userProfilePicPath(u.userId);
                    return u
                })
                
                let sendItemList = itemList.map((i)=>{
                    (i.User as any).profilePic = userProfilePicPath(i.User.userId);
                    i.User.fullName = decript(i.User.fullName,i.User.userId);
                    (i as any).ItemMultimedias = i.ItemMultimedias.map((m)=>{
                        return itemMultimediaPath(m.multimediaId,m.extension)
                    });
                    (i as any).itemAvilableCount = i.itemAvilableCount.toString();
                    (i as any).itemCount = i.itemCount.toString();
                    return i
                })

                let sendUserReports = userReports.map((r)=>{
                    (r.From as any).email = decript(r.From.Email.email,r.From.Email.emailId);
                    (r.To as any).email = decript(r.To.Email.email,r.To.Email.emailId);
                    (r.From as any).phone = decript(r.From.Phone.phone,r.From.Phone.phoneId);
                    (r.To as any).phone = decript(r.To.Phone.phone,r.To.Phone.phoneId);

                    (r.To as any).Phone = undefined;
                    (r.To as any).Email = undefined;
                    (r.From as any).Phone = undefined;
                    (r.From as any).Email = undefined;

                    promiseList.push(
                        prisma.userReportUser.count({
                            where:{toUser:r.toUser}
                        }).then((c)=>{
                            (r as any).toUserCount = c.toString()
                        })
                    )
                    

                    r.From.fullName = decript(r.From.fullName,r.From.userId);
                    r.To.fullName = decript(r.To.fullName,r.To.userId);
                    (r.To as any).profilePic = userProfilePicPath(r.To.userId);
                    (r.From as any).profilePic = userProfilePicPath(r.From.userId);
                    return r
                })
                let sendItemReports = itemReports.map((r)=>{
                    (r.User as any).email = decript(r.User.Email.email,r.User.Email.emailId);
                    (r.User as any).phone = decript(r.User.Phone.phone,r.User.Phone.phoneId);
                    (r.User as any).Phone = undefined;
                    (r.User as any).Email = undefined;
                    r.User.fullName = decript(r.User.fullName,r.User.userId);
                    (r.User as any).profilePic = userProfilePicPath(r.User.userId);

                    promiseList.push(
                        prisma.userReportUser.count({
                            where:{toUser:r.Item.User.userId}
                        }).then((c)=>{
                            (r as any).toUserCount = c.toString()
                        })
                    );
                    promiseList.push(
                        prisma.userReportsItem.count({
                            where:{itemId:r.Item.itemId}
                        }).then((c)=>{
                            (r as any).toItemCount = c.toString()
                        })
                    );

                    
                    (r.Item.User as any).email = decript(r.Item.User.Email.email,r.Item.User.Email.emailId);
                    (r.Item.User as any).phone = decript(r.Item.User.Phone.phone,r.Item.User.Phone.phoneId);
                    (r.Item.User as any).Phone = undefined;
                    (r.Item.User as any).Email = undefined;
                    r.Item.User.fullName = decript(r.Item.User.fullName,r.Item.User.userId);
                    (r.Item.User as any).profilePic = userProfilePicPath(r.Item.User.userId);

                    (r.Item.ItemMultimedias as any) = r.Item.ItemMultimedias.map((m)=>{
                        return itemMultimediaPath(m.multimediaId,m.extension)
                    })
                    return r
                })

                for (let index = 0; index < promiseList.length; index++) {
                    await promiseList[index]
                }

                res.status(200).json({
                    feedbacks:sendFeedBacks,
                    careers:careers,
                    userReports:sendUserReports,
                    itemReports:sendItemReports,
                    userList:sendUserList,
                    itemList:sendItemList
                })
            })
            
        }catch(e){
            res.status(500).json({message:"error bhaexo internal"})
        }
    })

}





