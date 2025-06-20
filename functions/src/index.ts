/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import {config} from "firebase-functions/v1";
import OpenAI from "openai";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Get OpenAI API key from Firebase config or environment variable
const openaiApiKey = process.env.OPENAI_API_KEY || config().openai?.key;

// Interface definitions for type safety
interface GrammarAnalysisResult {
  suggestions: Array<{
    type: "grammar" | "spelling" | "punctuation" | "clarity";
    severity: "error" | "warning" | "suggestion";
    message: string;
    originalText: string;
    suggestedText: string;
    explanation: string;
    startIndex: number;
    endIndex: number;
    confidence: number;
  }>;
  overallScore: number;
  insights: string[];
}

interface ToneAnalysisResult {
  overall: "professional" | "conversational" | "formal" |
           "casual" | "passionate" | "neutral";
  confidence: number;
  sincerity: number;
  engagement: number;
  emotionalImpact: number;
  recommendations: string[];
  specificFeedback: string[];
}

/**
 * Helper function to validate user authentication and input
 * @param {CallableRequest} request Firebase request
 * @return {string} Validated text
 */
function validateRequest(request: CallableRequest): string {
  // Require authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "User must be logged in to use AI features",
    );
  }

  // Validate input
  if (!request.data.text || typeof request.data.text !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Text is required and must be a string",
    );
  }

  if (request.data.text.length < 10) {
    throw new HttpsError(
      "invalid-argument",
      "Text must be at least 10 characters long",
    );
  }

  if (request.data.text.length > 5000) {
    throw new HttpsError(
      "invalid-argument",
      "Text too long. Maximum 5000 characters allowed",
    );
  }

  return request.data.text;
}

/**
 * Helper function to clean OpenAI response and extract JSON
 * @param {string} response Raw response from OpenAI
 * @return {string} Clean JSON string
 */
function cleanOpenAIResponse(response: string): string {
  // Remove markdown code blocks if present
  let cleaned = response.trim();
  
  // Remove ```json at the start
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  
  // Remove ``` at the end
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  return cleaned.trim();
}

/**
 * Calculate start and end indices for a suggestion in the original text
 * Improved version that handles multiple occurrences by finding the best match
 * @param {string} text The original text
 * @param {string} originalText The text to find
 * @param {number} contextHint Optional hint about where to look (from AI analysis)
 * @return {object} Start and end indices
 */
function calculateIndices(
  text: string,
  originalText: string,
  contextHint?: number,
): { startIndex: number; endIndex: number } {
  const searchText = text.toLowerCase();
  const searchTerm = originalText.toLowerCase();
  
  // Find all occurrences of the text
  const occurrences: number[] = [];
  let index = searchText.indexOf(searchTerm);
  
  while (index !== -1) {
    occurrences.push(index);
    index = searchText.indexOf(searchTerm, index + 1);
  }
  
  if (occurrences.length === 0) {
    // Fallback: return position 0 if not found
    console.warn(`Text "${originalText}" not found in original text`);
    return {
      startIndex: 0,
      endIndex: originalText.length,
    };
  }
  
  // If only one occurrence, use it
  if (occurrences.length === 1) {
    return {
      startIndex: occurrences[0],
      endIndex: occurrences[0] + originalText.length,
    };
  }
  
  // Multiple occurrences: use context hint if provided, otherwise use first occurrence
  let bestIndex = occurrences[0];
  
  if (contextHint !== undefined) {
    // Find the occurrence closest to the context hint
    let minDistance = Math.abs(occurrences[0] - contextHint);
    
    for (const occurrence of occurrences) {
      const distance = Math.abs(occurrence - contextHint);
      if (distance < minDistance) {
        minDistance = distance;
        bestIndex = occurrence;
      }
    }
  }
  
  return {
    startIndex: bestIndex,
    endIndex: bestIndex + originalText.length,
  };
}

/**
 * Remove duplicate suggestions that have identical text ranges and suggestions
 * This prevents the "mistakess" issue where multiple suggestions target the same text
 */
