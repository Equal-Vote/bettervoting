import { test, expect } from '@playwright/test';
import { API_BASE_URL, getSub } from './helperfunctions';
import { randomUUID } from 'crypto';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';


let electionId = '';
test.beforeEach(async ({page, context}) => {
    const apiContext =  page.request;
    const sub = await getSub(context);
    const response = await apiContext.post(`${API_BASE_URL}/elections`, {
        data: {
            "Election": {
                "title": "Playwright Test Election",
                "owner_id": sub,
                "description": "",
                "state": "draft",
                "frontend_url": "",
                "races": [
                    {
                        "title": "Race 1",
                        "race_id": randomUUID(),
                        "num_winners": 1,
                        "voting_method": "STAR",
                        "candidates": [
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 1"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 2"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 3"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 4"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 5"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 6"
                            }
                        ],
                        "description": "Race 1 Description"
                    },
                    {
                        "title": "Race 2",
                        "race_id": randomUUID(),
                        "num_winners": 1,
                        "voting_method": "IRV",
                        "candidates": [
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 1"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 2"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 3"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 4"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 5"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 6"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 7"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 8"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 9"
                            },
                            {
                                "candidate_id": randomUUID(),
                                "candidate_name": "Candidate 10"
                            }
                        ],
                        "description": "Race 2 Description"
                    }
                ],
                "settings": {
                    "voter_authentication": {
                        "voter_id": false,
                        "email": false,
                        "ip_address": false
                    },
                    "ballot_updates": false,
                    "public_results": true,
                    "time_zone": "America/Denver",
                    "random_candidate_order": false,
                    "require_instruction_confirmation": true,
                    "term_type": "election",
                    "voter_access": "open"
                },
                "is_public": false
            }
        }
    })
    const responseBody = await response.json();
    const election = responseBody.election as Election;
    electionId = election.election_id;
});

test('vote in election restricted by account', async ({page}) => {
    await page.goto(`/${electionId}/admin`);
    await page.getByLabel('user (login required)').click();
    await expect(page.getByLabel('user (login required)')).toBeChecked();
    await page.getByRole('button', { name: 'Finalize Election' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('link', { name: 'Voting Page' }).click();
    await page.waitForURL(`**/${electionId}/`)
    await page.getByRole('link', { name: 'Vote', exact: true }).click();
    await page.getByLabel('I have read the instructions').check();
    await page.getByRole('button', { name: 'Score Candidate 1 0' }).click();
    await page.getByRole('button', { name: 'Score Candidate 2 1' }).click();
    await page.getByRole('button', { name: 'Score Candidate 3 2' }).click();
    await page.getByRole('button', { name: 'Score Candidate 4 3' }).click();
    await page.getByRole('button', { name: 'Score Candidate 5 4' }).click();
    await page.getByRole('button', { name: 'Score Candidate 6 5' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('I have read the instructions').check();
    await page.getByRole('button', { name: 'Rank Candidate 10 1' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 8 2' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 9 4' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 6 4' }).click();

    await expect(page.getByLabel('Warning: Skipped Column')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rank Candidate 6 4' })).toHaveClass(/alert/);
    await expect(page.getByRole('button', { name: 'Rank Candidate 9 4' })).toHaveClass(/alert/);
    await expect(page.getByText('Do not skip rankings. Rank')).toBeVisible();
    await expect(page.getByText('Do not rank multiple')).toBeVisible();

    await page.getByRole('button', { name: 'Rank Candidate 9 3' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 6 5' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 3 6' }).click();
    await page.getByRole('button', { name: 'Rank Candidate 7 4' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('heading', { name: 'Ballot Submitted' })).toBeVisible();
    await page.waitForTimeout(1000);
    await page.getByRole('link', { name: 'Voting Page' }).click();
    await page.waitForURL(`**/${electionId}/`)
    await expect(page.getByRole('heading', { name: 'Ballot Submitted' })).toBeVisible();
    await expect(page.locator('#root')).toContainText('Ballot Submitted');
    await page.getByRole('button', { name: 'Hello, Test' }).click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await page.getByLabel('I have read the instructions').check();
    await page.getByRole('button', { name: 'Score Candidate 1 0' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('I have read the instructions').check();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('#root')).toContainText('Error making request: 401: Email Validation Required');
    await page.getByLabel('Close').click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByLabel('Username or email').fill('PlayWrightTest2');
    await page.getByLabel('Username or email').press('Tab');
    await page.getByLabel('Password', { exact: true }).fill('test');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByLabel('I have read the instructions').check();

    await page.getByRole('button', { name: 'Score Candidate 1 0' }).click();
    await page.getByRole('button', { name: 'Score Candidate 2 1' }).click();
    await page.getByRole('button', { name: 'Score Candidate 3 2' }).click();
    await page.getByRole('button', { name: 'Score Candidate 4 3' }).click();
    await page.getByRole('button', { name: 'Score Candidate 5 4' }).click();
    await page.getByRole('button', { name: 'Score Candidate 6 5' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('I have read the instructions').check();
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('heading', { name: 'Thank you for voting!' })).toBeVisible();
});
// test('clean up all elections', async ({page}) => {
//     page.goto('/ElectionsYouManage');
//     let moreElections = true;
//     while (moreElections) {

//         await page.locator(`#enhanced-table-checkbox-0`).click();
//         const currentElectionId = await page.url().split('/')[3];
//         await page.request.delete(`${API_BASE_URL}/election/${currentElectionId}`);
//         await page.goBack();
//         const topRowIsVisible = await page.locator(`#enhanced-table-checkbox-0`).isVisible();
//         moreElections = topRowIsVisible;
//     }
// });


test.afterEach(async ({page}) => {
    await page.request.delete(`${API_BASE_URL}/election/${electionId}`);
    console.log(`deleted election: ${electionId}`);
});