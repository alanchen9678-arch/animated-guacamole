import { useEffect, useMemo, useState } from 'react'
import { useUser } from '../context/UserContext'
import { fetchCheckIns, submitCheckIn } from '../services/api'

// ─── personality questions (30 questions, 5 dimensions) ───────────────────────

const PERSONALITY_QUESTIONS = [
  // dim 0 — Mind
  {
    id: 'p1', dim: 0,
    text: 'When facing a new problem, your first instinct is to…',
    options: [
      { text: 'Gather data and research existing solutions', value: 0 },
      { text: 'Map out a logical framework step by step', value: 2 },
      { text: 'Brainstorm freely and explore wild possibilities', value: 4 },
      { text: 'Trust your gut and dive into something completely new', value: 6 },
    ],
  },
  {
    id: 'p2', dim: 0,
    text: 'Your perfect Saturday afternoon looks like…',
    options: [
      { text: 'Solving a complex puzzle or brain teaser', value: 0 },
      { text: 'Reading a deep non-fiction or theory book', value: 2 },
      { text: 'Working on a creative project — art, music, writing', value: 4 },
      { text: 'Making something entirely new from scratch', value: 6 },
    ],
  },
  {
    id: 'p3', dim: 0,
    text: 'When learning something new, you prefer to…',
    options: [
      { text: 'Study the underlying theory and principles first', value: 0 },
      { text: 'Follow a structured step-by-step guide', value: 2 },
      { text: 'Experiment and figure things out as I go', value: 4 },
      { text: 'Explore freely with no set method at all', value: 6 },
    ],
  },
  {
    id: 'p4', dim: 0,
    text: 'Your mind is most naturally drawn to…',
    options: [
      { text: 'Systems, patterns, and how things mechanically work', value: 0 },
      { text: 'Abstract concepts, theories, and big ideas', value: 2 },
      { text: 'Stories, metaphors, and the power of imagination', value: 4 },
      { text: 'Colors, sounds, textures, and sensory aesthetics', value: 6 },
    ],
  },
  {
    id: 'p5', dim: 0,
    text: "You'd describe your thinking style as…",
    options: [
      { text: 'Methodical and precise — I like getting things right', value: 0 },
      { text: 'Logical but genuinely open to fresh ideas', value: 2 },
      { text: 'Imaginative and free-flowing', value: 4 },
      { text: 'Intuitive and emotionally resonant', value: 6 },
    ],
  },
  {
    id: 'p6', dim: 0,
    text: "Given a full week of free time, you'd rather…",
    options: [
      { text: 'Solve a deep scientific or mathematical problem', value: 0 },
      { text: 'Write detailed research or in-depth analysis', value: 2 },
      { text: 'Design or build something creative and new', value: 4 },
      { text: 'Improvise, perform, or create spontaneous art', value: 6 },
    ],
  },
  // dim 1 — Energy
  {
    id: 'p7', dim: 1,
    text: 'After an exhausting social event, you recharge by…',
    options: [
      { text: 'Quiet time alone — reading, reflecting, or nothing', value: 0 },
      { text: 'A calm, low-stimulation evening in', value: 2 },
      { text: 'Catching up with one or two close friends', value: 4 },
      { text: 'Jumping straight into another social activity', value: 6 },
    ],
  },
  {
    id: 'p8', dim: 1,
    text: 'In a group project, you naturally tend to…',
    options: [
      { text: 'Work independently and contribute your part solo', value: 0 },
      { text: 'Prefer close-knit collaboration with a small team', value: 2 },
      { text: 'Enjoy the group energy and collaborative dynamic', value: 4 },
      { text: 'Take the lead and rally everyone together', value: 6 },
    ],
  },
  {
    id: 'p9', dim: 1,
    text: 'Your ideal work environment is…',
    options: [
      { text: 'A quiet, private space with zero interruptions', value: 0 },
      { text: 'A small office with a few trusted colleagues', value: 2 },
      { text: 'An open space where I can interact when I choose', value: 4 },
      { text: 'A buzzing, collaborative environment full of energy', value: 6 },
    ],
  },
  {
    id: 'p10', dim: 1,
    text: "At a party where you barely know anyone, you…",
    options: [
      { text: 'Find a quiet corner and stay near familiar faces', value: 0 },
      { text: "Talk when approached but don't seek new people out", value: 2 },
      { text: 'Enjoy meeting a few new people when the vibe is right', value: 4 },
      { text: 'Introduce yourself to as many people as possible', value: 6 },
    ],
  },
  {
    id: 'p11', dim: 1,
    text: 'Your ideal Friday night is…',
    options: [
      { text: 'Solo — cozy night in with a book, show, or hobby', value: 0 },
      { text: 'Low-key dinner or movie with close friends', value: 2 },
      { text: 'A fun outing with your wider friend group', value: 4 },
      { text: 'A party, concert, or event somewhere lively', value: 6 },
    ],
  },
  {
    id: 'p12', dim: 1,
    text: 'You feel most energized when…',
    options: [
      { text: 'You have uninterrupted time for deep solo focus', value: 0 },
      { text: "You're in a meaningful one-on-one conversation", value: 2 },
      { text: "You're collaborating with a small, excited group", value: 4 },
      { text: "You're surrounded by people and right in the action", value: 6 },
    ],
  },
  // dim 2 — Heart
  {
    id: 'p13', dim: 2,
    text: 'When a close friend comes to you upset, you tend to…',
    options: [
      { text: 'Help them logically analyze what went wrong and find solutions', value: 0 },
      { text: 'Listen, then offer practical and actionable advice', value: 2 },
      { text: "Mostly listen and validate how they're feeling", value: 4 },
      { text: "Drop everything and fully immerse in their emotions with them", value: 6 },
    ],
  },
  {
    id: 'p14', dim: 2,
    text: 'You make important decisions primarily based on…',
    options: [
      { text: 'Hard data, cold facts, and rigorous logic', value: 0 },
      { text: 'Evidence and rational common sense', value: 2 },
      { text: 'A blend of logic and how it genuinely feels', value: 4 },
      { text: 'What emotionally feels right and aligns with my values', value: 6 },
    ],
  },
  {
    id: 'p15', dim: 2,
    text: 'In a heated disagreement, you prioritize…',
    options: [
      { text: 'Being factually correct — truth above all else', value: 0 },
      { text: 'Finding the most rational and fair resolution', value: 2 },
      { text: 'Making sure everyone feels genuinely heard', value: 4 },
      { text: 'Preserving the relationship, even if it means conceding', value: 6 },
    ],
  },
  {
    id: 'p16', dim: 2,
    text: 'Of the following, you value most highly…',
    options: [
      { text: 'Truth and honesty, even when it stings', value: 0 },
      { text: 'Fairness and objective impartiality', value: 2 },
      { text: 'Compassion and genuine human kindness', value: 4 },
      { text: "Harmony and everyone's emotional well-being", value: 6 },
    ],
  },
  {
    id: 'p17', dim: 2,
    text: 'When someone strongly disagrees with your idea, you…',
    options: [
      { text: "Defend it firmly with evidence if I believe I'm right", value: 0 },
      { text: 'Consider their argument logically and update if warranted', value: 2 },
      { text: 'Try to genuinely understand their perspective', value: 4 },
      { text: 'Feel personally hurt, then work to reconnect emotionally', value: 6 },
    ],
  },
  {
    id: 'p18', dim: 2,
    text: 'What keeps you up at night most often?',
    options: [
      { text: 'Unsolved intellectual problems or incomplete puzzles', value: 0 },
      { text: 'Unfinished tasks or details I might have missed', value: 2 },
      { text: 'Worrying about how someone I care about is doing', value: 4 },
      { text: 'The emotional weight of relationships and past interactions', value: 6 },
    ],
  },
  // dim 3 — Style
  {
    id: 'p19', dim: 3,
    text: 'Your calendar or planner looks like…',
    options: [
      { text: 'Meticulously scheduled — every hour has a clear purpose', value: 0 },
      { text: 'Well-organized with clear goals and deadlines', value: 2 },
      { text: 'A rough outline with flexible, open-ended blocks', value: 4 },
      { text: 'Whatever comes up — I mostly figure it out as I go', value: 6 },
    ],
  },
  {
    id: 'p20', dim: 3,
    text: 'You strongly prefer…',
    options: [
      { text: 'Following a clear, step-by-step plan to the letter', value: 0 },
      { text: 'Having structure but with some built-in flexibility', value: 2 },
      { text: 'A loose framework I can freely improvise around', value: 4 },
      { text: 'Complete freedom to follow the moment wherever it leads', value: 6 },
    ],
  },
  {
    id: 'p21', dim: 3,
    text: 'When traveling somewhere new, you…',
    options: [
      { text: 'Research everything — itinerary, hotel, restaurants all booked', value: 0 },
      { text: 'Have a rough plan but leave room for spontaneity', value: 2 },
      { text: 'Book the basics and figure out the rest on arrival', value: 4 },
      { text: 'Book a ticket and figure absolutely everything out when you land', value: 6 },
    ],
  },
  {
    id: 'p22', dim: 3,
    text: 'Deadlines make you feel…',
    options: [
      { text: 'Focused — structure brings out my absolute best', value: 0 },
      { text: "Motivated — I like knowing exactly what's due when", value: 2 },
      { text: 'Mildly stressed, but I usually manage fine', value: 4 },
      { text: "Restricted — I do my best work without time pressure", value: 6 },
    ],
  },
  {
    id: 'p23', dim: 3,
    text: 'Your living space or workspace tends to be…',
    options: [
      { text: 'Highly organized — every item has its rightful place', value: 0 },
      { text: 'Mostly tidy with a clear personal system', value: 2 },
      { text: 'Creatively cluttered — organized chaos that works for me', value: 4 },
      { text: 'Spontaneous and ever-shifting — rigid order feels stifling', value: 6 },
    ],
  },
  {
    id: 'p24', dim: 3,
    text: 'When a plan suddenly changes last minute, you feel…',
    options: [
      { text: 'Genuinely frustrated — I rely on structure to perform well', value: 0 },
      { text: 'Mildly annoyed but I adapt quickly enough', value: 2 },
      { text: "Mostly fine — I'm naturally quite flexible", value: 4 },
      { text: 'Excited — unexpected changes are honestly half the fun', value: 6 },
    ],
  },
  // dim 4 — Drive
  {
    id: 'p25', dim: 4,
    text: 'When facing a major life decision, you…',
    options: [
      { text: 'Research extensively and weigh every option before committing', value: 0 },
      { text: 'Make a deliberate plan and take careful, calculated steps', value: 2 },
      { text: "Trust my instincts after some honest reflection", value: 4 },
      { text: "Leap in head-first and trust I'll figure it out", value: 6 },
    ],
  },
  {
    id: 'p26', dim: 4,
    text: 'Your relationship with risk is best described as…',
    options: [
      { text: 'Avoidant — I prefer security and predictable outcomes', value: 0 },
      { text: 'Tolerant — I accept it when the reward is clearly justified', value: 2 },
      { text: 'Embracing — I genuinely get energized by uncertainty', value: 4 },
      { text: 'Craving — life without risk feels completely flat to me', value: 6 },
    ],
  },
  {
    id: 'p27', dim: 4,
    text: 'You feel most alive when…',
    options: [
      { text: 'Things are stable, predictable, and going exactly to plan', value: 0 },
      { text: "I'm making steady, meaningful progress toward a clear goal", value: 2 },
      { text: "I'm pushing my limits or exploring something brand new", value: 4 },
      { text: "I'm in the middle of chaos, high stakes, or total uncertainty", value: 6 },
    ],
  },
  {
    id: 'p28', dim: 4,
    text: 'When you fail at something that really mattered, you…',
    options: [
      { text: 'Carefully analyze exactly what went wrong before trying again', value: 0 },
      { text: 'Feel genuine disappointment, then build a stronger plan', value: 2 },
      { text: 'Shake it off relatively quickly and get right back at it', value: 4 },
      { text: 'See it as data and immediately charge forward again', value: 6 },
    ],
  },
  {
    id: 'p29', dim: 4,
    text: 'Your comfort zone is…',
    options: [
      { text: 'Sacred — I thrive inside it and actively protect it', value: 0 },
      { text: 'A home base I leave only strategically when it counts', value: 2 },
      { text: 'Something I regularly push against in order to grow', value: 4 },
      { text: 'Nonexistent — comfort equals stagnation in my book', value: 6 },
    ],
  },
  {
    id: 'p30', dim: 4,
    text: 'When you imagine your ideal life, it looks like…',
    options: [
      { text: 'A stable, deeply meaningful life with mastery in my domain', value: 0 },
      { text: 'Steady, purposeful progress toward a goal that truly matters', value: 2 },
      { text: 'A rich life full of adventure, variety, and new horizons', value: 4 },
      { text: 'A legendary, boundary-breaking, world-changing life story', value: 6 },
    ],
  },
]

