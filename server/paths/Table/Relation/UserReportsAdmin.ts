import { Express,Request, Response } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";

export function userReportAdminPaths(app: Express) {

    app.put("/api/userReportAdmin",verifyUser,CSRFToken,async (req,res)=>{
        let {toUser,purpose,description} = req.body
        if(!toUser){res.status(400).json({message:"whom to report?"});return}
        if(!purpose||!description){res.status(400).json({message:"missing fields"});return}
        const userId = (req as any).userId 

        await prisma.userReportAdmin.create({
            data:{
                fromUser:userId,
                description:description,
                purpose:purpose
            }
        }).then((userReportAdmin)=>{
            if(!userReportAdmin){res.status(500).json({message:"couldnt report admin"})}
            res.status(200).json({message:"reported successfully"})
        }).catch(()=>{res.status(500).json({message:"couldnt report admin"})})
    })
    
}