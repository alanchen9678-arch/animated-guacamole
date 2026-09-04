import { expect, test } from '@playwright/test'

test('therapist care history supports cancellation and confirms appointment details before saving', async ({ page }) => {
  const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  let createdAppointmentPayload = null
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

  await page.route('**/api/journal/privacy/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ allowAiAccess: false, allowChatAccess: false, allowJournalAccess: false }),
  }))

  await page.route('**/api/therapist/sharing-preview/', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      needsProfile: { basis: 'initial_assessment', overall: 45 },
      checkIns: [{ id: 1, type: 'initial', date: '2026-08-01', scores: { anxiety: 60 } }],
      journal: { allowed: false, rangeDays: 30, entries: [] },
      chat: { allowed: false, rangeDays: 7, messages: [] },
    }),
  }))

  await page.route('**/api/therapist/matches/', async (route) => {
    const response = { match: { id: 15, therapistId: 1 }, matches: [{ id: 15, therapistId: 1 }], therapistIds: [1] }
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
  await page.getByText('Exactly what your therapist can see').click()
  await expect(page.getByText('Initial assessment · 2026-08-01')).toBeVisible()
  await expect(page.getByText('Journal · last 30 days')).toBeVisible()
  await expect(page.getByText('AI chat · last 7 days')).toBeVisible()
  await page.getByRole('button', { name: 'Open chat' }).click()

  await page.getByRole('button', { name: /Care history/ }).click()
  const careHistory = page.getByRole('region', { name: 'Booking requests and appointments' })
  await expect(page.getByRole('heading', { name: 'Booking requests' })).toBeVisible()
  await expect(careHistory.getByText('Upcoming session')).toBeVisible()
  await expect(careHistory.getByText('Previous session')).toBeVisible()

  const requestedBooking = careHistory.locator('.tm-care-item').filter({ hasText: 'Aetna' })
  await requestedBooking.getByRole('button', { name: 'Cancel request' }).click()
  await requestedBooking.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(requestedBooking.getByText('cancelled', { exact: true })).toBeVisible()

  const upcomingAppointment = careHistory.locator('.tm-care-item').filter({ hasText: 'Upcoming session' })
  await upcomingAppointment.getByRole('button', { name: 'Edit' }).click()
  let appointmentForm = page.locator('.tm-appt-form')
  await appointmentForm.getByLabel('Title').fill('Updated session')
  await appointmentForm.getByRole('button', { name: 'Review date and time' }).click()
  await appointmentForm.getByRole('button', { name: 'Confirm and save' }).click()
  await expect(page.getByText('Appointment updated.')).toBeVisible()

  await page.getByRole('button', { name: /Care history/ }).click()
  const updatedItem = page.getByRole('region', { name: 'Booking requests and appointments' })
    .locator('.tm-care-item')
    .filter({ hasText: 'Updated session' })
  await updatedItem.getByRole('button', { name: 'Cancel' }).click()
  await updatedItem.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(updatedItem.getByText('cancelled', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: '+ Appointment' }).click()
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
})
