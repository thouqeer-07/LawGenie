import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

const FastTypewriter = ({ text }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    let index = 0;
    const charsPerTick = 4; // Type 4 characters at a time for "flash" speed
    const interval = setInterval(() => {
      index += charsPerTick;
      setDisplayedText(text.slice(0, index));
      
      // Auto-scroll to bottom as text is rendered
      window.scrollTo(0, document.body.scrollHeight);

      if (index >= text.length) {
        clearInterval(interval);
      }
    }, 12); // Approximately 300+ characters per second
    
    return () => clearInterval(interval);
  }, [text]);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

function App() {
  const messagesEndRef = useRef(null);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [view, setView] = useState('home');
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light-theme' : '';
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    // Scroll down instantly when messages change or loading state turns on
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scenario.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setMessages([]);

    try {
      const response = await fetch('/api/law', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenario }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Something went wrong with the legal analysis.');
      }

      const data = await response.json();
      setResult(data);
      setView('results');
      
      // Add initial context to messages for history
      setMessages([
        { role: 'user', content: `Analyze this scenario: ${scenario}` },
        { role: 'model', content: JSON.stringify(data) } // Store result as a JSON string or simplified text
      ]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      // Format history for Gemini API
      // Transform our messages into the format required by the backend
      const history = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, history }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'model', content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleBack = () => {
    setView('home');
    setResult(null);
    setScenario('');
    setError(null);
    setMessages([]);
    setChatInput('');
  };

  const examples = [
    "I was involved in a minor car accident where the other driver was speeding.",
    "My tenant has not paid rent for 3 months and is refusing to vacate.",
    "Someone is using my photos on social media without permission to harass me.",
    "I bought a mobile phone online but received a fake product and no refund."
  ];

  return (
    <div className="container">
      <div className="theme-toggle-wrapper">
        <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      <header className="header animate-fade-in">
        <div className="logo-group">
          <div className="logo-icon">⚖️</div>
          <h1>LawGenie <span className="beta-badge">AI Assistant</span></h1>
        </div>
        <p className="subtitle">AI-powered legal assistant for Indian laws</p>
      </header>

      <main className="main-content">
        {view === 'home' ? (
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
        ) : (
          <div className="results-view animate-fade-in">
            <div className="top-actions">
              <button className="back-btn" onClick={handleBack}>
                <span>←</span> Start New Analysis
              </button>
            </div>

            <div className="results-container">
              {/* Initial Structured Report */}
              {result && (
                <div className="initial-report animate-fade-in">
                  <div className="result-card glass-card">
                    <div className="card-header">
                      <h2>📊 Scenario Understanding</h2>
                    </div>
                    <div className="scenario-text"><ReactMarkdown>{result.scenario}</ReactMarkdown></div>
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
                            <div className="law-explanation"><ReactMarkdown>{law.explanation}</ReactMarkdown></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="result-card glass-card consequences-card">
                      <div className="card-header">
                        <h2>⚖️ Potential Consequences</h2>
                      </div>
                      <div className="consequences-text"><ReactMarkdown>{result.consequences}</ReactMarkdown></div>
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
                            <div className="markdown-content"><ReactMarkdown>{step}</ReactMarkdown></div>
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
                            <div className="markdown-content"><ReactMarkdown>{tip}</ReactMarkdown></div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-turn Chat History */}
              <div className="chat-history">
                {messages.slice(2).map((msg, idx) => (
                  <div key={idx} className={`chat-bubble ${msg.role}`}>
                    <div className="bubble-header">
                      {msg.role === 'user' ? 'You' : 'LawGenie'}
                    </div>
                    <div className="bubble-content markdown-content" style={{ whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal' }}>
                      {msg.role === 'model' ? (
                        <FastTypewriter text={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble model loading">
                    <div className="bubble-content">
                      <span className="typing-dots">Thinking...</span>
                    </div>
                  </div>
                )}
                
                {/* Element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <section className="chat-input-sticky">
              <div className="chat-input-island">
                <button type="button" className="new-chat-btn" onClick={handleBack} title="Start New Report">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                </button>
                <form onSubmit={handleSendMessage} className="minimal-chat-form">
                  <textarea
                    placeholder="Message LawGenie..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    rows={chatInput.split('\n').length > 1 ? Math.min(5, chatInput.split('\n').length) : 1}
                    className="minimal-chat-input"
                  />
                  <button 
                    type="submit" 
                    className={`minimal-send-btn ${chatInput.trim() ? 'active' : ''}`}
                    disabled={chatLoading || !chatInput.trim()}
                  >
                    {chatLoading ? (
                      <span className="spinner button-spinner"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    )}
                  </button>
                </form>
              </div>
            </section>
            
            <footer className="report-footer">
              <p>Disclaimer: This is AI-generated information and not legal advice. Please consult a professional lawyer for legal matters.</p>
            </footer>
          </div>
        )}

        {error && (
          <div className="error-card animate-fade-in">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => setView('home')}>Go Back</button>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;
