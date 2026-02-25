import {  API_BASE_URL } from './helperfunctions';
import { test, expect } from '@playwright/test';

let electionId = '';
test.describe('Create Election', () => {
    test('Poll, Single Race, Publish Now', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });

        // Fill out form
        await page.getByRole('button', { name: 'Create Election' }).click();
        const pollButton = page.getByRole('radio', { name: 'Poll' })
        await expect(pollButton).toBeInViewport({timeout: 500});
        await pollButton.check();
        expect(page.getByText('How many questions will your poll include?')).toBeVisible(); // confirm the election switched to races language
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).click();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('Favorite Fruit');
        await page.getByRole('button', { name: 'Voting Method', exact: true }).click();
        await page.getByRole('radio', { name: 'Single-Winner' }).check();
        await page.getByRole('radio', { name: 'STAR Voting' }).check();
        await page.getByRole('button', { name: 'Choices' }).click();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('Pear');
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('Apple');
        await page.getByRole('textbox', { name: 'Candidate 3 Name' }).click();
        await page.getByRole('textbox', { name: 'Candidate 3 Name' }).fill('Strawberry');
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

    test('create poll', async ({ page }) => {
        page.goto('/');
        await page.getByRole('link', { name: 'Create Election' }).click();
        await page.getByLabel('Poll', { exact: true }).click();
        await page.getByRole('textbox', { name: 'Title'}).fill('Playwright Test Poll');
         await page.getByRole('textbox', { name: 'Title'}).fill('Playwright Test Poll');
        //wait until there is only one continue button
        while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
        continue
        }
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByLabel('No').click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByText('Allows multiple votes per device').click();

        const url = await page.url();
        const urlArray = url.split('/');
        electionId = urlArray[urlArray.length - 2];

        await expect(page.getByLabel('no limit')).toBeChecked({ timeout: 2000});
    });

    test('create election with email list', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Create Election' }).click();
        await page.getByLabel('Election', { exact: true }).click();
         await page.getByRole('textbox', { name: 'Title'}).fill('Playwright Test Poll');
        //wait until there is only one continue button
        while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
        continue
        }
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByLabel('Yes').click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByRole('button', { name: 'Email List' }).click();
        // await page.pause();
        await expect(page.getByText('draft')).toBeVisible({ timeout: 2000 });
        const url = await page.url();
        const urlArray = url.split('/');
        electionId = urlArray[urlArray.length - 2];
        await page.getByRole('link', { name: 'Voters' }).click();
        await page.waitForURL(`**/${electionId}/admin/voters`)
        await page.getByRole('button', { name: 'Add Voters' }).click();
    });

    test('create election with ID List', async ({ page }) => {
            await page.goto('/');
        await page.getByRole('link', { name: 'Create Election' }).click();
        await page.getByLabel('Election', { exact: true }).click();
         await page.getByRole('textbox', { name: 'Title'}).fill('Playwright Test Poll');
        //wait until there is only one continue button
        while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
        continue
        }
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByLabel('Yes').click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByText('ID List').click();
        await expect(page.getByText('draft')).toBeVisible({ timeout: 2000 });
        const url = await page.url();
        const urlArray = url.split('/');
        electionId = urlArray[urlArray.length - 2];
        await page.getByRole('link', { name: 'Voters' }).click();


    });

    test('create election with one per device', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Create Election' }).click();
        await page.getByLabel('Election', { exact: true }).click();
         await page.getByRole('textbox', { name: 'Title'}).fill('Playwright Test Poll');
        //wait until there is only one continue button
        while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
        continue
        }
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByLabel('No').click();
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.getByText('one person, one vote').click();
        await expect(page.getByText('draft')).toBeVisible({ timeout: 2000 });
        const url = await page.url();
        const urlArray = url.split('/');
        electionId = urlArray[urlArray.length - 2];

        await expect(page.getByLabel('device')).toBeChecked({ timeout: 2000});
    });

    test('create election with whitespace title', async ({ page }) => {
        await page.goto('/');
        await page.getByRole('link', { name: 'Create Election' }).click();
        await page.getByLabel('Election', { exact: true }).click();
        await page.getByRole('textbox', { name: 'Title'}).fill(' ');
        await expect(page.getByRole('button', { name: 'Continue' }).first()).toBeDisabled({ timeout: 2000});
    });

    test.afterEach(async ({ page }) => {
        //delete election when finished
        if (electionId) {
        await page.request.delete(`${API_BASE_URL}/election/${electionId}`);
        console.log(`deleted election: ${electionId}`);
        }
    });
});