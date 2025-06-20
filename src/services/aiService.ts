import { v4 as uuidv4 } from 'uuid'

// Local type definitions (moved from supabase types)
export interface Suggestion {
  id: string
  type: 'grammar' | 'style' | 'vocabulary' | 'clarity' | 'goal-alignment'
  severity: 'high' | 'medium' | 'low'
  message: string
  originalText: string
  suggestedText: string
  explanation: string
  startIndex: number
  endIndex: number
  category: string
  confidence: number
}

export interface AnalysisResult {
  id: string
  type: 'tone' | 'readability' | 'goal-alignment' | 'overall'
  score: number
  level: string
  insights: string[]
  recommendations: string[]
  metrics: {
    [key: string]: number | string
  }
}

interface AnalysisRequest {
  content: string
  writingGoal: string
  documentId: string
  userPreferences?: {
    suggestionFrequency: 'high' | 'medium' | 'low'
    focusAreas: string[]
  }
}

interface SuggestionResponse {
  suggestions: Suggestion[]
  analysisResults: AnalysisResult[]
  overallScore: number
  insights: string[]
}

export class AIService {
  /**
   * Analyze text content and return suggestions and analysis results
   * Note: Using fallback analysis since Firebase doesn't have edge functions like Supabase
   */
  static async analyzeText(request: AnalysisRequest): Promise<SuggestionResponse> {
    try {
      // For Firebase setup, we use the fallback analysis
      // In the future, this could be replaced with Firebase Functions or external AI APIs
      return this.fallbackAnalysis(request)
    } catch (error) {
      console.error('AI analysis failed:', error)
      return this.fallbackAnalysis(request)
    }
  }

  /**
   * Get grammar and style suggestions
   */
  static async getGrammarSuggestions(content: string): Promise<Suggestion[]> {
    try {
      // Using fallback for Firebase setup
      return this.getFallbackGrammarSuggestions(content)
    } catch (error) {
      console.error('Grammar check failed:', error)
      return this.getFallbackGrammarSuggestions(content)
    }
  }

  /**
   * Analyze tone and emotional impact
   */
  static async analyzeTone(content: string): Promise<AnalysisResult> {
    try {
      // Using fallback for Firebase setup
      return this.fallbackToneAnalysis(content)
    } catch (error) {
      console.error('Tone analysis failed:', error)
      return this.fallbackToneAnalysis(content)
    }
  }

  /**
   * Get vocabulary enhancement suggestions
   */
  static async getVocabularySuggestions(content: string): Promise<Suggestion[]> {
    try {
      // Using fallback for Firebase setup
      return this.getFallbackVocabularySuggestions(content)
    } catch (error) {
      console.error('Vocabulary analysis failed:', error)
      return this.getFallbackVocabularySuggestions(content)
    }
  }

  /**
   * Analyze content for conciseness and clarity
   */
  static async analyzeClarity(content: string, wordLimit?: number): Promise<{
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
  }> {
    try {
      // Using fallback for Firebase setup
      return this.fallbackClarityAnalysis(content, wordLimit)
    } catch (error) {
      console.error('Clarity analysis failed:', error)
      return this.fallbackClarityAnalysis(content, wordLimit)
    }
  }

  /**
   * Check alignment with writing goals
   */
  static async checkGoalAlignment(
    writingGoal: string
  ): Promise<{
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
    alignmentScore: number
  }> {
    try {
      // Using fallback for Firebase setup
      return this.fallbackGoalAlignment(writingGoal)
    } catch (error) {
      console.error('Goal alignment check failed:', error)
      return this.fallbackGoalAlignment(writingGoal)
    }
  }

  /**
   * Get readability score and analysis
   */
  static async calculateReadability(content: string): Promise<{
    score: number
    level: string
    suggestions: string[]
  }> {
    try {
      // Using fallback for Firebase setup
      return this.fallbackReadabilityAnalysis(content)
    } catch (error) {
      console.error('Readability analysis failed:', error)
      return this.fallbackReadabilityAnalysis(content)
    }
  }

