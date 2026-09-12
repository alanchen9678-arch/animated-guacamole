import { expect, test } from '@playwright/test'

const user = {
  id: 52,
  username: 'type-user',
  firstName: 'Avery',
  displayName: 'Avery',
  avatarColor: '#3a6898',
  mood: 'calm',
  streak: 2,
  checkInDueThisWeek: false,
  hasInitialAssessment: true,
  hasCurrentPersonalityAssessment: true,
  personality: {
    id: 'architect',
    name: 'The Architect',
    category: 'Thinker',
  },
  needsProfile: { overall_score: 42, concern_scores: {} },
}

test('dashboard pages share the home typography hierarchy and secondary color', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'typography-token')
    window.localStorage.setItem('aurora.activePage', 'settings')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
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
  const journalGeometry = await page.locator('.jn-page').evaluate((journalPage) => {
    const pageRect = journalPage.getBoundingClientRect()
    const content = journalPage.closest('.content')
    const contentRect = content.getBoundingClientRect()
    const contentStyle = getComputedStyle(content)
    const contentLeft = contentRect.left + parseFloat(contentStyle.paddingLeft)
    const contentRight = contentRect.right - parseFloat(contentStyle.paddingRight)
    return {
      width: pageRect.width,
      leftInset: Math.abs(pageRect.left - contentLeft),
      rightInset: Math.abs(contentRight - pageRect.right),
    }
  })
  expect(journalGeometry.width).toBeGreaterThan(940)
  expect(journalGeometry.leftInset).toBeLessThan(1)
  expect(journalGeometry.rightInset).toBeLessThan(1)

  await page.getByRole('button', { name: 'Info Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Mental Health Library' })).toHaveCSS('font-weight', '650')
  await expect(page.locator('.il-card-title').first()).toHaveCSS('font-weight', '600')
  await expect(page.locator('.il-page-sub')).toHaveCSS('color', 'rgb(91, 96, 92)')

  await page.getByRole('button', { name: 'Chatbot', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your 24/7 Mental Wellness Companion' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Your 24/7 Mental Wellness Companion' })).toHaveCSS('font-weight', '650')
  await expect(page.locator('.intro-body')).toHaveCSS('color', 'rgb(91, 96, 92)')
  await expect(page.getByText('Honest, not just agreeable')).toHaveCount(0)
  await expect(page.getByText('Personalized to you')).toHaveCount(0)
  await expect(page.getByText('Knows its limits')).toHaveCount(0)
  await expect(page.getByText('Connected to the platform')).toHaveCount(0)
  expect(await page.locator('.intro-actions').evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ))).toBe(2)
  await page.getByRole('button', { name: 'Start chatting' }).click()
  await expect(page.getByText("Hi, I'm Aurora. I'm here to listen with warmth and honesty. What's on your mind today?")).toBeVisible()
  await expect(page.locator('.chat-header-avatar')).toHaveCount(0)
  await expect(page.locator('.chat-header-name')).toHaveCount(0)
  await expect(page.locator('.msg-avatar').first()).toHaveCSS('background-color', 'rgb(58, 82, 68)')
  await expect(page.locator('.chat-root')).toHaveCSS('border-style', 'none')
  await expect(page.locator('.bubble--ai').first()).toHaveCSS('border-style', 'solid')
  const chatGeometry = await page.locator('.chat-root').evaluate((chatRoot) => {
    const scrollRegion = chatRoot.querySelector('.chat-messages')
    const conversation = chatRoot.querySelector('.chat-conversation')
    const composer = chatRoot.querySelector('.chat-input-bar')
    const rootRect = chatRoot.getBoundingClientRect()
    const scrollRect = scrollRegion.getBoundingClientRect()
    const conversationRect = conversation.getBoundingClientRect()
    const composerRect = composer.getBoundingClientRect()

    return {
      overflowY: getComputedStyle(scrollRegion).overflowY,
      rightEdgeDelta: Math.abs(rootRect.right - scrollRect.right),
      conversationIsInset: conversationRect.width < scrollRect.width,
      conversationWidth: conversationRect.width,
      composerWidth: composerRect.width,
      conversationInset: Math.abs(conversationRect.left - scrollRect.left),
      composerInset: Math.abs(composerRect.left - rootRect.left),
    }
  })
  expect(chatGeometry.overflowY).toBe('auto')
  expect(chatGeometry.rightEdgeDelta).toBeLessThan(1)
  expect(chatGeometry.conversationIsInset).toBe(true)
  expect(chatGeometry.conversationWidth).toBeGreaterThan(900)
  expect(Math.abs(chatGeometry.composerWidth - chatGeometry.conversationWidth)).toBeLessThanOrEqual(2)
  expect(chatGeometry.conversationInset).toBeLessThan(12)
  expect(chatGeometry.composerInset).toBeLessThan(12)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileRightEdgeDelta = await page.locator('.chat-root').evaluate((chatRoot) => {
    const rootRect = chatRoot.getBoundingClientRect()
    const scrollRect = chatRoot.querySelector('.chat-messages').getBoundingClientRect()
    return Math.abs(rootRect.right - scrollRect.right)
  })
  expect(mobileRightEdgeDelta).toBeLessThan(1)
  await page.setViewportSize({ width: 1280, height: 720 })

  await expect(page.locator('.send-btn')).toHaveCSS('background-image', 'none')
  await expect(page.locator('.send-btn')).toBeDisabled()
  await expect(page.locator('.send-btn')).toHaveCSS('background-color', 'rgb(216, 222, 216)')

  const composer = page.getByPlaceholder(/Message Aurora/)
  await composer.fill('Testing the quieter conversation')
  await expect(page.locator('.send-btn')).toBeEnabled()
  await expect(page.locator('.send-btn')).toHaveCSS('background-color', 'rgb(58, 82, 68)')
  await composer.press('Enter')
  await expect(page.locator('.bubble--user').last()).toContainText('Testing the quieter conversation')
  await expect(page.locator('.msg-avatar--user')).toHaveCount(0)

  await page.getByRole('button', { name: 'Check-Ins', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check-Ins' })).toHaveCSS('font-size', '32px')
  await expect(page.getByRole('heading', { name: 'Check-Ins' })).toHaveCSS('font-weight', '650')
  await expect(page.locator('.ci-hub-personality')).toHaveCount(0)
  await expect(page.getByText('The Architect')).toHaveCount(0)
  const checkInsGeometry = await page.locator('.ci-page').evaluate((checkInsPage) => {
    const pageRect = checkInsPage.getBoundingClientRect()
    const content = checkInsPage.closest('.content')
    const contentRect = content.getBoundingClientRect()
    const contentStyle = getComputedStyle(content)
    const contentLeft = contentRect.left + parseFloat(contentStyle.paddingLeft)
    const contentRight = contentRect.right - parseFloat(contentStyle.paddingRight)
    return {
      width: pageRect.width,
      leftInset: Math.abs(pageRect.left - contentLeft),
      rightInset: Math.abs(contentRight - pageRect.right),
    }
  })
  expect(checkInsGeometry.width).toBeGreaterThan(940)
  expect(checkInsGeometry.leftInset).toBeLessThan(1)
  expect(checkInsGeometry.rightInset).toBeLessThan(1)
})
