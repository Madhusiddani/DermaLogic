const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const https = require('https');

let genAI;
let cachedModelName = null; // Cache the working model name

// Initialize Google Gemini AI
function initializeAI() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    console.warn('Warning: GEMINI_API_KEY not found. Please set it in .env file');
    return null;
  }

  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

// Convert image to base64
function imageToBase64(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  return imageBuffer.toString('base64');
}

// Analyze image using Gemini Vision
async function analyzeImage(imagePath) {
  try {
    if (!genAI) {
      genAI = initializeAI();
    }

    if (!genAI) {
      throw new Error('AI service not initialized. Please set GEMINI_API_KEY in .env file');
    }

    // Read and encode image once
    const imageData = imageToBase64(imagePath);
    const mimeType = getMimeType(imagePath);

    const prompt = `You are a dermatology assistant. Analyze this skin image and provide a medical assessment.

Please respond with ONLY a valid JSON object in this exact format (no markdown, no code blocks, no additional text):
{
  "condition": "most likely condition name",
  "confidence": 85,
  "description": "Brief 2-3 sentence description of the condition",
  "alternatives": [
    {"name": "Alternative condition 1", "confidence": 30},
    {"name": "Alternative condition 2", "confidence": 20},
    {"name": "Alternative condition 3", "confidence": 15}
  ]
}

Important guidelines:
- confidence should be 0-100 for the most likely condition
- alternatives should be 3-5 other possible conditions with confidence scores (0-100)
- Be medically accurate but note this is not a substitute for professional medical advice
- If the image is unclear or not skin-related, set confidence low and note it in description`;

    const imagePart = {
      inlineData: {
        data: imageData,
        mimeType: mimeType
      }
    };

    // Get list of candidate models to try
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    let candidateModels = [];
    
    // Try to get models from API first
    if (!cachedModelName) {
      try {
        const models = await listAvailableModels(apiKey);
        console.log(`Found ${models.length} available models`);
        
        // Filter models that support generateContent
        const availableModels = models.filter(model => 
          model.supportedGenerationMethods?.includes('generateContent')
        );
        
        // Prioritize models without "preview" or version dates (more stable)
        const stableModels = availableModels.filter(m => 
          !m.name.includes('preview') && !m.name.match(/\d{2}-\d{2}$/)
        );
        
        // Build candidate list: stable models first, then preview models, then fallbacks
        candidateModels = [
          ...stableModels.map(m => m.name.replace('models/', '')),
          ...availableModels.filter(m => 
            !stableModels.includes(m)
          ).map(m => m.name.replace('models/', ''))
        ];
        
        // Add fallback models
        candidateModels.push(
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-1.5-flash-latest',
          'gemini-pro-vision',
          'gemini-pro'
        );
        
        // Remove duplicates
        candidateModels = [...new Set(candidateModels)];
        
        console.log(`Trying ${candidateModels.length} candidate models...`);
      } catch (error) {
        console.log('Could not list models, using fallback list...');
        candidateModels = [
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-1.5-flash-latest',
          'gemini-pro-vision',
          'gemini-pro'
        ];
      }
    } else {
      // If we have a cached model, try it first, then others
      candidateModels = [cachedModelName, ...[
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash-latest',
        'gemini-pro-vision',
        'gemini-pro'
      ].filter(m => m !== cachedModelName)];
    }
    
    // Try each model until one works
    let result;
    let workingModel = null;
    let lastError;
    
    for (const modelName of candidateModels) {
      try {
        console.log(`Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([prompt, imagePart]);
        workingModel = modelName;
        console.log(`✓ Successfully used model: ${modelName}`);
        
        // Cache the working model
        cachedModelName = modelName;
        break;
      } catch (err) {
        lastError = err;
        // Clear cache if it was the cached model that failed
        if (modelName === cachedModelName) {
          console.log(`✗ Cached model ${modelName} failed, clearing cache...`);
          cachedModelName = null;
        }
        // Check if it's a 404 - try next model
        if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
          console.log(`✗ Model ${modelName} not available (404), trying next...`);
          continue;
        }
        // For other errors, log but continue trying
        console.log(`✗ Model ${modelName} error: ${err.message}, trying next...`);
        continue;
      }
    }
    
    if (!result || !workingModel) {
      cachedModelName = null; // Clear bad cache
      throw new Error(`No available Gemini model found. Tried ${candidateModels.length} models. Last error: ${lastError?.message || 'Unknown error'}. Please verify your API key has access to Gemini models and that the Generative Language API is enabled in your Google Cloud project.`);
    }
    const response = result.response;
    const text = response.text();

    // Extract JSON from response (handle cases where model returns markdown)
    let jsonText = text.trim();
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to extract JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const analysis = JSON.parse(jsonText);

    // Validate and format response
    return {
      condition: analysis.condition || 'Unknown',
      confidence: Math.max(0, Math.min(100, analysis.confidence || 0)),
      description: analysis.description || 'Unable to analyze image.',
      alternatives: (analysis.alternatives || []).slice(0, 5).map(alt => ({
        name: alt.name || 'Unknown',
        confidence: Math.max(0, Math.min(100, alt.confidence || 0))
      }))
    };
  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Clear cache if there's an error (might be a bad model)
    if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
      cachedModelName = null;
    }
    
    // If it's a parsing error, the model might have returned invalid JSON
    if (error instanceof SyntaxError) {
      throw new Error('AI model returned invalid response. Please try again or use a different image.');
    }
    
    throw error;
  }
}

// List available models from Google Generative AI API
async function listAvailableModels(apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: '/v1beta/models?key=' + apiKey,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve(response.models || []);
          } catch (err) {
            reject(new Error('Failed to parse models list: ' + err.message));
          }
        } else {
          reject(new Error(`Failed to list models: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error('Request error: ' + err.message));
    });

    req.end();
  });
}


// Get MIME type from file path
function getMimeType(filePath) {
  const ext = filePath.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

module.exports = {
  analyzeImage,
  initializeAI
};

