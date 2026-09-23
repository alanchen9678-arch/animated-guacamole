import { AvatarSymbol, DawnHarborAvatar } from '../ui/avatar-symbols.jsx'

const MOOD_DAYS = [
  { day: 'M', date: '10', mood: 'calm' },
  { day: 'T', date: '11', mood: 'happy' },
  { day: 'W', date: '12', mood: 'neutral' },
  { day: 'T', date: '13', mood: 'anxious' },
  { day: 'F', date: '14', mood: 'calm', current: true },
]

function ChatbotVignette() {
  return (
    <div className='fv-chat' aria-hidden='true'>
      <div className='fv-chat-thread'>
        <div className='fv-chat-row fv-chat-row--dawn-harbor'>
          <span className='fv-avatar fv-avatar--dawn-harbor'><DawnHarborAvatar size={18} /></span>
          <div className='fv-message fv-message--dawn-harbor'>
            <span className='fv-speaker'>Dawn Harbor</span>
            <p>What feels most present for you today?</p>
          </div>
        </div>

        <div className='fv-chat-row fv-chat-row--user'>
          <div className='fv-message fv-message--user'>
            <span className='fv-speaker'>You</span>
            <p>I have a lot on my mind and I am not sure where to begin.</p>
          </div>
        </div>

        <div className='fv-chat-row fv-chat-row--dawn-harbor'>
          <span className='fv-avatar fv-avatar--dawn-harbor'><DawnHarborAvatar size={18} /></span>
          <div className='fv-message fv-message--dawn-harbor'>
            <span className='fv-speaker'>Dawn Harbor</span>
            <p>We can take it one piece at a time. What would feel helpful to name first?</p>
          </div>
        </div>
      </div>

      <div className='fv-composer'>
        <span>Message Dawn Harbor...</span>
        <span className='fv-send'>Send</span>
      </div>
    </div>
  )
}

function CheckInsVignette() {
  return (
    <div className='fv-checkins' aria-hidden='true'>
      <div className='fv-checkin-question'>
        <div className='fv-checkin-meta'>
          <span>Weekly check-in</span>
          <strong>4 of 12</strong>
        </div>
        <p className='fv-question'>How manageable have your responsibilities felt this week?</p>
        <div className='fv-scale'>
          {[1, 2, 3, 4, 5, 6, 7].map((value) => (
            <span className={value === 5 ? 'fv-scale-choice fv-scale-choice--selected' : 'fv-scale-choice'} key={value}>
              {value}
            </span>
          ))}
        </div>
        <div className='fv-scale-labels'>
          <span>Not at all</span>
          <span>Completely</span>
        </div>
      </div>

      <div className='fv-streak'>
        <strong>4</strong>
        <span>week streak</span>
        <small>Last check-in Friday</small>
      </div>
    </div>
  )
}

function JournalVignette() {
  return (
    <div className='fv-journal' aria-hidden='true'>
      <div className='fv-calendar'>
        <div className='fv-calendar-heading'>
          <strong>June</strong>
          <span>Mood history</span>
        </div>
        <div className='fv-calendar-week'>
          {MOOD_DAYS.map(({ day, date, mood, current }) => (
            <div className={current ? 'fv-calendar-day fv-calendar-day--current' : 'fv-calendar-day'} key={`${day}-${date}`}>
              <span>{day}</span>
              <strong>{date}</strong>
              <i className={`fv-mood fv-mood--${mood}`} />
            </div>
          ))}
        </div>
      </div>

      <div className='fv-notebook'>
        <div className='fv-notebook-margin' />
        <div className='fv-notebook-copy'>
          <div className='fv-notebook-heading'>
            <span>Today's entry</span>
            <strong>Friday, June 14</strong>
          </div>
          <p>What helped you feel more grounded today?</p>
          <span className='fv-notebook-cursor'>I took a quiet walk after work and noticed...</span>
        </div>
        <div className='fv-journal-modes'>
          <strong>Write</strong>
          <span>Doodle</span>
        </div>
      </div>
    </div>
  )
}

