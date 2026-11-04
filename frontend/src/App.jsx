import { useState, useRef } from 'react'
import html2pdf from 'html2pdf.js'
import AssessmentReport from './AssessmentReport'
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

// Ring Constants
const DECISION_THRESHOLD = 0.33;
const CX = 100;
const CY = 100;
const LABEL_RADIUS = 94;

function App() {
  const [showAssessment, setShowAssessment] = useState(false)
  const [isPredicting, setIsPredicting] = useState(false)
  const [predictionMessage, setPredictionMessage] = useState('')
  const [predictionResult, setPredictionResult] = useState(null)

  // PDF State Variables
  const [isDownloading, setIsDownloading] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const [lastRequestData, setLastRequestData] = useState(null)
  const reportRef = useRef(null)

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

      // Record successful prediction data for the PDF
      const generatedRefId = `SPARK-${new Date().getTime().toString().slice(-6)}`;
      setLastRequestData(requestData);

      setPredictionResult({
        prediction: result.prediction,
        adopterProbability: result.adopter_probability,
        mainBarrier,
        recommendation: policyRecommendations[mainBarrier],
        refId: generatedRefId
      })
    } catch {
      setPredictionMessage('Unable to connect to the prediction service.')
    } finally {
      setIsPredicting(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsDownloading(true);
    setPdfError('');

    try {
      const element = reportRef.current;
      const opt = {
        margin: 0,
        filename: `SPARK_Assessment_${predictionResult.refId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
      setPdfError("Failed to generate PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Ring Calculation Logic
  let probability = 0;
  let percent = 0;
  let isAdopter = false;
  let thresholdAngle = 0;
  let thresholdRad = 0;
  let labelX = 0;
  let labelY = 0;

  if (predictionResult) {
    probability = Math.min(Math.max(predictionResult.adopterProbability, 0), 1);
    percent = probability * 100;
    isAdopter = predictionResult.prediction === 'Adopter';

    thresholdAngle = DECISION_THRESHOLD * 360;
    thresholdRad = (thresholdAngle * Math.PI) / 180;
    labelX = CX + LABEL_RADIUS * Math.sin(thresholdRad);
    labelY = CY - LABEL_RADIUS * Math.cos(thresholdRad);
  }

  return (
    <main className="page">
      <header className="site-header">
        <div className="brand" aria-label="FinTech for SMEs">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>FinTech for SMEs</span>
        </div>
      </header>

      {/* HIDDEN PDF REPORT COMPONENT */}
      <AssessmentReport
        ref={reportRef}
        predictionResult={predictionResult}
        requestData={lastRequestData}
      />

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
                className={`result-card ${isAdopter ? 'result-card--adopter' : 'result-card--non-adopter'}`}
                aria-labelledby="result-title"
                aria-live="polite"
              >
                <header className="result-card__header">
                  <h3 className="result-card__title">Prediction Result</h3>
                  <span className="result-card__badge">{predictionResult.prediction}</span>
                </header>

                <div className="ring">
                  <svg
                    className="ring__svg"
                    viewBox="-5 0 210 200"
                    role="img"
                    aria-label={`Adoption probability ${percent.toFixed(2)} percent, ${predictionResult.prediction}. Decision threshold ${Math.round(DECISION_THRESHOLD * 100)} percent.`}
                  >
                    <circle className="ring__track" cx={CX} cy={CY} r="70" />

                    {percent > 0 && (
                      <circle
                        key={percent} /* re-triggers the animation on a new result */
                        className="ring__fill"
                        cx={CX}
                        cy={CY}
                        r="70"
                        pathLength="100"
                        transform={`rotate(-90 ${CX} ${CY})`}
                        style={{ '--p': String(percent) }}
                      />
                    )}

                    <line
                      className="ring__tick"
                      x1={CX}
                      y1="16"
                      x2={CX}
                      y2="44"
                      transform={`rotate(${thresholdAngle} ${CX} ${CY})`}
                    />
                    <text
                      className="ring__tick-label"
                      x={labelX}
                      y={labelY}
                      textAnchor={Math.sin(thresholdRad) >= 0 ? 'start' : 'end'}
                      dominantBaseline="middle"
                    >
                      {Math.round(DECISION_THRESHOLD * 100)}%
                    </text>
                  </svg>

                  <div className="ring__center">
                    <span className="ring__value">{percent.toFixed(2)}%</span>
                  </div>
                </div>
                <p className="result-card__hint">
                  The Random Forest model predicts adoption likelihood based on 10 specific firm-level features. A score at or above {Math.round(DECISION_THRESHOLD * 100)}% is classified as an Adopter.
                </p>

                {/* PDF DOWNLOAD BUTTON & ERROR MSG */}
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    style={{ width: '100%', justifyContent: 'center', background: '#10243B', color: 'white' }}
                  >
                    {isDownloading ? 'Generating PDF...' : 'Download Assessment Report'}
                  </button>
                  {pdfError && <span style={{ color: '#945c35', fontSize: '13px', textAlign: 'center' }}>{pdfError}</span>}
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
                    {predictionResult.recommendation}
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