import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { functions } from '../lib/firebase';

// Use Firebase Functions from our centralized config

// Type definitions for Firebase Cloud Functions
interface GrammarAnalysisResult {
  suggestions: Array<{
    type: 'grammar' | 'spelling' | 'punctuation' | 'clarity';
    severity: 'error' | 'warning' | 'suggestion';
    message: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  overallScore: number;
  insights: string[];
}

interface ToneAnalysisResult {
  overall: 'professional' | 'conversational' | 'formal' | 'casual' | 'passionate' | 'neutral';
  confidence: number;
  sincerity: number;
  engagement: number;
  emotionalImpact: number;
  recommendations: string[];
  specificFeedback: string[];
}

interface HealthCheckResult {
  openaiConfigured: boolean;
  timestamp: string;
  userId: string;
}

interface UsageResult {
  userId: string;
  dailyRequests: number;
  monthlyRequests: number;
  lastRequest: string | null;
  limits: {
    daily: number;
    monthly: number;
  };
}

interface ConcisenessAnalysisResult {
  suggestions: Array<{
    type: 'conciseness';
    severity: 'warning' | 'suggestion';
    message: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    wordsSaved: number;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  overallScore: number;
  wordCount: number;
  insights: string[];
}

interface VocabularyAnalysisResult {
  suggestions: Array<{
    type: 'vocabulary';
    severity: 'suggestion';
    message: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    alternatives: string[];
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  overallScore: number;
  insights: string[];
}

interface GoalAlignmentResult {
  suggestions: Array<{
    type: 'goal-alignment';
    severity: 'suggestion';
    message: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  alignmentScore: number;
  goalAnalysis: {
    strengths: string[];
    opportunities: string[];
    recommendations: string[];
  };
  insights: string[];
}

/**
 * Secure Firebase AI Service
 * All API calls go through authenticated Firebase Cloud Functions
 * API key is completely hidden and secure
 */
export class FirebaseAIService {
  private grammarFunction = httpsCallable<{ text: string }, GrammarAnalysisResult>(
    functions,
    'analyzeGrammarAndClarity'
  );
  
  private toneFunction = httpsCallable<{ text: string }, ToneAnalysisResult>(
    functions,
    'analyzeTone'
  );
  
  private healthFunction = httpsCallable<{}, HealthCheckResult>(
    functions,
    'checkAIHealth'
  );
  
  private usageFunction = httpsCallable<{}, UsageResult>(
    functions,
    'getUserUsage'
  );
  
  private concisenessFunction = httpsCallable<{ text: string; wordLimit?: number }, ConcisenessAnalysisResult>(
    functions,
    'analyzeConciseness'
  );
  
  private vocabularyFunction = httpsCallable<{ text: string }, VocabularyAnalysisResult>(
    functions,
    'analyzeVocabulary'
  );
  
  private goalAlignmentFunction = httpsCallable<{ text: string; writingGoal: string }, GoalAlignmentResult>(
    functions,
    'analyzeGoalAlignment'
  );

  private customPromptFunction = httpsCallable<{ prompt: string; text: string }, GrammarAnalysisResult>(
    functions,
    'analyzeWithCustomPrompt'
  );

  // 🚀 NEW: Request deduplication and caching
  private requestCache = new Map<string, Promise<any>>();
  private resultCache = new Map<string, any>();