function deduplicateSuggestions(suggestions: any[]): any[] {
  const seen = new Set<string>();
  const unique: any[] = [];

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

/**
 * Analyze text for grammar, spelling, and clarity issues
 * Secure Firebase Cloud Function that requires authentication
 */
export const analyzeGrammarAndClarity = onCall(
  async (request) => {
    try {
      const text = validateRequest(request);

      // Initialize OpenAI client at runtime with the API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      const prompt = "You are an expert writing tutor specializing in " +
        "helping high school students improve their personal statements " +
        "for college applications.\n\n" +
        "Analyze the following text for grammar, spelling, punctuation, and " +
        "clarity issues. Focus on issues that would be important for a " +
        "college personal statement.\n\n" +
        `Text to analyze:\n"${text}"\n\n` +
        "Please provide your analysis in the following JSON format:\n" +
        "{\n" +
        "  \"suggestions\": [\n" +
        "    {\n" +
        "      \"type\": \"grammar|spelling|punctuation|clarity\",\n" +
        "      \"severity\": \"error|warning|suggestion\",\n" +
        "      \"message\": \"Brief description of the issue\",\n" +
        "      \"originalText\": \"The exact text that needs fixing\",\n" +
        "      \"suggestedText\": \"The corrected version\",\n" +
        "      \"explanation\": \"Educational explanation suitable for a " +
        "high school student (1-2 sentences)\",\n" +
        "      \"startIndex\": 0,\n" +
        "      \"endIndex\": 10,\n" +
        "      \"confidence\": 0.95\n" +
        "    }\n" +
        "  ],\n" +
        "  \"overallScore\": 85,\n" +
        "  \"insights\": [\n" +
        "    \"Overall positive feedback and areas of strength\",\n" +
        "    \"Key areas for improvement\"\n" +
        "  ]\n" +
        "}\n\n" +
        "Important guidelines:\n" +
        "- Only flag actual errors or significant improvements\n" +
        "- Provide educational explanations that help students learn\n" +
        "- Focus on issues that matter for college applications\n" +
        "- Be encouraging while providing constructive feedback\n" +
        "- Confidence should be between 0.7-1.0 for suggestions you include";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful writing tutor. Always respond " +
              "with valid JSON matching the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new HttpsError(
          "internal",
          "No response from OpenAI",
        );
      }

      try {
        const cleanedResult = cleanOpenAIResponse(result);
        const parsed = JSON.parse(cleanedResult) as GrammarAnalysisResult;

        // Calculate actual start/end indices for suggestions
        parsed.suggestions = parsed.suggestions.map((suggestion) => {
          const indices = calculateIndices(text, suggestion.originalText);
          return {
            ...suggestion,
            ...indices,
          };
        });

        // Remove duplicate suggestions to prevent conflicts
        parsed.suggestions = deduplicateSuggestions(parsed.suggestions);

        console.log("Grammar analysis completed", {
          userId: request.auth?.uid,
          textLength: text.length,
          suggestionsCount: parsed.suggestions.length,
        });

        return parsed;
      } catch (parseError) {
        console.error("Failed to parse OpenAI response", parseError);
        throw new HttpsError(
          "internal",
          "Invalid response format from AI service",
        );
      }
    } catch (error) {
      console.error("Grammar analysis failed", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Analysis failed. Please try again.",
      );
    }
  },
);

/**
 * Analyze the tone and emotional impact of the text
 * Secure Firebase Cloud Function that requires authentication
 */