// ─── personality archetypes (25) ──────────────────────────────────────────────

const PERSONALITIES = [
  {
    id: 'architect', name: 'The Architect', emoji: '🏛️', category: 'Thinker', color: '#6366f1',
    profile: [0, 1, 1, 0, 3],
    description: "You're a master systems builder — methodical, precise, and driven by long-term vision.",
    traits: ['Strategic', 'Analytical', 'Precise', 'Independent', 'Visionary'],
    strengths: 'Exceptional planning, long-term thinking, and creating efficient systems others rely on.',
    growth: 'Try embracing spontaneity and investing more emotionally in your relationships.',
  },
  {
    id: 'philosopher', name: 'The Philosopher', emoji: '🔮', category: 'Thinker', color: '#6366f1',
    profile: [1, 0, 2, 4, 2],
    description: 'You\'re a deep thinker who questions everything. Truth, meaning, and understanding are your ultimate pursuits.',
    traits: ['Introspective', 'Curious', 'Thoughtful', 'Idealistic', 'Perceptive'],
    strengths: "You ask questions others don't dare, and help people see life from radically new angles.",
    growth: "Ground your ideas in action — wisdom that isn't applied remains theoretical.",
  },
  {
    id: 'scientist', name: 'The Scientist', emoji: '🔬', category: 'Thinker', color: '#6366f1',
    profile: [0, 1, 0, 1, 3],
    description: 'Evidence-driven and methodical, you trust data over intuition. You want to understand how things work at a fundamental level.',
    traits: ['Empirical', 'Methodical', 'Curious', 'Objective', 'Focused'],
    strengths: 'Your rigor and precision make you excellent at research and solving complex problems.',
    growth: "Don't let logic override connection — emotions carry real data too.",
  },
  {
    id: 'scholar', name: 'The Scholar', emoji: '📚', category: 'Thinker', color: '#6366f1',
    profile: [1, 1, 3, 1, 1],
    description: 'Knowledge is your currency. You\'re a lifelong learner who finds genuine joy in mastering captivating subjects.',
    traits: ['Knowledgeable', 'Diligent', 'Thoughtful', 'Humble', 'Detail-oriented'],
    strengths: 'Your depth of knowledge makes you a trusted expert and a brilliant teacher.',
    growth: "Share your knowledge more generously — don't stay in the library forever.",
  },
  {
    id: 'strategist', name: 'The Strategist', emoji: '♟️', category: 'Thinker', color: '#6366f1',
    profile: [1, 3, 1, 1, 4],
    description: 'You think several moves ahead. Calculated and sharp, you approach life like a chess game.',
    traits: ['Calculated', 'Forward-thinking', 'Decisive', 'Competitive', 'Resourceful'],
    strengths: 'You thrive in high-stakes environments and navigate complex situations with rare skill.',
    growth: "Remember that people aren't chess pieces — relationships matter alongside results.",
  },
  {
    id: 'visionary', name: 'The Visionary', emoji: '🚀', category: 'Creator', color: '#f59e0b',
    profile: [5, 3, 3, 4, 5],
    description: "You see what others can't yet imagine. Bold, future-focused, and endlessly imaginative.",
    traits: ['Imaginative', 'Bold', 'Inspiring', 'Future-focused', 'Unconventional'],
    strengths: 'You ignite possibility in everyone around you and dream at a scale that makes others uncomfortable.',
    growth: 'Great visions need great execution — partner with those who can build your dreams.',
  },
  {
    id: 'artist', name: 'The Artist', emoji: '🎨', category: 'Creator', color: '#f59e0b',
    profile: [6, 2, 5, 5, 3],
    description: 'Life is your canvas. You process the world through emotion and aesthetics, turning raw experience into expression.',
    traits: ['Expressive', 'Sensitive', 'Original', 'Passionate', 'Aesthetic'],
    strengths: 'You create beauty, evoke real emotion, and help others feel truly seen and understood.',
    growth: "Share your work even when it feels vulnerable — the world needs your perspective.",
  },
  {
    id: 'dreamer', name: 'The Dreamer', emoji: '💭', category: 'Creator', color: '#f59e0b',
    profile: [5, 1, 5, 5, 2],
    description: 'You live partly in another world — full of possibility, beauty, and breathtaking what-ifs.',
    traits: ['Idealistic', 'Imaginative', 'Sensitive', 'Hopeful', 'Whimsical'],
    strengths: 'You bring genuine hope and wonder, seeing beauty where others see nothing at all.',
    growth: "Turn your dreams into tangible plans — the real world desperately needs your vision.",
  },
  {
    id: 'inventor', name: 'The Inventor', emoji: '⚡', category: 'Creator', color: '#f59e0b',
    profile: [4, 2, 2, 3, 5],
    description: "You're a problem-solver at your core — combining creative thinking with technical curiosity to build new things.",
    traits: ['Innovative', 'Resourceful', 'Tinkering', 'Curious', 'Persistent'],
    strengths: 'You find creative solutions to hard problems and love building something from nothing.',
    growth: "Not every problem needs reinventing from scratch — elegant simplicity often wins.",
  },
  {
    id: 'storyteller', name: 'The Storyteller', emoji: '📖', category: 'Creator', color: '#f59e0b',
    profile: [4, 4, 5, 4, 3],
    description: 'You make sense of the world through narrative, weaving meaning from raw human experience with grace.',
    traits: ['Empathetic', 'Expressive', 'Perceptive', 'Warm', 'Articulate'],
    strengths: 'You help people feel understood and can move hearts with the power of your words.',
    growth: "Listen as much as you speak — the best stories are born from deep, patient listening.",
  },
  {
    id: 'commander', name: 'The Commander', emoji: '🦁', category: 'Leader', color: '#ef4444',
    profile: [2, 6, 1, 1, 6],
    description: 'Born to lead. Decisive, confident, and energized by taking charge.',
    traits: ['Decisive', 'Confident', 'Direct', 'Goal-driven', 'Commanding'],
    strengths: 'You excel under pressure, make tough calls others avoid, and drive real results with authority.',
    growth: "Leadership means listening — make genuine room for other voices in your decisions.",
  },
  {
    id: 'champion', name: 'The Champion', emoji: '🔥', category: 'Leader', color: '#ef4444',
    profile: [3, 5, 5, 3, 5],
    description: "You're a passionate, full-bodied force for what you believe in. You fight for causes with conviction.",
    traits: ['Passionate', 'Courageous', 'Driven', 'Inspiring', 'Relentless'],
    strengths: 'Your raw energy and deep conviction inspire others and drive meaningful, lasting change.',
    growth: "Channel your fire strategically — not every hill is worth dying on. Pick your battles.",
  },
  {
    id: 'pioneer', name: 'The Pioneer', emoji: '🏔️', category: 'Leader', color: '#ef4444',
    profile: [4, 5, 2, 4, 6],
    description: 'You go first — always. Trailblazing and fearless, you\'re most alive exploring uncharted territory.',
    traits: ['Adventurous', 'Bold', 'Innovative', 'Fearless', 'Independent'],
    strengths: 'You break barriers and open doors that others believed were permanently sealed shut.',
    growth: "Bring others along — even the most legendary pioneers needed great teams.",
  },
  {
    id: 'mentor', name: 'The Mentor', emoji: '🌿', category: 'Leader', color: '#ef4444',
    profile: [2, 3, 6, 2, 2],
    description: 'You lead by lifting others higher. Patient, wise, and deeply invested in human potential.',
    traits: ['Nurturing', 'Patient', 'Wise', 'Encouraging', 'Invested'],
    strengths: 'You consistently bring out the best in people and leave a lasting legacy through those you guide.',
    growth: "Don't neglect your own growth while pouring so generously into everyone else.",
  },
  {
    id: 'diplomat', name: 'The Diplomat', emoji: '🤝', category: 'Leader', color: '#ef4444',
    profile: [2, 4, 5, 2, 3],
    description: 'You navigate complexity with grace and emotional intelligence. A natural bridge-builder.',
    traits: ['Tactful', 'Empathetic', 'Persuasive', 'Harmonious', 'Adaptive'],
    strengths: 'You shine in conflict resolution, negotiation, and building consensus that actually holds.',
    growth: "Don't sacrifice your own values in the relentless pursuit of harmony.",
  },
  {
    id: 'caregiver', name: 'The Caregiver', emoji: '🌸', category: 'Helper', color: '#10b981',
    profile: [2, 3, 6, 2, 1],
    description: 'Your heart is your compass. Warm, selfless, and deeply attuned to others.',
    traits: ['Compassionate', 'Generous', 'Nurturing', 'Loyal', 'Selfless'],
    strengths: 'You make people feel truly seen, loved, and cared for — a rare and powerful gift.',
    growth: "Remember to fill your own cup — you genuinely cannot pour from an empty vessel.",
  },
  {
    id: 'connector', name: 'The Connector', emoji: '🌐', category: 'Helper', color: '#10b981',
    profile: [2, 6, 5, 3, 3],
    description: "You're the social glue of every room you enter. You build real communities and forge unlikely friendships.",
    traits: ['Sociable', 'Warm', 'Inclusive', 'Energetic', 'Relational'],
    strengths: "Your network is your superpower — you connect people who genuinely change each other's lives.",
    growth: "Depth matters as much as breadth — invest your full self in your closest relationships.",
  },
  {
    id: 'peacemaker', name: 'The Peacemaker', emoji: '🕊️', category: 'Helper', color: '#10b981',
    profile: [2, 3, 6, 3, 1],
    description: 'Harmony is your highest value. Calm, steady, and conflict-averse.',
    traits: ['Calm', 'Mediating', 'Patient', 'Accepting', 'Steady'],
    strengths: 'You de-escalate tension and help groups find the common ground that makes peace possible.',
    growth: "Don't avoid every conflict — some issues genuinely need addressing, not just smoothing over.",
  },
  {
    id: 'guardian', name: 'The Guardian', emoji: '🛡️', category: 'Helper', color: '#10b981',
    profile: [1, 3, 4, 1, 3],
    description: "You're the rock people anchor themselves to. Reliable, protective, and deeply loyal.",
    traits: ['Loyal', 'Dependable', 'Protective', 'Traditional', 'Steadfast'],
    strengths: 'People trust you completely. Your reliability is a foundation others build their lives on.',
    growth: "Embrace change and new perspectives — true protection never means preventing growth.",
  },
  {
    id: 'advocate', name: 'The Advocate', emoji: '⚖️', category: 'Helper', color: '#10b981',
    profile: [2, 5, 5, 2, 4],
    description: "Justice drives everything you do. You speak up fiercely for those who can't.",
    traits: ['Principled', 'Courageous', 'Passionate', 'Fair', 'Determined'],
    strengths: 'Your moral conviction makes you a powerful voice for real change and lasting equity.',
    growth: "Grace and nuance are your allies — righteous anger needs strategic, thoughtful direction.",
  },
  {
    id: 'explorer', name: 'The Explorer', emoji: '🧭', category: 'Independent', color: '#8b5cf6',
    profile: [4, 5, 3, 5, 5],
    description: 'Life is one continuous adventure. Restless, insatiably curious, and endlessly drawn to the new.',
    traits: ['Curious', 'Adventurous', 'Open-minded', 'Spontaneous', 'Free-spirited'],
    strengths: 'You collect perspectives and experiences that make you uniquely adaptable and endlessly interesting.',
    growth: "Plant some roots — real depth comes from staying still as much as from always moving.",
  },
  {
    id: 'rebel', name: 'The Rebel', emoji: '💥', category: 'Independent', color: '#8b5cf6',
    profile: [4, 5, 3, 6, 5],
    description: "You don't follow rules — you question their very existence. Bold, nonconformist, unapologetically authentic.",
    traits: ['Nonconformist', 'Bold', 'Disruptive', 'Authentic', 'Unconventional'],
    strengths: 'You break the mold and force the world to evolve beyond its own comfort zone.',
    growth: "Channel rebellion constructively — disruption for its own sake only burns bridges.",
  },
  {
    id: 'sage', name: 'The Sage', emoji: '🌙', category: 'Independent', color: '#8b5cf6',
    profile: [2, 0, 4, 4, 2],
    description: 'Still waters run extraordinarily deep. Quietly wise, deeply self-aware, at complete peace with your inner world.',
    traits: ['Wise', 'Serene', 'Introspective', 'Perceptive', 'Grounded'],
    strengths: 'Your composure and clarity make you a beacon of calm and genuine wisdom for those around you.',
    growth: "Share your wisdom more freely — your silence robs the world of gifts it needs.",
  },
  {
    id: 'survivor', name: 'The Survivor', emoji: '💪', category: 'Independent', color: '#8b5cf6',
    profile: [3, 3, 3, 4, 4],
    description: "You've walked through fire and emerged stronger every time. Resilient, adaptive, fundamentally unbreakable.",
    traits: ['Resilient', 'Adaptive', 'Pragmatic', 'Strong', 'Determined'],
    strengths: 'You handle crisis better than almost anyone and inspire profound strength in others.',
    growth: "Vulnerability isn't weakness — let the right people in, not just during the hard times.",
  },
  {
    id: 'maverick', name: 'The Maverick', emoji: '🎯', category: 'Independent', color: '#8b5cf6',
    profile: [3, 4, 2, 5, 6],
    description: "You play by your own rules — and somehow, it always works. Self-reliant, boldly original, completely unconventional.",
    traits: ['Self-reliant', 'Original', 'Bold', 'Unconventional', 'Driven'],
    strengths: 'Your unique approach consistently leads to breakthroughs that conventional thinkers miss.',
    growth: "Collaboration multiplies impact — your best work might come from the right partnership.",
  },
]

