import nlp from 'compromise';
import Typo from 'typo-js';
import { readabilityScore } from 'readability-score';
import { firebaseAIService } from './firebaseAIService';

export interface TextSuggestion {
  id: string;
  type: 'grammar' | 'spelling' | 'punctuation' | 'clarity' | 'style' | 'vocabulary' | 'goal-alignment' | 'conciseness';
  severity: 'error' | 'warning' | 'suggestion';
  message: string;
  originalText: string;
  suggestedText: string;
  startIndex: number;
  endIndex: number;
  explanation: string;
  confidence: number;
  alternatives?: string[]; // For vocabulary suggestions
  wordsSaved?: number; // For conciseness suggestions
  aiValidated?: boolean; // NEW: Indicates if suggestion was validated by AI
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
  private isInitialized = false;
  private suggestionCache = new Map<string, boolean>(); // Cache for AI validation results

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize spell checker with English dictionary
      // Skip initialization in browser environment where it's not needed
      if (typeof window !== 'undefined') {
        console.log('Skipping Typo.js initialization in browser (using AI instead)');
      }
      this.isInitialized = true;
    } catch (error) {
      console.warn('Spell checker initialization failed, using AI fallback:', error);
    }
  }

  /**
   * 🤖 AI VALIDATION: Check if a suggestion is actually correct
   * This prevents false positives and improves suggestion quality
   */
  private async validateSuggestionWithAI(suggestion: TextSuggestion, fullText: string): Promise<boolean> {
    // Create a cache key for this suggestion
    const cacheKey = `${suggestion.originalText}->${suggestion.suggestedText}:${suggestion.type}`;
    
    // Check cache first
    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey)!;
    }

    try {
      // Use AI to validate the suggestion
      const validationPrompt = `Please validate this writing suggestion:

Original text: "${suggestion.originalText}"
Suggested text: "${suggestion.suggestedText}"
Suggestion type: ${suggestion.type}
Context: "${this.getContextAroundSuggestion(fullText, suggestion)}"

Is this suggestion correct and helpful? Respond with only "YES" or "NO" followed by a brief reason.`;

      const result = await firebaseAIService.analyzeWithCustomPrompt(validationPrompt, fullText);
      
      // Parse the AI response
      const aiResponse = result.suggestions[0]?.explanation || '';
      const isValid = aiResponse.toLowerCase().startsWith('yes');
      
      // Cache the result
      this.suggestionCache.set(cacheKey, isValid);
      
      console.log(`🤖 AI Validation: ${suggestion.originalText} -> ${suggestion.suggestedText}: ${isValid ? 'VALID' : 'INVALID'}`);
      
      return isValid;
    } catch (error) {
      console.warn('AI validation failed, defaulting to accept suggestion:', error);
      // If AI validation fails, we'll be conservative and accept the suggestion
      // but mark it with lower confidence
      return true;
    }
  }

  /**
   * Get context around a suggestion for better AI validation
   */
  private getContextAroundSuggestion(fullText: string, suggestion: TextSuggestion): string {
    const contextRadius = 50; // characters before and after
    const start = Math.max(0, suggestion.startIndex - contextRadius);
    const end = Math.min(fullText.length, suggestion.endIndex + contextRadius);
    return fullText.substring(start, end);
  }

  /**
   * 🎯 CONTEXT-BASED ERROR DETECTION
   * Advanced local checking for homophones, grammar, and context-dependent errors
   * This works entirely locally without AI dependencies
   */
  private checkContextBasedErrors(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Convert to lowercase for analysis, but preserve original case for replacements
    const lowerText = text.toLowerCase();
    const words = text.split(/(\s+|[^\w']+)/).filter(word => word.trim().length > 0);
    
    // 🎯 CONTEXT-DEPENDENT HOMOPHONES
    suggestions.push(...this.checkContextualHomophones(text, lowerText));
    
    // 🎯 SUBJECT-VERB AGREEMENT
    suggestions.push(...this.checkSubjectVerbAgreement(text));
    
    // 🎯 POSSESSIVE VS PLURAL ERRORS
    suggestions.push(...this.checkPossessiveErrors(text));
    
    // 🎯 ARTICLE USAGE (a/an)
    suggestions.push(...this.checkArticleUsage(text));
    
    // 🎯 PREPOSITION ERRORS
    suggestions.push(...this.checkPrepositionErrors(text));
    
    return suggestions;
  }

  /**
   * Check context-dependent homophones like there/their/they're, your/you're, etc.
   */
  private checkContextualHomophones(text: string, lowerText: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Define homophone patterns with context rules
    const homophoneRules = [
      // THERE vs THEIR vs THEY'RE
      {
        word: 'there',
        patterns: [
          { 
            context: /\bthere\s+(is|are|was|were|will|would|should|could|might)\b/g,
            correct: true,
            explanation: '"There" is correct when indicating existence or location'
          },
          { 
            context: /\b(go|over|right|back|up|down|out)\s+there\b/g,
            correct: true,
            explanation: '"There" is correct when indicating location'
          },
          { 
            context: /\bthere\s+(car|house|book|dog|cat|family|parents|children|friends|job|work|school|college|university|home|room|desk|computer|phone|money|time|life|future|dreams|goals|plans|ideas|thoughts|feelings|emotions|experiences|memories|stories|problems|issues|challenges|opportunities|skills|talents|abilities|knowledge|education|learning|studying|reading|writing|speaking|listening|thinking|understanding|believing|hoping|wishing|wanting|needing|loving|caring|helping|supporting|encouraging|inspiring|motivating|teaching|training|coaching|mentoring|guiding|leading|following|working|playing|exercising|running|walking|swimming|dancing|singing|cooking|eating|sleeping|resting|relaxing|traveling|exploring|discovering|creating|building|making|designing|planning|organizing|managing|controlling|directing|supervising|monitoring|evaluating|analyzing|researching|investigating|studying|learning|practicing|improving|developing|growing|changing|evolving|adapting|adjusting|modifying|updating|upgrading|enhancing|optimizing|maximizing|minimizing|reducing|increasing|expanding|extending|stretching|reaching|achieving|accomplishing|succeeding|winning|gaining|earning|receiving|getting|obtaining|acquiring|purchasing|buying|selling|trading|exchanging|sharing|giving|donating|contributing|participating|joining|belonging|connecting|communicating|talking|discussing|debating|arguing|agreeing|disagreeing|compromising|negotiating|resolving|solving|fixing|repairing|healing|recovering|improving|progressing|advancing|moving|going|coming|arriving|departing|leaving|staying|remaining|continuing|persisting|persevering|enduring|surviving|thriving|flourishing|prospering|succeeding)\b/g,
            correct: false,
            replacement: 'their',
            explanation: '"Their" shows possession - it belongs to them'
          }
        ]
      },
      {
        word: 'their',
        patterns: [
          { 
            context: /\btheir\s+(is|are|was|were|will|would|should|could|might)\b/g,
            correct: false,
            replacement: 'there',
            explanation: '"There" is correct when indicating existence'
          }
        ]
      },
      
      // YOUR vs YOU'RE
      {
        word: 'your',
        patterns: [
          { 
            context: /\byour\s+(welcome|right|wrong|correct|incorrect|awesome|amazing|great|wonderful|terrible|horrible|smart|intelligent|clever|funny|hilarious|beautiful|handsome|pretty|ugly|tall|short|fat|thin|old|young|happy|sad|angry|excited|nervous|scared|brave|confident|shy|outgoing|friendly|mean|nice|kind|generous|selfish|honest|dishonest|trustworthy|reliable|unreliable|responsible|irresponsible|mature|immature|serious|silly|funny|boring|interesting|creative|artistic|musical|athletic|strong|weak|healthy|sick|tired|energetic|lazy|hardworking|successful|unsuccessful|lucky|unlucky|popular|unpopular|famous|unknown|rich|poor|wealthy|broke|married|single|divorced|engaged|dating|available|taken|free|busy|occupied|employed|unemployed|retired|graduated|studying|working|playing|resting|sleeping|awake|alert|focused|distracted|confused|clear|certain|uncertain|sure|unsure|ready|unprepared|prepared|organized|disorganized|neat|messy|clean|dirty|new|old|fresh|stale|hot|cold|warm|cool|wet|dry|loud|quiet|fast|slow|early|late|on|off|in|out|up|down|here|there|everywhere|nowhere|somewhere|anywhere|always|never|sometimes|often|rarely|frequently|occasionally|usually|normally|typically|generally|specifically|particularly|especially|mainly|mostly|partly|completely|totally|entirely|fully|partially|slightly|barely|hardly|almost|nearly|quite|very|extremely|incredibly|amazingly|surprisingly|unfortunately|fortunately|hopefully|probably|possibly|maybe|perhaps|definitely|certainly|surely|obviously|clearly|apparently|seemingly|supposedly|allegedly|reportedly|actually|really|truly|honestly|seriously|literally|figuratively|metaphorically|symbolically|ironically|surprisingly|shockingly|disappointingly|encouragingly|inspiringly|motivatingly|depressingly|frustratingly|annoyingly|irritatingly|amusingly|entertainingly|boringly|interestingly|fascinatingly|surprisingly|unexpectedly|predictably|obviously|clearly|apparently|seemingly|supposedly|allegedly|reportedly|actually|really|truly|honestly|seriously)\b/g,
            correct: false,
            replacement: "you're",
            explanation: '"You\'re" is the contraction for "you are"'
          }
        ]
      },
      {
        word: "you're",
        patterns: [
          { 
            context: /\byou're\s+(car|house|book|dog|cat|family|parents|children|friends|job|work|school|college|university|home|room|desk|computer|phone|money|time|life|future|dreams|goals|plans|ideas|thoughts|feelings|emotions|experiences|memories|stories|problems|issues|challenges|opportunities|skills|talents|abilities|knowledge|education|name|age|birthday|address|number|email|password|username|account|profile|picture|photo|video|music|song|movie|show|game|sport|hobby|interest|favorite|preference|choice|decision|opinion|belief|value|principle|rule|law|policy|procedure|process|method|technique|strategy|plan|approach|solution|answer|question|problem|issue|challenge|opportunity|advantage|disadvantage|benefit|cost|price|value|worth|importance|significance|meaning|purpose|goal|objective|target|aim|intention|desire|wish|hope|dream|fantasy|imagination|creativity|innovation|invention|discovery|breakthrough|achievement|accomplishment|success|failure|mistake|error|fault|blame|responsibility|duty|obligation|commitment|promise|agreement|contract|deal|arrangement|appointment|meeting|date|event|occasion|celebration|party|gathering|reunion|conference|seminar|workshop|training|course|class|lesson|lecture|presentation|speech|talk|discussion|conversation|chat|interview|debate|argument|fight|conflict|dispute|disagreement|misunderstanding|confusion|clarity|understanding|knowledge|information|data|facts|truth|reality|fiction|story|tale|myth|legend|history|past|present|future|yesterday|today|tomorrow|morning|afternoon|evening|night|weekend|weekday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|fall|autumn|winter|season|weather|climate|temperature|rain|snow|sun|moon|stars|sky|cloud|wind|storm|hurricane|tornado|earthquake|flood|fire|disaster|emergency|crisis|situation|condition|state|status|position|location|place|area|region|country|city|town|village|neighborhood|community|society|culture|tradition|custom|habit|routine|schedule|timetable|calendar|agenda|list|menu|recipe|ingredient|food|meal|breakfast|lunch|dinner|snack|drink|water|juice|coffee|tea|milk|soda|beer|wine|alcohol|drug|medicine|treatment|therapy|surgery|operation|procedure|examination|test|exam|quiz|assignment|homework|project|report|essay|paper|article|book|magazine|newspaper|journal|diary|blog|website|internet|computer|laptop|tablet|phone|smartphone|camera|television|radio|music|song|album|artist|band|singer|musician|actor|actress|director|producer|writer|author|poet|painter|artist|sculptor|photographer|designer|architect|engineer|doctor|nurse|teacher|professor|student|lawyer|judge|police|officer|firefighter|soldier|pilot|driver|mechanic|electrician|plumber|carpenter|builder|farmer|chef|cook|waiter|waitress|cashier|salesperson|manager|boss|employee|worker|colleague|partner|teammate|friend|buddy|pal|companion|acquaintance|stranger|neighbor|relative|family|parent|mother|father|sister|brother|daughter|son|grandmother|grandfather|aunt|uncle|cousin|niece|nephew|husband|wife|boyfriend|girlfriend|partner|spouse|lover|ex|former|current|future|potential|possible|impossible|likely|unlikely|probable|improbable|certain|uncertain|sure|unsure|confident|doubtful|hopeful|hopeless|optimistic|pessimistic|positive|negative|good|bad|right|wrong|correct|incorrect|true|false|real|fake|genuine|artificial|natural|synthetic|organic|inorganic|healthy|unhealthy|safe|dangerous|secure|insecure|stable|unstable|steady|unsteady|consistent|inconsistent|reliable|unreliable|dependable|undependable|trustworthy|untrustworthy|honest|dishonest|fair|unfair|just|unjust|equal|unequal|similar|different|same|opposite|alike|unlike|identical|unique|common|rare|usual|unusual|normal|abnormal|regular|irregular|standard|nonstandard|typical|atypical|average|exceptional|ordinary|extraordinary|simple|complex|easy|difficult|hard|soft|tough|gentle|rough|smooth|sharp|dull|bright|dark|light|heavy|clear|unclear|obvious|hidden|visible|invisible|apparent|secret|public|private|open|closed|free|expensive|cheap|costly|valuable|worthless|useful|useless|helpful|harmful|beneficial|detrimental|positive|negative|good|bad|excellent|terrible|perfect|imperfect|complete|incomplete|finished|unfinished|done|undone|ready|unready|prepared|unprepared|organized|disorganized|neat|messy|clean|dirty|fresh|stale|new|old|modern|ancient|current|outdated|updated|obsolete|recent|old|latest|earliest|first|last|beginning|end|start|finish|top|bottom|high|low|up|down|left|right|front|back|inside|outside|interior|exterior|internal|external|inner|outer|central|peripheral|main|secondary|primary|secondary|major|minor|big|small|large|tiny|huge|enormous|gigantic|massive|immense|vast|wide|narrow|broad|thin|thick|fat|skinny|tall|short|long|brief|quick|slow|fast|rapid|speedy|swift|sluggish|gradual|sudden|immediate|instant|delayed|late|early|on|off|active|inactive|busy|idle|occupied|free|available|unavailable|present|absent|here|there|everywhere|nowhere|somewhere|anywhere|always|never|sometimes|often|rarely|frequently|occasionally|usually|normally|typically|generally|specifically|particularly|especially|mainly|mostly|partly|completely|totally|entirely|fully|partially|slightly|barely|hardly|almost|nearly|quite|very|extremely|incredibly|amazingly|surprisingly|unfortunately|fortunately|hopefully|probably|possibly|maybe|perhaps|definitely|certainly|surely|obviously|clearly|apparently|seemingly|supposedly|allegedly|reportedly|actually|really|truly|honestly|seriously|literally|figuratively|metaphorically|symbolically|ironically|surprisingly|shockingly|disappointingly|encouragingly|inspiringly|motivatingly|depressingly|frustratingly|annoyingly|irritatingly|amusingly|entertainingly|boringly|interestingly|fascinatingly|surprisingly|unexpectedly|predictably)\b/g,
            correct: false,
            replacement: 'your',
            explanation: '"Your" shows possession - it belongs to you'
          }
        ]
      },
      
      // ITS vs IT'S
      {
        word: "its",
        patterns: [
          { 
            context: /\bits\s+(a|an|the|very|really|quite|so|too|such|pretty|rather|fairly|extremely|incredibly|amazingly|surprisingly|unfortunately|fortunately|hopefully|probably|possibly|maybe|perhaps|definitely|certainly|surely|obviously|clearly|apparently|seemingly|supposedly|allegedly|reportedly|actually|really|truly|honestly|seriously|literally|going|coming|moving|running|walking|flying|swimming|dancing|singing|cooking|eating|sleeping|working|playing|studying|learning|reading|writing|speaking|listening|thinking|feeling|looking|seeing|hearing|smelling|tasting|touching|holding|carrying|lifting|pushing|pulling|throwing|catching|hitting|kicking|jumping|climbing|falling|standing|sitting|lying|resting|relaxing|exercising|stretching|bending|turning|spinning|rotating|rolling|sliding|gliding|floating|sinking|rising|falling|growing|shrinking|expanding|contracting|opening|closing|starting|stopping|beginning|ending|continuing|pausing|waiting|hurrying|rushing|slowing|speeding|accelerating|decelerating|improving|worsening|increasing|decreasing|rising|falling|climbing|descending|advancing|retreating|approaching|departing|arriving|leaving|entering|exiting|joining|separating|connecting|disconnecting|attaching|detaching|building|destroying|creating|eliminating|adding|removing|including|excluding|accepting|rejecting|approving|disapproving|agreeing|disagreeing|supporting|opposing|helping|hindering|encouraging|discouraging|inspiring|discouraging|motivating|demotivating|exciting|boring|interesting|uninteresting|entertaining|unentertaining|amusing|annoying|pleasing|displeasing|satisfying|unsatisfying|fulfilling|unfulfilling|rewarding|unrewarding|beneficial|harmful|useful|useless|helpful|unhelpful|important|unimportant|significant|insignificant|meaningful|meaningless|valuable|worthless|precious|cheap|expensive|affordable|unaffordable|accessible|inaccessible|available|unavailable|possible|impossible|likely|unlikely|probable|improbable|certain|uncertain|sure|unsure|confident|doubtful|hopeful|hopeless|optimistic|pessimistic|positive|negative|good|bad|right|wrong|correct|incorrect|true|false|real|fake|genuine|artificial|natural|synthetic|organic|inorganic|healthy|unhealthy|safe|dangerous|secure|insecure|stable|unstable|steady|unsteady|consistent|inconsistent|reliable|unreliable|dependable|undependable|trustworthy|untrustworthy|honest|dishonest|fair|unfair|just|unjust|equal|unequal|similar|different|same|opposite|alike|unlike|identical|unique|common|rare|usual|unusual|normal|abnormal|regular|irregular|standard|nonstandard|typical|atypical|average|exceptional|ordinary|extraordinary|simple|complex|easy|difficult|hard|soft|tough|gentle|rough|smooth|sharp|dull|bright|dark|light|heavy|clear|unclear|obvious|hidden|visible|invisible|apparent|secret|public|private|open|closed|free|expensive|cheap|costly|valuable|worthless|useful|useless|helpful|harmful|beneficial|detrimental|positive|negative|good|bad|excellent|terrible|perfect|imperfect|complete|incomplete|finished|unfinished|done|undone|ready|unready|prepared|unprepared|organized|disorganized|neat|messy|clean|dirty|fresh|stale|new|old|modern|ancient|current|outdated|updated|obsolete|recent|old|latest|earliest|first|last|beginning|end|start|finish|top|bottom|high|low|up|down|left|right|front|back|inside|outside|interior|exterior|internal|external|inner|outer|central|peripheral|main|secondary|primary|secondary|major|minor|big|small|large|tiny|huge|enormous|gigantic|massive|immense|vast|wide|narrow|broad|thin|thick|fat|skinny|tall|short|long|brief|quick|slow|fast|rapid|speedy|swift|sluggish|gradual|sudden|immediate|instant|delayed|late|early|on|off|active|inactive|busy|idle|occupied|free|available|unavailable|present|absent|here|there|everywhere|nowhere|somewhere|anywhere|always|never|sometimes|often|rarely|frequently|occasionally|usually|normally|typically|generally|specifically|particularly|especially|mainly|mostly|partly|completely|totally|entirely|fully|partially|slightly|barely|hardly|almost|nearly|quite|very|extremely|incredibly|amazingly|surprisingly|unfortunately|fortunately|hopefully|probably|possibly|maybe|perhaps|definitely|certainly|surely|obviously|clearly|apparently|seemingly|supposedly|allegedly|reportedly|actually|really|truly|honestly|seriously|literally|figuratively|metaphorically|symbolically|ironically|surprisingly|shockingly|disappointingly|encouragingly|inspiringly|motivatingly|depressingly|frustratingly|annoyingly|irritatingly|amusingly|entertainingly|boringly|interestingly|fascinatingly|surprisingly|unexpectedly|predictably)\b/g,
            correct: false,
            replacement: "it's",
            explanation: '"It\'s" is the contraction for "it is" or "it has"'
          }
        ]
      }
    ];

    // Check each homophone rule
    homophoneRules.forEach(rule => {
      rule.patterns.forEach(pattern => {
        let match;
        while ((match = pattern.context.exec(lowerText)) !== null) {
          if (!pattern.correct) {
            // Find the actual position in the original text
            const matchStart = match.index;
            const wordEnd = matchStart + rule.word.length;
            
            suggestions.push({
              id: `context-homophone-${Date.now()}-${matchStart}`,
              type: 'grammar',
              severity: 'error',
              message: `"${rule.word}" should be "${pattern.replacement}" in this context`,
              originalText: text.substring(matchStart, wordEnd),
              suggestedText: pattern.replacement || '',
              startIndex: matchStart,
              endIndex: wordEnd,
              explanation: pattern.explanation,
              confidence: 0.9
            });
          }
        }
      });
    });

    return suggestions;
  }

  /**
   * Check subject-verb agreement errors
   */
  private checkSubjectVerbAgreement(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Common subject-verb disagreement patterns
    const patterns = [
      {
        regex: /\b(he|she|it|[A-Z][a-z]+)\s+(are|were|have)\b/gi,
        replacement: (match: string) => {
          if (match.includes('are')) return match.replace('are', 'is');
          if (match.includes('were')) return match.replace('were', 'was');
          if (match.includes('have')) return match.replace('have', 'has');
          return match;
        },
        explanation: 'Singular subjects require singular verbs'
      },
      {
        regex: /\b(they|we|you|[a-z]+s)\s+(is|was|has)\b/gi,
        replacement: (match: string) => {
          if (match.includes('is')) return match.replace('is', 'are');
          if (match.includes('was')) return match.replace('was', 'were');
          if (match.includes('has')) return match.replace('has', 'have');
          return match;
        },
        explanation: 'Plural subjects require plural verbs'
      }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const originalText = match[0];
        const suggestedText = pattern.replacement(originalText);
        
        if (originalText !== suggestedText) {
          suggestions.push({
            id: `subject-verb-${Date.now()}-${match.index}`,
            type: 'grammar',
            severity: 'error',
            message: 'Subject-verb disagreement',
            originalText,
            suggestedText,
            startIndex: match.index,
            endIndex: match.index + originalText.length,
            explanation: pattern.explanation,
            confidence: 0.85
          });
        }
      }
    });

    return suggestions;
  }

  /**
   * Check possessive vs plural errors
   */
  private checkPossessiveErrors(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Look for incorrect apostrophe usage
    const patterns = [
      {
        regex: /\b([a-z]+)'s\s+(are|were|have|do|don't|can't|won't|will|would|should|could|might)\b/gi,
        explanation: 'Use plural form, not possessive, when referring to multiple items',
        getSuggestion: (match: string) => {
          const word = match.split("'")[0];
          return word + 's ' + match.split(' ')[1];
        }
      }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const originalText = match[0];
        const suggestedText = pattern.getSuggestion(originalText);
        
        suggestions.push({
          id: `possessive-${Date.now()}-${match.index}`,
          type: 'grammar',
          severity: 'warning',
          message: 'Incorrect apostrophe usage',
          originalText,
          suggestedText,
          startIndex: match.index,
          endIndex: match.index + originalText.length,
          explanation: pattern.explanation,
          confidence: 0.8
        });
      }
    });

    return suggestions;
  }

  /**
   * Check article usage (a vs an)
   */
  private checkArticleUsage(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Check for "a" before vowel sounds and "an" before consonant sounds
    const patterns = [
      {
        regex: /\ba\s+([aeiouAEIOU])/g,
        replacement: 'an $1',
        explanation: 'Use "an" before words that start with a vowel sound'
      },
      {
        regex: /\ban\s+([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])/g,
        replacement: 'a $1',
        explanation: 'Use "a" before words that start with a consonant sound'
      }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const originalText = match[0];
        const suggestedText = pattern.replacement;
        
        suggestions.push({
          id: `article-${Date.now()}-${match.index}`,
          type: 'grammar',
          severity: 'error',
          message: 'Incorrect article usage',
          originalText,
          suggestedText,
          startIndex: match.index,
          endIndex: match.index + originalText.length,
          explanation: pattern.explanation,
          confidence: 0.95
        });
      }
    });

    return suggestions;
  }

  /**
   * Check common preposition errors
   */
  private checkPrepositionErrors(text: string): TextSuggestion[] {
    const suggestions: TextSuggestion[] = [];
    
    // Common preposition errors
    const patterns = [
      {
        regex: /\bdifferent than\b/gi,
        replacement: 'different from',
        explanation: 'Use "different from" instead of "different than"'
      },
      {
        regex: /\bcould care less\b/gi,
        replacement: "couldn't care less",
        explanation: 'Use "couldn\'t care less" to express complete indifference'
      }
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const originalText = match[0];
        const suggestedText = pattern.replacement;
        
        suggestions.push({
          id: `preposition-${Date.now()}-${match.index}`,
          type: 'grammar',
          severity: 'suggestion',
          message: 'Consider alternative preposition',
          originalText,
          suggestedText,
          startIndex: match.index,
          endIndex: match.index + originalText.length,
          explanation: pattern.explanation,
          confidence: 0.75
        });
      }
    });

    return suggestions;
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
    
    // 🎯 NEW: Context-based homophone and grammar checking
    const contextBasedSuggestions = this.checkContextBasedErrors(text);
    suggestions.push(...contextBasedSuggestions);
    
    const localStyleSuggestions = await this.checkStyle(text, words, sentences);
    suggestions.push(...localStyleSuggestions);

    // Early deduplication before conflict resolution for better performance
    const deduplicatedSuggestions = this.removeDuplicateSuggestions(suggestions);
    
    // Resolve conflicts between overlapping suggestions
    return this.resolveConflictingSuggestions(deduplicatedSuggestions);
  }

  /**
   * 🚀 COMPREHENSIVE ANALYSIS: Local checks + AI enhancement + AI validation
   */
  async analyzeText(text: string, writingGoal?: string, includeTone?: boolean, analysisMode?: 'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment', skipInstantAnalysis?: boolean): Promise<TextAnalysis> {
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
        
        // AI Grammar & Clarity Analysis
        if (text.trim().length >= 15) {
          try {
            const grammarResult = await firebaseAIService.analyzeGrammarAndClarity(text);
            const aiSuggestions = grammarResult.suggestions.map(s => this.convertToTextSuggestion(s));
            suggestions.push(...aiSuggestions);
            console.log(`🚀 AI Grammar analysis: ${aiSuggestions.length} suggestions added`);
          } catch (error) {
            console.warn('AI Grammar analysis failed:', error);
          }
        }
        
        // AI Conciseness Analysis
        if (text.trim().length >= 20) {
          try {
            const concisenessResult = await firebaseAIService.analyzeConciseness(text);
            const concisenessSuggestions = concisenessResult.suggestions.map(s => this.convertToTextSuggestion(s));
            suggestions.push(...concisenessSuggestions);
            console.log(`🚀 AI Conciseness analysis: ${concisenessSuggestions.length} suggestions added`);
          } catch (error) {
            console.warn('AI Conciseness analysis failed:', error);
          }
        }
        
        // AI Vocabulary Analysis
        if (text.trim().length >= 25) {
          try {
            const vocabularyResult = await firebaseAIService.analyzeVocabulary(text);
            const vocabularySuggestions = vocabularyResult.suggestions.map(s => this.convertToTextSuggestion(s));
            // Filter out overly formal suggestions
            const filteredVocabSuggestions = vocabularySuggestions.filter(s => 
              this.isAppropriateVocabularySuggestion(s, text)
            );
            suggestions.push(...filteredVocabSuggestions);
            console.log(`🚀 AI Vocabulary analysis: ${filteredVocabSuggestions.length} suggestions added (${vocabularySuggestions.length - filteredVocabSuggestions.length} filtered out)`);
          } catch (error) {
            console.warn('AI Vocabulary analysis failed:', error);
          }
        }
        
        // AI Goal Alignment Analysis
        if (writingGoal && text.trim().length >= 50) {
          try {
            const goalResult = await firebaseAIService.analyzeGoalAlignment(text, writingGoal);
            const goalSuggestions = goalResult.suggestions.map(s => this.convertToTextSuggestion(s));
            suggestions.push(...goalSuggestions);
            console.log(`🚀 AI Goal alignment analysis: ${goalSuggestions.length} suggestions added`);
          } catch (error) {
            console.warn('AI Goal alignment analysis failed:', error);
          }
        }
        
      } catch (error) {
        console.warn('Comprehensive AI analysis failed:', error);
      }
    }

    // 🚀 PHASE 2: AI VALIDATION OF SUGGESTIONS
    console.log('🤖 Starting AI validation of suggestions...');
    const validatedSuggestions: TextSuggestion[] = [];
    
    // Validate suggestions in batches to avoid overwhelming the AI
    const batchSize = 5;
    for (let i = 0; i < suggestions.length; i += batchSize) {
      const batch = suggestions.slice(i, i + batchSize);
      
      // Validate each suggestion in the batch
      for (const suggestion of batch) {
        // Skip AI validation for high-confidence suggestions or if text is too short
        if (suggestion.confidence >= 0.9 || text.length < 20) {
          suggestion.aiValidated = false; // Mark as not AI validated
          validatedSuggestions.push(suggestion);
          continue;
        }
        
        try {
          const isValid = await this.validateSuggestionWithAI(suggestion, text);
          if (isValid) {
            suggestion.aiValidated = true;
            suggestion.confidence = Math.min(suggestion.confidence + 0.1, 1.0); // Boost confidence for AI-validated suggestions
            validatedSuggestions.push(suggestion);
          } else {
            console.log(`🤖 Rejected invalid suggestion: ${suggestion.originalText} -> ${suggestion.suggestedText}`);
          }
      } catch (error) {
          console.warn('AI validation failed for suggestion, including anyway:', error);
          suggestion.aiValidated = false;
          suggestion.confidence = Math.max(suggestion.confidence - 0.1, 0.1); // Lower confidence for unvalidated suggestions
          validatedSuggestions.push(suggestion);
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < suggestions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🤖 AI Validation complete: ${validatedSuggestions.length}/${suggestions.length} suggestions validated`);

    // Final deduplication and conflict resolution
    const finalSuggestions = this.resolveConflictingSuggestions(
      this.removeDuplicateSuggestions(validatedSuggestions)
    );

    // Calculate readability
    const readability = this.calculateReadability(text);

    // Optional tone analysis
    let toneAnalysis: ToneAnalysis | undefined;
    if (includeTone && text.length >= 50) {
      try {
        toneAnalysis = await this.analyzeTone(text);
      } catch (error) {
        console.warn('Tone analysis failed:', error);
      }
    }

    return {
      suggestions: finalSuggestions,
      readabilityScore: readability.score,
      readabilityGrade: readability.grade,
      wordCount,
      sentenceCount,
      characterCount,
      averageWordsPerSentence,
      complexWords: this.countComplexWords(words),
      toneAnalysis
    };
  }

  private convertToTextSuggestion(suggestion: any): TextSuggestion {
    return {
      id: `ai-${Date.now()}-${Math.random()}`,
      type: suggestion.type || 'grammar',
      severity: suggestion.severity || 'suggestion',
      message: suggestion.message || '',
      originalText: suggestion.originalText || '',
      suggestedText: suggestion.suggestedText || '',
      startIndex: suggestion.startIndex || 0,
      endIndex: suggestion.endIndex || 0,
      explanation: suggestion.explanation || '',
      confidence: suggestion.confidence || 0.8,
      alternatives: suggestion.alternatives,
      wordsSaved: suggestion.wordsSaved
    };
  }

  private async checkGrammar(text: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];

    // Use compromise.js for basic grammar analysis
    const doc = nlp(text);
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
          explanation: 'Consider adding a verb to make this a complete sentence.',
          confidence: 0.7
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
          explanation: 'Consider breaking this into shorter sentences for better readability.',
          confidence: 0.6
        });
      }
    }

    // Check for common word usage errors
    const wordUsageErrors = [
      { pattern: /\bdecided\s+too\s+volunteer\b/gi, message: 'Use "to" instead of "too" before verbs', correction: 'decided to volunteer', confidence: 0.9 },
      { pattern: /\bhow\s+too\s+\w+/gi, message: 'Use "to" instead of "too" before verbs', correction: 'how to', confidence: 0.9 },
      { pattern: /\bdue\s+too\s+the\b/gi, message: 'Use "to" instead of "too"', correction: 'due to the', confidence: 0.9 },
      { pattern: /\bTheir,\s+I\b/gi, message: 'Use "There" to start a sentence about location or existence', correction: 'There, I', confidence: 0.8 },
      { pattern: /\bprepared\s+me\s+good\b/gi, message: 'Use "well" instead of "good" as an adverb', correction: 'prepared me well', confidence: 0.9 }
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
          explanation: error.message,
          confidence: error.confidence
        });
      }
    }

    return suggestions;
  }

  private async checkSpelling(text: string): Promise<TextSuggestion[]> {
    const suggestions: TextSuggestion[] = [];
    
    // ⚡ INSTANT BROWSER-COMPATIBLE SPELL CHECKER
    // Common misspellings that high school students make (REMOVED PROBLEMATIC HOMOPHONES)
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
      
      // Common misspellings from student writing
      'comunicate': ['communicate'],
      'comunicated': ['communicated'],
      'comunicating': ['communicating'],
      'comunication': ['communication'],
      'familys': ['families'],
      'prestegious': ['prestigious'],
      'prestegous': ['prestigious'],
      'intrested': ['interested'],
      'intrest': ['interest'],
      'experiance': ['experience'],
      'experiances': ['experiences'],
      'experianced': ['experienced'],
      'volenteer': ['volunteer'],
      'volenteered': ['volunteered'],
      'volenteering': ['volunteering'],
      'helpfull': ['helpful'],
      'successfull': ['successful'],
      'beautifull': ['beautiful'],
      'wonderfull': ['wonderful'],
      'carefull': ['careful'],
      'usefull': ['useful'],
      'peacefull': ['peaceful'],
      'powerfull': ['powerful'],
      'meaningfull': ['meaningful'],
      'gratefull': ['grateful'],
      'respectfull': ['respectful'],
      'successfuly': ['successfully'],
      'realy': ['really'],
      'finaly': ['finally'],
      'specialy': ['especially'],
      'basicaly': ['basically'],
      'totaly': ['totally'],
      'usualy': ['usually'],
      'actualy': ['actually'],
      'personaly': ['personally'],
      'generaly': ['generally'],
      'especialy': ['especially'],
      'diferent': ['different'],
      'diference': ['difference'],
      'importent': ['important'],
      'importence': ['importance'],
      'excelent': ['excellent'],
      'excelence': ['excellence'],
      'responsable': ['responsible'],
      'responsability': ['responsibility'],
      'oportunity': ['opportunity'],
      'oportunities': ['opportunities'],
      'recomend': ['recommend'],
      'recomended': ['recommended'],
      'recomendation': ['recommendation'],
      'comited': ['committed'],
      'comitment': ['commitment'],
      'comunity': ['community'],
      'comunities': ['communities'],
      'knowlege': ['knowledge'],
      'knowlegeable': ['knowledgeable'],
      'challange': ['challenge'],
      'challanged': ['challenged'],
      'challanging': ['challenging'],
      'succesful': ['successful'],
      'succesfully': ['successfully'],
      'succes': ['success'],
      'sucess': ['success'],
      'sucessful': ['successful'],
      'sucessfully': ['successfully'],
      'buisness': ['business'],
      'buisneses': ['businesses'],
      'profesional': ['professional'],
      'profesionalism': ['professionalism'],
      'profesionally': ['professionally'],
      'profesion': ['profession'],
      'carrer': ['career'],
      'carrers': ['careers'],
      'collage': ['college'],
      'collages': ['colleges'],
      'univercity': ['university'],
      'univercities': ['universities'],
      'studing': ['studying'],
      'studys': ['studies'],
      'studyed': ['studied'],
      'learing': ['learning'],
      'learnt': ['learned'],
      'teached': ['taught'],
      'choosed': ['chose'],
      'payed': ['paid'],
      'sayed': ['said'],
      'goed': ['went'],
      'taked': ['took'],
      'maked': ['made'],
      'gived': ['gave'],
      'getted': ['got'],
      'putted': ['put'],
      'cutted': ['cut'],
      'hitted': ['hit'],
      'letted': ['let'],
      'sitted': ['sat'],
      'runned': ['ran'],
      'winned': ['won'],
      'losed': ['lost'],
      'finded': ['found'],
      'thinked': ['thought'],
      'bringed': ['brought'],
      'buyed': ['bought'],
      'catched': ['caught'],
      'feeled': ['felt'],
      'keeped': ['kept'],
      'leaved': ['left'],
      'meaned': ['meant'],
      'sended': ['sent'],
      'spended': ['spent'],
      'standed': ['stood'],
      'telled': ['told'],
      'understanded': ['understood'],
      
      // Compound word errors and split word typos
      'woul dbe': ['would be'],
      'coul dbe': ['could be'],
      'shoul dbe': ['should be'],
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
      
      // NOTE: Removed problematic context-dependent homophones that cause false positives
      // These will be handled by AI validation instead
      
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
            explanation: `Did you mean "${commonMisspellings[word][0]}"?`,
            confidence: 0.8
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
              explanation: `Did you mean "${commonMisspellings[twoWordPhrase][0]}"?`,
              confidence: 0.8
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
            explanation: 'Consider using synonyms to avoid repetition.',
            confidence: 0.6
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
          explanation: 'Removing weak words can make your writing more direct and powerful.',
          confidence: 0.7
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
            explanation: 'Mix short and long sentences to improve readability and flow.',
            confidence: 0.5
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
            explanation: 'Personal statements are stronger when they highlight specific experiences and contributions using first-person language.',
            confidence: 0.6
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
            explanation: 'Personal statements are stronger when they highlight specific achievements using action words like "achieved," "led," or "created."',
            confidence: 0.6
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
            explanation: 'The subject and verb do not agree in number.',
            confidence: 0.7
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
              explanation: 'This pronoun reference is unclear or ambiguous.',
              confidence: 0.6
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
        explanation: 'Use either numeric (1, 2, 3) or written (one, two, three) format consistently.',
        confidence: 0.6
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