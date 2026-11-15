import { Email } from "@equal-vote/star-vote-shared/domain_model/Email"
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid"


export class UserModel {
    id: Uid;
    email: Email;
    hashedPassword: string;
    salt: string;

    constructor(data: Pick<UserModel, "id" | "email" | "hashedPassword" | "salt">) {
        this.id = data.id;
        this.email = data.email;
        this.hashedPassword = data.hashedPassword;
        this.salt = data.salt;
    }

    public static fromJson(json: string):UserModel {
        const obj = JSON.parse(json);
        const res: UserModel = new UserModel(obj);
        return res;
    }

    public toJson():string {
        return JSON.stringify(this);
    }

    public copy():UserModel {
        return new UserModel(this);
    }
}