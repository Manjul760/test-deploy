import * as crypto from "crypto"
import express, { NextFunction } from "express"
import { Express, Request, Response } from "express"
// import session = require("express-session")
import cors = require("cors")
// const MySQLStore = require("express-mysql-session")(session)
import { websitePaths } from "../paths/paths"
import multer = require("multer")
import fs from "fs"
import cryptojs from "crypto-js"
import { prisma } from ".."

let app: Express | undefined = undefined
export const sessionsecret = crypto.createHash("sha256").update(crypto.randomUUID()).digest("hex")
export const jwtkey = crypto.createHash("sha256").update("sabaishare 2024 ∞").digest("hex")

function tokenHash(path:string,method:string,expiryDate:string,reqIp:string,agent:string,tokenId:string){
    return crypto
    .createHash("sha256")
    .update(`path[${path}] ∞ 
            method:${method}
            expiryDate=${expiryDate} ∞ 
            reqIp:${reqIp} ,
            user:${agent}
            tokenId:${tokenId}`)
    .digest("hex")
}

function CSRFTokenCreation(req: any, res: any,path:string,method:string){
    let expiryDate = new Date()
    expiryDate.setMinutes(expiryDate.getMinutes() + 15)

    let expiryDateString = expiryDate.toISOString();
    let tokenId = crypto.randomUUID()

    return {
        token:tokenHash(path,method,expiryDateString,req.ip as string,req.get("User-Agent") as string,tokenId),
        expiryDate:expiryDateString,
        tokenId:tokenId
    }

}


export function CSRFToken(req: any, res: any,next:NextFunction) {
    if(req.headers["request-purpose"]==="token"){
        res.status(200).json(CSRFTokenCreation(req,res,req.path,req.method))

    }else if (req.headers["request-purpose"] === "submit") {
        const {expirydate,tokenid,token} = req.headers
        if(!expirydate||!tokenid||!token){res.sendStatus(404);}
        else if(new Date(expirydate as string)<new Date()){res.status(403).json({ message: "token expired" });}
        else if(token === tokenHash(req.path,req.method,expirydate as string,req.ip as string,req.get("User-Agent") as string,tokenid as string)){next();}
        else{ res.status(403).json({ message: "invalid token" }); }

    }else{
        res.status(403).json({ message: "header error" });
    }
}


export function ExpressApp(): Express {
    if (app) { return app }

    [
        staticFilesPath,
        staticFilesPath+serverStaticPath,
        staticFilesPath+userProfilePicsStaticPath,
        staticFilesPath+itemMultimediasStaticPath
    ].forEach((path)=>{
        if(!fs.existsSync(path)){fs.mkdirSync(path)}
    })
    


    app = express()
    app.use(express.json())
    app.use(require("cookie-parser")())
    app.use(cors({
        credentials:true,
        origin:"http://localhost:5173" //for testing purpose later noneed
        // origin:"http://192.168.1.71:5173" //for testing purpose later noneed
    }))
    // app.use(session({
    //     cookie: {httpOnly: true, maxAge: 1800000 },
    //     secret: sessionsecret,
    //     saveUninitialized: false,
    //     resave: false,
    //     store: new MySQLStore({
    //         host: process.env.DATABASE_HOST,
    //         port: process.env.DATABASE_PORT,
    //         user: process.env.DATABASE_USER,
    //         password: process.env.DATABASE_PASS,
    //         database: process.env.DATABASE_NAME
    //     })
    // }))

    
    app.use(express.static(staticFilesPath))
    app.use(express.static("./build-frontend"))
    app.set('views', templateFilesPath);
    
    app.set('view engine', 'ejs');

    websitePaths.forEach((path)=>{path(app as Express)})
    app.use((err:any,req:any,res:any,next:NextFunction)=>{
        if (err instanceof multer.MulterError) {
            res.status(400).json({message:"File error: "+err.message});
        } else {
            res.status(500).send('Internal server error');
        }
    })

    
    app.get("/item/:itemId",async (req,res)=>{
        await prisma.item.findFirst({
            where:{
                itemId:req.params.itemId,
                revokedDate:null,
                discontinuedDate:null
            },
            include:{
                ItemMultimedias:{
                    where:{
                        type:{equals:"image"}
                    }
                }
            }
        }).then((item)=>{
            if(!item){res.status(200).redirect("/");return}

            let randomindex = Math.floor(Math.random()*item.ItemMultimedias.length)
            let multimedia = item.ItemMultimedias.find((v,i)=>i===randomindex)
            
            if(!multimedia){res.status(200).redirect("/");return}
            
            let baseurl = req.get("host")
            res.status(200).render("index/item",{
                baseurl:baseurl,
                itemName:item.itemName,
                itemPicPath:baseurl+itemMultimediaPath(multimedia.multimediaId,multimedia.extension),
                itemurl:baseurl+"/item/"+item.itemId,
                itemDescription:item.itemDescription
            })

        }).catch(()=>{res.status(500).json({message:"internal error"})})
    })

    
    
    app.get(["/","index.html","/*","*"],(req,res)=>{res.status(200).render("index/normal",{baseurl:req.get("host")})})
    return app
}

//always start with / other wise get error
export function userProfilePicPath(userId:string){  return `${userProfilePicsStaticPath}/${userId}.webp` }
export function itemMultimediaPath(multimediaId:string,ext:string){
    return `${itemMultimediasStaticPath}/${multimediaId}.${ext}`
}
export const templateFilesPath = "./templates"
export const staticFilesPath = "./static"

export const serverStaticPath = "/serverImages"
export const userProfilePicsStaticPath ="/serverImages/UserProfilePics" 
export const itemMultimediasStaticPath = "/serverImages/ItemMultimedias"

export const allowedPicMimeList = ["image/jpg", "image/jpeg", "image/png", "image/heic","image/webp"]
export const fileSizeLimitInBytes = 5 * 1024 * 1024



export function encript(v:string,k:string){
    return cryptojs.AES.encrypt(v,k).toString()
}
export function decript(v:string,k:string){
    return cryptojs.AES.decrypt(v,k).toString(cryptojs.enc.Utf8)
}




