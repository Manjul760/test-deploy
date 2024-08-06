import { Express } from "express";
import { CSRFToken, decript, encript } from "../../../components/ExpressApp";
import { prisma } from "../../..";
import { randomUUID } from "crypto";

export function feedbackPath(app: Express) {
    app.delete("/api/feedback",CSRFToken,async(req,res)=>{
        const {feedbackId} = req.body
        await prisma.feedback.delete({where:{feedbackId:feedbackId}})
        .then(()=>{
            res.status(200).json({message:"feedback deleted"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
    })
    app.delete("/api/feedback/all",CSRFToken,async(req,res)=>{
        await prisma.feedback.deleteMany()
        .then(()=>{
            res.status(200).json({message:"feedbacks deleted"})
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
        
    })
    
    app.put("/api/feedback",CSRFToken,async (req,res)=>{
        const {name,email,description} = req.body

        let d = new Date()
        d.setDate(d.getDate()-1)

        await prisma.feedback.findMany({where:{
            postedDate:{gt:d}
        }}).then(async (f)=>{
            for (let index = 0; index < f.length; index++) {
                if(decript(f[index].email,f[index].feedbackId)==email){
                    res.status(400).json({message:"Cannot provide multiple feedback in 1 day"});
                    return
                }
            }
            
            let uniqueId = randomUUID()

            await prisma.feedback.create({
                data:{
                    email:encript(email,uniqueId),
                    feedbackId:uniqueId,
                    description:description,
                    name:encript(name,uniqueId)
                }
            }).then(()=>{
                res.status(200).json({message:"feedback Provided"})
            })
        }).catch(()=>{
            res.status(500).json({message:"internal error"})
        })
    })



}

