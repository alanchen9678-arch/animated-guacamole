import { expect, test } from '@playwright/test'

async function openLibrary(page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'library-quiz-token')
    window.localStorage.setItem('aurora.activePage', 'library')
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
    Math.random = () => 0
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 44,
      username: 'quiz-user',
      firstName: 'Avery',
      displayName: 'Avery',
      mood: 'calm',
      streak: 2,
      checkInDueThisWeek: false,
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.goto('/')
}

test('quiz tabs, progress, feedback, and active round are accessible and persistent', async ({ page }) => {
  await openLibrary(page)

  const libraryTab = page.getByRole('tab', { name: 'Library' })
  const quizTab = page.getByRole('tab', { name: 'Quiz' })

  await expect(page.getByRole('tablist', { name: 'Information library sections' })).toBeVisible()
  await expect(libraryTab).toHaveAttribute('aria-selected', 'true')
  await libraryTab.focus()
  await libraryTab.press('End')
  await expect(quizTab).toBeFocused()
  await expect(quizTab).toHaveAttribute('aria-selected', 'true')
  await quizTab.press('ArrowLeft')
  await expect(libraryTab).toBeFocused()
  await libraryTab.press('ArrowRight')
  await expect(quizTab).toBeFocused()

  const quizWidthDelta = await page.locator('#il-panel-quiz').evaluate((panel) => (
    Math.abs(panel.getBoundingClientRect().width - panel.querySelector('.il-quiz').getBoundingClientRect().width)
  ))
  expect(quizWidthDelta).toBeLessThan(2)

  const progress = page.getByRole('progressbar', { name: 'Quiz progress' })
  await expect(progress).toHaveAttribute('aria-valuenow', '1')
  await expect(progress).toHaveAttribute('aria-valuetext', 'Question 1 of 8')
  const progressRatio = await progress.evaluate((track) => (
    track.querySelector('.il-progress-fill').getBoundingClientRect().width
    / track.getBoundingClientRect().width
  ))
  expect(progressRatio).toBeCloseTo(0.125, 2)

  await page.locator('.il-option').first().click()
  const feedback = page.getByRole('status')
  await expect(feedback).toBeVisible()
  await expect(page.locator('.il-feedback')).toBeFocused()
  const feedbackTitle = await feedback.locator('strong').innerText()

  await libraryTab.click()
  await quizTab.click()
  await expect(feedback.locator('strong')).toHaveText(feedbackTitle)

  await page.reload()
  await page.getByRole('tab', { name: 'Quiz' }).click()
  await expect(page.getByRole('status').locator('strong')).toHaveText(feedbackTitle)

  await page.locator('.il-next-btn').click()
  await expect(progress).toHaveAttribute('aria-valuenow', '2')
  await expect(page.locator('#il-quiz-question')).toBeFocused()
})

test('results use the editorial sage summary and divided answer comparisons', async ({ page }) => {
  await openLibrary(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('tab', { name: 'Quiz' }).click()

  for (let question = 0; question < 8; question += 1) {
    await page.locator('.il-option').first().click()
    await page.locator('.il-next-btn').click()
  }

  await expect(page.locator('.il-results-summary')).toBeVisible()
  await expect(page.locator('.il-results-score-ring')).toHaveCSS(
    'background-image',
    /conic-gradient\(rgb\(77, 107, 88\)/,
  )

  const missedRows = page.locator('.il-missed-card')
  await expect(missedRows.first()).toBeVisible()
  await expect(missedRows.first().getByText('Your answer')).toBeVisible()
  await expect(missedRows.first().getByText('Correct answer')).toBeVisible()
  await expect(missedRows.first()).toHaveCSS('border-left-style', 'none')
  await expect(page.locator('.il-missed-answer-row').first()).toHaveCSS('grid-template-columns', /.+/)
  const quizFitsPanel = await page.locator('#il-panel-quiz').evaluate((panel) => (
    panel.scrollWidth <= panel.clientWidth
  ))
  expect(quizFitsPanel).toBe(true)
})
