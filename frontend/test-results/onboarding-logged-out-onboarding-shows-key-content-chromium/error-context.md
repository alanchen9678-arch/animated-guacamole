# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: onboarding.spec.js >> logged-out onboarding shows key content
- Location: tests\e2e\onboarding.spec.js:9:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Get started free' })
Expected: visible
Error: strict mode violation: getByRole('button', { name: 'Get started free' }) resolved to 2 elements:
    1) <button class="btn-primary-lg">Get started free</button> aka getByRole('button', { name: 'Get started free' }).first()
    2) <button class="btn-primary-lg">Get started free</button> aka getByLabel('Ready when you are.').getByRole('button', { name: 'Get started free' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Get started free' })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - button "Aurora" [ref=e7] [cursor=pointer]:
      - generic [ref=e8]:
        - generic [ref=e9]: A
        - generic [ref=e10]: u
        - generic [ref=e11]: r
        - generic [ref=e12]: o
        - generic [ref=e13]: r
        - generic [ref=e14]: a
  - generic [ref=e15]:
    - generic [ref=e16]:
      - generic [ref=e17]:
        - heading "Your calm, always-on mental wellness companion." [level=1] [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]: Your
            - generic [ref=e21]: calm,
            - generic [ref=e22]: always-on
            - generic [ref=e23]: mental
            - generic [ref=e24]: wellness
            - generic [ref=e25]: companion.
        - generic [ref=e26]:
          - button "Get started free" [ref=e27] [cursor=pointer]
          - button "Log in" [ref=e28] [cursor=pointer]
      - generic "Aurora daily reflection preview" [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]: Aurora
          - generic [ref=e32]: Today
        - generic [ref=e33]:
          - generic [ref=e34]:
            - paragraph [ref=e35]: Today's journal prompt
            - paragraph [ref=e36]: What would support look like for you right now?
          - generic "Aurora tools" [ref=e37]:
            - generic [ref=e38]:
              - generic [ref=e39]: Mood
              - strong [ref=e40]: Pick a mood
            - generic [ref=e41]:
              - generic [ref=e42]: Journal
              - strong [ref=e43]: Private
            - generic [ref=e44]:
              - generic [ref=e45]: Check-in
              - strong [ref=e46]: Due this week
    - region "Support for the way you feel, reflect, and connect." [ref=e47]:
      - generic [ref=e48]:
        - heading "Support for the way you feel, reflect, and connect." [level=2] [ref=e49]
        - paragraph [ref=e50]: Aurora brings private reflection, guided check-ins, trusted care, and community into one calm workspace.
      - generic [ref=e51]:
        - article [ref=e52]:
          - generic [ref=e53]:
            - heading "AI Chatbot" [level=3] [ref=e54]
            - paragraph [ref=e55]: Talk through what's on your mind with Aurora's AI, available around the clock.
          - img "A focused Aurora conversation with a compact message composer" [ref=e56]:
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]:
                  - generic [ref=e61]: A
                  - generic [ref=e62]:
                    - generic [ref=e63]: Aurora
                    - paragraph [ref=e64]: What feels most present for you today?
                - generic [ref=e66]:
                  - generic [ref=e67]: You
                  - paragraph [ref=e68]: I have a lot on my mind and I am not sure where to begin.
                - generic [ref=e69]:
                  - generic [ref=e70]: A
                  - generic [ref=e71]:
                    - generic [ref=e72]: Aurora
                    - paragraph [ref=e73]: We can take it one piece at a time. What would feel helpful to name first?
              - generic [ref=e74]:
                - generic [ref=e75]: Message Aurora...
                - generic [ref=e76]: Send
        - article [ref=e77]:
          - generic [ref=e78]:
            - heading "Check-Ins" [level=3] [ref=e79]
            - paragraph [ref=e80]: Quick daily surveys that monitor your mental wellness and flag changes early.
          - img "A weekly check-in question with a seven-point scale and streak summary" [ref=e81]:
            - generic [ref=e83]:
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - generic [ref=e86]: Weekly check-in
                  - strong [ref=e87]: 4 of 12
                - paragraph [ref=e88]: How manageable have your responsibilities felt this week?
                - generic [ref=e89]:
                  - generic [ref=e90]: "1"
                  - generic [ref=e91]: "2"
                  - generic [ref=e92]: "3"
                  - generic [ref=e93]: "4"
                  - generic [ref=e94]: "5"
                  - generic [ref=e95]: "6"
                  - generic [ref=e96]: "7"
                - generic [ref=e97]:
                  - generic [ref=e98]: Not at all
                  - generic [ref=e99]: Completely
              - generic [ref=e100]:
                - strong [ref=e101]: "4"
                - generic [ref=e102]: week streak
                - generic [ref=e103]: Last check-in Friday
        - article [ref=e104]:
          - generic [ref=e105]:
            - heading "Thought Journal" [level=3] [ref=e106]
            - paragraph [ref=e107]: A private, open-ended space to process your feelings and daily experiences.
          - img "A journal notebook paired with a mood calendar" [ref=e108]:
            - generic [ref=e110]:
              - generic [ref=e111]:
                - generic [ref=e112]:
                  - strong [ref=e113]: June
                  - generic [ref=e114]: Mood history
                - generic [ref=e115]:
                  - generic [ref=e116]:
                    - generic [ref=e117]: M
                    - strong [ref=e118]: "10"
                  - generic [ref=e120]:
                    - generic [ref=e121]: T
                    - strong [ref=e122]: "11"
                  - generic [ref=e124]:
                    - generic [ref=e125]: W
                    - strong [ref=e126]: "12"
                  - generic [ref=e128]:
                    - generic [ref=e129]: T
                    - strong [ref=e130]: "13"
                  - generic [ref=e132]:
                    - generic [ref=e133]: F
                    - strong [ref=e134]: "14"
              - generic [ref=e136]:
                - generic [ref=e138]:
                  - generic [ref=e139]:
                    - generic [ref=e140]: Today's entry
                    - strong [ref=e141]: Friday, June 14
                  - paragraph [ref=e142]: What helped you feel more grounded today?
                  - generic [ref=e143]: I took a quiet walk after work and noticed...
                - generic [ref=e144]:
                  - strong [ref=e145]: Write
                  - generic [ref=e146]: Doodle
        - article [ref=e147]:
          - generic [ref=e148]:
            - heading "Therapist Match" [level=3] [ref=e149]
            - paragraph [ref=e150]: Get paired with a licensed professional whose style and focus suit your needs.
          - img "A therapist profile with fit score, connection action, and separate scheduling information" [ref=e151]:
            - generic [ref=e153]:
              - generic [ref=e154]:
                - generic [ref=e155]:
                  - generic [ref=e156]: PS
                  - generic [ref=e157]:
                    - strong [ref=e158]: Dr. Priya Sharma
                    - generic [ref=e159]: PhD, LMFT San Francisco, CA
                - generic [ref=e160]:
                  - generic [ref=e161]: Fit score
                  - strong [ref=e162]: "94.2"
                - generic [ref=e163]:
                  - generic [ref=e164]: Anxiety
                  - generic [ref=e165]: Stress
                  - generic [ref=e166]: Burnout
                - generic [ref=e167]: Connect with therapist
              - generic [ref=e168]:
                - generic [ref=e169]:
                  - generic [ref=e170]: Self-scheduling
                  - strong [ref=e171]: Available after connecting
                - generic [ref=e172]: Tomorrow
        - article [ref=e173]:
          - generic [ref=e174]:
            - heading "Peer Support" [level=3] [ref=e175]
            - paragraph [ref=e176]: Connect anonymously with others who understand what you're going through.
          - img "An anonymous peer support identity with a support room and peer connections" [ref=e177]:
            - generic [ref=e179]:
              - generic [ref=e180]:
                - generic [ref=e181]: QC
                - generic [ref=e182]:
                  - strong [ref=e183]: Quiet Cedar
                  - generic [ref=e184]: Your anonymous identity
              - generic [ref=e185]:
                - generic [ref=e186]:
                  - generic [ref=e187]: Room
                  - generic [ref=e188]:
                    - strong [ref=e189]: Shared experiences
                    - generic [ref=e190]: 38 members
                  - generic [ref=e191]: Join
                - generic [ref=e192]:
                  - generic [ref=e193]: CR
                  - generic [ref=e194]:
                    - strong [ref=e195]: Calm River
                    - generic [ref=e196]: Active anonymous chat
                  - generic [ref=e197]: Message
                - generic [ref=e198]:
                  - generic [ref=e199]: GS
                  - generic [ref=e200]:
                    - strong [ref=e201]: Gentle Stone
                    - generic [ref=e202]: Peer match
                  - generic [ref=e203]: Connect
        - article [ref=e204]:
          - generic [ref=e205]:
            - heading "Info Library" [level=3] [ref=e206]
            - paragraph [ref=e207]: Explore clear guides to common mental health conditions, then test your understanding with a short quiz.
          - img "Mental health library topics paired with a short knowledge check" [ref=e208]:
            - generic [ref=e210]:
              - generic [ref=e211]:
                - generic [ref=e212]:
                  - generic [ref=e213]: Library
                  - strong [ref=e214]: Explore by topic
                - generic [ref=e215]:
                  - generic [ref=e216]:
                    - strong [ref=e217]: Anxiety
                    - generic [ref=e218]: Symptoms and support
                  - generic [ref=e219]: Read
                - generic [ref=e220]:
                  - generic [ref=e221]:
                    - strong [ref=e222]: Burnout
                    - generic [ref=e223]: Stress and recovery
                  - generic [ref=e224]: Read
                - generic [ref=e225]:
                  - generic [ref=e226]:
                    - strong [ref=e227]: Grief
                    - generic [ref=e228]: Understanding loss
                  - generic [ref=e229]: Read
              - generic [ref=e230]:
                - generic [ref=e231]:
                  - generic [ref=e232]: Knowledge check
                  - strong [ref=e233]: 3 of 8
                - paragraph [ref=e234]: Which response can help bring attention back to the present moment?
                - generic [ref=e235]:
                  - generic [ref=e236]: Ignore the feeling
                  - generic [ref=e237]: Name five things you can see
                - generic [ref=e238]:
                  - strong [ref=e239]: Correct
                  - generic [ref=e240]: Grounding can gently redirect attention to the present.
    - region "Ready when you are." [ref=e241]:
      - generic [ref=e242]:
        - heading "Ready when you are." [level=2] [ref=e243]
        - paragraph [ref=e244]: Create your private Aurora space.
      - button "Get started free" [ref=e245] [cursor=pointer]
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | test.beforeEach(async ({ page }) => {
  4   |   await page.addInitScript(() => {
  5   |     window.localStorage.removeItem('aurora_token')
  6   |   })
  7   | })
  8   | 
  9   | test('logged-out onboarding shows key content', async ({ page }) => {
  10  |   await page.goto('/')
  11  | 
  12  |   await expect(page.getByRole('heading', { name: /your calm, always-on mental wellness companion\./i })).toBeVisible()
> 13  |   await expect(page.getByRole('button', { name: 'Get started free' })).toBeVisible()
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  14  |   await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible()
  15  |   await expect(page.getByRole('heading', { name: 'Support for the way you feel, reflect, and connect.' })).toBeVisible()
  16  |   await expect(page.getByRole('heading', { name: 'AI Chatbot', exact: true })).toBeVisible()
  17  |   await expect(page.getByRole('heading', { name: 'Check-Ins', exact: true })).toBeVisible()
  18  |   await expect(page.locator('.feature-story')).toHaveCount(6)
  19  | 
  20  |   const featureVignettes = page.locator('.feature-vignette')
  21  |   await featureVignettes.last().scrollIntoViewIfNeeded()
  22  |   await expect(featureVignettes).toHaveCount(6)
  23  |   await expect(page.locator('.feature-story-visual[aria-label]')).toHaveCount(6)
  24  |   await expect(page.locator('.feature-story-visual img')).toHaveCount(0)
  25  | })
  26  | 
  27  | test('feature stories keep their desktop rhythm and collapse safely on mobile', async ({ page }) => {
  28  |   await page.setViewportSize({ width: 1440, height: 960 })
  29  |   await page.goto('/')
  30  | 
  31  |   const desktopLayout = await page.locator('.feature-story').evaluateAll((stories) => stories.slice(0, 3).map((story) => {
  32  |     const copy = story.querySelector('.feature-story-copy').getBoundingClientRect()
  33  |     const visual = story.querySelector('.feature-story-visual').getBoundingClientRect()
  34  |     return { copyX: copy.x, copyWidth: copy.width, visualX: visual.x, visualWidth: visual.width }
  35  |   }))
  36  | 
  37  |   expect(desktopLayout[0].copyX).toBeLessThan(desktopLayout[0].visualX)
  38  |   expect(desktopLayout[1].visualX).toBeLessThan(desktopLayout[1].copyX)
  39  |   expect(desktopLayout[2].visualWidth).toBeGreaterThan(desktopLayout[2].copyWidth)
  40  | 
  41  |   const journalDimensions = await page.locator('.feature-story-visual--journal').evaluate((visual) => {
  42  |     const bounds = visual.getBoundingClientRect()
  43  |     return { width: bounds.width, height: bounds.height }
  44  |   })
  45  |   expect(journalDimensions.width / journalDimensions.height).toBeGreaterThan(2.5)
  46  | 
  47  |   await page.emulateMedia({ reducedMotion: 'reduce' })
  48  |   await page.setViewportSize({ width: 390, height: 844 })
  49  |   await page.reload()
  50  |   await page.locator('.feature-story').last().scrollIntoViewIfNeeded()
  51  | 
  52  |   const mobileAudit = await page.evaluate(() => ({
  53  |     overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  54  |     transforms: [...document.querySelectorAll('.feature-story-copy')].map((element) => getComputedStyle(element).transform),
  55  |     opacity: [...document.querySelectorAll('.feature-story-copy')].map((element) => getComputedStyle(element).opacity),
  56  |   }))
  57  | 
  58  |   expect(mobileAudit.overflow).toBeLessThanOrEqual(1)
  59  |   expect(mobileAudit.transforms.every((value) => value === 'none')).toBe(true)
  60  |   expect(mobileAudit.opacity.every((value) => value === '1')).toBe(true)
  61  | })
  62  | 
  63  | test('log in button opens the auth dialog in login mode', async ({ page }) => {
  64  |   await page.goto('/')
  65  | 
  66  |   await page.getByRole('button', { name: 'Log in' }).click()
  67  | 
  68  |   const authCard = page.locator('.auth-card')
  69  | 
  70  |   await expect(authCard.getByRole('button', { name: 'Log in', exact: true }).first()).toBeVisible()
  71  |   await expect(authCard.getByRole('button', { name: 'Sign up', exact: true })).toBeVisible()
  72  |   await expect(authCard.locator('input[name="username"]')).toBeVisible()
  73  |   await expect(authCard.locator('input[name="password"]')).toBeVisible()
  74  | })
  75  | 
  76  | test('get started free opens the auth dialog in signup mode', async ({ page }) => {
  77  |   await page.goto('/')
  78  | 
  79  |   await page.getByRole('button', { name: 'Get started free' }).click()
  80  | 
  81  |   const authCard = page.locator('.auth-card')
  82  | 
  83  |   await expect(authCard.getByRole('button', { name: 'Create account' })).toBeVisible()
  84  |   await expect(authCard.locator('input[name="firstName"]')).toBeVisible()
  85  |   await expect(authCard.locator('input[name="username"]')).toBeVisible()
  86  |   await expect(authCard.locator('input[name="confirm"]')).toBeVisible()
  87  | })
  88  | 
  89  | test('restored sessions show a loading state instead of flashing logged-out content', async ({ page }) => {
  90  |   let releaseProfile
  91  |   const profileGate = new Promise((resolve) => { releaseProfile = resolve })
  92  |   await page.addInitScript(() => {
  93  |     window.localStorage.setItem('aurora_token', 'restored-test-token')
  94  |   })
  95  |   await page.route('**/api/auth/me/', async (route) => {
  96  |     await profileGate
  97  |     await route.fulfill({
  98  |       status: 200,
  99  |       contentType: 'application/json',
  100 |       body: JSON.stringify({
  101 |         username: 'restored-user',
  102 |         firstName: 'Avery',
  103 |         hasInitialAssessment: true,
  104 |         hasCurrentPersonalityAssessment: true,
  105 |         needsProfile: null,
  106 |       }),
  107 |     })
  108 |   })
  109 | 
  110 |   await page.goto('/')
  111 | 
  112 |   await expect(page.getByText('Loading Aurora…', { exact: true })).toBeVisible()
  113 |   await expect(page.getByRole('button', { name: 'Get started free' })).toBeHidden()
```