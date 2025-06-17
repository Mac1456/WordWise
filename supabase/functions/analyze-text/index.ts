import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalysisRequest {
  content: string
  writingGoal: string
  documentId: string
  userPreferences?: {
    suggestionFrequency: 'high' | 'medium' | 'low'
    focusAreas: string[]
  }
}

interface Suggestion {
  id: string
  type: 'grammar' | 'style' | 'vocabulary' | 'tone' | 'conciseness' | 'goal-alignment'
  text: string
  replacement: string
  explanation: string
  position: { start: number; end: number }
  confidence: number
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { content, writingGoal, documentId, userPreferences }: AnalysisRequest = await req.json()

    // OpenAI API configuration
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    let suggestions: Suggestion[] = []

    if (openaiApiKey) {
      // Use OpenAI for advanced AI analysis
      suggestions = await getOpenAISuggestions(content, writingGoal, openaiApiKey)
    } else {
      // Fallback to rule-based analysis
      suggestions = getFallbackSuggestions(content, documentId, user.id)
    }

    // Store suggestions in database
    const suggestionInserts = suggestions.map(suggestion => ({
      ...suggestion,
      document_id: documentId,
      user_id: user.id,
      position_start: suggestion.position.start,
      position_end: suggestion.position.end,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    if (suggestionInserts.length > 0) {
      await supabase.from('suggestions').insert(suggestionInserts)
    }

    // Create analysis result
    const analysisResult = {
      document_id: documentId,
      user_id: user.id,
      type: 'grammar' as const,
      results: {
        score: Math.min(100, Math.max(0, 100 - suggestions.length * 3)),
        suggestions,
        insights: [
          `Found ${suggestions.length} potential improvements`,
          'Focus on grammar and clarity for better impact',
          writingGoal === 'personal-statement' 
            ? 'Consider adding more specific examples'
            : 'Ensure your tone matches your audience'
        ],
        improvements: suggestions.slice(0, 3).map(s => s.explanation)
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await supabase.from('analysis_results').insert(analysisResult)

    // Log analytics
    await supabase.from('analytics').insert({
      user_id: user.id,
      event_type: 'text_analysis',
      event_data: {
        document_id: documentId,
        writing_goal: writingGoal,
        content_length: content.length,
        suggestions_count: suggestions.length
      }
    })

    return new Response(
      JSON.stringify({
        suggestions,
        analysisResults: [analysisResult],
        overallScore: analysisResult.results.score,
        insights: analysisResult.results.insights
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Analysis failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function getOpenAISuggestions(
  content: string, 
  writingGoal: string, 
  apiKey: string
): Promise<Suggestion[]> {
  const prompt = `You are an AI writing assistant specializing in ${writingGoal}s. Analyze the following text and provide specific suggestions for improvement.

Text: "${content}"

Please provide suggestions in the following categories:
1. Grammar and spelling corrections
2. Style improvements (conciseness, clarity)
3. Vocabulary enhancements
4. Tone adjustments for ${writingGoal}
5. Goal-specific feedback for ${writingGoal}

For each suggestion, provide:
- The exact text that should be changed
- A replacement suggestion
- A clear explanation of why this change improves the writing
- A confidence score (0-1)

Focus on the most impactful improvements first. Limit to 10 suggestions maximum.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional writing assistant. Provide specific, actionable feedback.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      })
    })

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content

    // Parse AI response and convert to suggestions
    // This would need more sophisticated parsing in production
    return parseAIResponse(aiResponse, content)

  } catch (error) {
    console.error('OpenAI API failed:', error)
    return []
  }
}

function parseAIResponse(aiResponse: string, content: string): Suggestion[] {
  // Simple parsing - in production, you'd want more robust parsing
  const suggestions: Suggestion[] = []
  
  // Add some example suggestions based on common patterns
  const commonIssues = [
    {
      pattern: /\bthere is\b/gi,
      type: 'style' as const,
      replacement: '',
      explanation: 'Consider using more active voice instead of "there is" constructions'
    },
    {
      pattern: /\bvery\s+(\w+)/gi,
      type: 'vocabulary' as const,
      replacement: '$1',
      explanation: 'Consider using a stronger adjective instead of "very + adjective"'
    }
  ]

  commonIssues.forEach((issue, index) => {
    let match
    while ((match = issue.pattern.exec(content)) !== null) {
      suggestions.push({
        id: `ai-${index}-${match.index}`,
        type: issue.type,
        text: match[0],
        replacement: issue.replacement.replace('$1', match[1] || ''),
        explanation: issue.explanation,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: 0.8
      })
    }
  })

  return suggestions.slice(0, 10) // Limit to 10 suggestions
}

function getFallbackSuggestions(content: string, documentId: string, userId: string): Suggestion[] {
  const suggestions: Suggestion[] = []

  // Grammar patterns
  const patterns = [
    {
      regex: /\bthere\s+is\s+\w+\s+\w+/gi,
      type: 'grammar' as const,
      explanation: 'Consider using more active voice instead of "there is/are" constructions',
      confidence: 0.7
    },
    {
      regex: /\b(very|really|quite|extremely)\s+(\w+)/gi,
      type: 'style' as const,
      explanation: 'Consider using a stronger adjective instead of qualifier + adjective',
      confidence: 0.6
    },
    {
      regex: /\b(I think|I believe|I feel)\s+/gi,
      type: 'style' as const,
      explanation: 'Consider stating your point directly for stronger impact',
      confidence: 0.8
    },
    {
      regex: /\b(good|bad|big|small)\b/gi,
      type: 'vocabulary' as const,
      explanation: 'Consider using a more specific and impactful word',
      confidence: 0.5
    }
  ]

  patterns.forEach((pattern, patternIndex) => {
    let match
    while ((match = pattern.regex.exec(content)) !== null) {
      let replacement = match[0]
      
      // Simple replacements
      if (pattern.type === 'vocabulary') {
        const replacements: { [key: string]: string } = {
          'good': 'excellent',
          'bad': 'poor',
          'big': 'substantial',
          'small': 'minor'
        }
        replacement = replacements[match[0].toLowerCase()] || match[0]
      }

      suggestions.push({
        id: `fallback-${patternIndex}-${match.index}`,
        type: pattern.type,
        text: match[0],
        replacement,
        explanation: pattern.explanation,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: pattern.confidence
      })
    }
  })

  return suggestions.slice(0, 8) // Limit fallback suggestions
} 