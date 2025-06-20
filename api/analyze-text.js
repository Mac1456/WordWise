// api/analyze-text.js - Vercel Serverless Function
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side environment variable (no VITE_ prefix)
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, analysisType = 'grammar' } = req.body;

    if (!text || text.length < 10) {
      return res.status(400).json({ error: 'Text must be at least 10 characters long' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long. Maximum 5000 characters.' });
    }

    let result;

    if (analysisType === 'grammar') {
      result = await analyzeGrammarAndClarity(text);
    } else if (analysisType === 'tone') {
      result = await analyzeTone(text);
    } else {
      return res.status(400).json({ error: 'Invalid analysis type' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
}

async function analyzeGrammarAndClarity(text) {
  const prompt = `You are an expert writing tutor specializing in helping high school students improve their personal statements for college applications.

Analyze the following text for grammar, spelling, punctuation, and clarity issues. Focus on issues that would be important for a college personal statement.

Text to analyze:
"${text}"

Please provide your analysis in the following JSON format:
{
  "suggestions": [
    {
      "type": "grammar|spelling|punctuation|clarity",
      "severity": "error|warning|suggestion",
      "message": "Brief description of the issue",
      "originalText": "The exact text that needs fixing",
      "suggestedText": "The corrected version",
      "explanation": "Educational explanation suitable for a high school student (1-2 sentences)",
      "startIndex": 0,
      "endIndex": 10,
      "confidence": 0.95
    }
  ],
  "overallScore": 85,
  "insights": [
    "Overall positive feedback and areas of strength",
    "Key areas for improvement"
  ]
}

Important guidelines:
- Only flag actual errors or significant improvements
- Provide educational explanations that help students learn
- Focus on issues that matter for college applications
- Be encouraging while providing constructive feedback
- Confidence should be between 0.7-1.0 for suggestions you include`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful writing tutor. Always respond with valid JSON matching the requested format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  const result = completion.choices[0].message.content;
  if (!result) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(result);
  
  // Calculate actual start/end indices for suggestions
  parsed.suggestions = parsed.suggestions.map(suggestion => {
    const startIndex = text.toLowerCase().indexOf(suggestion.originalText.toLowerCase());
    return {
      ...suggestion,
      startIndex: startIndex >= 0 ? startIndex : 0,
      endIndex: startIndex >= 0 ? startIndex + suggestion.originalText.length : suggestion.originalText.length
    };
  });

  return parsed;
}

async function analyzeTone(text) {
  const prompt = `You are an expert writing coach specializing in college personal statements. 

Analyze the tone and emotional impact of the following personal statement excerpt:

"${text}"

Evaluate the text for:
1. Overall tone (professional, conversational, formal, casual, passionate, neutral)
2. Confidence level (how self-assured the writing sounds)
3. Sincerity (how genuine and authentic it feels)
4. Engagement (how compelling and interesting it is to read)
5. Emotional impact (how well it conveys emotion and personal growth)

Provide your analysis in this JSON format:
{
  "overall": "professional|conversational|formal|casual|passionate|neutral",
  "confidence": 75,
  "sincerity": 85,
  "engagement": 70,
  "emotionalImpact": 80,
  "recommendations": [
    "Specific actionable advice for improving tone",
    "Additional recommendations"
  ],
  "specificFeedback": [
    "Positive aspects of the current tone",
    "Areas that could be enhanced"
  ]
}

Scores should be 0-100. Focus on what would resonate with college admissions officers.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful writing coach. Always respond with valid JSON matching the requested format.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 1500
  });

  const result = completion.choices[0].message.content;
  if (!result) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(result);
} 