export const analyzeTone = onCall(
  async (request) => {
    try {
      const text = validateRequest(request);

      // Additional validation for tone analysis (needs more text)
      if (text.length < 50) {
        throw new HttpsError(
          "invalid-argument",
          "Text must be at least 50 characters long for tone analysis",
        );
      }

      // Initialize OpenAI client at runtime with the API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      const prompt = "You are an expert writing coach specializing in " +
        "college personal statements.\n\n" +
        "Analyze the tone and emotional impact of the following personal " +
        `statement excerpt:\n\n"${text}"\n\n` +
        "Evaluate the text for:\n" +
        "1. Overall tone (professional, conversational, formal, casual, " +
        "passionate, neutral)\n" +
        "2. Confidence level (how self-assured the writing sounds)\n" +
        "3. Sincerity (how genuine and authentic it feels)\n" +
        "4. Engagement (how compelling and interesting it is to read)\n" +
        "5. Emotional impact (how well it conveys emotion and personal " +
        "growth)\n\n" +
        "Provide your analysis in this JSON format:\n" +
        "{\n" +
        "  \"overall\": \"professional|conversational|formal|casual|" +
        "passionate|neutral\",\n" +
        "  \"confidence\": 75,\n" +
        "  \"sincerity\": 85,\n" +
        "  \"engagement\": 70,\n" +
        "  \"emotionalImpact\": 80,\n" +
        "  \"recommendations\": [\n" +
        "    \"Specific actionable advice for improving tone\",\n" +
        "    \"Additional recommendations\"\n" +
        "  ],\n" +
        "  \"specificFeedback\": [\n" +
        "    \"Positive aspects of the current tone\",\n" +
        "    \"Areas that could be enhanced\"\n" +
        "  ]\n" +
        "}\n\n" +
        "Scores should be 0-100. Focus on what would resonate with college " +
        "admissions officers.";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful writing coach. Always respond " +
              "with valid JSON matching the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new HttpsError(
          "internal",
          "No response from OpenAI",
        );
      }

      try {
        const cleanedResult = cleanOpenAIResponse(result);
        const parsed = JSON.parse(cleanedResult) as ToneAnalysisResult;

        console.log("Tone analysis completed", {
          userId: request.auth?.uid,
          textLength: text.length,
          overallTone: parsed.overall,
        });

        return parsed;
      } catch (parseError) {
        console.error(
          "Failed to parse OpenAI tone response",
          parseError,
        );
        throw new HttpsError(
          "internal",
          "Invalid response format from AI service",
        );
      }
    } catch (error) {
      console.error("Tone analysis failed", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        "Tone analysis failed. Please try again.",
      );
    }
  },
);

/**
 * Health check function to verify OpenAI configuration
 * Requires authentication but doesn't use OpenAI credits
 */
export const checkAIHealth = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    return {
      openaiConfigured: !!openaiApiKey.value(),
      timestamp: new Date().toISOString(),
      userId: request.auth.uid,
    };
  },
);

/**
 * Get user's usage statistics (optional - for rate limiting)
 */
export const getUserUsage = onCall(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // This would typically query a database to get usage stats
    // For now, return a placeholder
    return {
      userId: request.auth.uid,
      dailyRequests: 0,
      monthlyRequests: 0,
      lastRequest: null,
      limits: {
        daily: 100,
        monthly: 1000,
      },
    };
  },
);

/**
 * Analyze text for conciseness and sentence structure optimization
 * Secure Firebase Cloud Function that requires authentication
 */
export const analyzeConciseness = onCall(
  async (request) => {
    try {
      const text = validateRequest(request);
      const wordLimit = request.data.wordLimit || null;

      // Initialize OpenAI client at runtime with the API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      let prompt = "You are an expert writing coach specializing in " +
        "concise, impactful writing for college personal statements.\n\n" +
        "Analyze the following text for conciseness and sentence structure. " +
        "Focus on eliminating redundancy, simplifying complex sentences, " +
        "and improving clarity while maintaining the author's voice.\n\n" +
        `Text to analyze:\n"${text}"\n\n`;

      if (wordLimit) {
        prompt += `Word limit: ${wordLimit} words (current: ${text.split(/\s+/).length} words)\n\n`;
      }

      prompt += "Provide your analysis in this JSON format:\n" +
        "{\n" +
        "  \"suggestions\": [\n" +
        "    {\n" +
        "      \"type\": \"conciseness\",\n" +
        "      \"severity\": \"warning|suggestion\",\n" +
        "      \"message\": \"Brief description of the issue\",\n" +
        "      \"originalText\": \"The wordy or complex text\",\n" +
        "      \"suggestedText\": \"The more concise version\",\n" +
        "      \"explanation\": \"Why this change improves the writing\",\n" +
        "      \"wordsSaved\": 5,\n" +
        "      \"confidence\": 0.9\n" +
        "    }\n" +
        "  ],\n" +
        "  \"overallScore\": 75,\n" +
        "  \"wordCount\": " + text.split(/\s+/).length + ",\n" +
        "  \"insights\": [\n" +
        "    \"Overall assessment of conciseness\",\n" +
        "    \"Key areas for improvement\"\n" +
        "  ]\n" +
        "}\n\n" +
        "Guidelines:\n" +
        "- Focus on eliminating redundant phrases and words\n" +
        "- Suggest simpler sentence structures\n" +
        "- Maintain the author's authentic voice\n" +
        "- Be specific about word savings\n" +
        "- Only suggest changes that genuinely improve clarity";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful writing coach focused on conciseness. " +
              "Always respond with valid JSON matching the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new HttpsError("internal", "No response from OpenAI");
      }

      try {
        const cleanedResult = cleanOpenAIResponse(result);
        const parsed = JSON.parse(cleanedResult);

        // Calculate actual start/end indices for suggestions
        parsed.suggestions = parsed.suggestions.map((suggestion: any) => {
          const indices = calculateIndices(text, suggestion.originalText);
          return {
            ...suggestion,
            ...indices,
          };
        });

        // Remove duplicate suggestions to prevent conflicts
        parsed.suggestions = deduplicateSuggestions(parsed.suggestions);

        console.log("Conciseness analysis completed", {
          userId: request.auth?.uid,
          textLength: text.length,
          suggestionsCount: parsed.suggestions.length,
        });

        return parsed;
      } catch (parseError) {
        console.error("Failed to parse conciseness response", parseError);
        throw new HttpsError("internal", "Invalid response format from AI service");
      }
    } catch (error) {
      console.error("Conciseness analysis failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Analysis failed. Please try again.");
    }
  },
);

