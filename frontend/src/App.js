import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Handle file selection (works for both camera and gallery)
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setResults(null);
      setError(null);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  // Analyze the selected image
  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset to start over
  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="header">
          <h1>SkinEval</h1>
          <p className="subtitle">AI-Powered Skin Analysis</p>
        </header>

        <main className="main-content">
          {/* Medical Notice */}
          <div className="medical-notice">
            <h3>⚠️ Important Medical Notice</h3>
            <p>
              SkinEval is an informational tool only and does not provide medical diagnosis. 
              Results are preliminary insights based on AI analysis and should not replace 
              professional medical evaluation. Always consult a qualified dermatologist for 
              proper diagnosis and treatment.
            </p>
          </div>

          {!results ? (
            <>
              {/* Get Started Section */}
              <div className="get-started-section">
                <h2>Get Started with Skin Analysis</h2>
                <p className="get-started-text">
                  Capture or upload a clear photo of the skin area you'd like to analyze. 
                  Our AI will provide preliminary insights about potential conditions.
                </p>

                {/* Image Selection Section */}
                <div className="image-section">
                  {previewUrl ? (
                    <div className="preview-container">
                      <img src={previewUrl} alt="Preview" className="preview-image" />
                      <button onClick={handleReset} className="btn btn-secondary">
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <div className="upload-section">
                      <div className="upload-buttons">
                        <label htmlFor="camera-input" className="btn btn-primary">
                          📷 Take Photo
                        </label>
                        <input
                          id="camera-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />

                        <label htmlFor="gallery-input" className="btn btn-primary">
                          🖼️ Upload Photo
                        </label>
                        <input
                          id="gallery-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Photo Guidelines */}
              <div className="guidelines-section">
                <h3>📸 Photo Guidelines</h3>
                <ul className="guidelines-list">
                  <li>Ensure good lighting for clear visibility</li>
                  <li>Hold camera steady and focus on the affected area</li>
                  <li>Include surrounding skin for context</li>
                  <li>Avoid shadows or glare on the skin</li>
                  <li>Take photos in a well-lit environment</li>
                </ul>
              </div>

              {/* Privacy Section */}
              <div className="privacy-section">
                <h3>🔒 Privacy & Data Protection</h3>
                <p className="privacy-intro">Your privacy is our priority. <strong>No login required.</strong></p>
                <p className="privacy-subtitle">How we protect your privacy:</p>
                <ul className="privacy-list">
                  <li>Images are processed temporarily and not stored</li>
                  <li>Analysis results are kept in your browser session only</li>
                  <li>No account creation or personal information required</li>
                  <li>All data is automatically cleared after 30 minutes</li>
                  <li>No tracking or third-party data sharing</li>
                </ul>
              </div>

              {/* Analyze Button */}
              {selectedImage && (
                <div className="analyze-section">
                  <button
                    onClick={handleAnalyze}
                    disabled={loading}
                    className="btn btn-analyze"
                  >
                    {loading ? 'Analyzing...' : '🔍 Analyze Skin Condition'}
                  </button>
                </div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Analyzing image with AI...</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="error-container">
                  <p className="error-message">⚠️ {error}</p>
                  <button onClick={handleReset} className="btn btn-secondary">
                    Try Again
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Results Section */
            <div className="results-section">
              <h2>Analysis Results</h2>

              <div className="result-card primary">
                <div className="result-header">
                  <h3>{results.condition}</h3>
                  <span className="confidence-badge">
                    {results.confidence}% confidence
                  </span>
                </div>
                <p className="description">{results.description}</p>
              </div>

              {results.alternatives && results.alternatives.length > 0 && (
                <div className="alternatives-section">
                  <h3>Alternative Possible Conditions</h3>
                  <div className="alternatives-list">
                    {results.alternatives.map((alt, index) => (
                      <div key={index} className="result-card alternative">
                        <div className="alternative-header">
                          <span className="alternative-name">{alt.name}</span>
                          <span className="alternative-confidence">
                            {alt.confidence}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="disclaimer">
                <p>
                  ⚠️ <strong>Medical Disclaimer:</strong> This analysis is for informational 
                  purposes only and is not a substitute for professional medical advice, 
                  diagnosis, or treatment. Always seek the advice of a qualified healthcare 
                  provider with any questions you may have regarding a medical condition.
                </p>
              </div>

              <button onClick={handleReset} className="btn btn-primary">
                Analyze Another Image
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

