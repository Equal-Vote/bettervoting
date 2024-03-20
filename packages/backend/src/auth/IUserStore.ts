import { Email } from "@equal-vote/star-vote-shared/domain_model/Email";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { UserModel } from "./data_model/UserModel";


export interface IUserStore {
    getByEmail(email: Email): Promise<UserModel|null>;
    getById(id:Uid): Promise<UserModel|null>;
    set(user:UserModel): Promise<UserModel>;
}