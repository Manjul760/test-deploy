import { Express,NextFunction,Request, Response } from "express";
import { prisma } from "../..";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { jwtkey,CSRFToken } from "../../components/ExpressApp";
// import cors from "cors"

type userJWTPayload = {
    userId:string,
    identity:string,
    loginDate:string,
    orgOrUser:"O"|"U"
}


export function loginLogoutPaths(app: Express) {

    app.post("/api/user/login",CSRFToken,async (req,res)=>{

        let {userEmail,userPassword,rememberMe} = req.body

        if(!userEmail||!userPassword){res.status(400).json({message:"Missing fields"});return}
        
        let userEmailHash = crypto.createHash("sha512").update(userEmail).digest("hex")

        await prisma.user.findFirst({where:{
            OR:[
                {emailId:userEmailHash},
                {userNameHash:userEmailHash}
            ],
        }}).then(async (user)=>{
            if(!user){res.status(404).json({message:"Email does not match"});return}

            await prisma.user.findUnique({where:{
                OR:[
                    {emailId:userEmailHash},
                    {userNameHash:userEmailHash}
                ],
                deletedDate:null,
                userPassword:crypto.createHash("sha512").update(userPassword).digest("hex")
            }})
            .then((u)=>{
                if(!u){res.status(401).json({message:"Incorrect password"});return}
                let presentDate = new Date().getTime()+""
                let identifier = crypto.randomUUID()
                let OrgOrUser = u.isOrganization?"O":"U"
                let signedData = jwt.sign({
                    userId:u.userId,
                    identity:identifier,
                    loginDate:presentDate,
                    orgOrUser:OrgOrUser
                },jwtkey)
    
    
                if(u.unlockTime && new Date(u.unlockTime) > new Date()){
                    res.status(401).json({message:"User Banned"})
                    return
                }
    
                let expiryDate=rememberMe?new Date(new Date().setFullYear(new Date().getFullYear() + 1000)):undefined
                res.status(200)
                .cookie("user",signedData,{httpOnly:true,sameSite:"strict",expires:expiryDate})
                .cookie("LI",identifier,{httpOnly:true,sameSite:"strict",expires:expiryDate})
                .cookie("_LD",presentDate,{httpOnly:true,sameSite:"strict",expires:expiryDate})
                .cookie("_DIU_",u.userId,{sameSite:"strict",expires:expiryDate})
                .cookie("isLoggedIn","true",{sameSite:"strict",expires:expiryDate})
                .cookie("OU",OrgOrUser,{sameSite:"strict",expires:expiryDate})
                .json({message:"User logged in"});
                
            }).catch(()=>{res.status(500).json({message:"Internal error"})})

        })

    })

    app.post("/api/admin/login",CSRFToken,async (req,res)=>{
        let {userEmail,userPassword,rememberMe} = req.body
        if(userEmail == "SabaiShare69" && userPassword=="SabaiShare69"){
            let presentDate = new Date().getTime()+""
            let identifier = crypto.randomUUID()
            let OrgOrUser = "U"
            let signedData = jwt.sign({
                userId:"admin",
                identity:identifier,
                loginDate:presentDate,
                orgOrUser:OrgOrUser
            },jwtkey)
    
            let expiryDate=rememberMe?new Date(new Date().setFullYear(new Date().getFullYear() + 1000)):undefined
            res.status(200)
            .cookie("_DIU_","",{sameSite:"strict",expires:new Date()})
            .cookie("user",signedData,{httpOnly:true,sameSite:"strict",expires:expiryDate})
            .cookie("LI",identifier,{httpOnly:true,sameSite:"strict",expires:expiryDate})
            .cookie("_LD",presentDate,{httpOnly:true,sameSite:"strict",expires:expiryDate})
            .cookie("isLoggedIn","true",{sameSite:"strict",expires:expiryDate})
            .cookie("OU",OrgOrUser,{sameSite:"strict",expires:expiryDate})
            .json({message:"User logged in"});
        }else{
            res.sendStatus(404)
        }

    })


    app.post("/api/user/logout",CSRFToken,(req,res)=>{
        let presentDate = new Date()

        res.status(200)
        .cookie("user","",{httpOnly:true,sameSite:"strict",expires:presentDate})
        .cookie("LI","",{httpOnly:true,sameSite:"strict",expires:presentDate})
        .cookie("_LD","",{httpOnly:true,sameSite:"strict",expires:presentDate})
        .cookie("_DIU_","",{sameSite:"strict",expires:presentDate})
        .cookie("isLoggedIn","",{sameSite:"strict",expires:presentDate})
        .cookie("OU","",{sameSite:"strict",expires:presentDate})
        .json({message:"User logged out"});
    })
}


