import { expect, test } from '@playwright/test'
import { DISORDER_LABELS } from '../../src/pages/InfoLibrary.data.js'

async function mockUser(page, userId = 44) {
  await page.addInitScript((id) => {
    window.localStorage.setItem('aurora_token', 'library-a11y-token')
    window.localStorage.setItem('aurora.activePage', 'library')
    const now = new Date()
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
    window.sessionStorage.removeItem(`aurora.infoLibrary.quizSession.v2:${id}`)
    window.sessionStorage.removeItem(`aurora.infoLibrary.activeTab.v2:${id}`)
    Math.random = () => 0
  }, userId)

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: userId,
      username: `library-user-${userId}`,
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
}

async function openLibrary(page, userId = 44) {
  await mockUser(page, userId)
  await page.goto('/')
}

test('condition disclosures expose state, regions, headings, and source context', async ({ page }) => {
  await openLibrary(page)

  const disclosures = page.locator('.il-card-header')
  await expect(disclosures).toHaveCount(8)

  const anxiety = disclosures.first()
  await expect(anxiety).toHaveAttribute('type', 'button')
  await expect(anxiety).toHaveAttribute('aria-expanded', 'false')
  await expect(anxiety).toHaveAttribute('aria-controls', 'il-condition-anxiety-panel')

  await anxiety.click()
  await expect(anxiety).toHaveAttribute('aria-expanded', 'true')
  const panel = page.locator('#il-condition-anxiety-panel')
  await expect(panel).toHaveAttribute('role', 'region')
  await expect(panel).toHaveAttribute('aria-labelledby', 'il-condition-anxiety-trigger')
  await expect(panel.getByRole('heading', { name: 'What it is' })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Common signs and experiences' })).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Treatment and support' })).toBeVisible()

  const whoLink = page.getByRole('link', { name: /WHO mental disorders overview.*opens in a new tab/ })
  await expect(whoLink).toHaveAttribute('target', '_blank')
  await expect(page.getByText('Information, not diagnosis.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Visit the 988 Lifeline.*opens in a new tab/ })).toBeVisible()
  await expect(page.locator('.il-tab--active')).toHaveCSS('color', 'rgb(41, 64, 53)')
})

test('a malformed stored quiz is replaced without crashing the page', async ({ page }) => {
  await mockUser(page)
  await page.addInitScript(() => {
    window.sessionStorage.setItem('aurora.infoLibrary.quizSession.v2:44', JSON.stringify({
      version: 2,
      questions: Array.from({ length: 8 }, () => ({})),
      idx: 0,
      selected: null,
      score: 0,
      done: false,
      answers: [],
    }))
  })
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toBeVisible()
  await page.getByRole('tab', { name: 'Quiz' }).click()
  await expect(page.locator('.il-option')).toHaveCount(4)
  expect(pageErrors).toEqual([])

  const stored = await page.evaluate(() => JSON.parse(
    window.sessionStorage.getItem('aurora.infoLibrary.quizSession.v2:44'),
  ))
  expect(stored.version).toBe(2)
  expect(stored.questions).toHaveLength(8)
  expect(stored.questions.every((question) => question.options.length === 4)).toBe(true)
})

test('feedback links to its Library topic and keeps completed answer text readable', async ({ page }) => {
  await openLibrary(page)
  await page.getByRole('tab', { name: 'Quiz' }).click()

  const session = await page.evaluate(() => JSON.parse(
    window.sessionStorage.getItem('aurora.infoLibrary.quizSession.v2:44'),
  ))
  const question = session.questions[session.idx]
  const wrongAnswer = question.options.find((option) => option !== question.correct)
  await page.locator('.il-option').filter({ hasText: wrongAnswer }).click()

  const dimmed = page.locator('.il-option--dim').first()
  await expect(dimmed).toHaveCSS('opacity', '1')
  await expect(dimmed).toHaveCSS('color', 'rgb(91, 96, 92)')

  await page.getByRole('button', { name: `Review ${DISORDER_LABELS[question.disorderId]}` }).click()

  const disclosure = page.locator(`#il-condition-${question.disorderId}-trigger`)
  await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
  await expect(disclosure).toBeFocused()
})

test('mobile answer feedback stacks labels without squeezing or overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openLibrary(page)
  await page.getByRole('tab', { name: 'Quiz' }).click()

  const session = await page.evaluate(() => JSON.parse(
    window.sessionStorage.getItem('aurora.infoLibrary.quizSession.v2:44'),
  ))
  const current = session.questions[session.idx]
  const wrongAnswer = current.options.find((option) => option !== current.correct)
  await page.locator('.il-option').filter({ hasText: wrongAnswer }).click()

  const geometry = await page.locator('.il-option').evaluateAll((options) => options
    .filter((option) => option.querySelector('.il-option-result'))
    .map((option) => {
      const label = option.querySelector('.il-option-result').getBoundingClientRect()
      const text = option.querySelector('.il-option-text').getBoundingClientRect()
      return { labelBottom: label.bottom, textTop: text.top, textWidth: text.width }
    }))

  expect(geometry).toHaveLength(2)
  expect(geometry.every(({ labelBottom, textTop }) => labelBottom <= textTop)).toBe(true)
  expect(geometry.every(({ textWidth }) => textWidth > 250)).toBe(true)
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    page: document.documentElement.scrollWidth,
  }))
  expect(widths.page).toBeLessThanOrEqual(widths.viewport)
})

test('a perfect round has a calm result and moves focus only on completion', async ({ page }) => {
  await openLibrary(page)
  await page.getByRole('tab', { name: 'Quiz' }).click()

  for (let index = 0; index < 8; index += 1) {
    const session = await page.evaluate(() => JSON.parse(
      window.sessionStorage.getItem('aurora.infoLibrary.quizSession.v2:44'),
    ))
    const current = session.questions[session.idx]
    await page.locator('.il-option').filter({ hasText: current.correct }).click()
    await page.locator('.il-next-btn').click()
  }

  const heading = page.getByRole('heading', { name: 'Strong understanding' })
  await expect(heading).toBeVisible()
  await expect(heading).toBeFocused()
  await expect(page.locator('.il-results-score')).toHaveAttribute('aria-label', '8 out of 8 correct')
  await expect(page.locator('.il-missed-card')).toHaveCount(0)

  await page.getByRole('button', { name: 'Review library' }).click()
  await expect(page.getByRole('tab', { name: 'Library' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
})
