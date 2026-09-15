import { expect, test } from '@playwright/test'

const TODAY = '2026-09-10'

async function loadAuthenticatedHome(page, userOverrides = {}) {
  await page.clock.install({ time: new Date('2026-09-10T12:00:00-05:00') })
  await page.addInitScript(({ today }) => {
    window.sessionStorage.setItem('aurora_token', 'notification-test-token')
    window.localStorage.setItem('aurora.activePage', 'home')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
    window.localStorage.setItem('aurora.checkin.prompt-shown.44', today)
  }, { today: TODAY })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 44,
      username: 'notification-user',
      firstName: 'Avery',
      displayName: 'Avery',
      streak: 2,
      checkInDueThisWeek: true,
      weeklyCheckInDueSince: '2026-09-07',
      lastWeeklyCheckInDate: '2026-09-06',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      needsProfile: null,
      ...userOverrides,
    }),
  }))

  await page.route('**/api/checkins/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      history: [],
      streak: 2,
      lastCheckInDate: '2026-09-06',
      lastWeeklyCheckInDate: '2026-09-06',
      dueThisWeek: true,
      weeklyDueSince: '2026-09-07',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
    }),
  }))

  await page.goto('/')
}

test('due notification is server-backed, keyboard reachable, and navigates to check-ins', async ({ page }) => {
  await loadAuthenticatedHome(page)

  const bell = page.getByRole('button', { name: 'Notifications, 1 active' })
  await expect(bell).toBeVisible()
  await bell.click()

  const panel = page.getByRole('region', { name: 'Notifications' })
  const notification = panel.getByRole('button', { name: /Your weekly check-in is ready 3d overdue/ })
  await expect(notification).toBeVisible()

  await page.keyboard.press('Tab')
  await expect(notification).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(bell).toBeFocused()

  await bell.click()
  await notification.click()
  await expect(page.getByRole('heading', { name: 'Check-Ins', exact: true })).toBeVisible()
  await expect(panel).toBeHidden()
})

test('empty notification state closes on outside click and remains below modal layers', async ({ page }) => {
  await loadAuthenticatedHome(page, {
    checkInDueThisWeek: false,
    weeklyCheckInDueSince: null,
  })

  const bell = page.getByRole('button', { name: 'Notifications, none active' })
  await bell.click()

  const panel = page.getByRole('region', { name: 'Notifications' })
  await expect(panel).toContainText("You're all caught up.")
  await page.locator('.home-greeting').click()
  await expect(panel).toBeHidden()

  const notificationLayer = Number(await page.locator('.notif-anchor').evaluate((element) => getComputedStyle(element).zIndex))
  expect(notificationLayer).toBeLessThan(100)
})
