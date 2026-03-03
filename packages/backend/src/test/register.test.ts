require('dotenv').config();
const request = require('supertest');
import { ElectionRollState } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import makeApp from '../app';
import { TestLoggerImpl } from '../Services/Logging/TestLoggerImpl';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';

const app = makeApp()

var logger = new TestLoggerImpl().setup();
const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    logger.print();
    logger.clear();
});

describe("Registration", () => {
    beforeAll(() => {
        jest.clearAllMocks();
    });
    var electionId = '0';
    var electionRoll = {}
    test("Create election, responds 200", async () => {
        const response = await request(app)
            .post('/API/Elections')
            .set('Cookie', ['id_token=' + testInputs.user1token])
            .set('Accept', 'application/json')
            .send({ Election: testInputs.RegistrationElection });
        expect(response.statusCode).toBe(200)
        const responseObject = response.body;
        electionId = responseObject.election.election_id
        logger.clear();
    })
    test("Add Voter Roll", async () => {
        const response = await th.submitElectionRoll(
            electionId,
            testInputs.EmailRoll,
            testInputs.user1token
        );
        expect(response.statusCode).toBe(200);
        th.testComplete();
    });
    test("Get voter auth, isn't authorized and hasn't voted", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/ballot`)
            .set('Cookie', ['id_token=' + testInputs.user3token])
            .set('Accept', 'application/json')
        expect(response.statusCode).toBe(200)
        expect(response.body.voterAuth.authorized_voter).toBe(false)
        expect(response.body.voterAuth.has_voted).toBe(false)
        logger.clear();
    })
    test("Submit Registration", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/register`)
            .set('Cookie', ['id_token=' + testInputs.user3token])
            .set('Accept', 'application/json')
            .send({ registration: {field1: 'Data1',field2: 'Data2'}});
        expect(response.statusCode).toBe(200)
        logger.clear();
    })
    test("Get voter auth, is authorized and hasn't voted", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/ballot`)
            .set('Cookie', ['id_token=' + testInputs.user3token])
            .set('Accept', 'application/json')
        expect(response.statusCode).toBe(200)
        expect(response.body.voterAuth.authorized_voter).toBe(true)
        expect(response.body.voterAuth.has_voted).toBe(false)
        logger.clear();
    })
    test("Credentialer Views Roll", async () => {
        const response = await request(app)
            .get(`/API/Election/${electionId}/rolls`)
            .set('Cookie', ['id_token=' + testInputs.user1token])
            .set('Accept', 'application/json')
        expect(response.statusCode).toBe(200)
        expect(response.body.electionRoll[0].state).toBe(ElectionRollState.approved)
        expect(response.body.electionRoll[1].state).toBe(ElectionRollState.approved)
        expect(response.body.electionRoll[2].state).toBe(ElectionRollState.registered)
        expect(response.body.electionRoll[2].registration.field1).toBe('Data1')
        expect(response.body.electionRoll[2].registration.field2).toBe('Data2')
        electionRoll = response.body.electionRoll[2]
        logger.clear();
    })
    test("Credentialer Approves", async () => {
        const response = await request(app)
            .post(`/API/Election/${electionId}/rolls/approve`)
            .set('Cookie', ['id_token=' + testInputs.user1token])
            .set('Accept', 'application/json')
            .send({ electionRollEntry: electionRoll});
        expect(response.statusCode).toBe(200)
        logger.clear();
    })
    test("Credentialer Views Roll, confirms approved", async () => {
        const response = await request(app)
            .get(`/API/Election/${electionId}/rolls`)
            .set('Cookie', ['id_token=' + testInputs.user1token])
            .set('Accept', 'application/json')
        expect(response.statusCode).toBe(200)
        expect(response.body.electionRoll[0].state).toBe(ElectionRollState.approved)
        expect(response.body.electionRoll[1].state).toBe(ElectionRollState.approved)
        expect(response.body.electionRoll[2].state).toBe(ElectionRollState.approved)
        logger.clear();
    })
})
