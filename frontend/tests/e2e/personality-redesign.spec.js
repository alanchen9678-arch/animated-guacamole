import { expect, test } from '@playwright/test'

test('initial assessment stores continuous signals without revealing a personality type', async ({ page }) => {
  test.setTimeout(60_000)

  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'personality-v2-token')
    window.localStorage.setItem('aurora.activePage', 'checkins')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })

  const user = {
    id: 61,
    username: 'signal-user',
    firstName: 'Avery',
    hasInitialAssessment: false,
    personality: {},
    needsProfile: null,
  }
  let submittedPayload = null

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(user),
  }))
  await page.route('**/api/checkins/', async (route) => {
    if (route.request().method() === 'POST') {
      submittedPayload = route.request().postDataJSON()
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: [{ id: 1, type: 'initial', date: '2026-09-05', qIds: submittedPayload.qIds, scores: submittedPayload.scores }],
          streak: 0,
          lastCheckInDate: '2026-09-05',
          dueThisWeek: false,
          hasInitialAssessment: true,
          personality: submittedPayload.personality,
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        history: [],
        streak: 0,
        lastCheckInDate: null,
        dueThisWeek: false,
        hasInitialAssessment: false,
      }),
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: 'Start initial assessment' }).click()
  await expect(page.getByText(/general personalization signals/)).toBeVisible()
  await expect(page.getByText(/personality type/i)).toHaveCount(0)
  await page.getByRole('button', { name: /Begin/ }).click()

  for (let question = 1; question <= 10; question += 1) {
    await expect(page.getByText(`Question ${question} of 40`)).toBeVisible()
    await page.getByRole('button', { name: '4', exact: true }).click()
  }

  await expect(page.getByText('Being around other people often gives me a boost of energy.')).toBeVisible()
  await expect(page.getByText('Personalization', { exact: true })).toBeVisible()

  for (let question = 11; question <= 40; question += 1) {
    await expect(page.getByText(`Question ${question} of 40`)).toBeVisible()
    await page.getByRole('button', { name: 'Somewhat like me', exact: true }).click()
  }

  await expect(page.getByRole('heading', { name: 'Thanks — your check-in is complete.' })).toBeVisible()
  await expect(page.getByText(/general personalization signals, not as a diagnosis/)).toBeVisible()
  await expect(page.locator('.ci-personality-card')).toHaveCount(0)
  await expect(page.getByText(/The Architect|The Creator|The Helper/)).toHaveCount(0)

  expect(submittedPayload.personality.schemaVersion).toBe(2)
  expect(submittedPayload.personality.instrument).toBe('aurora-personality-v2')
  expect(submittedPayload.personality).not.toHaveProperty('id')
  expect(submittedPayload.personality).not.toHaveProperty('name')
  expect(submittedPayload.personality).not.toHaveProperty('category')
  expect(Object.keys(submittedPayload.personality.dimensions)).toEqual([
    'socialEnergy',
    'cooperationTrust',
    'selfManagement',
    'emotionalRecovery',
    'opennessCuriosity',
  ])
  for (const dimension of Object.values(submittedPayload.personality.dimensions)) {
    expect(dimension.score).toBe(3)
    expect(dimension.signalStrength).toBe('weak')
  }
})
