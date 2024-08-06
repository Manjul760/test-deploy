import { Express, Request, Response } from "express";
import { prisma } from "../..";

export function careerPageDisplayPaths(app: Express) {

    app.get("/api/careerList", async (req, res) => {
        await prisma.career.findMany({
            orderBy:{createdDate:"desc"}
        }).then((careerList)=>{
            res.status(200).json(careerList)
        }).catch(()=>{
            res.status(500).json({message:"Internal error"})
        })
    })
        
}