/**
 * Analyze text for vocabulary enhancement opportunities
 * Secure Firebase Cloud Function that requires authentication
 */
export const analyzeVocabulary = onCall(
  async (request) => {
    try {
      const text = validateRequest(request);

      // Initialize OpenAI client at runtime with the API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      const prompt = "You are an expert writing coach helping high school " +
        "students elevate their vocabulary for college personal statements.\n\n" +
        "Analyze the following text for vocabulary enhancement opportunities. " +
        "Suggest stronger, more impactful, college-level words while maintaining " +
        "authenticity and avoiding overly complex language.\n\n" +
        `Text to analyze:\n"${text}"\n\n` +
        "Provide your analysis in this JSON format:\n" +
        "{\n" +
        "  \"suggestions\": [\n" +
        "    {\n" +
        "      \"type\": \"vocabulary\",\n" +
        "      \"severity\": \"suggestion\",\n" +
        "      \"message\": \"Consider a stronger word choice\",\n" +
        "      \"originalText\": \"good\",\n" +
        "      \"suggestedText\": \"exceptional\",\n" +
        "      \"explanation\": \"More specific and impactful word choice\",\n" +
        "      \"alternatives\": [\"remarkable\", \"outstanding\", \"impressive\"],\n" +
        "      \"confidence\": 0.85\n" +
        "    }\n" +
        "  ],\n" +
        "  \"overallScore\": 70,\n" +
        "  \"insights\": [\n" +
        "    \"Vocabulary strengths in the text\",\n" +
        "    \"Areas for vocabulary enhancement\"\n" +
        "  ]\n" +
        "}\n\n" +
        "Guidelines:\n" +
        "- Focus on common/weak words that could be strengthened\n" +
        "- Suggest college-appropriate but not overly complex alternatives\n" +
        "- Provide 2-3 alternative word choices when possible\n" +
        "- Maintain the student's authentic voice\n" +
        "- Explain why the suggested word is better";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a vocabulary coach for college-bound students. " +
              "Always respond with valid JSON matching the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new HttpsError("internal", "No response from OpenAI");
      }

      try {
        const cleanedResult = cleanOpenAIResponse(result);
        const parsed = JSON.parse(cleanedResult);

        // Calculate actual start/end indices for suggestions
        parsed.suggestions = parsed.suggestions.map((suggestion: any) => {
          const indices = calculateIndices(text, suggestion.originalText);
          return {
            ...suggestion,
            ...indices,
          };
        });

        // Remove duplicate suggestions to prevent conflicts
        parsed.suggestions = deduplicateSuggestions(parsed.suggestions);

        console.log("Vocabulary analysis completed", {
          userId: request.auth?.uid,
          textLength: text.length,
          suggestionsCount: parsed.suggestions.length,
        });

        return parsed;
      } catch (parseError) {
        console.error("Failed to parse vocabulary response", parseError);
        throw new HttpsError("internal", "Invalid response format from AI service");
      }
    } catch (error) {
      console.error("Vocabulary analysis failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Analysis failed. Please try again.");
    }
  },
);

/**
 * Analyze text for goal-based personalization and narrative alignment
 * Secure Firebase Cloud Function that requires authentication
 */
