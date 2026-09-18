import { expect, test } from '@playwright/test'

async function expectPeerChatLayout(page) {
  const layout = await page.locator('.ps-chat-root').evaluate((root) => {
    const headerElement = root.querySelector('.ps-chat-header')
    const messagesElement = root.querySelector('.ps-messages')
    const header = headerElement.getBoundingClientRect()
    const messages = messagesElement.getBoundingClientRect()
    const rootBounds = root.getBoundingClientRect()
    const contentBounds = root.closest('.content').getBoundingClientRect()
    const rootStyles = getComputedStyle(root)
    const headerStyles = getComputedStyle(headerElement)
    const messageStyles = getComputedStyle(messagesElement)
    const headerContentLeft = header.left + parseFloat(headerStyles.paddingLeft)
    const headerContentRight = header.right - parseFloat(headerStyles.paddingRight)
    const messageContentLeft = messages.left + parseFloat(messageStyles.paddingLeft)
    const messageContentRight = messages.right - parseFloat(messageStyles.paddingRight)

    return {
      borderTopWidth: rootStyles.borderTopWidth,
      borderRadius: rootStyles.borderRadius,
      backgroundColor: rootStyles.backgroundColor,
      headerTopDelta: Math.abs(header.top - contentBounds.top),
      headerLeftDelta: Math.abs(header.left - contentBounds.left),
      headerRightDelta: Math.abs(header.right - contentBounds.right),
      headerHeight: header.height,
      headerPaddingTop: headerStyles.paddingTop,
      headerContentLeftDelta: Math.abs(headerContentLeft - messageContentLeft),
      headerContentRightDelta: Math.abs(headerContentRight - messageContentRight),
      messageInset: messages.left - rootBounds.left,
    }
  })

  expect(layout.borderTopWidth).toBe('0px')
  expect(layout.borderRadius).toBe('0px')
  expect(layout.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(layout.headerTopDelta).toBeLessThan(1)
  expect(layout.headerLeftDelta).toBeLessThan(1)
  expect(layout.headerRightDelta).toBeLessThan(1)
  expect(layout.headerHeight).toBeGreaterThanOrEqual(74)
  expect(layout.headerPaddingTop).toBe('20px')
  expect(layout.headerContentLeftDelta).toBeLessThan(1)
  expect(layout.headerContentRightDelta).toBeLessThan(1)
  expect(layout.messageInset).toBeLessThan(1)
  await expect(page.locator('.ps-input-bar')).toHaveCSS('padding-left', '8px')
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.sessionStorage.setItem('dawn-harbor_token', 'peer-hover-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'community')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  })
  await page.route('**/api/auth/me/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    id: 71, username: 'peer-user', firstName: 'Avery', hasInitialAssessment: true,
    hasCurrentPersonalityAssessment: true, personality: {}, needsProfile: null,
  }) }))
  await page.route('**/api/peer/profile/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    isOnboarded: true, anonymousName: 'Quiet Cedar', avatarColor: '#627967', avatarSymbol: 'peer-cove',
  }) }))
  await page.route('**/api/peer/rooms/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { id: 5, name: 'Grounding Together', memberCount: 12 },
  ]) }))
  await page.route('**/api/peer/rooms/5/messages/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/peer/peers/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
    { userId: 11, name: 'Silver Fern', color: '#6f7f76', avatarSymbol: 'peer-pine', status: 'connected' },
    { userId: 12, name: 'Calm Harbor', color: '#687790', avatarSymbol: 'peer-beacon', status: 'none' },
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
  await expect(match.locator('.ps-anon-avatar use')).toHaveAttribute('href', '/avatar-symbols.svg#peer-beacon')

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

test('group and direct peer chats share the full-width chat workspace', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')

  await page.getByRole('button', { name: /Grounding Together/ }).click()
  await expect(page.locator('.ps-chat-name')).toHaveText('Grounding Together')
  await expectPeerChatLayout(page)

  await page.getByRole('button', { name: 'Back' }).click()
  const activeChat = page.locator('.ps-peer-card--active').filter({ hasText: 'Silver Fern' })
  await activeChat.getByRole('button', { name: 'Message' }).click()
  await expect(page.locator('.ps-chat-name')).toHaveText('Silver Fern')
  await expectPeerChatLayout(page)
})
