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
  { id: 'home', label: 'Home', component: Home },
  { id: 'chatbot', label: 'Chatbot', component: Chatbot },
  { id: 'checkins', label: 'Check-Ins', component: CheckIns },
  { id: 'journal', label: 'Journal', component: Journal },
  { id: 'therapist', label: 'Therapist Match', component: TherapistMatch },
  { id: 'community', label: 'Peer Support', component: PeerSupport },
  { id: 'library', label: 'Info Library', component: InfoLibrary },
  { id: 'settings', label: 'Settings', component: Settings },
]
