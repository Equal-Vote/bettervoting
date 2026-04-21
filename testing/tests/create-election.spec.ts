import {  API_BASE_URL } from './helperfunctions';
import { test, expect } from '@playwright/test';

let electionId = '';
test.describe('Create Election', () => {
    test('Poll, Single Race, Publish Now', async ({ page }) => {
        await page.goto('/');
        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        const pollButton = page.getByRole('radio', { name: 'Poll' })
        await expect(pollButton).toBeInViewport({timeout: 500});
        await pollButton.check();
        expect(page.getByText('How many questions will your poll include?')).toBeVisible(); // confirm the election switched to races language
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).click();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('Favorite Fruit');
        await page.getByRole('textbox', { name: 'Question Title' }).blur();
        await page.getByRole('button', { name: 'Voting Method', exact: true }).click();
        await page.getByRole('radio', { name: 'Single-Winner' }).check();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('button', { name: 'Choices' }).click();
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
        await page.getByRole('checkbox', { name: 'I have read the instructions' }).check();
        await expect(page.getByRole('heading', { name: 'Pear', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Apple', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Strawberry', exact: true })).toBeVisible();
    });

    test('From About Us, Election, More than one race, BetterVoting-managed voter IDs', async ({ page }) => {
        await page.goto('/');
        
        // Start from About Page (to test nav)
        await page.getByRole('link', { name: 'About Us' }).click();
        await page.getByRole('link', { name: 'Create Election' }).click();
        const electionButton = page.getByRole('radio', { name: 'Election' })
        await expect(electionButton).toBeInViewport({timeout: 2000}); // larger timeout since this will require navigating to a different page
        await electionButton.check();

        // Fill out form
        expect(page.getByText('How many races will your election include?')).toBeVisible(); // confirm the election switched to races language
        await page.getByRole('radio', { name: 'More than one' }).check();
        await page.getByRole('button', { name: 'Next' }).first().click();
        await page.getByRole('textbox', { name: 'Title', exact: true }).click();
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Multiple Races');
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('radio', { name: 'Yes' }).check();
        await page.getByRole('textbox', { name: 'Election Support Email' }).click();
        await page.getByRole('textbox', { name: 'Election Support Email' }).fill('test@gmail.com');
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'BetterVoting-managed voter IDs' }).click();

        // Confirm title
        await expect(page.getByText('Multiple Racesdraft')).toBeVisible({timeout: 2000});

        // Confirm support email
        await page.getByRole('link', { name: 'Settings' }).click();
        await expect(page.getByRole('textbox', { name: 'Election Support Email' })).toHaveValue('test@gmail.com')

        // Confirm email list
        await page.getByRole('link', { name: 'Manage Voters' }).click();
        await page.getByRole('button', { name: 'Add Voters' }).click();
        await expect(page.getByText('Voter ID', { exact: true })).toBeHidden();
    });

    test('Poll, Single Race, Admin-managed voter IDs', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).click();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('Poll + Single Race + Admin-managed voter IDs');
        await page.getByRole('textbox', { name: 'Question Title' }).blur();
        await page.getByRole('button', { name: 'Voting Method', exact: true }).click();
        await page.getByRole('radio', { name: 'Basic Multi-Winner' }).check();
        await page.getByRole('button', { name: 'Next' }).nth(1).click();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('button', { name: 'Choices' }).click();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('A');
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).press('Tab');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('B');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).blur();
        await page.getByRole('button', { name: 'Next' }).nth(2).click();
        await page.getByRole('button', { name: 'See more options' }).click();
        await page.getByRole('radio', { name: 'Yes' }).check();
        await page.getByRole('textbox', { name: 'Election Support Email' }).click();
        await page.getByRole('textbox', { name: 'Election Support Email' }).fill('test@gmail.com');
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Admin-managed voter IDs' }).click();

        // Confirm support email
        await page.getByRole('button', { name: 'Edit Settings' }).click({timeout: 2000});
        await expect(page.getByRole('textbox', { name: 'Election Support Email' })).toHaveValue('test@gmail.com')
        await page.getByRole('button', { name: 'Save' }).click();

        // Confirm voter ID list
        await page.getByRole('link', { name: 'Voters' }).click();
        await page.getByRole('button', { name: 'Add Voters' }).click();
        await expect(page.getByText('Voter ID', { exact: true })).toBeVisible();
    })
    test('Poll, Multi Race, One vote per Device', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'More than one' }).check();
        await page.getByRole('button', { name: 'Next' }).first().click();
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Poll + Multi Race + One Vote Per Person');
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('radio', { name: 'No' }).check();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'one person, one vote' }).click();

        // Confirm One Person One Vote
        await expect(page.getByRole('radio', { name: 'device' })).toBeChecked({timeout: 2000});
    })
    test('Election, Multi Race, Multiple per Device', async ({ page }) => {
        await page.goto('/');

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'More than one' }).check();
        await page.getByRole('button', { name: 'Next' }).first().click();
        await page.getByRole('textbox', { name: 'Title', exact: true }).fill('Poll + Multi Race + Multiple per Device');
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('radio', { name: 'No' }).check();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Allows multiple votes per device' }).click();

        // Confirm One Person One Vote
        await expect(page.getByRole('radio', { name: 'no limit' })).toBeChecked({timeout: 2000});
    })

    test.afterEach(async ({ request }) => {
        //delete election when finished
        if (electionId) {
        await request.delete(`${API_BASE_URL}/election/${electionId}`);
        console.log(`deleted election: ${electionId}`);
        }
    });
});
