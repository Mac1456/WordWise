import { supabase } from '../lib/supabase'
import { Suggestion, AnalysisResult } from '../types/supabase'
import { v4 as uuidv4 } from 'uuid'

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
   */
  static async analyzeText(request: AnalysisRequest): Promise<SuggestionResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-text', {
        body: request
      })

      if (error) throw error

      return data as SuggestionResponse
    } catch (error) {
      console.error('AI analysis failed:', error)
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(request)
    }
  }

  /**
   * Get grammar and style suggestions
   */
  static async getGrammarSuggestions(content: string, documentId: string): Promise<Suggestion[]> {
    try {
      const { data, error } = await supabase.functions.invoke('grammar-check', {
        body: { content, documentId }
      })

      if (error) throw error
      return data.suggestions || []
    } catch (error) {
      console.error('Grammar check failed:', error)
      return this.getFallbackGrammarSuggestions(content, documentId)
    }
  }

  /**
   * Analyze tone and emotional impact
   */
  static async analyzeTone(content: string, documentId: string, writingGoal: string): Promise<AnalysisResult> {
    try {
      const { data, error } = await supabase.functions.invoke('tone-analysis', {
        body: { content, documentId, writingGoal }
      })

      if (error) throw error
      return data as AnalysisResult
    } catch (error) {
      console.error('Tone analysis failed:', error)
      return this.fallbackToneAnalysis(content, documentId)
    }
  }

  /**
   * Get vocabulary enhancement suggestions
   */
  static async getVocabularySuggestions(content: string, documentId: string): Promise<Suggestion[]> {
    try {
      const { data, error } = await supabase.functions.invoke('vocabulary-enhancement', {
        body: { content, documentId }
      })

      if (error) throw error
      return data.suggestions || []
    } catch (error) {
      console.error('Vocabulary analysis failed:', error)
      return this.getFallbackVocabularySuggestions(content, documentId)
    }
  }

  /**
   * Analyze content for conciseness and clarity
   */
  static async analyzeClarity(content: string, documentId: string, wordLimit?: number): Promise<{
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('clarity-analysis', {
        body: { content, documentId, wordLimit }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Clarity analysis failed:', error)
      return this.fallbackClarityAnalysis(content, documentId, wordLimit)
    }
  }

  /**
   * Check alignment with writing goals
   */
  static async checkGoalAlignment(
    content: string, 
    documentId: string, 
    writingGoal: string,
    specificGoals?: string[]
  ): Promise<{
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
    alignmentScore: number
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('goal-alignment', {
        body: { content, documentId, writingGoal, specificGoals }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Goal alignment check failed:', error)
      return this.fallbackGoalAlignment(content, documentId, writingGoal)
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
      const { data, error } = await supabase.functions.invoke('readability-analysis', {
        body: { content }
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Readability analysis failed:', error)
      return this.fallbackReadabilityAnalysis(content)
    }
  }

  /**
   * Save suggestion feedback for ML improvement
   */
  static async saveSuggestionFeedback(
    suggestionId: string,
    feedback: { helpful: boolean; comments?: string }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({
          feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestionId)

      if (error) throw error

      // Also log analytics
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
   */
  static async logAnalyticsEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return

      await supabase.from('analytics').insert({
        user_id: user.id,
        event_type: eventType,
        event_data: eventData
      })
    } catch (error) {
      console.error('Failed to log analytics:', error)
    }
  }

  // Fallback methods for when Edge Functions are unavailable

  private static fallbackAnalysis(request: AnalysisRequest): SuggestionResponse {
    const { content, documentId } = request
    const suggestions: Suggestion[] = []
    
    // Basic grammar patterns
    const grammarSuggestions = this.getFallbackGrammarSuggestions(content, documentId)
    suggestions.push(...grammarSuggestions)

    // Basic vocabulary suggestions
    const vocabSuggestions = this.getFallbackVocabularySuggestions(content, documentId)
    suggestions.push(...vocabSuggestions)

    // Create basic analysis result
    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      documentId,
      userId: '', // Will be set by the store
      type: 'grammar',
      results: {
        score: Math.min(100, Math.max(0, 100 - suggestions.length * 5)),
        suggestions,
        insights: [
          `Found ${suggestions.length} potential improvements`,
          'Consider reviewing the highlighted suggestions to enhance your writing'
        ],
        improvements: suggestions.map(s => s.explanation)
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return {
      suggestions,
      analysisResults: [analysisResult],
      overallScore: analysisResult.results.score,
      insights: analysisResult.results.insights
    }
  }

  private static getFallbackGrammarSuggestions(content: string, documentId: string): Suggestion[] {
    const suggestions: Suggestion[] = []
    const userId = '' // Will be set by the store

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
      }
    ]

    patterns.forEach(pattern => {
      let match
      while ((match = pattern.regex.exec(content)) !== null) {
        suggestions.push({
          id: uuidv4(),
          documentId,
          userId,
          type: pattern.type,
          text: match[0],
          replacement: pattern.replacement(match[0]),
          explanation: pattern.explanation,
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.7,
          accepted: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    })

    return suggestions
  }

  private static getFallbackVocabularySuggestions(content: string, documentId: string): Suggestion[] {
    const suggestions: Suggestion[] = []
    const userId = '' // Will be set by the store

    const vocabularyReplacements = [
      { word: 'good', replacements: ['excellent', 'outstanding', 'remarkable', 'exceptional'] },
      { word: 'bad', replacements: ['poor', 'inadequate', 'substandard', 'disappointing'] },
      { word: 'big', replacements: ['substantial', 'significant', 'considerable', 'extensive'] },
      { word: 'small', replacements: ['minor', 'limited', 'modest', 'minimal'] },
      { word: 'important', replacements: ['crucial', 'vital', 'essential', 'significant'] }
    ]

    vocabularyReplacements.forEach(({ word, replacements }) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      let match
      while ((match = regex.exec(content)) !== null) {
        const randomReplacement = replacements[Math.floor(Math.random() * replacements.length)]
        suggestions.push({
          id: uuidv4(),
          documentId,
          userId,
          type: 'vocabulary',
          text: match[0],
          replacement: randomReplacement,
          explanation: `Consider using "${randomReplacement}" for more precise language`,
          position: { start: match.index, end: match.index + match[0].length },
          confidence: 0.6,
          accepted: false,
          dismissed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }
    })

    return suggestions
  }

  private static fallbackToneAnalysis(content: string, documentId: string): AnalysisResult {
    // Simple tone analysis based on word patterns
    const personalWords = /\b(I|me|my|myself|personally)\b/gi
    const formalWords = /\b(furthermore|moreover|consequently|nevertheless)\b/gi
    const emotionalWords = /\b(passionate|excited|thrilled|inspired|determined)\b/gi
    
    const personalCount = (content.match(personalWords) || []).length
    const formalCount = (content.match(formalWords) || []).length
    const emotionalCount = (content.match(emotionalWords) || []).length
    
    const totalWords = content.split(/\s+/).length
    const personalRatio = personalCount / totalWords
    const formalRatio = formalCount / totalWords
    const emotionalRatio = emotionalCount / totalWords

    let tone = 'neutral'
    let score = 70
    const insights: string[] = []

    if (personalRatio > 0.05) {
      tone = 'personal'
      insights.push('Your writing has a personal tone, which is good for personal statements')
    }
    
    if (formalRatio > 0.02) {
      tone = 'formal'
      insights.push('Your writing maintains a formal tone')
    }
    
    if (emotionalRatio > 0.03) {
      insights.push('Your writing shows emotional engagement')
      score += 10
    }

    return {
      id: uuidv4(),
      documentId,
      userId: '',
      type: 'tone',
      results: {
        score,
        suggestions: [],
        insights,
        improvements: [
          `Tone analysis: ${tone}`,
          `Personal language ratio: ${(personalRatio * 100).toFixed(1)}%`,
          `Emotional engagement: ${(emotionalRatio * 100).toFixed(1)}%`
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  private static fallbackClarityAnalysis(content: string, documentId: string, wordLimit?: number): {
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
  } {
    const suggestions: Suggestion[] = []
    const words = content.split(/\s+/)
    const wordCount = words.length
    
    let score = 80
    const insights: string[] = []
    
    // Word limit check
    if (wordLimit && wordCount > wordLimit) {
      const overageWords = wordCount - wordLimit
      insights.push(`Your document exceeds the word limit by ${overageWords} words`)
      score -= Math.min(30, overageWords / 10)
    }
    
    // Average sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = wordCount / sentences.length
    
    if (avgSentenceLength > 25) {
      insights.push('Consider breaking up long sentences for better readability')
      score -= 10
    }

    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      documentId,
      userId: '',
      type: 'readability',
      results: {
        score,
        suggestions,
        insights,
        improvements: [
          `Word count: ${wordCount}${wordLimit ? ` / ${wordLimit}` : ''}`,
          `Average sentence length: ${avgSentenceLength.toFixed(1)} words`,
          'Aim for varied sentence lengths to improve flow'
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return { suggestions, analysisResult }
  }

  private static fallbackGoalAlignment(
    content: string, 
    documentId: string, 
    writingGoal: string
  ): {
    suggestions: Suggestion[]
    analysisResult: AnalysisResult
    alignmentScore: number
  } {
    let alignmentScore = 60
    const insights: string[] = []
    const suggestions: Suggestion[] = []

    // Goal-specific analysis
    if (writingGoal === 'personal-statement') {
      const achievementWords = /\b(achieved|accomplished|led|created|improved|developed)\b/gi
      const challengeWords = /\b(challenge|obstacle|difficulty|problem|overcame)\b/gi
      
      const achievements = (content.match(achievementWords) || []).length
      const challenges = (content.match(challengeWords) || []).length
      
      if (achievements > 0) {
        alignmentScore += 15
        insights.push('Good use of achievement-focused language')
      } else {
        insights.push('Consider highlighting specific achievements')
      }
      
      if (challenges > 0) {
        alignmentScore += 10
        insights.push('Shows ability to overcome challenges')
      }
    }

    const analysisResult: AnalysisResult = {
      id: uuidv4(),
      documentId,
      userId: '',
      type: 'goal-alignment',
      results: {
        score: alignmentScore,
        suggestions,
        insights,
        improvements: [
          `Goal alignment score: ${alignmentScore}/100`,
          'Focus on specific examples that demonstrate your qualities',
          'Show, don\'t just tell about your experiences'
        ]
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return { suggestions, analysisResult, alignmentScore }
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