import { test, expect } from '@playwright/test';

test.describe('Room creation, join, and action flow', () => {
  test('Host creates room, Controller joins and rolls dice', async ({ browser }) => {
    // Use one context so the e2e fake backend state is shared.
    const hostContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const controllerPage = await hostContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/host');
    
    await hostPage.click('text=Create Room');
    
    // Wait for room to be created and PIN to appear
    await expect(hostPage.getByText('Room PIN')).toBeVisible({ timeout: 10000 });
    
    // Extract PIN. The PIN is inside a text-5xl div.
    const pinElement = hostPage.locator('.text-5xl.font-mono');
    const pin = (await pinElement.textContent())?.trim();
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
    await expect(controllerPage.getByText('Connected to Room')).toBeVisible({ timeout: 10000 });
    
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
  });
});

test.describe('PWA baseline', () => {
  test('manifest exposes installability baseline fields', async ({ page }) => {
    const response = await page.request.get('/manifest.webmanifest');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBe('DiceWaton');
    expect(manifest.short_name).toBe('DiceWaton');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#312e81');
    expect(manifest.background_color).toBe('#020617');
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
  });

  test('index metadata exposes PWA hooks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="manifest"][href="/manifest.webmanifest"]')).toHaveCount(1);
    await expect(page.locator('meta[name="theme-color"][content="#312e81"]')).toHaveCount(1);
    await expect(page.locator('meta[name="application-name"][content="DiceWaton"]')).toHaveCount(1);
  });
});