function TherapistVignette() {
  return (
    <div className='fv-therapist' aria-hidden='true'>
      <div className='fv-therapist-profile'>
        <div className='fv-therapist-person'>
          <span className='fv-avatar fv-avatar--therapist'><AvatarSymbol symbol='provider-sprig' size={28} /></span>
          <div>
            <strong>Priya Sharma</strong>
            <span>Sample therapist profile<br />San Francisco, CA</span>
          </div>
        </div>

        <div className='fv-fit-score'>
          <span>Example fit</span>
          <strong>94.2</strong>
        </div>

        <div className='fv-specialties'>
          <span>Anxiety</span>
          <span>Stress</span>
          <span>Burnout</span>
        </div>

        <div className='fv-connect'>Explore sample match</div>
      </div>

      <div className='fv-scheduling'>
        <div>
          <span>Self-scheduling</span>
          <strong>Available after connecting</strong>
        </div>
        <span className='fv-availability'>Tomorrow</span>
      </div>
    </div>
  )
}

function PeerSupportVignette() {
  return (
    <div className='fv-community' aria-hidden='true'>
      <div className='fv-community-identity'>
        <span className='fv-avatar fv-avatar--peer'><AvatarSymbol symbol='peer-cove' size={25} /></span>
        <div>
          <strong>Quiet Cedar</strong>
          <span>Your peer identity</span>
        </div>
      </div>

      <div className='fv-community-list'>
        <div className='fv-community-row fv-community-row--room'>
          <span className='fv-room-mark'>Room</span>
          <div>
            <strong>Shared experiences</strong>
            <span>38 members</span>
          </div>
          <span className='fv-row-action'>Join</span>
        </div>
        <div className='fv-community-row'>
          <span className='fv-avatar fv-avatar--small'><AvatarSymbol symbol='peer-tide' size={20} /></span>
          <div>
            <strong>Calm River</strong>
            <span>Active peer chat</span>
          </div>
          <span className='fv-row-action fv-row-action--active'>Message</span>
        </div>
        <div className='fv-community-row'>
          <span className='fv-avatar fv-avatar--small fv-avatar--soft'><AvatarSymbol symbol='peer-pebble' size={20} /></span>
          <div>
            <strong>Gentle Stone</strong>
            <span>Peer match</span>
          </div>
          <span className='fv-row-action'>Connect</span>
        </div>
      </div>
    </div>
  )
}

function LibraryVignette() {
  return (
    <div className='fv-library' aria-hidden='true'>
      <div className='fv-library-index'>
        <div className='fv-library-heading'>
          <span>Library</span>
          <strong>Explore by topic</strong>
        </div>
        {[
          ['Anxiety', 'Symptoms and support'],
          ['Burnout', 'Stress and recovery'],
          ['Grief', 'Understanding loss'],
        ].map(([title, detail], index) => (
          <div className={index === 0 ? 'fv-topic fv-topic--active' : 'fv-topic'} key={title}>
            <div>
              <strong>{title}</strong>
              <span>{detail}</span>
            </div>
            <span>Read</span>
          </div>
        ))}
      </div>

      <div className='fv-quiz'>
        <div className='fv-quiz-meta'>
          <span>Knowledge check</span>
          <strong>3 of 8</strong>
        </div>
        <p>Which response can help bring attention back to the present moment?</p>
        <div className='fv-quiz-options'>
          <span>Ignore the feeling</span>
          <span className='fv-quiz-option--selected'>Name five things you can see</span>
        </div>
        <div className='fv-quiz-feedback'>
          <strong>Correct</strong>
          <span>Grounding can gently redirect attention to the present.</span>
        </div>
      </div>
    </div>
  )
}

const VIGNETTES = {
  chatbot: ChatbotVignette,
  checkins: CheckInsVignette,
  journal: JournalVignette,
  therapist: TherapistVignette,
  community: PeerSupportVignette,
  library: LibraryVignette,
}

export default function FeatureVignette({ featureId }) {
  const Vignette = VIGNETTES[featureId]
  if (!Vignette) return null

  return (
    <div className={`feature-vignette feature-vignette--${featureId}`}>
      <Vignette />
    </div>
  )
}
