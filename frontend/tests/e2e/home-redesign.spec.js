import { expect, test } from '@playwright/test'

test('home uses one daily prompt and an editorial two-column tool layout', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-03T12:00:00-05:00') })
  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'home-redesign-token')
    window.localStorage.setItem('aurora.activePage', 'home')
    window.localStorage.setItem('aurora.journal.daily-prompt', '2026-09-03')
  })
  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 31,
      username: 'home-user',
      firstName: 'Avery',
      displayName: 'Avery',
      mood: 'calm',
      streak: 4,
      checkInDueThisWeek: false,
      hasInitialAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.goto('/')

  const dashboardSurround = page.locator('.app-root--dashboard')
  await expect(dashboardSurround).toHaveCSS('background-color', 'rgb(214, 226, 216)')
  await expect(dashboardSurround).toHaveCSS('background-blend-mode', 'soft-light')
  expect(await dashboardSurround.evaluate((element) => (
    getComputedStyle(element).backgroundImage
  ))).toContain('data:image/svg+xml')
  await expect(page.locator('.frame')).toHaveCSS('background-color', 'rgb(250, 244, 232)')
  const promptCard = page.locator('.prompts-card')
  const prompt = page.locator('.daily-prompt-text')
  await expect(prompt).toHaveCount(1)
  await expect(promptCard).not.toContainText('Refreshes daily')
  const firstPrompt = await prompt.textContent()

  await expect(promptCard).toHaveCSS('background-image', 'none')
  await expect(promptCard).toHaveCSS('background-color', 'rgb(253, 250, 243)')
  await expect(page.locator('.home-greeting')).toHaveCSS('font-size', '32px')
  await expect(page.locator('.home-section-title')).toHaveCSS('font-size', '14px')
  await expect(page.locator('.feature-card h4').first()).toHaveCSS('font-size', '16px')
  await expect(page.locator('.feature-card p').first()).toHaveCSS('font-size', '14px')
  await expect(page.getByText('Support for reflection, connection, and care')).toHaveCount(0)
  await expect(page.locator('.feature-card p').first()).toHaveCSS('color', 'rgb(91, 96, 92)')
  await expect(page.locator('.feature-card')).toHaveCount(6)

  const columnCount = await page.locator('.feature-grid').evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ))
  expect(columnCount).toBe(2)
  await expect(page.getByRole('button', { name: 'Open AI Chatbot' })).toContainText('Open chatbot')
  await expect(page.getByRole('button', { name: 'Open Check-Ins' })).toContainText('View check-ins')

  await page.clock.setFixedTime(new Date('2026-09-04T12:00:00-05:00'))
  await page.evaluate(() => {
    window.localStorage.setItem('aurora.journal.daily-prompt', '2026-09-04')
  })
  await page.reload()

  await expect(prompt).toHaveCount(1)
  await expect(prompt).not.toHaveText(firstPrompt)
})
