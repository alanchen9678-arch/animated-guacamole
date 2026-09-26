import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.sessionStorage.setItem('dawn-harbor_token', 'journal-draft-token')
    window.localStorage.setItem('dawn-harbor.activePage', 'journal')
    window.localStorage.setItem('dawn-harbor.journal.daily-prompt', today)
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 52,
      username: 'journal-draft-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  await page.route('**/api/journal/', (route) => {
    if (route.request().method() === 'POST') {
      const requestBody = route.request().postDataJSON()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          entries: [{
            date: requestBody.date,
            text: requestBody.content,
            mood: requestBody.mood,
            doodleData: requestBody.doodleData,
          }],
        }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ entries: [] }),
    })
  })
})

test('unfinished journal entry restores after reload and clears after successful submission', async ({ page }) => {
  await page.goto('/')

  const editor = page.getByRole('textbox', { name: 'Journal entry' })
  await expect(editor).toBeEnabled()
  await editor.fill('A thought I want to finish after I come back.')

  const draftKey = await page.evaluate(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    return `dawn-harbor.journal.draft.v1:52:${today}`
  })

  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), draftKey)).not.toBeNull()

  await page.reload()

  await expect(page.getByText('Your unfinished journal entry was restored.')).toBeVisible()
  await expect(editor).toHaveValue('A thought I want to finish after I come back.')

  await page.getByRole('button', { name: /Submit entry/ }).click()
  await expect(page.getByText('Your journal entry was saved.')).toBeVisible()
  await expect(page.locator('.jn-ai-avatar use')).toHaveAttribute('href', '/avatar-symbols.svg#brand-harbor')
  await expect.poll(() => page.evaluate((key) => sessionStorage.getItem(key), draftKey)).toBeNull()
})
