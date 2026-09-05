import { expect, test } from '@playwright/test'

const user = {
  id: 52,
  username: 'type-user',
  firstName: 'Avery',
  displayName: 'Avery',
  mood: 'calm',
  streak: 2,
  checkInDueThisWeek: false,
  hasInitialAssessment: true,
  personality: {},
  needsProfile: { overall_score: 42, concern_scores: {} },
}

test('dashboard pages share the home typography hierarchy and secondary color', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'typography-token')
    window.localStorage.setItem('aurora.activePage', 'settings')
    window.localStorage.setItem('aurora.journal.daily-prompt', new Date().toISOString().slice(0, 10))
  })
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url())
    let body = {}
    if (url.pathname === '/api/auth/me/') body = user
    if (url.pathname === '/api/journal/') body = []
    if (url.pathname === '/api/journal/privacy/') {
      body = { shareWithTherapist: false }
    }
    if (url.pathname === '/api/checkins/') body = []
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.goto('/')

  const settingsTitle = page.getByRole('heading', { name: 'Settings' })
  await expect(settingsTitle).toHaveCSS('font-size', '32px')
  await expect(settingsTitle).toHaveCSS('font-weight', '650')
  await expect(page.getByRole('heading', { name: 'Profile' })).toHaveCSS('font-size', '16px')
  await expect(page.getByRole('heading', { name: 'Profile' })).toHaveCSS('font-weight', '600')
  await expect(page.getByText('Manage your account, profile, and mood.')).toHaveCSS('color', 'rgb(91, 96, 92)')

  await page.getByRole('button', { name: 'Journal', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Thought Journal' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Thought Journal' })).toHaveCSS('font-weight', '650')

  await page.getByRole('button', { name: 'Info Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toHaveCSS('font-weight', '650')
  await expect(page.locator('.il-card-title').first()).toHaveCSS('font-weight', '600')
  await expect(page.locator('.il-page-sub')).toHaveCSS('color', 'rgb(91, 96, 92)')

  await page.getByRole('button', { name: 'Chatbot', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your 24/7 Mental Wellness Companion' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Your 24/7 Mental Wellness Companion' })).toHaveCSS('font-weight', '650')
  await expect(page.locator('.highlight-card strong').first()).toHaveCSS('font-size', '16px')
  await expect(page.locator('.highlight-card strong').first()).toHaveCSS('font-weight', '600')
  await expect(page.locator('.intro-body')).toHaveCSS('color', 'rgb(91, 96, 92)')

  await page.getByRole('button', { name: 'Check-Ins', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check-Ins' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Check-Ins' })).toHaveCSS('font-weight', '650')
})
