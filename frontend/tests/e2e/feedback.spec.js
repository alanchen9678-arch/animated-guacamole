import { expect, test } from '@playwright/test'

test('shared loading content uses centered Aurora dots and respects reduced motion', async ({ page }) => {
  let releaseUserRequest
  const userGate = new Promise((resolve) => { releaseUserRequest = resolve })

  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'loading-state-test-token')
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/auth/me/', async (route) => {
    await userGate
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Session expired.' }),
    })
  })

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')

  const loadingState = page.getByRole('status')
  await expect(loadingState).toContainText('Loading Aurora')
  await expect(loadingState.locator('.feedback-loading__dot')).toHaveCount(3)
  await expect(loadingState.locator('.feedback-spinner')).toHaveCount(0)

  const checkAlignment = async () => {
    const alignment = await loadingState.evaluate((node) => {
      const label = node.querySelector('.feedback-loading__label').getBoundingClientRect()
      const dots = node.querySelector('.feedback-loading__dots').getBoundingClientRect()
      const dotTransforms = [...node.querySelectorAll('.feedback-loading__dot')]
        .map((dot) => getComputedStyle(dot).transform)

      return {
        direction: getComputedStyle(node).flexDirection,
        centerDelta: Math.abs((label.left + label.width / 2) - (dots.left + dots.width / 2)),
        dotTransforms,
      }
    })

    expect(alignment.direction).toBe('column')
    expect(alignment.centerDelta).toBeLessThan(1)
    expect(alignment.dotTransforms.every((transform) => (
      transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)'
    ))).toBe(true)
  }

  await checkAlignment()
  await page.setViewportSize({ width: 390, height: 844 })
  await checkAlignment()

  releaseUserRequest()
  await expect(loadingState).toBeHidden()
})

test('authentication uses a disabled pending button and shared error notice', async ({ page }) => {
  let releaseLogin
  const loginGate = new Promise((resolve) => { releaseLogin = resolve })

  await page.route('**/api/auth/login/', async (route) => {
    await loginGate
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Those credentials were not recognized.' }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Log in' }).click()

  const authCard = page.locator('.auth-card')
  await authCard.locator('input[name="username"]').fill('avery')
  await authCard.locator('input[name="password"]').fill('wrong-password')
  await authCard.locator('form').getByRole('button', { name: 'Log in', exact: true }).click()

  const pendingButton = authCard.getByRole('button', { name: 'Logging in…' })
  await expect(pendingButton).toBeDisabled()
  await expect(pendingButton).toHaveAttribute('aria-busy', 'true')

  releaseLogin()
  await expect(authCard.getByRole('alert')).toContainText('Unable to log in')
  await expect(authCard.getByRole('alert')).toContainText('Those credentials were not recognized.')
  await expect(authCard.locator('form').getByRole('button', { name: 'Log in', exact: true })).toBeEnabled()
})

test('failed check-in loading presents a working retry action', async ({ page }) => {
  let checkInRequests = 0

  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'feedback-test-token')
    window.localStorage.setItem('aurora.activePage', 'checkins')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 8,
      username: 'feedback-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.route('**/api/checkins/', (route) => {
    checkInRequests += 1
    // React's development Strict Mode mounts effects twice; both initial
    // requests must fail so only the explicit retry can recover.
    if (checkInRequests <= 2) {
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Check-ins are temporarily unavailable.' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        history: [{ id: 1, type: 'initial', date: '2026-08-01', qIds: [], scores: {} }],
        streak: 0,
        lastCheckInDate: '2026-08-01',
        dueThisWeek: true,
        hasInitialAssessment: true,
        hasCurrentPersonalityAssessment: true,
      }),
    })
  })

  await page.goto('/')

  const errorNotice = page.getByRole('alert')
  await expect(errorNotice).toContainText('Could not load your check-ins')
  await expect(errorNotice).toContainText('Check-ins are temporarily unavailable.')

  await errorNotice.getByRole('button', { name: 'Reload check-ins' }).click()
  await expect(errorNotice).toBeHidden()
  await expect(page.getByRole('button', { name: /Start weekly check-in/ })).toBeVisible()
  expect(checkInRequests).toBe(3)
})
