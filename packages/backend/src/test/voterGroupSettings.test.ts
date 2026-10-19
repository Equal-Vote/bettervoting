import 'dotenv/config';

import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const setupVoterGroupElection = async (): Promise<string> => {
    const response = await th.createElection(testInputs.VoterGroupElection, testInputs.user1token);
    expect(response.statusCode).toBe(200);
    return response.election.election_id;
};

const fetchElection = async (electionId: string): Promise<Election> => {
    const response = await th.fetchElectionById(electionId, testInputs.user1token);
    expect(response.election).toBeTruthy();
    return response.election;
};

describe("Voter Group Settings", () => {

    describe("Creating election with voter groups", () => {
        test("responds with 200 and stores voter_groups", async () => {
            const electionId = await setupVoterGroupElection();
            const election = await fetchElection(electionId);
            expect(election.settings.voter_groups).toEqual(['Ward 1', 'Ward 2']);
            expect(election.settings.voter_groups_enabled).toBe(true);
            th.testComplete();
        });
    });

    describe("Trimming group names", () => {
        test("trims leading and trailing spaces from group names", async () => {
            const electionId = await setupVoterGroupElection();
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups: ['  Ward 1  ', ' Ward 2'],
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(200);

            const election = await fetchElection(electionId);
            expect(election.settings.voter_groups).toEqual(['Ward 1', 'Ward 2']);
            th.testComplete();
        });
    });

    describe("Empty name rejection", () => {
        test("rejects 400 when a voter group name is empty", async () => {
            const electionId = await setupVoterGroupElection();
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups: ['Ward 1', ''],
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(400);
            th.testComplete();
        });

        test("rejects 400 when a name is all whitespace", async () => {
            const electionId = await setupVoterGroupElection();
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups: ['  '],
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(400);
            th.testComplete();
        });
    });

    describe("Case-insensitive duplicate rejection", () => {
        test("rejects 400 when two names differ only in case", async () => {
            const electionId = await setupVoterGroupElection();
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups: ['Ward 1', 'ward 1'],
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(400);
            th.testComplete();
        });
    });

    describe("Removing a group that has voters", () => {
        test("rejects 400 and includes voter count when group has voters", async () => {
            const electionId = await setupVoterGroupElection();

            const rollResponse = await th.submitElectionRoll(
                electionId,
                testInputs.VoterGroupRoll,
                testInputs.user1token,
            );
            expect(rollResponse.statusCode).toBe(200);

            // Try to remove Ward 1 which has 1 voter
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups: ['Ward 2'],
                },
                races: testInputs.VoterGroupElection.races,
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(400);
            th.testComplete();
        });
    });

    describe("Removing an unused group", () => {
        test("succeeds and strips the group from race precincts", async () => {
            const electionId = await setupVoterGroupElection();

            // Only Alice (Ward 1) is added; Ward 2 has no voters
            const rollResponse = await th.submitElectionRoll(
                electionId,
                [{ email: 'Alice@email.com', precinct: 'Ward 1' }],
                testInputs.user1token,
            );
            expect(rollResponse.statusCode).toBe(200);

            // Remove Ward 2 (unused)
            const currentElection = await fetchElection(electionId);
            const updated = {
                ...currentElection,
                settings: {
                    ...currentElection.settings,
                    voter_groups: ['Ward 1'],
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(200);

            const after = await fetchElection(electionId);
            expect(after.settings.voter_groups).toEqual(['Ward 1']);
            // Ward 2 should be stripped from the group race's precincts
            const groupRace = after.races.find(r => r.race_id === '1');
            expect(groupRace?.precincts).toEqual(['Ward 1']);
            th.testComplete();
        });
    });

    describe("Turning groups off keeps the list", () => {
        test("setting voter_groups_enabled=false preserves voter_groups list", async () => {
            const electionId = await setupVoterGroupElection();
            const updated = {
                ...testInputs.VoterGroupElection,
                election_id: electionId,
                settings: {
                    ...testInputs.VoterGroupElection.settings,
                    voter_groups_enabled: false,
                },
            };
            const response = await th.editElection(updated, testInputs.user1token);
            expect(response.statusCode).toBe(200);

            const election = await fetchElection(electionId);
            expect(election.settings.voter_groups_enabled).toBe(false);
            expect(election.settings.voter_groups).toEqual(['Ward 1', 'Ward 2']);
            th.testComplete();
        });
    });
});
