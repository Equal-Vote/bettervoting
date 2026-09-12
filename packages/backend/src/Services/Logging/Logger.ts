import { ILogger, ILoggingContext } from "./ILogger";
import { LoggerImpl } from "./LoggerImpl";

var _loggerInstance: ILogger;

function debug(context?: ILoggingContext, message?: unknown, ...optionalParams: unknown[]): void {
  logger().debug(context, message, ...optionalParams);
}

function info(context?: ILoggingContext,message?: unknown, ...optionalParams: unknown[]): void {
  logger().info(context, message, ...optionalParams);
}

function warn(context?: ILoggingContext,message?: unknown, ...optionalParams: unknown[]): void {
  logger().warn(context, message, ...optionalParams);
}

function error(context?: ILoggingContext, message?: unknown, ...optionalParams: unknown[]): void {
  logger().error(context, message, ...optionalParams);
}

/** 
* Use to log about a state change (ie write to a DB) 
* Shortcut for Logger.info with a prefix
**/
function state(context?: ILoggingContext, message?: unknown, ...optionalParams: unknown[]): void {
  logger().info(context, "STATE: " + message, ...optionalParams);
}

function logger(): ILogger {
  if (_loggerInstance == null) {
    _loggerInstance = new LoggerImpl();
  }
  return _loggerInstance;
}

function setLoggerInstance(instance:ILogger){
  _loggerInstance = instance;
}

function createContext(name:string):ILoggingContext {
    return {
        contextId: name
      }
}

export  default { debug, info, warn, error, createContext, state, setLoggerInstance};
