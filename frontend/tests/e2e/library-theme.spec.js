import { expect, test } from '@playwright/test'

test('library uses the assigned topic palette without streak behavior', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('aurora_token', 'library-theme-token')
    window.localStorage.setItem('aurora.activePage', 'library')
  })
  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 43,
      username: 'library-user',
      firstName: 'Avery',
      displayName: 'Avery',
      mood: 'calm',
      streak: 6,
      checkInDueThisWeek: false,
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: null,
    }),
  }))

  const progressRequests = []
  page.on('request', (request) => {
    if (request.url().includes('/api/library/progress/')) {
      progressRequests.push(request)
    }
  })

  await page.goto('/')

  const expectedColors = [
    ['Anxiety Disorders', 'rgb(154, 107, 42)'],
    ['Depression', 'rgb(58, 104, 152)'],
    ['Bipolar Disorder', 'rgb(115, 93, 143)'],
    ['Post-Traumatic Stress Disorder (PTSD)', 'rgb(185, 101, 53)'],
    ['Schizophrenia', 'rgb(165, 79, 79)'],
    ['Eating Disorders', 'rgb(168, 95, 120)'],
    ['Oppositional Defiant Disorder (ODD)', 'rgb(77, 107, 88)'],
    ['Neurodevelopmental Disorders', 'rgb(63, 119, 115)'],
  ]

  await expect(page.locator('.il-card')).toHaveCount(expectedColors.length)
  for (const [title, color] of expectedColors) {
    const card = page.locator('.il-card', { hasText: title })
    await expect(card.locator('.il-card-dot')).toHaveCSS('background-color', color)
  }

  await expect(page.locator('.il-streak-badge')).toHaveCount(0)
  await expect(page.getByText('day streak')).toHaveCount(0)
  expect(progressRequests).toHaveLength(0)
})
