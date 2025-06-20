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
 * Helper function to calculate text indices
 * @param {string} text Full text
 * @param {string} originalText Text to find
 * @return {object} Start and end indices
 */
function calculateIndices(
  text: string,
  originalText: string,
): { startIndex: number; endIndex: number } {
  const startIndex = text.toLowerCase().indexOf(originalText.toLowerCase());
  return {
    startIndex: startIndex >= 0 ? startIndex : 0,
    endIndex: startIndex >= 0 ?
      startIndex + originalText.length : originalText.length,
  };
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
