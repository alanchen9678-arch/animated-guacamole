import { useState, useMemo } from 'react'

// ─── disorder data ─────────────────────────────────────────────────────────────

const DISORDERS = [
  {
    id: 'anxiety',
    title: 'Anxiety Disorders',
    color: '#3a6898',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/anxiety/symptoms-causes/syc-20350961',
    what: 'Anxiety disorders involve excessive, persistent fear or worry that is difficult to control and significantly interferes with daily activities. They are among the most common mental health conditions worldwide and include generalized anxiety disorder, panic disorder, and social anxiety disorder.',
    symptoms: [
      'Feeling nervous, restless, or tense',
      'Excessive worry or fear that is difficult to control',
      'Sense of impending danger, panic, or doom',
      'Rapid heartbeat, sweating, or trembling',
      'Trouble sleeping or concentrating',
    ],
    causes: [
      'Traumatic or stressful life experiences',
      'Family history of anxiety disorders',
      'Certain personality traits such as shyness or behavioral inhibition',
      'Other mental health conditions such as depression',
    ],
    treatment: [
      'Psychotherapy (talk therapy), especially cognitive behavioral therapy (CBT)',
      'Medications such as anti-anxiety medications or antidepressants when appropriate',
      'Lifestyle changes: regular physical activity, maintaining social connections, and avoiding alcohol or substance misuse',
    ],
  },
  {
    id: 'depression',
    title: 'Depression',
    color: '#1d4ed8',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/depression/symptoms-causes/syc-20356007',
    what: 'Depression (major depressive disorder) is a common and serious mood disorder that causes persistent feelings of sadness and loss of interest. It affects how a person thinks, feels, and handles daily activities such as sleeping, eating, or working.',
    symptoms: [
      'Persistent sadness, emptiness, or hopelessness',
      'Loss of interest or pleasure in activities once enjoyed',
      'Irritability, frustration, or restlessness',
      'Fatigue and lack of energy',
      'Difficulty thinking, concentrating, or making decisions',
    ],
    causes: [
      'Differences in brain chemistry and brain function',
      'Hormonal changes (e.g., during pregnancy, menopause, or thyroid problems)',
      'Inherited genetic factors or family history of depression',
      'Major life events such as trauma, loss, or prolonged stress',
    ],
    treatment: [
      'Psychotherapy (talk therapy), such as cognitive behavioral therapy (CBT)',
      'Antidepressant medications',
      'A combination of therapy and medication for many people',
      'Lifestyle adjustments: regular exercise, adequate sleep, and social support',
    ],
  },
  {
    id: 'bipolar',
    title: 'Bipolar Disorder',
    color: '#d97706',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/bipolar-disorder/symptoms-causes/syc-20355955',
    what: 'Bipolar disorder is a mental health condition that causes extreme mood swings including emotional highs (mania or hypomania) and lows (depression). These mood episodes can affect sleep, energy, activity, judgment, behavior, and the ability to think clearly.',
    symptoms: [
      'Manic episodes: feeling unusually happy, excited, or irritable',
      'Manic episodes: increased energy and activity, reduced need for sleep',
      'Depressive episodes: persistent sadness, emptiness, or hopelessness',
      'Depressive episodes: loss of interest in activities once enjoyed',
      'Depressive episodes: fatigue or low energy',
    ],
    causes: [
      'Exact cause is unknown',
      'Genetic factors play a significant role',
      'Differences in brain structure and functioning may contribute',
      'Environmental stressors can trigger episodes in those with a genetic predisposition',
    ],
    treatment: [
      'Mood-stabilizing medications are commonly used for long-term management',
      'Other psychiatric medications may be prescribed depending on symptoms',
      'Psychotherapy to help manage symptoms and develop coping skills',
      'Lifestyle structure: consistent sleep, routine, and stress management',
    ],
  },
  {
    id: 'ptsd',
    title: 'Post-Traumatic Stress Disorder (PTSD)',
    color: '#dc2626',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/post-traumatic-stress-disorder/symptoms-causes/syc-20355967',
    what: 'PTSD is a mental health condition triggered by experiencing or witnessing a terrifying event. Symptoms may include flashbacks, nightmares, severe anxiety, and uncontrollable thoughts about the event. Many people who go through traumatic events recover with time; PTSD develops when symptoms persist and worsen.',
    symptoms: [
      'Intrusive memories: flashbacks, nightmares, or severe emotional distress about the event',
      'Avoidance: steering clear of places, people, or activities that are reminders of the trauma',
      'Negative changes in thinking and mood: hopelessness, memory problems, emotional numbness',
      'Changes in physical and emotional reactions: being easily startled, always on guard, trouble sleeping',
    ],
    causes: [
      'Experiencing, witnessing, or learning about a traumatic event',
      'Severe or repeated trauma increases risk',
      'Previous traumatic experiences, including childhood abuse',
      'Lack of social support after the event',
    ],
    treatment: [
      'Psychotherapy, especially trauma-focused therapies such as EMDR and prolonged exposure therapy',
      'Medication when appropriate (e.g., SSRIs or SNRIs)',
      'Building strong support systems with family, friends, or support groups',
    ],
  },
  {
    id: 'schizophrenia',
    title: 'Schizophrenia',
    color: '#4d6b58',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/schizophrenia/symptoms-causes/syc-20354443',
    what: 'Schizophrenia is a serious mental disorder in which people interpret reality abnormally. It may result in some combination of hallucinations, delusions, and extremely disordered thinking and behavior. Symptoms are divided into "positive" (added experiences) and "negative" (loss of normal functioning).',
    symptoms: [
      'Positive: delusions — false beliefs not based in reality',
      'Positive: hallucinations — hearing or seeing things that do not exist',
      'Positive: disorganized thinking and speech',
      'Negative: reduced emotional expression and social withdrawal',
      'Negative: loss of motivation and inability to function normally',
    ],
    causes: [
      'Exact cause is unknown',
      'Family history of schizophrenia increases risk',
      'Differences in brain chemistry and structure',
      'Exposure to significant stress or certain viral infections before birth',
    ],
    treatment: [
      'Antipsychotic medications to help manage symptoms',
      'Psychotherapy (talk therapy)',
      'Social skills training and support for daily living, education, and employment',
      'Coordinated specialty care that combines therapy, medication, and family support',
    ],
  },
  {
    id: 'eating',
    title: 'Eating Disorders',
    color: '#be185d',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/eating-disorders/symptoms-causes/syc-20353603',
    what: 'Eating disorders are serious conditions related to persistent eating behaviors that negatively impact health, emotions, and the ability to function in important areas of life. Common types include anorexia nervosa, bulimia nervosa, and binge-eating disorder.',
    symptoms: [
      'Preoccupation with weight, food, calories, dieting, or body shape',
      'Distorted or negative body image',
      'Extreme or restrictive dieting behaviors',
      'Evidence of binge eating or purging',
      'Withdrawal from social activities, especially those involving food',
    ],
    causes: [
      'Genetics and family history',
      'Psychological factors such as perfectionism, low self-esteem, anxiety, or depression',
      'Social and cultural pressures regarding appearance and body weight',
      'History of dieting or weight-related bullying',
    ],
    treatment: [
      'Psychotherapy to address thoughts, emotions, and behaviors related to food and body image',
      'Nutritional counseling to develop healthy eating habits',
      'Medical monitoring to address physical health complications',
      'Medication may be used for some types, particularly binge-eating disorder',
    ],
  },
  {
    id: 'odd',
    title: 'Disruptive Behavior Disorders (ODD)',
    color: '#ea580c',
    source: 'Mayo Clinic Staff',
    sourceUrl: 'https://www.mayoclinic.org/diseases-conditions/oppositional-defiant-disorder/symptoms-causes/syc-20375831',
    what: 'Oppositional Defiant Disorder (ODD) is a childhood-onset behavioral disorder involving a persistent pattern of angry or irritable mood, argumentative or defiant behavior toward authority figures, and vindictiveness. It often co-occurs with ADHD and anxiety disorders.',
    symptoms: [
      'Angry and irritable mood: frequent loss of temper, easily annoyed',
      'Argumentative and defiant behavior: arguing with adults or authority figures, refusing to follow rules',
      'Vindictiveness: being spiteful or seeking revenge at least twice in the past six months',
    ],
    causes: [
      'Exact cause is unknown',
      'May involve a combination of genetic, biological, and environmental factors',
      'Difficult temperament or emotional regulation problems',
      'Inconsistent parenting or family conflict may contribute',
    ],
    treatment: [
      'Parent management training to help caregivers respond effectively to behaviors',
      'Family therapy to improve communication and relationships',
      'Individual therapy to develop problem-solving and emotional regulation skills',
      'Treatment for any co-occurring conditions such as ADHD or anxiety',
    ],
  },
  {
    id: 'neuro',
    title: 'Neurodevelopmental Disorders',
    color: '#15803d',
    source: 'Mayo Clinic Laboratories',
    sourceUrl: 'https://news.mayocliniclabs.com/pediatrics/neurology/neurodevelopmental-disorders/',
    what: 'Neurodevelopmental disorders are conditions that affect brain development and emerge in early childhood. They include autism spectrum disorder (ASD), attention-deficit/hyperactivity disorder (ADHD), intellectual disabilities, and learning disorders. These conditions often persist into adulthood.',
    symptoms: [
      'Delays in reaching developmental milestones (speech, motor skills, social interaction)',
      'Difficulties with learning or academic skills',
      'Problems with attention, concentration, or impulse control',
      'Challenges with social communication and interaction',
      'Repetitive behaviors or highly restricted interests (in ASD)',
    ],
    causes: [
      'Genetic factors and inherited conditions',
      'Differences in brain development and structure',
      'Chromosomal abnormalities (e.g., Down syndrome)',
      'Prenatal exposures such as infections, toxins, or premature birth',
    ],
    treatment: [
      'Early intervention programs to support development',
      'Special education services tailored to individual needs',
      'Speech and language therapy, occupational therapy, or behavioral therapy',
      'Medication for specific symptoms such as inattention or anxiety',
    ],
  },
]

