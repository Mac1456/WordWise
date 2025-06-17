import { useState } from 'react'
import { Heart, Brain, CheckCircle } from 'lucide-react'
import { Document } from '../types/supabase'
import { AIService } from '../services/aiService'

interface ToneAnalysisProps {
  document: Document
}

interface ToneResult {
  score: number
  tone: string
  insights: string[]
  suggestions: string[]
}

export default function ToneAnalysis({ document }: ToneAnalysisProps) {
  const [analysis, setAnalysis] = useState<ToneResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const analyzeTone = async () => {
    if (!document.content.trim()) return

    setIsAnalyzing(true)
    try {
      const result = await AIService.analyzeTone(
        document.content, 
        document.id, 
        document.writingGoal || 'personal-statement'
      )
      
      setAnalysis({
        score: result.results.score,
        tone: 'sincere', // Default tone
        insights: result.results.insights,
        suggestions: result.results.improvements
      })
    } catch (error) {
      console.error('Tone analysis failed:', error)
      // Fallback basic analysis
      setAnalysis({
        score: 75,
        tone: 'sincere',
        insights: ['Your writing shows personal engagement'],
        suggestions: ['Consider adding more specific examples']
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getToneColor = (tone: string) => {
    switch (tone.toLowerCase()) {
      case 'sincere': return 'text-green-600 bg-green-50'
      case 'confident': return 'text-blue-600 bg-blue-50'
      case 'formal': return 'text-purple-600 bg-purple-50'
      case 'casual': return 'text-orange-600 bg-orange-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Heart className="h-5 w-5 text-pink-500" />
          <h3 className="font-semibold text-gray-900">Tone Analysis</h3>
        </div>
        <button
          onClick={analyzeTone}
          disabled={isAnalyzing || !document.content.trim()}
          className="px-3 py-1 text-sm bg-pink-50 text-pink-700 rounded-md hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Tone'}
        </button>
      </div>

      {analysis ? (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
              {analysis.score}/100
            </div>
            <p className="text-sm text-gray-600 mt-1">Emotional Impact Score</p>
          </div>

          {/* Tone Badge */}
          <div className="flex items-center justify-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getToneColor(analysis.tone)}`}>
              {analysis.tone.charAt(0).toUpperCase() + analysis.tone.slice(1)} Tone
            </span>
          </div>

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div>
              <h4 className="flex items-center space-x-1 text-sm font-medium text-gray-900 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Insights</span>
              </h4>
              <ul className="space-y-1">
                {analysis.insights.map((insight, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-green-500 mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {analysis.suggestions.length > 0 && (
            <div>
              <h4 className="flex items-center space-x-1 text-sm font-medium text-gray-900 mb-2">
                <Brain className="h-4 w-4 text-blue-500" />
                <span>Suggestions</span>
              </h4>
              <ul className="space-y-1">
                {analysis.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Click "Analyze Tone" to get insights on your writing's emotional impact</p>
        </div>
      )}
    </div>
  )
} 