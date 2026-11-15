import { ILoggingContext } from "./ILogger";
import Logger from "./Logger";


export class TestLoggerImpl {

    logs:string[] = [];

    constructor() {
    }

    debug(context?:ILoggingContext,  message?: unknown, ...optionalParams: unknown[]):void{
        this.log(context, "", message, ...optionalParams);
    }

    info(context?:ILoggingContext,  message?: unknown, ...optionalParams: unknown[]):void{
        this.log(context, "", message, ...optionalParams);
    }

    warn(context?:ILoggingContext,  message?: unknown, ...optionalParams: unknown[]):void{
        this.log(context, "WARN ", message, ...optionalParams);
    }

    error(context?:ILoggingContext,  message?: unknown, ...optionalParams: unknown[]):void{
        //TODO - put more structure to the data shared in request and spit it all out here
        this.log(context, "ERROR", message, ...optionalParams);
    }

    print():void{
        this.logs.forEach(l => {
            console.info(l);
        })
    }

    setup():TestLoggerImpl {
        Logger.setLoggerInstance(this);
        return this;
    }

    clear():void{
        this.logs=[];
    }

    log(context?:ILoggingContext, levelStr?:string,  message?: unknown, ...optionalParams: unknown[]):void { 
        let lvlStr = "";
        let ctxStr = "";
        let prefix = "";
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

        let msg = `${prefix}${lvlStr}${message}${ctxStr}`;
        optionalParams.forEach(param => {
            msg += "\n" + JSON.stringify(param);
        });
        this.logs.push(msg);
    }
}