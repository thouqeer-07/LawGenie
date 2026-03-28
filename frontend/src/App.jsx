import React, { useState } from 'react';
import './App.css';

function App() {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scenario.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/law', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        throw new Error('Something went wrong with the legal analysis.');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const examples = [
    "I was involved in a minor car accident where the other driver was speeding.",
    "My tenant has not paid rent for 3 months and is refusing to vacate.",
    "Someone is using my photos on social media without permission to harass me.",
    "I bought a mobile phone online but received a fake product and no refund."
  ];

  return (
    <div className="container">
      <header className="header animate-fade-in">
        <div className="logo-group">
          <div className="logo-icon">⚖️</div>
          <h1>LawGenie <span className="beta-badge">AI Assistant</span></h1>
        </div>
        <p className="subtitle">AI-powered legal assistant for Indian laws</p>
      </header>

      <main className="main-content">
        <section className="input-section glass-card animate-fade-in" style={{animationDelay: '0.1s'}}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="scenario">Describe your situation</label>
              <textarea
                id="scenario"
                placeholder="e.g., I was hit by a speeding vehicle while crossing the road..."
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                rows="4"
              />
            </div>
            
            <div className="example-chips">
              <span>Try:</span>
              {examples.map((ex, idx) => (
                <button 
                  key={idx} 
                  type="button" 
                  className="chip"
                  onClick={() => setScenario(ex)}
                >
                  {ex.length > 30 ? ex.substring(0, 30) + '...' : ex}
                </button>
              ))}
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={loading || !scenario.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Analyzing Situation...
                </>
              ) : (
                'Generate Legal Report'
              )}
            </button>
          </form>
        </section>

        {error && (
          <div className="error-card animate-fade-in">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="results-container animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="result-card glass-card">
              <div className="card-header">
                <h2>📊 Scenario Understanding</h2>
              </div>
              <p className="scenario-text">{result.scenario}</p>
            </div>

            <div className="result-grid">
              <div className="result-card glass-card laws-card">
                <div className="card-header">
                  <h2>📜 Applicable Laws</h2>
                </div>
                <div className="laws-list">
                  {result.laws.map((law, idx) => (
                    <div key={idx} className="law-item">
                      <div className="law-name-wrap">
                        <span className="law-badge">{law.section}</span>
                        <h3 className="law-title">{law.name}</h3>
                      </div>
                      <p className="law-explanation">{law.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="result-card glass-card consequences-card">
                <div className="card-header">
                  <h2>⚖️ Potential Consequences</h2>
                </div>
                <p className="consequences-text">{result.consequences}</p>
              </div>
            </div>

            <div className="result-grid">
              <div className="result-card glass-card steps-card">
                <div className="card-header">
                  <h2>👉 Next Steps</h2>
                </div>
                <ul className="step-list">
                  {result.next_steps.map((step, idx) => (
                    <li key={idx}>
                      <span className="step-num">{idx + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="result-card glass-card tips-card">
                <div className="card-header">
                  <h2>💡 Helpful Tips</h2>
                </div>
                <ul className="tip-list">
                  {result.tips.map((tip, idx) => (
                    <li key={idx}>
                      <span className="tip-icon">✨</span>
                      <p>{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <footer className="report-footer">
              <p>Disclaimer: This is AI-generated information and not legal advice. Please consult a professional lawyer for legal matters.</p>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
