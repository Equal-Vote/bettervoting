import { test, expect } from '@playwright/test';

import {  API_BASE_URL } from './helperfunctions';
let electionId = '';

test('Full Runthrough', async ({ page }) => {
	await page.goto('/');

	// Fill out form
	await page.getByRole('button', { name: 'Create Election' }).click();
	await page.getByRole('radio', { name: 'Poll' }).check();
	await page.getByRole('radio', { name: 'More than one' }).check();
	await page.getByRole('button', { name: 'Next' }).first().click();
	await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Playwright Test Election');
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('radio', { name: 'No' }).check();
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByRole('button', { name: 'Allows multiple votes per device' }).click();

	// Description + Start/End Times
	await expect(page.getByText('draft')).toBeVisible({ timeout: 2000 });
	await expect(page.getByLabel('no limit')).toBeChecked();
	const url = await page.url();
	const urlArray = url.split('/');
	electionId = urlArray[urlArray.length - 2];
	await page.getByRole('button', { name: 'Edit Election Details' }).click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Playwright Test Election Updated');
	await page.getByRole('textbox', { name: 'Election Description' }).fill('Playwright Test Election Description');
	await page.getByLabel('Enable Start/End Times?').click();
	await page.getByLabel('Time Zone').click();
	await page.getByRole('option', { name: 'Hawaii' }).click();
	await page.getByRole('option', { name: 'Hawaii' }).click();
	const endTimeInput = await page.getByRole('textbox', { name: 'End Time' });
	const box = await endTimeInput.boundingBox();
	if (!box) {
		throw new Error('Could not find bounding box for end time input');
	}
	const { width, height } = box;
	await endTimeInput.click({
		position: {
			x: 0.75 * width,
			y: 16,
		},
	});
	await endTimeInput.pressSequentially('12122050');
	await page.getByRole('button', { name: 'Save' }).click();

	// Election Settings
	await page.getByRole('button', { name: 'Edit Settings' }).click();
	await page
		.getByRole('checkbox', { name: 'Set Number of Rankings' })
		.click();
	await page.getByRole('spinbutton', { name: 'Rank Limit' }).fill('8');
	await page.getByRole('button', { name: 'Save' }).click();

	// Adding Race 1
	await page.getByRole('button', { name: 'Add Race' }).click();
	await page.getByRole('textbox', { name: 'Title' }).fill('Race 1');
	await page.getByRole('button', { name: 'Description' }).click();
	await page
		.getByRole('textbox', { name: 'Description' })
		.fill('Race 1 Description');
	await page.getByRole('button', { name: 'Voting Method' }).click();
	await page.getByRole('radio', { name: 'Single-Winner' }).check();
	await page.getByRole('radio', { name: 'STAR Voting' }).click();
	await page.getByRole('button', { name: 'Choices' }).click();
	await expect(page.getByRole('button', { name: 'Delete Candidate Number 2' })).toBeDisabled();
	await expect(
		page.getByRole('button', { name: 'Drag Candidate Number 2' })
	).toBeDisabled();
	for (let i = 1; i <= 6; i++) {
		await expect(page.getByRole('textbox', { name: `Candidate ${i} Name` })).toBeEnabled();
		await page.getByRole('textbox', { name: `Candidate ${i} Name` }).fill(`Candidate ${i}`);
	}
	await page.getByRole('button', { name: 'Save' }).click();

	// Adding Race 2
	await page
		.getByRole('button', { name: 'Add' })
		.click({ timeout: 10000 });
	const raceDialog = await page.getByRole('dialog', { name: 'Edit Race' });
	await raceDialog.getByRole('textbox', { name: 'Title' }).fill('Race 2');
	await raceDialog.getByRole('button', { name: 'Description' }).click();
	await raceDialog
		.getByRole('textbox', { name: 'Description' })
		.fill('Race 2 Description');
	await raceDialog.getByRole('button', { name: 'Voting Method' }).click();
	await raceDialog.getByRole('radio', { name: 'Single-Winner' }).check();
	await raceDialog.getByLabel('Ranked Robin').click();
	await raceDialog.getByRole('button', { name: 'Choices' }).click();
	for (let i = 1; i <= 10; i++) {
		await raceDialog
			.getByRole('textbox', { name: `Candidate ${i} Name` }).fill(`Candidate ${i}`);
	}
	await raceDialog.getByRole('button', { name: 'Drag Candidate Number 10' }).click();
	await raceDialog.getByRole('button', { name: 'Delete Candidate Number 10' }).click();
	await page.getByRole('button', { name: 'Submit' }).click(); // must be page since it's a separate popup
	await expect(raceDialog.getByLabel('Candidate 11 Form')).not.toBeVisible();
	await raceDialog.getByRole('textbox', { name: `Candidate 10 Name` }).fill(`Candidate 10`);
	const dragSource = await raceDialog.getByRole('button', { name: 'Drag Candidate Number 10' });
	const dragTarget = await raceDialog.getByRole('button', { name: 'Drag Candidate Number 6' });
	await dragSource.dragTo(dragTarget);
	await expect(raceDialog.getByRole('textbox', { name: 'Candidate 6 Name' })).toHaveValue(
		'Candidate 10'
	);
	await raceDialog.getByRole('button', { name: 'Save' }).click();

	// Finalize
	await page.getByRole('button', { name: 'Finalize Poll'}).click();
	await page.getByRole('button', { name: 'Submit'}).click();

	// Vote
	await page.getByRole('link', { name: 'Voting Page' }).click();
	const vote = async (page) => {
		await page.getByRole('link', { name: 'Vote', exact: true }).click();
		await page.waitForURL(`**/${electionId}/vote`)

		await page.getByLabel('I have read the instructions').click();
		await page.getByRole('button', { name: 'Score Candidate 1 5' }).click();
		await page.getByRole('button', { name: 'Score Candidate 2 4' }).click();
		await page.getByRole('button', { name: 'Score Candidate 3 3' }).click();
		await page.getByRole('button', { name: 'Score Candidate 4 2' }).click();
		await page.getByRole('button', { name: 'Score Candidate 5 1' }).click();
		await page.getByRole('button', { name: 'Score Candidate 6 0' }).click();

		await page.getByRole('button', { name: 'Next' }).click();
		await page.getByLabel('I have read the instructions').click();
		//check that the highest rank is 8
		const columnHeadings = await page.locator('.column-headings');
		const columnHeadingElements = await columnHeadings.evaluateAll(
			(elements) => elements.map((element) => element.textContent)
		);
		expect(columnHeadingElements.length).toBe(8);

		await page.getByRole('button', { name: 'Rank Candidate 1 8' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 2 7' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 3 6' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 4 5' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 5 4' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 10 3' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 6 2' }).click();
		await page.getByRole('button', { name: 'Rank Candidate 7 1' }).click();
		await page.getByRole('button', { name: 'Submit' }).click();
		await page.getByRole('button', { name: 'Submit' }).click();
	};
	await vote(page);
	await page.goto(`/${electionId}/results`);
	await expect(
		page.getByText("There's only one vote so far.").first()
	).toBeVisible({ timeout: 10000 });

	await page.getByRole('link', { name: 'Voting Page' }).click();
	await vote(page);
	await page.goto(`/${electionId}/results`);
	await expect(page.getByText('Candidate 1 Wins!')).toBeVisible({
		timeout: 10000,
	});
});


test.afterEach(async ({ request }) => {
	//delete election when finished
	if (electionId) {
		await request.delete(`${API_BASE_URL}/election/${electionId}`);
		console.log(`deleted election: ${electionId}`);
	}
});
