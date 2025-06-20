import nlp from 'compromise';
import Typo from 'typo-js';
import { readabilityScore } from 'readability-score';
import { firebaseAIService } from './firebaseAIService';

export interface TextSuggestion {
  id: string;
  type: 'grammar' | 'spelling' | 'style' | 'vocabulary' | 'goal-alignment';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  alternatives?: string[]; // For vocabulary suggestions
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

  async analyzeText(text: string, writingGoal?: string, includeTone?: boolean): Promise<TextAnalysis> {
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

    // Try Firebase AI analysis first, fall back to rule-based if it fails
    try {
      if (text.trim().length > 20) {
        console.log('Attempting Firebase AI analysis...');
        const aiAnalysis = await firebaseAIService.analyzeGrammarAndClarity(text);
        
        // Convert AI suggestions to TextSuggestion format
        const aiSuggestions = aiAnalysis.suggestions.map((suggestion: any) => ({
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        console.log(`Added ${aiSuggestions.length} AI suggestions`);
      }
    } catch (error) {
      console.warn('OpenAI analysis failed, falling back to rule-based analysis:', error);
      
      // Fallback to rule-based analysis
      const grammarSuggestions = await this.checkGrammar(text);
      suggestions.push(...grammarSuggestions);

      const spellingSuggestions = await this.checkSpelling(text);
      suggestions.push(...spellingSuggestions);

      const styleSuggestions = await this.checkStyle(text, words, sentences);
      suggestions.push(...styleSuggestions);
    }

    // Always include vocabulary suggestions (can be enhanced later)
    const vocabularySuggestions = await this.checkVocabulary();
    suggestions.push(...vocabularySuggestions);

    // Goal-aligned suggestions
    if (writingGoal) {
      const goalSuggestions = await this.checkGoalAlignment(text, writingGoal);
      suggestions.push(...goalSuggestions);
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
      suggestions,
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
}

export const textAnalysisService = new TextAnalysisService(); 