// ─── initial disorder questions (10, selected from INITIAL_QUESTIONS) ─────────

const INITIAL_DISORDER_QUESTIONS = [
  { id: 1,  cat: 'anxiety',    text: 'How often do you feel excessive worry about things that may happen in the future?' },
  { id: 3,  cat: 'anxiety',    text: 'How often do you avoid situations because you feel nervous, afraid, or overwhelmed?' },
  { id: 5,  cat: 'loneliness', text: 'How often do you feel disconnected from the people around you, even when you are with others?' },
  { id: 7,  cat: 'loneliness', text: 'How often do you feel left out or like you do not belong?' },
  { id: 9,  cat: 'grief',      text: 'How often do you find yourself struggling to accept a major change, loss, or ending in your life?' },
  { id: 11, cat: 'grief',      text: 'How often do feelings related to a past loss affect your ability to focus or enjoy things?' },
  { id: 13, cat: 'burnout',    text: 'How often do you feel emotionally exhausted from your responsibilities or daily demands?' },
  { id: 15, cat: 'burnout',    text: 'How often do you feel detached, unmotivated, or uninterested in things you normally care about?' },
  { id: 17, cat: 'stress',     text: 'How often do you feel overwhelmed by the number of tasks, problems, or expectations in your life?' },
  { id: 21, cat: 'confidence', text: 'How often do you doubt your abilities or question whether you can succeed?' },
]