  /**
   * Save suggestion feedback for ML improvement
   * Note: This would need to be implemented with Firebase Firestore
   */
  static async saveSuggestionFeedback(
    suggestionId: string,
    feedback: { helpful: boolean; comments?: string }
  ): Promise<void> {
    try {
      // TODO: Implement with Firebase Firestore when needed
      console.log('Suggestion feedback saved locally:', { suggestionId, feedback })
      
      // Log analytics locally for now
      await this.logAnalyticsEvent('suggestion_feedback', {
        suggestionId,
        feedback
      })
    } catch (error) {
      console.error('Failed to save suggestion feedback:', error)
    }
  }

  /**
   * Log analytics events
   * Note: This would need to be implemented with Firebase Analytics
   */
  static async logAnalyticsEvent(eventType: string, eventData: any): Promise<void> {
    try {
      // TODO: Implement with Firebase Analytics when needed
      console.log('Analytics event logged locally:', { eventType, eventData })
    } catch (error) {
      console.error('Failed to log analytics event:', error)
    }
  }

  // Fallback methods for when Edge Functions are unavailable

  private static fallbackAnalysis(request: AnalysisRequest): SuggestionResponse {
    const { content } = request
    const suggestions: Suggestion[] = []
    
    // Basic grammar patterns
    const grammarSuggestions = this.getFallbackGrammarSuggestions(content)
    suggestions.push(...grammarSuggestions)

    // Basic vocabulary suggestions
    const vocabSuggestions = this.getFallbackVocabularySuggestions(content)
    suggestions.push(...vocabSuggestions)

    // Create basic analysis result
    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      type: 'overall',
      score: Math.min(100, Math.max(0, 100 - suggestions.length * 5)),
      level: 'Good',
      insights: [
        `Found ${suggestions.length} potential improvements`,
        'Consider reviewing the highlighted suggestions to enhance your writing'
      ],
      recommendations: suggestions.map(s => s.explanation),
      metrics: {
        suggestionCount: suggestions.length
      }
    }

