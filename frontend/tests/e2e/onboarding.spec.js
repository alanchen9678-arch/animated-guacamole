import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('dawn-harbor_token')
    window.sessionStorage.removeItem('dawn-harbor_token')
  })
})

test('logged-out onboarding shows key content', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /your calm, everyday mental wellness companion\./i })).toBeVisible()
  await expect(page.locator('.landing-hero').getByRole('button', { name: 'Get started free' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Support for the way you feel, reflect, and connect.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'AI Chatbot', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Check-Ins', exact: true })).toBeVisible()
  await expect(page.locator('.feature-story')).toHaveCount(6)

  const featureVignettes = page.locator('.feature-vignette')
  await featureVignettes.last().scrollIntoViewIfNeeded()
  await expect(featureVignettes).toHaveCount(6)
  await expect(page.locator('.feature-story-visual[aria-label]')).toHaveCount(6)
  await expect(page.locator('.feature-story-visual img')).toHaveCount(0)
  await expect(page.locator('.landing-endcap').getByRole('button', { name: 'Get started free' })).toBeVisible()
})

test('feature stories keep their desktop rhythm and collapse safely on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')

  const desktopLayout = await page.locator('.feature-story').evaluateAll((stories) => stories.slice(0, 3).map((story) => {
    const copy = story.querySelector('.feature-story-copy').getBoundingClientRect()
    const visual = story.querySelector('.feature-story-visual').getBoundingClientRect()
    return { copyX: copy.x, copyWidth: copy.width, visualX: visual.x, visualWidth: visual.width }
  }))

  expect(desktopLayout[0].copyX).toBeLessThan(desktopLayout[0].visualX)
  expect(desktopLayout[1].visualX).toBeLessThan(desktopLayout[1].copyX)
  expect(desktopLayout[2].visualWidth).toBeGreaterThan(desktopLayout[2].copyWidth)

  const journalDimensions = await page.locator('.feature-story-visual--journal').evaluate((visual) => {
    const bounds = visual.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  })
  expect(journalDimensions.width / journalDimensions.height).toBeGreaterThan(2.5)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.locator('.feature-story').last().scrollIntoViewIfNeeded()

  const mobileAudit = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    transforms: [...document.querySelectorAll('.feature-story-copy')].map((element) => getComputedStyle(element).transform),
    opacity: [...document.querySelectorAll('.feature-story-copy')].map((element) => getComputedStyle(element).opacity),
  }))

  expect(mobileAudit.overflow).toBeLessThanOrEqual(1)
  expect(mobileAudit.transforms.every((value) => value === 'none')).toBe(true)
  expect(mobileAudit.opacity.every((value) => value === '1')).toBe(true)
})

test('log in button opens the auth dialog in login mode', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Log in' }).click()

  const authCard = page.locator('.auth-card')

  await expect(authCard.getByRole('tab', { name: 'Log in', exact: true })).toBeVisible()
  await expect(authCard.getByRole('tab', { name: 'Sign up', exact: true })).toBeVisible()
  await expect(authCard.locator('input[name="username"]')).toBeVisible()
  await expect(authCard.locator('input[name="password"]')).toBeVisible()
})

test('closing get started free opens the auth dialog in signup mode', async ({ page }) => {
  await page.goto('/')

  await page.locator('.landing-endcap').getByRole('button', { name: 'Get started free' }).click()

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
    window.sessionStorage.setItem('dawn-harbor_token', 'restored-test-token')
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

  await expect(page.getByText('Loading Dawn Harbor…', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started free' })).toBeHidden()
  releaseProfile()
  await expect(page.getByRole('heading', { name: /Avery\./ })).toBeVisible()
})
