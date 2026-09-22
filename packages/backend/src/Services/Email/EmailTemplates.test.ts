import { Ballot } from '@equal-vote/star-vote-shared/domain_model/Ballot';
import { ElectionRoll } from '@equal-vote/star-vote-shared/domain_model/ElectionRoll';
import testInputs from '../../test/testInputs';
import { Invites, makeEmails, Receipt } from './EmailTemplates';

const origin = 'https://star.vote';
const election = {
    ...testInputs.IDRollElection,
    election_id: 'url-test',
    settings: { ...testInputs.IDRollElection.settings, ballot_updates: true },
};

test.each(['Alice?#', 'a/b\\c', '100%real', 'a%23b', 'a"&<>b', '00Ab C'])('email voting links preserve voter ID %p', voter_id => {
    const roll = { voter_id, email: 'voter@example.com' } as ElectionRoll;
    const receipt = Receipt(election, roll.email!, { ballot_id: 'ballot-test' } as Ballot, origin, roll);
    const messages = [
        Invites(election, [roll], origin)[0],
        makeEmails(election, [roll], origin, 'Vote', '__VOTE_BUTTON__', false)[0],
        receipt,
    ];
    for (const message of messages) {
        const href = message.html!.match(/href="([^"]*\/id\/[^\"]*)"/)?.[1];
        expect(href).toBeDefined();
        const url = new URL(href!);
        expect(url.origin).toBe(origin);
        expect(url.hash).toBe('');
        expect(url.search).toBe('');
        expect(url.pathname.split('/')).toHaveLength(4);
        expect(decodeURIComponent(url.pathname.split('/')[3])).toBe(voter_id);
    }
    expect(receipt.text).toContain(`${origin}/url-test/id/${encodeURIComponent(voter_id)}`);
});
