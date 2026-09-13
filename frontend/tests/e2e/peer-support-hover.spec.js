import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'peer-hover-token')
    window.localStorage.setItem('aurora.activePage', 'community')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })
  await page.route('**/api/auth/me/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    id: 71, username: 'peer-user', firstName: 'Avery', hasInitialAssessment: true,
    hasCurrentPersonalityAssessment: true, personality: {}, needsProfile: null,
  }) }))
  await page.route('**/api/peer/profile/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    isOnboarded: true, anonymousName: 'Quiet Cedar', avatarColor: '#627967',
  }) }))
  await page.route('**/api/peer/rooms/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/peer/peers/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { userId: 11, name: 'Silver Fern', color: '#6f7f76', status: 'connected' },
    { userId: 12, name: 'Calm Harbor', color: '#687790', status: 'none' },
  ]) }))
  await page.route('**/api/peer/dm/11/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
})

test('peer match hover adds edge spacing without moving its content', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  const match = page.locator('.ps-peer-card').filter({ hasText: 'Calm Harbor' })
  const avatar = match.locator(':scope > div').first()
  const copy = match.locator('.ps-peer-info')
  const button = match.getByRole('button', { name: 'Connect' })
  await expect(button).toBeVisible()

  const avatarBefore = await avatar.boundingBox()
  const copyBefore = await copy.boundingBox()
  await match.hover()
  const avatarAfter = await avatar.boundingBox()
  const copyAfter = await copy.boundingBox()
  const matchBox = await match.boundingBox()
  const buttonBox = await button.boundingBox()

  expect(Math.abs(avatarAfter.x - avatarBefore.x)).toBeLessThan(1)
  expect(Math.abs(copyAfter.x - copyBefore.x)).toBeLessThan(1)
  expect(matchBox.x + matchBox.width - buttonBox.x - buttonBox.width).toBeCloseTo(14, 0)

  const activeChat = page.locator('.ps-peer-card--active').filter({ hasText: 'Silver Fern' })
  await activeChat.getByRole('button', { name: 'Message' }).click()
  await expect(page.locator('.ps-chat-name')).toHaveText('Silver Fern')
})

test('peer match hover stays contained on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const match = page.locator('.ps-peer-card').filter({ hasText: 'Calm Harbor' })
  await match.hover()

  const cardBox = await match.boundingBox()
  const pageBox = await page.locator('.page').boundingBox()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(cardBox.x).toBeGreaterThanOrEqual(pageBox.x)
  expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(pageBox.x + pageBox.width + 1)
  expect(overflow).toBeLessThanOrEqual(1)
})
