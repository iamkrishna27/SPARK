import { useState } from 'react'
import './App.css'

const sectors = [
  'Agriculture',
  'Livestock',
  'Food Processing',
  'Wearing apparel',
  'Motor vehicles',
  'Pharmaceuticals',
  'Wholesale or retail',
  'Financial services',
  'Land transport',
  'Health services',
  'Leather goods',
  'Accommodation',
  'Bricks',
  'Cement',
  'Iron and Steel',
  'Other manufacturing',
  'Other services',
]

const policyRecommendations = {
  'Lack of information':
    'Provide FinTech awareness programs, digital-payment training, and information about available government support.',
  'Uncertainty about demand':
    'Provide SME digital-market support, customer adoption programs, and pilot initiatives to reduce uncertainty.',
  'Cost / economic benefit':
    'Provide financial incentives, reduced transaction-cost support, and affordable FinTech solutions.',
  'Lack of technical skills':
    'Provide digital-skills training, technical assistance, and SME FinTech support centers.',
  'Lack of financing':
    'Improve access to suitable digital-finance products, credit support, and financing assistance.',
  'Consumer preference':
    'Promote digital-payment awareness among customers and encourage SME digital-payment usage.',
  'Regulatory issues':
    'Provide clear FinTech adoption guidelines, simplified procedures, and regulatory support.',
  Other:
    'Provide general FinTech advisory and SME digital-transformation support.',
}

const fields = [
  {
    name: 'employees',
    label: 'Number of Employees',
    type: 'number',
    min: 1,
    step: 1,
  },
  {
    name: 'yearStarted',
    label: 'Year Started',
    type: 'number',
    min: 1900,
    max: new Date().getFullYear(),
    step: 1,
  },
  { name: 'sector', label: 'Sector', options: sectors },
  {
    name: 'financingCount',
    label: 'Number of Times Financing Was Needed but Not Received',
    type: 'number',
    min: 0,
    step: 1,
  },
  { name: 'hasWebsite', label: 'Has Website', options: ['Yes', 'No'] },
  {
    name: 'usesSocialMedia',
    label: 'Uses Social Media',
    options: ['Yes', 'No', "Don't know"],
  },
  {
    name: 'financedEquipment',
    label: 'Financed Equipment',
    options: ['Yes', 'No', "Don't know"],
  },
  {
    name: 'awareOfSupport',
    label: 'Aware of Government Support',
    options: ['Yes', 'No'],
  },
  {
    name: 'benefitedFromSupport',
    label: 'Benefited from Government Support',
    options: ['Yes', 'No', "Don't know"],
  },
  {
    name: 'sellsThroughWebsite',
    label: 'Sells Through Own Website',
    options: ['Yes', 'No', "Don't know"],
  },
  {
    name: 'mainBarrier',
    label: 'Main Barrier to FinTech Adoption',
    options: Object.keys(policyRecommendations),
  },
]

