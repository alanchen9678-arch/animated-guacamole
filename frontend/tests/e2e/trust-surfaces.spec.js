import { expect, test } from '@playwright/test'

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

test('public landing uses accurate therapist copy, social metadata, and symbol avatars', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('Dawn Harbor | A calm mental wellness workspace')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Private check-ins/)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /dawn-harbor-social\.jpg$/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')

  await expect(page.getByText('Get paired with a licensed professional')).toHaveCount(0)
  await expect(page.getByText('trusted care')).toHaveCount(0)
  await expect(page.getByText('Explore a guided matching demo with sample therapist profiles tailored to your preferences.')).toBeVisible()
  await expect(page.getByText('Short weekly surveys that help you notice changes in your well-being over time.')).toBeVisible()
  await expect(page.getByText('A reflective space for daily experiences, private unless you choose to share entries.')).toBeVisible()
  await expect(page.getByText('Connect with others through a separate peer-facing name and symbol.')).toBeVisible()
  await expect(page.locator('.fv-therapist-person')).toContainText('Sample therapist profile')
  await expect(page.getByText('Explore sample match')).toBeVisible()

  const expectedSymbols = ['brand-harbor', 'provider-sprig', 'peer-cove', 'peer-tide', 'peer-pebble']
  for (const symbol of expectedSymbols) {
    await expect(page.locator(`use[href="/avatar-symbols.svg#${symbol}"]`).first()).toBeAttached()
  }

  expect((await page.request.get('/favicon.svg')).ok()).toBeTruthy()
  expect((await page.request.get('/dawn-harbor-social.jpg')).ok()).toBeTruthy()
})

test('Home describes an unset mood with meaningful copy', async ({ page }) => {
  await page.addInitScript((today) => {
    window.sessionStorage.setItem('dawn-harbor_token', 'mood-fallback-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'home')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  }, todayKey())
  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 81,
      username: 'mood-user',
      firstName: 'Avery',
      displayName: 'Avery',
      mood: '',
      streak: 0,
      checkInDueThisWeek: false,
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.goto('/')

  const moodStat = page.locator('.today-stat').filter({ hasText: 'Mood' })
  await expect(moodStat).toContainText('Not set')
  await expect(moodStat).not.toContainText('-')
})

test('returning chatbot users retain direct safety guidance and reduced-motion scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((today) => {
    window.__dawnHarborScrollBehaviors = []
    const originalScrollTo = HTMLElement.prototype.scrollTo
    HTMLElement.prototype.scrollTo = function patchedScrollTo(options, y) {
      if (options && typeof options === 'object') {
        window.__dawnHarborScrollBehaviors.push(options.behavior)
      }
      if (originalScrollTo) return originalScrollTo.call(this, options, y)
      return undefined
    }
    window.sessionStorage.setItem('dawn-harbor_token', 'chat-safety-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'chatbot')
    window.localStorage.setItem('dawn-harbor.chatbot.onboarding', 'started')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  }, todayKey())
  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 82,
      username: 'chat-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))
  await page.route('**/api/chat/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      messages: [{
        id: 1,
        role: 'assistant',
        content: 'Welcome back.',
        timestamp: '2026-09-21T12:00:00Z',
      }],
    }),
  }))

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Your 24/7 Mental Wellness Companion' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Your AI Wellness Companion' })).toHaveCount(0)
  const safety = page.getByLabel('Chatbot safety information')
  await expect(safety).toBeVisible()
  await expect(safety).toContainText('not monitored by a clinician')
  await expect(safety.getByRole('link', { name: 'call', exact: true })).toHaveAttribute('href', 'tel:988')
  await expect(safety.getByRole('link', { name: 'text 988' })).toHaveAttribute('href', 'sms:988')
  await expect(safety.getByRole('link', { name: 'call 911' })).toHaveAttribute('href', 'tel:911')
  await expect(page.locator('.msg-avatar use').first()).toHaveAttribute('href', '/avatar-symbols.svg#brand-harbor')
  await expect(page.locator('.chat-messages')).toHaveCSS('scroll-behavior', 'auto')

  const scrollBehaviors = await page.evaluate(() => window.__dawnHarborScrollBehaviors)
  expect(scrollBehaviors).not.toContain('smooth')
})
