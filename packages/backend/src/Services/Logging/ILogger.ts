import { IRequest } from '../../IRequest';

export type ILoggingContext = ICustomContext | IRequest;

export interface ICustomContext {
    contextId?: string;
    logPrefix?: string;
  };

export interface ILogger {
    debug(context?:ILoggingContext, message?: unknown, ...optionalParams: unknown[]):void;
    info(context?:ILoggingContext, message?: unknown, ...optionalParams: unknown[]):void;
    warn(context?:ILoggingContext, message?: unknown, ...optionalParams: unknown[]):void;
    error(context?:ILoggingContext, message?: unknown, ...optionalParams: unknown[]):void;
}