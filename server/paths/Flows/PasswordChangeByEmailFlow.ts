import { Express } from "express";
import { prisma } from "../..";
import { sendMail } from "../../components/Resources";
import { CSRFToken, jwtkey } from "../../components/ExpressApp";
import crypto from "crypto"
import jwt from "jsonwebtoken"

export function passwordChangeByEmail(app:Express){
    
    app.post("/api/email/forgot/password",CSRFToken,async (req,res)=>{
        const {userEmail} = req.body

        let uniqueId = crypto.createHash("sha512").update(req.body.userEmail).digest("hex")
        if(!await prisma.user.findFirst({where:{emailId:{equals:uniqueId}}})){res.status(404).json({message:"user doesnt exist"});return}

        let OTP = ""
        for (let index = 0; index < 6; index++) { OTP+=Math.floor(Math.random()*10) }

        let mailId = crypto.createHash("sha512").update(crypto.randomUUID()).digest("hex")
        let mailValue = crypto.createHash("sha512").update(OTP).digest("hex")

        let expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate()-1)

        let totalSentEmail = await prisma.sentMail.findMany({where:{
            emailId:{equals:uniqueId},
            sentDate:{gt:expiryDate},
            type:{equals:"forgot password"}
        }})
        if(
            totalSentEmail.filter(sm=>sm.isSent).length>2 ||
            totalSentEmail.filter(sm=>!sm.isSent).length>4
        ){res.status(403).json({message:"Too many signup requests"});return}

        await prisma.sentMail.create({data:{
            mailId:mailId,
            emailId:uniqueId,
            value:mailValue,
            type:"forgot password"
        }})
        .then(()=>{
            sendMail({to:userEmail,title:"SabaiShare (Password Reset Link)",body:`
            <h1>Hello from Sabaishare</h1>

            <h3><a href="${req.protocol}://${req.get("host")}/api/user/reset/password/email/${mailId}/${mailValue}">Here is the link to reset password</a></h3>
            
            <span style="color:red">Note: This email expires in 1day.</span>
    
            `})
            .then(async ()=>{
                await prisma.sentMail.update({where:{mailId:mailId},data:{isSent:true}})
                res.status(200).json({message:"email sent and registered"})
            })
            .catch(()=>{res.status(500).json({message:"counldnt send email"})})
        })
        .catch(()=>{res.status(500).json({message:"counldnt register email"})})
    })


    app.get("/api/user/reset/password/email/:mailId/:mailValue",async (req,res)=>{
        let expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate()-1)
        await prisma.sentMail.findFirst({where:{
            mailId:{equals:req.params.mailId},
            value:{equals:req.params.mailValue},
            isSent:{equals:true},
            type:{equals:"forgot password"},
            sentDate:{gt:expiryDate}
        }}).then((sentMail)=>{
            if(!sentMail){res.status(404).json({message:"No reset link found"});return}
            res.cookie("registryPass",jwt.sign({id:sentMail.emailId},jwtkey),{httpOnly:true,sameSite:"strict"})
            .cookie("allowFill","yes")
            .status(200)
            .redirect(`${req.protocol}://${req.get("host")}/form/PasswordChangeByEmail`)
        }).catch(e=>{res.status(500).json({message:"Internal error verifying registry"})})
    })

    
    // "/api/user/password/email" with user password look in user
    

}