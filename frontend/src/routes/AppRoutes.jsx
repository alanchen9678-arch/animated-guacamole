import Home from '../pages/Home.jsx'
import Chatbot from '../pages/Chatbot.jsx'
import CheckIns from '../pages/CheckIns.jsx'
import Journal from '../pages/Journal.jsx'
import TherapistMatch from '../pages/TherapistMatch.jsx'
import PeerSupport from '../pages/PeerSupport.jsx'
import InfoLibrary from '../pages/InfoLibrary.jsx'
import Settings from '../pages/Settings.jsx'

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
