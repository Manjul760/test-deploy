import { Express } from "express";
import { prisma } from "../..";
import cryptojs from "crypto-js"
import { verifyUser } from "../loginlogout/LoginLogout";
import { decript, itemMultimediaPath, userProfilePicPath } from "../../components/ExpressApp";
import crypto from "crypto"

export function profilePageDisplayPaths(app: Express) {
    app.get("/api/profile/:userId", async (req, res) => {
        await prisma.user.findFirst({
            where: {
                OR:[
                    {userId: req.params.userId},
                    {userNameHash:crypto.createHash("sha512").update(req.params.userId).digest("hex")}
                ],
            },
            select: {
                userId: true,
                userName: true,
                userNameHash: true,
                fullName:true
            }
        }).then(async (user) => {
            if (!user) { res.status(404).json({ message: "No user Found" }); return }

            let rating = await prisma.userRatesUser.aggregate({
                where: {
                    toUser:req.params.userId
                },
                _count: true,
                _avg: { star: true }
            })

            let displayUser: any = user
            displayUser.fullName = decript(displayUser.fullName,displayUser.userId)
            displayUser.profilePicPath = userProfilePicPath(displayUser.userId)
            displayUser.userName = decript(displayUser.userName, displayUser.userNameHash),
            displayUser.userNameHash = undefined
            displayUser.rating = rating._avg.star
            displayUser.reviewCount = rating._count

            res.status(200).json(displayUser)

        })

    })

    app.get("/api/profile/ItemList/:userId", async (req, res) => {
        await prisma.user.findFirst({
            where: {
                OR:[
                    {userId: req.params.userId},
                    {userNameHash:crypto.createHash("sha512").update(req.params.userId).digest("hex")}
                ],
            },
            include: {
                CreatedItems: {
                    include: {
                        ItemMultimedias: true
                    }
                }
            }
        }).then((user) => {
            if (!user) { res.status(404).json({ message: "no user found" }); return }

            let data = user.CreatedItems

            let displayData: any[] = []

            data.forEach((item) => {
                item.ItemMultimedias.forEach((m: any) => {
                    m.path = itemMultimediaPath(m.multimediaId, m.extension)
                })
                item.itemDistrict = item.itemDistrict
                let itemAvilableCount = item.itemAvilableCount.toString()

                displayData.push({
                    ...item,
                    latitude: undefined,
                    longitude: undefined,
                    itemAvilableCount: itemAvilableCount.toString(),
                    itemCount: undefined
                })

            })

            res.status(200).json(displayData)

        })

    })


}




type o = {
    "itemId": string,
    "itemName": string,
    "itemAvilableCount": string,
    "itemDescription": string,
    "itemDistrict": string,
    "createdDate": string,
    "modifiedDate": string,
    "discontinuedDate": null | string,
    "revokedDate": null | string,
    "category": string,
    "userId": string,
    "ItemMultimedias": {
        "multimediaId": string,
        "type": string,
        "extension": string,
        "itemId": string,
        "path": string
    }[]
}[]
