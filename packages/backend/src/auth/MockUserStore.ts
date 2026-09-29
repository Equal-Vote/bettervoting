import { Email } from "@equal-vote/star-vote-shared/domain_model/Email";
import { Uid } from "@equal-vote/star-vote-shared/domain_model/Uid";
import { UserModel } from "./data_model/UserModel";



export class MockUserStore {

    indexById: Map<Uid, UserModel>;
    indexByEmail: Map<Email, UserModel>;

    constructor() {
        this.indexById = new Map();
        this.indexByEmail = new Map();
    }

    getByEmail(email: Email): Promise<UserModel|null> {
        var val = this.indexByEmail.get(email);
        var res = null;
        if (val !== undefined){
            res = val.copy();
        }
        return Promise.resolve(res);
    }

    getById(id: Uid): Promise<UserModel|null> {
        var val = this.indexById.get(id);
        var res = null;
        if (val != undefined){
            res = val.copy();
        }
        return Promise.resolve(res);
    }


    async set(user: UserModel): Promise<UserModel> {
        user = user.copy();

        //need to check if the email field is already used
        var byEmail = await this.getByEmail(user.email);
        if (byEmail != null) {
            if (byEmail.id != user.id) {
                throw new Error(`Email ${user.email} is already in use`);
            }
        }

        var byId = await this.getById(user.id);
        if (byId != null) {
            var oldEmail = byId.email;
            this.indexByEmail.delete(oldEmail);
        }

        this.indexById.set(user.id, user);
        this.indexByEmail.set(user.email, user);
        return Promise.resolve(user);
    }

}