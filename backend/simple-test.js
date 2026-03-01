// Simple test for Gemini API
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function simpleTest() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found');
    return;
  }
  
  console.log(`🔑 Testing API key: ${apiKey.substring(0, 10)}...`);
  
  // Try the most basic model names
  const modelsToTry = [
    'gemini-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`\n🧪 Testing ${modelName}...`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      
      const result = await model.generateContent("Hello");
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ SUCCESS with ${modelName}!`);
      console.log(`📝 Response: ${text}`);
      return modelName; // Return the working model
      
    } catch (error) {
      console.log(`❌ ${modelName} failed: ${error.message.substring(0, 100)}...`);
    }
  }
  
  console.log('\n❌ All models failed. Possible issues:');
  console.log('1. API key is invalid or expired');
  console.log('2. Generative Language API is not enabled');
  console.log('3. Billing is not set up for your Google Cloud project');
  console.log('4. Regional restrictions');
  
  console.log('\n🔧 To fix:');
  console.log('1. Go to https://aistudio.google.com/app/apikey');
  console.log('2. Create a new API key');
  console.log('3. Enable the Generative Language API in Google Cloud Console');
  console.log('4. Set up billing if required');
}

simpleTest();