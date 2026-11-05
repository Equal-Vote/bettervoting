import { test, expect, type Page, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { randomUUID } from 'crypto';
import { API_BASE_URL, getSub } from './helperfunctions';

// Admin upload of paper ballots (docs/help/uploading_ballots.md). Elections without a
// voter list take one ballot CSV; elections with a voter list take a ballot CSV and a
// voter CSV together, and the two are never linked.

let electionId = '';

const createDraftElection = async (context: BrowserContext, request: APIRequestContext, voterAccess: 'open' | 'closed') => {
    const sub = await getSub(context);
    const response = await request.post(`${API_BASE_URL}/elections`, {
        data: {
            Election: {
                title: `Playwright Upload Ballots (${voterAccess})`,
                owner_id: sub,
                description: '',
                state: 'draft',
                frontend_url: '',
                races: [{
                    title: 'Mayor',
                    race_id: randomUUID(),
                    num_winners: 1,
                    voting_method: 'STAR',
                    candidates: ['Alice', 'Bob', 'Carol'].map(candidate_name => ({ candidate_id: randomUUID(), candidate_name })),
                }],
                settings: {
                    // open_open (no voter list) or closed_admin_managed_ids (voter list)
                    voter_authentication: { voter_id: voterAccess === 'closed', email: false, ip_address: false },
                    ballot_updates: false,
                    public_results: true,
                    time_zone: 'America/Denver',
                    random_candidate_order: false,
                    require_instruction_confirmation: true,
                    term_type: 'election',
                    voter_access: voterAccess,
                },
                is_public: false,
            },
        },
    });
    await expect(response).toBeOK();
    electionId = ((await response.json()).election as Election).election_id;
};

const addVoters = async (request: APIRequestContext, voterIds: string[]) => {
    const response = await request.post(`${API_BASE_URL}/Election/${electionId}/rolls`, {
        data: { electionRoll: voterIds.map(voter_id => ({ state: 'approved', voter_id })) },
    });
    await expect(response).toBeOK();
};

// Turns on "Accept Uploaded Paper Ballots" in Settings (draft only), then opens the election
const enableUploadsAndOpen = async (page: Page) => {
    await page.goto(`/${electionId}/admin/settings`);
    const toggle = page.getByLabel('Accept Uploaded Paper Ballots');
    await expect(toggle).not.toBeChecked();
    const saved = page.waitForResponse(r => r.url().includes(`/Election/${electionId}/edit`) && r.ok());
    await toggle.click();
    await saved;
    await expect(toggle).toBeChecked();

    await page.getByRole('link', { name: 'Publish & Share' }).click();
    await page.waitForURL(`**/${electionId}/admin/publish`);
    await page.getByRole('button', { name: 'Finalize Election' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('link', { name: 'Admin Home' }).click();
    await page.waitForURL(`**/${electionId}/admin`);
    await expect(page.getByText('open', { exact: true })).toBeVisible();
};

const csvFile = (name: string, lines: string[]) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(lines.join('\n') + '\n') });

// The page has one hidden file input per file, in this order: ballot file, then voter file
const fileInputs = (page: Page) => page.locator('input[type="file"]');

// Three ballots that Bob wins under STAR
const BALLOT_CSV = csvFile('ballots.csv', [
    'ballot_id,precinct,Alice,Bob,Carol',
    'P-001,,1,5,0',
    'P-002,,2,5,0',
    'P-003,,0,4,5',
]);

const ballotCount = async (request: APIRequestContext) => {
    const response = await request.get(`${API_BASE_URL}/Election/${electionId}/ballots`);
    await expect(response).toBeOK();
    return (await response.json()).ballots.length as number;
};

const votedVoterIds = async (request: APIRequestContext) => {
    const response = await request.get(`${API_BASE_URL}/Election/${electionId}/rolls`);
    await expect(response).toBeOK();
    const roll = (await response.json()).electionRoll as { voter_id: string, submitted: boolean }[];
    return roll.filter(r => r.submitted).map(r => r.voter_id).sort();
};

test.describe('Upload paper ballots', () => {
    test.afterEach(async ({ request }) => {
        if (electionId) {
            await request.delete(`${API_BASE_URL}/election/${electionId}`);
            console.log(`deleted election: ${electionId}`);
        }
    });

    test('election without a voter list takes a single ballot file', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'open');
        await enableUploadsAndOpen(page);

        await page.goto(`/${electionId}/admin`);
        await page.getByRole('link', { name: 'Upload Ballots' }).click();
        await page.waitForURL(`**/${electionId}/admin/upload_ballots`);
        await expect(page.getByText('This election has no voter list in BetterVoting')).toBeVisible();
        await expect(fileInputs(page)).toHaveCount(1);

        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        await expect(page.getByText('Ready to upload 3 ballots.')).toBeVisible();
        await page.getByRole('button', { name: 'Upload ballots' }).click();
        await expect(page.getByText('3 ballots uploaded.')).toBeVisible();

        expect(await ballotCount(request)).toBe(3);
        await page.goto(`/${electionId}/results`);
        await expect(page.getByText('Bob wins!')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('3 voters').first()).toBeVisible();
    });

    test('election with a voter list takes a ballot file and a voter file together', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'closed');
        await addVoters(request, ['1', '2', '3', '4', '5']);
        await enableUploadsAndOpen(page);

        await page.goto(`/${electionId}/admin/upload_ballots`);
        await expect(page.getByText('This election has a voter list')).toBeVisible();
        await expect(fileInputs(page)).toHaveCount(2);

        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        // listed in a different order from the ballots: the files are never linked
        await fileInputs(page).nth(1).setInputFiles(csvFile('voters.csv', ['voter_id', '3', '1', '2']));
        await expect(page.getByText('Ready to upload 3 ballots and mark 3 voters as having voted.')).toBeVisible();
        await page.getByRole('button', { name: 'Upload ballots' }).click();
        await expect(page.getByText('3 ballots uploaded and 3 voters marked as having voted.')).toBeVisible();

        expect(await ballotCount(request)).toBe(3);
        expect(await votedVoterIds(request)).toEqual(['1', '2', '3']);

        // the voter list shows the uploaded voters as having voted
        await page.goto(`/${electionId}/admin/voters`);
        await page.getByRole('columnheader', { name: 'Has Voted' }).getByRole('combobox').click();
        await page.getByRole('option', { name: 'Not Voted', exact: true }).getByRole('checkbox').uncheck();
        await page.locator('#menu- > .MuiBackdrop-root').click();
        await expect(page.getByText('1–3 of 3')).toBeVisible();
        for (const id of ['1', '2', '3']) {
            await expect(page.getByRole('rowheader', { name: id, exact: true })).toBeVisible();
        }

        await page.goto(`/${electionId}/results`);
        await expect(page.getByText('Bob wins!')).toBeVisible({ timeout: 10000 });
    });

    test('rejected uploads show the problem and write nothing', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'closed');
        await addVoters(request, ['1', '2', '3']);
        await enableUploadsAndOpen(page);
        await page.goto(`/${electionId}/admin/upload_ballots`);
        const uploadButton = page.getByRole('button', { name: 'Upload ballots' });

        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);

        // A voter file with a second column could link voters to ballots, so it is refused before uploading
        await fileInputs(page).nth(1).setInputFiles(csvFile('linked.csv', ['voter_id,ballot_id', '1,P-001', '2,P-002', '3,P-003']));
        await expect(page.getByText('The voter file must have exactly one column, headed voter_id or email')).toBeVisible();
        await expect(uploadButton).toBeDisabled();

        // A voter who isn't on the voter list is caught by the server, and the whole upload is refused
        await fileInputs(page).nth(1).setInputFiles(csvFile('voters.csv', ['voter_id', '1', '2', '99']));
        await expect(page.getByText('Ready to upload 3 ballots and mark 3 voters as having voted.')).toBeVisible();
        const rejected = page.waitForResponse(r => r.url().includes(`/Election/${electionId}/importBallots`));
        await uploadButton.click();
        expect((await rejected).status()).toBe(400);
        await expect(page.getByText(/Not on the voter list/)).toBeVisible();

        expect(await ballotCount(request)).toBe(0);
        expect(await votedVoterIds(request)).toEqual([]);
    });
});