// ─── weekly question bank (60 questions, 10 per category) ────────────────────

const WEEKLY_QUESTION_BANK = [
  { id: 101, cat: 'anxiety', text: 'I tend to rehearse conversations or situations in my head before they happen.' },
  { id: 102, cat: 'anxiety', text: 'Unexpected changes to plans can leave me unsettled for a while.' },
  { id: 103, cat: 'anxiety', text: 'I often notice potential problems before others do.' },
  { id: 104, cat: 'anxiety', text: "Even small mistakes can stay on my mind longer than I'd like." },
  { id: 105, cat: 'anxiety', text: 'I like having backup plans "just in case."' },
  { id: 106, cat: 'anxiety', text: 'It is difficult for me to fully relax, even during free time.' },
  { id: 107, cat: 'anxiety', text: 'I frequently think about what could go wrong in the future.' },
  { id: 108, cat: 'anxiety', text: 'I become mentally preoccupied when waiting for important news.' },
  { id: 109, cat: 'anxiety', text: 'I prefer certainty over spontaneity whenever possible.' },
  { id: 110, cat: 'anxiety', text: 'My mind often feels active when I wish it would slow down.' },
  { id: 111, cat: 'loneliness', text: "I often feel that people around me don't fully understand me." },
  { id: 112, cat: 'loneliness', text: 'I have many interactions that feel superficial rather than meaningful.' },
  { id: 113, cat: 'loneliness', text: 'I wish I had more people I could genuinely rely on.' },
  { id: 114, cat: 'loneliness', text: 'Even in groups, I sometimes feel like an outsider.' },
  { id: 115, cat: 'loneliness', text: 'I hesitate to share my deeper thoughts with others.' },
  { id: 116, cat: 'loneliness', text: 'I often handle emotional struggles on my own.' },
  { id: 117, cat: 'loneliness', text: 'I rarely feel truly seen or appreciated for who I am.' },
  { id: 118, cat: 'loneliness', text: 'I wish more people checked in on me without being asked.' },
  { id: 119, cat: 'loneliness', text: 'I sometimes avoid reaching out because I assume others are busy.' },
  { id: 120, cat: 'loneliness', text: 'I miss having stronger connections in my life.' },
  { id: 121, cat: 'grief', text: 'Certain memories still affect me more than I expect.' },
  { id: 122, cat: 'grief', text: 'I occasionally catch myself wishing things could return to how they once were.' },
  { id: 123, cat: 'grief', text: 'I carry experiences that changed me in lasting ways.' },
  { id: 124, cat: 'grief', text: 'Anniversaries, places, or reminders can bring up strong emotions.' },
  { id: 125, cat: 'grief', text: 'There are losses in my life that still influence my daily perspective.' },
  { id: 126, cat: 'grief', text: "I sometimes struggle to accept changes I didn't choose." },
  { id: 127, cat: 'grief', text: 'I find myself revisiting "what if" scenarios about the past.' },
  { id: 128, cat: 'grief', text: 'I keep parts of certain memories close because they remain meaningful.' },
  { id: 129, cat: 'grief', text: 'I have moments where emotions connected to the past resurface unexpectedly.' },
  { id: 130, cat: 'grief', text: 'Some chapters of my life still feel unfinished emotionally.' },
  { id: 131, cat: 'burnout', text: 'Tasks that used to feel manageable now require more effort.' },
  { id: 132, cat: 'burnout', text: 'I often feel mentally drained before the day is over.' },
  { id: 133, cat: 'burnout', text: 'I struggle to maintain enthusiasm for responsibilities I once cared about.' },
  { id: 134, cat: 'burnout', text: 'I frequently push through exhaustion because things still need to get done.' },
  { id: 135, cat: 'burnout', text: 'I find myself operating on autopilot.' },
  { id: 136, cat: 'burnout', text: "Rest doesn't always leave me feeling recharged." },
  { id: 137, cat: 'burnout', text: 'Small demands sometimes feel disproportionately overwhelming.' },
  { id: 138, cat: 'burnout', text: 'I have less patience than I used to.' },
  { id: 139, cat: 'burnout', text: 'It is difficult to find motivation, even for important tasks.' },
  { id: 140, cat: 'burnout', text: 'I feel like I have been giving more of myself than I can sustain.' },
  { id: 141, cat: 'stress', text: 'I usually have several responsibilities competing for my attention.' },
  { id: 142, cat: 'stress', text: 'I often feel pressed for time.' },
  { id: 143, cat: 'stress', text: 'It can be difficult to mentally disconnect from obligations.' },
  { id: 144, cat: 'stress', text: 'I feel like there is always something important waiting to be done.' },
  { id: 145, cat: 'stress', text: 'I frequently juggle multiple priorities at once.' },
  { id: 146, cat: 'stress', text: 'I have trouble fully enjoying downtime because I think about unfinished tasks.' },
  { id: 147, cat: 'stress', text: 'My schedule often feels packed or demanding.' },
  { id: 148, cat: 'stress', text: 'I feel pressure to meet expectations placed on me.' },
  { id: 149, cat: 'stress', text: 'I sometimes wish I could pause life long enough to catch up.' },
  { id: 150, cat: 'stress', text: 'I tend to carry a lot of responsibility at the same time.' },
  { id: 151, cat: 'confidence', text: 'I compare my abilities to others more than I would like.' },
  { id: 152, cat: 'confidence', text: 'I hesitate to speak up unless I am sure I am right.' },
  { id: 153, cat: 'confidence', text: 'I sometimes underestimate what I can accomplish.' },
  { id: 154, cat: 'confidence', text: 'Praise from others can be difficult for me to fully believe.' },
  { id: 155, cat: 'confidence', text: 'I worry that people may notice my shortcomings more than my strengths.' },
  { id: 156, cat: 'confidence', text: 'I second-guess decisions after making them.' },
  { id: 157, cat: 'confidence', text: 'I need reassurance before feeling confident in unfamiliar situations.' },
  { id: 158, cat: 'confidence', text: 'I tend to focus on what I could have done better rather than what went well.' },
  { id: 159, cat: 'confidence', text: 'I avoid certain opportunities because I doubt my capabilities.' },
  { id: 160, cat: 'confidence', text: 'I often hold myself to standards I struggle to meet.' },
]

// ─── category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'anxiety',    label: 'Anxiety',        color: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.22)' },
  { id: 'loneliness', label: 'Loneliness',     color: '#60a5fa', bg: 'rgba(96,165,250,0.10)',  border: 'rgba(96,165,250,0.22)'  },
  { id: 'grief',      label: 'Grief',          color: '#c084fc', bg: 'rgba(192,132,252,0.10)', border: 'rgba(192,132,252,0.22)' },
  { id: 'burnout',    label: 'Burnout',        color: '#fb923c', bg: 'rgba(251,146,60,0.10)',  border: 'rgba(251,146,60,0.22)'  },
  { id: 'stress',     label: 'Stress',         color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.22)'  },
  { id: 'confidence', label: 'Low Confidence', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.22)' },
]