  /**
   * 🚀 OPTIMIZED: Get cache key for requests
   */
  private getCacheKey(functionName: string, params: any): string {
    const paramString = typeof params === 'string' ? params.slice(0, 100) : JSON.stringify(params).slice(0, 100);
    return `${functionName}-${this.simpleHash(paramString)}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 🚀 OPTIMIZED: Generic cached function call
   */
  private async cachedFunctionCall<T, R>(
    func: any,
    params: T,
    functionName: string,
    cacheDuration: number = 300000 // 5 minutes
  ): Promise<R> {
    const cacheKey = this.getCacheKey(functionName, params);
    
    // Check result cache first
    if (this.resultCache.has(cacheKey)) {
      console.log(`🎯 Cache hit for ${functionName}`);
      return this.resultCache.get(cacheKey);
    }
    
    // Check if request is already pending
    if (this.requestCache.has(cacheKey)) {
      console.log(`🔄 Waiting for pending ${functionName} request`);
      return await this.requestCache.get(cacheKey);
    }

    // Make new request
    const requestPromise = this.makeRequest(func, params, functionName);
    this.requestCache.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Cache the result
      this.resultCache.set(cacheKey, result);
      
      // Auto-cleanup cache after duration
      setTimeout(() => {
        this.resultCache.delete(cacheKey);
      }, cacheDuration);
      
      // Keep cache size manageable
      if (this.resultCache.size > 100) {
        const firstKey = this.resultCache.keys().next().value;
        if (firstKey) {
          this.resultCache.delete(firstKey);
        }
      }
      
      return result;
    } finally {
      this.requestCache.delete(cacheKey);
    }
  }

  private async makeRequest(func: any, params: any, functionName: string) {
    console.log(`🚀 Making ${functionName} request`);
    const startTime = performance.now();
    
    try {
      const result = await func(params);
      const endTime = performance.now();
      console.log(`✅ ${functionName} completed in ${Math.round(endTime - startTime)}ms`);
      return result.data;
    } catch (error: any) {
      console.error(`❌ ${functionName} failed:`, error);
      throw new Error(error.message || `${functionName} failed`);
    }
  }

  /**
   * Clear cache - useful when suggestions are dismissed to prevent re-appearance
   */
  public clearCache(text?: string): void {
    if (text) {
      // Clear cache entries for this specific text
      const textHash = this.simpleHash(text.slice(0, 100));
      const keysToRemove: string[] = [];
      
      for (const key of this.resultCache.keys()) {
        if (key.includes(textHash)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        this.resultCache.delete(key);
        console.log(`🗑️ Cleared Firebase AI cache for: ${key}`);
      });
    } else {
      // Clear all cache
      this.resultCache.clear();
      this.requestCache.clear();
      console.log('🗑️ Cleared all Firebase AI cache');
    }
  }

  /**
   * Check if user is authenticated
   */
  private ensureAuthenticated(): void {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User must be logged in to use AI features');
    }
  }

  /**
   * Analyze text for grammar, spelling, and clarity issues
   * SECURE: API key never exposed to browser
   * @param text - Text to analyze
   * @returns Grammar analysis results
   */
  async analyzeGrammarAndClarity(text: string): Promise<GrammarAnalysisResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 10) {
      throw new Error('Text must be at least 10 characters long');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    // 🚀 OPTIMIZED: Use cached function call
    return this.cachedFunctionCall(
      this.grammarFunction,
      { text },
      'analyzeGrammarAndClarity',
      600000 // 10 minutes cache for grammar analysis
    );
  }

  /**
   * Analyze the tone and emotional impact of text
   * SECURE: API key never exposed to browser
   * @param text - Text to analyze
   * @returns Tone analysis results
   */
  async analyzeTone(text: string): Promise<ToneAnalysisResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 50) {
      throw new Error('Text must be at least 50 characters long for tone analysis');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    try {
      const result = await this.toneFunction({ text });
      return result.data;
    } catch (error: any) {
      console.error('Tone analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze tone');
    }
  }

  /**
   * Health check to verify AI service is working
   * @returns Health check results
   */
  async checkHealth(): Promise<HealthCheckResult> {
    this.ensureAuthenticated();

    try {
      const result = await this.healthFunction({});
      return result.data;
    } catch (error: any) {
      console.error('Health check failed:', error);
      throw new Error(error.message || 'Health check failed');
    }
  }

  /**
   * Get user's usage statistics
   * @returns Usage statistics
   */
  async getUsage(): Promise<UsageResult> {
    this.ensureAuthenticated();

    try {
      const result = await this.usageFunction({});
      return result.data;
    } catch (error: any) {
      console.error('Usage check failed:', error);
      throw new Error(error.message || 'Usage check failed');
    }
  }

  /**
   * Analyze text for conciseness and sentence structure
   * SECURE: API key never exposed to browser
   * @param text - Text to analyze
   * @param wordLimit - Optional word limit for the text
   * @returns Conciseness analysis results
   */
  async analyzeConciseness(text: string, wordLimit?: number): Promise<ConcisenessAnalysisResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 50) {
      throw new Error('Text must be at least 50 characters long for conciseness analysis');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    // 🚀 OPTIMIZED: Use cached function call
    return this.cachedFunctionCall(
      this.concisenessFunction,
      { text, wordLimit },
      'analyzeConciseness',
      300000 // 5 minutes cache for conciseness analysis
    );
  }

  /**
   * Analyze text for vocabulary enhancement opportunities
   * SECURE: API key never exposed to browser
   * @param text - Text to analyze
   * @returns Vocabulary analysis results
   */
  async analyzeVocabulary(text: string): Promise<VocabularyAnalysisResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 50) {
      throw new Error('Text must be at least 50 characters long for vocabulary analysis');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    // 🚀 OPTIMIZED: Use cached function call
    return this.cachedFunctionCall(
      this.vocabularyFunction,
      { text },
      'analyzeVocabulary',
      600000 // 10 minutes cache for vocabulary analysis
    );
  }

  /**
   * Analyze text for goal-based alignment and personalization
   * SECURE: API key never exposed to browser
   * @param text - Text to analyze
   * @param writingGoal - The student's writing goal/theme
   * @returns Goal alignment analysis results
   */
  async analyzeGoalAlignment(text: string, writingGoal: string): Promise<GoalAlignmentResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 100) {
      throw new Error('Text must be at least 100 characters long for goal alignment analysis');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    // 🚀 OPTIMIZED: Use cached function call
    return this.cachedFunctionCall(
      this.goalAlignmentFunction,
      { text, writingGoal },
      'analyzeGoalAlignment',
      450000 // 7.5 minutes cache for goal alignment analysis
    );
  }

  /**
   * Check if the AI service is available and working
   * @returns Promise<boolean> - True if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.checkHealth();
      return true;
    } catch (error) {
      console.warn('AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Analyze text with a custom prompt for specialized analysis
   * SECURE: API key never exposed to browser
   * @param prompt - Custom analysis prompt
   * @param text - Text to analyze
   * @returns Analysis results
   */
  async analyzeWithCustomPrompt(prompt: string, text: string): Promise<GrammarAnalysisResult> {
    this.ensureAuthenticated();
    
    if (!text || text.length < 10) {
      throw new Error('Text must be at least 10 characters long');
    }
    
    if (!prompt || prompt.length < 10) {
      throw new Error('Prompt must be at least 10 characters long');
    }
    
    if (text.length > 5000) {
      throw new Error('Text too long. Maximum 5000 characters allowed');
    }

    try {
      const result = await this.customPromptFunction({ prompt, text });
      return result.data;
    } catch (error: any) {
      console.error('Custom prompt analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze text with custom prompt');
    }
  }
}

// Export singleton instance
export const firebaseAIService = new FirebaseAIService();

// Export types for use in components
export type {
  GrammarAnalysisResult,
  ToneAnalysisResult,
  HealthCheckResult,
  UsageResult,
  ConcisenessAnalysisResult,
  VocabularyAnalysisResult,
  GoalAlignmentResult,
}; 