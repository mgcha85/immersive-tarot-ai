import { test, expect } from '@playwright/test';

test('Immersive Tarot - Basic Flow', async ({ page }) => {
    // 1. Visit the app
    await page.goto('http://localhost:5173');

    // 2. Check title or UI
    await expect(page.locator('h1')).toContainText('Immersive Tarot');

    // 3. User types a query
    const input = page.locator('input[type="text"]');
    await input.fill('Will I finish this project today?');

    // 4. Click Ask
    await page.getByRole('button', { name: 'Ask' }).click();

    // 5. Check loading state (button might change)
    // await expect(page.getByRole('button')).toContainText('...');

    // 6. Wait for response (cards list)
    // The 'Oracle's Selection' header should appear
    await expect(page.getByText("Oracle's Selection:")).toBeVisible({ timeout: 10000 });

    // 7. Verify we have 3 cards in the list
    const listItems = page.locator('ul li');
    await expect(listItems).toHaveCount(3);

    // 8. Verify interpretation text (mock AI)
    // Currently strictly checking cards, but we can check if console log happened or network request
});
