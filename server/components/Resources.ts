import nodemailer from "nodemailer"

export function sendMail({to,title,body}:{to:string,title:string,body:string}) {
    return new Promise((resolve,reject)=>{
        try{
            nodemailer.createTransport({
                service: process.env.SYSTEM_EMAIL_SERVICE_PROVIDER,
                auth: {
                    user: process.env.SYSTEM_EMAIL,
                    pass: process.env.SYSTEM_EMAIL_PASSWORD
                }
            }).sendMail({
                from: process.env.SYSTEM_EMAIL,
                to: to,
                subject: title,
                text: body,
                html:body
                
            }, function (error: any, info: { response: string; }) {
                if (error) {reject(error)}
                resolve(info.response)
            });

        }catch(e){reject(e)}
    })
    
}