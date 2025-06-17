import { X, Check } from 'lucide-react'
import { Suggestion } from '../types/supabase'

interface SuggestionTooltipProps {
  suggestion: Suggestion
  position: { x: number; y: number }
  onApply: () => void
  onClose: () => void
}

export default function SuggestionTooltip({ 
  suggestion, 
  position, 
  onApply, 
  onClose 
}: SuggestionTooltipProps) {
  const getTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'grammar': return 'border-red-400 bg-red-50'
      case 'style': return 'border-blue-400 bg-blue-50'
      case 'vocabulary': return 'border-green-400 bg-green-50'
      case 'tone': return 'border-purple-400 bg-purple-50'
      case 'conciseness': return 'border-yellow-400 bg-yellow-50'
      case 'goal-alignment': return 'border-orange-400 bg-orange-50'
      default: return 'border-gray-400 bg-gray-50'
    }
  }

  return (
    <div
      className={`absolute z-50 w-80 p-4 bg-white border-2 rounded-lg shadow-lg ${getTypeColor(suggestion.type)}`}
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: position.y + 10,
        maxWidth: '320px'
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 text-xs bg-white rounded-full font-medium capitalize">
            {suggestion.type}
          </span>
          <span className="text-xs text-gray-500">
            {Math.round(suggestion.confidence * 100)}% confidence
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white rounded-full transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{suggestion.explanation}</p>
      
      <div className="space-y-2 mb-4">
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Original:</span>
          <div className="mt-1 p-2 bg-red-50 rounded text-sm font-mono">
            {suggestion.text}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-500 uppercase tracking-wide">Suggested:</span>
          <div className="mt-1 p-2 bg-green-50 rounded text-sm font-mono">
            {suggestion.replacement}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onApply}
          className="flex items-center space-x-1 px-3 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
        >
          <Check className="h-4 w-4" />
          <span>Apply Suggestion</span>
        </button>
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm text-gray-600 hover:bg-white rounded-md transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
} 