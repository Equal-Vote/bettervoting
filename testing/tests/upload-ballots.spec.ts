import { test, expect, type Page, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import { randomUUID } from 'crypto';
import { API_BASE_URL, getSub } from './helperfunctions';

// Admin upload of paper ballots (docs/help/uploading_ballots.md). Elections without a
// voter list take one ballot CSV; elections with a voter list take a ballot CSV and a
// voter CSV together, and the two are never linked.

let electionId = '';

// 'open': open_open (no voter list); 'closed': closed_admin_managed_ids; 'email': closed_bv_managed_ids
const createDraftElection = async (context: BrowserContext, request: APIRequestContext, kind: 'open' | 'closed' | 'email', writeIns = false) => {
    const voterAccess = kind === 'open' ? 'open' : 'closed';
    const sub = await getSub(context);
    const response = await request.post(`${API_BASE_URL}/elections`, {
        data: {
            Election: {
                title: `Playwright Upload Ballots (${kind})`,
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
                    ...(writeIns ? { enable_write_in: true } : {}),
                }],
                settings: {
                    voter_authentication: { voter_id: voterAccess === 'closed', email: false, ip_address: false },
                    ...(kind === 'email' ? { invitation: 'email' } : {}),
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

const toggleSetting = async (page: Page, label: string, on: boolean) => {
    const toggle = page.getByLabel(label);
    await expect(toggle).toBeChecked({ checked: !on });
    const saved = page.waitForResponse(r => r.url().includes(`/Election/${electionId}/edit`) && r.ok());
    await toggle.click();
    await saved;
    await expect(toggle).toBeChecked({ checked: on });
};

const ONLINE_AND_UPLOADS = 'Online and uploaded paper ballots';
const UPLOADS_ONLY = 'Uploaded paper ballots only';

// Picks how ballots come in, under Manage Voters (draft only)
const chooseChannels = async (page: Page, label: string) => {
    await page.goto(`/${electionId}/admin/voters`);
    const radio = page.getByLabel(label);
    const saved = page.waitForResponse(r => r.url().includes(`/Election/${electionId}/edit`) && r.ok());
    await radio.click();
    await saved;
    await expect(radio).toBeChecked();
};

const enableUploads = (page: Page) => chooseChannels(page, ONLINE_AND_UPLOADS);

const finalize = async (page: Page) => {
    await page.getByRole('link', { name: 'Publish & Share' }).click();
    await page.waitForURL(`**/${electionId}/admin/publish`);
    await page.getByRole('button', { name: 'Finalize Election' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('link', { name: 'Admin Home' }).click();
    await page.waitForURL(`**/${electionId}/admin`);
    await expect(page.getByText('open', { exact: true })).toBeVisible();
};

const enableUploadsAndOpen = async (page: Page) => {
    await enableUploads(page);
    await finalize(page);
};

// Upload, through the confirmation the page asks for first
const upload = async (page: Page) => {
    await page.getByRole('button', { name: 'Upload ballots' }).click();
    await expect(page.getByRole('dialog')).toContainText(/Upload \d+ ballots?\?/);
    await page.getByRole('dialog').getByRole('button', { name: 'Upload', exact: true }).click();
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
        await upload(page);
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
        await upload(page);
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
        await upload(page);
        expect((await rejected).status()).toBe(400);
        await expect(page.getByText(/Not on the voter list/)).toBeVisible();

        expect(await ballotCount(request)).toBe(0);
        expect(await votedVoterIds(request)).toEqual([]);
    });

    test('a draft takes test ballots, and finalizing deletes them', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'open');
        await page.goto(`/${electionId}/admin/settings`);
        // editable ballots need an email list, so an open election never offers them
        await expect(page.getByLabel('Allow Voters To Edit Vote')).toBeDisabled();
        await enableUploads(page);

        await page.getByRole('link', { name: 'Upload Ballots' }).click();
        await page.waitForURL(`**/${electionId}/admin/upload_ballots`);
        await expect(page.getByText('uploads are test ballots')).toBeVisible();
        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        await expect(page.getByText('Ready to upload 3 ballots as test ballots.')).toBeVisible();
        await upload(page);
        await expect(page.getByText('3 test ballots uploaded.')).toBeVisible();
        expect(await ballotCount(request)).toBe(3);

        await page.goto(`/${electionId}/results`);
        await expect(page.getByText('Bob wins!')).toBeVisible({ timeout: 10000 });

        await page.goto(`/${electionId}/admin`);
        await finalize(page);
        expect(await ballotCount(request)).toBe(0);

        // once finalized, how ballots come in is locked
        await page.goto(`/${electionId}/admin/voters`);
        await expect(page.getByLabel(ONLINE_AND_UPLOADS)).toBeChecked();
        await expect(page.getByLabel(ONLINE_AND_UPLOADS)).toBeDisabled();
    });

    test('editable ballots and uploads lock each other out', async ({ page, context, request }) => {
        // editable ballots are only offered on email list elections
        await createDraftElection(context, request, 'email');
        await page.goto(`/${electionId}/admin/settings`);
        const editable = page.getByLabel('Allow Voters To Edit Vote');

        await toggleSetting(page, 'Allow Voters To Edit Vote', true);
        await page.goto(`/${electionId}/admin/voters`);
        await expect(page.getByLabel(ONLINE_AND_UPLOADS)).toBeDisabled();
        await expect(page.getByLabel(UPLOADS_ONLY)).toBeDisabled();
        await expect(page.getByText("Uploads aren't available while voters can edit their vote")).toBeVisible();

        await page.goto(`/${electionId}/admin/settings`);
        await toggleSetting(page, 'Allow Voters To Edit Vote', false);
        await enableUploads(page);
        await page.goto(`/${electionId}/admin/settings`);
        await expect(editable).toBeDisabled();

        // the server refuses the combination too, whatever the page allows
        const current = (await (await request.get(`${API_BASE_URL}/Election/${electionId}`)).json()).election as Election;
        const response = await request.post(`${API_BASE_URL}/Election/${electionId}/edit`, {
            data: { Election: { ...current, settings: { ...current.settings, ballot_updates: true } }, expected_update_date: current.update_date },
        });
        expect(response.status()).toBe(400);
        expect(await response.text()).toContain('cannot be combined with uploaded paper ballots');
    });

    test('without online voting, voters get no ballot and the voter list uses admin ids', async ({ page, context, request }) => {
        // starts as an email list: uploads only switches it to ids the admin manages
        await createDraftElection(context, request, 'email');
        await chooseChannels(page, UPLOADS_ONLY);
        await expect(page.getByText('How would you like to identify your voters?')).toHaveCount(0);
        await expect(page.getByText('so you manage the voter IDs')).toBeVisible();
        const stored = (await (await request.get(`${API_BASE_URL}/Election/${electionId}`)).json()).election as Election;
        expect(stored.settings.invitation).toBeUndefined();
        expect(stored.settings.allowed_submit_types).toEqual(['submitted_via_admin']);

        // the server refuses an email list without online voting, whatever the page allows
        const refused = await request.post(`${API_BASE_URL}/Election/${electionId}/edit`, {
            data: { Election: { ...stored, settings: { ...stored.settings, invitation: 'email' } }, expected_update_date: stored.update_date },
        });
        expect(refused.status()).toBe(400);
        expect(await refused.text()).toContain('need voter IDs you manage');

        await addVoters(request, ['1', '2', '3']);
        await page.goto(`/${electionId}/admin`);
        await finalize(page);

        // voters have nothing to do on the election page
        await page.goto(`/${electionId}`);
        await expect(page.getByText("doesn't take votes online")).toBeVisible();
        await expect(page.getByRole('link', { name: 'Vote', exact: true })).toHaveCount(0);
        await page.goto(`/${electionId}/vote`);
        await expect(page.getByText("doesn't take votes online")).toBeVisible();

        await page.goto(`/${electionId}/admin/upload_ballots`);
        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        await fileInputs(page).nth(1).setInputFiles(csvFile('voters.csv', ['voter_id', '2', '3', '1']));
        await upload(page);
        await expect(page.getByText('3 ballots uploaded and 3 voters marked as having voted.')).toBeVisible();
        expect(await votedVoterIds(request)).toEqual(['1', '2', '3']);
    });

    test('a mistaken upload can be deleted, with the phrase typed, and uploaded again', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'closed');
        await addVoters(request, ['1', '2', '3']);
        await enableUploadsAndOpen(page);
        await page.goto(`/${electionId}/admin/upload_ballots`);
        const voters = csvFile('voters.csv', ['voter_id', '3', '1', '2']);
        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        await fileInputs(page).nth(1).setInputFiles(voters);
        await page.getByRole('button', { name: 'Upload ballots' }).click();
        await expect(page.getByRole('dialog')).toContainText('This cannot be undone without deleting all uploaded ballots.');
        await page.getByRole('dialog').getByRole('button', { name: 'Upload', exact: true }).click();
        await expect(page.getByText('3 ballots uploaded and 3 voters marked as having voted.')).toBeVisible();

        await page.getByRole('button', { name: 'Delete all uploaded ballots' }).click();
        const dialog = page.getByRole('dialog');
        const confirmDelete = dialog.getByRole('button', { name: 'Delete uploaded ballots' });
        await expect(confirmDelete).toBeDisabled();
        await dialog.getByLabel('Confirmation phrase').fill('delete all ballots');
        await expect(confirmDelete).toBeDisabled();
        await dialog.getByLabel('Confirmation phrase').fill('delete all uploaded ballots');
        await confirmDelete.click();
        await expect(page.getByText('3 uploaded ballots deleted and 3 voters marked as not having voted.')).toBeVisible();
        expect(await ballotCount(request)).toBe(0);
        expect(await votedVoterIds(request)).toEqual([]);

        // the corrected file goes in with the same ballot ids and voters
        await fileInputs(page).nth(0).setInputFiles(BALLOT_CSV);
        await fileInputs(page).nth(1).setInputFiles(voters);
        await upload(page);
        await expect(page.getByText('3 ballots uploaded and 3 voters marked as having voted.')).toBeVisible();
        expect(await ballotCount(request)).toBe(3);
    });

    test('the page explains each column, lists every problem, and takes write-ins', async ({ page, context, request }) => {
        await createDraftElection(context, request, 'open', true);
        await enableUploadsAndOpen(page);
        await page.goto(`/${electionId}/admin/upload_ballots`);
        const guide = page.getByRole('table', { name: 'What to write for each race' });
        await expect(guide).toContainText('a score from 0 to 5');
        await expect(page.getByText('write_in_1_mark').first()).toBeVisible();

        await fileInputs(page).nth(0).setInputFiles(csvFile('ballots.csv', [
            'ballot_id,precinct,Alice,Bob,Carol,write_in_1,write_in_1_mark',
            'P-001,,1,5,0,,',
            'P-002,,9,5,0,,',
            'P-003,,0,4,5,Zed,',
        ]));
        const problems = page.getByRole('table', { name: 'Problems in the file' });
        await expect(problems.getByRole('row')).toHaveCount(3); // header + 2
        await expect(problems).toContainText('STAR scores go from 0 to 5, not 9');
        await expect(problems).toContainText('The write-in "Zed" needs a mark');
        await expect(page.getByRole('button', { name: 'Upload ballots' })).toBeDisabled();

        await fileInputs(page).nth(0).setInputFiles(csvFile('ballots.csv', [
            'ballot_id,precinct,Alice,Bob,Carol,write_in_1,write_in_1_mark',
            'P-001,,1,5,0,,',
            'P-002,,2,5,0,,',
            'P-003,,0,4,5,Zed,3',
        ]));
        await upload(page);
        await expect(page.getByText('3 ballots uploaded.')).toBeVisible();
        const ballots = (await (await request.get(`${API_BASE_URL}/Election/${electionId}/ballots`)).json()).ballots as { votes: { scores: { write_in_name?: string, score: number }[] }[] }[];
        const writeIns = ballots.flatMap(b => b.votes[0].scores.filter(s => s.write_in_name));
        expect(writeIns).toEqual([expect.objectContaining({ write_in_name: 'Zed', score: 3 })]);
    });
});
