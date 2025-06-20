import OpenAI from 'openai';

// ⚠️⚠️⚠️ DEPRECATED AND INSECURE - DO NOT USE ⚠️⚠️⚠️
// This service exposes OpenAI API keys to the browser which is a MAJOR SECURITY RISK
// ✅ Use firebaseAIService.ts instead - it's secure and uses Cloud Functions
// 🔒 API key is completely hidden on the server side with Firebase Functions
// This file is kept only for fallback compatibility but should NEVER be used in production

// Initialize OpenAI client (INSECURE - DO NOT USE)
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // For client-side usage (SECURITY RISK!)
});

export interface GrammarAnalysisResult {
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

export interface ToneAnalysisResult {
  overall: 'professional' | 'conversational' | 'formal' | 'casual' | 'passionate' | 'neutral';
  confidence: number;
  sincerity: number;
  engagement: number;
  emotionalImpact: number;
  recommendations: string[];
  specificFeedback: string[];
}

export interface VocabularyAnalysisResult {
  suggestions: Array<{
    originalWord: string;
    alternatives: string[];
    context: string;
    startIndex: number;
    endIndex: number;
    explanation: string;
    sophisticationLevel: 'basic' | 'intermediate' | 'advanced';
  }>;
  overallVocabularyLevel: string;
  recommendations: string[];
}

export interface ConcisenessSuggestion {
  type: 'redundancy' | 'wordiness' | 'unclear';
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  wordsSaved: number;
}

export interface GoalAlignmentResult {
  alignmentScore: number;
  detectedThemes: string[];
  suggestions: Array<{
    type: 'leadership' | 'resilience' | 'growth' | 'impact' | 'authenticity';
    suggestion: string;
    specificAdvice: string;
    examples: string[];
  }>;
  missingElements: string[];
  strengthAreas: string[];
}

class OpenAIService {
  private isConfigured(): boolean {
    const isProduction = import.meta.env.PROD || import.meta.env.NODE_ENV === 'production';
    const hasViteKey = !!import.meta.env.VITE_OPENAI_API_KEY;
    
    // SECURITY WARNING: Don't expose API keys in production
    if (isProduction && hasViteKey) {
      console.error('🚨 SECURITY RISK: OpenAI key exposed in production build!');
      console.error('🔧 Use serverless functions instead. See SECURITY_SETUP.md');
      return false;
    }
    
    return hasViteKey && import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here';
  }

