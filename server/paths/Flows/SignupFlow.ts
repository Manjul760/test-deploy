import { Express } from "express";
import { prisma } from "../..";
import { sendMail } from "../../components/Resources";
import { CSRFToken, encript, jwtkey } from "../../components/ExpressApp";
import crypto from "crypto"
import jwt from "jsonwebtoken"

export function signupFlow(app:Express){

    app.post("/api/email/signup/registration", CSRFToken,async (req, res) => {
        const {userEmail} = req.body
        if(!userEmail||typeof userEmail != "string"){res.status(400).json({message:"Error data"});return}

        let uniqueId = crypto.createHash("sha512").update(req.body.userEmail).digest("hex")
        if(await prisma.user.findFirst({
            where:{
                emailId:{equals:uniqueId},
                deletedDate:null
            },
        })){res.status(401).json({message:"user exists"});return}

        await prisma.email.findFirst({where:{emailId:uniqueId}})
        .then(async (email)=>{
            if(!email){
                email = await prisma.email.create({data:{
                    emailId:uniqueId,
                    email:encript(req.body.userEmail,uniqueId)
                }})
            }

            let OTP = ""
            for (let index = 0; index < 6; index++) { OTP+=Math.floor(Math.random()*10) }

            let mailId = crypto.createHash("sha512").update(crypto.randomUUID()).digest("hex")
            let mailValue = crypto.createHash("sha512").update(OTP).digest("hex")

            let expiryDate = new Date()
            expiryDate.setDate(expiryDate.getDate()-1)

            let totalSentEmail = await prisma.sentMail.findMany({where:{
                emailId:{equals:uniqueId},
                sentDate:{gt:expiryDate},
                type:{equals:"signup email"}
            }})
            if(
                totalSentEmail.filter(sm=>sm.isSent).length>2 ||
                totalSentEmail.filter(sm=>!sm.isSent).length>4
            ){res.status(403).json({message:"Too many signup requests"});return}

            await prisma.sentMail.create({data:{
                mailId:mailId,
                emailId:uniqueId,
                value:mailValue,
                type:"signup email"
            }})
            .then(()=>{
                sendMail({to:userEmail,title:"SabaiShare (Signup Link)",body:`
                <h1>Welcome to Sabaishare</h1>

                <h3><a href="${req.protocol}://${req.get("host")}/api/user/create/email/${mailId}/${mailValue}">Here is the link to sign up</a></h3>
                
                <span style="color:red">Note: This email expires in 1day.</span>
        
                `})
                .then(async ()=>{
                    await prisma.sentMail.update({where:{mailId:mailId},data:{isSent:true}})
                    res.status(200).json({message:"email sent and registered"})
                })
                .catch(()=>{res.status(500).json({message:"counldnt send email"})})
            })
            .catch(()=>{res.status(500).json({message:"counldnt register email"})})
        }).catch((e)=>{res.status(500).json({message:"counldnt process request"})})
    })
    


    app.get("/api/user/create/email/:mailId/:mailValue",async (req,res)=>{
        let expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate()-1)
        
        await prisma.sentMail.findFirst({where:{
            mailId:{equals:req.params.mailId},
            value:{equals:req.params.mailValue},
            isSent:{equals:true},
            type:{equals:"signup email"},
            sentDate:{gt:expiryDate}
        }}).then(async (sentMail)=>{
            if(!sentMail){res.status(400).json({message:"No registry found"});return}

            await prisma.user.findFirst({
                where:{
                    emailId:sentMail.emailId,
                    deletedDate:{not:null}
                }
            }).then((user)=>{
            
                res
                .cookie(user?"reRegistryEmail":"registryEmail",jwt.sign({id:sentMail.emailId},jwtkey),{httpOnly:true,sameSite:"strict"})
                .cookie("allowFill","yes")
                .status(200)
                .redirect(
                    `${req.protocol}://${req.get("host")}${user?"/form/ReactivateAccount":"/form/SignupForm"}`
                )
                    
            }).catch(e=>{res.status(500).json({message:"Internal error verifying registry"})})
        }).catch(e=>{res.status(500).json({message:"Internal error verifying registry"})})
    })

    //then /api/user in put method with data see in user
    //or /api/user/reactivate in patch method if account exists 

}