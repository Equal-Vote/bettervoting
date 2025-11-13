import {test, expect, Page, } from '@playwright/test';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';
import path from 'path';
import { randomUUID } from 'crypto';
import {  API_BASE_URL, getSub } from './helperfunctions';
let electionId = '';
const voterIds = ['1', '2', '3', '4', '5'];
const makeVotes = (numVotes: number, minRank:number) => {
    const votes:{ candidateName: string, value: number }[] = [];
    for (let i = 0; i < numVotes; i++) {
        votes.push({ candidateName: `Candidate ${i + 1}`, value: i + minRank });
    }
    return votes;
}

test.describe('Add Voters', () => {
    test.beforeEach(async ({page, context}) => {
        const apiContext =  page.request;
        const sub = await getSub(context);
        const response = await apiContext.post(`${API_BASE_URL}/elections`, {
            data: {
                "Election": {
                    "title": "Playwright Test Election",
                    //TODO: owner_id probably shouldn't be hardcoded, but would need to add some jwt
                    //decoding and connecting to keycloak to fix it
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
                            "voting_method": "RankedRobin",
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
                            "voter_id": true,
                            "email": false,
                            "ip_address": false
                        },
                        "ballot_updates": false,
                        "public_results": true,
                        "time_zone": "America/Denver",
                        "random_candidate_order": false,
                        "require_instruction_confirmation": true,
                        "term_type": "election",
                        "voter_access": "closed"
                    },
                    "is_public": false
                }
            }
        })
        const responseBody = await response.json();
        const election = responseBody.election as Election;
        electionId = election.election_id;
    });

    test('add voters', async ({page}) => {

        await page.goto(`/${electionId}/admin/voters`);
        await page.getByRole('button', {name: 'Add Voters'}).click();
        await page.getByLabel('Voter Data').fill(voterIds.join('\n'));
        await page.getByRole('button', {name: 'Submit'}).click();


    });
    test('vote in election restricted by ID', async ({page, context}) => {
        await page.goto(`/`);
        const response = await page.request.post(`${API_BASE_URL}/Election/${electionId}/rolls`, {
            data: {
                "electionRoll": [
                    {
                        "state": "approved",
                        "voter_id": "1"
                    },
                    {
                        "state": "approved",
                        "voter_id": "2"
                    },
                    {
                        "state": "approved",
                        "voter_id": "3"
                    },
                    {
                        "state": "approved",
                        "voter_id": "4"
                    },
                    {
                        "state": "approved",
                        "voter_id": "5"
                    }
                ]
            }
        });
        const responseJson = await response.ok();
        console.log(`response status: ${responseJson}`);
        await expect(responseJson).toBe(true);
        await page.goto(`/${electionId}/admin/voters`);
        await expect(page.getByRole('button', { name: 'Add Voters' })).toBeVisible();
        await expect(page.getByText('1–5 of 5')).toBeVisible();
        await page.getByRole('link', { name: 'Admin Home' }).click();
        await page.waitForURL(`**/${electionId}/admin`)
        await page.getByRole('button', { name: 'Finalize Election' }).click();
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByText('open')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Edit Election Details' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Add' })).toBeDisabled();
        await page.getByRole('button', { name: 'Edit Race: Race 1' }).click();
        await expect(page.getByRole('button', { name: 'Delete Candidate Number 6' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Drag Candidate Number 6' })).toBeDisabled();
        await expect(page.getByRole('textbox', {name: "Candidate 7 Name"})).not.toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Title' })).toBeDisabled();
        await expect(page.getByRole('textbox', { name: 'Description' })).toBeDisabled();
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.getByText('(no description)')).toBeVisible();
        await expect(page.getByText('(start and end times disabled)')).toBeVisible();
        await expect(page.getByRole('link', { name: 'View Results' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Share Election' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Make results private' })).toBeVisible();
        await page.getByRole('link', { name: 'Voting Page' }).click();
        await page.waitForURL(`**/${electionId}/`)
        await page.getByLabel('Voter ID').fill(voterIds[0]);
        await page.getByRole('button', { name: 'Submit' }).click();
        await page.getByRole('link', { name: 'Vote', exact: true }).click();
        await page.getByLabel(('I have read the instructions')).click();
        let votes = makeVotes(6, 0);
        for (const vote of votes) {
            await page.getByRole('button', { name: `Score ${vote.candidateName} ${vote.value}` }).click();
        }
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByLabel(('I have read the instructions')).click();
        const submitButton = page.getByRole('button', { name: 'Submit' });
        await expect(submitButton).toBeEnabled();
        votes = makeVotes(6, 1);
        for (const vote of votes) {
            await page.getByRole('button', { name: `Rank ${vote.candidateName} ${vote.value}` }).click();
        }
        await submitButton.click();
        let reponsePromise = page.waitForResponse((response) => response.url().includes(`${electionId}/vote`) && response.status() === 200);
        await page.getByRole('button', { name: 'Submit' }).click();
        let voteResponse = await reponsePromise;
        console.log(`Vote response status: ${voteResponse.status()}`);
        await page.getByRole('link', { name: 'Voting Page' }).click();
        await page.waitForURL(`**/${electionId}/`)
        await page.getByLabel('Voter ID').fill(voterIds[0]);
        await page.getByRole('button', { name: 'Submit' }).click();
        await expect(page.getByRole('link', { name: 'Vote', exact: true })).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'Ballot Submitted' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'View Results' })).toBeVisible();
        await page.getByRole('button', { name: 'Clear' }).click();
        await page.getByLabel('Voter ID').fill(voterIds[1]);
        await page.getByRole('button', { name: 'Submit' }).click();
        await page.getByRole('link', { name: 'Vote', exact: true }).click();
        await page.getByLabel(('I have read the instructions')).click();
        votes = makeVotes(6, 0);
        for (const vote of votes) {
            await page.getByRole('button', { name: `Score ${vote.candidateName} ${vote.value}` }).click();
        }
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByLabel(('I have read the instructions')).click();
        votes = makeVotes(6, 1);
        for (const vote of votes) {
            await page.getByRole('button', { name: `Rank ${vote.candidateName} ${vote.value}` }).click();
        }
        await submitButton.click();
        //waiting for response from server before checking ballots so we don't navigate to that page too soon
        reponsePromise = page.waitForResponse((response) => response.url().includes(`${electionId}/vote`) && response.status() === 200);
        await page.getByRole('button', { name: 'Submit' }).click();
        voteResponse = await reponsePromise;
        console.log(`Vote response status: ${voteResponse.status()}`);
        await expect(page.getByRole('heading', { name: 'Thank you for voting!' })).toBeVisible();
        await page.getByRole('link', { name: 'Voters' }).click();
        await page.waitForURL(`**/${electionId}/admin/voters`)
        await page.getByRole('columnheader', { name: 'Has Voted' }).getByRole('combobox').click();
        await page.getByRole('option', { name: 'Not Voted', exact: true }).getByRole('checkbox').click();
        await page.locator('#menu- > .MuiBackdrop-root').click();
        await expect(page.getByText('1–2 of 2')).toBeVisible();
        await expect(page.getByRole('rowheader', { name: '1' })).toBeVisible();
        await expect(page.getByRole('rowheader', { name: '2' })).toBeVisible();




    });


    test.afterEach(async ({ page }) => {
        //delete election when finished
        if (electionId) {
        await page.request.delete(`${API_BASE_URL}/election/${electionId}`);
        console.log(`deleted election: ${electionId}`);
    }})
});
