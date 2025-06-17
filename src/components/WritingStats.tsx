import { BarChart3, FileText, Clock, Target } from 'lucide-react'
import { Document } from '../stores/documentStore'

interface WritingStatsProps {
  document: Document
}

export default function WritingStats({ document }: WritingStatsProps) {
  const readabilityScore = calculateReadabilityScore(document.content)
  const sentenceCount = document.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length
  const avgWordsPerSentence = sentenceCount > 0 ? Math.round(document.wordCount / sentenceCount) : 0
  const wordLimit = 650
  const wordProgress = (document.wordCount / wordLimit) * 100

  function calculateReadabilityScore(content: string): number {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const complexWords = words.filter(word => word.length > 6).length
    
    if (sentences.length === 0) return 0
    
    const avgSentenceLength = words.length / sentences.length
    const avgComplexWords = (complexWords / words.length) * 100
    
    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * (avgComplexWords / 100))
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const getReadabilityLabel = (score: number) => {
    if (score >= 90) return { label: 'Very Easy', color: 'text-green-600' }
    if (score >= 80) return { label: 'Easy', color: 'text-green-500' }
    if (score >= 70) return { label: 'Fairly Easy', color: 'text-blue-500' }
    if (score >= 60) return { label: 'Standard', color: 'text-yellow-500' }
    if (score >= 50) return { label: 'Fairly Difficult', color: 'text-orange-500' }
    if (score >= 30) return { label: 'Difficult', color: 'text-red-500' }
    return { label: 'Very Difficult', color: 'text-red-600' }
  }

  const readabilityInfo = getReadabilityLabel(readabilityScore)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center space-x-2 mb-4">
        <BarChart3 className="h-5 w-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">Writing Statistics</h3>
      </div>
      
      <div className="space-y-4">
        {/* Word Count */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Word Count</span>
            <span className={`text-sm font-semibold ${
              document.wordCount > wordLimit ? 'text-red-600' : 
              document.wordCount > wordLimit * 0.9 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {document.wordCount} / {wordLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                wordProgress > 100 ? 'bg-red-500' : 
                wordProgress > 90 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(wordProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Readability Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Readability</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">{readabilityScore}/100</div>
            <div className={`text-xs ${readabilityInfo.color}`}>{readabilityInfo.label}</div>
          </div>
        </div>

        {/* Sentence Analysis */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Avg Words/Sentence</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-gray-900">{avgWordsPerSentence}</div>
            <div className="text-xs text-gray-500">
              {avgWordsPerSentence > 20 ? 'Too long' : 
               avgWordsPerSentence > 15 ? 'Good length' : 'Concise'}
            </div>
          </div>
        </div>

        {/* Sentence Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Sentences</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{sentenceCount}</span>
        </div>

        {/* Progress Indicator */}
        <div className="pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2">Writing Progress</div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1">
              <div 
                className="h-1 bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((document.wordCount / 200) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">
              {document.wordCount < 200 ? 'Getting started' : 
               document.wordCount < 400 ? 'Building momentum' : 
               document.wordCount < 600 ? 'Strong progress' : 'Nearly complete'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 