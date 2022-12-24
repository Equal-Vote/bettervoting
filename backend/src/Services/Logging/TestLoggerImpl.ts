import { randomUUID } from "crypto";
import { ILoggingContext } from "./ILogger";
import Logger from "./Logger";


export class TestLoggerImpl {

    logs:string[] = [];

    constructor() {
    }

    debug(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        this.log(context, "", message, ...optionalParams);
    }

    info(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        this.log(context, "", message, ...optionalParams);
    }

    warn(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        this.log(context, "WARN ", message, ...optionalParams);
    }

    error(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        //TODO - put more structure to the data shared in request and spit it all out here
        this.log(context, "ERROR", message, ...optionalParams);
    }

    print():void{
        var str = ""
        this.logs.forEach(l => {
            str+= l+"\n";
        });
        console.log(str);
    }

    setup():TestLoggerImpl {
        Logger.setLoggerInstance(this);
        return this;
    }

    clear():void{
        this.logs=[];
    }

    log(context?:ILoggingContext, levelStr?:string,  message?: any, ...optionalParams: any[]):void { 
        var msg = "";
        var lvlStr = "";
        var ctxStr = "";
        var prefix = "";
        if (context!= null){
            ctxStr = "  ctx:" + context.contextId;
            if (context.logPrefix == null){
                context.logPrefix = "";
            }
            prefix = context.logPrefix;
            if (context.logPrefix == ""){
                context.logPrefix = ". . ";
            }
        }
        if (levelStr != null && lvlStr.length >0){
            lvlStr = levelStr+"  ";
        }

        var msg = `${prefix}${lvlStr}${message}${ctxStr}`;
        optionalParams.forEach(param => {
            msg += "\n" + JSON.stringify(param);
        });
        this.logs.push(msg);
    }
}