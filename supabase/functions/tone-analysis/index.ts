import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { content, documentId, writingGoal } = await req.json()

    const toneAnalysis = analyzeTone(content, writingGoal)

    // Store analysis result
    const analysisResult = {
      document_id: documentId,
      user_id: user.id,
      type: 'tone',
      results: toneAnalysis,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await supabase.from('analysis_results').insert(analysisResult)

    return new Response(
      JSON.stringify(analysisResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Tone analysis failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function analyzeTone(content: string, writingGoal: string) {
  const words = content.toLowerCase().split(/\s+/)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const totalWords = words.length

  // Personal statement specific analysis
  const personalWords = words.filter(word => 
    ['i', 'me', 'my', 'myself', 'mine'].includes(word)
  ).length

  const emotionalWords = words.filter(word => 
    ['passionate', 'excited', 'determined', 'committed', 'inspired', 'motivated', 
     'proud', 'accomplished', 'challenged', 'overcome', 'learned', 'grew'].includes(word)
  ).length

  const actionWords = words.filter(word =>
    ['achieved', 'led', 'created', 'developed', 'improved', 'organized', 
     'initiated', 'managed', 'collaborated', 'contributed'].includes(word)
  ).length

  const formalWords = words.filter(word =>
    ['furthermore', 'moreover', 'consequently', 'nevertheless', 'therefore', 
     'additionally', 'specifically', 'particularly'].includes(word)
  ).length

  // Calculate metrics
  const personalRatio = personalWords / totalWords
  const emotionalRatio = emotionalWords / totalWords
  const actionRatio = actionWords / totalWords
  const formalRatio = formalWords / totalWords

  // Determine primary tone
  let primaryTone = 'neutral'
  let score = 70

  if (personalRatio > 0.08) {
    primaryTone = 'personal'
    score += 10
  }

  if (emotionalRatio > 0.03) {
    primaryTone = primaryTone === 'personal' ? 'passionate' : 'emotional'
    score += 15
  }

  if (actionRatio > 0.02) {
    score += 10
  }

  if (formalRatio > 0.01) {
    primaryTone = primaryTone === 'neutral' ? 'formal' : primaryTone
    score += 5
  }

  // Generate insights
  const insights = []
  const improvements = []

  if (personalRatio < 0.05 && writingGoal === 'personal-statement') {
    insights.push('Consider adding more personal perspective to make your statement more engaging')
    improvements.push('Use more first-person language to tell your story')
  } else if (personalRatio > 0.05) {
    insights.push('Good use of personal language - your voice comes through clearly')
  }

  if (emotionalRatio > 0.02) {
    insights.push('Your writing shows emotional engagement and passion')
  } else {
    insights.push('Consider adding more emotional depth to connect with readers')
    improvements.push('Share how experiences made you feel or what you learned')
  }

  if (actionRatio > 0.015) {
    insights.push('Strong use of action words that demonstrate your achievements')
  } else {
    improvements.push('Add more action words to showcase your accomplishments')
  }

  const avgSentenceLength = totalWords / sentences.length
  if (avgSentenceLength > 25) {
    insights.push('Some sentences may be too long - consider breaking them up')
    improvements.push('Vary sentence length for better flow and readability')
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    primaryTone,
    metrics: {
      personalRatio: Math.round(personalRatio * 100),
      emotionalRatio: Math.round(emotionalRatio * 100),
      actionRatio: Math.round(actionRatio * 100),
      formalRatio: Math.round(formalRatio * 100),
      avgSentenceLength: Math.round(avgSentenceLength)
    },
    insights,
    improvements,
    suggestions: [] // Can be populated with specific tone suggestions
  }
} 