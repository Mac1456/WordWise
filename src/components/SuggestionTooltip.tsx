import { X, Check, BookOpen, Lightbulb, AlertCircle } from 'lucide-react'
import { TextSuggestion } from '../services/textAnalysisService'

interface SuggestionTooltipProps {
  suggestion: TextSuggestion
  position: { x: number; y: number }
  onApply: (alternativeText?: string) => void
  onClose: () => void
  onDismiss?: () => void
}

export default function SuggestionTooltip({ 
  suggestion, 
  position, 
  onApply, 
  onClose,
  onDismiss
}: SuggestionTooltipProps) {
  const getTypeColor = (type: TextSuggestion['type']) => {
    switch (type) {
      case 'grammar': return 'border-red-400 bg-red-50'
      case 'spelling': return 'border-red-300 bg-red-50'
      case 'style': return 'border-blue-400 bg-blue-50'
      case 'vocabulary': return 'border-green-400 bg-green-50'
      case 'goal-alignment': return 'border-orange-400 bg-orange-50'
      default: return 'border-gray-400 bg-gray-50'
    }
  }
  
  const getTypeIcon = (type: TextSuggestion['type']) => {
    switch (type) {
      case 'grammar':
      case 'spelling':
        return <AlertCircle className="h-4 w-4" />
      case 'vocabulary':
        return <BookOpen className="h-4 w-4" />
      case 'style':
      case 'goal-alignment':
        return <Lightbulb className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }
  
  const getSeverityBadgeColor = (severity: TextSuggestion['severity']) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'suggestion': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Calculate optimal position to prevent overflow
  const tooltipWidth = 320;
  const tooltipHeight = 400; // Approximate height
  const margin = 10;
  
  const optimalX = Math.min(
    Math.max(margin, position.x), 
    window.innerWidth - tooltipWidth - margin
  );
  
  const optimalY = position.y + tooltipHeight > window.innerHeight 
    ? position.y - tooltipHeight - margin // Show above if not enough space below
    : position.y + margin; // Show below

  return (
    <div
      className={`fixed z-50 w-80 max-w-sm p-4 bg-white border-2 rounded-lg shadow-xl ${getTypeColor(suggestion.type)}`}
      style={{
        left: optimalX,
        top: Math.max(margin, optimalY),
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-wrap">
          {getTypeIcon(suggestion.type)}
          <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${getSeverityBadgeColor(suggestion.severity)}`}>
            {suggestion.type.replace('-', ' ')}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityBadgeColor(suggestion.severity)}`}>
            {suggestion.severity}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white rounded-full transition-colors flex-shrink-0"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      {/* Issue Description */}
      <div className="mb-3">
        <p className="text-sm text-gray-700 font-medium break-words">{suggestion.message}</p>
      </div>
      
      {/* Educational Explanation */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <BookOpen className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-600 font-medium mb-1">Why this matters:</p>
            <p className="text-sm text-blue-800 break-words">{suggestion.explanation}</p>
          </div>
        </div>
      </div>
      
      {/* Original vs Suggested Text */}
      {suggestion.originalText !== suggestion.suggestedText && (
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Original:</span>
            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm break-words max-h-20 overflow-y-auto">
              {suggestion.originalText}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Suggested:</span>
            <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-sm break-words max-h-20 overflow-y-auto">
              {suggestion.suggestedText}
            </div>
          </div>
        </div>
      )}
      
      {/* Vocabulary alternatives */}
      {suggestion.alternatives && suggestion.alternatives.length > 0 && (
        <div className="mb-4">
          <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Alternatives:</span>
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.alternatives.slice(0, 5).map((alt, index) => (
              <button
                key={index}
                onClick={() => {
                  console.log('SuggestionTooltip: Applying alternative:', alt)
                  // Apply alternative by passing it to onApply
                  onApply(alt);
                }}
                className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100 break-words"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        {suggestion.originalText !== suggestion.suggestedText && (
          <button
            onClick={() => onApply()}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Apply</span>
          </button>
        )}
        <div className="flex items-center space-x-2">
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Dismiss
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 