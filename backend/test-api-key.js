// Test script to validate Gemini API key
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAPIKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found in .env file');
    return;
  }
  
  console.log(`🔑 Testing API key: ${apiKey.substring(0, 10)}...`);
  
  // Try different model names
  const modelNames = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro-vision',
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  
  for (const modelName of modelNames) {
    try {
      console.log(`🧪 Testing model: ${modelName}`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent("Hello, this is a test.");
      console.log(`✅ API key is valid with model: ${modelName}!`);
      console.log('📝 Test response:', result.response.text());
      return; // Success, exit
    } catch (error) {
      console.log(`❌ Model ${modelName} failed: ${error.message}`);
    }
  }
  
  console.error('❌ All models failed. Please check your API key permissions.');
  console.log('\n🔧 To fix this:');
  console.log('1. Go to https://makersuite.google.com/app/apikey');
  console.log('2. Create a new API key');
  console.log('3. Make sure Generative Language API is enabled');
  console.log('4. Update GEMINI_API_KEY in your .env file');
}

testAPIKey();