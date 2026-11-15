import { test, expect, APIRequestContext, BrowserContext } from '@playwright/test';
import { randomUUID } from 'crypto';
import { API_BASE_URL, getSub } from './helperfunctions';

// Pay-at-finalize UI behind FF_PAYMENTS. Stripe itself is out of reach here, so the CheckoutSession
// call is intercepted where a test goes as far as "Proceed to payment".

const enablePayments = (context: BrowserContext) =>
    context.addInitScript(() => {
        localStorage.setItem('flag_overrides', JSON.stringify({ PAYMENTS: true }));
    });

const createClosedDraft = async (context: BrowserContext, request: APIRequestContext, voterCount: number) => {
    const sub = await getSub(context);
    const response = await request.post(`${API_BASE_URL}/elections`, {
        data: {
            Election: {
                title: 'Playwright Payments Election',
                owner_id: sub,
                description: '',
                state: 'draft',
                frontend_url: '',
                races: [{
                    title: 'Race 1',
                    race_id: randomUUID(),
                    num_winners: 1,
                    voting_method: 'STAR',
                    candidates: [
                        { candidate_id: randomUUID(), candidate_name: 'Candidate 1' },
                        { candidate_id: randomUUID(), candidate_name: 'Candidate 2' },
                    ],
                }],
                settings: {
                    voter_authentication: { voter_id: true, email: false, ip_address: false },
                    ballot_updates: false,
                    public_results: true,
                    time_zone: 'America/Denver',
                    random_candidate_order: false,
                    require_instruction_confirmation: true,
                    term_type: 'election',
                    voter_access: 'closed',
                },
                is_public: false,
            },
        },
    });
    await expect(response).toBeOK();
    const electionId: string = (await response.json()).election.election_id;
    if (voterCount > 0) {
        const rolls = await request.post(`${API_BASE_URL}/Election/${electionId}/rolls`, {
            data: { electionRoll: Array.from({ length: voterCount }, (_, i) => ({ state: 'approved', voter_id: `voter-${i + 1}` })) },
        });
        await expect(rolls).toBeOK();
    }
    return electionId;
};

const finalizeViaApi = async (request: APIRequestContext, electionId: string) => {
    const election = await request.get(`${API_BASE_URL}/Election/${electionId}`);
    await expect(election).toBeOK();
    const { update_date } = (await election.json()).election;
    const finalized = await request.post(`${API_BASE_URL}/Election/${electionId}/finalize`, {
        data: { expected_update_date: update_date },
    });
    await expect(finalized).toBeOK();
};

test.describe('Pay at finalize', () => {
    test.beforeEach(async ({ context }) => {
        await enablePayments(context);
    });

    test('free: a note instead of the cost table, and the usual finalize confirm', async ({ page, context, request }) => {
        const electionId = await createClosedDraft(context, request, 5);
        await page.goto(`/${electionId}/admin/publish`);

        await expect(page.getByText('No cost to finalize: your 5 voters are covered by the free tier.')).toBeVisible();
        await expect(page.getByRole('table')).toHaveCount(0);
        // The stop-gap override message is replaced while FF_PAYMENTS is on
        await expect(page.getByText(/please reach out to elections@equal.vote for an override/)).toHaveCount(0);

        await page.getByRole('button', { name: 'Finalize Election' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('Confirm Finalize Election')).toBeVisible();
        await expect(dialog.getByRole('button', { name: /Proceed to payment/ })).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Submit' }).click();

        // Finalized: the Finalize section is gone and the open/close toggle shows
        await expect(page.getByRole('button', { name: 'Finalize Election' })).toHaveCount(0);
    });

    test('owed: the itemized table, and a dialog that proceeds to payment', async ({ page, context, request }) => {
        const electionId = await createClosedDraft(context, request, 150);

        // Manage Voters links to the cost, without a price
        await page.goto(`/${electionId}/admin/voters`);
        await page.getByRole('link', { name: 'see the cost of finalizing' }).click();
        await expect(page).toHaveURL(new RegExp(`/${electionId}/admin/publish#finalize-cost$`));

        const table = page.getByRole('table', { name: 'Cost to Finalize Election' });
        await expect(page.getByText('Cost to Finalize Election')).toBeVisible();
        await expect(page.getByText(/Based on\s*150\s*voters/)).toBeVisible();
        await expect(table.getByRole('row', { name: /Free tier \(first 100 voters\)\s*Free/ })).toBeVisible();
        await expect(table.getByText('From 100 to 200 · $6 per 100')).toBeVisible();
        await expect(table.getByRole('row', { name: /Increase Voter Limit.*1 × \$6\s*\$6/ })).toBeVisible();
        await expect(table.getByRole('row', { name: /Total\s*\$6/ })).toBeVisible();
        await expect(table.getByText('Already paid', { exact: false })).toHaveCount(0);

        // Stand in for Stripe: check the cart we post, and "return" as a cancel
        let postedCart: unknown = null;
        await page.route(`**/API/Election/${electionId}/CheckoutSession`, async route => {
            postedCart = route.request().postDataJSON();
            await route.fulfill({ json: { url: `/${electionId}/admin?checkout=cancelled` } });
        });

        await page.getByRole('button', { name: 'Finalize Election' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Finalize Election' })).toBeVisible();
        await expect(dialog.getByText("Are you sure you want to finalize your election?", { exact: false })).toBeVisible();
        await expect(dialog.getByRole('table')).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Proceed to payment ($6)' }).click();

        // Cancelled checkout: back on Publish & Share, still a draft
        await expect(page).toHaveURL(new RegExp(`/${electionId}/admin/publish$`));
        expect(postedCart).toEqual({
            line_items: [{ entitlement_type: 'voter_limit', quantity: 1, unit_entitlement: 100, unit_amount: 600 }],
        });
        await expect(page.getByRole('button', { name: 'Finalize Election' })).toBeVisible();
    });

    test('over-limit upload after finalize: priced before any voters are added', async ({ page, context, request }) => {
        const electionId = await createClosedDraft(context, request, 98);
        await finalizeViaApi(request, electionId);

        await page.goto(`/${electionId}/admin/voters`);
        await page.getByRole('button', { name: 'Add Voters' }).click();
        // Tier copy sits at the bottom; the quote link is for drafts only
        await expect(page.getByText(/The first 100 voters are covered by the free tier, and additional voters are charged at \$6 per 100 voters\./)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Publish & Share' })).toHaveCount(0);
        await expect(page.getByText(/Free tier elections are limited to/)).toHaveCount(0);

        await page.getByLabel('Voter Data').fill(['new-1', 'new-2', 'new-3', 'new-4', 'new-5'].join('\n'));
        await page.getByRole('button', { name: 'Submit' }).click();

        const dialog = page.getByRole('dialog', { name: 'Adding 5 voters needs a higher voter limit' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('This would bring your list to 103 voters, over your limit of 100.', { exact: false })).toBeVisible();
        await expect(dialog.getByText(/Based on\s*103\s*voters/)).toBeVisible();
        await expect(dialog.getByRole('row', { name: /Total\s*\$6/ })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Proceed to payment ($6)' })).toBeVisible();

        // Nothing was added
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        const rolls = await request.get(`${API_BASE_URL}/Election/${electionId}/rolls`);
        expect((await rolls.json()).electionRoll).toHaveLength(98);
    });
});
