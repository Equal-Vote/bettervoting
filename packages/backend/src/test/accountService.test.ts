require("dotenv").config();
const request = require("supertest");
var jwt = require("jsonwebtoken");

import { Election, electionValidation } from "@equal-vote/star-vote-shared/domain_model/Election";
import testInputs from "./testInputs";
import { TestHelper } from "./TestHelper";
import ServiceLocator from "../ServiceLocator";

const th = new TestHelper();
const accountService = ServiceLocator.accountService() as any;
accountService.verify = true;

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const user = {
    email: "Alice@email.com",
    sub: "Alice1234",
};
describe("User with correct signature creates election", () => {
    var goodToken = jwt.sign(user, accountService.privateKey);
    test("responds with 200 status", async () => {
        const response = await th.createElection(
            testInputs.Election1,
            goodToken
        );

        expect(response.statusCode).toBe(200);
        expect(response.election).toBeTruthy();
        th.testComplete();
    });
});

describe("Temp user creates election", () => {
    test("responds with 200 status", async () => {
        const response = await th.createElection(
            testInputs.TempElection,
            null,
            null,
            testInputs.user4tempId
        );

        expect(response.statusCode).toBe(200);
        expect(response.election).toBeTruthy();
        th.testComplete();
    });
});

describe("User with wrong signature creates election", () => {
    var badToken = jwt.sign(user, "NOT" + accountService.privateKey);
    test("responds with 401 status", async () => {
        const response = await th.createElection(
            testInputs.Election1,
            badToken
        );

        expect(response.statusCode).toBe(401);
        th.testComplete();
    });
});
