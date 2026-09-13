'use client'

import { motion, useReducedMotion } from 'motion/react'
import FeatureVignette from './FeatureVignettes.jsx'
import './FeatureVignettes.css'

const FEATURE_PRESENTATION = {
  chatbot: { label: 'A focused Aurora conversation with a compact message composer', layout: 'lead' },
  checkins: { label: 'A weekly check-in question with a seven-point scale and streak summary', layout: 'reverse' },
  journal: { label: 'A journal notebook paired with a mood calendar', layout: 'wide' },
  therapist: { label: 'A therapist profile with fit score, connection action, and separate scheduling information', layout: 'offset' },
  community: { label: 'An anonymous peer support identity with a support room and peer connections', layout: 'reverse' },
  library: { label: 'Mental health library topics paired with a short knowledge check', layout: 'wide' },
}

const revealGroup = {
  offscreen: {},
  onscreen: { transition: { staggerChildren: 0.07 } },
}

const revealItem = {
  offscreen: { opacity: 0, y: 24 },
  onscreen: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function FeatureStories({ features }) {
  const reduceMotion = useReducedMotion()
  const motionProps = reduceMotion
    ? { initial: false }
    : {
        initial: 'offscreen',
        whileInView: 'onscreen',
        viewport: { once: true, amount: 0.25, margin: '0px 0px -5% 0px' },
      }

  return (
    <section className='landing-features' aria-labelledby='landing-features-title'>
      <motion.header className='landing-features-intro' variants={revealItem} {...motionProps}>
        <h2 id='landing-features-title'>Support for the way you feel, reflect, and connect.</h2>
        <p>
          Aurora brings private reflection, guided check-ins, trusted care, and community into one calm workspace.
        </p>
      </motion.header>

      <div className='feature-story-list'>
        {features.map((feature) => {
          const presentation = FEATURE_PRESENTATION[feature.id]
          if (!presentation) return null

          return (
            <motion.article
              className={`feature-story feature-story--${presentation.layout}`}
              key={feature.id}
              variants={revealGroup}
              {...motionProps}
            >
              <motion.div className='feature-story-copy' variants={revealItem}>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </motion.div>

              <motion.figure
                className={`feature-story-visual feature-story-visual--${feature.id}`}
                role='img'
                aria-label={presentation.label}
                variants={revealItem}
              >
                <FeatureVignette featureId={feature.id} />
              </motion.figure>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
