import { test, expect } from '@playwright/test';

test.describe('Room creation, join, and action flow', () => {
  test('Host creates room, Controller joins and rolls dice', async ({ browser }) => {
    // We need two distinct browser contexts to simulate two users
    const hostContext = await browser.newContext();
    const controllerContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const controllerPage = await controllerContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/host');
    
    await hostPage.click('text=Create Room');
    
    // Wait for room to be created and PIN to appear
    await expect(hostPage.getByText('Room PIN')).toBeVisible({ timeout: 10000 });
    
    // Extract PIN. The PIN is inside a text-5xl div.
    const pinElement = hostPage.locator('.text-5xl.font-mono');
    const pin = await pinElement.textContent();
    expect(pin).toHaveLength(4);

    // 2. Controller joins
    await controllerPage.goto('/controller');

    // Auth is now required in ControllerView.
    const uniqueEmail = `dicewaton-e2e-${Date.now()}@example.com`;
    const password = 'Password123!';

    await controllerPage.click('text=Don\'t have an account? Sign up');
    await controllerPage.fill('input[placeholder="player@example.com"]', uniqueEmail);
    await controllerPage.fill('input[placeholder="••••••••"]', password);
    await controllerPage.click('button:has-text("Sign Up")');

    // Try direct sign in after sign up in case email auto-confirm is enabled.
    await controllerPage.click('text=Already have an account? Sign in');
    await controllerPage.fill('input[placeholder="player@example.com"]', uniqueEmail);
    await controllerPage.fill('input[placeholder="••••••••"]', password);
    await controllerPage.click('button:has-text("Sign In")');

    await expect(controllerPage.getByText('Join Game')).toBeVisible({ timeout: 15000 });
    
    await controllerPage.fill('input[placeholder="Your Name"]', 'Ender');
    await controllerPage.fill('input[placeholder="Enter 4-char PIN"]', pin || '');
    await controllerPage.click('text=Join Room');

    // Wait for join success (waiting for context UI)
    await expect(controllerPage.getByText(pin || '')).toBeVisible({ timeout: 10000 });
    
    // Verify host sees the player
    await expect(hostPage.getByText('Ender')).toBeVisible();

    // 3. Host changes context to COMBAT
    await hostPage.click('text=Combat');

    // Verify controller sees combat context
    await expect(controllerPage.getByText('COMBAT')).toBeVisible();

    // 4. Controller performs an action (rolls dice)
    // Need to see what dice buttons are in DiceTray
    // Typically they are "d20" or "Roll d20"
    await controllerPage.click('button:has-text("d20")');
    
    // Check if DiceLog on host shows the roll
    await expect(hostPage.getByText(/Ender.*rolled d20/)).toBeVisible({ timeout: 10000 });
    
    await hostContext.close();
    await controllerContext.close();
  });
});
