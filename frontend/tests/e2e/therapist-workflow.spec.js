import { expect, test } from '@playwright/test'

test('global therapist sharing and care history persist through the therapist workflow', async ({ page }) => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let createdAppointmentPayload = null
  let matchActive = true
  let privacySettings = { allowAiAccess: false, allowChatAccess: false, allowJournalAccess: false }
  let updatedAppointment = {
    id: 11,
    matchId: 15,
    title: 'Upcoming session',
    scheduledFor: future,
    durationMinutes: 50,
    timezone: 'UTC',
    status: 'confirmed',
    description: 'Discuss goals',
  }

  await page.addInitScript(() => {
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    window.localStorage.setItem('aurora_token', 'therapist-workflow-token')
    window.localStorage.setItem('aurora.activePage', 'therapist')
    window.localStorage.setItem('aurora.journal.daily-prompt', today)
  })

  await page.route('**/api/auth/me/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 21,
      username: 'care-user',
      firstName: 'Avery',
      hasInitialAssessment: true,
      hasCurrentPersonalityAssessment: true,
      personality: {},
      needsProfile: {
        basis: 'initial_assessment',
        updated: new Date().toISOString(),
        sources: { checkins: 1 },
        overall: 45,
        concerns: { anxiety: 60, stress: 55, burnout: 40, loneliness: 35, lowConfidence: 30, grief: 20 },
      },
    }),
  }))

  await page.route('**/api/journal/privacy/', async (route) => {
    if (route.request().method() === 'PATCH') {
      privacySettings = { ...privacySettings, ...route.request().postDataJSON() }
      await new Promise((resolve) => setTimeout(resolve, 120))
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(privacySettings),
    })
  })

  await page.route('**/api/therapist/matches/', async (route) => {
    if (route.request().method() === 'POST') matchActive = true
    const activeMatches = matchActive ? [{ id: 15, therapistId: 1, isActive: true }] : []
    const response = {
      match: { id: 15, therapistId: 1, isActive: matchActive },
      matches: activeMatches,
      therapistIds: activeMatches.map((match) => match.therapistId),
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) })
  })

  await page.route('**/api/therapist/matches/15/messages/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ messages: [] }),
  }))

  await page.route('**/api/therapist/matches/15/bookings/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      bookings: [
        { id: 4, matchId: 15, therapistId: 1, insuranceProvider: 'Aetna', memberId: 'ABC1234', status: 'requested', createdAt: new Date().toISOString() },
        { id: 3, matchId: 15, therapistId: 1, insuranceProvider: 'Cigna', memberId: '', status: 'confirmed', createdAt: past },
        { id: 2, matchId: 15, therapistId: 1, insuranceProvider: 'Other', memberId: '', status: 'cancelled', createdAt: past },
      ],
    }),
  }))

  await page.route('**/api/therapist/matches/15/bookings/4/', async (route) => {
    matchActive = false
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 4,
        matchId: 15,
        therapistId: 1,
        insuranceProvider: 'Aetna',
        memberId: 'ABC1234',
        status: 'cancelled',
        createdAt: new Date().toISOString(),
      }),
    })
  })

  await page.route('**/api/therapist/matches/15/appointments/', async (route) => {
    if (route.request().method() === 'POST') {
      createdAppointmentPayload = route.request().postDataJSON()
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 12,
          matchId: 15,
          ...createdAppointmentPayload,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
        }),
      })
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        appointments: [
          { id: 10, matchId: 15, title: 'Previous session', scheduledFor: past, durationMinutes: 50, timezone: 'UTC', status: 'confirmed', description: '' },
          updatedAppointment,
        ],
      }),
    })
  })

  await page.route('**/api/therapist/matches/15/appointments/11/', async (route) => {
    const payload = route.request().postDataJSON()
    updatedAppointment = payload.status === 'cancelled'
      ? { ...updatedAppointment, status: 'cancelled' }
      : { ...updatedAppointment, ...payload }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(updatedAppointment),
    })
  })

  await page.goto('/')
  const globalSharing = page.getByLabel('Global therapist privacy and data sharing')
  await expect(globalSharing).toHaveCount(1)
  await expect(globalSharing).toContainText('apply to every current and future therapist connection')
  const chatSharingToggle = globalSharing.getByRole('button', { name: 'Share AI chat logs with all therapists' })
  await expect(chatSharingToggle).toHaveAttribute('aria-pressed', 'false')
  await page.locator('.tm-page').evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)))
  const profileTopBefore = await page.locator('.tm-page').evaluate((element) => element.getBoundingClientRect().top)
  await chatSharingToggle.click()
  await expect(chatSharingToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(globalSharing.getByText('Saving changes…')).toBeVisible()
  await expect(page.getByText('Saving your sharing preferences…')).toHaveCount(0)
  const profileTopDuringSave = await page.locator('.tm-page').evaluate((element) => element.getBoundingClientRect().top)
  expect(Math.abs(profileTopDuringSave - profileTopBefore)).toBeLessThan(1)
  await expect(chatSharingToggle).toBeEnabled()
  expect(privacySettings.allowChatAccess).toBe(true)
  const journalSharingToggle = globalSharing.getByRole('button', { name: 'Share journal history with all therapists' })
  await journalSharingToggle.click()
  await expect(journalSharingToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(globalSharing.getByText('Saving changes…')).toBeVisible()
  const profileTopDuringJournalSave = await page.locator('.tm-page').evaluate((element) => element.getBoundingClientRect().top)
  expect(Math.abs(profileTopDuringJournalSave - profileTopBefore)).toBeLessThan(1)
  await expect(journalSharingToggle).toBeEnabled()
  expect(privacySettings.allowJournalAccess).toBe(true)
  await expect(page.getByText('Exactly what your therapist can see')).toHaveCount(0)
  await page.getByRole('button', { name: /Find a Therapist/ }).click()
  await page.getByRole('button', { name: 'Select state' }).click()
  await page.locator('.aurora-dropdown-item').filter({ hasText: 'CA' }).click()
  await page.getByRole('button', { name: 'Select insurance provider' }).click()
  await page.locator('.aurora-dropdown-item').filter({ hasText: 'Aetna' }).click()
  await page.getByRole('button', { name: /Show my matches/ }).click()

  const connectedResult = page.getByRole('button', { name: 'Open existing chat with Dr. Priya Sharma' })
  await expect(connectedResult).toHaveText('Open chat')
  await expect(page.getByText('Already connected', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /Preferences/ }).click()
  await expect(page.getByRole('button', { name: 'Select state' })).toContainText('CA')
  await expect(page.getByRole('button', { name: 'Select insurance provider' })).toContainText('Aetna')
  await page.getByRole('button', { name: /Show my matches/ }).click()
  await connectedResult.click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('heading', { name: /Your top/ })).toBeVisible()
  await page.getByRole('button', { name: /Preferences/ }).click()
  await page.getByRole('button', { name: /Needs Profile/ }).click()
  await page.getByRole('button', { name: 'Open chat' }).click()

  await page.getByRole('button', { name: /Care history/ }).click()
  const careHistory = page.getByRole('region', { name: 'Connection requests and appointments' })
  await expect(page.getByRole('heading', { name: 'Connection requests' })).toBeVisible()
  await expect(careHistory.getByText('Upcoming session')).toBeVisible()
  await expect(careHistory.getByText('Previous session')).toBeVisible()

  const requestedBooking = careHistory.locator('.tm-care-item').filter({ hasText: 'Aetna' })
  await expect(requestedBooking.getByText('requested', { exact: true })).toBeVisible()
  await expect(careHistory.getByRole('button', { name: 'Cancel connection' })).toHaveCount(0)

  const upcomingAppointment = careHistory.locator('.tm-care-item').filter({ hasText: 'Upcoming session' })
  await upcomingAppointment.getByRole('button', { name: 'Edit' }).click()
  let appointmentForm = page.locator('.tm-appt-form')
  await appointmentForm.getByLabel('Title').fill('Updated session')
  await appointmentForm.getByRole('button', { name: 'Review date and time' }).click()
  await appointmentForm.getByRole('button', { name: 'Confirm and save' }).click()
  await expect(page.getByText('Appointment updated.')).toBeVisible()

  await page.getByRole('button', { name: /Care history/ }).click()
  const updatedItem = page.getByRole('region', { name: 'Connection requests and appointments' })
    .locator('.tm-care-item')
    .filter({ hasText: 'Updated session' })
  await updatedItem.getByRole('button', { name: 'Cancel' }).click()
  await updatedItem.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(updatedItem.getByText('cancelled', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Schedule appointment' }).click()
  appointmentForm = page.locator('.tm-appt-form')
  await appointmentForm.getByLabel('Title').fill('New consultation')
  await appointmentForm.getByLabel('Date and time').fill('2099-06-15T10:30')
  await appointmentForm.getByLabel('Duration').selectOption('60')
  await expect(appointmentForm.getByText(/Times are shown and saved in/)).toBeVisible()
  await appointmentForm.getByRole('button', { name: 'Review date and time' }).click()

  await expect(appointmentForm.getByText('Confirm appointment details')).toBeVisible()
  await expect(appointmentForm.getByText('New consultation')).toBeVisible()
  await expect(appointmentForm.getByText(/60 minutes/)).toBeVisible()
  await appointmentForm.getByRole('button', { name: 'Confirm and save' }).click()

  await expect(page.getByText('Appointment confirmed and saved.')).toBeVisible()
  expect(createdAppointmentPayload.title).toBe('New consultation')
  expect(createdAppointmentPayload.durationMinutes).toBe(60)
  expect(createdAppointmentPayload.timezone).toBeTruthy()
  expect(createdAppointmentPayload.scheduledFor).toContain('2099-06-15')

  const cancelConnection = page.getByRole('button', { name: 'Cancel connection' })
  await expect(cancelConnection).toBeVisible()
  await cancelConnection.click()
  const cancellationConfirmation = page.getByRole('region', { name: 'Cancel connection request' })
  await expect(cancellationConfirmation).toContainText('will be removed from Active Therapist Chats')
  await cancellationConfirmation.getByRole('button', { name: 'Confirm cancellation' }).click()

  await expect(page.locator('.tm-chat-root--leaving')).toHaveCount(0)
  await expect(page.getByText('No active therapist chats')).toBeVisible()
  await expect(page.locator('.tm-active-row')).toHaveCount(0)
  expect(matchActive).toBe(false)
})
