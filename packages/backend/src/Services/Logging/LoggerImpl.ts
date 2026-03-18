import { randomUUID } from "crypto";
import { ILoggingContext } from "./ILogger";


const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
type LogLevel = typeof LOG_LEVELS[number];

function getLogLevel(): LogLevel {
    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
    if (LOG_LEVELS.includes(level as LogLevel)) return level as LogLevel;
    return 'info';
}

function shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVELS.indexOf(messageLevel) >= LOG_LEVELS.indexOf(getLogLevel());
}

export class LoggerImpl {

    constructor() {
    }

    debug(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        if (!shouldLog('debug')) return;
        this.log(context, "", message, ...optionalParams);
    }

    info(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        if (!shouldLog('info')) return;
        this.log(context, "", message, ...optionalParams);
    }

    warn(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        if (!shouldLog('warn')) return;
        this.log(context, "WARN ", message, ...optionalParams);
    }

    error(context?:ILoggingContext,  message?: any, ...optionalParams: any[]):void{
        if (!shouldLog('error')) return;
        this.log(context, "ERROR", message, ...optionalParams);
    }

    log(context?:ILoggingContext, levelStr?:string,  message?: any, ...optionalParams: any[]):void { 
        var msg = "";
        var lvlStr = "";
        var ctxStr = "";
        var prefix = "";
        if (context!= null){
            ctxStr = "ctx:" + context.contextId;
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

        var msg = `${prefix}${ctxStr} ${lvlStr}${message}`;
        console.info(msg, ...optionalParams);
    }
}