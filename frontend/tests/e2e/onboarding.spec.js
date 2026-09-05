import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('aurora_token')
  })
})

test('logged-out onboarding shows key content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /your calm, always-on mental wellness companion\./i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started free' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  await expect(page.getByText('Everything included')).toBeVisible()
  await expect(page.getByText('AI Chatbot')).toBeVisible()
  await expect(page.getByText('Check-Ins')).toBeVisible()
})

test('log in button opens the auth dialog in login mode', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Log in' }).click()

  const authCard = page.locator('.auth-card')

  await expect(authCard.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible()
  await expect(authCard.getByRole('button', { name: 'Sign up', exact: true })).toBeVisible()
  await expect(authCard.locator('input[name="username"]')).toBeVisible()
  await expect(authCard.locator('input[name="password"]')).toBeVisible()
})

test('get started free opens the auth dialog in signup mode', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Get started free' }).click()

  const authCard = page.locator('.auth-card')

  await expect(authCard.getByRole('button', { name: 'Create account' })).toBeVisible()
  await expect(authCard.locator('input[name="firstName"]')).toBeVisible()
  await expect(authCard.locator('input[name="username"]')).toBeVisible()
  await expect(authCard.locator('input[name="confirm"]')).toBeVisible()
})

test('restored sessions show a loading state instead of flashing logged-out content', async ({ page }) => {
  let releaseProfile
  const profileGate = new Promise((resolve) => { releaseProfile = resolve })
  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'restored-test-token')
  })
  await page.route('**/api/auth/me/', async (route) => {
    await profileGate
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'restored-user',
        firstName: 'Avery',
        hasInitialAssessment: true,
        hasCurrentPersonalityAssessment: true,
        needsProfile: null,
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByText('Loading Aurora…', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started free' })).toBeHidden()
  releaseProfile()
  await expect(page.getByRole('heading', { name: /Avery\./ })).toBeVisible()
})