// ─── mock history ─────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  {
    id: 'w1', date: '2026-05-18', type: 'weekly',
    qIds: [1, 3, 11, 14, 21, 24, 31, 35, 41, 44, 51, 55],
    scores: { anxiety: 58, loneliness: 42, grief: 31, burnout: 67, stress: 72, confidence: 48 },
  },
  {
    id: 'w2', date: '2026-05-25', type: 'weekly',
    qIds: [2, 5, 12, 16, 22, 26, 32, 36, 42, 46, 52, 56],
    scores: { anxiety: 62, loneliness: 38, grief: 29, burnout: 71, stress: 68, confidence: 51 },
  },
  {
    id: 'w3', date: '2026-06-01', type: 'weekly',
    qIds: [6, 8, 13, 17, 23, 27, 33, 38, 43, 47, 53, 57],
    scores: { anxiety: 55, loneliness: 44, grief: 27, burnout: 64, stress: 74, confidence: 46 },
  },
  {
    id: 'w4', date: '2026-06-08', type: 'weekly',
    qIds: [7, 9, 15, 18, 25, 28, 34, 37, 45, 48, 54, 58],
    scores: { anxiety: 61, loneliness: 40, grief: 30, burnout: 69, stress: 70, confidence: 43 },
  },
]

// ─── storage key ──────────────────────────────────────────────────────────────

const PERSONALITY_STORAGE_KEY = 'aurora.personality'

// ─── helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDateKey(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function diffDays(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.floor((to - from) / msPerDay)
}

function getLatestEntry(history) {
  if (!history.length) return null
  return [...history].sort((a, b) => parseDateKey(a.date) - parseDateKey(b.date))[history.length - 1]
}

function getLatestWeeklyEntry(history) {
  const weeklyEntries = history
    .filter((entry) => entry.type === 'weekly')
    .sort((a, b) => parseDateKey(a.date) - parseDateKey(b.date))
  return weeklyEntries[weeklyEntries.length - 1] ?? null
}

function getWeeklyStreak(history, today = new Date()) {
  const weeklyEntries = history
    .filter((entry) => entry.type === 'weekly')
    .sort((a, b) => parseDateKey(b.date) - parseDateKey(a.date))

  if (!weeklyEntries.length) return 0

  const latestWeeklyDate = parseDateKey(weeklyEntries[0].date)
  if (diffDays(latestWeeklyDate, today) > 7) return 0

  let streak = 1
  for (let index = 1; index < weeklyEntries.length; index++) {
    const newer = parseDateKey(weeklyEntries[index - 1].date)
    const older = parseDateKey(weeklyEntries[index].date)
    if (diffDays(older, newer) <= 8) streak += 1
    else break
  }

  return streak
}

function isWeeklyCheckInDue(history, today = new Date()) {
  const latestWeeklyEntry = getLatestWeeklyEntry(history)
  if (!latestWeeklyEntry) return true
  return diffDays(parseDateKey(latestWeeklyEntry.date), today) >= 7
}

function buildSurvey(type, lastDisorderQIds = [], lastPersonalityQIds = []) {
  if (type === 'initial') {
    // 40 questions: 10 disorder first, then 30 personality
    return [...INITIAL_DISORDER_QUESTIONS, ...PERSONALITY_QUESTIONS]
  }
  // Weekly: 3 disorder + 7 personality
  const selectedCats = shuffle([...CATEGORIES.map(c => c.id)]).slice(0, 3)
  const disorderQs = selectedCats.map(cat => {
    const pool = WEEKLY_QUESTION_BANK.filter(q => q.cat === cat)
    const unused = pool.filter(q => !lastDisorderQIds.includes(q.id))
    const source = unused.length >= 1 ? unused : pool
    return shuffle(source)[0]
  })
  const unusedPersonality = PERSONALITY_QUESTIONS.filter(q => !lastPersonalityQIds.includes(q.id))
  const personalityPool = unusedPersonality.length >= 7 ? unusedPersonality : PERSONALITY_QUESTIONS
  const personalityQs = shuffle(personalityPool).slice(0, 7)
  return [...disorderQs, ...personalityQs]
}

function computeDisorderScores(answers, questions) {
  const disorderQs = questions.filter(q => q.cat)
  const raw = {}, count = {}
  for (const c of CATEGORIES) { raw[c.id] = 0; count[c.id] = 0 }
  for (const q of disorderQs) {
    if (answers[q.id] != null) { raw[q.cat] += answers[q.id]; count[q.cat]++ }
  }
  const scores = {}
  for (const c of CATEGORIES) {
    const n = count[c.id]
    if (!n) { scores[c.id] = 0; continue }
    scores[c.id] = Math.round(((raw[c.id] - n) / (6 * n)) * 99 + 1)
  }
  return scores
}

function computePersonalityProfile(answers, questions) {
  const personalityQs = questions.filter(q => q.dim != null && q.options)
  const dimSums = [0, 0, 0, 0, 0]
  const dimCounts = [0, 0, 0, 0, 0]
  for (const q of personalityQs) {
    const idx = answers[q.id]
    if (idx != null) {
      dimSums[q.dim] += q.options[idx].value
      dimCounts[q.dim]++
    }
  }
  return dimSums.map((sum, i) => dimCounts[i] ? sum / dimCounts[i] : 3)
}

function findPersonality(profile) {
  let best = null, bestDist = Infinity
  for (const p of PERSONALITIES) {
    const dist = Math.sqrt(p.profile.reduce((sum, v, i) => sum + (v - profile[i]) ** 2, 0))
    if (dist < bestDist) { bestDist = dist; best = p }
  }
  return best
}

function scoreBand(n) {
  if (n <= 20) return { label: 'Very Low',  color: '#22c55e' }
  if (n <= 40) return { label: 'Low',       color: '#34d399' }
  if (n <= 60) return { label: 'Moderate',  color: '#fbbf24' }
  if (n <= 80) return { label: 'Elevated',  color: '#fb923c' }
  return              { label: 'High',      color: '#ef4444' }
}

function trendArrow(curr, prev) {
  const d = curr - prev
  if (d >  8) return { sym: '↑', tip: `+${d} from last`,  col: '#ef4444' }
  if (d < -8) return { sym: '↓', tip: `${d} from last`, col: '#22c55e' }
  return              { sym: '→', tip: 'Stable',            col: '#94a3b8' }
}

function generateInsight(scores, prevScores) {
  const top = [...CATEGORIES].sort((a, b) => scores[b.id] - scores[a.id])[0]
  if (prevScores) {
    const rising = CATEGORIES.filter(c => scores[c.id] - prevScores[c.id] > 10)
    if (rising.length) {
      const names = rising.map(c => c.label.toLowerCase()).join(' and ')
      return `Your ${names} score${rising.length > 1 ? 's have' : ' has'} risen notably since last week. That pattern is worth paying attention to. The AI Chatbot or Therapist Match can help you unpack what's going on.`
    }
  }
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / CATEGORIES.length
  if (avg < 35) return "Your scores look healthy across the board this week — keep doing what you're doing, and come back next week to keep the streak going."
  if (scores[top.id] >= 75) return `Your ${top.label.toLowerCase()} is scoring in the ${scoreBand(scores[top.id]).label.toLowerCase()} range. Aurora's AI Chatbot and Therapist Match are here whenever you're ready for support.`
  return "Thanks for completing this check-in. Your results are tracked over time so Aurora can spot patterns and reach out when things start to shift."
}

function fmtDate(str) {
  const d = parseDateKey(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── hub view ─────────────────────────────────────────────────────────────────

function HubView({ streak, dueToday, lastCheckInDate, hasInitialAssessment, onStart }) {
  const [savedPersonality, setSavedPersonality] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSONALITY_STORAGE_KEY)
      if (raw) setSavedPersonality(JSON.parse(raw))
    } catch {}
  }, [])

  return (
    <div className="ci-hub">
      {/* personality compact card */}
      {savedPersonality && (
        <div
          className="ci-hub-personality"
          style={{
            borderColor: savedPersonality.color + '44',
            background: savedPersonality.color + '0d',
          }}
        >
          <span className="ci-hub-personality-emoji">{savedPersonality.emoji}</span>
          <div className="ci-hub-personality-info">
            <span className="ci-hub-personality-name">{savedPersonality.name}</span>
            <span
              className="ci-hub-personality-cat"
              style={{ color: savedPersonality.color, background: savedPersonality.color + '1a' }}
            >
              {savedPersonality.category}
            </span>
          </div>
          <span className="ci-hub-personality-label">Your personality</span>
        </div>
      )}

      {/* streak + due banner */}
      <div className="ci-top-row">
        <div className="ci-streak-card">
          <div className="ci-streak-num">{streak}</div>
          <div className="ci-streak-label">week streak</div>
          <div className="ci-streak-sub">{lastCheckInDate ? `Last check-in ${fmtDate(lastCheckInDate)}` : 'No check-ins yet'}</div>
        </div>

        <div className={`ci-due-card${(!hasInitialAssessment || dueToday) ? ' ci-due-card--due' : ''}`}>
          {!hasInitialAssessment ? (
            <>
              <div className="ci-due-badge">Get started</div>
              <p className="ci-due-text">Before weekly check-ins begin, complete your 40-question initial assessment to set your baseline and discover your personality type.</p>
              <button className="ci-start-btn" onClick={() => onStart('initial')}>Start initial assessment</button>
            </>
          ) : dueToday ? (
            <>
              <div className="ci-due-badge">Due today</div>
              <p className="ci-due-text">Your weekly check-in is ready. It takes about 4 minutes and helps Aurora detect changes in your well-being early.</p>
              <button className="ci-start-btn" onClick={() => onStart('weekly')}>Start weekly check-in →</button>
            </>
          ) : (
            <>
              <div className="ci-due-badge ci-due-badge--ok">Up to date</div>
              <p className="ci-due-text">Your next check-in is due in a few days. Come back then to keep your streak going.</p>
            </>
          )}
        </div>
      </div>

      <p className="ci-disclaimer">
        These check-ins are tools for self-reflection and trend awareness — not diagnostic tools. They do not determine whether you have a mental health condition.
      </p>
    </div>
  )
}

