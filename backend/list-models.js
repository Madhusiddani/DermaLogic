// List available Gemini models
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found in .env file');
    return;
  }
  
  console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models
    console.log('📋 Attempting to list available models...');
    const models = await genAI.listModels();
    
    if (models && models.length > 0) {
      console.log('✅ Available models:');
      models.forEach(model => {
        console.log(`📋 ${model.name} - ${model.displayName || 'No display name'}`);
        console.log(`   Supported methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      });
    } else {
      console.log('⚠️ No models returned, but API key seems valid');
    }
    
    // Try a simple generation test with a basic model
    console.log('\n🧪 Testing text generation...');
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Say hello");
    console.log('✅ Text generation successful!');
    console.log('📝 Response:', result.response.text());
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('API_KEY_INVALID') || error.message.includes('API Key not found')) {
      console.log('\n🔧 Your API key appears to be invalid. Please:');
      console.log('1. Go to https://aistudio.google.com/app/apikey');
      console.log('2. Create a new API key');
      console.log('3. Make sure you copy the complete key');
      console.log('4. Update GEMINI_API_KEY in your .env file');
    } else if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
      console.log('\n🔧 API access denied. Please:');
      console.log('1. Enable the Generative Language API in Google Cloud Console');
      console.log('2. Make sure your API key has proper permissions');
      console.log('3. Check if your project has billing enabled');
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      console.log('\n🔧 Model not found. This might be a regional or version issue.');
      console.log('Try using a different model name or check Google AI Studio for available models.');
    } else {
      console.log('\n🔧 Unexpected error. Please check:');
      console.log('1. Your internet connection');
      console.log('2. Google AI services status');
      console.log('3. Your API key validity');
    }
  }
}

listModels();