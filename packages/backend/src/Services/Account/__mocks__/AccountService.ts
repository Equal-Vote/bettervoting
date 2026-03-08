import { IRequest } from '../../../IRequest';
import Logger from "../../Logging/Logger";
import AccountServiceUtils from "../AccountServiceUtils";

var jwt = require('jsonwebtoken');

export default class AccountService {

    privateKey = "privateKey";
    publicKey = "publicKey"
    verify = false;

    constructor() {
    }

    getToken = async (req: any) => {
        return {}
    }

    extractUserFromRequest  = (req:IRequest, customKey?:string) => {
        const token = customKey ? req.cookies.custom_id_token : req.cookies.id_token;
        if (!this.verify){
            return jwt.decode(token);
        }
        if (token){
            if (customKey) {
                Logger.debug(req, "using custom authKey");
            }
            const key = customKey ? customKey : this.privateKey;
            return AccountServiceUtils.extractUserFromRequest(req, token, key);
        }
        return null
    }
}