import {  API_BASE_URL } from './helperfunctions';
import { test, expect } from '@playwright/test';

let electionId = '';
test.describe('Create Election', () => {
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

    test('create poll: Favorite Fruit', async ({ page }) => {
        await page.goto('/', { waitUntil: 'networkidle' });
        // Click the Create Election link or New Election button depending on UI state
        const createLink = page.getByRole('link', { name: 'Create Election' });
        const newButton = page.getByRole('button', { name: 'New Election' });
        if ((await createLink.count()) > 0) {
            await createLink.click();
        } else if ((await newButton.count()) > 0) {
            await newButton.click();
        } else {
            // fallback: try a text click
            await page.click('text=Create Election', { timeout: 10000 });
        }
        await page.getByLabel('Poll', { exact: true }).waitFor({ state: 'visible', timeout: 5000 });
        await page.getByLabel('Poll', { exact: true }).click();
        // click the first Continue to reach title input, then fill title
        const firstContinue = page.getByRole('button', { name: 'Continue' }).first();
        if ((await firstContinue.count()) > 0) {
            await firstContinue.click().catch(() => {});
        }
        await page.fill('input[name="election-title"]', 'Favorite Fruit').catch(() => {});
        await page.getByRole('textbox', { name: 'Title' }).fill('Favorite Fruit').catch(() => {});
        await page.fill('#election-title', 'Favorite Fruit').catch(() => {});
        // trigger blur/validation
        await page.keyboard.press('Tab');
         //wait until there is only one continue button
         while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
             await page.waitForTimeout(100);
         }
        // find the enabled Continue button among any duplicates and click it
        const enabledIndex = await page.getByRole('button', { name: 'Continue' }).evaluateAll((els) => {
            for (let i = 0; i < els.length; i++) {
                if (!els[i].hasAttribute('disabled') && !els[i].className.includes('Mui-disabled')) return i;
            }
            return -1;
        });
        if (enabledIndex >= 0) {
            await page.getByRole('button', { name: 'Continue' }).nth(enabledIndex).click();
        } else {
            // fallback: wait until first Continue is enabled
            const continueBtn = page.getByRole('button', { name: 'Continue' }).first();
            await expect(continueBtn).toBeEnabled({ timeout: 20000 });
            await continueBtn.click();
        }
        // choose not restricted voters
        await page.getByLabel('No').waitFor({ state: 'visible', timeout: 5000 });
        await page.getByLabel('No').click();
        await page.getByRole('button', { name: 'Continue' }).click();

        // add a single question (race) and set voting method to STAR
        await page.getByRole('button', { name: 'Edit Election Details' }).waitFor({ state: 'visible', timeout: 5000 });
        await page.getByRole('button', { name: 'Edit Election Details' }).click();
        await page.getByRole('button', { name: 'Add' }).click();
        const raceDialog = page.getByRole('dialog', { name: 'Edit Race' });

        await raceDialog.getByRole('textbox', { name: 'Title' }).fill('Favorite Fruit');
        await raceDialog.getByRole('button', { name: 'Voting Method' }).click();
        await raceDialog.getByRole('radio', { name: 'STAR Voting' }).click();

        // fill candidate/options
        await raceDialog.getByRole('textbox', { name: 'Candidate 1 Name' }).fill('Strawberry');
        await raceDialog.getByRole('textbox', { name: 'Candidate 2 Name' }).fill('Banana');
        // ensure candidate 3 exists, if not add one
        const cand3 = raceDialog.getByRole('textbox', { name: 'Candidate 3 Name' });
        if ((await cand3.count()) === 0) {
            // dialog may use 'Add Candidate' or just 'Add' inside the dialog
            await raceDialog.getByRole('button', { name: 'Add Candidate' }).click().catch(async () => {
                await raceDialog.getByRole('button', { name: 'Add' }).click();
            });
        }
        await raceDialog.getByRole('textbox', { name: 'Candidate 3 Name' }).fill('Pear');

        await raceDialog.getByRole('button', { name: 'Save' }).click();

        // proceed to publish: Next -> Publish Now
        await page.getByRole('button', { name: 'Next' }).waitFor({ state: 'visible', timeout: 5000 });
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByRole('button', { name: 'Publish Now' }).waitFor({ state: 'visible', timeout: 5000 });
        await page.getByRole('button', { name: 'Publish Now' }).click();

        // verify the Vote button/link is visible
        await expect(page.getByRole('link', { name: 'Vote', exact: true })).toBeVisible({ timeout: 5000 });

        // capture election id for cleanup
        const url = await page.url();
        const urlArray = url.split('/');
        electionId = urlArray[urlArray.length - 2];
    });

    test.afterEach(async ({ page }) => {
        //delete election when finished
        if (electionId) {
        await page.request.delete(`${API_BASE_URL}/election/${electionId}`);
        console.log(`deleted election: ${electionId}`);
        }
    });
});