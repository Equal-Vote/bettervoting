require("dotenv").config();
const request = require("supertest");

import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";
import ServiceLocator from "../ServiceLocator";

var jwt = require('jsonwebtoken')
const crypto = require('crypto');


const th = new TestHelper();
const accountService = ServiceLocator.accountService() as any;
accountService.verify = true;

afterEach(() => {
  jest.clearAllMocks();
  th.afterEach();
});

describe("Election with custom auth key", () => {

    const customKey = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }); 

    const election = {...testInputs.EmailRollElection};
    election.auth_key = customKey.publicKey;

    const user1TokenCustomSigned = jwt.sign({ 
        email: 'Alice@email.com',
        sub: 'Alice1234',
     }, customKey.privateKey, { algorithm: 'RS256' });

     var electionId = "";

    test("sanity: jwt can be verified", async()=> {
        const user = jwt.verify(user1TokenCustomSigned, customKey.publicKey);
        
        expect(user.email).toEqual('Alice@email.com');
        th.testComplete();
    });

    test("User can create election with custom key", async () => {
        const response = await th.createElection(
            election,
            null,
            user1TokenCustomSigned
          );

      expect(response.statusCode).toBe(200);
      expect(response.election).toBeTruthy();
      expect(response.election.auth_key).toEqual(customKey.publicKey);
      electionId = response.election.election_id;
      th.testComplete();
    });
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            null,
            user1TokenCustomSigned
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });

    test("User with app key canNOT request ballot", async () => {
        const response = await th.requestBallot(
            electionId,
            testInputs.user1token  //standard test input token with app signature
        );

        expect(response.voterAuth.authorized_voter).toBe(false);
        th.testComplete();
    });

    test("User with custom key CAN request ballot", async () => {
        const response = await th.requestBallot(
            electionId,
            null,
            user1TokenCustomSigned
        );
        
        expect(response.statusCode).toBe(200);
        expect(response.voterAuth.authorized_voter).toBe(true);
        expect(response.voterAuth.has_voted).toBe(false);
        expect(response.election.auth_key).toBeUndefined();
        th.testComplete();
    });
});