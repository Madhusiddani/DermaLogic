// Mock AI service for testing when Gemini API is not available
const fs = require('fs');

// Mock analyze image function that returns a sample response
async function analyzeImage(imagePath) {
  console.log('🧪 Using MOCK AI service (Gemini API not available)');
  
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Return a mock analysis result
  return {
    condition: "Eczema (Mock Response)",
    confidence: 75,
    description: "This is a mock response for testing purposes. The image appears to show characteristics consistent with eczema, but this is simulated data.",
    alternatives: [
      { name: "Contact Dermatitis", confidence: 45 },
      { name: "Psoriasis", confidence: 30 },
      { name: "Dry Skin", confidence: 25 }
    ],
    note: "⚠️ This is a MOCK response for testing. Real Gemini AI analysis is currently unavailable due to API key issues."
  };
}

module.exports = {
  analyzeImage
};