import { test, expect } from '@playwright/test';
import fs from 'fs';

// The "Print paper ballots" button compiles STAR ballots to a PDF in the browser with the
// Typst templates from the bettervoting-typst submodule. The sandbox page needs no login.
test.describe('Print paper ballots', () => {
    test('Sandbox downloads a PDF with one page per copy', async ({ page }) => {
        await page.goto('/sandbox');
        await page.locator('#candidates').fill('Alice, Bob, Carol');
        await page.getByRole('button', { name: 'Print paper ballots' }).click();
        await page.getByLabel('Number of copies').fill('3');

        const [download] = await Promise.all([
            // The first PDF loads the ~25 MB Typst compiler, so allow time for that.
            page.waitForEvent('download', { timeout: 120_000 }),
            page.getByRole('button', { name: 'Download PDF' }).click(),
        ]);
        expect(download.suggestedFilename()).toBe('sandbox-ballots.pdf');

        const pdf = fs.readFileSync(await download.path());
        expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
        const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? [];
        expect(pages).toHaveLength(3);
    });

    test('Build Ballot offers it on a STAR race', async ({ page }) => {
        // Same steps as create-election.spec.ts "Poll, Single Race, Customize in editor".
        await page.goto('/');
        await page.getByRole('button', { name: 'Create Election' }).click();
        await page.getByRole('radio', { name: 'Poll' }).check();
        await page.getByRole('radio', { name: 'Just one' }).check();
        await page.getByRole('textbox', { name: 'Question Title' }).fill('Paper Ballot Poll');
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
        await expect(page).toHaveURL(/\/admin\/build_ballot/, { timeout: 5000 });
        const electionId = page.url().split('/').at(-3);

        await page.getByRole('button', { name: 'Print paper ballots' }).click();
        await page.getByLabel('Number of copies').fill('2');
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 120_000 }),
            page.getByRole('button', { name: 'Download PDF' }).click(),
        ]);
        expect(download.suggestedFilename()).toMatch(new RegExp(`^${electionId}-.+-ballots\\.pdf$`));
        const pages = fs.readFileSync(await download.path()).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? [];
        expect(pages).toHaveLength(2);
    });

    test('The button only shows for STAR', async ({ page }) => {
        await page.goto('/sandbox');
        await expect(page.getByRole('button', { name: 'Print paper ballots' })).toBeVisible();
        await page.getByRole('combobox').click();
        await page.getByRole('option', { name: 'Approval' }).click();
        await expect(page.getByRole('button', { name: 'Print paper ballots' })).toHaveCount(0);
    });
});
