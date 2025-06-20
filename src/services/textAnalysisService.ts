import nlp from 'compromise';
import Typo from 'typo-js';
import { readabilityScore } from 'readability-score';
import { firebaseAIService } from './firebaseAIService';

export interface TextSuggestion {
  id: string;
  type: 'grammar' | 'spelling' | 'style' | 'vocabulary' | 'goal-alignment' | 'conciseness';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  alternatives?: string[]; // For vocabulary suggestions
  wordsSaved?: number; // For conciseness suggestions
}

export interface ToneAnalysis {
  overall: 'professional' | 'conversational' | 'formal' | 'casual' | 'passionate' | 'neutral' | 'confident' | 'uncertain' | 'humble' | 'arrogant';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
}

export interface TextAnalysis {
  suggestions: TextSuggestion[];
  readabilityScore: number;
  readabilityGrade: string;
  wordCount: number;
  sentenceCount: number;
  characterCount: number;
  averageWordsPerSentence: number;
  complexWords: number;
  toneAnalysis?: ToneAnalysis;
}

class TextAnalysisService {
  private spellChecker: Typo | null = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize spell checker with English dictionary
      // Skip initialization in browser environment where it's not needed
      if (typeof window !== 'undefined') {
        console.log('Skipping Typo.js initialization in browser (using AI instead)');
        this.spellChecker = null;
      } else {
      this.spellChecker = new Typo('en_US');
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('Spell checker initialization failed, using AI fallback:', error);
      this.spellChecker = null;
    }
  }

  /**
   * ⚡ INSTANT ANALYSIS: Immediate local checks (0ms delay)
   * Provides instant feedback for basic spelling, grammar, and style issues
   * Perfect for real-time typing feedback
   */
  async analyzeTextInstant(text: string): Promise<TextAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Fast analysis without AI - only local checks
    console.log('⚡ Running instant-only local checks...');
    
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Get instant suggestions
    const suggestions = await this.getInstantSuggestions(text);
    console.log(`⚡ Instant analysis: ${suggestions.length} suggestions found`);
    
    // Calculate readability
    const readability = this.calculateReadability(text);
    
    return {
      suggestions,
      readabilityScore: readability.score,
      readabilityGrade: readability.grade,
      wordCount: words.length,
      sentenceCount: sentences.length,
      characterCount: text.length,
      averageWordsPerSentence: words.length / Math.max(sentences.length, 1),
      complexWords: this.countComplexWords(words),
      toneAnalysis: undefined
    };
  }

  /**
   * Fast tone analysis that only analyzes tone without full text analysis
   */
  async analyzeToneOnly(text: string): Promise<ToneAnalysis> {
    if (text.length < 50) {
      throw new Error('Text must be at least 50 characters long for tone analysis');
    }
    
    console.log('⚡ Running fast tone analysis...');
    return this.analyzeTone(text);
  }

  private async getInstantSuggestions(text: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // ⚡ INSTANT LOCAL CHECKS ONLY - No AI calls
    const localGrammarSuggestions = await this.checkGrammar(text);
    suggestions.push(...localGrammarSuggestions);
    
    const localSpellingSuggestions = await this.checkSpelling(text);
    suggestions.push(...localSpellingSuggestions);
    
    const localStyleSuggestions = await this.checkStyle(text, words, sentences);
    suggestions.push(...localStyleSuggestions);

    // Early deduplication before conflict resolution for better performance
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    // Resolve conflicts between overlapping suggestions
    return this.resolveConflictingSuggestions(deduplicatedSuggestions);
  }

  /**
   * 🚀 HYBRID APPROACH: Instant Local Checks + AI Enhancement
   * 
   * Phase 1: INSTANT LOCAL ANALYSIS (0ms delay)
   * - Basic spelling & grammar checks using compromise.js
   * - Immediate feedback for common errors
   * 
   * Phase 2: AI ENHANCEMENT (background, 2-5s delay)
   * - Advanced analysis with educational explanations
   * - Contextual suggestions and improvements
   */
  async analyzeText(text: string, writingGoal?: string, includeTone?: boolean, analysisMode?: 'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment', wordLimit?: number, skipInstantAnalysis?: boolean): Promise<TextAnalysis> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const suggestions: TextSuggestion[] = [];
    
    // Basic text statistics
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const characterCount = text.length;
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    // Determine which analyses to run based on mode
    const mode = analysisMode || 'comprehensive';
    
    // 🚀 PHASE 1: INSTANT LOCAL CHECKS (Only if not skipped for AI enhancement)
    if (!skipInstantAnalysis) {
      console.log('⚡ Running instant local checks...');
      
      // Always provide instant local spelling & grammar checks
      if (mode === 'comprehensive' || mode === 'grammar-only') {
        const localGrammarSuggestions = await this.checkGrammar(text);
        suggestions.push(...localGrammarSuggestions);
        
        const localSpellingSuggestions = await this.checkSpelling(text);
        suggestions.push(...localSpellingSuggestions);
        
        const localStyleSuggestions = await this.checkStyle(text, words, sentences);
        suggestions.push(...localStyleSuggestions);
        
        console.log(`⚡ Instant local analysis: ${suggestions.length} suggestions found`);
      }
    } else {
      console.log('⚡ Skipping instant local checks (AI enhancement mode)');
    }

    // 🚀 ENHANCED COMPREHENSIVE AI ANALYSIS - More thorough with lower thresholds
    if (mode === 'comprehensive' && text.trim().length >= 15) { // Lowered from 30 to 15 characters
      try {
        console.log('🚀 Starting enhanced comprehensive AI analyses...');
        
        // Create array of promises for parallel execution
        const analysisPromises: Promise<any>[] = [];
        
        // Layer 1: Enhanced Grammar & Spelling AI - minimum 15 characters (lowered threshold)
        if (text.trim().length >= 15) {
          analysisPromises.push(
            firebaseAIService.analyzeGrammarAndClarity(text).then(result => ({ type: 'grammar', result })).catch(error => ({ type: 'grammar', error }))
          );
        }
        
        // Layer 2: Conciseness Analysis - minimum 20 characters (lowered from 30)
        if (text.trim().length >= 20) {
          analysisPromises.push(
            firebaseAIService.analyzeConciseness(text).then(result => ({ type: 'conciseness', result })).catch(error => ({ type: 'conciseness', error }))
          );
        }
        
        // Layer 3: Vocabulary Enhancement - minimum 30 characters (lowered from 50)
        if (text.trim().length >= 30) {
          analysisPromises.push(
            firebaseAIService.analyzeVocabulary(text).then(result => ({ type: 'vocabulary', result })).catch(error => ({ type: 'vocabulary', error }))
          );
        }
        
        // Layer 4: Goal-Based Personalization - minimum 50 characters (lowered from 100)
        if (writingGoal && text.trim().length >= 50) {
          analysisPromises.push(
            firebaseAIService.analyzeGoalAlignment(text, writingGoal).then(result => ({ type: 'goal-alignment', result })).catch(error => ({ type: 'goal-alignment', error }))
          );
        }
        
        // Wait for all analyses to complete in parallel
        const analysisResults = await Promise.all(analysisPromises);
        console.log(`✅ Enhanced comprehensive analyses complete: ${analysisResults.length} analyses finished`);
        
        // Process results with enhanced filtering and quality control
        for (const analysis of analysisResults) {
          if (analysis.error) {
            console.warn(`${analysis.type} analysis failed:`, analysis.error);
            continue;
          }
          
          if (analysis.type === 'grammar') {
            // Enhanced grammar processing with better filtering
            const newAISuggestions = analysis.result.suggestions.filter((aiSuggestion: any) => {
              // More thorough overlap detection
              return !suggestions.some(localSuggestion => {
                // Check for exact text match
                if (localSuggestion.originalText.toLowerCase().trim() === aiSuggestion.originalText.toLowerCase().trim()) {
                  return true;
                }
                
                // Check for positional overlap with tolerance
                if (this.suggestionsOverlap({
                  startIndex: aiSuggestion.startIndex,
                  endIndex: aiSuggestion.endIndex,
                  originalText: aiSuggestion.originalText,
                  suggestedText: aiSuggestion.suggestedText
                } as any, localSuggestion)) {
                  return true;
                }
                
                // Check if same suggestion text with position tolerance
                if (localSuggestion.suggestedText.toLowerCase().trim() === aiSuggestion.suggestedText.toLowerCase().trim() &&
                    Math.abs(localSuggestion.startIndex - aiSuggestion.startIndex) < 15) {
                  return true;
                }
                
                return false;
              });
            });
            
            // Add AI grammar suggestions with enhanced metadata
            const aiSuggestions = newAISuggestions.map((suggestion: any) => ({
              id: `ai-grammar-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: suggestion.type as 'grammar' | 'spelling' | 'style' | 'vocabulary' | 'goal-alignment',
              severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
              message: suggestion.message,
              originalText: suggestion.originalText,
              suggestedText: suggestion.suggestedText,
              startIndex: suggestion.startIndex,
              endIndex: suggestion.endIndex,
              explanation: suggestion.explanation + ' (AI Enhanced)',
              alternatives: undefined
            }));
            
            suggestions.push(...aiSuggestions);
            console.log(`🤖 Added ${aiSuggestions.length} enhanced AI grammar suggestions (${analysis.result.suggestions.length - newAISuggestions.length} duplicates filtered)`);
          }
          
          else if (analysis.type === 'conciseness') {
            // Enhanced conciseness processing
            const concisenessSuggestions = analysis.result.suggestions
              .filter((suggestion: any) => {
                // Only include conciseness suggestions that actually save significant words
                return suggestion.wordsSaved && suggestion.wordsSaved >= 1;
              })
              .map((suggestion: any) => ({
                id: `ai-conciseness-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'conciseness' as const,
                severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
                message: `${suggestion.message} (saves ${suggestion.wordsSaved} word${suggestion.wordsSaved > 1 ? 's' : ''})`,
                originalText: suggestion.originalText,
                suggestedText: suggestion.suggestedText,
                startIndex: suggestion.startIndex,
                endIndex: suggestion.endIndex,
                explanation: suggestion.explanation + ` This revision saves ${suggestion.wordsSaved} word${suggestion.wordsSaved > 1 ? 's' : ''} while maintaining clarity.`,
                wordsSaved: suggestion.wordsSaved
              }));
            suggestions.push(...concisenessSuggestions);
            console.log(`🤖 Added ${concisenessSuggestions.length} enhanced conciseness suggestions`);
          }
          
          else if (analysis.type === 'vocabulary') {
            // Enhanced vocabulary processing with better filtering
            const vocabularySuggestions = analysis.result.suggestions
              .filter((suggestion: any) => {
                // Enhanced filtering for overly formal suggestions
                const originalText = suggestion.originalText.toLowerCase();
                const suggestedText = suggestion.suggestedText.toLowerCase();
                
                // Expanded list of overly formal replacements to filter
                const overlyFormalReplacements = {
                  'want': ['aspire', 'desire', 'yearn', 'endeavor', 'covet'],
                  'write': ['author', 'compose', 'craft', 'pen', 'scribe'],
                  'book': ['manuscript', 'tome', 'publication', 'literary work', 'opus'],
                  'best': ['optimal', 'superior', 'exemplary', 'unparalleled', 'superlative'],
                  'good': ['exemplary', 'superior', 'exceptional', 'outstanding', 'sublime'],
                  'get': ['obtain', 'acquire', 'procure', 'secure', 'attain'],
                  'use': ['utilize', 'employ', 'implement', 'leverage', 'harness'],
                  'help': ['facilitate', 'assist', 'accommodate', 'support', 'ameliorate'],
                  'show': ['demonstrate', 'illustrate', 'exhibit', 'manifest', 'elucidate'],
                  'make': ['fabricate', 'construct', 'manufacture', 'forge', 'synthesize'],
                  'think': ['contemplate', 'ruminate', 'ponder', 'deliberate', 'cogitate']
                };
                
                // Check if this is an overly formal replacement
                for (const [casual, formals] of Object.entries(overlyFormalReplacements)) {
                  if (originalText.includes(casual) && formals.some(formal => suggestedText.includes(formal))) {
                    console.log(`🚫 Filtering overly formal vocabulary suggestion: "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
                    return false;
                  }
                }
                
                // Keep suggestions that improve clarity without being overly formal
                return true;
              })
              .map((suggestion: any) => ({
                id: `ai-vocabulary-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'vocabulary' as const,
                severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
                message: suggestion.message,
                originalText: suggestion.originalText,
                suggestedText: suggestion.suggestedText,
                startIndex: suggestion.startIndex,
                endIndex: suggestion.endIndex,
                explanation: suggestion.explanation + ' (Enhanced for natural tone)',
                alternatives: suggestion.alternatives
              }));
            suggestions.push(...vocabularySuggestions);
            console.log(`🤖 Added ${vocabularySuggestions.length} enhanced vocabulary suggestions`);
          }
          
          else if (analysis.type === 'goal-alignment') {
            // Enhanced goal alignment processing
            const goalSuggestions = analysis.result.suggestions.map((suggestion: any) => ({
              id: `ai-goal-enhanced-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'goal-alignment' as const,
              severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
              message: `${suggestion.message} (Goal: ${writingGoal})`,
              originalText: suggestion.originalText,
              suggestedText: suggestion.suggestedText,
              startIndex: suggestion.startIndex,
              endIndex: suggestion.endIndex,
              explanation: suggestion.explanation + ` This aligns better with your ${writingGoal} goals.`
            }));
            suggestions.push(...goalSuggestions);
            console.log(`🤖 Added ${goalSuggestions.length} enhanced goal-alignment suggestions`);
          }
        }
        
      } catch (error) {
        console.warn('Enhanced comprehensive AI analysis failed:', error);
      }
    }
    
    // 🎯 INDIVIDUAL AI ENHANCEMENT (for non-comprehensive modes)
    else if (text.trim().length >= 20) {
      try {
        console.log(`🤖 Enhancing with AI analysis (mode: ${mode})...`);
        
        // Individual mode processing
        if (mode === 'conciseness' && text.trim().length >= 30) {
          const concisenessAnalysis = await firebaseAIService.analyzeConciseness(text);
          const concisenessSuggestions = concisenessAnalysis.suggestions.map((suggestion: any) => ({
            id: `ai-conciseness-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'conciseness' as const,
            severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
            message: suggestion.message,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            startIndex: suggestion.startIndex,
            endIndex: suggestion.endIndex,
            explanation: suggestion.explanation,
            wordsSaved: suggestion.wordsSaved
          }));
          suggestions.push(...concisenessSuggestions);
          console.log(`🤖 Added ${concisenessSuggestions.length} conciseness suggestions`);
        }
        
        else if (mode === 'vocabulary' && text.trim().length >= 50) {
          const vocabularyAnalysis = await firebaseAIService.analyzeVocabulary(text);
          const vocabularySuggestions = vocabularyAnalysis.suggestions
            .filter((suggestion: any) => {
              // Filter out overly formal suggestions that don't match the original tone
              const originalText = suggestion.originalText.toLowerCase();
              const suggestedText = suggestion.suggestedText.toLowerCase();
              
              // Skip overly formal replacements for casual words
              const overlyFormalReplacements = {
                'want': ['aspire', 'desire', 'yearn', 'endeavor'],
                'write': ['author', 'compose', 'craft', 'pen'],
                'book': ['manuscript', 'tome', 'publication', 'literary work'],
                'best': ['optimal', 'superior', 'exemplary', 'unparalleled'],
                'good': ['exemplary', 'superior', 'exceptional', 'outstanding'],
                'get': ['obtain', 'acquire', 'procure', 'secure'],
                'use': ['utilize', 'employ', 'implement', 'leverage'],
                'help': ['facilitate', 'assist', 'accommodate', 'support'],
                'show': ['demonstrate', 'illustrate', 'exhibit', 'manifest']
              };
              
              // Check if this is an overly formal replacement
              for (const [casual, formals] of Object.entries(overlyFormalReplacements)) {
                if (originalText.includes(casual) && formals.some(formal => suggestedText.includes(formal))) {
                  console.log(`🚫 Filtering overly formal suggestion: "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
                  return false;
                }
              }
              
              // Keep suggestions that improve clarity without being overly formal
              return true;
            })
            .map((suggestion: any) => ({
            id: `ai-vocabulary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'vocabulary' as const,
            severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
            message: suggestion.message,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            startIndex: suggestion.startIndex,
            endIndex: suggestion.endIndex,
            explanation: suggestion.explanation,
            alternatives: suggestion.alternatives
          }));
          suggestions.push(...vocabularySuggestions);
          console.log(`🤖 Added ${vocabularySuggestions.length} vocabulary suggestions`);
        }
        
        else if (mode === 'goal-alignment' && writingGoal && text.trim().length >= 100) {
          const goalAnalysis = await firebaseAIService.analyzeGoalAlignment(text, writingGoal);
          const goalSuggestions = goalAnalysis.suggestions.map((suggestion: any) => ({
            id: `ai-goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'goal-alignment' as const,
            severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
            message: suggestion.message,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            startIndex: suggestion.startIndex,
            endIndex: suggestion.endIndex,
            explanation: suggestion.explanation
          }));
          suggestions.push(...goalSuggestions);
          console.log(`🤖 Added ${goalSuggestions.length} goal-alignment suggestions`);
        }
        
        else if (mode === 'grammar-only') {
          const aiAnalysis = await firebaseAIService.analyzeGrammarAndClarity(text);
          const aiSuggestions = aiAnalysis.suggestions.map((suggestion: any) => ({
            id: `ai-grammar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: suggestion.type as 'grammar' | 'spelling' | 'style' | 'vocabulary' | 'goal-alignment',
            severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
            message: suggestion.message,
            originalText: suggestion.originalText,
            suggestedText: suggestion.suggestedText,
            startIndex: suggestion.startIndex,
            endIndex: suggestion.endIndex,
            explanation: suggestion.explanation,
            alternatives: undefined
          }));
          suggestions.push(...aiSuggestions);
          console.log(`🤖 Added ${aiSuggestions.length} AI grammar suggestions`);
        }
        
      } catch (error) {
        console.warn('Individual AI enhancement failed:', error);
      }
    }

    // Add remaining local checks for comprehensive mode only
    if (mode === 'comprehensive') {
      const vocabularySuggestions = await this.checkVocabulary();
      suggestions.push(...vocabularySuggestions);

      if (writingGoal) {
        const goalSuggestions = await this.checkGoalAlignment(text, writingGoal);
        suggestions.push(...goalSuggestions);
      }
    }

    // Early deduplication before conflict resolution for better performance
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    // Resolve conflicts between overlapping suggestions
    const resolvedSuggestions = this.resolveConflictingSuggestions(deduplicatedSuggestions);
    
    if (resolvedSuggestions.length !== deduplicatedSuggestions.length) {
      console.log(`Conflict resolution: ${deduplicatedSuggestions.length} → ${resolvedSuggestions.length} suggestions`);
    }

    // Readability analysis
    const readability = this.calculateReadability(text);
    const complexWords = this.countComplexWords(words);

    // Tone analysis (optional) - use OpenAI if available
    let toneAnalysis: ToneAnalysis | undefined;
    if (includeTone && text.trim().length > 50) {
      try {
        // Use fast local tone analysis instead of slow AI
        toneAnalysis = await this.analyzeTone(text);
        console.log('Using fast local tone analysis');
      } catch (error) {
        console.warn('Tone analysis failed:', error);
      }
    }

    return {
      suggestions: resolvedSuggestions,
      readabilityScore: readability.score,
      readabilityGrade: readability.grade,
      wordCount,
      sentenceCount,
      characterCount,
      averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
      complexWords,
      toneAnalysis
    };
  }

  private async checkGrammar(text: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    const doc = nlp(text);

    // ✅ CAPITALIZATION CHECKS - Added comprehensive capitalization detection
    const capitalizationSuggestions = this.checkCapitalization(text);
    suggestions.push(...capitalizationSuggestions);

    // Check for common grammar issues
    const sentences = doc.sentences().out('array');
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceDoc = nlp(sentence);
      const startIndex = text.indexOf(sentence);

      // Check for sentence fragments (no verb)
      const hasVerb = sentenceDoc.verbs().length > 0;
      if (!hasVerb && sentence.trim().length > 3) {
        suggestions.push({
          id: `grammar-${i}-fragment`,
          type: 'grammar',
          severity: 'warning',
          message: 'This appears to be a sentence fragment',
          originalText: sentence.trim(),
          suggestedText: sentence.trim(),
          startIndex,
          endIndex: startIndex + sentence.length,
          explanation: 'Consider adding a verb to make this a complete sentence.'
        });
      }

      // Check for run-on sentences (too many words)
      const wordCount = sentence.split(/\s+/).length;
      if (wordCount > 30) {
        suggestions.push({
          id: `grammar-${i}-runon`,
          type: 'grammar',
          severity: 'suggestion',
          message: 'This sentence might be too long',
          originalText: sentence.trim(),
          suggestedText: sentence.trim(),
          startIndex,
          endIndex: startIndex + sentence.length,
          explanation: 'Consider breaking this into shorter sentences for better readability.'
        });
      }

      // Check for passive voice
      const passiveVerbs = sentenceDoc.match('#Passive').out('array');
      if (passiveVerbs.length > 0) {
        suggestions.push({
          id: `grammar-${i}-passive`,
          type: 'grammar',
          severity: 'suggestion',
          message: 'Consider using active voice',
          originalText: sentence.trim(),
          suggestedText: sentence.trim(),
          startIndex,
          endIndex: startIndex + sentence.length,
          explanation: 'Active voice is often clearer and more engaging than passive voice.'
        });
      }
    }

    // Check for subject-verb agreement
    const clauses = doc.clauses().out('array');
    for (let i = 0; i < clauses.length; i++) {
      const clause = clauses[i];
      const clauseDoc = nlp(clause);
      const subjects = clauseDoc.nouns().out('array');
      const verbs = clauseDoc.verbs().out('array');

      if (subjects.length > 0 && verbs.length > 0) {
        // Only add suggestion if we detect specific agreement issues
        // Check for common patterns like "I are", "he were", "they was", etc.
        const commonErrors = [
          /\b(I|he|she|it)\s+(are|were)\b/i,
          /\b(they|we|you)\s+(was|is)\b/i,
          /\b(there|their)\s*,/i, // "Their, I learned" should be "There, I learned"
          /\b(your|you're)\s+(prestegious|prestigious)\b/i // "you're prestigious" should be "your prestigious"
        ];
        
        for (const errorPattern of commonErrors) {
          if (errorPattern.test(clause)) {
            const startIndex = text.indexOf(clause);
            if (startIndex >= 0) {
              suggestions.push({
                id: `grammar-${i}-agreement`,
                type: 'grammar',
                severity: 'warning',
                message: 'Review subject-verb agreement',
                originalText: clause.trim(),
                suggestedText: clause.trim(),
                startIndex,
                endIndex: startIndex + clause.length,
                explanation: 'Check that the subject and verb agree in number.'
              });
              break; // Only add one suggestion per clause
            }
          }
        }
      }
    }

    // Check for common word usage errors
    const wordUsageErrors = [
      { pattern: /\bdecided\s+too\s+volunteer\b/gi, message: 'Use "to" instead of "too" before verbs', correction: 'decided to volunteer' },
      { pattern: /\bhow\s+too\s+\w+/gi, message: 'Use "to" instead of "too" before verbs', correction: 'how to' },
      { pattern: /\bdue\s+too\s+the\b/gi, message: 'Use "to" instead of "too"', correction: 'due to the' },
      { pattern: /\bdeserve\s+too\s+be\b/gi, message: 'Use "to" instead of "too" before verbs', correction: 'deserve to be' },
      { pattern: /\bTheir,\s+I\b/gi, message: 'Use "There" to start a sentence about location or existence', correction: 'There, I' },
      { pattern: /\bprepared\s+me\s+good\b/gi, message: 'Use "well" instead of "good" as an adverb', correction: 'prepared me well' },
      { pattern: /\byou\'re\s+prestegious\b/gi, message: 'Use "your" (possessive) instead of "you\'re" (you are)', correction: 'your prestigious' }
    ];

    for (const error of wordUsageErrors) {
      let match;
      while ((match = error.pattern.exec(text)) !== null) {
        suggestions.push({
          id: `grammar-usage-${match.index}`,
          type: 'grammar',
          severity: 'warning',
          message: error.message,
          originalText: match[0],
          suggestedText: error.correction,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          explanation: error.message
        });
      }
    }

    return suggestions;
  }

  /**
   * ✅ COMPREHENSIVE CAPITALIZATION CHECKER
   * Detects various capitalization errors including:
   * - Sentences not starting with capital letters
   * - Proper nouns not capitalized
   * - Days, months, countries, cities
   * - Personal pronouns (I)
   * - Acronyms and abbreviations
   */
  private checkCapitalization(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // 1. Check sentence beginnings
    const sentences = text.split(/[.!?]+\s*/);
    let currentIndex = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.length === 0) continue;
      
      const sentenceStart = text.indexOf(sentence, currentIndex);
      if (sentenceStart >= 0 && sentence[0] && sentence[0] !== sentence[0].toUpperCase()) {
        // Skip if it's a continuation after a colon or semicolon
        const beforeSentence = text.substring(0, sentenceStart).trim();
        const lastChar = beforeSentence[beforeSentence.length - 1];
        
        if (lastChar !== ':' && lastChar !== ';') {
          const correctedSentence = sentence[0].toUpperCase() + sentence.slice(1);
          suggestions.push({
            id: `capitalization-sentence-${sentenceStart}`,
            type: 'grammar',
            severity: 'error',
            message: 'Sentences should start with a capital letter',
            originalText: sentence,
            suggestedText: correctedSentence,
            startIndex: sentenceStart,
            endIndex: sentenceStart + sentence.length,
            explanation: 'The first word of every sentence must be capitalized.'
          });
        }
      }
      currentIndex = sentenceStart + sentence.length;
    }
    
    // 2. Check personal pronoun "I"
    const iPattern = /\b(i)\b/g;
    let match;
    while ((match = iPattern.exec(text)) !== null) {
      if (match[1] === 'i') { // Only if it's lowercase
        suggestions.push({
          id: `capitalization-i-${match.index}`,
          type: 'grammar',
          severity: 'error',
          message: 'The pronoun "I" should always be capitalized',
          originalText: 'i',
          suggestedText: 'I',
          startIndex: match.index,
          endIndex: match.index + 1,
          explanation: 'The first-person singular pronoun "I" is always capitalized in English.'
        });
      }
    }
    
    // 3. Check proper nouns - Days of the week
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      const dayPattern = new RegExp(`\\b${day}\\b`, 'gi');
      let match;
      while ((match = dayPattern.exec(text)) !== null) {
        if (match[0] !== match[0][0].toUpperCase() + match[0].slice(1).toLowerCase()) {
          const corrected = match[0][0].toUpperCase() + match[0].slice(1).toLowerCase();
          suggestions.push({
            id: `capitalization-day-${match.index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Days of the week should be capitalized',
            originalText: match[0],
            suggestedText: corrected,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            explanation: 'Days of the week are proper nouns and must be capitalized.'
          });
        }
      }
    }
    
    // 4. Check proper nouns - Months
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 
                    'july', 'august', 'september', 'october', 'november', 'december'];
    for (const month of months) {
      const monthPattern = new RegExp(`\\b${month}\\b`, 'gi');
      let match;
      while ((match = monthPattern.exec(text)) !== null) {
        if (match[0] !== match[0][0].toUpperCase() + match[0].slice(1).toLowerCase()) {
          const corrected = match[0][0].toUpperCase() + match[0].slice(1).toLowerCase();
          suggestions.push({
            id: `capitalization-month-${match.index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Months should be capitalized',
            originalText: match[0],
            suggestedText: corrected,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            explanation: 'Months are proper nouns and must be capitalized.'
          });
        }
      }
    }
    
    // 5. Check common proper nouns - Countries, cities, languages
    const properNouns = [
      'america', 'american', 'united states', 'usa', 'canada', 'canadian', 'mexico', 'mexican',
      'england', 'english', 'britain', 'british', 'france', 'french', 'germany', 'german',
      'spain', 'spanish', 'italy', 'italian', 'china', 'chinese', 'japan', 'japanese',
      'new york', 'california', 'texas', 'florida', 'chicago', 'los angeles', 'boston',
      'harvard', 'stanford', 'mit', 'yale', 'princeton', 'columbia', 'berkeley',
      'christian', 'christianity', 'muslim', 'islam', 'jewish', 'judaism', 'hindu', 'hinduism',
      'god', 'jesus', 'allah', 'buddha'
    ];
    
    for (const noun of properNouns) {
      const nounPattern = new RegExp(`\\b${noun.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      let match;
      while ((match = nounPattern.exec(text)) !== null) {
        const words = match[0].split(/\s+/);
        const corrected = words.map(word => word[0].toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        
        if (match[0] !== corrected) {
          suggestions.push({
            id: `capitalization-proper-${match.index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Proper nouns should be capitalized',
            originalText: match[0],
            suggestedText: corrected,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            explanation: 'Names of places, people, languages, religions, and institutions are proper nouns and must be capitalized.'
          });
        }
      }
    }
    
    // 6. Check for titles and honorifics
    const titles = ['mr', 'mrs', 'ms', 'dr', 'prof', 'professor', 'president', 'senator', 'governor'];
    for (const title of titles) {
      const titlePattern = new RegExp(`\\b${title}\\b`, 'gi');
      let match;
      while ((match = titlePattern.exec(text)) !== null) {
        if (match[0] !== match[0][0].toUpperCase() + match[0].slice(1).toLowerCase()) {
          const corrected = match[0][0].toUpperCase() + match[0].slice(1).toLowerCase();
          suggestions.push({
            id: `capitalization-title-${match.index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Titles and honorifics should be capitalized',
            originalText: match[0],
            suggestedText: corrected,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            explanation: 'Titles and honorifics are proper nouns and must be capitalized.'
          });
        }
      }
    }

    return suggestions;
  }

  private async checkSpelling(text: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    
    // ⚡ INSTANT BROWSER-COMPATIBLE SPELL CHECKER
    // Common misspellings that high school students make
    const commonMisspellings: { [key: string]: string[] } = {
      // Common typos
      'teh': ['the'],
      'adn': ['and'],
      'hte': ['the'],
      'nad': ['and'],
      'taht': ['that'],
      'thier': ['their'],
      'recieve': ['receive'],
      'seperate': ['separate'],
      'definately': ['definitely'],
      'occured': ['occurred'],
      'neccessary': ['necessary'],
      'accomodate': ['accommodate'],
      'embarass': ['embarrass'],
      'existance': ['existence'],
      'maintainance': ['maintenance'],
      'independance': ['independence'],
      'appearence': ['appearance'],
      'occurance': ['occurrence'],
      'beleive': ['believe'],
      'achive': ['achieve'],
      'recieved': ['received'],
      'begining': ['beginning'],
      'arguement': ['argument'],
      'enviroment': ['environment'],
      'goverment': ['government'],
      'persue': ['pursue'],
      'writ': ['write'],
      'spel': ['spell'],
      'mysteri': ['mystery'],
      'writeing': ['writing'],
      'writting': ['writing'],
      'writen': ['written'],
      'wrotes': ['wrote'],
      'writed': ['wrote'],
      
      // Compound word errors and split word typos - NEW ADDITION
      'woul dbe': ['would be'],
      'coul dbe': ['could be'],
      'shoul dbe': ['should be'],
      'woul dhave': ['would have'],
      'coul dhave': ['could have'],
      'shoul dhave': ['should have'],
      'ther eis': ['there is'],
      'ther eare': ['there are'],
      'i tis': ['it is'],
      'i twas': ['it was'],
      'i nthe': ['in the'],
      'o nthe': ['on the'],
      'a tthe': ['at the'],
      'fo rthe': ['for the'],
      'wit hthe': ['with the'],
      'fro mthe': ['from the'],
      'abou tthe': ['about the'],
      'int othe': ['into the'],
      'ou tof': ['out of'],
      'becaus eof': ['because of'],
      'instea dof': ['instead of'],
      'a lot': ['a lot'], // Common misconception - this is actually correct
      'alot': ['a lot'],
      'al ot': ['a lot'],
      'alo t': ['a lot'],
      
      // High school writing specific errors
      'highschool': ['high school'],
      'middleschool': ['middle school'],
      'gradeschool': ['grade school'],
      'everytime': ['every time'],
      'eachother': ['each other'],
      'inorder': ['in order'],
      'infact': ['in fact'],
      'inspite': ['in spite'],
      'atleast': ['at least'],
      'aswell': ['as well'],
      'thankyou': ['thank you'],
      'goodmorning': ['good morning'],
      'goodnight': ['good night'],
      'goodluck': ['good luck'],
      
      // Common contractions and possessives
      'cant': ["can't"],
      'wont': ["won't"],
      'dont': ["don't"],
      'doesnt': ["doesn't"],
      'didnt': ["didn't"],
      'wasnt': ["wasn't"],
      'werent': ["weren't"],
      'isnt': ["isn't"],
      'arent': ["aren't"],
      'hasnt': ["hasn't"],
      'havent': ["haven't"],
      'hadnt': ["hadn't"],
      'shouldnt': ["shouldn't"],
      'wouldnt': ["wouldn't"],
      'couldnt': ["couldn't"],
      
      // Homophones
      'your': ['you\'re'], // Context dependent
      'there': ['their', 'they\'re'], // Context dependent
      'its': ['it\'s'], // Context dependent
      'to': ['too', 'two'], // Context dependent
      'then': ['than'], // Context dependent
      'affect': ['effect'], // Context dependent
      'accept': ['except'], // Context dependent
      
      // Common academic writing errors
      'alright': ['all right'],
      'everyday': ['every day'], // Context dependent
      'anymore': ['any more'], // Context dependent
      'awhile': ['a while'], // Context dependent
      'maybe': ['may be'], // Context dependent
      'sometime': ['some time'], // Context dependent
      'anyway': ['any way'], // Context dependent
      'already': ['all ready'], // Context dependent
      
      // Technology and modern terms
      'internet': ['Internet'], // Capitalization
      'website': ['web site'], // Style dependent
      'email': ['e-mail'], // Style dependent
      'online': ['on-line'], // Style dependent
      'facebook': ['Facebook'],
      'google': ['Google'],
      'youtube': ['YouTube'],
      'instagram': ['Instagram'],
      'twitter': ['Twitter'],
      
      // Common letter reversals and adjacency errors
      'form': ['from'], // Context dependent
      'unite': ['untie'], // Context dependent
      'diary': ['dairy'], // Context dependent
      'trial': ['trail'], // Context dependent
      'martial': ['marital'], // Context dependent
      'casual': ['causal'], // Context dependent
      'desert': ['dessert'], // Context dependent
      'loose': ['lose'], // Context dependent
      'choose': ['chose'], // Context dependent
      'breath': ['breathe'], // Context dependent
      'cloth': ['clothe'], // Context dependent
      'bath': ['bathe'], // Context dependent
    };

    // Split text into words and check each one
    const words = text.split(/\s+/);
    let currentIndex = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase().replace(/[^\w]/g, ''); // Remove punctuation
      const originalWord = words[i];
      
      // Check for single word misspellings
      if (commonMisspellings[word]) {
        const wordStart = text.indexOf(originalWord, currentIndex);
        if (wordStart !== -1) {
                                suggestions.push({
             id: `spell-${Date.now()}-${i}`,
             type: 'spelling',
             severity: 'error',
             message: `"${originalWord}" may be misspelled`,
             originalText: originalWord,
             suggestedText: commonMisspellings[word][0],
             startIndex: wordStart,
             endIndex: wordStart + originalWord.length,
             explanation: `Did you mean "${commonMisspellings[word][0]}"?`
           });
        }
      }
      
      // Check for compound word errors (two consecutive words)
      if (i < words.length - 1) {
        const twoWordPhrase = `${word} ${words[i + 1].toLowerCase().replace(/[^\w]/g, '')}`;
        const originalTwoWords = `${originalWord} ${words[i + 1]}`;
        
        if (commonMisspellings[twoWordPhrase]) {
          const phraseStart = text.indexOf(originalTwoWords, currentIndex);
          if (phraseStart !== -1) {
        suggestions.push({
               id: `spell-compound-${Date.now()}-${i}`,
          type: 'spelling',
          severity: 'error',
               message: `"${originalTwoWords}" appears to be a compound error`,
               originalText: originalTwoWords,
               suggestedText: commonMisspellings[twoWordPhrase][0],
               startIndex: phraseStart,
               endIndex: phraseStart + originalTwoWords.length,
               explanation: `Did you mean "${commonMisspellings[twoWordPhrase][0]}"?`
             });
            i++; // Skip next word since we processed it as part of compound
          }
        }
      }
      
      currentIndex = text.indexOf(originalWord, currentIndex) + originalWord.length;
    }

    console.log(`⚡ Instant spell check found ${suggestions.length} misspellings`);
    return suggestions;
  }

  private async checkStyle(text: string, words: string[], sentences: string[]): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];

    // Check for repetitive words
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        wordFreq.set(cleanWord, (wordFreq.get(cleanWord) || 0) + 1);
      }
    });

    for (const [word, count] of wordFreq) {
      if (count > 3) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          suggestions.push({
            id: `style-repetitive-${word}-${match.index}`,
            type: 'style',
            severity: 'suggestion',
            message: `"${word}" is used frequently`,
            originalText: match[0],
            suggestedText: match[0],
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            explanation: 'Consider using synonyms to avoid repetition.'
          });
        }
      }
    }

    // Check for weak words
    const weakWords = ['very', 'really', 'quite', 'rather', 'somewhat', 'pretty', 'kind of', 'sort of'];
    for (const weakWord of weakWords) {
      const regex = new RegExp(`\\b${weakWord}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        suggestions.push({
          id: `style-weak-${weakWord}-${match.index}`,
          type: 'style',
          severity: 'suggestion',
          message: `Consider removing "${weakWord}"`,
          originalText: match[0],
          suggestedText: '',
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          explanation: 'Removing weak words can make your writing more direct and powerful.'
        });
      }
    }

    // Check for sentence variety - FIXED: Remove placeholder suggestions with "..."
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const similarLengths = sentenceLengths.filter(len => Math.abs(len - avgLength) < 2).length;
    
    // Only add sentence variety suggestion if we can identify a specific area to improve
    if (similarLengths > sentenceLengths.length * 0.7 && sentences.length > 2) {
      // Find the longest sentence to suggest breaking it up
      const longestSentenceIndex = sentenceLengths.indexOf(Math.max(...sentenceLengths));
      const longestSentence = sentences[longestSentenceIndex];
      
      if (longestSentence && longestSentence.length > 100) {
        const startIndex = text.indexOf(longestSentence);
        if (startIndex >= 0) {
          suggestions.push({
            id: 'style-sentence-variety',
            type: 'style',
            severity: 'suggestion',
            message: 'Consider breaking this long sentence into shorter ones',
            originalText: longestSentence.trim(),
            suggestedText: longestSentence.trim(),
            startIndex,
            endIndex: startIndex + longestSentence.length,
            explanation: 'Mix short and long sentences to improve readability and flow.'
          });
        }
      }
    }

    return suggestions;
  }

  private calculateReadability(text: string): { score: number; grade: string } {
    try {
      const score = readabilityScore(text);
      let grade = 'Graduate';
      
      if (score.fleschKincaidGradeLevel <= 6) grade = 'Elementary';
      else if (score.fleschKincaidGradeLevel <= 8) grade = 'Middle School';
      else if (score.fleschKincaidGradeLevel <= 12) grade = 'High School';
      else if (score.fleschKincaidGradeLevel <= 16) grade = 'College';
      
      return {
        score: Math.round(score.fleschReadingEase * 10) / 10,
        grade
      };
    } catch (error) {
      return { score: 0, grade: 'Unknown' };
    }
  }

  private countComplexWords(words: string[]): number {
    let complexWordCount = 0;
    words.forEach(word => {
      if (this.isComplexWord(word)) {
        complexWordCount++;
      }
    });
    return complexWordCount;
  }

  private isComplexWord(word: string): boolean {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    // Count syllables (rough approximation)
    const syllables = cleanWord.match(/[aeiouy]+/g)?.length || 1;
    return syllables >= 3;
  }

  private async checkVocabulary(): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    // This is a placeholder for more advanced vocabulary checks
    // For now, it doesn't do anything to avoid performance issues
    return suggestions;
  }

  private async checkGoalAlignment(text: string, writingGoal: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];

    if (writingGoal === 'personal-statement') {
      const doc = nlp(text);
      const personalPronouns = doc.match('#Pronoun').out('array').filter((p: string) => ['i', 'me', 'my'].includes(p.toLowerCase()));
      
      // FIXED: Only suggest if text is long enough and provide specific guidance
      if (personalPronouns.length < 3 && text.length > 100) {
        // Find a place where we could suggest adding personal pronouns
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const firstSentence = sentences[0];
        
        if (firstSentence && !firstSentence.toLowerCase().includes(' i ')) {
          const startIndex = 0;
          suggestions.push({
            id: 'goal-personal-pronouns',
            type: 'goal-alignment',
            severity: 'suggestion',
            message: 'Consider starting with a personal statement',
            originalText: firstSentence.trim(),
            suggestedText: firstSentence.trim(),
            startIndex,
            endIndex: startIndex + firstSentence.length,
            explanation: 'Personal statements are stronger when they highlight specific experiences and contributions using first-person language.'
          });
        }
      }

      const achievementWords = ['achieved', 'accomplished', 'led', 'created', 'developed', 'built', 'designed', 'organized', 'managed'];
      const achievements = doc.match(`(${achievementWords.join('|')})`).out('array');

      // FIXED: Only suggest if text is long enough and provide specific guidance
      if (achievements.length < 1 && text.length > 150) {
        // Find a place where we could suggest adding achievements
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const lastSentence = sentences[sentences.length - 1];
        
        if (lastSentence) {
          const startIndex = text.lastIndexOf(lastSentence);
          suggestions.push({
            id: 'goal-achievements',
            type: 'goal-alignment',
            severity: 'suggestion',
            message: 'Consider highlighting specific achievements',
            originalText: lastSentence.trim(),
            suggestedText: lastSentence.trim(),
            startIndex,
            endIndex: startIndex + lastSentence.length,
            explanation: 'Personal statements are stronger when they highlight specific achievements using action words like "achieved," "led," or "created."'
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * 🎯 ENHANCED COMPREHENSIVE TONE ANALYSIS
   * Provides detailed analysis of writing tone with specific recommendations
   * This analysis is thorough and may take a few seconds - perfect for final review
   */
  private async analyzeTone(text: string): Promise<ToneAnalysis> {
    // Enhanced tone analysis using advanced keyword detection and pattern matching
    const words = text.toLowerCase().split(/\s+/);
    const textLower = text.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // 📊 CONFIDENCE & CERTAINTY ANALYSIS
    const uncertainWords = ['maybe', 'perhaps', 'might', 'possibly', 'probably', 'i think', 'i guess', 'sort of', 'kind of', 'somewhat', 'rather', 'fairly', 'quite'];
    const confidentWords = ['will', 'definitely', 'certainly', 'absolutely', 'clearly', 'obviously', 'undoubtedly', 'ensure', 'guarantee', 'determined', 'committed'];
    const hedgingPhrases = ['it seems', 'it appears', 'i believe', 'in my opinion', 'i feel like', 'it might be', 'could be'];
    const assertiveWords = ['must', 'should', 'need to', 'essential', 'crucial', 'vital', 'imperative', 'required'];
    
    // 🎭 EMOTIONAL TONE ANALYSIS
    const passionateWords = ['love', 'passionate', 'excited', 'thrilled', 'amazing', 'incredible', 'fantastic', 'wonderful', 'inspiring', 'motivating', 'driven', 'enthusiastic'];
    const negativeWords = ['never', 'impossible', 'can\'t', 'won\'t', 'hate', 'terrible', 'awful', 'horrible', 'worst', 'failed', 'struggle', 'difficult'];
    const positiveWords = ['excellent', 'outstanding', 'successful', 'achievement', 'accomplished', 'proud', 'honored', 'grateful', 'fortunate', 'blessed'];
    const humbleWords = ['hope', 'try', 'attempt', 'learn', 'grow', 'improve', 'develop', 'grateful', 'fortunate', 'honored to', 'privilege'];
    const arrogantWords = ['obviously', 'of course', 'naturally', 'clearly superior', 'best', 'perfect', 'flawless', 'unmatched', 'exceptional', 'elite'];
    
    // 💼 FORMALITY ANALYSIS
    const casualWords = ['want', 'gonna', 'wanna', 'gotta', 'kinda', 'sorta', 'yeah', 'yep', 'nope', 'cool', 'awesome', 'great', 'nice', 'stuff', 'things', 'guys'];
    const contractions = ['i\'m', 'you\'re', 'we\'re', 'they\'re', 'it\'s', 'that\'s', 'what\'s', 'here\'s', 'there\'s', 'can\'t', 'won\'t', 'don\'t', 'isn\'t', 'aren\'t', 'wouldn\'t', 'couldn\'t', 'shouldn\'t'];
    const informalPhrases = ['i want to', 'my book would be', 'of all time', 'best book ever', 'so cool', 'pretty good', 'kind of like'];
    const colloquialisms = ['a lot of', 'lots of', 'tons of', 'bunch of', 'loads of', 'heaps of'];
    
    const formalWords = ['experience', 'opportunity', 'develop', 'skills', 'knowledge', 'professional', 'utilize', 'endeavor', 'aspire', 'facilitate', 'demonstrate', 'exemplify', 'constitute', 'furthermore', 'moreover', 'consequently'];
    const academicWords = ['analyze', 'synthesize', 'evaluate', 'assess', 'examine', 'investigate', 'methodology', 'theoretical', 'empirical', 'hypothesis', 'conclusion'];
    const businessWords = ['leverage', 'optimize', 'streamline', 'implement', 'execute', 'strategic', 'innovative', 'synergy', 'paradigm', 'deliverable'];
    
    // 🎨 WRITING STYLE ANALYSIS
    const passiveVoice = ['was written', 'is being', 'has been', 'will be', 'were created', 'was developed', 'is considered', 'are regarded'];
    const activeVerbs = ['created', 'developed', 'led', 'managed', 'designed', 'built', 'organized', 'achieved', 'accomplished', 'established'];
    const personalPronouns = ['i', 'me', 'my', 'myself', 'we', 'us', 'our'];
    const impersonalPhrases = ['one might', 'it is possible', 'there exists', 'it can be observed', 'research indicates'];
    
    // 📈 COUNT OCCURRENCES
    const uncertainCount = this.countPhrases(textLower, [...uncertainWords, ...hedgingPhrases]);
    const confidentCount = this.countPhrases(textLower, [...confidentWords, ...assertiveWords]);
    const passionateCount = this.countPhrases(textLower, passionateWords);
    const negativeCount = this.countPhrases(textLower, negativeWords);
    const positiveCount = this.countPhrases(textLower, positiveWords);
    const humbleCount = this.countPhrases(textLower, humbleWords);
    const arrogantCount = this.countPhrases(textLower, arrogantWords);
    
    const casualCount = this.countPhrases(textLower, [...casualWords, ...contractions, ...informalPhrases, ...colloquialisms]);
    const formalCount = this.countPhrases(textLower, [...formalWords, ...academicWords, ...businessWords]);
    
    const passiveCount = this.countPhrases(textLower, passiveVoice);
    const activeCount = this.countPhrases(textLower, activeVerbs);
    const personalCount = this.countPhrases(textLower, personalPronouns);
    const impersonalCount = this.countPhrases(textLower, impersonalPhrases);
    
    // 🎯 DETERMINE OVERALL TONE
    let overallTone: ToneAnalysis['overall'] = 'neutral';
    const totalWords = words.length;
    
    // Calculate tone percentages
    const confidenceRatio = (confidentCount - uncertainCount) / totalWords;
    const formalityRatio = (formalCount - casualCount) / totalWords;
    const emotionRatio = (positiveCount + passionateCount - negativeCount) / totalWords;
    const personalityRatio = (personalCount - impersonalCount) / totalWords;
    const humilityRatio = (humbleCount - arrogantCount) / totalWords;
    
    // Enhanced tone determination with multiple factors
    if (confidenceRatio > 0.02) {
      if (formalityRatio > 0.01) {
        overallTone = 'professional';
      } else if (personalityRatio > 0.05) {
        overallTone = 'confident';
      } else {
        overallTone = 'formal';
      }
    } else if (confidenceRatio < -0.02) {
      overallTone = 'uncertain';
    } else if (formalityRatio > 0.02) {
      overallTone = 'formal';
    } else if (formalityRatio < -0.02) {
      if (personalityRatio > 0.03) {
        overallTone = 'conversational';
      } else {
        overallTone = 'casual';
      }
    } else if (passionateCount > 2 || emotionRatio > 0.03) {
      overallTone = 'passionate';
    } else if (humilityRatio > 0.02) {
      overallTone = 'humble';
    } else if (arrogantCount > 1) {
      overallTone = 'arrogant';
    }
    
    // 💪 IDENTIFY STRENGTHS
    const strengths: string[] = [];
    
    if (activeCount > passiveCount) {
      strengths.push('Uses active voice effectively, making writing more engaging and direct');
    }
    
    if (personalCount > 3 && sentences.length > 2) {
      strengths.push('Good use of personal voice, making the writing relatable and authentic');
    }
    
    if (positiveCount > negativeCount + 1) {
      strengths.push('Maintains a positive and optimistic tone throughout');
    }
    
    if (confidentCount > uncertainCount) {
      strengths.push('Demonstrates confidence and conviction in statements');
    }
    
    if (humbleCount > 0 && arrogantCount === 0) {
      strengths.push('Shows appropriate humility and willingness to learn');
    }
    
    if (passionateCount > 1) {
      strengths.push('Conveys genuine enthusiasm and passion for the subject');
    }
    
    const avgSentenceLength = words.length / sentences.length;
    if (avgSentenceLength >= 12 && avgSentenceLength <= 20) {
      strengths.push('Good sentence length variety for readability');
    }
    
    // 🔍 IDENTIFY WEAKNESSES
    const weaknesses: string[] = [];
    
    if (uncertainCount > confidentCount + 2) {
      weaknesses.push('Overuse of uncertain language may weaken your arguments');
    }
    
    if (passiveCount > activeCount) {
      weaknesses.push('Heavy use of passive voice makes writing less direct and engaging');
    }
    
    if (negativeCount > positiveCount + 1) {
      weaknesses.push('Tone may be too negative; consider more positive framing');
    }
    
    if (casualCount > formalCount + 3 && overallTone !== 'conversational') {
      weaknesses.push('Language may be too casual for the intended audience');
    }
    
    if (arrogantCount > 1) {
      weaknesses.push('Some phrases may come across as arrogant or presumptuous');
    }
    
    if (personalCount < 1 && sentences.length > 3) {
      weaknesses.push('Lack of personal voice makes writing feel impersonal');
    }
    
    if (hedgingPhrases.some(phrase => textLower.includes(phrase))) {
      weaknesses.push('Excessive hedging language reduces impact and authority');
    }
    
    // 📋 GENERATE RECOMMENDATIONS
    const recommendations: string[] = [];
    
    if (uncertainCount > 2) {
      recommendations.push('Replace uncertain phrases like "I think" or "maybe" with more definitive statements');
    }
    
    if (passiveCount > 2) {
      recommendations.push('Convert passive voice to active voice where possible (e.g., "I created" instead of "was created by me")');
    }
    
    if (casualCount > 3 && formalCount < 2) {
      recommendations.push('Consider using more formal vocabulary appropriate for your audience');
    }
    
    if (negativeCount > 1) {
      recommendations.push('Reframe negative statements positively when possible');
    }
    
    if (personalCount < 2 && overallTone !== 'formal') {
      recommendations.push('Add more personal voice to make your writing more engaging');
    }
    
    if (arrogantCount > 0) {
      recommendations.push('Soften overly confident statements to avoid appearing arrogant');
    }
    
    if (sentences.length > 5 && passionateCount === 0) {
      recommendations.push('Consider adding more enthusiasm or passion to engage your readers');
    }
    
    if (avgSentenceLength > 25) {
      recommendations.push('Break up long sentences for better readability');
    }
    
    if (avgSentenceLength < 8) {
      recommendations.push('Combine some short sentences for better flow');
    }
    
    // 📝 GENERATE SUMMARY
    let summary = `Your writing has a ${overallTone} tone`;
    
    if (strengths.length > 0) {
      summary += `, with strong ${strengths.length > 1 ? 'points including' : 'point in'} ${strengths[0].toLowerCase()}`;
    }
    
    if (weaknesses.length > 0) {
      summary += `. Main area${weaknesses.length > 1 ? 's' : ''} for improvement: ${weaknesses[0].toLowerCase()}`;
    }
    
    if (recommendations.length > 0) {
      summary += `. Focus on ${recommendations[0].toLowerCase()} to enhance your writing impact.`;
    }
    
    return {
      overall: overallTone,
      strengths: strengths.length > 0 ? strengths : ['Writing demonstrates clear communication'],
      weaknesses: weaknesses.length > 0 ? weaknesses : [],
      recommendations: recommendations.length > 0 ? recommendations : ['Continue developing your unique voice and style'],
      summary
    };
  }
  
  /**
   * Helper function to count phrase occurrences in text
   */
  private countPhrases(text: string, phrases: string[]): number {
    let count = 0;
    for (const phrase of phrases) {
      const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
      }
    }
    return count;
  }

  private removeDuplicateSuggestions(suggestions: TextSuggestion[]): TextSuggestion[] {
    const seen = new Set<string>();
    const unique: TextSuggestion[] = [];
  
    for (const suggestion of suggestions) {
      // Create a unique key based on text range, type, and suggested replacement
      const key = `${suggestion.startIndex}-${suggestion.endIndex}-${suggestion.type}-${suggestion.originalText}-${suggestion.suggestedText}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      } else {
        console.log(`🔄 Removing exact duplicate: "${suggestion.originalText}" → "${suggestion.suggestedText}" (${suggestion.type})`);
      }
    }
  
    return unique;
  }

  public mergeSuggestions(baseSuggestions: TextSuggestion[], newSuggestions: TextSuggestion[]): TextSuggestion[] {
    console.log(`🔄 Merging suggestions: ${baseSuggestions.length} base + ${newSuggestions.length} new`);
    const combined = [...baseSuggestions, ...newSuggestions];
    const resolved = this.resolveConflictingSuggestions(combined);
    console.log(`✅ Merge complete: ${combined.length} → ${resolved.length} suggestions`);
    return resolved;
  }

  private resolveConflictingSuggestions(suggestions: TextSuggestion[]): TextSuggestion[] {
    if (suggestions.length <= 1) return suggestions;

    // Deduplicate and sort by priority (highest first), then by start index
    const getPriority = (suggestion: TextSuggestion): number => {
      // Higher number = higher priority
      const severityOrder = { 'error': 30, 'warning': 20, 'suggestion': 10 };
      const typePriority = {
        'spelling': 100,      // Highest - spelling errors are critical
        'grammar': 80,        // High - but lower than spelling
        'vocabulary': 60,     // Medium-High (specific word changes)
        'conciseness': 40,    // Medium (reduced to allow more coexistence)
        'style': 30,          // Lower (often subjective)
        'goal-alignment': 10, // Lowest (very broad, sentence-level)
      };
      // Combine severity and type priority for a more granular score
      return (typePriority[suggestion.type] || 0) + (severityOrder[suggestion.severity] || 0);
    };

    const sortedSuggestions = this.removeDuplicateSuggestions(suggestions)
      .sort((a, b) => getPriority(b) - getPriority(a) || a.startIndex - b.startIndex);

    const resolvedSuggestions: TextSuggestion[] = [];
    const discardedIndices = new Set<number>();

    for (let i = 0; i < sortedSuggestions.length; i++) {
      // If this suggestion has already been discarded, skip it
      if (discardedIndices.has(i)) continue;

      const currentSuggestion = sortedSuggestions[i];
      resolvedSuggestions.push(currentSuggestion); // Keep the current suggestion by default

      // Now, find and discard any lower-priority suggestions that overlap with this one
      for (let j = i + 1; j < sortedSuggestions.length; j++) {
        if (discardedIndices.has(j)) continue;

        const otherSuggestion = sortedSuggestions[j];
        if (this.suggestionsOverlap(currentSuggestion, otherSuggestion)) {
          // Since the list is sorted by priority, the 'other' suggestion is always lower priority
          discardedIndices.add(j);
          console.log(`[Conflict Resolution] Discarding lower-priority suggestion: "${otherSuggestion.originalText}" (${otherSuggestion.type}) due to conflict with "${currentSuggestion.originalText}" (${currentSuggestion.type})`);
        }
      }
    }
    
    const conflictCount = discardedIndices.size;
    if (conflictCount > 0) {
      console.log(`🔧 Conflict resolution complete: ${suggestions.length} → ${resolvedSuggestions.length} suggestions (${conflictCount} conflicts resolved).`);
    }

    // Return sorted by appearance in the text
    return resolvedSuggestions.sort((a, b) => a.startIndex - b.startIndex);
  }

  private suggestionsOverlap(suggestion1: TextSuggestion, suggestion2: TextSuggestion): boolean {
    // Overlap exists if one suggestion's range intersects with the other's
    // Added a check to prevent a suggestion from conflicting with itself.
    if (suggestion1.id === suggestion2.id) return false;
    
    const s1_start = suggestion1.startIndex;
    const s1_end = suggestion1.endIndex;
    const s2_start = suggestion2.startIndex;
    const s2_end = suggestion2.endIndex;

    // Check for direct overlap - must have actual character overlap, not just touching
    const hasDirectOverlap = s1_start < s2_end && s2_start < s1_end;
    
    // If there's no direct overlap, no conflict
    if (!hasDirectOverlap) return false;
    
    // Calculate overlap percentage for more nuanced conflict resolution
      const overlapStart = Math.max(s1_start, s2_start);
      const overlapEnd = Math.min(s1_end, s2_end);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);
    const s1_length = s1_end - s1_start;
    const s2_length = s2_end - s2_start;
    const minLength = Math.min(s1_length, s2_length);
    const maxLength = Math.max(s1_length, s2_length);
    const overlapPercentage = overlapLength / minLength;
    
    // Special case: spelling vs conciseness - be very permissive
    if ((suggestion1.type === 'spelling' || suggestion2.type === 'spelling') && 
        (suggestion1.type === 'conciseness' || suggestion2.type === 'conciseness')) {
      // Only conflict if they have exact same range or >95% overlap
      return (s1_start === s2_start && s1_end === s2_end) || overlapPercentage > 0.95;
    }
    
    // Special case: spelling vs grammar - allow more coexistence
    if ((suggestion1.type === 'spelling' || suggestion2.type === 'spelling') && 
        (suggestion1.type === 'grammar' || suggestion2.type === 'grammar')) {
      // Only conflict if overlap is more than 90% of the smaller suggestion
      return overlapPercentage > 0.9;
    }
    
    // Special case: vocabulary vs conciseness - allow them to coexist unless very similar
    if ((suggestion1.type === 'vocabulary' || suggestion2.type === 'vocabulary') && 
        (suggestion1.type === 'conciseness' || suggestion2.type === 'conciseness')) {
      // Only conflict if they have exact same range or >90% overlap
      return (s1_start === s2_start && s1_end === s2_end) || overlapPercentage > 0.9;
    }
    
    // Special case: vocabulary vs grammar - be more permissive
    if ((suggestion1.type === 'vocabulary' || suggestion2.type === 'vocabulary') && 
        (suggestion1.type === 'grammar' || suggestion2.type === 'grammar')) {
      // Only conflict if overlap is more than 80% of the smaller suggestion
      return overlapPercentage > 0.8;
    }
    
    // Special case: goal-alignment vs other types - be very restrictive
    if (suggestion1.type === 'goal-alignment' || suggestion2.type === 'goal-alignment') {
      // Only conflict if they have very significant overlap (95%+)
      return overlapPercentage > 0.95;
    }
    
    // For same types, be more strict
    if (suggestion1.type === suggestion2.type) {
      return overlapPercentage > 0.5;
    }
    
    // For different types not covered above, require significant overlap
    return overlapPercentage > 0.7;
  }

  /**
   * 🎯 ULTRA-COMPREHENSIVE ADVANCED GRAMMAR ANALYSIS
   * Detects complex grammar issues that basic checkers miss
   */
  private async runAdvancedGrammarAnalysis(text: string): Promise<any> {
    try {
      // Use AI service for advanced grammar checking
      const result = await firebaseAIService.analyzeGrammarAndClarity(text);
      
      // Enhance with additional local pattern detection
      const localPatterns = this.detectAdvancedGrammarPatterns(text);
      
             if (result.suggestions && localPatterns.length > 0) {
         result.suggestions.push(...localPatterns.map(p => ({ ...p, confidence: 0.8 })));
       }
      
      return result;
    } catch (error) {
      console.warn('Advanced grammar analysis failed:', error);
      return { suggestions: this.detectAdvancedGrammarPatterns(text) };
    }
  }

  /**
   * 🎯 CONTEXTUAL SPELLING & WORD CHOICE ANALYSIS
   * Detects words that are spelled correctly but wrong in context
   */
  private async runContextualSpellingAnalysis(text: string): Promise<any> {
    try {
      // Create a specialized prompt for contextual spelling
      const contextualPrompt = `Analyze this text for contextual spelling errors, homophones, and wrong word choices. Look for words that are spelled correctly but wrong in context (like "their/there/they're", "affect/effect", "loose/lose", etc.):

"${text}"

Find ALL contextual spelling errors and provide corrections.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(contextualPrompt, text);
      
      // Enhance with local homophone detection
      const homophoneErrors = this.detectHomophoneErrors(text);
      
      if (result.suggestions) {
        result.suggestions.push(...homophoneErrors);
      } else {
        result.suggestions = homophoneErrors;
      }
      
      return result;
    } catch (error) {
      console.warn('Contextual spelling analysis failed:', error);
      return { suggestions: this.detectHomophoneErrors(text) };
    }
  }

  /**
   * 🎯 SEMANTIC & MEANING ANALYSIS
   * Detects logical inconsistencies, unclear references, and semantic errors
   */
  private async runSemanticAnalysis(text: string): Promise<any> {
    try {
      const semanticPrompt = `Analyze this text for semantic errors, logical inconsistencies, unclear references, and meaning problems:

"${text}"

Look for:
1. Unclear pronoun references
2. Logical inconsistencies
3. Contradictory statements
4. Ambiguous meanings
5. Missing logical connections
6. Confusing sentence structures

Provide specific corrections for each issue.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(semanticPrompt, text);
      
      // Enhance with local semantic pattern detection
      const semanticIssues = this.detectSemanticIssues(text);
      
      if (result.suggestions) {
        result.suggestions.push(...semanticIssues);
      } else {
        result.suggestions = semanticIssues;
      }
      
      return result;
    } catch (error) {
      console.warn('Semantic analysis failed:', error);
      return { suggestions: this.detectSemanticIssues(text) };
    }
  }

  /**
   * 🎯 STYLE CONSISTENCY ANALYSIS
   * Detects inconsistencies in writing style, formatting, and conventions
   */
  private async runStyleConsistencyAnalysis(text: string): Promise<any> {
    try {
      const stylePrompt = `Analyze this text for style inconsistencies and formatting issues:

"${text}"

Look for:
1. Inconsistent capitalization
2. Mixed punctuation styles
3. Inconsistent number formatting (1 vs one)
4. Mixed tenses
5. Inconsistent abbreviation usage
6. Formatting inconsistencies
7. Mixed voice (active/passive)

Provide corrections for all inconsistencies.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(stylePrompt, text);
      
      // Enhance with comprehensive local style checking
      const styleIssues = this.checkStyleConsistency(text);
      
      if (result.suggestions) {
        result.suggestions.push(...styleIssues);
      } else {
        result.suggestions = styleIssues;
      }
      
      return result;
    } catch (error) {
      console.warn('Style consistency analysis failed:', error);
      return { suggestions: this.checkStyleConsistency(text) };
    }
  }

  /**
   * 🎯 ENHANCED VOCABULARY ANALYSIS
   * Suggests better word choices and identifies overused words
   */
  private async runVocabularyAnalysis(text: string): Promise<any> {
    try {
      const vocabularyPrompt = `Analyze this text for vocabulary improvements:

"${text}"

Look for:
1. Overused words
2. Weak or vague words
3. Opportunities for more precise vocabulary
4. Repetitive word choices
5. Words that could be more sophisticated
6. Clichés and overused phrases

Suggest specific improvements while maintaining the original tone and meaning.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(vocabularyPrompt, text);
      
      // Apply enhanced filtering for vocabulary suggestions
      if (result.suggestions) {
        result.suggestions = result.suggestions.filter((suggestion: any) => {
          return this.isAppropriateVocabularySuggestion(suggestion, text);
        });
      }
      
      return result;
    } catch (error) {
      console.warn('Vocabulary analysis failed:', error);
      return { suggestions: [] };
    }
  }

  /**
   * 🎯 FLOW & COHERENCE ANALYSIS
   * Analyzes text flow, transitions, and logical structure
   */
  private async runFlowCoherenceAnalysis(text: string): Promise<any> {
    try {
      const flowPrompt = `Analyze this text for flow and coherence issues:

"${text}"

Look for:
1. Missing transitions between ideas
2. Abrupt topic changes
3. Poor paragraph structure
4. Repetitive sentence structures
5. Unclear logical progression
6. Missing connecting words
7. Choppy or awkward flow

Suggest specific improvements to enhance flow and coherence.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(flowPrompt, text);
      
      // Enhance with local flow analysis
      const flowIssues = this.detectFlowIssues(text);
      
      if (result.suggestions) {
        result.suggestions.push(...flowIssues);
      } else {
        result.suggestions = flowIssues;
      }
      
      return result;
    } catch (error) {
      console.warn('Flow coherence analysis failed:', error);
      return { suggestions: this.detectFlowIssues(text) };
    }
  }

  /**
   * 🎯 CLARITY ANALYSIS
   * Identifies unclear, confusing, or overly complex expressions
   */
  private async runClarityAnalysis(text: string): Promise<any> {
    try {
      const clarityPrompt = `Analyze this text for clarity issues:

"${text}"

Look for:
1. Overly complex sentences
2. Unclear expressions
3. Confusing word order
4. Ambiguous statements
5. Unnecessary complexity
6. Unclear references
7. Confusing terminology

Suggest clearer, more direct alternatives.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(clarityPrompt, text);
      
      // Enhance with local clarity checks
      const clarityIssues = this.detectClarityIssues(text);
      
      if (result.suggestions) {
        result.suggestions.push(...clarityIssues);
      } else {
        result.suggestions = clarityIssues;
      }
      
      return result;
    } catch (error) {
      console.warn('Clarity analysis failed:', error);
      return { suggestions: this.detectClarityIssues(text) };
    }
  }

  /**
   * 🎯 TONE CONSISTENCY ANALYSIS
   * Ensures consistent tone and voice throughout the text
   */
  private async runToneConsistencyAnalysis(text: string): Promise<any> {
    try {
      const tonePrompt = `Analyze this text for tone and voice consistency:

"${text}"

Look for:
1. Inconsistent tone (formal vs casual)
2. Mixed voice (active vs passive)
3. Inconsistent perspective (1st, 2nd, 3rd person)
4. Inappropriate tone for context
5. Tone shifts that seem unintentional
6. Voice inconsistencies

Suggest corrections to maintain consistent tone and voice.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(tonePrompt, text);
      
      // Enhance with local tone consistency checks
      const toneIssues = this.detectToneInconsistencies(text);
      
      if (result.suggestions) {
        result.suggestions.push(...toneIssues);
      } else {
        result.suggestions = toneIssues;
      }
      
      return result;
    } catch (error) {
      console.warn('Tone consistency analysis failed:', error);
      return { suggestions: this.detectToneInconsistencies(text) };
    }
  }

  /**
   * 🔍 LOCAL DETECTION METHODS - Comprehensive pattern detection without AI
   * These methods provide robust local analysis as fallbacks and enhancements
   */

  /**
   * Detects advanced grammar patterns locally
   */
  private detectAdvancedGrammarPatterns(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    const doc = nlp(text);
    
    // Subject-verb disagreement patterns
    const sentences = doc.sentences().out('array');
    sentences.forEach((sentence, index) => {
      const sentenceDoc = nlp(sentence);
      const subjects = sentenceDoc.match('#Noun').out('array');
      const verbs = sentenceDoc.match('#Verb').out('array');
      
      // Check for common subject-verb disagreements
      if (subjects.length > 0 && verbs.length > 0) {
        const subject = subjects[0].toLowerCase();
        const verb = verbs[0].toLowerCase();
        
        // Plural subject with singular verb
        if ((subject.endsWith('s') && !subject.endsWith('ss')) && 
            (verb.endsWith('s') && !verb.endsWith('ss'))) {
          const startIndex = text.indexOf(sentence);
          suggestions.push({
            id: `advanced-grammar-${Date.now()}-${index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Subject-verb disagreement detected',
            originalText: sentence.trim(),
            suggestedText: sentence.trim(), // Would need more complex logic for actual correction
            startIndex,
            endIndex: startIndex + sentence.length,
            explanation: 'The subject and verb do not agree in number.'
          });
        }
      }
    });
    
    return suggestions;
  }

  /**
   * Detects homophone errors and contextual spelling mistakes
   */
  private detectHomophoneErrors(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Common homophones and their contexts
    const homophones = {
      'there': { correct: ['there is', 'there are', 'over there'], incorrect: ['there car', 'there house'] },
      'their': { correct: ['their car', 'their house'], incorrect: ['their is', 'their are'] },
      'theyre': { correct: ["they're going", "they're here"], incorrect: [] },
      'your': { correct: ['your car', 'your house'], incorrect: ['your welcome', 'your right'] },
      'youre': { correct: ["you're welcome", "you're right"], incorrect: [] },
      'its': { correct: ['its color', 'its size'], incorrect: [] },
      'affect': { correct: ['affect the outcome'], incorrect: [] },
      'effect': { correct: ['the effect of'], incorrect: [] }
    };
    
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, index) => {
      const cleanWord = word.replace(/[^\w']/g, '');
      
      if (homophones[cleanWord as keyof typeof homophones]) {
        const context = words.slice(Math.max(0, index - 2), index + 3).join(' ');
        const homophone = homophones[cleanWord as keyof typeof homophones];
        
        // Check if used in incorrect context
        const isIncorrect = homophone.incorrect.some(pattern => context.includes(pattern));
        
        if (isIncorrect) {
          const startIndex = text.toLowerCase().indexOf(cleanWord);
          suggestions.push({
            id: `homophone-${Date.now()}-${index}`,
            type: 'spelling',
            severity: 'error',
            message: `Possible homophone error: "${cleanWord}" may be incorrect in this context`,
            originalText: cleanWord,
            suggestedText: this.suggestCorrectHomophone(cleanWord, context),
            startIndex,
            endIndex: startIndex + cleanWord.length,
            explanation: 'This word sounds like another word but has a different meaning.'
          });
        }
      }
    });
    
    return suggestions;
  }

  /**
   * Detects semantic issues and logical inconsistencies
   */
  private detectSemanticIssues(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    const doc = nlp(text);
    
    // Detect unclear pronoun references
    const pronouns = doc.match('#Pronoun').out('array');
    const sentences = text.split(/[.!?]+/);
    
    pronouns.forEach((pronoun, index) => {
      if (['it', 'this', 'that', 'they', 'them'].includes(pronoun.toLowerCase())) {
        const sentenceIndex = this.findSentenceContaining(text, pronoun);
        if (sentenceIndex >= 0) {
          const sentence = sentences[sentenceIndex];
          const nouns = nlp(sentence).match('#Noun').out('array');
          
          // If pronoun appears without clear antecedent
          if (nouns.length === 0 || nouns.length > 3) {
            const startIndex = text.indexOf(pronoun);
            suggestions.push({
              id: `semantic-${Date.now()}-${index}`,
              type: 'grammar',
              severity: 'warning',
              message: `Unclear pronoun reference: "${pronoun}" may be ambiguous`,
              originalText: pronoun,
              suggestedText: '[specify what this refers to]',
              startIndex,
              endIndex: startIndex + pronoun.length,
              explanation: 'This pronoun reference is unclear or ambiguous.'
            });
          }
        }
      }
    });
    
    return suggestions;
  }

  /**
   * Enhanced style consistency checking
   */
  private checkStyleConsistency(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Check for mixed number formats (1 vs one)
    const numberPattern = /\b(\d+)\b/g;
    const wordNumberPattern = /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi;
    
    const numberMatches = text.match(numberPattern) || [];
    const wordNumberMatches = text.match(wordNumberPattern) || [];
    
    if (numberMatches.length > 0 && wordNumberMatches.length > 0) {
      suggestions.push({
        id: `style-numbers-${Date.now()}`,
        type: 'style',
        severity: 'suggestion',
        message: 'Inconsistent number formatting detected',
        originalText: 'Mixed number formats',
        suggestedText: 'Use consistent number formatting',
        startIndex: 0,
        endIndex: text.length,
        explanation: 'Use either numeric (1, 2, 3) or written (one, two, three) format consistently.'
      });
    }
    
    // Check for mixed tenses
    const pastTenseVerbs = nlp(text).match('#PastTense').out('array');
    const presentTenseVerbs = nlp(text).match('#PresentTense').out('array');
    
    if (pastTenseVerbs.length > 0 && presentTenseVerbs.length > 0) {
      suggestions.push({
        id: `style-tense-${Date.now()}`,
        type: 'style',
        severity: 'suggestion',
        message: 'Mixed verb tenses detected',
        originalText: 'Mixed tenses',
        suggestedText: 'Use consistent verb tenses',
        startIndex: 0,
        endIndex: text.length,
        explanation: 'Maintain consistent verb tense throughout your writing.'
      });
    }
    
    return suggestions;
  }

  /**
   * Detects flow and coherence issues
   */
  private detectFlowIssues(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Check for repetitive sentence starts
    const sentenceStarts = sentences.map(s => s.trim().split(' ')[0].toLowerCase());
    const startCounts: { [key: string]: number } = {};
    
    sentenceStarts.forEach(start => {
      startCounts[start] = (startCounts[start] || 0) + 1;
    });
    
    Object.entries(startCounts).forEach(([start, count]) => {
      if (count > 2 && start.length > 2) {
        suggestions.push({
          id: `flow-repetitive-${Date.now()}-${start}`,
          type: 'style',
          severity: 'suggestion',
          message: `Repetitive sentence beginnings: "${start}" used ${count} times`,
          originalText: `Sentences starting with "${start}"`,
          suggestedText: 'Vary sentence beginnings',
          startIndex: 0,
          endIndex: text.length,
          explanation: 'Varying sentence beginnings improves flow and readability.'
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Detects clarity issues
   */
  private detectClarityIssues(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
         const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
     
     sentences.forEach((sentence: string, index: number) => {
       const words = sentence.trim().split(/\s+/);
      
      // Flag very long sentences (over 25 words)
      if (words.length > 25) {
        const startIndex = text.indexOf(sentence);
        suggestions.push({
          id: `clarity-long-${Date.now()}-${index}`,
          type: 'style',
          severity: 'suggestion',
          message: `Long sentence (${words.length} words) may be hard to follow`,
          originalText: sentence.trim(),
          suggestedText: 'Consider breaking into shorter sentences',
          startIndex,
          endIndex: startIndex + sentence.length,
          explanation: 'Shorter sentences are generally easier to read and understand.'
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Detects tone inconsistencies
   */
  private detectToneInconsistencies(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Check for mixed formality levels
    const formalWords = ['therefore', 'furthermore', 'consequently', 'nevertheless'];
    const informalWords = ["don't", "can't", "won't", 'gonna', 'wanna'];
    
    const hasFormal = formalWords.some(word => text.toLowerCase().includes(word));
    const hasInformal = informalWords.some(word => text.toLowerCase().includes(word));
    
    if (hasFormal && hasInformal) {
      suggestions.push({
        id: `tone-mixed-${Date.now()}`,
        type: 'style',
        severity: 'warning',
        message: 'Mixed formal and informal tone detected',
        originalText: 'Mixed tone',
        suggestedText: 'Use consistent tone throughout',
        startIndex: 0,
        endIndex: text.length,
        explanation: 'Maintain either formal or informal tone consistently.'
      });
    }
    
    return suggestions;
  }

  /**
   * Helper methods
   */
  private suggestCorrectHomophone(word: string, context: string): string {
    // Simple homophone correction logic
    const corrections: { [key: string]: string } = {
      'there': context.includes('car') || context.includes('house') ? 'their' : 'there',
      'their': context.includes('is') || context.includes('are') ? 'there' : 'their',
      'your': context.includes('welcome') || context.includes('right') ? "you're" : 'your'
    };
    
    return corrections[word] || word;
  }

  private findSentenceContaining(text: string, word: string): number {
    const sentences = text.split(/[.!?]+/);
    return sentences.findIndex(sentence => sentence.includes(word));
  }

  /**
   * Validates if a suggestion is appropriate
   */
  private isValidSuggestion(suggestion: any, text: string): boolean {
    return suggestion && 
           suggestion.originalText && 
           suggestion.suggestedText && 
           suggestion.originalText !== suggestion.suggestedText &&
           text.includes(suggestion.originalText);
  }

  /**
   * Enhances suggestions with additional metadata
   */
  private enhanceSuggestion(suggestion: any, analysisType: string): TextSuggestion {
    return {
      id: suggestion.id || `${analysisType}-${Date.now()}`,
      type: suggestion.type || 'grammar',
      severity: suggestion.severity || 'suggestion',
      message: suggestion.message || 'Improvement suggested',
      originalText: suggestion.originalText,
      suggestedText: suggestion.suggestedText,
      startIndex: suggestion.startIndex || 0,
      endIndex: suggestion.endIndex || suggestion.originalText.length,
      explanation: suggestion.explanation || 'This change will improve your writing.',
      alternatives: suggestion.alternatives
    };
  }

  /**
   * Filters vocabulary suggestions to ensure appropriateness
   */
  private isAppropriateVocabularySuggestion(suggestion: any, text: string): boolean {
    if (!suggestion.originalText || !suggestion.suggestedText) return false;
    
    const originalText = suggestion.originalText.toLowerCase();
    const suggestedText = suggestion.suggestedText.toLowerCase();
    
    // Filter out overly formal replacements for casual words
    const overlyFormalReplacements = {
      'want': ['aspire', 'desire', 'yearn', 'endeavor'],
      'write': ['author', 'compose', 'craft', 'pen'],
      'book': ['manuscript', 'tome', 'publication', 'literary work'],
      'good': ['exemplary', 'superlative', 'exceptional'],
      'big': ['substantial', 'considerable', 'significant'],
      'small': ['diminutive', 'minuscule', 'negligible']
    };
    
    for (const [casual, formal] of Object.entries(overlyFormalReplacements)) {
      if (originalText.includes(casual) && formal.some(f => suggestedText.includes(f))) {
        return false; // Skip overly formal suggestions
      }
    }
    
    return true;
  }

  /**
   * Advanced filtering and conflict resolution
   */
  private applyAdvancedFiltering(suggestions: TextSuggestion[], text: string): TextSuggestion[] {
    // Remove duplicates
    const uniqueSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    // Resolve conflicts
    const resolvedSuggestions = this.resolveConflictingSuggestions(uniqueSuggestions);
    
    // Sort by importance (errors first, then warnings, then suggestions)
    return resolvedSuggestions.sort((a, b) => {
      const severityOrder = { 'error': 0, 'warning': 1, 'suggestion': 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
}

export const textAnalysisService = new TextAnalysisService(); 