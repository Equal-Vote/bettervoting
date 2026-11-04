import { Response } from 'express';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import { roles } from '@equal-vote/star-vote-shared/domain_model/roles';
import { IElectionRequest } from '../../IRequest';
import ServiceLocator from '../../ServiceLocator';
import { TestLoggerImpl } from '../../Services/Logging/TestLoggerImpl';
import { addElectionRoll } from './addElectionRollController';

const store = ServiceLocator.electionRollDb();
type RollInput = { voter_id?: string; email?: string; precinct?: string };

function request(electionRoll: RollInput[], invitation = 'none') {
    return {
        election: { election_id: 'normalization-test', settings: { invitation, voter_access: 'closed' } },
        user_auth: { roles: [roles.owner] },
        user: { email: 'admin@example.com' },
        body: { electionRoll },
    } as unknown as IElectionRequest & { body: { electionRoll: RollInput[] } };
}

let res: Response;
let submit: jest.SpyInstance;

beforeEach(() => {
    new TestLoggerImpl().setup();
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    jest.spyOn(store, 'getRollsByElectionID').mockResolvedValue([]);
    jest.spyOn(store, 'getByVoterID').mockResolvedValue(null);
    submit = jest.spyOn(store, 'submitElectionRoll').mockResolvedValue([]);
});

afterEach(() => jest.restoreAllMocks());

test('trims imported IDs while preserving case, leading zeros, and internal spaces', async () => {
    await addElectionRoll(request([{ voter_id: ' \t00Ab C\r\n' }]), res, jest.fn());
    expect(submit.mock.calls[0][0]).toEqual([expect.objectContaining({ voter_id: '00Ab C' })]);
});

test.each(['Alice', ' Alice '])('rejects IDs matching an existing ID %p after trimming', async existingId => {
    jest.mocked(store.getRollsByElectionID).mockResolvedValue([{ voter_id: existingId } as ElectionRoll]);
    await expect(addElectionRoll(request([{ voter_id: '\tAlice\r' }]), res, jest.fn()))
        .rejects.toThrow('Some submitted voters already exist');
    expect(submit).not.toHaveBeenCalled();
});

test.each(['Alice', ' Alice\r'])('rejects duplicate IDs within one upload: %p', async duplicateId => {
    await expect(addElectionRoll(request([{ voter_id: 'Alice' }, { voter_id: duplicateId }]), res, jest.fn()))
        .rejects.toThrow('duplicate voter IDs');
    expect(submit).not.toHaveBeenCalled();
});

test('keeps differently cased IDs distinct', async () => {
    await addElectionRoll(request([{ voter_id: 'Alice' }, { voter_id: 'alice' }]), res, jest.fn());
    expect(submit.mock.calls[0][0].map((roll: ElectionRoll) => roll.voter_id)).toEqual(['Alice', 'alice']);
});

test('ignores blank rows and generates IDs for blank ID cells with other data', async () => {
    await addElectionRoll(request([
        { voter_id: ' \t\r' },
        { voter_id: ' \t', email: 'voter@example.com' },
        { precinct: 'North' },
    ]), res, jest.fn());
    const rolls: ElectionRoll[] = submit.mock.calls[0][0];
    expect(rolls).toHaveLength(2);
    expect(rolls[0].email).toBe('voter@example.com');
    expect(rolls[1].precinct).toBe('North');
    for (const roll of rolls) expect(roll.voter_id.trim()).not.toBe('');
    expect(rolls[0].voter_id).not.toBe(rolls[1].voter_id);
});

test('accepts a blank ID cell for email invitations', async () => {
    await addElectionRoll(request([{ voter_id: ' \r', email: 'voter@example.com' }], 'email'), res, jest.fn());
    expect(submit.mock.calls[0][0][0].voter_id.trim()).not.toBe('');
});

test('still rejects supplied IDs for email invitations', async () => {
    await expect(addElectionRoll(request([{ voter_id: ' Alice ', email: 'voter@example.com' }], 'email'), res, jest.fn()))
        .rejects.toThrow('Cannot create voters with voter_id');
    expect(submit).not.toHaveBeenCalled();
});

test.each(['你好', 'voter😀', 'a\u0100b', 'a\u0000b', 'a\nb', 'a\tb', 'a\u007fb', 'a\u0085b', '.', ' .. ', 'a%2Fb', 'a%2fb'])(
    'rejects ID %p that cannot safely round-trip through authentication', async voter_id => {
        await expect(addElectionRoll(request([{ voter_id }]), res, jest.fn())).rejects.toThrow('Voter IDs');
        expect(submit).not.toHaveBeenCalled();
    },
);

test.each(['Alice?#', 'a/b\\c', '100%real', 'a%23b', 'a"&<>b', 'José', 'a.b'])(
    'preserves supported punctuation and Latin-1 in ID %p', async voter_id => {
        await addElectionRoll(request([{ voter_id }]), res, jest.fn());
        expect(submit.mock.calls[0][0][0].voter_id).toBe(voter_id);
    },
);
