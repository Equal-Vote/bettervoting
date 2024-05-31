import Logger from "./Services/Logging/Logger";
import BallotsDB from "./Models/Ballots";
import ElectionsDB from "./Models/Elections";
import ElectionRollDB from "./Models/ElectionRolls";
import CastVoteStore from "./Models/CastVoteStore";
import EmailService from "./Services/Email/EmailService";
import { IBallotStore } from "./Models/IBallotStore";
import { IEventQueue } from "./Services/EventQueue/IEventQueue";
import PGBossEventQueue from "./Services/EventQueue/PGBossEventQueue";

import AccountService from "./Services/Account/AccountService"
import GlobalData from "./Services/GlobalData";
import { Kysely, PostgresDialect } from 'kysely'
import { Database } from "./Models/Database";
import { SerializeParametersPlugin } from "./Models/serialize-parameters/serialize-parameters-plugin";

const { Pool } = require('pg');

var _postgresClient: any;
var _DB: Kysely<Database>
var _appInitContext = Logger.createContext("appInit");
var _ballotsDb: IBallotStore;
var _electionsDb: ElectionsDB;
var _electionRollDb: ElectionRollDB;
var _castVoteStore: CastVoteStore;
var _emailService: EmailService
var _eventQueue: IEventQueue;

var _emailService: EmailService;
var _accountService: AccountService;
var _globalData: GlobalData;


function postgres(): any {
    if (_postgresClient == null) {
        var connectionConfig = pgConnectionObject();
        // We can't log this since it has sensitive information
        // Logger.debug(_appInitContext, `Postgres Config:  ${JSON.stringify(connectionConfig)}}`);
        _postgresClient = new Pool(connectionConfig);

        const dialect = new PostgresDialect({
            pool: _postgresClient
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
    console.log('starting database')
    if (_DB == null) {
        postgres()
    }
    return _DB
}

function pgConnectionObject(): any {
    var connectionStr = pgConnectionString();
    var devDB = process.env.DEV_DATABASE;
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
        await eq.init(pgConnectionObject(), Logger.createContext("appInit"));
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


function castVoteStore(): CastVoteStore {
    if (_castVoteStore == null) {
        _castVoteStore = new CastVoteStore(postgres());
    }
    return _castVoteStore;
}


function emailService(): EmailService {
    if (_emailService == null) {
        _emailService = new EmailService();
    }
    return _emailService;
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

export default { ballotsDb, electionsDb, electionRollDb, emailService, accountService, castVoteStore, globalData, eventQueue, database };
