import { Request, Response, NextFunction } from 'express';
import ServiceLocator from "../../ServiceLocator";

const AccountService = ServiceLocator.accountService()

const getUserToken = async (req: Request, res: Response, _next: NextFunction) => {
    const data = await AccountService.getToken(req)
    res.json(data)
}

export {
    getUserToken,
}