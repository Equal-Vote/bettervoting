import Logger from "./Services/Logging/Logger"
import { IRequest, reqIdSuffix } from "./IRequest"
import { Response, NextFunction } from 'express';
import { HttpErrorBase } from "@curveball/http-errors";
import { getErrorMessage } from './errorUtils';

export const errorCatch = async (err: unknown, req: IRequest, res: Response, _next: NextFunction) => {
    const message = getErrorMessage(err);
    Logger.error(req, message);
    let status = 500;
    let msg = "Error";
    if (err instanceof HttpErrorBase) {
        status = err.httpStatus;
        if (err.detail) {
            msg = err.detail;
        }
    }
    msg += reqIdSuffix(req);
    res.status(status).json({ error: msg });
}