export const analyzeGoalAlignment = onCall(
  async (request) => {
    try {
      const text = validateRequest(request);
      const writingGoal = request.data.writingGoal || "personal-statement";

      // Initialize OpenAI client at runtime with the API key
      const openai = new OpenAI({
        apiKey: openaiApiKey,
      });

      const goalDescriptions: Record<string, string> = {
        "leadership": "demonstrating leadership qualities, initiative, and ability to inspire others",
        "resilience": "showing perseverance, overcoming challenges, and personal growth through adversity",
        "service": "highlighting community service, helping others, and social responsibility",
        "creativity": "showcasing creative thinking, innovation, and artistic expression",
        "academic": "emphasizing intellectual curiosity, academic achievements, and scholarly pursuits",
        "personal-growth": "focusing on self-discovery, maturity, and personal development",
        "diversity": "celebrating unique background, perspectives, and contributions to diversity",
        "career-goals": "connecting experiences to future career aspirations and professional goals"
      };

      const goalDescription = goalDescriptions[writingGoal] || "personal development and college readiness";

      const prompt = "You are an expert college admissions consultant helping " +
        "students align their personal statements with their narrative goals.\n\n" +
        `The student's writing goal is: ${writingGoal}\n` +
        `This means focusing on: ${goalDescription}\n\n` +
        "Analyze the following text for alignment with this goal. Suggest " +
        "specific improvements that would strengthen the narrative connection " +
        "to the chosen theme while maintaining authenticity.\n\n" +
        `Text to analyze:\n"${text}"\n\n` +
        "Provide your analysis in this JSON format:\n" +
        "{\n" +
        "  \"suggestions\": [\n" +
        "    {\n" +
        "      \"type\": \"goal-alignment\",\n" +
        "      \"severity\": \"suggestion\",\n" +
        "      \"message\": \"Strengthen connection to " + writingGoal + " theme\",\n" +
        "      \"originalText\": \"Text that could be enhanced\",\n" +
        "      \"suggestedText\": \"Enhanced version with stronger goal alignment\",\n" +
        "      \"explanation\": \"How this change better supports the " + writingGoal + " narrative\",\n" +
        "      \"confidence\": 0.8\n" +
        "    }\n" +
        "  ],\n" +
        "  \"alignmentScore\": 75,\n" +
        "  \"goalAnalysis\": {\n" +
        "    \"strengths\": [\"Current strong connections to the goal\"],\n" +
        "    \"opportunities\": [\"Areas where goal alignment could be strengthened\"],\n" +
        "    \"recommendations\": [\"Specific advice for better goal alignment\"]\n" +
        "  },\n" +
        "  \"insights\": [\n" +
        "    \"Overall assessment of goal alignment\",\n" +
        "    \"Key narrative opportunities\"\n" +
        "  ]\n" +
        "}\n\n" +
        "Guidelines:\n" +
        "- Focus on strengthening the connection to the chosen narrative goal\n" +
        "- Suggest specific examples or details that would enhance the theme\n" +
        "- Maintain the student's authentic voice and experiences\n" +
        "- Provide actionable advice for better goal alignment\n" +
        "- Be encouraging while identifying growth opportunities";

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a college admissions consultant focused on narrative " +
              "development. Always respond with valid JSON matching the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        throw new HttpsError("internal", "No response from OpenAI");
      }

      try {
        const cleanedResult = cleanOpenAIResponse(result);
        const parsed = JSON.parse(cleanedResult);

        // Calculate actual start/end indices for suggestions
        parsed.suggestions = parsed.suggestions.map((suggestion: any) => {
          const indices = calculateIndices(text, suggestion.originalText);
          return {
            ...suggestion,
            ...indices,
          };
        });

        // Remove duplicate suggestions to prevent conflicts
        parsed.suggestions = deduplicateSuggestions(parsed.suggestions);

        console.log("Goal alignment analysis completed", {
          userId: request.auth?.uid,
          textLength: text.length,
          writingGoal,
          alignmentScore: parsed.alignmentScore,
        });

        return parsed;
      } catch (parseError) {
        console.error("Failed to parse goal alignment response", parseError);
        throw new HttpsError("internal", "Invalid response format from AI service");
      }
    } catch (error) {
      console.error("Goal alignment analysis failed", error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Analysis failed. Please try again.");
    }
  },
);
