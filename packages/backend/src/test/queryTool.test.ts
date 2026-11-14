import 'dotenv/config';

import request from "supertest";
import makeApp from "../app";

// The query tool is disabled until sysadmin auth exists (issue #976).
describe("Disabled query tool", () => {
    const app = makeApp();

    test("POST /API/QueryElections is rejected with 401", async () => {
        const res = await request(app)
            .post('/API/QueryElections')
            .send({ start_time: new Date(0), end_time: new Date() });
        expect(res.statusCode).toEqual(401);
    });

    test.each(['/query_tool', '/query-tool', '/querytool'])("GET %s is a 404", async (path) => {
        const res = await request(app).get(path);
        expect(res.statusCode).toEqual(404);
    });
});
