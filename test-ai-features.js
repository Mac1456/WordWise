#!/usr/bin/env node

/**
 * AI Features Test Script
 * Tests the secure Firebase AI integration
 */

const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInAnonymously } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

// Test configuration
const FIREBASE_CONFIG = {
  apiKey: "demo-key",
  authDomain: "demo-wordwise.firebaseapp.com",
  projectId: "demo-wordwise",
  storageBucket: "demo-wordwise.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};

const testTexts = {
  grammar: "This are a test sentence with grammar error.",
  tone: "I am writing this personal statement to explain why I deserve admission to your prestigious university. I have worked extremely hard throughout high school and believe I would be a valuable addition to your student body.",
  short: "Test."
};

async function testAIFeatures() {
  console.log('🧪 Starting AI Features Test...\n');
  
  try {
    // Initialize Firebase
    const app = initializeApp(FIREBASE_CONFIG);
    const auth = getAuth(app);
    const functions = getFunctions(app);
    
    // Connect to emulators (if running locally)
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('✅ Connected to Firebase emulators');
    } catch (error) {
      console.log('⚠️  Using production Firebase (emulators not running)');
    }
    
    // Sign in anonymously for testing
    console.log('🔐 Signing in for testing...');
    await signInAnonymously(auth);
    console.log('✅ Authenticated successfully\n');
    
    // Test Grammar Analysis
    console.log('📝 Testing Grammar Analysis...');
    const grammarFunction = httpsCallable(functions, 'analyzeGrammarAndClarity');
    
    try {
      const grammarResult = await grammarFunction({ text: testTexts.grammar });
      console.log('✅ Grammar Analysis Result:');
      console.log(`   - Suggestions: ${grammarResult.data.suggestions.length}`);
      console.log(`   - Overall Score: ${grammarResult.data.overallScore}`);
      console.log(`   - Sample suggestion: ${grammarResult.data.suggestions[0]?.message || 'None'}`);
    } catch (error) {
      console.log('❌ Grammar Analysis Failed:', error.message);
    }
    
    console.log('\n🎭 Testing Tone Analysis...');
    const toneFunction = httpsCallable(functions, 'analyzeTone');
    
    try {
      const toneResult = await toneFunction({ text: testTexts.tone });
      console.log('✅ Tone Analysis Result:');
      console.log(`   - Overall Tone: ${toneResult.data.overall}`);
      console.log(`   - Confidence: ${toneResult.data.confidence}`);
      console.log(`   - Engagement: ${toneResult.data.engagement}`);
      console.log(`   - Recommendations: ${toneResult.data.recommendations.length}`);
    } catch (error) {
      console.log('❌ Tone Analysis Failed:', error.message);
    }
    
    // Test Health Check
    console.log('\n🏥 Testing Health Check...');
    const healthFunction = httpsCallable(functions, 'checkAIHealth');
    
    try {
      const healthResult = await healthFunction({});
      console.log('✅ Health Check Result:');
      console.log(`   - OpenAI Configured: ${healthResult.data.openaiConfigured}`);
      console.log(`   - User ID: ${healthResult.data.userId}`);
      console.log(`   - Timestamp: ${healthResult.data.timestamp}`);
    } catch (error) {
      console.log('❌ Health Check Failed:', error.message);
    }
    
    // Test Usage Tracking
    console.log('\n📊 Testing Usage Tracking...');
    const usageFunction = httpsCallable(functions, 'getUserUsage');
    
    try {
      const usageResult = await usageFunction({});
      console.log('✅ Usage Tracking Result:');
      console.log(`   - Daily Requests: ${usageResult.data.dailyRequests}`);
      console.log(`   - Monthly Requests: ${usageResult.data.monthlyRequests}`);
      console.log(`   - Daily Limit: ${usageResult.data.limits.daily}`);
      console.log(`   - Monthly Limit: ${usageResult.data.limits.monthly}`);
    } catch (error) {
      console.log('❌ Usage Tracking Failed:', error.message);
    }
    
    console.log('\n🎉 AI Features Test Complete!');
    
  } catch (error) {
    console.error('💥 Test Failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testAIFeatures(); 