// ─── quiz questions ────────────────────────────────────────────────────────────

const ALL_IDS   = DISORDERS.map(d => d.id)
const ID_LABEL  = Object.fromEntries(DISORDERS.map(d => [d.id, d.title.replace(' (PTSD)', '').replace(' (ODD)', '')]))

const QUIZ_BANK = {
  anxiety: [
    ['What is the main difference between normal anxiety and an anxiety disorder?', ['Anxiety disorders only happen during childhood', 'Anxiety disorders cause excessive fear or worry that interferes with daily life', 'Normal anxiety is always harmful', 'Anxiety disorders are caused only by stress'], 1],
    ["Which system is responsible for the body's fight-or-flight response?", ['Digestive system', 'Immune system', 'Nervous system', 'Skeletal system'], 2],
    ['Which is a common symptom of Generalized Anxiety Disorder (GAD)?', ['Constant worry about many areas of life', 'Complete lack of emotions', 'Memory loss', 'Increased appetite only'], 0],
    ['A panic attack is best described as:', ['A planned emotional response', 'A sudden episode of intense fear and physical symptoms', 'A type of sleep disorder', 'A personality trait'], 1],
    ['Social Anxiety Disorder involves:', ['Fear of social situations or being judged', 'Fear of sleeping', 'Loss of memory', 'Lack of emotions'], 0],
    ['A phobia is:', ['A normal preference', 'An intense fear of a specific object or situation', 'A learning disability', 'A mood disorder'], 1],
    ['Genetics can influence anxiety disorders by:', ['Making anxiety impossible to treat', "Increasing a person's vulnerability", 'Removing all stress', 'Preventing emotions'], 1],
    ['Cognitive Behavioral Therapy (CBT) helps by:', ['Changing harmful thought patterns and behaviors', 'Removing all memories', 'Stopping emotions completely', 'Increasing stress'], 0],
    ['Someone constantly worries about school, family, and the future for months. This may be:', ['PTSD', 'GAD', 'Schizophrenia', 'Bipolar disorder'], 1],
    ['A healthy coping strategy for anxiety is:', ['Avoiding all responsibilities', 'Practicing relaxation techniques', 'Ignoring problems forever', 'Increasing isolation'], 1],
  ],
  depression: [
    ['Depression is different from sadness because:', ['Depression usually lasts longer and affects daily functioning', 'Depression only happens after accidents', 'Depression disappears immediately', 'Depression is not a mental health condition'], 0],
    ['A common symptom of depression is:', ['Increased confidence', 'Loss of interest in activities', 'Better concentration', 'Constant excitement'], 1],
    ['Depression is often associated with changes in:', ['Bones', 'Neurotransmitters', 'Eye color', 'Height'], 1],
    ['Major Depressive Disorder involves:', ['A temporary bad mood', 'Persistent depressive symptoms affecting life', 'Only physical illness', 'Increased energy only'], 1],
    ['Depression can affect sleep by causing:', ['Sleep problems or changes in sleep patterns', 'Better memory', 'Faster learning', 'No emotional changes'], 0],
    ['Which can contribute to depression?', ['Genetics and environmental stress', 'Only intelligence', 'Eye color', 'Height'], 0],
    ['Depression may affect concentration because it can:', ['Change mood and thinking patterns', 'Improve focus', 'Increase memory automatically', 'Stop all thoughts'], 0],
    ['Therapy can help depression by:', ['Teaching coping skills and managing thoughts', 'Removing all emotions', 'Changing personality completely', 'Preventing sleep'], 0],
    ['Someone loses interest in hobbies and feels hopeless for weeks. This may indicate:', ['Depression', 'Phobia', 'ADHD', 'ODD'], 0],
    ['A common treatment for depression is:', ['Therapy and/or medication', 'Avoiding everyone', 'Ignoring symptoms', 'Increasing stress'], 0],
  ],
  bipolar: [
    ['Bipolar disorder involves:', ['Changes between mood episodes', 'Only physical symptoms', 'Loss of intelligence', 'A fear of objects'], 0],
    ['Mania is usually associated with:', ['Increased energy and unusual activity levels', 'Extreme tiredness only', 'Memory loss', 'Fear of crowds'], 0],
    ['A depressive episode involves:', ['Low mood and decreased interest', 'High energy only', 'Increased confidence only', 'Hallucinations only'], 0],
    ['Bipolar I is mainly defined by:', ['Manic episodes', 'Anxiety attacks', 'Learning problems', 'Sleepwalking'], 0],
    ['Bipolar disorder can affect:', ['Relationships and daily functioning', 'Eye color', 'Height', 'Blood type'], 0],
    ['Genetics may:', ['Increase risk for bipolar disorder', 'Guarantee someone develops it', 'Remove emotions', 'Prevent treatment'], 0],
    ['Tracking moods can help by:', ['Identifying patterns and changes', 'Creating symptoms', 'Stopping all emotions', 'Removing memories'], 0],
    ['Someone has extreme energy, little sleep, and risky behavior. This may be:', ['Mania', 'Phobia', 'Depression only', 'PTSD'], 0],
    ['Bipolar disorder is commonly treated with:', ['Therapy and mood-stabilizing medications', 'Ignoring symptoms', 'Isolation', 'Avoiding sleep'], 0],
    ['Bipolar disorder primarily affects:', ['Mood regulation', 'Bone growth', 'Vision', 'Digestion'], 0],
  ],
  ptsd: [
    ['PTSD can develop after:', ['A traumatic or extremely stressful event', 'Learning a new skill', 'Exercising regularly', 'Changing schools only'], 0],
    ['A flashback is:', ['A future prediction', 'A memory or feeling that makes someone feel like they are reliving an event', 'A type of dream only', 'A physical injury'], 1],
    ['Which is a common symptom of PTSD?', ['Intrusive memories of a traumatic event', 'Increased intelligence', 'Improved concentration', 'Complete lack of emotions'], 0],
    ['Avoidance in PTSD means:', ['Avoiding reminders of the traumatic event', 'Avoiding all food', 'Avoiding sleep forever', 'Avoiding learning'], 0],
    ['People with PTSD may experience hypervigilance, which means:', ['Feeling constantly alert or on guard', 'Losing all emotions', 'Becoming unable to speak', 'Having increased physical strength'], 0],
    ["PTSD affects the brain's:", ['Stress response system', 'Bone structure', 'Digestive system only', 'Eye movement only'], 0],
    ['Which therapy is commonly used for PTSD?', ['Trauma-focused therapy', 'Avoiding all memories', 'Ignoring symptoms', 'Physical exercise only'], 0],
    ['A person experiences nightmares and fear months after a traumatic event. This may indicate:', ['PTSD', 'ADHD', 'ODD', 'Autism'], 0],
    ['Why do different people respond differently to trauma?', ['People have different experiences, genetics, and coping abilities', 'Everyone responds exactly the same', 'Trauma affects only children', 'Trauma never affects emotions'], 0],
    ['PTSD can affect:', ['Emotions, thoughts, and behaviors', 'Height only', 'Eye color only', 'Intelligence only'], 0],
  ],
  schizophrenia: [
    ['Schizophrenia is mainly characterized by:', ['Changes in thinking, perception, and behavior', 'Only sadness', 'Only fear', 'Physical injuries'], 0],
    ['Hallucinations are:', ['Sensing things that are not actually present', 'Forgetting homework', 'Feeling tired', 'Changing personality'], 0],
    ['Delusions are:', ['Strong beliefs that are not based in reality', 'Normal opinions', 'Physical symptoms', 'Learning difficulties'], 0],
    ['Positive symptoms of schizophrenia include:', ['Hallucinations and delusions', 'Improved memory', 'Better concentration', 'Increased athletic ability'], 0],
    ['Negative symptoms of schizophrenia include:', ['Reduced emotional expression or motivation', 'Increased energy', 'High confidence', 'Stronger senses'], 0],
    ['Schizophrenia can affect:', ['Thinking, communication, and behavior', 'Height and weight only', 'Vision only', 'Athletic performance only'], 0],
    ['Dopamine is a:', ['Neurotransmitter involved in brain communication', 'Bone material', 'Vitamin', 'Muscle tissue'], 0],
    ['Schizophrenia is NOT the same as:', ['Having multiple personalities', 'A mental health disorder', 'A condition affecting thinking', 'A condition that can require treatment'], 0],
    ['A person hears voices others cannot hear and believes false ideas. This may suggest:', ['Schizophrenia', 'Anxiety disorder', 'ODD', 'Eating disorder'], 0],
    ['Early treatment for schizophrenia is important because it can:', ['Help manage symptoms and improve functioning', 'Remove all emotions', 'Guarantee no challenges', "Change someone's identity"], 0],
  ],
  eating: [
    ['Eating disorders are:', ['Mental health conditions involving unhealthy eating patterns and thoughts about food/body', 'Simple food preferences', 'Only physical illnesses', 'Temporary choices'], 0],
    ['Anorexia nervosa often involves:', ['Restricting food intake and intense fear related to weight', 'Increased exercise only', 'Eating large amounts only', 'Avoiding school'], 0],
    ['Bulimia nervosa involves:', ['Episodes of binge eating followed by behaviors to compensate', 'Never eating food', 'Only skipping breakfast', 'Fear of school'], 0],
    ['Binge eating disorder involves:', ['Episodes of eating large amounts with a feeling of loss of control', 'Never eating', 'Eating only vegetables', 'Avoiding social situations'], 0],
    ['Eating disorders can affect:', ['Physical and mental health', 'Height only', 'Hair color only', 'Intelligence only'], 0],
    ['A factor that may contribute to eating disorders is:', ['Genetics, emotions, and social influences', 'Eye color', 'Favorite hobbies', 'Weather'], 0],
    ['Eating disorders are considered mental health conditions because they involve:', ['Thoughts, emotions, and behaviors related to eating', 'Only food choices', 'Only physical appearance', 'Only exercise'], 0],
    ['Therapy can help eating disorders by:', ['Addressing thoughts and behaviors related to eating', 'Ignoring emotions', 'Preventing communication', 'Increasing stress'], 0],
    ['Someone repeatedly overeats while feeling unable to control it may have:', ['Binge eating disorder', 'PTSD', 'Schizophrenia', 'ODD'], 0],
    ['A healthy relationship with food includes:', ['Balanced eating habits and positive attitudes toward nutrition', 'Avoiding all foods', 'Extreme rules', 'Ignoring hunger signals'], 0],
  ],
  odd: [
    ['ODD is a disorder involving:', ['A pattern of angry, defiant, or disobedient behavior', 'Hallucinations', 'Mood swings only', 'Memory loss'], 0],
    ['A common behavior in ODD is:', ['Frequent arguing with authority figures', 'Forgetting names', 'Hearing voices', 'Avoiding all activity'], 0],
    ['ODD is different from normal behavior because it is:', ['Frequent and impacts daily life', 'A single disagreement', 'Always temporary', 'Only physical'], 0],
    ['ODD can affect:', ['School, friendships, and family relationships', 'Eye color', 'Height', 'Intelligence'], 0],
    ['Behavioral therapy for ODD focuses on:', ['Improving behaviors and coping skills', 'Removing emotions', 'Avoiding people', 'Ignoring problems'], 0],
    ['Defiance means:', ['Resisting rules or authority', 'Having a disease', 'Losing memory', 'Having hallucinations'], 0],
    ['Understanding triggers helps because it can:', ['Identify situations that lead to challenging behaviors', 'Increase conflict', 'Remove emotions', 'Prevent learning'], 0],
    ['A child frequently argues, refuses rules, and blames others may show signs of:', ['ODD', 'PTSD', 'Bipolar disorder', 'Depression'], 0],
    ['Parents and teachers can support ODD by:', ['Using consistent expectations and positive strategies', 'Ignoring all behavior', 'Punishing every mistake', 'Avoiding communication'], 0],
    ['ODD is commonly diagnosed during:', ['Childhood or adolescence', 'Old age only', 'Infancy only', 'Adulthood only'], 0],
  ],
  neuro: [
    ['Neurodevelopmental disorders usually begin:', ['During development in childhood', 'Only after age 50', 'After injuries only', 'During adulthood only'], 0],
    ['ADHD mainly affects:', ['Attention, impulse control, and activity level', 'Vision', 'Height', 'Bone growth'], 0],
    ['A common symptom of ADHD is:', ['Difficulty focusing and controlling impulses', 'Hearing voices', 'Extreme fear', 'Loss of identity'], 0],
    ['Autism Spectrum Disorder affects:', ['Communication, behavior, and social interaction', 'Only physical strength', 'Only memory', 'Only emotions'], 0],
    ['Genetics can play a role in neurodevelopmental disorders by:', ['Influencing risk and development', 'Guaranteeing a disorder', 'Preventing learning', 'Removing abilities'], 0],
    ['Accommodations help students by:', ['Providing support for learning needs', 'Lowering intelligence', 'Removing challenges completely', 'Preventing education'], 0],
    ['A student struggles with focus, organization, and impulsivity. This may suggest:', ['ADHD', 'PTSD', 'Eating disorder', 'Schizophrenia'], 0],
    ['Early support is important because it can:', ['Improve skills and development', 'Remove personality', 'Prevent friendships', 'Stop learning'], 0],
    ['Neurodevelopmental disorders affect:', ['Brain development and functioning', 'Only physical appearance', 'Only mood', 'Only sleep'], 0],
    ['Support for neurodevelopmental disorders may include:', ['Therapy, education strategies, and accommodations', 'Ignoring symptoms', 'Avoiding school', 'Removing responsibilities'], 0],
  ],
}

