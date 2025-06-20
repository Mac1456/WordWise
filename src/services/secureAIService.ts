/**
 * Secure AI Service - Calls serverless functions instead of direct OpenAI API
 * This keeps the OpenAI API key secure on the server side
 */

export interface SecureGrammarAnalysisResult {
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

export interface SecureToneAnalysisResult {
  overall: 'professional' | 'conversational' | 'formal' | 'casual' | 'passionate' | 'neutral';
  confidence: number;
  sincerity: number;
  engagement: number;
  emotionalImpact: number;
  recommendations: string[];
  specificFeedback: string[];
}

class SecureAIService {
  private baseUrl: string;

  constructor() {
    // Use your deployed serverless function URL
    // For Vercel: https://your-app.vercel.app/api/analyze-text
    // For Netlify: https://your-app.netlify.app/.netlify/functions/analyze-text
    // For development: http://localhost:3000/api/analyze-text
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/analyze-text'  // Update this with your deployed URL
      : '/api/analyze-text';
  }

  /**
   * Analyze text for grammar, spelling, and clarity issues (Secure)
   */
  async analyzeGrammarAndClarity(text: string): Promise<SecureGrammarAnalysisResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          analysisType: 'grammar'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Secure Grammar Analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze the tone and emotional impact of the text (Secure)
   */
  async analyzeTone(text: string): Promise<SecureToneAnalysisResult> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          analysisType: 'tone'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Secure Tone Analysis failed:', error);
      throw new Error(`Tone analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the secure service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'test',
          analysisType: 'grammar'
        })
      });
      
      return response.status !== 404;
    } catch (error) {
      console.warn('Secure AI service not available:', error);
      return false;
    }
  }
}

export const secureAIService = new SecureAIService(); 