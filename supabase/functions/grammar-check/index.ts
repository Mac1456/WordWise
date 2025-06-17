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

    const { content, documentId } = await req.json()

    // Grammar checking patterns
    const grammarSuggestions = getGrammarSuggestions(content, documentId, user.id)

    return new Response(
      JSON.stringify({ suggestions: grammarSuggestions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Grammar check failed:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

function getGrammarSuggestions(content: string, documentId: string, userId: string) {
  const suggestions: any[] = []

  const grammarPatterns = [
    {
      regex: /\bi\b/g,
      replacement: 'I',
      type: 'grammar',
      explanation: 'Personal pronoun "I" should always be capitalized',
      confidence: 0.95
    },
    {
      regex: /([.!?])\s*([a-z])/g,
      type: 'grammar',
      explanation: 'Sentence should start with a capital letter',
      confidence: 0.9
    },
    {
      regex: /\b(there|their|they\'re)\b/gi,
      type: 'grammar',
      explanation: 'Check there/their/they\'re usage',
      confidence: 0.7
    },
    {
      regex: /\b(its|it\'s)\b/gi,
      type: 'grammar',
      explanation: 'Check its/it\'s usage - "its" is possessive, "it\'s" is "it is"',
      confidence: 0.8
    },
    {
      regex: /\b(your|you\'re)\b/gi,
      type: 'grammar',
      explanation: 'Check your/you\'re usage - "your" is possessive, "you\'re" is "you are"',
      confidence: 0.8
    }
  ]

  grammarPatterns.forEach((pattern, index) => {
    let match
    while ((match = pattern.regex.exec(content)) !== null) {
      let replacement = pattern.replacement || match[0]
      
      if (pattern.regex.source.includes('([.!?])')) {
        replacement = match[1] + ' ' + match[2].toUpperCase()
      }

      suggestions.push({
        id: `grammar-${index}-${match.index}`,
        document_id: documentId,
        user_id: userId,
        type: pattern.type,
        text: match[0],
        replacement,
        explanation: pattern.explanation,
        position: { start: match.index, end: match.index + match[0].length },
        confidence: pattern.confidence,
        accepted: false,
        dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }
  })

  return suggestions.slice(0, 10)
} 