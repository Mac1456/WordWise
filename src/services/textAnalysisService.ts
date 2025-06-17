import nlp from 'compromise';
import Typo from 'typo-js';
import { readabilityScore } from 'readability-score';

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
      this.spellChecker = new Typo('en_US');
      this.isInitialized = true;
    } catch (error) {
      console.warn('Spell checker initialization failed, using fallback:', error);
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

    // Grammar checking using compromise NLP
    const grammarSuggestions = await this.checkGrammar(text);
    suggestions.push(...grammarSuggestions);

    // Spell checking
    const spellingSuggestions = await this.checkSpelling(text);
    suggestions.push(...spellingSuggestions);

    // Style analysis
    const styleSuggestions = await this.checkStyle(text, words, sentences);
    suggestions.push(...styleSuggestions);

    // Vocabulary enhancement
    const vocabularySuggestions = await this.checkVocabulary(text, words);
    suggestions.push(...vocabularySuggestions);

    // Goal-aligned suggestions
    if (writingGoal) {
      const goalSuggestions = await this.checkGoalAlignment(text, writingGoal);
      suggestions.push(...goalSuggestions);
    }

    // Readability analysis
    const readability = this.calculateReadability(text);
    const complexWords = this.countComplexWords(words);

    // Tone analysis (optional)
    let toneAnalysis: ToneAnalysis | undefined;
    if (includeTone && text.trim().length > 50) {
      toneAnalysis = await this.analyzeTone(text);
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
        const subject = subjects[0].toLowerCase();
        const verb = verbs[0].toLowerCase();
        
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
    return words.filter(word => {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
      // Count syllables (rough approximation)
      const syllables = cleanWord.match(/[aeiouy]+/g)?.length || 1;
      return syllables >= 3;
    }).length;
  }

  private async checkVocabulary(text: string, words: string[]): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    
    // Common words that could be enhanced for college essays
    const vocabularyEnhancements = new Map([
      ['good', ['excellent', 'outstanding', 'remarkable', 'exceptional']],
      ['bad', ['inadequate', 'ineffective', 'problematic', 'concerning']],
      ['big', ['significant', 'substantial', 'considerable', 'extensive']],
      ['small', ['minimal', 'limited', 'modest', 'precise']],
      ['important', ['crucial', 'vital', 'essential', 'pivotal']],
      ['help', ['assist', 'support', 'facilitate', 'contribute']],
      ['show', ['demonstrate', 'illustrate', 'reveal', 'exhibit']],
      ['make', ['create', 'establish', 'develop', 'generate']],
      ['get', ['obtain', 'acquire', 'achieve', 'secure']],
      ['think', ['believe', 'consider', 'analyze', 'reflect']],
      ['use', ['utilize', 'employ', 'implement', 'apply']],
      ['say', ['state', 'express', 'articulate', 'convey']],
      ['go', ['proceed', 'advance', 'progress', 'continue']],
      ['see', ['observe', 'recognize', 'identify', 'perceive']],
      ['really', ['genuinely', 'truly', 'authentically', 'significantly']],
      ['very', ['extremely', 'particularly', 'remarkably', 'notably']]
    ]);

    for (const [basicWord, alternatives] of vocabularyEnhancements) {
      const regex = new RegExp(`\\b${basicWord}\\b`, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        suggestions.push({
          id: `vocab-${basicWord}-${match.index}`,
          type: 'vocabulary',
          severity: 'suggestion',
          message: `Consider a stronger word than "${match[0]}"`,
          originalText: match[0],
          suggestedText: alternatives[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          explanation: `"${match[0]}" is common in casual writing. For college essays, consider more sophisticated alternatives.`,
          alternatives
        });
      }
    }

    return suggestions;
  }

  private async checkGoalAlignment(text: string, writingGoal: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    
    if (writingGoal === 'personal-statement') {
      const doc = nlp(text);
      const sentences = doc.sentences().out('array');
      
      // Check for leadership indicators
      const leadershipKeywords = ['led', 'organized', 'managed', 'initiated', 'coordinated', 'supervised', 'founded'];
      const hasLeadership = leadershipKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      // Check for resilience indicators
      const resilienceKeywords = ['overcame', 'challenged', 'persevered', 'adapted', 'struggled', 'learned', 'grew'];
      const hasResilience = resilienceKeywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      );
      
      if (!hasLeadership && text.length > 200) {
        suggestions.push({
          id: 'goal-leadership',
          type: 'goal-alignment',
          severity: 'suggestion',
          message: 'Consider adding examples of leadership',
          originalText: text.substring(0, 50) + '...',
          suggestedText: text.substring(0, 50) + '...',
          startIndex: 0,
          endIndex: 50,
          explanation: 'Personal statements benefit from specific examples of leadership roles or initiatives you\'ve taken.'
        });
      }
      
      if (!hasResilience && text.length > 200) {
        suggestions.push({
          id: 'goal-resilience',
          type: 'goal-alignment',
          severity: 'suggestion',
          message: 'Consider sharing a story of overcoming challenges',
          originalText: text.substring(0, 50) + '...',
          suggestedText: text.substring(0, 50) + '...',
          startIndex: 0,
          endIndex: 50,
          explanation: 'Colleges value resilience. Consider including how you\'ve grown from facing difficulties.'
        });
      }

      // Check for specific examples vs general statements
      const hasSpecificNumbers = /\d+/.test(text);
      if (!hasSpecificNumbers && text.length > 200) {
        suggestions.push({
          id: 'goal-specificity',
          type: 'goal-alignment',
          severity: 'suggestion',
          message: 'Add specific numbers or details',
          originalText: text.substring(0, 50) + '...',
          suggestedText: text.substring(0, 50) + '...',
          startIndex: 0,
          endIndex: 50,
          explanation: 'Include specific details like "200 volunteers" or "3 years" to make your experiences more concrete.'
        });
      }
    }

    return suggestions;
  }

  private async analyzeTone(text: string): Promise<ToneAnalysis> {
    const doc = nlp(text);
    const words = text.toLowerCase().split(/\s+/);
    
    // Analyze emotional indicators
    const positiveWords = ['passionate', 'excited', 'love', 'enjoy', 'thrive', 'eager', 'motivated'];
    const formalWords = ['furthermore', 'consequently', 'therefore', 'moreover', 'however'];
    const personalWords = ['i', 'my', 'me', 'myself', 'personally'];
    const uncertainWords = ['maybe', 'perhaps', 'possibly', 'might', 'probably'];
    
    const positiveCount = words.filter(word => positiveWords.includes(word)).length;
    const formalCount = words.filter(word => formalWords.includes(word)).length;
    const personalCount = words.filter(word => personalWords.includes(word)).length;
    const uncertainCount = words.filter(word => uncertainWords.includes(word)).length;
    
    const totalWords = words.length;
    
    // Calculate tone metrics
    const confidence = Math.max(0, Math.min(100, 80 - (uncertainCount / totalWords) * 500));
    const sincerity = Math.min(100, (personalCount / totalWords) * 300 + (positiveCount / totalWords) * 200);
    const engagement = Math.min(100, (positiveCount / totalWords) * 400 + 50);
    
    // Determine overall tone
    let overall: ToneAnalysis['overall'] = 'neutral';
    if (formalCount > totalWords * 0.02) overall = 'formal';
    else if (positiveCount > totalWords * 0.03) overall = 'passionate';
    else if (personalCount > totalWords * 0.05) overall = 'conversational';
    else overall = 'professional';
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (confidence < 60) {
      recommendations.push('Reduce uncertain language like "maybe" and "perhaps" to sound more confident.');
    }
    if (sincerity < 50) {
      recommendations.push('Add more personal experiences and emotions to increase sincerity.');
    }
    if (engagement < 60) {
      recommendations.push('Include more passionate language about your interests and goals.');
    }
    if (personalCount < totalWords * 0.03) {
      recommendations.push('Use more first-person storytelling to make your essay more personal.');
    }
    
    return {
      overall,
      confidence: Math.round(confidence),
      sincerity: Math.round(sincerity),
      engagement: Math.round(engagement),
      recommendations
    };
  }
}

export const textAnalysisService = new TextAnalysisService(); 