import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { roles } from '@equal-vote/star-vote-shared/domain_model/roles';
import { permissions } from '@equal-vote/star-vote-shared/domain_model/permissions';
import { IUser } from '../IRequest';

type p = keyof typeof permissions
export {}
//apparently this is expresses official recommedation for extending types in typescript. I had to add
// this to get elections.routes.ts to work.
declare global {
    namespace Express {
        interface Request {
            contextId?: string;
            logPrefix?: string;
            election: Election;
            user?: IUser;
            user_auth: {
                roles: roles[];
                permissions: p[]
            }
            authorized_voter?: boolean;
            has_voted?: boolean;
            // multer has no type declarations installed (@types/multer); revisit if that's added
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            file: any
        }
    }
}
