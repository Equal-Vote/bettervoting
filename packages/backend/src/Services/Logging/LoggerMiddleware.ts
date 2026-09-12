import { IRequest } from "../../IRequest";
import Logger from "./Logger";
import { logSafeHash } from "./logSafeHash";
import { Response, NextFunction } from 'express';

export function loggerMiddleware(req: IRequest, res: Response, next: NextFunction): void {
    Logger.info({ contextId: req.contextId, logPrefix: '\n' }, `\nREQUEST: ${req.method} ${req.url} @ ${new Date(Date.now()).toISOString()} ip:${logSafeHash(req.ip)}`);

    res.on('finish', () => {
        Logger.info(req, `RES: ${req.method} ${req.url}  status:${res.statusCode}`);
    });
    next();
}



