import { expect, test } from '@playwright/test'

const user = {
  id: 91,
  username: 'route-user',
  firstName: 'River',
  displayName: 'River',
  mood: 'calm',
  checkInDueThisWeek: false,
  hasInitialAssessment: true,
  hasCurrentPersonalityAssessment: true,
  needsProfile: { overall_score: 35, concern_scores: {} },
}

test('direct links, reload, Back, and Forward preserve app navigation', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
    window.sessionStorage.setItem('dawn-harbor_token', 'route-token')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  })

  await page.route('**/api/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    let body = {}
    if (pathname === '/api/auth/me/') body = user
    if (pathname === '/api/journal/') body = []
    if (pathname === '/api/journal/privacy/') body = { shareWithTherapist: false }
    if (pathname === '/api/checkins/') body = { history: [], streak: 0, dueThisWeek: false }
    if (pathname === '/api/peer/profile/') body = { isOnboarded: true }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.goto('/app/settings')
  await expect(page).toHaveURL(/\/app\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.getByRole('link', { name: 'Journal', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/journal$/)
  await expect(page.getByRole('heading', { name: 'Thought Journal' })).toBeVisible()

  await page.getByRole('tab', { name: 'Doodle' }).click()
  await expect(page).toHaveURL(/\/app\/journal$/)
  await expect(page.getByRole('tab', { name: 'Doodle' })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('link', { name: 'Info Library', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/library$/)
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toBeVisible()

  await page.getByRole('tab', { name: 'Quiz' }).click()
  await expect(page).toHaveURL(/\/app\/library\/quiz$/)
  await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveAttribute('aria-selected', 'true')

  await page.goBack()
  await expect(page).toHaveURL(/\/app\/library$/)
  await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')

  await page.goBack()
  await expect(page).toHaveURL(/\/app\/journal$/)

  await page.goBack()
  await expect(page).toHaveURL(/\/app\/settings$/)
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()

  await page.goForward()
  await expect(page).toHaveURL(/\/app\/journal$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/app\/library$/)
  await page.goForward()
  await expect(page).toHaveURL(/\/app\/library\/quiz$/)

  await page.reload()
  await expect(page).toHaveURL(/\/app\/library\/quiz$/)
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Quiz' })).toHaveAttribute('aria-selected', 'true')
})

test('transient workflow URLs are not directly addressable', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('dawn-harbor_token', 'route-token')
  })
  await page.route('**/api/auth/me/', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }))

  await page.goto('/app/check-ins/weekly/complete')

  await expect(page.getByRole('heading', { name: 'Page unavailable' })).toBeVisible()
  await expect(page.getByText('We couldn’t find that page. Return home to continue using Dawn Harbor.')).toBeVisible()
  await expect(page).toHaveTitle('Page not found | Dawn Harbor')
  await expect(page.locator('.nav-item.active')).toHaveCount(0)
  await expect(page.locator('.nav-item[aria-current="page"]')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)

  const returnHome = page.getByRole('button', { name: 'Return home' })
  const buttonBounds = await returnHome.boundingBox()
  expect(buttonBounds?.width).toBeLessThan(200)

  await returnHome.click()
  await expect(page).toHaveURL(new RegExp('/app/home$'))
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/ })).toBeVisible()
})
