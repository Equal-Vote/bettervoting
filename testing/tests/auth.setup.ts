import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/auth/user.json');

setup('log in', async ({ page }) => {
    await page.goto('/');

    // find SIGN IN button and click it
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    console.log('clicked SIGN IN button');

    // find username input and fill it
    await page.fill('input[name="username"]', 'PlayWrightTest');
    console.log('filled username');

    // find password input and fill it
    await page.fill('input[name="password"]', 'test');
    console.log('filled password');

    // find Sign In button and click it
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // check if "Hello, Test" button is visible
    await expect(page.getByRole('button', { name: 'Hello, Test' })).toBeVisible();

    // save the user data to a file
    await page.context().storageState({ path: authFile });


});