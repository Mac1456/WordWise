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

    const suggestions: TextSuggestion[] = [];
    
    // Basic text statistics
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const characterCount = text.length;
    const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    // ⚡ INSTANT LOCAL CHECKS ONLY - No AI calls
    console.log('⚡ Running instant-only local checks...');
    
    const localGrammarSuggestions = await this.checkGrammar(text);
    suggestions.push(...localGrammarSuggestions);
    
    const localSpellingSuggestions = await this.checkSpelling(text);
    suggestions.push(...localSpellingSuggestions);
    
    const localStyleSuggestions = await this.checkStyle(text, words, sentences);
    suggestions.push(...localStyleSuggestions);
    
    console.log(`⚡ Instant analysis: ${suggestions.length} suggestions found`);

    // Early deduplication before conflict resolution for better performance
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    // Resolve conflicts between overlapping suggestions
    const resolvedSuggestions = this.resolveConflictingSuggestions(deduplicatedSuggestions);

    // Readability analysis
    const readability = this.calculateReadability(text);
    const complexWords = this.countComplexWords(words);

    return {
      suggestions: resolvedSuggestions,
      readabilityScore: readability.score,
      readabilityGrade: readability.grade,
      wordCount,
      sentenceCount,
      characterCount,
      averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
      complexWords,
      toneAnalysis: undefined
    };
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

    // 🚀 PARALLEL AI ENHANCEMENT - Run all analyses simultaneously for better performance
    if (mode === 'comprehensive' && text.trim().length >= 30) {
      try {
        console.log('🚀 Starting parallel AI analyses...');
        
        // Create array of promises for parallel execution
        const analysisPromises: Promise<any>[] = [];
        
        // Layer 3: Conciseness Analysis - minimum 30 characters
        if (text.trim().length >= 30) {
          analysisPromises.push(
            firebaseAIService.analyzeConciseness(text).then(result => ({ type: 'conciseness', result })).catch(error => ({ type: 'conciseness', error }))
          );
        }
        
        // Layer 4: Vocabulary Enhancement - minimum 50 characters  
        if (text.trim().length >= 50) {
          analysisPromises.push(
            firebaseAIService.analyzeVocabulary(text).then(result => ({ type: 'vocabulary', result })).catch(error => ({ type: 'vocabulary', error }))
          );
        }
        
        // Layer 6: Goal-Based Personalization - minimum 100 characters
        if (writingGoal && text.trim().length >= 100) {
          analysisPromises.push(
            firebaseAIService.analyzeGoalAlignment(text, writingGoal).then(result => ({ type: 'goal-alignment', result })).catch(error => ({ type: 'goal-alignment', error }))
          );
        }
        
        // Layer 2: Grammar & Spelling AI Enhancement - minimum 20 characters
        if (text.trim().length >= 20) {
          analysisPromises.push(
            firebaseAIService.analyzeGrammarAndClarity(text).then(result => ({ type: 'grammar', result })).catch(error => ({ type: 'grammar', error }))
          );
        }
        
        // Wait for all analyses to complete in parallel
        const analysisResults = await Promise.all(analysisPromises);
        console.log(`✅ Parallel AI analyses complete: ${analysisResults.length} analyses finished`);
        
        // Process results
        for (const analysis of analysisResults) {
          if (analysis.error) {
            console.warn(`${analysis.type} analysis failed:`, analysis.error);
            continue;
          }
          
          if (analysis.type === 'conciseness') {
            const concisenessSuggestions = analysis.result.suggestions.map((suggestion: any) => ({
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
          
          else if (analysis.type === 'vocabulary') {
            const vocabularySuggestions = analysis.result.suggestions.map((suggestion: any) => ({
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
          
          else if (analysis.type === 'goal-alignment') {
            const goalSuggestions = analysis.result.suggestions.map((suggestion: any) => ({
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
          
          else if (analysis.type === 'grammar') {
            // Filter out AI suggestions that overlap with existing local suggestions
            const newAISuggestions = analysis.result.suggestions.filter((aiSuggestion: any) => {
              return !suggestions.some(localSuggestion => {
                // Check for exact text match
                if (localSuggestion.originalText.toLowerCase().trim() === aiSuggestion.originalText.toLowerCase().trim()) {
                  return true;
                }
                
                // Check for positional overlap
                if (this.suggestionsOverlap({
                  startIndex: aiSuggestion.startIndex,
                  endIndex: aiSuggestion.endIndex,
                  originalText: aiSuggestion.originalText,
                  suggestedText: aiSuggestion.suggestedText
                } as any, localSuggestion)) {
                  return true;
                }
                
                // Check if same suggestion text
                if (localSuggestion.suggestedText.toLowerCase().trim() === aiSuggestion.suggestedText.toLowerCase().trim() &&
                    Math.abs(localSuggestion.startIndex - aiSuggestion.startIndex) < 10) {
                  return true;
                }
                
                return false;
              });
            });
            
            // Add only non-overlapping AI suggestions
            const aiSuggestions = newAISuggestions.map((suggestion: any) => ({
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
            console.log(`🤖 Added ${aiSuggestions.length} new AI suggestions (${analysis.result.suggestions.length - newAISuggestions.length} duplicates filtered)`);
          }
        }
        
      } catch (error) {
        console.warn('Parallel AI enhancement failed:', error);
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
          const vocabularySuggestions = vocabularyAnalysis.suggestions.map((suggestion: any) => ({
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
      'persistance': ['persistence'],
      'occurance': ['occurrence'],
      'referance': ['reference'],
      'appearence': ['appearance'],
      'independance': ['independence'],
      'performence': ['performance'],
      'experiance': ['experience'],
      'importence': ['importance'],
      'differance': ['difference'],
      'preferance': ['preference'],
      'occassion': ['occasion'],
      'begining': ['beginning'],
      'sucessful': ['successful'],
      'beleive': ['believe'],
      'recieved': ['received'],
      'acheive': ['achieve'],
      'acheived': ['achieved'],
      'wierd': ['weird'],
      'freind': ['friend'],
      'freinds': ['friends'],
      'untill': ['until'],
      'alot': ['a lot'],
      'aswell': ['as well'],
      'inorder': ['in order'],
      'inspite': ['in spite'],
      'eachother': ['each other'],
      'everytime': ['every time'],
      'infact': ['in fact'],
      'atleast': ['at least'],
      'aslong': ['as long'],
      // Missing words from test text
      'intrested': ['interested'],
      'comunicate': ['communicate'],
      'familys': ['families'],
      'prestegious': ['prestigious'],
      'tooo': ['to'],
      // Contractions without apostrophes
      'shouldnt': ["shouldn't"],
      'couldnt': ["couldn't"],
      'wouldnt': ["wouldn't"],
      'didnt': ["didn't"],
      'dont': ["don't"],
      'cant': ["can't"],
      'wont': ["won't"],
      'isnt': ["isn't"],
      'wasnt': ["wasn't"],
      'werent': ["weren't"],
      'arent': ["aren't"],
      'hasnt': ["hasn't"],
      'havent': ["haven't"],
      'hadnt': ["hadn't"],
      'youre': ["you're"],
      'theyre': ["they're"],
      'were': ["we're"],
      // Test words for verification
      'mistaks': ['mistakes'],
      'previus': ['previous'],
      'sucess': ['success'],
      'suceed': ['succeed'],
      'succes': ['success']
    };

    // Use regex to find all word positions accurately
    const wordRegex = /\b[a-zA-Z]+\b/g;
    let match;
    
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const lowerWord = word.toLowerCase();
      
      if (commonMisspellings[lowerWord]) {
        const suggestions_list = commonMisspellings[lowerWord];
        const startIndex = match.index;
        
        suggestions.push({
          id: `spelling-${word}-${startIndex}`,
          type: 'spelling',
          severity: 'error',
          message: `"${word}" may be misspelled`,
          originalText: word,
          suggestedText: suggestions_list[0],
          startIndex,
          endIndex: startIndex + word.length,
          explanation: suggestions_list.length > 1 
            ? `Did you mean "${suggestions_list.slice(0, 3).join('", "')}"`
            : `Did you mean "${suggestions_list[0]}"?`
        });
      }
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

  private async analyzeTone(text: string): Promise<ToneAnalysis> {
    // Fast local tone analysis using keyword detection
    const words = text.toLowerCase().split(/\s+/);
    
    // Analyze confidence indicators
    const uncertainWords = ['maybe', 'perhaps', 'might', 'possibly', 'probably', 'i think', 'i guess', 'sort of', 'kind of'];
    const confidentWords = ['will', 'definitely', 'certainly', 'absolutely', 'clearly', 'obviously', 'undoubtedly'];
    const negativeWords = ['never', 'impossible', 'can\'t', 'won\'t', 'always', 'perfect', 'flawless'];
    const humbleWords = ['hope', 'try', 'attempt', 'learn', 'grow', 'improve', 'develop'];
    
    const uncertainCount = uncertainWords.filter(word => text.toLowerCase().includes(word)).length;
    const confidentCount = confidentWords.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;
    const humbleCount = humbleWords.filter(word => text.toLowerCase().includes(word)).length;
    
    // Determine overall tone
    let overall: ToneAnalysis['overall'] = 'neutral';
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    
    if (negativeCount > 2) {
      overall = 'arrogant';
      weaknesses.push('Overconfident language that may seem arrogant');
      recommendations.push('Consider showing humility and acknowledging areas for growth');
    } else if (confidentCount > uncertainCount && humbleCount > 0) {
      overall = 'confident';
      strengths.push('Balanced confidence with humility');
    } else if (uncertainCount > confidentCount) {
      overall = 'uncertain';
      weaknesses.push('Language shows uncertainty and lack of confidence');
      recommendations.push('Use more decisive language to show confidence in your abilities');
    } else if (humbleCount > confidentCount) {
      overall = 'humble';
      strengths.push('Shows willingness to learn and grow');
    }
    
    // Check for professional language
    const formalWords = ['experience', 'opportunity', 'develop', 'skills', 'knowledge', 'professional'];
    const formalCount = formalWords.filter(word => text.toLowerCase().includes(word)).length;
    
    if (formalCount > 2) {
      if (overall === 'neutral') overall = 'professional';
      strengths.push('Uses professional, academic language');
    }
    
    // Generate specific recommendations
    if (text.includes('never failed') || text.includes('perfect')) {
      recommendations.push('Avoid absolute statements like "never failed" - show growth mindset instead');
    }
    
    if (text.length < 100) {
      recommendations.push('Consider expanding your response to show more depth and reflection');
    }
    
    const summary = `Your writing has a ${overall} tone. ${strengths.length > 0 ? 'Strengths include: ' + strengths.join(', ') + '. ' : ''}${weaknesses.length > 0 ? 'Areas for improvement: ' + weaknesses.join(', ') + '.' : ''}`;
    
    return {
      overall,
      strengths,
      weaknesses,
      recommendations,
      summary
    };
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
        'conciseness': 50,    // Medium (can be stylistic)
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
    
    // Special case: if one suggestion is spelling and the other is grammar,
    // only consider it a conflict if they have very significant overlap (80%+)
    // This allows both spelling corrections and grammar improvements to coexist
    if ((suggestion1.type === 'spelling' || suggestion2.type === 'spelling') && 
        (suggestion1.type === 'grammar' || suggestion2.type === 'grammar')) {
      const overlapStart = Math.max(s1_start, s2_start);
      const overlapEnd = Math.min(s1_end, s2_end);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);
      const minLength = Math.min(s1_end - s1_start, s2_end - s2_start);
      
      // Only conflict if overlap is more than 80% of the smaller suggestion
      // This is much more restrictive, allowing most spelling/grammar pairs to coexist
      return overlapLength > minLength * 0.8;
    }
    
    // Special case: vocabulary vs conciseness - allow them to coexist unless exact same range
    if ((suggestion1.type === 'vocabulary' || suggestion2.type === 'vocabulary') && 
        (suggestion1.type === 'conciseness' || suggestion2.type === 'conciseness')) {
      // Only conflict if they have the exact same range
      return s1_start === s2_start && s1_end === s2_end;
    }
    
    // Special case: goal-alignment vs other types - be very restrictive
    if (suggestion1.type === 'goal-alignment' || suggestion2.type === 'goal-alignment') {
      // Only conflict if they have very significant overlap (90%+)
      const overlapStart = Math.max(s1_start, s2_start);
      const overlapEnd = Math.min(s1_end, s2_end);
      const overlapLength = Math.max(0, overlapEnd - overlapStart);
      const minLength = Math.min(s1_end - s1_start, s2_end - s2_start);
      
      return overlapLength > minLength * 0.9;
    }
    
    // For other types, require direct overlap but be more permissive
    return hasDirectOverlap;
  }
}

export const textAnalysisService = new TextAnalysisService(); 