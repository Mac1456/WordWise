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

    // 🤖 PHASE 2: AI ENHANCEMENT (Only for advanced features, runs in background)
    // AI enhances local checks with better explanations and advanced suggestions
    try {
      if (text.trim().length > 20) {
        console.log(`🤖 Enhancing with AI analysis (mode: ${mode})...`);
        
        // Layer 3: Conciseness & Sentence Structure - minimum 50 characters
        if ((mode === 'comprehensive' || mode === 'conciseness') && text.trim().length >= 50) {
          try {
            const concisenessAnalysis = await firebaseAIService.analyzeConciseness(text, wordLimit);
            
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
          } catch (error) {
            console.warn('Conciseness analysis failed:', error);
          }
        }
        
        // Layer 4: Vocabulary Enhancement - minimum 50 characters
        if ((mode === 'comprehensive' || mode === 'vocabulary') && text.trim().length >= 50) {
          try {
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
          } catch (error) {
            console.warn('Vocabulary analysis failed:', error);
          }
        }
        
        // Layer 6: Goal-Based Personalization - minimum 100 characters
        if ((mode === 'comprehensive' || mode === 'goal-alignment') && writingGoal && text.trim().length >= 100) {
          try {
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
          } catch (error) {
            console.warn('Goal alignment analysis failed:', error);
          }
        }

        // 🎯 AI ENHANCEMENT for Grammar & Spelling (only add NEW suggestions)
        if ((mode === 'comprehensive' || mode === 'grammar-only') && text.trim().length >= 20) {
          try {
            const aiAnalysis = await firebaseAIService.analyzeGrammarAndClarity(text);
            
            // Filter out AI suggestions that overlap with existing local suggestions
            const newAISuggestions = aiAnalysis.suggestions.filter((aiSuggestion: any) => {
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
            
            // Add only non-overlapping AI suggestions (seamless integration)
            const aiSuggestions = newAISuggestions.map((suggestion: any) => ({
              id: `ai-grammar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: suggestion.type as 'grammar' | 'spelling' | 'style' | 'vocabulary' | 'goal-alignment',
              severity: suggestion.severity as 'error' | 'warning' | 'suggestion',
              message: suggestion.message, // No "AI Enhanced" label
              originalText: suggestion.originalText,
              suggestedText: suggestion.suggestedText,
              startIndex: suggestion.startIndex,
              endIndex: suggestion.endIndex,
              explanation: suggestion.explanation, // No emoji prefix
              alternatives: undefined
            }));
            
            suggestions.push(...aiSuggestions);
            console.log(`🤖 Added ${aiSuggestions.length} new AI suggestions (${aiAnalysis.suggestions.length - newAISuggestions.length} duplicates filtered)`);
          } catch (error) {
            console.warn('AI grammar enhancement failed:', error);
          }
        }
      }
    } catch (error) {
      console.warn('AI enhancement failed, using local analysis only:', error);
    }

    // Add remaining local checks for comprehensive mode
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
      const subjects = clauseDoc.nouns().out('array'); // Use nouns instead of subjects
      const verbs = clauseDoc.verbs().out('array');

      if (subjects.length > 0 && verbs.length > 0) {
        // Simple subject-verb agreement check
        
        // Check for common disagreement patterns - simplified logic
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
      'its': ["it's"], // Context dependent
      'your': ["you're"], // Context dependent
      'there': ["their", "they're"], // Context dependent
      'to': ["too", "two"], // Context dependent
      'then': ["than"], // Context dependent
      'affect': ["effect"], // Context dependent
      'loose': ["lose"], // Context dependent
      'breath': ["breathe"], // Context dependent
      'advise': ["advice"], // Context dependent
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

    // Check for sentence variety
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
    const similarLengths = sentenceLengths.filter(len => Math.abs(len - avgLength) < 2).length;
    
    if (similarLengths > sentenceLengths.length * 0.7) {
      suggestions.push({
        id: 'style-sentence-variety',
        type: 'style',
        severity: 'suggestion',
        message: 'Consider varying sentence length',
        originalText: text.substring(0, 50) + '...',
        suggestedText: text.substring(0, 50) + '...',
        startIndex: 0,
        endIndex: 50,
        explanation: 'Mix short and long sentences to improve readability and flow.'
      });
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
      
      if (personalPronouns.length < 3) {
        suggestions.push({
          id: 'goal-personal-pronouns',
          type: 'goal-alignment',
          severity: 'suggestion',
          message: 'Consider using more personal pronouns',
          originalText: text.substring(0, 50) + '...',
          suggestedText: text.substring(0, 50) + '...',
          startIndex: 0,
          endIndex: 50,
          explanation: 'Personal statements are stronger when they highlight specific experiences and contributions.'
        });
      }

      const achievementWords = ['achieved', 'accomplished', 'led', 'created', 'developed'];
      const achievements = doc.match(`(${achievementWords.join('|')})`).out('array');

      if (achievements.length < 1) {
        suggestions.push({
          id: 'goal-achievements',
          type: 'goal-alignment',
          severity: 'suggestion',
          message: 'Consider highlighting specific achievements',
          originalText: text.substring(0, 50) + '...',
          suggestedText: text.substring(0, 50) + '...',
          startIndex: 0,
          endIndex: 50,
          explanation: 'Personal statements are stronger when they highlight specific achievements and contributions.'
        });
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

    // First, remove exact duplicates (same text range and same suggested text)
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    if (deduplicatedSuggestions.length <= 1) return deduplicatedSuggestions;

    // Sort suggestions by start index to process them in order
    const sortedSuggestions = [...deduplicatedSuggestions].sort((a, b) => a.startIndex - b.startIndex);
    const resolvedSuggestions: TextSuggestion[] = [];
    let conflictCount = 0;

    for (const currentSuggestion of sortedSuggestions) {
      let hasConflict = false;

      // Check if this suggestion truly conflicts with any already resolved suggestion
      for (const resolvedSuggestion of resolvedSuggestions) {
        if (this.suggestionsOverlap(currentSuggestion, resolvedSuggestion)) {
          conflictCount++;
          // For exact duplicates, keep the higher priority one
          const keepCurrent = this.shouldKeepCurrentSuggestion(currentSuggestion, resolvedSuggestion);
          
          console.log(`⚠️ Conflict #${conflictCount}: "${currentSuggestion.originalText}" (${currentSuggestion.type}) vs "${resolvedSuggestion.originalText}" (${resolvedSuggestion.type}), keeping: ${keepCurrent ? 'current' : 'existing'}`);
          
          if (keepCurrent) {
            // Remove the conflicting resolved suggestion and add current one
            const index = resolvedSuggestions.indexOf(resolvedSuggestion);
            resolvedSuggestions.splice(index, 1);
            resolvedSuggestions.push(currentSuggestion);
          }
          
          hasConflict = true;
          break;
        }
      }

      // If no conflict, add the suggestion
      if (!hasConflict) {
        resolvedSuggestions.push(currentSuggestion);
      }
    }

    if (conflictCount > 0) {
      console.log(`🔧 Conflict resolution: ${sortedSuggestions.length} → ${resolvedSuggestions.length} suggestions (${conflictCount} conflicts resolved)`);
    }

    // Sort by start index again for consistent ordering
    return resolvedSuggestions.sort((a, b) => a.startIndex - b.startIndex);
  }

  private suggestionsOverlap(suggestion1: TextSuggestion, suggestion2: TextSuggestion): boolean {
    // Only consider true conflicts - exact same text range and same replacement
    const exactSameRange = suggestion1.startIndex === suggestion2.startIndex && suggestion1.endIndex === suggestion2.endIndex;
    const sameOriginalText = suggestion1.originalText.toLowerCase().trim() === suggestion2.originalText.toLowerCase().trim();
    
    // Only treat as overlap if it's the exact same text being replaced
    // This allows word-level (spelling) and sentence-level (grammar) suggestions to coexist
    return exactSameRange && sameOriginalText;
  }

  private shouldKeepCurrentSuggestion(current: TextSuggestion, existing: TextSuggestion): boolean {
    // Priority order (higher number = higher priority):
    // 1. spelling errors (most specific and critical)
    // 2. grammar errors  
    // 3. style suggestions
    // 4. vocabulary suggestions
    // 5. conciseness suggestions
    // 6. goal-alignment suggestions (most general)
    
    const getPriority = (suggestion: TextSuggestion): number => {
      switch (suggestion.type) {
        case 'spelling': return 6;
        case 'grammar': return 5;
        case 'style': return 4;
        case 'vocabulary': return 3;
        case 'conciseness': return 2;
        case 'goal-alignment': return 1;
        default: return 0;
      }
    };

    const currentPriority = getPriority(current);
    const existingPriority = getPriority(existing);

    // If priorities are different, keep the higher priority suggestion
    if (currentPriority !== existingPriority) {
      return currentPriority > existingPriority;
    }

    // If same priority, prefer error severity over warning/suggestion
    if (current.severity !== existing.severity) {
      const severityOrder = { 'error': 3, 'warning': 2, 'suggestion': 1 };
      return severityOrder[current.severity] > severityOrder[existing.severity];
    }

    // If same type and severity, keep the first one (existing)
    return false;
  }
}

export const textAnalysisService = new TextAnalysisService(); 