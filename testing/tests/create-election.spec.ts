import {  API_BASE_URL } from './helperfunctions';
import { test, expect } from '@playwright/test';

let electionId = '';
test.describe('Create Election', () => {
    test('Poll, Single Race, Publish Now', async ({ page }) => {
        await page.goto('/');
        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        const pollButton = page.getByRole('radio', { name: 'Poll' })
        await expect(pollButton).toBeInViewport({timeout: 2000});
        await pollButton.check();
        expect(page.getByText('How many questions will your poll include?')).toBeVisible(); // confirm the election switched to races language
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).click();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('Favorite Fruit');
        await page.getByRole('textbox', { name: 'Question Title' }).blur();
        await page.getByRole('button', { name: 'Select the voting method' }).click();
        await page.getByRole('radio', { name: 'Single-Winner' }).check();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('Pear');
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).blur();
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('Apple');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).blur();
        await page.getByRole('textbox', { name: 'Candidate 3 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 3 Name' }).fill('Strawberry');
        await page.getByRole('textbox', { name: 'Candidate 3 Name' }).blur();
        await page.getByRole('button', { name: 'Next' }).nth(2).click();
        await page.getByRole('button', { name: 'Publish Now' }).click();

        // Confirm Title
        await expect(page.getByRole('heading', { name: 'Favorite Fruit' })).toBeVisible({timeout: 2000})
        await page.getByRole('link', { name: 'Vote', exact: true }).click();

        // Confirm Candidates
        await expect(page.getByRole('heading', { name: 'Pear', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Apple', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Strawberry', exact: true })).toBeVisible();
    });

    test('Election, More than one race, Customize in editor', async ({ page }) => {
        await page.goto('/');

        // Start from About Page (to test nav)
        await page.getByRole('link', { name: 'About Us' }).click();
        await page.getByRole('link', { name: 'Create Election' }).click();
        const electionButton = page.getByRole('radio', { name: 'Election' })
        await expect(electionButton).toBeInViewport({timeout: 10000});
        await electionButton.check();

        // Fill out form - title is now on page 1
        expect(page.getByText('How many races will your election include?')).toBeVisible();
        await page.getByRole('radio', { name: 'More than one' }).check();
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Multiple Races');
        await page.getByRole('button', { name: 'Next' }).first().click();

        // Should land on build_ballot admin page
        await expect(page).toHaveURL(/\/admin\/build_ballot/, { timeout: 5000 });
        await expect(page.getByText('Multiple Races')).toBeVisible();
    });

    test('Poll, Single Race, Customize in editor', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('My Poll');
        await page.getByRole('textbox', { name: 'Question Title' }).blur();
        await page.getByRole('button', { name: 'Select the voting method' }).click();
        await page.getByRole('radio', { name: 'Single-Winner' }).check();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('A');
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).blur();
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('B');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).blur();
        await page.getByRole('button', { name: 'Next' }).nth(2).click();
        await page.getByRole('button', { name: 'Customize in editor' }).click();

        // Should land on build_ballot admin page
        await expect(page).toHaveURL(/\/admin\/build_ballot/, { timeout: 5000 });
    });

    test('Poll, Multi Race, default voter auth is device ID', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'More than one' }).check();
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Multi Race Default Auth');
        await page.getByRole('button', { name: 'Next' }).first().click();

        // Should land on build_ballot admin page
        await expect(page).toHaveURL(/\/admin\/build_ballot/, { timeout: 5000 });

        // Confirm device-ID radio is checked by default
        await page.getByRole('link', { name: 'Manage Voters' }).click();
        await expect(page.getByRole('radio', { name: 'device' })).toBeChecked({ timeout: 10000 });
    });

    test('Poll, Single Race, dismiss dialog returns to page 1', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('My Dismissable Poll');
        await page.getByRole('textbox', { name: 'Question Title' }).blur();
        await page.getByRole('button', { name: 'Select the voting method' }).click();
        await page.getByRole('radio', { name: 'Single-Winner' }).check();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('A');
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).blur();
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('B');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).blur();
        await page.getByRole('button', { name: 'Next' }).nth(2).click();

        // Dialog should be open
        await expect(page.getByRole('dialog')).toBeVisible();

        // Click the X button to dismiss
        await page.getByRole('button', { name: 'Close' }).click();

        // Dialog should be closed
        await expect(page.getByRole('dialog')).not.toBeVisible();

        // Wizard should still be visible with race form values intact
        await expect(page.locator('.wizard')).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Question Title' })).toHaveValue('My Dismissable Poll');
    });

    test('Wizard height is consistent — starts tall, does not snap when race type is chosen', async ({ page }) => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Create Election' }).click();
        const wizard = page.locator('.wizard');
        await expect(wizard).toBeVisible();

        // Measure height after picking term type but before picking race type —
        // this is the point where the wizard used to be short and then snap taller.
        await page.getByRole('radio', { name: 'Poll' }).check();
        const heightBeforeRaceChoice = (await wizard.boundingBox()).height;

        // Selecting single race reveals the full RaceForm — the tallest state.
        await page.getByRole('radio', { name: 'Just one' }).check();
        const heightAfterSingleRace = (await wizard.boundingBox()).height;

        // Guard against a >20% jump upward, which is what "snapping" looked like.
        expect(heightBeforeRaceChoice).toBeGreaterThan(heightAfterSingleRace * 0.8);
    });

    test.afterEach(async ({ request }) => {
        //delete election when finished
        if (electionId) {
        await request.delete(`${API_BASE_URL}/election/${electionId}`);
        console.log(`deleted election: ${electionId}`);
        }
    });
});
