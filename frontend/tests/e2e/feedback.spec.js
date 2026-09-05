import { expect, test } from '@playwright/test'

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
