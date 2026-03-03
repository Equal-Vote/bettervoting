import BallotsDB from "../Models/__mocks__/Ballots";
import ElectionsDB from "../Models/__mocks__/Elections";
import ElectionRollDB from "../Models/__mocks__/ElectionRolls";
import EmailService from "../Services/Email/__mocks__/EmailService";
import BlobService from "../Services/Blob/__mocks__/BlobService";
import CastVoteStore from "../Models/__mocks__/CastVoteStore";
import { IBallotStore } from "../Models/IBallotStore";
import { IElectionRollStore } from "../Models/IElectionRollStore";
import { MockEventQueue } from "../Services/EventQueue/MockEventQueue";
import AccountService from "../Services/Account/__mocks__/AccountService"
import GlobalData from "../Services/GlobalData";

var _ballotsDb:IBallotStore;
var _electionsDb:ElectionsDB;
var _electionRollDb:IElectionRollStore;
var _emailService:EmailService;
var _blobService:BlobService;
var _castVoteStore:CastVoteStore;
var _eventQueue:MockEventQueue;
var _castVoteStore:CastVoteStore;;
var _accountService:AccountService;
var _globalData:GlobalData;

function ballotsDb():IBallotStore {
    if (_ballotsDb == null){
        _ballotsDb = new BallotsDB();
    }
    return _ballotsDb;
}

function electionsDb():ElectionsDB {
    if (_electionsDb == null){
        _electionsDb = new ElectionsDB();
    }
    return _electionsDb;
}

function electionRollDb():IElectionRollStore {
    if (_electionRollDb == null){
        _electionRollDb = new ElectionRollDB();
    }
    return _electionRollDb;
}

function emailService():EmailService {
    if (_emailService == null){
        _emailService = new EmailService();
    }
    return _emailService;
}

function blobService():BlobService {
    if (_blobService == null) {
        _blobService = new BlobService();
    }
    return _blobService;
}

function castVoteStore():CastVoteStore {
    if (_castVoteStore == null){
        _castVoteStore = new CastVoteStore(ballotsDb(), electionRollDb());
    }
    return _castVoteStore;
}

async function eventQueue():Promise<MockEventQueue> {
    if (_eventQueue == null){
        _eventQueue = new MockEventQueue();
    }
    return _eventQueue;
}


function accountService():AccountService {
    if (_accountService == null){
        _accountService = new AccountService();
    }
    return _accountService;
}

function globalData():GlobalData {
    if (_globalData == null){
        _globalData = new GlobalData();
    }
    return _globalData;
}

export  default { ballotsDb, electionsDb, electionRollDb, emailService, blobService, castVoteStore, accountService, globalData, eventQueue };
