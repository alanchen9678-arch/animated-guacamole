import { expect, test } from '@playwright/test'

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

test('authentication dialog traps focus, closes on Escape, and restores its trigger', async ({ page }) => {
  await page.goto('/')

  const trigger = page.getByRole('button', { name: 'Log in', exact: true }).first()
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Log in to Dawn Harbor' })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.locator('#auth-username')).toBeFocused()
  await expect(page.locator('.topbar')).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.topbar')).toHaveJSProperty('inert', true)

  const closeButton = dialog.getByRole('button', { name: 'Close' })
  await closeButton.focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('tab', { name: 'Log in' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('.topbar')).not.toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('.topbar')).toHaveJSProperty('inert', false)
})

test('journal reminder is a modal dialog with initial focus and inert background', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('dawn-harbor_token', 'journal-reminder-token')
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 61,
      username: 'reminder-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      checkInDueThisWeek: false,
      lastJournalEntryDate: null,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.goto('/')

  const dialog = page.getByRole('dialog', { name: /Good (morning|afternoon|evening)/ })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.locator('#daily-journal-prompt-title')).toBeFocused()
  await expect(page.locator('.topbar')).toHaveJSProperty('inert', true)

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('.topbar')).toHaveJSProperty('inert', false)
})

test('overdue check-in reminder has complete modal keyboard behavior', async ({ page }) => {
  const today = new Date()
  const dueSince = new Date(today)
  dueSince.setDate(dueSince.getDate() - 3)

  await page.addInitScript(({ currentDate }) => {
    window.sessionStorage.setItem('dawn-harbor_token', 'checkin-reminder-token')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', currentDate)
  }, { currentDate: dateKey(today) })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 62,
      username: 'overdue-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      checkInDueThisWeek: true,
      weeklyCheckInDueSince: dateKey(dueSince),
      lastJournalEntryDate: dateKey(today),
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.goto('/')

  const dialog = page.getByRole('dialog', { name: 'Your weekly check-in is overdue' })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog.locator('#overdue-checkin-prompt-title')).toBeFocused()
  await expect(page.locator('.shell-body')).toHaveJSProperty('inert', true)

  const laterButton = dialog.getByRole('button', { name: 'Maybe later' })
  const startButton = dialog.getByRole('button', { name: /Start check-in/ })
  await laterButton.focus()
  await page.keyboard.press('Shift+Tab')
  await expect(startButton).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('.shell-body')).toHaveJSProperty('inert', false)
})
