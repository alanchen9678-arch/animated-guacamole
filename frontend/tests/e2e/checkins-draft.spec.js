import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.sessionStorage.setItem('dawn-harbor_token', 'checkin-draft-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'checkins')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 42,
      username: 'draft-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.route('**/api/checkins/', (route) => route.fulfill({
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
  }))
})

test('unfinished weekly check-in restores its answers and position after reload', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('Due this week', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Start weekly check-in/ }).click()
  await expect(page.locator('.ci-intro-badge')).toHaveCount(0)
  await expect(page.getByText('Weekly', { exact: true })).toHaveCount(0)
  await expect(page.getByText('One-time', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /Begin/ }).click()
  await expect(page.getByText('Question 1 of 12')).toBeVisible()

  const progress = page.getByRole('progressbar', { name: 'Check-in progress' })
  await expect(progress).toHaveAttribute('aria-valuemin', '1')
  await expect(progress).toHaveAttribute('aria-valuemax', '12')
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(page.getByRole('radiogroup')).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(7)
  await expect(page.locator('.ci-question-text')).toBeFocused()

  await page.getByRole('radio', { name: '7: Strongly Agree' }).click()
  await expect(page.getByText('Question 2 of 12')).toBeVisible()
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await expect(page.locator('.ci-question-text')).toBeFocused()

  const savedDraft = await page.evaluate(() => (
    JSON.parse(window.sessionStorage.getItem('dawn-harbor.checkin.draft.v1:42'))
  ))
  expect(savedDraft.questionIds).toHaveLength(12)
  expect(Object.keys(savedDraft.answers)).toHaveLength(1)
  expect(savedDraft.currentIndex).toBe(1)

  await page.reload()

  await expect(page.getByText('Your unfinished check-in was restored.')).toBeVisible()
  await expect(page.getByText('Question 2 of 12')).toBeVisible()
  await page.getByRole('button', { name: /Back/ }).click()
  await expect(page.getByText('Question 1 of 12')).toBeVisible()
  await expect(page.locator('.ci-scale-btn--on')).toHaveText('7')
})
