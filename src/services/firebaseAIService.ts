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

    try {
      const result = await this.grammarFunction({ text });
      return result.data;
    } catch (error: any) {
      console.error('Grammar analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze text');
    }
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

    try {
      const result = await this.concisenessFunction({ text, wordLimit });
      return result.data;
    } catch (error: any) {
      console.error('Conciseness analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze conciseness');
    }
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

    try {
      const result = await this.vocabularyFunction({ text });
      return result.data;
    } catch (error: any) {
      console.error('Vocabulary analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze vocabulary');
    }
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

    try {
      const result = await this.goalAlignmentFunction({ text, writingGoal });
      return result.data;
    } catch (error: any) {
      console.error('Goal alignment analysis failed:', error);
      throw new Error(error.message || 'Failed to analyze goal alignment');
    }
  }

  /**
   * Check if AI services are available
   * @returns True if available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const health = await this.checkHealth();
      return health.openaiConfigured;
    } catch (error) {
      console.error('AI service availability check failed:', error);
      return false;
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