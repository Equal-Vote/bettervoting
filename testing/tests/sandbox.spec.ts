import { test, expect } from '@playwright/test';

// Issue #1117: the sandbox forwarded any number to the tabulator, which drops a
// ballot outside the method's range and counts it only as nOutOfBoundsVotes — so
// a typo'd 6 quietly produced results for a smaller election than the one typed.
test.describe('Sandbox score validation', () => {
    const enter = async (page, ballots: string) => {
        const votes = page.locator('#cvr');
        await votes.fill(ballots);
        await votes.blur();
        await page.getByRole('button', { name: 'Get Results' }).click();
    };

    // Results render into the right-hand panel; a winner headline is the cheapest
    // proof that the request actually went to the tabulator.
    const results = (page) => page.getByText(/wins!|Tied!/);

    test('rejects a STAR score above 5, and recovers when it is corrected', async ({ page }) => {
        await page.goto('/sandbox');
        await expect(page.locator('#cvr')).toBeVisible();

        await enter(page, '5,4,3,2,6');
        await expect(page.getByText('Use scores between 0 and 5')).toBeVisible();

        await enter(page, '5,4,3,2,1');
        await expect(page.getByText('Use scores between 0 and 5')).toHaveCount(0);
        await expect(results(page).first()).toBeVisible();
    });

    test('rejects a fractional score rather than truncating it', async ({ page }) => {
        // parseInt('2.5') is 2, so without a check the tabulated ballot is not
        // the ballot that was typed.
        await page.goto('/sandbox');
        await expect(page.locator('#cvr')).toBeVisible();

        await enter(page, '5,4,3,2,2.5');
        await expect(page.getByText('Scores must be whole numbers')).toBeVisible();
    });

    test('reports the bad score, not the blank line after it', async ({ page }) => {
        // A trailing newline parses as a zero-length ballot. Its "wrong length"
        // complaint must not displace the real one.
        await page.goto('/sandbox');
        await expect(page.locator('#cvr')).toBeVisible();

        await enter(page, '5,4,3,2,6\n');
        await expect(page.getByText('Use scores between 0 and 5')).toBeVisible();
    });

    test('does not reject a rank above 5 under a ranked method', async ({ page }) => {
        await page.goto('/sandbox');
        await expect(page.locator('#cvr')).toBeVisible();

        // MUI's Select takes its accessible name from the selected value, not
        // from the label above it, so target the one combobox on the page.
        await page.getByRole('combobox').first().click();
        await page.getByRole('option', { name: 'Ranked Choice Voting (IRV)' }).click();

        // Six candidates, so a sixth-place ranking is a legitimate mark. This is
        // the case a flat "nothing above 5" check would get wrong.
        const candidateField = page.locator('#candidates');
        await candidateField.fill('A,B,C,D,E,F');
        await candidateField.blur();
        await enter(page, '1,2,3,4,5,6\n2,1,3,4,5,6\n3,2,1,4,5,6');

        await expect(page.getByText('Use scores between 0 and')).toHaveCount(0);
        await expect(page.getByText('Each ballot must have the same length')).toHaveCount(0);
        // Positive assertion: the ranked ballots were counted, so the test cannot
        // pass merely because nothing rendered.
        await expect(results(page).first()).toBeVisible();
    });
});