// ─── intro view ───────────────────────────────────────────────────────────────

function IntroView({ type, onStart, onBack }) {
  const isInitial = type === 'initial'
  const count     = isInitial ? 40 : 10
  const time      = isInitial ? '~15' : '~4'
  const title     = isInitial ? 'Initial Assessment' : 'Weekly Check-In'
  const desc      = isInitial
    ? 'This one-time assessment establishes your personal baseline across six well-being dimensions and reveals your personality type. It takes about 15 minutes and uses scenario-based questions — no clinical language, no trick questions.'
    : "This quick check-in tracks how you've been doing this week. Aurora looks for changes over time so it can step in early when something shifts."

  return (
    <div className="ci-intro">
      <div className="ci-intro-badge">{isInitial ? 'One-time' : 'Weekly'}</div>
      <h3 className="ci-intro-title">{title}</h3>
      <p className="ci-intro-desc">{desc}</p>

      <div className="ci-intro-stats">
        <div className="ci-stat">
          <div className="ci-stat-num">{count}</div>
          <div className="ci-stat-label">questions</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">{time}</div>
          <div className="ci-stat-label">minutes</div>
        </div>
        <div className="ci-stat">
          <div className="ci-stat-num">{isInitial ? '1' : '+'}</div>
          <div className="ci-stat-label">{isInitial ? 'personality + wellness baseline' : 'personality + wellness'}</div>
        </div>
      </div>

      <p className="ci-intro-note">
        Answer based on how you've been feeling over the past 1–2 weeks, not just today. There are no right or wrong answers.
      </p>

      <div className="ci-intro-actions">
        <button className="ci-back-btn" onClick={onBack}>← Back</button>
        <button className="ci-start-big-btn" onClick={onStart}>Begin →</button>
      </div>
    </div>
  )
}

// ─── survey view ──────────────────────────────────────────────────────────────

const SCALE_LABELS = ['Strongly Disagree', 'Disagree', 'Slightly Disagree', 'Neutral', 'Slightly Agree', 'Agree', 'Strongly Agree']

