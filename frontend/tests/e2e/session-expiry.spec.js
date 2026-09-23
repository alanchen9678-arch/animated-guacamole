import { expect, test } from '@playwright/test'

const user = {
  id: 91,
  username: 'returning-user',
  firstName: 'Avery',
  hasInitialAssessment: true,
  hasCurrentPersonalityAssessment: true,
  personality: {},
  needsProfile: null,
}

test('expired sessions preserve drafts and return to the interrupted page after login', async ({ page }) => {
  await page.addInitScript(({ account }) => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const draftKey = `dawn-harbor.journal.draft.v1:${account.id}:${today}`

    window.sessionStorage.setItem('dawn-harbor_token', 'expired-token')
    window.sessionStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      entryText: 'A draft that should survive reauthentication.',
      doodleData: null,
      savedAt: new Date().toISOString(),
    }))
    window.localStorage.setItem('dawn-harbor.activePage', 'journal')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  }, { account: user })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user),
  }))

  await page.route('**/api/auth/login/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ token: 'renewed-token', user }),
  }))

  await page.route('**/api/journal/', (route) => {
    const authorization = route.request().headers().authorization
    if (authorization === 'Token expired-token') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Session expired. Please sign in again.' }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [] }),
    })
  })

  await page.goto('/')

  const dialog = page.getByRole('dialog', { name: 'Log in to Dawn Harbor' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Session expired', { exact: true })).toBeVisible()
  await expect(dialog).toContainText('Please sign in again to continue.')

  const preservedBeforeLogin = await page.evaluate(() => ({
    token: sessionStorage.getItem('dawn-harbor_token'),
    draft: Object.keys(sessionStorage).find((key) => key.startsWith('dawn-harbor.journal.draft.')),
  }))
  expect(preservedBeforeLogin.token).toBeNull()
  expect(preservedBeforeLogin.draft).toBeTruthy()

  await dialog.locator('input[name="username"]').fill('returning-user')
  await dialog.locator('input[name="password"]').fill('correct-password')
  await dialog.locator('.auth-submit').click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Thought Journal' })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Journal entry' })).toHaveValue(
    'A draft that should survive reauthentication.',
  )
  await expect(page.getByText('Your unfinished journal entry was restored.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('dawn-harbor_token'))).toBe('renewed-token')
})