Object.values(QUIZ_BANK).forEach(group => {
  group.forEach(([, options]) => {
    options.forEach(option => {
      ID_LABEL[option] = option
    })
  })
})

const QUESTIONS_BANK = [
  { clue: "Feeling nervous or restless with a sense of impending danger or doom, even when no clear threat exists.", correct: 'anxiety',       note: "Anxiety disorders involve excessive fear that persists beyond realistic threats." },
  { clue: "Persistent sadness and loss of interest in once-enjoyed activities lasting weeks or longer.", correct: 'depression',    note: "Major depressive disorder causes prolonged low mood affecting thoughts, feelings, and functioning." },
  { clue: "Alternating periods of unusually high energy and elevated mood with episodes of deep sadness.", correct: 'bipolar',      note: "Bipolar disorder cycles between manic/hypomanic highs and depressive lows." },
  { clue: "Intrusive memories, nightmares, and avoidance of reminders following a terrifying event.", correct: 'ptsd',          note: "PTSD develops when trauma responses persist and interfere with daily life." },
  { clue: "Hearing voices or holding firm false beliefs that are not based in reality.", correct: 'schizophrenia',  note: "These are 'positive symptoms' of schizophrenia — added experiences not grounded in reality." },
  { clue: "Preoccupation with calories and body shape, combined with extreme or restrictive eating behaviors.", correct: 'eating',        note: "Eating disorders involve an unhealthy relationship with food, eating, and body image." },
  { clue: "Persistent angry mood and argumentative behavior toward authority figures in a child or adolescent.", correct: 'odd',          note: "ODD is a disruptive behavior disorder most commonly diagnosed in childhood." },
  { clue: "Delays in reaching developmental milestones and difficulties with learning or impulse control from an early age.", correct: 'neuro',        note: "Neurodevelopmental disorders emerge in early childhood and affect brain development." },
  { clue: "Reduced need for sleep, racing thoughts, and inflated self-esteem lasting at least a week.", correct: 'bipolar',      note: "These are hallmark manic episode symptoms within bipolar disorder." },
  { clue: "Social withdrawal, reduced emotional expression, and loss of motivation even without hallucinations.", correct: 'schizophrenia',  note: "These are 'negative symptoms' of schizophrenia — loss of normal functioning." },
  { clue: "Excessive worry lasting six months or more, paired with restlessness, fatigue, and poor concentration.", correct: 'anxiety',       note: "These are core features of Generalized Anxiety Disorder (GAD), a type of anxiety disorder." },
  { clue: "Genetic factors, chromosomal differences, and early brain development all contribute to this condition presenting in childhood.", correct: 'neuro', note: "Neurodevelopmental disorders have strong biological roots and typically emerge before school age." },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuizRound() {
  return shuffle(
    DISORDERS.map(d => {
      const [clue, options, answerIndex] = shuffle(QUIZ_BANK[d.id])[0]
      return {
        disorderId: d.id,
        clue,
        options: shuffle(options),
        correct: options[answerIndex],
        note: `This question reviews ${ID_LABEL[d.id]}. Check the Library tab for more details.`,
      }
    })
  )
}

// ─── library accordion item ────────────────────────────────────────────────────

function DisorderCard({ d }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`il-card${open ? ' il-card--open' : ''}`} style={{ '--accent-local': d.color }}>
      <button className="il-card-header" onClick={() => setOpen(v => !v)}>
        <div className="il-card-dot" style={{ background: d.color }} />
        <span className="il-card-title">{d.title}</span>
        <span className="il-chevron" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>

      {open && (
        <div className="il-card-body">
          <div className="il-source-row">
            <span className="il-source-label">Source: {d.source}</span>
          </div>

          <div className="il-section">
            <p className="il-section-label" style={{ color: d.color }}>What it is</p>
            <p className="il-section-text">{d.what}</p>
          </div>

          <div className="il-cols">
            <div className="il-section">
              <p className="il-section-label" style={{ color: d.color }}>Common symptoms</p>
              <ul className="il-list">
                {d.symptoms.map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="il-section">
              <p className="il-section-label" style={{ color: d.color }}>Causes &amp; risk factors</p>
              <ul className="il-list">
                {d.causes.map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>

          <div className="il-section">
            <p className="il-section-label" style={{ color: d.color }}>Treatment options</p>
            <ul className="il-list">
              {d.treatment.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>

          <a
            className="il-article-link"
            href={d.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: d.color, borderColor: d.color }}
          >
            Read full article → {d.source}
          </a>
        </div>
      )}
    </div>
  )
}

// ─── library tab ──────────────────────────────────────────────────────────────

function LibraryTab() {
  return (
    <div className="il-library">
      {false && <div className="il-who-note">
        <strong>8 common mental health conditions</strong> — Information sourced from Mayo Clinic and the World Health Organization (WHO).
        Click any condition to expand its entry.
      </div>}
      <div className="il-disorders-list">
        {DISORDERS.map(d => <DisorderCard key={d.id} d={d} />)}
      </div>
    </div>
  )
}

// ─── quiz tab ─────────────────────────────────────────────────────────────────

function QuizTab() {
  const [questions, setQuestions] = useState(() => buildQuizRound())
  const [idx, setIdx]             = useState(0)
  const [selected, setSelected]   = useState(null)
  const [score, setScore]         = useState(0)
  const [done, setDone]           = useState(false)
  const [answers, setAnswers]     = useState([])

  const q = questions[idx]
  const total = questions.length

  function choose(optId) {
    if (selected) return
    const correct = optId === q.correct
    if (correct) setScore(s => s + 1)
    setSelected(optId)
    setAnswers(prev => [...prev, {
      clue: q.clue,
      correct: q.correct,
      selected: optId,
      correctText: q.correct,
      selectedText: optId,
      note: q.note,
    }])
  }

  function next() {
    if (idx + 1 >= total) {
      setDone(true)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
    }
  }

  function restart() {
    setQuestions(buildQuizRound())
    setIdx(0); setSelected(null); setScore(0); setDone(false); setAnswers([])
  }

  if (done) {
    const pct = Math.round((score / total) * 100)
    const missed = answers.filter(a => a.selected !== a.correct)
    return (
      <div className="il-results">
        <div className="il-results-score-ring" style={{ '--pct': pct }}>
          <div className="il-results-inner">
            <span className="il-results-num">{score}<span style={{ fontSize: '1.2rem' }}>/{total}</span></span>
            <span className="il-results-sub">correct</span>
          </div>
        </div>
        <h3 className="il-results-heading">
          {pct >= 90 ? 'Excellent work!' : pct >= 70 ? 'Good effort!' : 'Keep practicing!'}
        </h3>
        <p className="il-results-msg" style={{ color: 'var(--muted)' }}>
          {pct >= 90
            ? 'You have a strong grasp of these mental health conditions.'
            : pct >= 70
            ? 'Review the conditions you missed in the Library tab.'
            : 'Read through the Library entries, then try again.'}
        </p>

        {missed.length > 0 && (
          <div className="il-missed-section">
            <p className="il-missed-label">Review — missed questions</p>
            {missed.map((a, i) => (
              <div key={i} className="il-missed-card">
                <p className="il-missed-clue">{a.clue}</p>
                <div className="il-missed-answer-row">
                  <span className="il-missed-wrong">{a.selectedText}</span>
                  <span className="il-missed-arrow">→</span>
                  <span className="il-missed-right">{a.correctText}</span>
                </div>
                <p className="il-missed-note">{a.note}</p>
              </div>
            ))}
          </div>
        )}

        <button className="il-primary-btn" onClick={restart}>Play again</button>
      </div>
    )
  }

  return (
    <div className="il-quiz">
      <div className="il-quiz-header">
        <div className="il-progress-bar">
          <div className="il-progress-fill" style={{ width: `${(idx / total) * 100}%` }} />
        </div>
        <span className="il-progress-label">{idx + 1} / {total}</span>
      </div>

      <div className="il-clue-card">
        <p className="il-clue-eyebrow">Choose the best answer.</p>
        <p className="il-clue-text">{q.clue}</p>
      </div>

      <div className="il-options">
        {q.options.map(optionText => {
          const isSelected  = selected === optionText
          const isCorrect   = optionText === q.correct
          const showCorrect = selected && isCorrect
          const showWrong   = selected && isSelected && !isCorrect

          return (
            <button
              key={optionText}
              className={`il-option${showCorrect ? ' il-option--correct' : ''}${showWrong ? ' il-option--wrong' : ''}${selected && !isSelected && !isCorrect ? ' il-option--dim' : ''}`}
              onClick={() => choose(optionText)}
              disabled={!!selected}
            >
              <span className="il-option-text">{optionText}</span>
              {showCorrect && <span className="il-option-icon">✓</span>}
              {showWrong   && <span className="il-option-icon">✗</span>}
            </button>
          )
        })}
      </div>

      {selected && (
        <div className={`il-feedback${selected === q.correct ? ' il-feedback--correct' : ' il-feedback--wrong'}`}>
          <strong>{selected === q.correct ? 'Correct!' : `Not quite — the answer is ${ID_LABEL[q.correct]}.`}</strong>
          <p>{q.note}</p>
          <button className="il-next-btn" onClick={next}>
            {idx + 1 >= total ? 'See results' : 'Next question →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── root ─────────────────────────────────────────────────────────────────────

export default function InfoLibrary() {
  const [tab, setTab] = useState('library')
  const streak = 0

  return (
    <section className="page">
      <style>{IL_STYLES}</style>

      <div className="il-page-header">
        <div>
          <h2 className="il-page-title">Mental Health Library</h2>
          <p className="il-page-sub">
            Evidence-based information on 8 common conditions, with a quiz to reinforce what you learn.
          </p>
        </div>
        <div className="il-streak-badge">
          <span className="il-streak-flame">▲</span>
          <div>
            <span className="il-streak-num">{streak}</span>
            <span className="il-streak-label">day streak</span>
          </div>
        </div>
      </div>

      <div className="il-tabs">
        <button
          className={`il-tab${tab === 'library' ? ' il-tab--active' : ''}`}
          onClick={() => setTab('library')}
        >
          Library
        </button>
        <button
          className={`il-tab${tab === 'quiz' ? ' il-tab--active' : ''}`}
          onClick={() => setTab('quiz')}
        >
          Quiz
        </button>
      </div>

      {tab === 'library' && <LibraryTab />}
      {tab === 'quiz' && <QuizTab />}
    </section>
  )
}

// ─── styles ───────────────────────────────────────────────────────────────────

const IL_STYLES = `
  /* page header */
  .il-page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .il-page-title  {
    margin: 0 0 4px;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 2rem;
    letter-spacing: -0.03em;
  }
  .il-page-sub    { margin: 0; color: var(--muted); font-size: 0.95rem; }

  /* streak badge */
  .il-streak-badge { display: none; }
  .il-streak-flame { font-size: 1.4rem; color: #f59e0b; }
  .il-streak-num   { display: block; font-size: 1.6rem; font-weight: 900; color: #92400e; letter-spacing: -0.03em; line-height: 1; }
  .il-streak-label { display: block; font-size: 0.72rem; color: #b45309; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

  /* tabs */
  .il-tabs {
    display: flex; gap: 4px;
    background: rgba(255,255,255,0.6); border: 1px solid var(--line);
    border-radius: 14px; padding: 4px; width: fit-content;
  }
  .il-tab {
    padding: 9px 24px; border-radius: 10px; border: none;
    background: transparent; font-size: 0.9rem; font-weight: 600;
    color: var(--muted); transition: background 140ms, color 140ms;
  }
  .il-tab--active { background: var(--panel-strong); color: var(--blue-dark); box-shadow: 0 2px 8px rgba(46,42,38,0.08); border-bottom: 2px solid var(--blue); }

  /* who note */
  .il-who-note {
    padding: 12px 16px; border-radius: 14px; font-size: 0.84rem;
    background: var(--accent-soft); color: var(--accent);
    border: 1px solid rgba(77,107,88,0.18); line-height: 1.55;
  }

  /* library */
  .il-library { display: flex; flex-direction: column; gap: 14px; }
  .il-disorders-list { display: flex; flex-direction: column; gap: 10px; }

  /* disorder card */
  .il-card {
    background: var(--panel-strong); border: 1px solid var(--line);
    border-radius: 18px; overflow: hidden;
    box-shadow: 0 4px 12px rgba(46,42,38,0.06);
    transition: box-shadow 140ms;
  }
  .il-card--open { box-shadow: 0 8px 24px rgba(46,42,38,0.10); }
  .il-card-header {
    display: flex; align-items: center; gap: 12px; width: 100%;
    padding: 16px 18px; background: none; border: none; cursor: pointer; text-align: left;
    transition: background 140ms;
  }
  .il-card-header:hover { background: rgba(0,0,0,0.02); }
  .il-card-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .il-card-title { flex: 1; font-size: 1rem; font-weight: 700; }
  .il-chevron { font-size: 1rem; color: var(--muted); transition: transform 200ms ease; flex-shrink: 0; }

  .il-card-body {
    padding: 0 20px 20px;
    border-top: 1px solid var(--line);
    animation: fade-up 180ms ease;
  }
  .il-source-row { display: flex; justify-content: flex-end; padding: 10px 0 14px; }
  .il-source-label { font-size: 0.74rem; color: var(--muted); font-style: italic; }

  .il-section { margin-bottom: 16px; }
  .il-section-label { margin: 0 0 8px; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .il-section-text  { margin: 0; font-size: 0.88rem; color: var(--muted); line-height: 1.65; }

  .il-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .il-list { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 5px; }
  .il-list li { font-size: 0.86rem; color: var(--muted); line-height: 1.5; }

  .il-article-link {
    display: inline-block; margin-top: 6px;
    padding: 8px 16px; border-radius: 999px;
    border: 1.5px solid; background: transparent;
    font-size: 0.82rem; font-weight: 700; text-decoration: none;
    transition: opacity 140ms;
  }
  .il-article-link:hover { opacity: 0.75; }

  /* quiz */
  .il-quiz { display: flex; flex-direction: column; gap: 20px; max-width: 620px; }
  .il-quiz-header { display: flex; align-items: center; gap: 12px; }
  .il-progress-bar { flex: 1; height: 8px; background: #ede8df; border-radius: 999px; overflow: hidden; }
  .il-progress-fill { height: 100%; background: linear-gradient(90deg, var(--accent), #7a9e8a); border-radius: inherit; transition: width 300ms ease; }
  .il-progress-label { font-size: 0.8rem; font-weight: 700; color: var(--muted); flex-shrink: 0; }

  .il-clue-card {
    background: linear-gradient(135deg, rgba(210,228,220,0.5), rgba(255,255,255,0.95));
    border: 1px solid rgba(77,107,88,0.18); border-radius: 20px;
    padding: 24px 26px;
    box-shadow: var(--shadow);
  }
  .il-clue-eyebrow { margin: 0 0 10px; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); }
  .il-clue-text { margin: 0; font-size: 1.05rem; line-height: 1.65; color: var(--ink); }

  .il-options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .il-option {
    padding: 13px 16px; border-radius: 16px;
    border: 1.5px solid var(--line); background: var(--panel-strong);
    text-align: left; font-size: 0.9rem; font-weight: 600;
    display: flex; justify-content: space-between; align-items: center;
    transition: border-color 140ms, background 140ms, opacity 140ms;
  }
  .il-option:not(:disabled):hover { border-color: var(--accent); background: var(--accent-soft); }
  .il-option--correct { border-color: #16a34a; background: rgba(22,163,74,0.08); color: #15803d; }
  .il-option--wrong   { border-color: #dc2626; background: rgba(220,38,38,0.08); color: #dc2626; }
  .il-option--dim     { opacity: 0.45; }
  .il-option-text  { flex: 1; }
  .il-option-icon  { font-size: 1rem; font-weight: 800; }

  .il-feedback {
    padding: 16px 20px; border-radius: 16px;
    animation: fade-up 180ms ease;
  }
  .il-feedback--correct { background: rgba(22,163,74,0.08); border: 1px solid rgba(22,163,74,0.25); }
  .il-feedback--wrong   { background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.2); }
  .il-feedback strong { display: block; margin-bottom: 5px; font-size: 0.92rem; }
  .il-feedback p { margin: 0 0 14px; font-size: 0.86rem; color: var(--muted); line-height: 1.55; }
  .il-next-btn {
    padding: 9px 22px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.88rem; font-weight: 700;
    transition: opacity 140ms;
  }
  .il-next-btn:hover { opacity: 0.88; }

  /* results */
  .il-results { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; }
  .il-results-score-ring {
    width: 140px; height: 140px; border-radius: 50%;
    background: conic-gradient(#3a6898 calc(var(--pct) * 1%), #ede8df 0%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 0 8px var(--panel-strong);
  }
  .il-results-inner {
    width: 108px; height: 108px; border-radius: 50%;
    background: var(--panel-strong); display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 2px;
  }
  .il-results-num   {
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 2.2rem;
    font-weight: 900;
    color: var(--accent);
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .il-results-sub   { font-size: 0.74rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
  .il-results-heading {
    margin: 4px 0 0;
    font-family: "Geist", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
  .il-primary-btn {
    padding: 12px 28px; border-radius: 999px; border: none;
    background: var(--accent); color: #fff; font-size: 0.95rem; font-weight: 700;
    transition: opacity 140ms; margin-top: 6px;
  }
  .il-primary-btn:hover { opacity: 0.88; }

  .il-missed-section { width: 100%; max-width: 580px; text-align: left; }
  .il-missed-label { font-size: 0.74rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin: 0 0 10px; }
  .il-missed-card { background: var(--panel-strong); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
  .il-missed-clue  { margin: 0 0 8px; font-size: 0.88rem; color: var(--ink); line-height: 1.5; }
  .il-missed-answer-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 0.84rem; }
  .il-missed-wrong { color: #dc2626; font-weight: 700; text-decoration: line-through; }
  .il-missed-arrow { color: var(--muted); }
  .il-missed-right { color: #15803d; font-weight: 700; }
  .il-missed-note  { margin: 0; font-size: 0.8rem; color: var(--muted); line-height: 1.5; font-style: italic; }

  @media (max-width: 640px) {
    .il-page-header { flex-direction: column; }
    .il-cols   { grid-template-columns: 1fr; }
    .il-options { grid-template-columns: 1fr; }
    .il-results-score-ring { width: 120px; height: 120px; }
    .il-results-inner { width: 90px; height: 90px; }
  }
`
