import { type Page, expect, type BrowserContext } from '@playwright/test';
import { jwtDecode } from "jwt-decode";
export const createElection = async (
    page:Page, 
    electionOrPoll:'Election' | 'Poll', 
    title:string, restricted:boolean, 
    choseVoters: 'Email List' | 'ID List' | 'Allows multiple votes per device' | 'one person, one vote') => 
    {
    await page.goto('/');
    await page.getByRole('button', { name: 'New Election' }).click();
    await page.getByLabel(electionOrPoll, { exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.fill('input[name="election-title"]', title);
    //wait until there is only one continue button
    while ((await page.getByRole('button', { name: 'Continue' }).evaluateAll((el) => el)).length > 1) {
      continue
    }
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel(restricted ? 'No' : 'Yes').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText(choseVoters).click();
    await expect(page.getByText('draft')).toBeVisible();
    const url = await page.url();
    const urlArray = url.split('/');
    return urlArray[urlArray.length - 2];
  }

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
  throw new Error('FRONTEND_URL is not set');
}
export const API_BASE_URL = new URL('/API', frontendUrl).toString();

export const getSub = async ( context: BrowserContext ) => {
  const cookies = await context.cookies();
  const id_token = cookies.find((cookie) => cookie.name === 'id_token')?.value;
  if (!id_token) {
    throw new Error('id_token not found in cookies');
  }
  const idMap = jwtDecode(id_token);
  const sub = idMap['sub'];
  if (!sub) {
    throw new Error('sub not found in id_token');
  }
  return sub;
}
