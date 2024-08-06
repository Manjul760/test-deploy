import { Express,Request, Response } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { verifyAdmin, verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";

export function userReportsItemPaths(app: Express) {

    app.put("/api/userReportsItem",verifyUser,CSRFToken,async (req,res)=>{
        let {itemId,purpose,description} = req.body
        if(!itemId){res.status(400).json({message:"what to report?"});return}
        if(!purpose||!description){res.status(400).json({message:"missing fields"});return}
        const userId = (req as any).userId 

        await prisma.userReportsItem.create({
            data:{
                userId:userId,
                description:description,
                purpose:purpose,
                itemId:itemId
            }
        }).then((userReportsItem)=>{
            if(!userReportsItem){res.status(500).json({message:"couldnt report item"})}
            res.status(200).json({message:"reported successfully"})
        }).catch(()=>{res.status(500).json({message:"couldnt report item"})})
    })

    app.delete("/api/userReportsItem",verifyAdmin,CSRFToken,async(req,res)=>{
        const {itemReportId}=req.body
        await prisma.userReportsItem.delete({
            where:{itemReportId:itemReportId}
        }).then(()=>{
            res.status(200).json({message:"report deleted"})
        }).catch(()=>{
            res.status(500).json({message:"error deleting report"})
        })
    })
    
}