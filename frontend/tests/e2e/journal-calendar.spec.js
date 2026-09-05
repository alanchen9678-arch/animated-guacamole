import { expect, test } from '@playwright/test'

test('journal calendar keeps navigation fixed and uses smooth month transitions', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'journal-calendar-token')
    window.localStorage.setItem('aurora.activePage', 'journal')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 31,
      username: 'journal-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.route('**/api/journal/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ entries: [] }),
  }))

  await page.goto('/')
  await page.getByRole('button', { name: 'View calendar' }).click()

  const modal = page.getByRole('dialog', { name: 'Journal calendar' })
  const previous = modal.getByRole('button', { name: 'Previous month' })
  const next = modal.getByRole('button', { name: 'Next month' })
  const grid = modal.locator('.jn-cal-grid')

  await expect(modal).toHaveCSS('animation-name', 'jn-calendar-modal-in')
  await expect(grid.locator(':scope > *')).toHaveCount(42)
  await modal.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })

  const previousBefore = await previous.boundingBox()
  const nextBefore = await next.boundingBox()
  const gridBefore = await grid.boundingBox()

  await next.click()
  await expect(grid).toHaveClass(/jn-cal-grid--forward/)
  await expect(grid.locator(':scope > *')).toHaveCount(42)

  const previousAfter = await previous.boundingBox()
  const nextAfter = await next.boundingBox()
  const gridAfter = await grid.boundingBox()

  expect(Math.abs(previousAfter.x - previousBefore.x)).toBeLessThan(1)
  expect(Math.abs(nextAfter.x - nextBefore.x)).toBeLessThan(1)
  expect(Math.abs(gridAfter.height - gridBefore.height)).toBeLessThan(1)

  await previous.click()
  await expect(grid).toHaveClass(/jn-cal-grid--backward/)
})
