import 'dotenv/config';
import { TestHelper } from './TestHelper';
import testInputs from './testInputs';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { ElectionSettings } from '@equal-vote/star-vote-shared/domain_model/ElectionSettings';
import { Race } from '@equal-vote/star-vote-shared/domain_model/Race';

const th = new TestHelper();

afterEach(() => {
    jest.clearAllMocks();
    th.afterEach();
});

const voterGroupElection: Election = {
    election_id: '0',
    title: 'Voter Group Election',
    state: 'open',
    frontend_url: '',
    owner_id: 'Alice1234',
    races: [
        {
            race_id: '0',
            title: 'Race 0',
            num_winners: 1,
            voting_method: 'STAR',
            candidates: [
                { candidate_id: '0', candidate_name: 'A' },
                { candidate_id: '1', candidate_name: 'B' },
                { candidate_id: '2', candidate_name: 'C' },
            ],
        },
    ] as Race[],
    settings: {
        voter_access: 'closed',
        voter_authentication: { voter_id: true },
        voter_groups_enabled: true,
        voter_groups: ['Ward 1', 'Ward 2'],
    } as ElectionSettings,
} as Election;

describe('Voter group roll enforcement', () => {
    let electionId = '';

    test('Create election with voter groups, responds 200', async () => {
        const res = await th.createElection(voterGroupElection, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        electionId = res.election.election_id;
        th.testComplete();
    });

    test('Rejects the whole batch when a voter group is not on the list', async () => {
        const res = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'Alice1', precinct: 'Ward 7' }],
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        const bodyText = JSON.stringify(res.body);
        expect(bodyText).toContain('Ward 7');
        th.testComplete();
    });

    test('Case-insensitive match saves the list spelling (ward 1 → Ward 1)', async () => {
        const res = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'Alice2', precinct: 'ward 1' }],
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);

        const roll = await th.fetchElectionRoll(electionId, testInputs.user1token);
        const added = roll.body.electionRoll.find((r: { voter_id?: string }) => r.voter_id === 'Alice2');
        expect(added?.precinct).toBe('Ward 1');
        th.testComplete();
    });

    test('Missing group is stored as empty string', async () => {
        const res = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'Alice3' }],
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(200);

        const roll = await th.fetchElectionRoll(electionId, testInputs.user1token);
        const added = roll.body.electionRoll.find((r: { voter_id?: string }) => r.voter_id === 'Alice3');
        expect(added?.precinct).toBe('');
        th.testComplete();
    });
});

describe('Voter group column rejected while groups are off', () => {
    let electionId = '';

    test('Create election without voter groups, responds 200', async () => {
        const election: Election = {
            ...voterGroupElection,
            title: 'No Groups Election',
            settings: {
                voter_access: 'closed',
                voter_authentication: { voter_id: true },
            } as ElectionSettings,
        };
        const res = await th.createElection(election, testInputs.user1token);
        expect(res.statusCode).toBe(200);
        electionId = res.election.election_id;
        th.testComplete();
    });

    test('Rejects a voter with a group column while groups are off', async () => {
        const res = await th.submitElectionRoll(
            electionId,
            [{ voter_id: 'Bob1', precinct: 'Ward 1' }],
            testInputs.user1token,
        );
        expect(res.statusCode).toBe(400);
        th.testComplete();
    });
});
