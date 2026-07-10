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
        if (token){
            if (!this.verify){
                return jwt.decode(token);
            }
            if (customKey) {
                Logger.debug(req, "using custom authKey");
            }
            const key = customKey ? customKey : this.privateKey;
            return AccountServiceUtils.extractUserFromRequest(req, token, key);
        }
        // mirror the real AccountService: a temp_id cookie yields an unverified
        // TEMP_ID user (this is how anonymous browser voters and external
        // integrations like the discord bot are identified)
        const tempId = req.cookies.temp_id;
        if (tempId){
            return {
                'typ': 'TEMP_ID',
                'sub': tempId
            }
        }
        return null
    }
}