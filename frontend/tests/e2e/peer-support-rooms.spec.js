import { expect, test } from '@playwright/test'


async function stubPeerSupportShell(page) {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.sessionStorage.setItem('dawn-harbor_token', 'peer-room-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'community')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  })
  await page.route('**/api/auth/me/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    id: 82,
    username: 'room-user',
    firstName: 'Avery',
    hasInitialAssessment: true,
    hasCurrentPersonalityAssessment: true,
    personality: {},
    needsProfile: null,
  }) }))
  await page.route('**/api/peer/profile/', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    isOnboarded: true,
    anonymousName: 'Quiet Cedar',
    avatarColor: '#627967',
    avatarSymbol: 'peer-cove',
    peerSupportCategory: 'anxiety',
  }) }))
  await page.route('**/api/peer/peers/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }))
}


test('waitlisted room state occupies the room position and can be checked again', async ({ page }) => {
  await stubPeerSupportShell(page)
  let requestCount = 0
  await page.route('**/api/peer/rooms/', (route) => {
    requestCount += 1
    const state = requestCount === 1
      ? {
          status: 'waitlisted',
          category: 'anxiety',
          categoryLabel: 'Anxiety',
          room: null,
          waitlist: { reason: 'capacity', joinedAt: '2026-09-20T12:00:00Z' },
        }
      : {
          status: 'assigned',
          category: 'anxiety',
          categoryLabel: 'Anxiety',
          room: { id: 5, name: 'Anxiety Support Room 1', memberCount: 20, capacity: 20 },
          waitlist: null,
        }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state) })
  })

  await page.goto('/')

  await expect(page.getByText('You are on the Anxiety waitlist')).toBeVisible()
  const checkAgain = page.getByRole('button', { name: 'Check again' })
  await expect(checkAgain).toHaveCSS('border-radius', '10px')
  await expect(checkAgain).toHaveCSS('font-size', '13.12px')
  await expect(page.getByText(/currently full/)).toBeVisible()
  await page.getByRole('button', { name: 'Check again' }).click()
  await expect(page.getByRole('button', { name: /Anxiety Support Room 1/ })).toBeVisible()
})


test('room controls switch rooms and leave for a future-room waitlist', async ({ page }) => {
  await stubPeerSupportShell(page)
  const assigned = {
    status: 'assigned',
    category: 'anxiety',
    categoryLabel: 'Anxiety',
    room: { id: 5, name: 'Anxiety Support Room 1', memberCount: 12, capacity: 20 },
    waitlist: null,
  }
  let currentState = assigned
  await page.route('**/api/peer/rooms/', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(currentState),
  }))
  await page.route('**/api/peer/rooms/5/messages/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/peer/rooms/6/messages/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }))
  await page.route('**/api/peer/rooms/switch/', (route) => {
    currentState = {
      ...assigned,
      room: { id: 6, name: 'Anxiety Support Room 2', memberCount: 10, capacity: 20 },
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentState) })
  })
  await page.route('**/api/peer/rooms/opt-out/', (route) => {
    currentState = {
      status: 'waitlisted',
      category: 'anxiety',
      categoryLabel: 'Anxiety',
      room: null,
      waitlist: { reason: 'opted_out', joinedAt: '2026-09-20T12:00:00Z' },
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentState) })
  })
  await page.route('**/api/peer/rooms/rejoin/', (route) => {
    currentState = {
      ...assigned,
      room: { id: 5, name: 'Anxiety Support Room 1', memberCount: 13, capacity: 20 },
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentState) })
  })

  await page.goto('/')
  await page.getByRole('button', { name: /Anxiety Support Room 1/ }).click()
  await page.getByRole('button', { name: 'Switch room' }).click()
  await page.getByRole('button', { name: 'Switch', exact: true }).click()
  await expect(page.locator('.ps-chat-name')).toHaveText('Anxiety Support Room 2')

  await page.getByRole('button', { name: 'Leave room' }).click()
  await page.getByRole('button', { name: 'Leave and wait' }).click()
  await expect(page.getByText('You are on the Anxiety waitlist')).toBeVisible()
  await expect(page.getByText(/Rejoin now if a current room has space/)).toBeVisible()
  await page.getByRole('button', { name: 'Rejoin peer support' }).click()
  await expect(page.getByRole('button', { name: /Anxiety Support Room 1/ })).toBeVisible()
})


test('an opted-out user remains waitlisted when both rooms are full', async ({ page }) => {
  await stubPeerSupportShell(page)
  const waitlisted = {
    status: 'waitlisted',
    category: 'anxiety',
    categoryLabel: 'Anxiety',
    room: null,
    waitlist: { reason: 'opted_out', joinedAt: '2026-09-20T12:00:00Z' },
  }
  await page.route('**/api/peer/rooms/', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(waitlisted),
  }))
  await page.route('**/api/peer/rooms/rejoin/', (route) => route.fulfill({
    status: 409,
    contentType: 'application/json',
    body: JSON.stringify({
      error: 'All current Anxiety support rooms are full. You are still on the waitlist.',
      state: waitlisted,
    }),
  }))

  await page.goto('/')
  await page.getByRole('button', { name: 'Rejoin peer support' }).click()

  await expect(page.getByText('All current Anxiety support rooms are full. You are still on the waitlist.')).toBeVisible()
  await expect(page.getByText('You are on the Anxiety waitlist')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Rejoin peer support' })).toBeEnabled()
})
