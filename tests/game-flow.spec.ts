import { test, expect } from '@playwright/test';

async function isVisible(locator: import('@playwright/test').Locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function ensureHostRoom(page: import('@playwright/test').Page) {
  const pinLabel = page.getByText(/PIN de sala|Room PIN/);
  const createRoomButton = page.getByRole('button', { name: /Crear sala|Create Room/ });

  await expect
    .poll(async () => (await isVisible(pinLabel)) || (await isVisible(createRoomButton)), {
      timeout: 15000,
      message: 'Host view did not render room controls in time'
    })
    .toBeTruthy();

  if (await isVisible(pinLabel)) {
    return;
  }

  await createRoomButton.click();
  await expect(pinLabel).toBeVisible({ timeout: 15000 });
}

async function ensureControllerAuthenticated(page: import('@playwright/test').Page) {
  const joinHeading = page.getByText(/Unirse a sala|Join Game/);
  const signUpToggle = page.getByRole('button', { name: /¿No tenés cuenta\? Creala|Don't have an account\? Sign up/ });

  await expect
    .poll(async () => (await isVisible(joinHeading)) || (await isVisible(signUpToggle)), {
      timeout: 15000,
      message: 'Controller auth/join view did not render in time'
    })
    .toBeTruthy();

  if (await isVisible(joinHeading)) {
    return;
  }

  const uniqueEmail = `dicewaton-e2e-${Date.now()}@example.com`;
  const password = 'Password123!';

  await signUpToggle.click();
  await page.fill('input[placeholder="player@example.com"]', uniqueEmail);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.getByRole('button', { name: /Crear cuenta|Sign Up/ }).click();

  // Some auth providers auto-sign-in after sign-up.
  if (await isVisible(joinHeading)) {
    return;
  }

  await page.getByRole('button', { name: /¿Ya tenés cuenta\? Ingresá|Already have an account\? Sign in/ }).click();
  await page.fill('input[placeholder="player@example.com"]', uniqueEmail);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.getByRole('button', { name: /Ingresar|Sign In/ }).click();

  await expect(joinHeading).toBeVisible({ timeout: 15000 });
}

test.describe('Room creation, join, and action flow', () => {
  test.setTimeout(60000);

  test('Host creates room, Controller joins and rolls dice', async ({ browser }) => {
    const hostContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });

    const hostPage = await hostContext.newPage();
    const controllerPage = await hostContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.getByRole('link', { name: /Host a Game/i }).click();
    
    await ensureHostRoom(hostPage);
    
    // Extract PIN. The PIN is inside a text-5xl div.
    const pinElement = hostPage.locator('.text-5xl.font-mono');
    const pin = (await pinElement.textContent())?.trim();
    expect(pin).toHaveLength(4);

    // 2. Controller joins
    await controllerPage.goto('/');
    await controllerPage.evaluate(() => window.localStorage.removeItem('dicewaton-game-store'));
    await controllerPage.reload();
    await controllerPage.getByRole('link', { name: /Join as Player/i }).click();

    await ensureControllerAuthenticated(controllerPage);
    
    await controllerPage.locator('input[placeholder="Tu nombre"], input[placeholder="Your Name"]').fill('Ender');
    await controllerPage.locator('input[placeholder="Ingresá el PIN de 4 caracteres"], input[placeholder="Enter 4-char PIN"]').fill(pin || '');
    await controllerPage.getByRole('button', { name: /Unirse a la sala|Join Room/ }).click();

    // Wait for join success (waiting for context UI)
    await expect(controllerPage.getByText(/Conectado a la sala|Connected to Room/)).toBeVisible({ timeout: 10000 });
    
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
    await expect(hostPage.getByText(/Ender.*(tiró|rolled) d20/)).toBeVisible({ timeout: 10000 });
    
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

test.describe('UX quality gates', () => {
  test.setTimeout(60000);

  test('shows visible validation feedback on join failure (no silent errors)', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
    const page = await context.newPage();

    await page.goto('/');
    await page.getByRole('link', { name: /Join as Player/i }).click();

    await ensureControllerAuthenticated(page);

    await page.locator('input[placeholder="Tu nombre"], input[placeholder="Your Name"]').fill('Ender');
    await page.locator('input[placeholder="Ingresá el PIN de 4 caracteres"], input[placeholder="Enter 4-char PIN"]').fill('ZZZZ');
    await page.getByRole('button', { name: /Unirse a la sala|Join Room/ }).click();

    await expect(page.getByText('No pudimos unirte a la sala')).toBeVisible();
    await expect(page.getByText('Room not found')).toBeVisible();

    await context.close();
  });
});