function App() {
  const [showAssessment, setShowAssessment] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionMessage, setPredictionMessage] = useState('')
  const [predictionResult, setPredictionResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsPredicting(true)
    setPredictionMessage('')
    setPredictionResult(null)

    const formData = new FormData(event.currentTarget)
    const mainBarrier = formData.get('mainBarrier')
    const requestData = {
      employees: Number(formData.get('employees')),
      year_started: Number(formData.get('yearStarted')),
      sector: formData.get('sector'),
      loan_needed_not_received_count: Number(formData.get('financingCount')),
      has_website: formData.get('hasWebsite'),
      uses_social_media: formData.get('usesSocialMedia'),
      financed_equipment: formData.get('financedEquipment'),
      aware_gov_support: formData.get('awareOfSupport'),
      benefited_gov_support: formData.get('benefitedFromSupport'),
      sells_via_own_website: formData.get('sellsThroughWebsite'),
    }

    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error('Prediction request failed')
      }

      setPredictionResult({
        prediction: result.prediction,
        adopterProbability: result.adopter_probability,
        mainBarrier,
      })
    } catch {
      setPredictionMessage('Unable to connect to the prediction service.')
    } finally {
      setIsPredicting(false)
    }
  }

  return (
    <main className="page">
      <header className="site-header">
        <div className="brand" aria-label="FinTech for SMEs">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>FinTech for SMEs</span>
        </div>
      </header>

      {showAssessment ? (
        <section className="assessment" aria-labelledby="assessment-title">
          <div className="assessment-heading">
            <button
              className="back-button"
              type="button"
              onClick={() => setShowAssessment(false)}
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
            <p className="eyebrow">SME PROFILE</p>
            <h1 id="assessment-title">Start your assessment</h1>
            <p className="description">
              Tell us a little about your business to get started.
            </p>
          </div>

          {predictionResult ? (
            <div className="result-stack">
              <section
                className={`result-card ${
                  predictionResult.prediction === 'Adopter'
                    ? 'result-adopter'
                    : 'result-non-adopter'
                }`}
                aria-labelledby="result-title"
                aria-live="polite"
              >
                <p className="eyebrow">ASSESSMENT COMPLETE</p>
                <h2 id="result-title">Prediction Result</h2>
                <div className="result-detail">
                  <span className="result-label">Prediction</span>
                  <strong className="result-prediction">
                    {predictionResult.prediction}
                  </strong>
                </div>
                <div className="result-detail">
                  <span className="result-label">Adoption Probability</span>
                  <strong className="result-probability">
                    {(predictionResult.adopterProbability * 100).toFixed(2)}%
                  </strong>
                </div>
              </section>

              <section
                className="result-card recommendation-card"
                aria-labelledby="recommendation-title"
              >
                <p className="eyebrow">RULE-BASED GUIDANCE</p>
                <h2 id="recommendation-title">Policy Recommendation</h2>
                <div className="result-detail">
                  <span className="result-label">Main Barrier</span>
                  <strong className="barrier-name">
                    {predictionResult.mainBarrier}
                  </strong>
                </div>
                <div className="recommendation-action">
                  <span className="result-label">Recommended Action</span>
                  <p>
                    {policyRecommendations[predictionResult.mainBarrier]}
                  </p>
                </div>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => {
                    setPredictionResult(null)
                    setPredictionMessage('')
                  }}
                >
                  Assess Again
                  <span aria-hidden="true">→</span>
                </button>
              </section>
            </div>
          ) : (
          <form className="assessment-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              {fields.map((field) => (
                <div className="form-field" key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  {field.options ? (
                    <select id={field.name} name={field.name} required defaultValue="">
                      <option value="" disabled>
                        Select an option
                      </option>
                      {field.options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      required
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={isPredicting}
              >
                {isPredicting ? 'Predicting...' : 'Predict Adoption'}
                {!isPredicting && <span aria-hidden="true">→</span>}
              </button>
            </div>
            {predictionMessage && (
              <p className="prediction-message" role="status">
                {predictionMessage}
              </p>
            )}
          </form>
          )}
        </section>
      ) : (
        <section className="hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow">DIGITAL PAYMENTS, MADE CLEARER</p>
            <h1 id="page-title">
              AI-Based FinTech Adoption &amp; Policy Recommendation Platform for
              SMEs
            </h1>
            <p className="description">
              AI-based platform for analyzing SME digital payment adoption.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => setShowAssessment(true)}
            >
              Start Assessment
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="hero-art" aria-hidden="true">
            <div className="art-ring art-ring-outer" />
            <div className="art-ring art-ring-inner" />
            <div className="art-center">
              <span className="art-spark">✦</span>
              <span className="art-caption">SME</span>
            </div>
            <span className="art-dot art-dot-one" />
            <span className="art-dot art-dot-two" />
          </div>
        </section>
      )}

      <footer className="site-footer">
        <span>Supporting smarter digital payment adoption</span>
        <span className="footer-accent" aria-hidden="true">●</span>
      </footer>
    </main>
  )
}

export default App
