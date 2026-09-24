import { lazy } from 'react'
import Home from '../pages/Home.jsx'

const Chatbot = lazy(() => import('../pages/Chatbot.jsx'))
const CheckIns = lazy(() => import('../pages/CheckIns.jsx'))
const Journal = lazy(() => import('../pages/Journal.jsx'))
const TherapistMatch = lazy(() => import('../pages/TherapistMatch.jsx'))
const PeerSupport = lazy(() => import('../pages/PeerSupport.jsx'))
const InfoLibrary = lazy(() => import('../pages/InfoLibrary.jsx'))
const Settings = lazy(() => import('../pages/Settings.jsx'))

export const pageConfig = [
  { id: 'home', path: '/app/home', label: 'Home', component: Home },
  { id: 'chatbot', path: '/app/chatbot', label: 'Chatbot', component: Chatbot },
  { id: 'checkins', path: '/app/check-ins', label: 'Check-Ins', component: CheckIns },
  { id: 'journal', path: '/app/journal', label: 'Journal', component: Journal },
  { id: 'therapist', path: '/app/therapist-match', label: 'Therapist Match', component: TherapistMatch },
  { id: 'community', path: '/app/peer-support', label: 'Peer Support', component: PeerSupport },
  { id: 'library', path: '/app/library', label: 'Info Library', component: InfoLibrary },
  { id: 'settings', path: '/app/settings', label: 'Settings', component: Settings },
]

export const PAGE_PATHS = Object.fromEntries(pageConfig.map(({ id, path }) => [id, path]))

const NESTED_PAGE_MATCHERS = [
  { id: 'library', pattern: /^\/app\/library\/quiz$/ },
  { id: 'therapist', pattern: /^\/app\/therapist-match\/chats\/[^/]+$/ },
  { id: 'community', pattern: /^\/app\/peer-support\/(?:rooms|messages)\/[^/]+$/ },
]

export function getPageIdFromPath(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  if (normalizedPath === '/' || normalizedPath === '/login' || normalizedPath === '/register') return 'home'
  if (normalizedPath === '/app') return 'home'

  const matchedPage = pageConfig.find(({ path }) => normalizedPath === path)
  if (matchedPage) return matchedPage.id

  return NESTED_PAGE_MATCHERS.find(({ pattern }) => pattern.test(normalizedPath))?.id ?? null
}

export function isAppPath(pathname) {
  return pathname === '/app' || pathname.startsWith('/app/')
}
