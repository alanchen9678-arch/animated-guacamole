import { expect, test } from '@playwright/test'

const initialUser = {
  id: 88,
  username: 'settings-user',
  firstName: 'Avery',
  displayName: 'Avery Stone',
  email: 'avery@example.com',
  bio: 'Learning to make more room for rest and reflection.',
  avatarColor: '#4d6b58',
  mood: 'calm',
  plan: 'Free',
  streak: 1,
  anonymousName: 'QuietPine',
  checkInDueThisWeek: false,
  hasInitialAssessment: true,
  hasCurrentPersonalityAssessment: true,
}

async function openSettings(page) {
  let user = { ...initialUser }
  let anxiousAttempts = 0
  const patches = []

  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'settings-test-token')
    window.localStorage.setItem('aurora.activePage', 'settings')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())

    if (url.pathname === '/api/auth/me/' && request.method() === 'PATCH') {
      const body = request.postDataJSON()
      patches.push(body)
      if (body.mood === 'anxious' && anxiousAttempts === 0) {
        anxiousAttempts += 1
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Mood service unavailable.' }),
        })
        return
      }
      user = { ...user, ...body }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(user),
      })
      return
    }

    let body = {}
    if (url.pathname === '/api/auth/me/') body = user
    if (url.pathname === '/api/journal/') body = []
    if (url.pathname === '/api/journal/privacy/') body = { shareWithTherapist: false }
    if (url.pathname === '/api/checkins/') body = []

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  return patches
}

test('settings preserves a clear desktop composition and accessible controls', async ({ page }) => {
  const patches = await openSettings(page)

  const geometry = await page.locator('.settings-layout').evaluate((layout) => {
    const profile = layout.querySelector('.settings-profile').getBoundingClientRect()
    const rail = layout.querySelector('.settings-rail').getBoundingClientRect()
    return {
      columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
      profileWidth: profile.width,
      railWidth: rail.width,
      topDelta: Math.abs(profile.top - rail.top),
    }
  })
  expect(geometry.columns).toBe(2)
  expect(geometry.profileWidth).toBeGreaterThan(geometry.railWidth)
  expect(geometry.topDelta).toBeLessThan(1)

  const displayName = page.getByRole('textbox', { name: 'Display name' })
  await page.getByText('Display name', { exact: true }).click()
  await expect(displayName).toBeFocused()
  await expect(page.getByRole('button', { name: 'Save profile' })).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Avatar color' })).toBeVisible()
  const forestSage = page.getByRole('radio', { name: 'Forest sage' })
  await expect(forestSage).toBeChecked()
  await forestSage.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Eucalyptus' })).toBeChecked()
  await expect(page.getByRole('group', { name: 'How are you feeling?' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'calm' })).toBeChecked()

  await displayName.fill('Morgan Reed')
  await expect(page.locator('.settings-avatar-preview')).toHaveText('MR')
  await page.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Your changes were saved.')).toBeVisible()
  expect(patches.at(-1)).toMatchObject({ displayName: 'Morgan Reed' })

  await expect(page.getByText('1 week', { exact: true })).toBeVisible()
  await expect(page.locator('.settings-page')).not.toContainText('—')
})

test('settings rolls back failed moods, retries them, and stays contained on mobile', async ({ page }) => {
  await openSettings(page)

  const calm = page.getByRole('radio', { name: 'calm' })
  const anxious = page.getByRole('radio', { name: 'anxious' })
  await calm.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByText('Could not save your mood')).toBeVisible()
  await expect(calm).toBeChecked()
  await expect(anxious).not.toBeChecked()

  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText('Your mood was saved.')).toBeVisible()
  await expect(anxious).toBeChecked()

  const selectedMood = page.locator('label[for="settings-mood-anxious"]')
  await expect(selectedMood).toHaveCSS('color', 'rgb(41, 64, 53)')
  await expect(selectedMood).toHaveCSS('background-color', 'rgb(210, 228, 220)')
  const selectedStyle = await selectedMood.evaluate((label) => ({
    color: getComputedStyle(label).color,
    background: getComputedStyle(label).backgroundColor,
    weight: getComputedStyle(label).fontWeight,
  }))
  expect(selectedStyle.color).toBe('rgb(41, 64, 53)')
  expect(selectedStyle.background).toBe('rgb(210, 228, 220)')
  expect(Number(selectedStyle.weight)).toBeGreaterThanOrEqual(600)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileGeometry = await page.locator('.settings-page').evaluate((settingsPage) => {
    const layout = settingsPage.querySelector('.settings-layout')
    const grid = settingsPage.querySelector('.settings-mood-grid')
    const content = document.querySelector('.content').getBoundingClientRect()
    const choiceRects = [...grid.querySelectorAll('label')].map((label) => label.getBoundingClientRect())
    const swatchRects = [...settingsPage.querySelectorAll('.settings-color-swatch')].map((label) => label.getBoundingClientRect())
    return {
      columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
      moodColumns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      left: Math.min(...choiceRects.map((rect) => rect.left)),
      right: Math.max(...choiceRects.map((rect) => rect.right)),
      swatchLeft: Math.min(...swatchRects.map((rect) => rect.left)),
      swatchRight: Math.max(...swatchRects.map((rect) => rect.right)),
      contentLeft: content.left,
      contentRight: content.right,
    }
  })
  expect(mobileGeometry.columns).toBe(1)
  expect(mobileGeometry.moodColumns).toBe(2)
  expect(mobileGeometry.left).toBeGreaterThanOrEqual(mobileGeometry.contentLeft)
  expect(mobileGeometry.right).toBeLessThanOrEqual(mobileGeometry.contentRight)
  expect(mobileGeometry.swatchLeft).toBeGreaterThanOrEqual(mobileGeometry.contentLeft)
  expect(mobileGeometry.swatchRight).toBeLessThanOrEqual(mobileGeometry.contentRight)
})