function SurveyView({ questions, answers, setAnswers, onDone, onBack }) {
  const [idx, setIdx] = useState(0)
  const q          = questions[idx]
  const total      = questions.length
  const isPersonality = q.dim != null && q.options
  const selected   = answers[q.id]
  const pct        = (idx / total) * 100

  function pick(val) { setAnswers(prev => ({ ...prev, [q.id]: val })) }

  function next() {
    if (idx < total - 1) setIdx(i => i + 1)
    else onDone()
  }

  function back() {
    if (idx === 0) onBack()
    else setIdx(i => i - 1)
  }

  return (
    <div className="ci-survey">
      {/* progress */}
      <div className="ci-prog-bar">
        <div className="ci-prog-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="ci-prog-row">
        <span className="ci-prog-count">Question {idx + 1} of {total}</span>
        <span
          className="ci-type-badge"
          style={isPersonality
            ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderColor: 'rgba(99,102,241,0.25)' }
            : { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'rgba(77,107,88,0.25)' }
          }
        >
          {isPersonality ? 'Personality' : 'Well-being'}
        </span>
      </div>

      {/* question */}
      <p className="ci-question-text">{q.text}</p>

      {/* answer input */}
      {isPersonality ? (
        <div className="ci-choice-grid">
          {q.options.map((opt, i) => (
            <button
              key={i}
              className={`ci-choice-btn${selected === i ? ' ci-choice-btn--on' : ''}`}
              onClick={() => pick(i)}
            >
              {opt.text}
            </button>
          ))}
        </div>
      ) : (
        <div className="ci-scale">
          <div className="ci-scale-btns">
            {[1, 2, 3, 4, 5, 6, 7].map(v => (
              <button
                key={v}
                className={`ci-scale-btn${selected === v ? ' ci-scale-btn--on' : ''}`}
                style={selected === v ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
                onClick={() => pick(v)}
                title={SCALE_LABELS[v - 1]}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="ci-scale-end-labels">
            <span>Strongly Disagree</span>
            <span>Neutral</span>
            <span>Strongly Agree</span>
          </div>
        </div>
      )}

      {/* nav */}
      <div className="ci-survey-nav">
        <button className="ci-back-btn" onClick={back}>← Back</button>
        <button
          className="ci-next-btn"
          onClick={next}
          disabled={selected == null}
          style={{ opacity: selected != null ? 1 : 0.4, cursor: selected != null ? 'pointer' : 'not-allowed' }}
        >
          {idx === total - 1 ? 'Submit' : 'Next →'}
        </button>
      </div>
    </div>
  )
}

// ─── results view ─────────────────────────────────────────────────────────────

function ResultsView({ surveyType, scores, prevScores, personality, onDone }) {
  const title = surveyType === 'initial' ? 'Assessment complete' : 'Check-in complete'
  const summary = surveyType === 'initial'
    ? 'Your responses have been saved as your starting baseline. Future weekly check-ins will help Aurora track changes over time.'
    : 'Your responses have been saved. Come back next week to keep your streak going and continue tracking how you are doing.'

  const insightText = scores
    ? generateInsight(scores, prevScores)
    : 'Thank you for checking in. You can return to the dashboard whenever you are ready.'

  return (
    <div className="ci-results">
      <div className="ci-results-header">
        <h3 className="ci-results-title">{title}</h3>
        <p className="ci-results-sub">{summary}</p>
      </div>

      {/* personality card */}
      {personality && (
        <div
          className="ci-personality-card"
          style={{
            borderColor: personality.color + '40',
            background: personality.color + '0a',
          }}
        >
          <div className="ci-personality-header">
            <span className="ci-personality-emoji">{personality.emoji}</span>
            <div>
              <p className="ci-personality-name" style={{ color: personality.color }}>{personality.name}</p>
              <span
                className="ci-personality-cat"
                style={{ color: personality.color, background: personality.color + '1a', borderColor: personality.color + '33' }}
              >
                {personality.category}
              </span>
            </div>
          </div>

          <p className="ci-personality-desc">{personality.description}</p>

          <div className="ci-traits-row">
            {personality.traits.map(t => (
              <span
                key={t}
                className="ci-trait-chip"
                style={{ color: personality.color, borderColor: personality.color + '44', background: personality.color + '12' }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="ci-personality-meta">
            <div className="ci-personality-meta-item">
              <span className="ci-personality-meta-label">Strengths</span>
              <span>{personality.strengths}</span>
            </div>
            <div className="ci-personality-meta-item">
              <span className="ci-personality-meta-label">Growth edge</span>
              <span>{personality.growth}</span>
            </div>
          </div>
        </div>
      )}

      {/* aurora insight */}
      <div className="ci-insight">
        <div className="ci-insight-icon" style={{ background: '#3a6898' }}>A</div>
        <div className="ci-insight-body">
          <strong className="ci-insight-label" style={{ color: '#3a6898' }}>Aurora</strong>
          <p className="ci-insight-text">{insightText}</p>
        </div>
      </div>

      <button className="ci-done-btn" onClick={onDone}>Return to dashboard →</button>
    </div>
  )
}

// ─── root component ───────────────────────────────────────────────────────────

export default function CheckIns() {
  const { token, loading: userLoading } = useUser()
  const [view,    setView]    = useState('hub')
  const [surveyType, setSurveyType] = useState('weekly')
  const [questions,  setQuestions]  = useState([])
  const [answers,    setAnswers]    = useState({})
  const [latestScores, setLatestScores] = useState(null)
  const [latestPrevScores, setLatestPrevScores] = useState(null)
  const [latestPersonality, setLatestPersonality] = useState(null)
  const [history,  setHistory]  = useState(MOCK_HISTORY)
  const [serverSummary, setServerSummary] = useState({
    streak: getWeeklyStreak(MOCK_HISTORY),
    dueToday: isWeeklyCheckInDue(MOCK_HISTORY),
    lastCheckInDate: getLatestEntry(MOCK_HISTORY)?.date ?? null,
    hasInitialAssessment: MOCK_HISTORY.some((entry) => entry.type === 'initial'),
  })
  const [loadingState, setLoadingState] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (userLoading) return
    if (!token) {
      setHistory(MOCK_HISTORY)
      setServerSummary({
        streak: getWeeklyStreak(MOCK_HISTORY),
        dueToday: isWeeklyCheckInDue(MOCK_HISTORY),
        lastCheckInDate: getLatestEntry(MOCK_HISTORY)?.date ?? null,
        hasInitialAssessment: MOCK_HISTORY.some((entry) => entry.type === 'initial'),
      })
      return
    }

    let cancelled = false
    setLoadingState(true)
    setSaveError('')

    fetchCheckIns()
      .then((data) => {
        if (cancelled) return
        setHistory(data.history?.length ? data.history : [])
        setServerSummary({
          streak: data.streak ?? 0,
          dueToday: Boolean(data.dueThisWeek),
          lastCheckInDate: data.lastCheckInDate ?? null,
          hasInitialAssessment: Boolean(data.hasInitialAssessment),
        })
      })
      .catch((error) => {
        if (!cancelled) setSaveError(error.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingState(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, userLoading])

  function startSurvey(type) {
    const lastEntry = history[history.length - 1]
    const lastDisorderQIds = lastEntry?.qIds ?? []
    const lastPersonalityQIds = lastEntry?.personalityQIds ?? []
    const qs = buildSurvey(type, lastDisorderQIds, lastPersonalityQIds)
    setSurveyType(type)
    setQuestions(qs)
    setAnswers({})
    setView('intro')
  }

  function beginAnswering() { setView('survey') }

  async function onSurveyDone() {
    const scores = computeDisorderScores(answers, questions)
    setLatestScores(scores)

    // compute personality if there were personality questions
    let personality = null
    const hasPersonalityQs = questions.some(q => q.dim != null)
    if (hasPersonalityQs) {
      const profile = computePersonalityProfile(answers, questions)
      personality = findPersonality(profile)
      setLatestPersonality(personality)

      // save to localStorage
      if (personality) {
        localStorage.setItem(PERSONALITY_STORAGE_KEY, JSON.stringify({
          id: personality.id,
          name: personality.name,
          emoji: personality.emoji,
          category: personality.category,
          color: personality.color,
          updatedAt: new Date().toISOString(),
        }))
      }
    }

    // save last completed date
    localStorage.setItem('aurora.checkin.last-completed', formatDateKey(new Date()))

    const personalityQIds = questions.filter(q => q.dim != null).map(q => q.id)

    if (token) {
      // save prev scores for insight before updating
      const prevEntry = getLatestWeeklyEntry(history)
      if (prevEntry) setLatestPrevScores(prevEntry.scores)

      try {
        const data = await submitCheckIn({
          type: surveyType,
          qIds: questions.filter(q => q.cat).map(q => q.id),
          personalityQIds,
          scores,
        })
        setHistory(data.history?.length ? data.history : [])
        setServerSummary({
          streak: data.streak ?? 0,
          dueToday: Boolean(data.dueThisWeek),
          lastCheckInDate: data.lastCheckInDate ?? null,
          hasInitialAssessment: Boolean(data.hasInitialAssessment),
        })
        setSaveError('')
      } catch (error) {
        setSaveError(error.message)
        return
      }
    } else {
      const prevEntry = getLatestWeeklyEntry(history)
      if (prevEntry) setLatestPrevScores(prevEntry.scores)

      const newEntry = {
        id: `w${history.length + 1}`,
        date: formatDateKey(new Date()),
        type: surveyType,
        qIds: questions.filter(q => q.cat).map(q => q.id),
        personalityQIds,
        scores,
      }
      const nextHistory = [...history, newEntry]
      setHistory(nextHistory)
      setServerSummary({
        streak: getWeeklyStreak(nextHistory),
        dueToday: isWeeklyCheckInDue(nextHistory),
        lastCheckInDate: getLatestEntry(nextHistory)?.date ?? null,
        hasInitialAssessment: nextHistory.some((entry) => entry.type === 'initial'),
      })
      setSaveError('')
    }

    setView('results')
  }

  function onResultsDone() {
    setView('hub')
    setLatestScores(null)
    setLatestPrevScores(null)
    setLatestPersonality(null)
  }

  const hasInitialAssessment = useMemo(() => serverSummary.hasInitialAssessment, [serverSummary])
  const streak = useMemo(() => serverSummary.streak, [serverSummary])
  const dueToday = useMemo(() => serverSummary.dueToday, [serverSummary])
  const latestEntryDate = useMemo(() => serverSummary.lastCheckInDate, [serverSummary])

  return (
    <section className="page ci-page">
      <style>{CI_STYLES}</style>

      <header className="page-header">
        <h2>Check-Ins</h2>
        <p>Short, regular surveys that track your well-being across six dimensions so Aurora can support you proactively.</p>
      </header>

      {saveError && <p className="ci-error">{saveError}</p>}
      {loadingState && view === 'hub' && <p className="ci-loading">Loading your check-ins...</p>}

      {view === 'hub' && (
        <HubView
          streak={streak}
          dueToday={dueToday}
          lastCheckInDate={latestEntryDate}
          hasInitialAssessment={hasInitialAssessment}
          onStart={startSurvey}
        />
      )}

      {view === 'intro' && (
        <IntroView
          type={surveyType}
          onStart={beginAnswering}
          onBack={() => setView('hub')}
        />
      )}

      {view === 'survey' && (
        <SurveyView
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onDone={onSurveyDone}
          onBack={() => setView('intro')}
        />
      )}

      {view === 'results' && (
        <ResultsView
          surveyType={surveyType}
          scores={latestScores}
          prevScores={latestPrevScores}
          personality={latestPersonality}
          onDone={onResultsDone}
        />
      )}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const CI_STYLES = `
  .ci-page {
    min-height: calc(100vh - 220px);
    align-content: start;
  }

  .ci-section-label {
    font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
    margin-bottom: 8px;
  }
  .ci-error {
    margin: 0 0 14px;
    padding: 10px 14px;
    border-radius: 14px;
    border: 1px solid rgba(239,68,68,0.2);
    background: rgba(239,68,68,0.08);
    color: #b91c1c;
    font-size: 0.84rem;
    font-weight: 600;
  }
  .ci-loading {
    margin: 0 0 14px;
    color: var(--muted);
    font-size: 0.84rem;
  }

  /* ── hub ── */
  .ci-hub { display: flex; flex-direction: column; gap: 18px; }

  .ci-hub-personality {
    display: flex; align-items: center; gap: 12px;
    border: 1px solid; border-radius: 16px; padding: 14px 18px;
  }
  .ci-hub-personality-emoji { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
  .ci-hub-personality-info { display: flex; align-items: center; gap: 10px; flex: 1; flex-wrap: wrap; }
  .ci-hub-personality-name { font-size: 1rem; font-weight: 800; letter-spacing: -0.02em; }
  .ci-hub-personality-cat {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 2px 9px; border-radius: 999px;
  }
  .ci-hub-personality-label {
    font-size: 0.72rem; color: var(--muted); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.1em; margin-left: auto;
  }

  .ci-top-row { display: grid; grid-template-columns: 160px 1fr; gap: 14px; align-items: start; }

  .ci-streak-card {
    background: linear-gradient(135deg, #4d6b58, #3a5244);
    color: #fff; border-radius: 20px; padding: 20px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    box-shadow: 0 8px 24px rgba(77,107,88,0.28);
    text-align: center;
  }
  .ci-streak-num   { font-size: 3rem; font-weight: 900; line-height: 1; }
  .ci-streak-label { font-size: 0.82rem; font-weight: 700; opacity: 0.88; letter-spacing: 0.04em; }
  .ci-streak-sub   { font-size: 0.73rem; opacity: 0.6; margin-top: 4px; }

  .ci-due-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 20px 22px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: var(--shadow);
  }
  .ci-due-card--due { border-color: rgba(77,107,88,0.28); background: rgba(210,228,220,0.4); }

  .ci-due-badge {
    display: inline-block; font-size: 0.7rem; font-weight: 700;
    letter-spacing: 0.14em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; width: fit-content;
    background: var(--accent-soft); color: var(--accent);
  }
  .ci-due-badge--ok { background: rgba(148,163,184,0.15); color: var(--muted); }

  .ci-due-text { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.55; }

  .ci-start-btn {
    padding: 11px 22px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    align-self: flex-start; transition: opacity 140ms, transform 140ms;
  }
  .ci-start-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  .ci-initial-link {
    border: none; background: transparent; color: var(--muted);
    font-size: 0.78rem; text-decoration: underline; padding: 0;
    cursor: pointer; align-self: flex-start; opacity: 0.7;
    transition: opacity 140ms;
  }
  .ci-initial-link:hover { opacity: 1; color: var(--accent); }

  /* last results */
  .ci-last-wrap {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 20px; padding: 18px 20px;
    box-shadow: var(--shadow);
  }

  .ci-mini-bars { display: flex; flex-direction: column; gap: 10px; }
  .ci-mini-bar-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ci-mini-label { font-size: 0.82rem; font-weight: 600; color: var(--ink); }
  .ci-mini-track { height: 8px; border-radius: 999px; background: rgba(46,42,38,0.08); overflow: hidden; }
  .ci-mini-fill  { height: 100%; border-radius: inherit; transition: width 600ms cubic-bezier(0.22,1,0.36,1); }
  .ci-mini-score { font-size: 0.82rem; font-weight: 700; text-align: right; }

  /* history */
  .ci-history-toggle {
    border: none; background: transparent; color: var(--muted);
    font-size: 0.84rem; font-weight: 600; cursor: pointer; padding: 4px 0;
    text-decoration: underline; align-self: flex-start;
    transition: color 140ms;
  }
  .ci-history-toggle:hover { color: var(--accent); }

  .ci-history {
    display: flex; flex-direction: column; gap: 8px;
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 16px; padding: 14px 16px;
    animation: fade-up 180ms ease;
  }
  .ci-history-row {
    display: flex; align-items: center; gap: 14px;
    padding: 8px 0; border-bottom: 1px solid var(--line);
  }
  .ci-history-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ci-history-date { font-size: 0.82rem; font-weight: 700; color: var(--ink); min-width: 56px; }
  .ci-history-type { font-size: 0.76rem; color: var(--muted); min-width: 110px; }
  .ci-history-dots { display: flex; gap: 5px; }
  .ci-history-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

  .ci-disclaimer {
    margin: 0; font-size: 0.76rem; color: var(--muted); line-height: 1.5;
    font-style: italic; opacity: 0.8;
    border-top: 1px solid var(--line); padding-top: 12px;
  }

  /* ── intro ── */
  .ci-intro {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 22px; padding: 28px;
    box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 16px;
    width: 100%;
    animation: fade-up 200ms ease;
  }
  .ci-intro-badge {
    display: inline-block; font-size: 0.68rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; width: fit-content;
    background: var(--accent-soft); color: var(--accent);
  }
  .ci-intro-title {
    margin: 0;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .ci-intro-desc  { margin: 0; font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

  .ci-intro-stats { display: flex; gap: 24px; }
  .ci-stat { text-align: center; }
  .ci-stat-num   {
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.8rem;
    font-weight: 900;
    color: var(--ink);
    line-height: 1;
  }
  .ci-stat-label { font-size: 0.75rem; color: var(--muted); margin-top: 3px; }

  .ci-intro-cats { display: flex; flex-wrap: wrap; gap: 8px; }
  .ci-cat-chip {
    font-size: 0.78rem; font-weight: 700; padding: 4px 12px; border-radius: 999px;
    border: 1px solid;
  }

  .ci-intro-note { margin: 0; font-size: 0.82rem; color: var(--muted); line-height: 1.55; font-style: italic; }

  .ci-intro-actions { display: flex; gap: 10px; align-items: center; margin-top: 4px; }
  .ci-back-btn {
    padding: 10px 20px; border-radius: 999px; border: 1.5px solid var(--line);
    background: transparent; color: var(--muted); font-size: 0.88rem; font-weight: 600;
    transition: border-color 140ms; cursor: pointer;
  }
  .ci-back-btn:hover { border-color: var(--accent); color: var(--accent); }
  .ci-start-big-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms; cursor: pointer;
  }
  .ci-start-big-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  /* ── survey ── */
  .ci-survey {
    width: 100%;
    display: flex; flex-direction: column; gap: 20px;
    animation: fade-up 180ms ease;
  }

  .ci-prog-bar { height: 6px; border-radius: 999px; background: rgba(46,42,38,0.08); overflow: hidden; }
  .ci-prog-fill { height: 100%; border-radius: inherit; background: var(--accent); transition: width 280ms ease; }
  .ci-prog-row { display: flex; align-items: center; justify-content: space-between; }
  .ci-prog-count { font-size: 0.78rem; color: var(--muted); font-weight: 600; }
  .ci-type-badge {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }
  .ci-cat-tag {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; border: 1px solid;
  }

  .ci-question-text {
    margin: 0; font-size: 1.1rem; font-weight: 600;
    color: var(--ink); line-height: 1.5; letter-spacing: -0.01em;
  }

  /* personality choice buttons */
  .ci-choice-grid { display: flex; flex-direction: column; gap: 10px; }
  .ci-choice-btn {
    width: 100%; padding: 14px 18px; border-radius: 14px; text-align: left;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    font-size: 0.92rem; font-weight: 500; color: var(--ink);
    transition: border-color 140ms, background 140ms, transform 120ms;
    cursor: pointer; line-height: 1.4;
  }
  .ci-choice-btn:hover { border-color: var(--accent); background: var(--accent-soft); transform: translateX(3px); }
  .ci-choice-btn--on {
    border-color: var(--accent); background: var(--accent-soft); font-weight: 700;
    transform: translateX(3px); box-shadow: 0 4px 14px rgba(77,107,88,0.14);
  }

  .ci-scale { display: flex; flex-direction: column; gap: 8px; }
  .ci-scale-btns { display: flex; gap: 8px; }
  .ci-scale-btn {
    flex: 1; aspect-ratio: 1; border-radius: 12px;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    font-size: 0.92rem; font-weight: 700; color: var(--ink);
    transition: transform 120ms, border-color 140ms, background 140ms, color 140ms;
    display: flex; align-items: center; justify-content: center;
  }
  .ci-scale-btn:hover { transform: scale(1.08); border-color: var(--accent); }
  .ci-scale-btn--on { box-shadow: 0 4px 14px rgba(0,0,0,0.14); transform: scale(1.06); }
  .ci-scale-end-labels {
    display: flex; justify-content: space-between;
    font-size: 0.73rem; color: var(--muted);
  }

  .ci-survey-nav { display: flex; gap: 10px; align-items: center; }
  .ci-next-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    transition: opacity 140ms, transform 140ms;
  }
  .ci-next-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }

  /* ── results ── */
  .ci-results { display: flex; flex-direction: column; gap: 20px; animation: fade-up 200ms ease; }
  .ci-results-header { }
  .ci-results-title {
    margin: 0;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .ci-results-sub   { margin: 6px 0 0; color: var(--muted); font-size: 0.88rem; }

  /* personality result card */
  .ci-personality-card {
    border-radius: 20px; padding: 22px; border: 1px solid;
    display: flex; flex-direction: column; gap: 14px;
  }
  .ci-personality-header { display: flex; align-items: center; gap: 14px; }
  .ci-personality-emoji { font-size: 2.4rem; line-height: 1; }
  .ci-personality-name { font-size: 1.4rem; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
  .ci-personality-cat {
    font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    padding: 3px 10px; border-radius: 999px; width: fit-content; margin-top: 4px;
    border: 1px solid;
  }
  .ci-personality-desc { margin: 0; font-size: 0.9rem; line-height: 1.65; color: var(--muted); }
  .ci-traits-row { display: flex; flex-wrap: wrap; gap: 7px; }
  .ci-trait-chip {
    font-size: 0.76rem; font-weight: 600; padding: 4px 12px; border-radius: 999px; border: 1px solid;
  }
  .ci-personality-meta { display: flex; flex-direction: column; gap: 8px; }
  .ci-personality-meta-item { display: flex; flex-direction: column; gap: 2px; font-size: 0.84rem; }
  .ci-personality-meta-label {
    font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted);
  }

  .ci-score-bars { display: flex; flex-direction: column; gap: 10px; }
  .ci-score-row  { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .ci-score-cat  { font-size: 0.88rem; font-weight: 700; }

  .ci-band-legend { display: flex; flex-wrap: wrap; gap: 12px; }
  .ci-band-item { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--muted); }
  .ci-band-dot  { width: 10px; height: 10px; border-radius: 50%; }

  .ci-insight {
    display: flex; gap: 12px; padding: 16px 18px;
    background: rgba(77,107,88,0.06); border: 1px solid rgba(77,107,88,0.18);
    border-radius: 16px; animation: fade-up 220ms ease;
  }
  .ci-insight-icon {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-weight: 900; font-size: 0.88rem; flex-shrink: 0;
  }
  .ci-insight-body { flex: 1; }
  .ci-insight-label { display: block; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 5px; }
  .ci-insight-text  { margin: 0; font-size: 0.9rem; line-height: 1.65; color: var(--ink); }

  .ci-done-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.92rem; font-weight: 700;
    align-self: flex-start; transition: opacity 140ms, transform 140ms; cursor: pointer;
  }
  .ci-done-btn:hover { opacity: 0.88; transform: translateY(-1px); }

  @media (max-width: 640px) {
    .ci-top-row { grid-template-columns: 1fr; }
    .ci-mini-bar-row { grid-template-columns: 90px 1fr 32px 18px; }
    .ci-scale-btns { gap: 5px; }
    .ci-scale-btn { border-radius: 9px; font-size: 0.84rem; }
    .ci-hub-personality-label { display: none; }
  }
`