export type userLoginCookieFormat = {
    user: string,
    LI: string,
    _LD: string,
    _DIU_: string,
    isLoggedIn: string,
    OU: string
}

export async function verifyUser(req: any,res:any,next:NextFunction){
    await verifyUserLoginToken(req).then(()=>{
        next()
    }).catch((message)=>{
        res.status(403).json({message:message})
    })
}
export async function verifyAdmin(req: any,res:any,next:NextFunction){
    await verifyAdminLoginToken(req).then(()=>{
        next()
    }).catch((message)=>{
        res.status(403).json({message:message})
    })
}

export function verifyUserLoginToken(req:any){
    return new Promise(async (resolve,reject)=>{
        
        if(!req.cookies ||!req.cookies.user){reject("no user");return}
        jwt.verify(req.cookies.user,jwtkey,async(e: any,d:any)=>{
            if(e){reject("login error");return}

            const {LI,_LD,isLoggedIn,OU,_DIU_} = req.cookies
            if(!await prisma.user.findFirst({
                where:{
                    userId:_DIU_,
                    deletedDate:null,
                    OR:[
                        {unlockTime:null},
                        {unlockTime:{lte:new Date()}} 
                     ],
                }
            })){reject("no user");return}

            let data:userJWTPayload = d
            if(
                (_DIU_&&LI&&_LD&&isLoggedIn&&OU)&&
                _DIU_ === data.userId &&
                data.identity === LI &&
                data.loginDate === _LD &&
                isLoggedIn === "true" &&
                data.orgOrUser === OU
            ){
                req.userId = data.userId
                req.isOrg = data.orgOrUser==="O"
                resolve(true)
            }else{
                reject("error verifying user");
            }
        })
    })
}
export function verifyAdminLoginToken(req:any){
    return new Promise(async (resolve,reject)=>{
        
        if(!req.cookies ||!req.cookies.user){reject("no user");return}
        jwt.verify(req.cookies.user,jwtkey,async(e: any,d:any)=>{
            if(e){reject("login error");return}

            const {LI,_LD,isLoggedIn,OU} = req.cookies

            let data:userJWTPayload = d
            if(
                (LI&&_LD&&isLoggedIn&&OU)&&
                "admin" === data.userId &&
                data.identity === LI &&
                data.loginDate === _LD &&
                isLoggedIn === "true" &&
                data.orgOrUser === OU
            ){
                req.userId = "admin"
                resolve(true)
            }else{
                reject("error verifying user");
            }
        })
    })
}

// export function allowOrgsOnly(req:any,res:any,next:NextFunction){
//     if(req.isOrg && req.isOrg==="O"){next()}
//     else{
//         res.status(403).json({message:"only for orgs"})
//     }
// }
// export function allowUsersOnly(req:any,res:any,next:NextFunction){
//     if(req.isOrg && req.isOrg==="O"){next()}
//     else{
//         res.status(403).json({message:"only for users"})
//     }
// }
// export function onlyLocalHostOnly(req:any,res:any,next:NextFunction){
//     cors({
//         origin:process.env.DOMAIN_NAME,
//         credentials:true
//     })(req,res,next)
// }

