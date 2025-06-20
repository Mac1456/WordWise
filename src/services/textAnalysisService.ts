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
  overall: 'professional' | 'conversational' | 'formal' | 'casual' | 'passionate' | 'neutral';
  confidence: number;
  sincerity: number;
  engagement: number;
  recommendations: string[];
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

  async analyzeText(text: string, writingGoal?: string, includeTone?: boolean, analysisMode?: 'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment', wordLimit?: number): Promise<TextAnalysis> {
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
    
    // Try Firebase AI analysis first, fall back to rule-based if it fails
    try {
      if (text.trim().length > 20) {
        console.log(`Attempting Firebase AI analysis (mode: ${mode})...`);
        
        // Layer 1: Grammar & Clarity (Foundation)
        if (mode === 'comprehensive' || mode === 'grammar-only') {
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
          console.log(`Added ${aiSuggestions.length} grammar/clarity suggestions`);
        }
        
        // Layer 3: Conciseness & Sentence Structure
        if (mode === 'comprehensive' || mode === 'conciseness') {
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
            console.log(`Added ${concisenessSuggestions.length} conciseness suggestions`);
          } catch (error) {
            console.warn('Conciseness analysis failed:', error);
          }
        }
        
        // Layer 4: Vocabulary Enhancement
        if (mode === 'comprehensive' || mode === 'vocabulary') {
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
            console.log(`Added ${vocabularySuggestions.length} vocabulary suggestions`);
          } catch (error) {
            console.warn('Vocabulary analysis failed:', error);
          }
        }
        
        // Layer 6: Goal-Based Personalization
        if ((mode === 'comprehensive' || mode === 'goal-alignment') && writingGoal) {
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
            console.log(`Added ${goalSuggestions.length} goal-alignment suggestions`);
          } catch (error) {
            console.warn('Goal alignment analysis failed:', error);
          }
        }
      }
    } catch (error) {
      console.warn('OpenAI analysis failed, falling back to rule-based analysis:', error);
      
      // Fallback to rule-based analysis only if AI failed
      const grammarSuggestions = await this.checkGrammar(text);
      suggestions.push(...grammarSuggestions);

      const spellingSuggestions = await this.checkSpelling(text);
      suggestions.push(...spellingSuggestions);

      const styleSuggestions = await this.checkStyle(text, words, sentences);
      suggestions.push(...styleSuggestions);
    }

    // Remove redundant rule-based suggestions since AI analysis is comprehensive
    // Only add rule-based if AI analysis produced very few suggestions
    if (suggestions.length < 2) {
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
        const aiToneAnalysis = await firebaseAIService.analyzeTone(text);
        toneAnalysis = {
          overall: aiToneAnalysis.overall,
          confidence: aiToneAnalysis.confidence,
          sincerity: aiToneAnalysis.sincerity,
          engagement: aiToneAnalysis.engagement,
          recommendations: aiToneAnalysis.recommendations
        };
        console.log('Using AI tone analysis');
      } catch (error) {
        console.warn('AI tone analysis failed, using fallback:', error);
        toneAnalysis = await this.analyzeTone();
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
    
    if (!this.spellChecker) {
      return suggestions;
    }

    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    
    for (const word of words) {
      if (!this.spellChecker.check(word)) {
        const suggestedWords = this.spellChecker.suggest(word);
        const startIndex = text.indexOf(word);
        
        suggestions.push({
          id: `spelling-${word}-${startIndex}`,
          type: 'spelling',
          severity: 'error',
          message: `"${word}" may be misspelled`,
          originalText: word,
          suggestedText: suggestedWords[0] || word,
          startIndex,
          endIndex: startIndex + word.length,
          explanation: suggestedWords.length > 0 
            ? `Did you mean "${suggestedWords.slice(0, 3).join('", "')}"`
            : 'No suggestions available'
        });
      }
    }

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

  private async analyzeTone(): Promise<ToneAnalysis> {
    
    // This is a placeholder for more advanced tone analysis
    let confidence = 0;
    let sincerity = 0;
    let engagement = 0;
    
    // This is a placeholder for more advanced tone analysis
    let overall: ToneAnalysis['overall'] = 'neutral';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (confidence < 70) {
      recommendations.push('Your tone could be more confident. Try removing uncertain words like "maybe" or "perhaps".');
    }
    if (sincerity < 60) {
      recommendations.push('Include more passionate language about your interests and goals.');
    }
    
    return {
      overall,
      confidence,
      sincerity,
      engagement,
      recommendations,
    };
  }

  private removeDuplicateSuggestions(suggestions: TextSuggestion[]): TextSuggestion[] {
    const seen = new Set<string>();
    const unique: TextSuggestion[] = [];
  
    for (const suggestion of suggestions) {
      // Create a unique key based on text range and suggested replacement
      const key = `${suggestion.startIndex}-${suggestion.endIndex}-${suggestion.originalText}-${suggestion.suggestedText}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(suggestion);
      } else {
        console.log(`Removing duplicate suggestion: "${suggestion.originalText}" → "${suggestion.suggestedText}"`);
      }
    }
  
    return unique;
  }

  private resolveConflictingSuggestions(suggestions: TextSuggestion[]): TextSuggestion[] {
    if (suggestions.length <= 1) return suggestions;

    // First, remove exact duplicates (same text range and same suggested text)
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    if (deduplicatedSuggestions.length <= 1) return deduplicatedSuggestions;

    // Sort suggestions by start index to process them in order
    const sortedSuggestions = [...deduplicatedSuggestions].sort((a, b) => a.startIndex - b.startIndex);
    const resolvedSuggestions: TextSuggestion[] = [];

    for (const currentSuggestion of sortedSuggestions) {
      let hasConflict = false;

      // Check if this suggestion overlaps with any already resolved suggestion
      for (const resolvedSuggestion of resolvedSuggestions) {
        if (this.suggestionsOverlap(currentSuggestion, resolvedSuggestion)) {
          // Determine which suggestion to keep based on priority
          const keepCurrent = this.shouldKeepCurrentSuggestion(currentSuggestion, resolvedSuggestion);
          
          console.log(`Conflict detected: "${currentSuggestion.originalText}" (${currentSuggestion.type}) vs "${resolvedSuggestion.originalText}" (${resolvedSuggestion.type}), keeping: ${keepCurrent ? 'current' : 'existing'}`);
          
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

    // Sort by start index again for consistent ordering
    return resolvedSuggestions.sort((a, b) => a.startIndex - b.startIndex);
  }

  private suggestionsOverlap(suggestion1: TextSuggestion, suggestion2: TextSuggestion): boolean {
    // Check if the text ranges overlap
    return !(suggestion1.endIndex <= suggestion2.startIndex || suggestion2.endIndex <= suggestion1.startIndex);
  }

  private shouldKeepCurrentSuggestion(current: TextSuggestion, existing: TextSuggestion): boolean {
    // Priority order (higher number = higher priority):
    // 1. spelling errors (most specific)
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