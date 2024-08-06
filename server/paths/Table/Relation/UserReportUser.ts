import { Express } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { verifyAdmin, verifyUser } from "../../loginlogout/LoginLogout";
import { prisma } from "../../..";

export function userReportUserPaths(app: Express) {

    app.put("/api/userReportUser",verifyUser,CSRFToken,async (req,res)=>{
        let {toUser,purpose,description} = req.body
        if(!toUser){res.status(400).json({message:"whom to report?"});return}
        if(!purpose||!description){res.status(400).json({message:"missing fields"});return}
        const userId = (req as any).userId 
        if(toUser === userId && !process.env.DEVELOPMENT){res.status(400).json({message:"cannot report self"});return}

        await prisma.userReportUser.create({
            data:{
                fromUser:userId,
                toUser:toUser,
                description:description,
                purpose:purpose
            }
        }).then((userReportUser)=>{
            if(!userReportUser){res.status(500).json({message:"couldnt report user"})}
            res.status(200).json({message:"reportd successfully"})
        }).catch(()=>{res.status(500).json({message:"couldnt report user"})})
    })

    app.delete("/api/userReportUser",verifyAdmin,CSRFToken,async(req,res)=>{
        const {userReportId}=req.body
        await prisma.userReportUser.delete({
            where:{userReportId:userReportId}
        }).then(()=>{
            res.status(200).json({message:"report deleted"})
        }).catch(()=>{
            res.status(500).json({message:"error deleting report"})
        })
    })
    
}