  /**
   * Analyze text for grammar, spelling, and clarity issues
   */
  async analyzeGrammarAndClarity(text: string): Promise<GrammarAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `You are an expert writing tutor specializing in helping high school students improve their personal statements for college applications.

Analyze the following text for grammar, spelling, punctuation, and clarity issues. Focus on issues that would be important for a college personal statement.

Text to analyze:
"${text}"

Please provide your analysis in the following JSON format:
{
  "suggestions": [
    {
      "type": "grammar|spelling|punctuation|clarity",
      "severity": "error|warning|suggestion",
      "message": "Brief description of the issue",
      "originalText": "The exact text that needs fixing",
      "suggestedText": "The corrected version",
      "explanation": "Educational explanation suitable for a high school student (1-2 sentences)",
      "startIndex": 0,
      "endIndex": 10,
      "confidence": 0.95
    }
  ],
  "overallScore": 85,
  "insights": [
    "Overall positive feedback and areas of strength",
    "Key areas for improvement"
  ]
}

Important guidelines:
- Only flag actual errors or significant improvements
- Provide educational explanations that help students learn
- Focus on issues that matter for college applications
- Be encouraging while providing constructive feedback
- Confidence should be between 0.7-1.0 for suggestions you include`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful writing tutor. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      try {
        const parsed = JSON.parse(result) as GrammarAnalysisResult;
        
        // Calculate actual start/end indices for suggestions
        parsed.suggestions = parsed.suggestions.map(suggestion => {
          const startIndex = text.toLowerCase().indexOf(suggestion.originalText.toLowerCase());
          return {
            ...suggestion,
            startIndex: startIndex >= 0 ? startIndex : 0,
            endIndex: startIndex >= 0 ? startIndex + suggestion.originalText.length : suggestion.originalText.length
          };
        });

        return parsed;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('OpenAI Grammar Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze the tone and emotional impact of the text
   */
  async analyzeTone(text: string): Promise<ToneAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `You are an expert writing coach specializing in college personal statements. 

Analyze the tone and emotional impact of the following personal statement excerpt:

"${text}"

Evaluate the text for:
1. Overall tone (professional, conversational, formal, casual, passionate, neutral)
2. Confidence level (how self-assured the writing sounds)
3. Sincerity (how genuine and authentic it feels)
4. Engagement (how compelling and interesting it is to read)
5. Emotional impact (how well it conveys emotion and personal growth)

Provide your analysis in this JSON format:
{
  "overall": "professional|conversational|formal|casual|passionate|neutral",
  "confidence": 75,
  "sincerity": 85,
  "engagement": 70,
  "emotionalImpact": 80,
  "recommendations": [
    "Specific actionable advice for improving tone",
    "Additional recommendations"
  ],
  "specificFeedback": [
    "Positive aspects of the current tone",
    "Areas that could be enhanced"
  ]
}

Scores should be 0-100. Focus on what would resonate with college admissions officers.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful writing coach. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(result) as ToneAnalysisResult;
    } catch (error) {
      console.error('OpenAI Tone Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Suggest vocabulary enhancements
   */
  async analyzeVocabulary(text: string): Promise<VocabularyAnalysisResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `You are an expert writing tutor helping high school students enhance their vocabulary for college personal statements.

Analyze the following text and suggest vocabulary improvements:

"${text}"

Focus on:
1. Words that could be replaced with more sophisticated alternatives
2. Repetitive word usage
3. Vague or weak word choices
4. Opportunities to use more precise, impactful language

Provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "originalWord": "good",
      "alternatives": ["exceptional", "remarkable", "outstanding"],
      "context": "the surrounding sentence for context",
      "startIndex": 45,
      "endIndex": 49,
      "explanation": "Why this change improves the writing",
      "sophisticationLevel": "basic|intermediate|advanced"
    }
  ],
  "overallVocabularyLevel": "Description of current vocabulary level",
  "recommendations": [
    "General advice for vocabulary improvement",
    "Specific strategies for this piece"
  ]
}

Only suggest improvements that:
- Maintain the student's authentic voice
- Are appropriate for college-level writing
- Enhance clarity and impact`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful writing tutor. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(result) as VocabularyAnalysisResult;
      
      // Calculate actual indices
      parsed.suggestions = parsed.suggestions.map(suggestion => {
        const startIndex = text.toLowerCase().indexOf(suggestion.originalWord.toLowerCase());
        return {
          ...suggestion,
          startIndex: startIndex >= 0 ? startIndex : 0,
          endIndex: startIndex >= 0 ? startIndex + suggestion.originalWord.length : suggestion.originalWord.length
        };
      });

      return parsed;
    } catch (error) {
      console.error('OpenAI Vocabulary Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze text for conciseness and suggest improvements
   */
  async analyzeConciseness(text: string, wordLimit?: number): Promise<{
    suggestions: ConcisenessSuggestion[];
    currentWordCount: number;
    targetWordCount?: number;
    improvementPotential: number;
  }> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    const currentWordCount = text.trim().split(/\s+/).length;
    const wordLimitContext = wordLimit ? `The target word limit is ${wordLimit} words. Current count: ${currentWordCount} words.` : `Current word count: ${currentWordCount} words.`;

    try {
      const prompt = `You are an expert writing editor specializing in making text more concise while preserving meaning and impact.

${wordLimitContext}

Analyze the following text for opportunities to reduce wordiness, eliminate redundancy, and improve clarity:

"${text}"

Focus on:
1. Redundant phrases or ideas
2. Unnecessarily wordy expressions
3. Unclear or convoluted sentences
4. Opportunities to combine sentences effectively

Provide suggestions in this JSON format:
{
  "suggestions": [
    {
      "type": "redundancy|wordiness|unclear",
      "originalText": "the exact text to be replaced",
      "suggestedText": "the more concise version",
      "startIndex": 0,
      "endIndex": 20,
      "explanation": "Why this change improves the writing",
      "wordsSaved": 3
    }
  ],
  "improvementPotential": 15
}

Only suggest changes that:
- Maintain the original meaning and tone
- Improve clarity and impact
- Are appropriate for a personal statement`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful writing editor. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(result);
      
      // Calculate actual indices
      const suggestions = parsed.suggestions.map((suggestion: any) => {
        const startIndex = text.indexOf(suggestion.originalText);
        return {
          ...suggestion,
          startIndex: startIndex >= 0 ? startIndex : 0,
          endIndex: startIndex >= 0 ? startIndex + suggestion.originalText.length : suggestion.originalText.length
        };
      });

      return {
        suggestions,
        currentWordCount,
        targetWordCount: wordLimit,
        improvementPotential: parsed.improvementPotential || 0
      };
    } catch (error) {
      console.error('OpenAI Conciseness Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Analyze alignment with personal statement goals (leadership, resilience, etc.)
   */
  async analyzeGoalAlignment(text: string, goals: string[] = ['leadership', 'resilience']): Promise<GoalAlignmentResult> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `You are an expert college admissions counselor analyzing personal statements.

Analyze how well the following text demonstrates and aligns with these key themes that colleges look for: ${goals.join(', ')}.

Text to analyze:
"${text}"

Evaluate:
1. How well the text demonstrates each theme
2. Specific examples or evidence of these qualities
3. Areas where the themes could be strengthened
4. Missing elements that would enhance the narrative

Provide analysis in this JSON format:
{
  "alignmentScore": 75,
  "detectedThemes": ["leadership", "resilience", "growth"],
  "suggestions": [
    {
      "type": "leadership|resilience|growth|impact|authenticity",
      "suggestion": "Specific actionable advice",
      "specificAdvice": "Detailed guidance on how to improve this area",
      "examples": ["Example of how to demonstrate this quality", "Another example"]
    }
  ],
  "missingElements": ["Elements that could strengthen the narrative"],
  "strengthAreas": ["Current strong points in the text"]
}

Focus on actionable advice that helps students better showcase their personal growth and potential.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful admissions counselor. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new Error('No response from OpenAI');
      }

      return JSON.parse(result) as GoalAlignmentResult;
    } catch (error) {
      console.error('OpenAI Goal Alignment Analysis failed:', error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService(); 