import { Express } from "express";
import { jwtkey, CSRFToken, userProfilePicPath, allowedPicMimeList, fileSizeLimitInBytes, staticFilesPath, encript, decript } from "../../../components/ExpressApp";
import multer from "multer"
import { prisma } from "../../..";
import * as crypto from "crypto"
import cryptojs from "crypto-js"
import jwt from "jsonwebtoken"
import sharp from "sharp"
import fs from "fs"
import { verifyAdmin, verifyUser } from "../../loginlogout/LoginLogout";
import { Prisma } from "@prisma/client";

declare module "multer" {
    interface File {
        isUploaded: boolean;
    }
}

export function userPath(app: Express) {
    app.get("/api/user", verifyUser, async (req, res) => {
        const verifyid = req.headers["verifyid"]

        if (!verifyid) { res.status(403).json({ message: "no user found" }); return }

        await prisma.$transaction([
            prisma.user.findFirst({
                where: { 
                    userId: (req as any).userId,
                    OR:[
                        {unlockTime:null},
                        {unlockTime:{lte:new Date()}} 
                    ],
                },
                include: {
                    Phone: {
                        select: {
                            phoneId: true,
                            phone: true
                        }
                    },
                    Email: {
                        select: {
                            email: true,
                            emailId: true
                        }
                    }
                }
            }),
            prisma.userNotification.count({ where: { userId: (req as any).userId, seen: null } }),
            prisma.userMessageUser.count({ where: { toUser: (req as any).userId, seen: null } })
        ]).then(([user, notificationCount, messageCount]) => {
            if (!user) { res.status(400).json({ message: "no user found" }); return }

            let displayUser: any = user
            displayUser.email = decript(displayUser.Email.email, displayUser.Email.emailId)
            displayUser.Email = undefined
            displayUser.phone = decript(displayUser.Phone.phone, displayUser.Phone.phoneId)
            displayUser.Phone = undefined
            displayUser.userName = decript(displayUser.userName, displayUser.userNameHash)
            displayUser.longitude = decript(displayUser.longitude, displayUser.userId)
            displayUser.latitude = decript(displayUser.latitude, displayUser.userId)
            displayUser.fullName = decript(displayUser.fullName, displayUser.userId)
            displayUser.profilePicPath = userProfilePicPath(displayUser.userId)
            displayUser.userNameHash = undefined
            displayUser.phoneId = undefined
            displayUser.emailId = undefined
            displayUser.userPassword = undefined
            displayUser.posted = displayUser.posted.toString()
            // displayUser.describeYourself = decript(displayUser.describeYourself, displayUser.userId)
            displayUser.describeYourself = undefined //comment if you uncomment above

            let persentDate = new Date()
            let identityId = crypto.randomUUID()

            type output = {
                mf: string,
                fu: number,
                ck: string,
                u: string
            }
            displayUser.notificationCount = notificationCount.toString()
            displayUser.messageCount = messageCount.toString()

            let fakeuser = crypto.createHash("sha256").update(identityId).digest("hex") +
                crypto.createHash("sha256").update(verifyid as string).digest("hex")

            let pass = crypto.createHash("sha256").update(
                `${new Date(persentDate.getTime() + 69).toISOString()} ${verifyid} ${identityId} ${fakeuser}`
            ).digest("hex")


            res.status(200).json({
                mf: encript(JSON.stringify(displayUser), pass),
                fu: persentDate.getTime(),
                ck: identityId,
                u: fakeuser
            })
        }).catch(() => {
            res.status(500).json({ message: "internal error" })
        })
    })


    app.put("/api/user", CSRFToken, multer({ storage: multer.memoryStorage() }).single("userProfilePic"), (req, res) => {
        if (!req.cookies.registryEmail) { res.status(400).json({ message: "Error putting user register first" }); return }

        jwt.verify(req.cookies.registryEmail, jwtkey, async (e: any, email: any) => {
            if (e) { res.status(400).json({ message: "Error verifying registry" }); return }

            let { userPhone, userPassword, userName, longitude, latitude, userDOB, userGender, isOrganization, fullName} = req.body

            if (!userPhone || !userPassword || !userName || !longitude || !latitude || !userDOB || !userGender || !fullName) {
                res.status(400).json({ message: "Missing fields" })
                return
            }

            let errorMessages = false
            let error: { [key: string]: string } = {}
            let profileId = crypto.randomUUID()

            let phoneHash = crypto.createHash("sha512").update(userPhone).digest("hex")
            let userNameHash = crypto.createHash("sha512").update(userName).digest("hex")
            await prisma.$transaction([
                prisma.user.findFirst({ where: { phoneId: { equals: phoneHash } } }),
                prisma.user.findFirst({ where: { userNameHash: { equals: userNameHash } } })

            ]).then(([u1, u2]) => {
                if (u1) { error["userPhone"] = "Phone Number exists"; errorMessages = true }
                if (u2) { error["userName"] = "Username Exists"; errorMessages = true }
            }).catch(() => {
                error["internal"] = "Verify phone email error"; errorMessages = true
            })

            try {
                longitude = parseFloat(longitude)
                latitude = parseFloat(latitude)
                if (longitude > 180 || longitude < -180) { throw new Error("out of bounds") }
                if (latitude > 180 || latitude < -180) { throw new Error("out of bounds") }
            } catch (e) {
                errorMessages = true
                error["longitude"] = "error verifying longitude"
                error["latitude"] = "error verifying latitude"
            }

            let userDOBDate = new Date(userDOB)
            if (isNaN(userDOBDate.getTime()) || userDOB >= new Date()) {
                errorMessages = true
                error["userDOB"] = "Invalid date"
            }

            if (!new Set(["Male", "Female", "Other"]).has(userGender)) {
                errorMessages = true
                error["userGender"] = "Invalid date"
            }

            if (errorMessages) { res.status(400).json(error); return }

            if (!req.file) { error["userProfilePic"] = "No Image Uploaded"; res.status(400).json(error); return }
            else if (!new Set(allowedPicMimeList).has(req.file.mimetype)) { error["userProfilePic"] = "Wrong image format"; res.status(400).json(error); return }
            else if (req.file.size > fileSizeLimitInBytes) { error["userProfilePic"] = "Size greater than 5Mb"; res.status(400).json(error); return }
            else {

                let profilePicPath = staticFilesPath + userProfilePicPath(profileId)
                sharp(req.file.buffer).webp().toFile(profilePicPath, async (e, i) => {
                    if (e) { error["userProfilePic"] = "Error uploading file"; res.status(500).json(error); return }
                    await prisma.phone.create({
                        data: {
                            phoneId: phoneHash,
                            phone: encript(userPhone, phoneHash),
                            User: {
                                create: {
                                    userId: profileId,
                                    fullName: encript(fullName, profileId),
                                    userGender: userGender,
                                    userDateOfBirth: userDOBDate,
                                    userNameHash: userNameHash,
                                    isOrganization: isOrganization,
                                    userPassword: crypto.createHash("sha512").update(userPassword).digest("hex"),
                                    userName: encript(userName, userNameHash),
                                    longitude: encript("" + longitude, profileId),
                                    latitude: encript("" + latitude, profileId),
                                    emailId: email.id
                                }
                            }
                        }
                    })
                        .then(async () => {
                            let expiryDate = new Date()
                            expiryDate.setDate(expiryDate.getDate() - 1)
                            await prisma.email.update({ where: { emailId: email.id }, data: { isVerified: true } })
                            await prisma.sentMail.deleteMany({ where: { emailId: { equals: email.id }, type: { equals: "signup email" } } })
                            res.cookie("registryEmail", "ok", { expires: new Date() })
                            .cookie("allowFill","yes",{ expires: new Date() })
                            .status(200).json({ message: "User created" })
                            
                        })
                        .catch((e) => {
                            res.status(500).json({ message: "Internal error creating user" })
                            fs.unlinkSync(profilePicPath)
                        })
                })
            }
        })

    })










    app.patch("/api/user/password", verifyUser, CSRFToken, async (req, res) => {

        const { prevPassword, newPassword } = req.body

        if (!prevPassword || !newPassword) { res.status(400).json({ message: "missing fields" }); return }

        await prisma.user.findUnique({ where: { userId: (req as any).userId } }).then(async (user) => {
            if (!user) { res.status(400).json({ message: "couldnt verify user" }); return }

            if (user.userPassword !== crypto.createHash("sha512").update(prevPassword).digest("hex")) { res.status(400).json({ message: "user old password doesnt match" }); return }

            await prisma.user.update({
                where: { userId: (req as any).userId },
                data: {
                    userPassword: crypto.createHash("sha512").update(newPassword).digest("hex")
                }
            })
                .then(() => { res.status(200).json({ message: "password changed successfully" }) })
                .catch(() => { res.status(500).json({ message: "couldnt change password" }) })

        }).catch(() => { res.status(500).json({ message: "couldnt verify user" }) })
    })



    app.patch("/api/user/password/email", CSRFToken, (req, res) => {
        const { userPassword } = req.body

        jwt.verify(req.cookies.registryPass, jwtkey, async (e: any, d: any) => {
            if (e) { res.status(400).json({ message: "error before reset" }); return }

            await prisma.user.findFirst({ where: { emailId: { equals: d.emailId } } })
                .then(async (user) => {
                    if (!user) { res.status(400).json({ message: "No user exists " }); return }

                    await prisma.$transaction([
                        prisma.user.update({
                            where: { userId: user.userId },
                            data: {
                                userPassword: crypto.createHash("sha512").update(userPassword).digest("hex")
                            }
                        }),
                        prisma.sentMail.deleteMany({
                            where: {
                                type: { equals: "forgot password" },
                                emailId: { equals: d.emailId }
                            }
                        })
                    ]).then(()=>{
                        res.status(200).cookie("registryPass", "", { expires: new Date() })
                        .cookie("allowFill","yes",{ expires: new Date() })
                            .json({ message: "Password changed successfully" })
                    }).catch(()=>{
                        res.status(500).json({ message: "Internal error " }) 
                    })

                }).catch(() => { res.status(500).json({ message: "Internal error " }) })
        })
    })



    app.delete("/api/user", verifyUser, CSRFToken, async (req, res) => {

        const myId = (req as any).userId
        await prisma.user.findFirst({
            where: { userId: myId,deletedDate:null }
        }).then(async (user) => {
            if (!user) { res.status(400).json({ message: "no user" }); return }

            await prisma.$transaction([
                prisma.userCommentsItem.deleteMany({where:{userId:myId}}),
                prisma.userCommentsOnComment.deleteMany({where:{userId:myId}}),
                prisma.userMessageUser.deleteMany({where:{
                    OR:[
                        {toUser:myId},{fromUser:myId}
                    ]
                }}),
                prisma.userNotification.deleteMany({where:{userId:myId}}),
                prisma.userRatesUser.deleteMany({where:{fromUser:myId}}),
                prisma.userReportAdmin.deleteMany({where:{fromUser:myId}}),
                prisma.userReportUser.deleteMany({where:{fromUser:myId}}),
                prisma.userReportsItem.deleteMany({where:{userId:myId}}),
                prisma.userRequestsItem.deleteMany({where:{userId:myId}}),
                prisma.user.update({
                    where:{userId:myId},
                    data:{deletedDate:new Date()}
                })
            ]).then(()=>{
                res.status(200).json({ message: "account deleted wait 7days to reactivate" });
            }).catch(()=>{
                res.status(500).json({ message: "internal error eleting acc" });
            })            
        }).catch(() => { res.status(500).json({ message: "internal error" }); return })
    })

    app.patch("/api/user/userProfilePic",verifyUser,CSRFToken,multer({ storage: multer.memoryStorage() }).single("userProfilePic"),async(req,res)=>{
        if (!req.file) {res.status(400).json({message:"no file to update"}); return }
        else if (!new Set(allowedPicMimeList).has(req.file.mimetype)) { res.status(400).json({message:"invalid format"}); return }
        else if (req.file.size > fileSizeLimitInBytes) { res.status(400).json({message:"limit Exceeds expectation"}); return }
        else {
            try{
                let profilePicPath = staticFilesPath + userProfilePicPath( (req as any).userId)
                sharp(req.file.buffer).webp().toFile(profilePicPath, async (e, i) => {
                    if (e) {res.status(500).json({}); return }
                    res.status(200).json({message:"profile pic changed"})
                })
            }catch(e){res.status(500).json({});}
        }
    })


    app.patch("/api/user/fullName",verifyUser,CSRFToken,async (req,res)=>{
        let {fullName} = req.body
        const myId = (req as any).userId
        if(fullName && (fullName as string).length>3){
            await prisma.user.update({
                where:{userId:myId},
                data:{fullName:encript(fullName,myId)}
            }).then((mydata)=>{
                res.status(200).json({
                    message:"Full Name updated",
                    fullName:fullName
                })
            }).catch(()=>{
                res.status(500).json({message:"internal error"})
            })
        }else{
            res.status(400).json({message:"full name not valid or not provided"})
        }
    })

    app.patch("/api/user/userName",verifyUser,CSRFToken,async (req,res)=>{
        let {userName} = req.body
        const myId = (req as any).userId
        if(userName && (userName as string).length>3){
            const userNameHash = crypto.createHash("sha512").update(userName).digest("hex")
            if(await prisma.user.findFirst({where:{userNameHash:userNameHash}})){
                res.status(400).json({message:"common username detected"});
                return
            }

            await prisma.user.update({
                where:{userId:myId},
                data:{
                    userNameHash:userNameHash,
                    userName:encript(userName,userNameHash)
                }
            }).then(()=>{
                res.status(200).json({
                    message:"username updated",
                    userName:userName
                })
            }).catch(()=>{
                res.status(500).json({message:"internal error"})
            })
        }else{
            res.status(400).json({message:"user name not valid or not provided"})
        }
    })

    app.patch("/api/user/userPhone",verifyUser,CSRFToken,async (req,res)=>{
        let {userPhone} = req.body
        const myId = (req as any).userId

        if(userPhone){
            let phoneHash = crypto.createHash("sha512").update(userPhone).digest("hex")
            await prisma.$transaction([
                prisma.user.findFirst({where:{userId:myId}}),
                prisma.user.findFirst({where:{phoneId:phoneHash}})
            ]).then(async ([mydata,commonPhone])=>{
                if(!mydata){res.status(400).json({message:"cannot find user"});return}
                if(commonPhone){res.status(400).json({message:"common phone number found"});return}

                await prisma.$transaction([
                    prisma.user.update({
                        where:{userId:mydata.userId},
                        data:{
                            Phone:{
                                create:{
                                    phone:encript(userPhone,phoneHash),
                                    phoneId:phoneHash
                                }
                            }
                        }
                    }),
                    prisma.phone.delete({where:{phoneId:mydata.phoneId}})
                ],{isolationLevel:Prisma.TransactionIsolationLevel.Serializable}).then(()=>{
                    res.status(200).json({
                        message:"phone number changed",
                        userPhone:userPhone
                    })

                }).catch(()=>{res.status(500).json({message:"internal error"})})

            }).catch(()=>{res.status(500).json({message:"internal error"})})

        }else{
            res.status(400).json({message:"no phonenumber found"})
        }

    })

    app.patch("/api/user/location",verifyUser,CSRFToken,async (req,res)=>{
        let {longitude,latitude} = req.body

        if(!longitude||!latitude){
            res.status(400).json({message:"missing fields"})
            return
        }
            
        try {
            const userId = (req as any).userId

            longitude = parseFloat(longitude)
            latitude = parseFloat(latitude)
            if (longitude > 180 || longitude < -180) { throw new Error("out of bounds") }
            if (latitude > 180 || latitude < -180) { throw new Error("out of bounds") }


            await prisma.user.update({
                where:{userId:userId},
                data:{
                    longitude: encript("" + longitude, userId),
                    latitude: encript("" + latitude, userId),
                }
            }).then(()=>{
                res.status(200).json({ message:"location updated" })
            }).catch(()=>{
                res.status(500).json({message:"internal error"})
            })

        } catch (e) {
            res.status(400).json({message:"error in logitude latitude value"}) 
        }


    })

    app.patch("/api/user/reactivate",CSRFToken,async (req,res)=>{
        if (!req.cookies.reRegistryEmail) { res.status(400).json({ message: "Error putting user register first" }); return }
        const {newPassword} = req.body

        if(!newPassword){ res.status(400).json({ message: "missing fields" }); return }

        jwt.verify(req.cookies.reRegistryEmail, jwtkey, async (e: any, email: any) => {
            if (e) { res.status(400).json({ message: "Error verifying registry" }); return }
            await prisma.user.findFirst({
                where:{
                    emailId:email,
                    deletedDate:{not:null}
                }
            }).then(async (user)=>{
                if(!user||!user.deletedDate){res.status(400).json({ message: "couldnt find user" });return}

                // let expiryDate = new Date()
                // expiryDate.setDate(expiryDate.getDate()-7)
                // if(user.deletedDate>expiryDate){
                //     res.status(400).json({ message: "cant reactivate account immediately wait 7days" });return
                // }

                await prisma.user.update({
                    where:{
                        emailId:email,
                        deletedDate:{not:null}
                    },
                    data:{
                        userPassword:crypto.createHash("sha512").update(newPassword).digest("hex"),
                        deletedDate:null
                    }
                }).then(()=>{
                    res.status(200).json({ message: "Account activated" });
                }).catch(()=>{
                    res.status(500).json({ message: "internal error" });
                })
                
            }).catch(()=>{
                res.status(500).json({ message: "internal error" });
            })
        })

    })

    app.patch("/api/user/ban",verifyAdmin,CSRFToken,async (req,res)=>{
        const {userId} = req.body
        let d = new Date()
        d.setMonth(d.getMonth()+1)

        await prisma.user.update({
            where:{userId:userId},
            data:{
                unlockTime:d
            }
        }).then(()=>{
            res.status(200).json({message:"user banned"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})

        })
        

    })
}

