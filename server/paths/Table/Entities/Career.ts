import { Express } from "express";
import { CSRFToken } from "../../../components/ExpressApp";
import { prisma } from "../../..";

export function careerPaths(app: Express) {
    app.get("/api/career/:careerId",async(req,res)=>{
        const {careerId} = req.params
        await prisma.career.findFirst({
            where:{careerId:careerId}
        }).then((c)=>{
            if(!c){res.status(404).json({message:"no such career"});return}
            res.status(200).json(c)
        }).catch(()=>{
            res.status(500).json({message:"Internal error"})
        })

    })
    app.delete("/api/career",CSRFToken,async(req,res)=>{
        const {careerId} = req.body
        await prisma.career.delete({where:{careerId:careerId}})
        .then(()=>{
            res.status(200).json({message:"career deleted"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
    })
    app.delete("/api/career/all",CSRFToken,async(req,res)=>{
        await prisma.career.deleteMany()
        .then(()=>{
            res.status(200).json({message:"careers deleted"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
        
    })
    
    app.put("/api/career",CSRFToken,async (req,res)=>{
        const {jobTitle,natureOfJob,jobLocation,jobType,jobDescription,jobRequirements,jobBenefits} = req.body

        let d = new Date()
        d.setDate(d.getDate()-1)

        await prisma.career.create({
            data:{
                jobBenefits:jobBenefits,
                jobDescription:jobDescription,
                jobLocation:jobLocation,
                jobRequirements:jobRequirements,
                jobTitle:jobTitle,
                jobType:jobType,
                natureOfJob:natureOfJob,
            }
        }).then(()=>{
            res.status(200).json({message:"feedback Provided"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
 
    })



}

