declare module 'typo-js' {
  export default class Typo {
    constructor(dictionary?: string, affData?: string, wordsData?: string);
    check(word: string): boolean;
    suggest(word: string, limit?: number): string[];
  }
}

declare module 'readability-score' {
  interface ReadabilityScores {
    fleschReadingEase: number;
    fleschKincaidGradeLevel: number;
    gunningFogIndex: number;
    colemanLiauIndex: number;
    automatedReadabilityIndex: number;
    smogIndex: number;
    averageGradeLevel: number;
  }

  export function readabilityScore(text: string): ReadabilityScores;
} 