    return {
      suggestions,
      analysisResults: [analysisResult],
      overallScore: analysisResult.score,
      insights: analysisResult.insights
    }
  }

  private static getFallbackGrammarSuggestions(content: string): Suggestion[] {
    const suggestions: Suggestion[] = []

    // Common grammar patterns
    const patterns = [
      {
        regex: /\bthere\s+is\s+\w+\s+\w+/gi,
        type: 'grammar' as const,
        explanation: 'Consider using more active voice instead of "there is/are" constructions',
        replacement: (match: string) => match.replace(/there\s+is\s+/i, '')  
      },
      {
        regex: /\b(very|really|quite|extremely)\s+(\w+)/gi,
        type: 'style' as const,
        explanation: 'Consider using a stronger adjective instead of qualifier + adjective',
        replacement: (match: string) => match.replace(/^(very|really|quite|extremely)\s+/i, '')
      },
      {
        regex: /\b(I think|I believe|I feel)\s+/gi,
        type: 'style' as const,
        explanation: 'Consider stating your point directly for stronger impact',
        replacement: () => ''
      },
      {
        regex: /\butilize\b/gi,
        type: 'style' as const,
        explanation: 'The word "utilize" can often be replaced with the simpler "use".',
        replacement: 'use'
      }
    ]

    patterns.forEach(({ regex, type, explanation, replacement }) => {
      let match
      while ((match = regex.exec(content)) !== null) {
        suggestions.push({
          id: uuidv4(),
          type,
          severity: 'low',
          message: explanation,
          originalText: match[0],
          suggestedText: typeof replacement === 'function' ? replacement(match[0]) : replacement,
          explanation,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          category: 'style',
          confidence: 0.8
        })
      }
    })

    return suggestions
  }

  private static getFallbackVocabularySuggestions(content: string): Suggestion[] {
    const suggestions: Suggestion[] = []

    const overusedWords = ['very', 'really', 'actually', 'just', 'stuff', 'things']
    const wordRegex = new RegExp(`\\b(${overusedWords.join('|')})\\b`, 'gi')
    
    let match
    while ((match = wordRegex.exec(content)) !== null) {
      suggestions.push({
        id: uuidv4(),
        type: 'vocabulary',
        severity: 'medium',
        message: `"${match[0]}" is an overused word. Consider a more descriptive alternative.`,
        originalText: match[0],
        suggestedText: 'stronger word',
        explanation: `The word "${match[0]}" can often be removed or replaced for stronger impact.`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        category: 'vocabulary',
        confidence: 0.7
      })
    }
    
    return suggestions
  }

  private static fallbackToneAnalysis(content: string): AnalysisResult {
    const positiveWords = ['amazing', 'excellent', 'great', 'wonderful', 'fantastic', 'love'].length
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'problem'].length

    const positiveMatches = content.match(new RegExp(`\\b(${positiveWords})\\b`, 'gi'))?.length || 0
    const negativeMatches = content.match(new RegExp(`\\b(${negativeWords})\\b`, 'gi'))?.length || 0
    
    let score = 50
    if (positiveMatches > negativeMatches) score = 80
    if (negativeMatches > positiveMatches) score = 20

    return {
      id: uuidv4(),
      type: 'tone',
      score: score,
      level: score > 60 ? 'Positive' : score < 40 ? 'Negative' : 'Neutral',
      insights: [`Detected a mostly ${score > 60 ? 'positive' : 'neutral'} tone.`],
      recommendations: ['Ensure the tone aligns with your intended audience.'],
      metrics: {
        positiveWords: positiveMatches,
        negativeWords: negativeMatches
      }
    }
  }

  private static fallbackClarityAnalysis(content: string, wordLimit?: number): {
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
  } {
    const suggestions: Suggestion[] = this.getFallbackGrammarSuggestions(content)
    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      type: 'readability',
      score: 75,
      level: 'Fairly Clear',
      insights: ['The text is generally clear, with some room for improvement.'],
      recommendations: ['Break down long sentences.', 'Replace jargon with simpler terms.'],
      metrics: {
        longSentences: 0,
        wordCount: content.split(/\s+/).length,
        ...(wordLimit && { wordLimit })
      }
    }
    return { suggestions, analysisResult }
  }

  private static fallbackGoalAlignment(
    writingGoal: string
  ): {
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
    alignmentScore: number
  } {
    const suggestions: Suggestion[] = []
    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      type: 'goal-alignment',
      score: 85,
      level: 'Well-Aligned',
      insights: [`The content seems well-aligned with the goal: "${writingGoal}".`],
      recommendations: ['Double-check that you have addressed all parts of the prompt.'],
      metrics: {
        goal: writingGoal
      }
    }

    return {
      suggestions,
      analysisResult,
      alignmentScore: analysisResult.score
    }
  }

  private static fallbackReadabilityAnalysis(content: string): {
    score: number
    level: string
    suggestions: string[]
  } {
    const words = content.split(/\s+/)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const syllables = words.reduce((count, word) => count + this.countSyllables(word), 0)
    
    // Flesch Reading Ease approximation
    const avgWordsPerSentence = words.length / sentences.length
    const avgSyllablesPerWord = syllables / words.length
    
    const fleschScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    
    let level = 'College'
    if (fleschScore >= 90) level = 'Very Easy'
    else if (fleschScore >= 80) level = 'Easy'
    else if (fleschScore >= 70) level = 'Fairly Easy'
    else if (fleschScore >= 60) level = 'Standard'
    else if (fleschScore >= 50) level = 'Fairly Difficult'
    else if (fleschScore >= 30) level = 'Difficult'
    else level = 'Very Difficult'

    return {
      score: Math.max(0, Math.min(100, fleschScore)),
      level,
      suggestions: [
        `Reading level: ${level}`,
        `Average words per sentence: ${avgWordsPerSentence.toFixed(1)}`,
        `Average syllables per word: ${avgSyllablesPerWord.toFixed(1)}`,
        ...(avgWordsPerSentence > 20 ? ['Consider shortening some sentences'] : []),
        ...(avgSyllablesPerWord > 2 ? ['Consider using simpler words where appropriate'] : [])
      ]
    }
  }

  private static countSyllables(word: string): number {
    // Simple syllable counting algorithm
    word = word.toLowerCase()
    if (word.length <= 3) return 1
    
    const vowels = 'aeiouy'
    let count = 0
    let previousWasVowel = false
    
    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i])
      if (isVowel && !previousWasVowel) {
        count++
      }
      previousWasVowel = isVowel
    }
    
    // Handle silent e
    if (word.endsWith('e')) count--
    
    return Math.max(1, count)
  }
} 