import { test, expect } from '@playwright/test';

async function isVisible(locator: import('@playwright/test').Locator) {
  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
}

async function ensureHostRoom(page: import('@playwright/test').Page) {
  const pinLabel = page.getByText('PIN de sala');
  const createRoomButton = page.getByRole('button', { name: 'Crear sala' });

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
  const joinHeading = page.getByText('Unirse a sala');
  const signUpToggle = page.getByRole('button', { name: '¿No tenés cuenta? Creala' });

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
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // Some auth providers auto-sign-in after sign-up.
  if (await isVisible(joinHeading)) {
    return;
  }

  await page.getByRole('button', { name: '¿Ya tenés cuenta? Ingresá' }).click();
  await page.fill('input[placeholder="player@example.com"]', uniqueEmail);
  await page.fill('input[placeholder="••••••••"]', password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(joinHeading).toBeVisible({ timeout: 15000 });
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
}

test.describe('Room creation, join, and action flow', () => {
  test.setTimeout(60000);

  test('Host creates room, Controller joins and rolls dice', async ({ browser }) => {
    const hostContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });

    const hostPage = await hostContext.newPage();
    const controllerPage = await hostContext.newPage();

    // 1. Host creates room
    await hostPage.goto('/');
    await hostPage.getByRole('link', { name: 'Crear una sala' }).click();
    
    await ensureHostRoom(hostPage);
    
    // Extract PIN. The PIN is inside a text-5xl div.
    const pinElement = hostPage.locator('.text-5xl.font-mono');
    const pin = (await pinElement.textContent())?.trim();
    expect(pin).toHaveLength(4);

    // 2. Controller joins
    await controllerPage.goto('/');
    await controllerPage.evaluate(() => window.localStorage.removeItem('dicewaton-game-store'));
    await controllerPage.reload();
    await controllerPage.getByRole('link', { name: 'Unirse como jugador' }).click();

    await ensureControllerAuthenticated(controllerPage);
    
    await controllerPage.locator('input[placeholder="Tu nombre"]').fill('Ender');
    await controllerPage.locator('input[placeholder="Ingresá el PIN de 4 caracteres"]').fill(pin || '');
    await controllerPage.getByRole('button', { name: 'Unirse a la sala' }).click();

    // Wait for join success (waiting for context UI)
    await expect(controllerPage.getByText('Conectado a la sala')).toBeVisible({ timeout: 10000 });

    // Verify host sees the player before navigation resilience checks.
    await expect(hostPage.getByText('Ender')).toBeVisible({ timeout: 10000 });

    // 3. Host changes context to COMBAT
    await hostPage.click('text=Combate');

    // Verify controller sees combat context
    await expect(controllerPage.getByText('COMBAT')).toBeVisible();

    // 4. Controller performs an action (rolls dice)
    await controllerPage.click('button:has-text("d20")');

    // Check if DiceLog on host shows the roll before resilience navigation.
    await expect(hostPage.getByText(/Ender.*(tiró|rolled) d20/)).toBeVisible({ timeout: 10000 });

    await controllerPage.reload();
    await expect(controllerPage.getByText('Conectado a la sala')).toBeVisible({ timeout: 10000 });

    await controllerPage.goBack();
    await expect(controllerPage.getByRole('link', { name: 'Crear una sala' })).toBeVisible({ timeout: 10000 });

    await controllerPage.goForward();
    await expect(controllerPage.getByText('Conectado a la sala')).toBeVisible({ timeout: 10000 });
     
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
    await page.getByRole('link', { name: 'Unirse como jugador' }).click();

    await ensureControllerAuthenticated(page);

    await page.locator('input[placeholder="Tu nombre"]').fill('Ender');
    await page.locator('input[placeholder="Ingresá el PIN de 4 caracteres"]').fill('ZZZZ');
    await page.getByRole('button', { name: 'Unirse a la sala' }).click();

    await expect(page.getByText('No pudimos unirte a la sala')).toBeVisible();
    await expect(page.getByText('No encontramos una sala con ese PIN.')).toBeVisible();

    await context.close();
  });

  test('keeps primary flows readable across mobile, tablet, and desktop viewports', async ({ browser }) => {
    const viewports = [
      { name: 'mobile', width: 390, height: 844 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173', viewport });
      const page = await context.newPage();

      await page.goto('/');
      await expect(page.getByRole('link', { name: 'Crear una sala' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Unirse como jugador' })).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Host a Game');
      await expect(page.locator('body')).not.toContainText('Join as Player');
      await expectNoHorizontalOverflow(page);

      await page.getByRole('link', { name: 'Crear una sala' }).click();
      await ensureHostRoom(page);
      await expect(page.getByText('Esperando que se unan jugadores...')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Combate' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await page.evaluate(() => window.localStorage.removeItem('dicewaton-game-store'));
      await page.goto('/controller');
      await page.reload();
      await ensureControllerAuthenticated(page);
      await expect(page.getByRole('button', { name: 'Unirse a la sala' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      await context.close();
    }
  });
});
