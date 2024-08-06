import { Express, Request, Response } from "express";
import { prisma } from "../..";
import { itemMultimediaPath } from "../../components/ExpressApp";

export function homePageDisplayPaths(app: Express) {

    app.get("/api/itemList/category/:category/district/:district/count/:limit/pageno/:pageNumber/text/:text?", async (req, res) => {
        let limit: number
        let pageNumber: number
        try {
            limit = parseInt(req.params.limit)
            pageNumber = parseInt(req.params.pageNumber)

            if (pageNumber < 0 || limit < 1) { throw new Error("limit too low") }
        } catch (e) {

            limit = 100
            pageNumber = 0
        }

        let whereFilter: any = {}
        if (req.params.category && req.params.category !== "All") {
            whereFilter["category"] = { contains: req.params.category }
        }
        if (req.params.district && req.params.district !== "All") {
            whereFilter["itemDistrict"] = { contains: req.params.district }
        }
        if (req.params.text) {
            whereFilter["itemName"] = { contains: req.params.text }
        }
        
        if(req.cookies._DIU_){
            whereFilter["userId"] = {not:req.cookies._DIU_}
        }


        await prisma.item.findMany({
            where: {
                ...whereFilter,
                
                itemAvilableCount: { gt: 0 },
                discontinuedDate: { equals: null },
                revokedDate: { equals: null },
                User:{
                    OR:[
                       {unlockTime:null},
                       {unlockTime:{lte:new Date()}} 
                    ],
                }
                
            },
            orderBy:{createdDate:"desc"},
            include: {
                ItemMultimedias: true
            },
            take: limit,
            skip: limit * pageNumber
        }).then((data) => {
            if (!data) { res.status(404).json({ message: "nodata" }); return }

            res.status(200).json(
                data.map((item) => {
                    item.ItemMultimedias.forEach((m: any) => {
                        m.path = itemMultimediaPath(m.multimediaId, m.extension)
                    })
                    let itemAvilableCount = item.itemAvilableCount.toString()
                    return {
                        ...item,
                        latitude: undefined,
                        longitude: undefined,
                        itemAvilableCount: itemAvilableCount.toString(),
                        itemCount: undefined
                    }
                })
            )

        }).catch((e) => { 
            console.log(e)
            res.status(500).json({ message: "internal error" }) })
    })
}





