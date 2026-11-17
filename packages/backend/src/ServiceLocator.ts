import Logger from "./Services/Logging/Logger";
import BallotsDB from "./Models/Ballots";
import ElectionsDB from "./Models/Elections";
import ElectionRollDB from "./Models/ElectionRolls";
import EmailEventsDB from "./Models/EmailEvents";
import EntitlementsDB from "./Models/Entitlements";
import CastVoteStore from "./Models/CastVoteStore";
import EmailService from "./Services/Email/EmailService";
import BlobService from "./Services/Blob/BlobService";
import { IBallotStore } from "./Models/IBallotStore";
import { IEventQueue } from "./Services/EventQueue/IEventQueue";
import PGBossEventQueue from "./Services/EventQueue/PGBossEventQueue";

import AccountService from "./Services/Account/AccountService"
import GlobalData from "./Services/GlobalData";
import { Kysely, PostgresDialect } from 'kysely'
import Cursor from 'pg-cursor';
import { Database } from "./Models/Database";
import { SerializeParametersPlugin } from "./Models/serialize-parameters/serialize-parameters-plugin";
import { Pool } from 'pg';

let _postgresClient: Pool;
let _DB: Kysely<Database>
const _appInitContext = Logger.createContext("appInit");
let _ballotsDb: IBallotStore;
let _electionsDb: ElectionsDB;
let _electionRollDb: ElectionRollDB;
let _emailEventsDb: EmailEventsDB;
let _entitlementsDb: EntitlementsDB;
let _castVoteStore: CastVoteStore;
let _emailService: EmailService
let _blobService: BlobService
let _eventQueue: IEventQueue;
let _accountService: AccountService;
let _globalData: GlobalData;


function postgres(): Pool {
    if (_postgresClient == null) {
        const connectionConfig = pgConnectionObject();
        // We can't log this since it has sensitive information
        // Logger.debug(_appInitContext, `Postgres Config:  ${JSON.stringify(connectionConfig)}}`);
        _postgresClient = new Pool(connectionConfig);

        const dialect = new PostgresDialect({
            pool: _postgresClient,
            cursor: Cursor, // required for Kysely's .stream() to page rows instead of buffering them
        })

        _DB = new Kysely<Database>({
            dialect,
            plugins: [
                new SerializeParametersPlugin({
                    serializer: (value) => {
                        if (value !== null && typeof value === 'object') {
                            return JSON.stringify(value)
                        }
                        return value
                    }
                }),
            ],
        })

    }
    return _postgresClient;
}

function database(): Kysely<Database> {
    if (_DB == null) {
        postgres()
    }
    return _DB
}

function pgConnectionObject(): { connectionString: string; ssl: { rejectUnauthorized: boolean } | false } {
    const connectionStr = pgConnectionString();
    const devDB = process.env.DEV_DATABASE;
    if (devDB === 'TRUE') {
        return {
            connectionString: connectionStr,
            ssl: {
                rejectUnauthorized: false
            }
        };
    }
    return {
        connectionString: connectionStr,
        ssl: false
    };
}

function pgConnectionString(): string {
    return process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres';
}

async function eventQueue(): Promise<IEventQueue> {
    if (_eventQueue == null) {
        const eq = new PGBossEventQueue();
        const conn = pgConnectionObject();
        try{
            await eq.init(conn, Logger.createContext("appInit"));
        }catch(e){
            throw `${e} \n\n----------------------\n\n Could not connect to postgres database at ${conn.connectionString.replace(/:.*@/,':*****@')}\n\n`
        }
        _eventQueue = eq;
    }

    return _eventQueue;
}

function ballotsDb(): IBallotStore {
    if (_ballotsDb == null) {
        _ballotsDb = new BallotsDB(database());
    }
    return _ballotsDb;
}

function electionsDb(): ElectionsDB {
    if (_electionsDb == null) {
        _electionsDb = new ElectionsDB(database());
    }
    return _electionsDb;
}

function electionRollDb(): ElectionRollDB {
    if (_electionRollDb == null) {
        _electionRollDb = new ElectionRollDB(database());
    }
    return _electionRollDb;
}

function emailEventsDb(): EmailEventsDB {
    if (_emailEventsDb == null) {
        _emailEventsDb = new EmailEventsDB(database());
    }
    return _emailEventsDb;
}

function entitlementsDb(): EntitlementsDB {
    if (_entitlementsDb == null) {
        _entitlementsDb = new EntitlementsDB(database());
    }
    return _entitlementsDb;
}


function castVoteStore(): CastVoteStore {
    if (_castVoteStore == null) {
        _castVoteStore = new CastVoteStore(database());
    }
    return _castVoteStore;
}


function emailService(): EmailService {
    if (_emailService == null) {
        _emailService = new EmailService();
    }
    return _emailService;
}

function blobService(): BlobService {
    if (_blobService == null) {
        if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
            _blobService = new BlobService();
        } else {
            Logger.info({}, 'AZURE_STORAGE_CONNECTION_STRING is not set. Using mock BlobService (image uploads will be no-ops).');
            // require lazily so production doesn't need to load the mock module
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const MockBlobService = require("./Services/Blob/__mocks__/BlobService").default;
            _blobService = new MockBlobService();
        }
    }
    return _blobService ;
}

function accountService(): AccountService {
    if (_accountService == null) {
        _accountService = new AccountService();
    }
    return _accountService;
}

function globalData(): GlobalData {
    if (_globalData == null) {
        _globalData = new GlobalData();
    }
    return _globalData;
}

export default { ballotsDb, electionsDb, electionRollDb, emailEventsDb, entitlementsDb, emailService, accountService, castVoteStore, globalData, eventQueue, database, blobService };
