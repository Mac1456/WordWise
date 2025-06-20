import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../stores/documentStore'
import { textAnalysisService, TextAnalysis, TextSuggestion } from '../services/textAnalysisService'
import HighlightedTextArea from './HighlightedTextArea'
import ToneAnalysisPanel from './ToneAnalysisPanel'
import SuggestionTooltip from './SuggestionTooltip'
import { 
  Save, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Lightbulb, 
  Clock,
  Target,
  Type,
  Download,
  Trash2 
} from 'lucide-react'

interface WritingEditorProps {
  documentId?: string
}

export default function WritingEditor({ documentId }: WritingEditorProps) {
  const navigate = useNavigate()
  const { currentDocument, updateDocument, setCurrentDocument, documents, deleteDocument } = useDocumentStore()
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null)
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<TextSuggestion | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wordLimit, setWordLimit] = useState<number | null>(null)
  const [showToneAnalysis, setShowToneAnalysis] = useState(false)
  const [isRunningToneAnalysis, setIsRunningToneAnalysis] = useState(false)
  // Remove unused state - keeping for potential future use
  // const [forceAIAnalysis, setForceAIAnalysis] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (documentId && documents.length > 0) {
      const doc = documents.find(d => d.id === documentId)
      if (doc) {
        setCurrentDocument(doc)
        setContent(doc.content)
        setWordLimit(doc.metadata?.wordLimit || null)
      }
    }
  }, [documentId, documents, setCurrentDocument])

  useEffect(() => {
    if (currentDocument) {
      setContent(currentDocument.content)
      setWordLimit(currentDocument.metadata?.wordLimit || null)
    }
  }, [currentDocument])

  // Auto-save functionality
  const autoSave = useCallback(async (newContent: string) => {
    if (!currentDocument || newContent === currentDocument.content) return
    
    try {
      await updateDocument(currentDocument.id, { content: newContent })
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [currentDocument, updateDocument])

  // Text analysis with debouncing
  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null)
      return
    }

    const analyzeTimer = setTimeout(async () => {
      if (content.trim().length > 10) {
        setIsAnalyzing(true)
        try {
          const writingGoal = 'personal-statement' // Default for now
          const result = await textAnalysisService.analyzeText(content, writingGoal)
          setAnalysis(result)
        } catch (error) {
          console.error('Text analysis failed:', error)
        } finally {
          setIsAnalyzing(false)
        }
      }
    }, 1000) // 1 second debounce

    return () => clearTimeout(analyzeTimer)
  }, [content])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setSelectedSuggestion(null)
    
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    
    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      autoSave(newContent)
    }, 2000) // Auto-save after 2 seconds of inactivity
    
    setAutoSaveTimeout(timeout)
  }

  const handleSave = async () => {
    if (!currentDocument) return
    
    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content })
    } catch (error) {
      console.error('Failed to save document:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleWordLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limit = e.target.value ? parseInt(e.target.value) : null
    setWordLimit(limit)
    if (currentDocument) {
      updateDocument(currentDocument.id, { 
        metadata: { 
          ...currentDocument.metadata, 
          wordLimit: limit || undefined 
        } 
      })
    }
  }

  const handleDownload = () => {
    if (!currentDocument) return

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentDocument.title}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDelete = async () => {
    if (!currentDocument || !window.confirm('Are you sure you want to delete this document?')) return
    
    try {
      await deleteDocument(currentDocument.id)
      // Navigate back to dashboard after successful deletion
      navigate('/dashboard')
    } catch (error) {
      console.error('Failed to delete document:', error)
      // Error is already handled in the store with toast notification
    }
  }

  const applySuggestion = (suggestion: TextSuggestion) => {
    const newContent = 
      content.substring(0, suggestion.startIndex) + 
      suggestion.suggestedText + 
      content.substring(suggestion.endIndex)
    handleContentChange(newContent)
    setSelectedSuggestion(null)
    
    // Track suggestion acceptance for learning
    console.log('Suggestion applied:', {
      type: suggestion.type,
      severity: suggestion.severity,
      originalText: suggestion.originalText,
      suggestedText: suggestion.suggestedText
    })
  }

  const dismissSuggestion = (suggestionId: string, helpful: boolean = false) => {
    if (analysis) {
      const suggestion = analysis.suggestions.find(s => s.id === suggestionId)
      if (suggestion) {
        // Track suggestion feedback for learning
        console.log('Suggestion dismissed:', {
          type: suggestion.type,
          severity: suggestion.severity,
          helpful,
          suggestionId
        })
      }
      
      setAnalysis({
        ...analysis,
        suggestions: analysis.suggestions.filter(s => s.id !== suggestionId)
      })
    }
    setSelectedSuggestion(null)
  }

  const handleToneAnalysis = async () => {
    if (!content.trim() || content.trim().length < 50) {
      alert('Please write at least 50 characters for tone analysis.')
      return
    }

    setIsRunningToneAnalysis(true)
    try {
      const writingGoal = 'personal-statement'
      const result = await textAnalysisService.analyzeText(content, writingGoal, true)
      if (result.toneAnalysis) {
        setAnalysis(result)
        setShowToneAnalysis(true)
      }
    } catch (error) {
      console.error('Tone analysis failed:', error)
      alert('Tone analysis failed. Please try again.')
    } finally {
      setIsRunningToneAnalysis(false)
    }
  }

  const handleManualAIAnalysis = async () => {
    if (!content.trim() || content.trim().length < 20) {
      alert('Please write at least 20 characters for AI analysis.')
      return
    }

    setIsAnalyzing(true)
    try {
      const writingGoal = 'personal-statement'
      const result = await textAnalysisService.analyzeText(content, writingGoal, false)
      setAnalysis(result)
      console.log('Manual AI analysis completed')
    } catch (error) {
      console.error('Manual AI analysis failed:', error)
      alert('AI analysis failed. Please check your OpenAI API key and try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No document selected</p>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const words = content.trim().split(/\s+/).filter(word => word.length > 0)
  const wordCount = analysis?.wordCount || words.length
  const characterCount = analysis?.characterCount || content.length
  const sentences = analysis?.sentenceCount || content.split(/[.!?]+/).filter(s => s.trim().length > 0).length

  // Word limit progress
  const isOverLimit = wordLimit && wordCount > wordLimit
  const limitProgress = wordLimit ? (wordCount / wordLimit) * 100 : 0

  // Group suggestions by type
  const suggestionsByType = analysis?.suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) acc[suggestion.type] = []
    acc[suggestion.type].push(suggestion)
    return acc
  }, {} as Record<string, TextSuggestion[]>) || {}

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-blue-500" />
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-200 bg-red-50 hover:bg-red-100'
      case 'warning': return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100'
      case 'suggestion': return 'border-blue-200 bg-blue-50 hover:bg-blue-100'
      default: return 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    }
  }

  const totalIssues = analysis?.suggestions.length || 0
  const errorCount = analysis?.suggestions.filter(s => s.severity === 'error').length || 0
  const warningCount = analysis?.suggestions.filter(s => s.severity === 'warning').length || 0

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900">
                    {currentDocument.title}
                  </h1>
                  {isAnalyzing && (
                    <div className="flex items-center text-sm text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Analyzing...
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleManualAIAnalysis}
                    disabled={isAnalyzing || content.trim().length < 20}
                    className="flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lightbulb className="h-4 w-4 mr-1" />
                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                  </button>
                  <button
                    onClick={handleToneAnalysis}
                    disabled={isRunningToneAnalysis || content.trim().length < 50}
                    className="flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2H5a1 1 0 110-2h2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12l-1 10H7L6 6z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m10 11 2 2 4-4" />
                    </svg>
                    {isRunningToneAnalysis ? 'Analyzing...' : 'Tone Analysis'}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{wordCount} words</span>
                  {totalIssues > 0 && (
                    <div className="flex items-center space-x-2">
                      {errorCount > 0 && (
                        <span className="flex items-center text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {errorCount} errors
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="flex items-center text-yellow-600">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {warningCount} warnings
                        </span>
                      )}
                    </div>
                  )}
                  <span>Auto-save enabled</span>
                </div>
              </div>
            </div>

            {/* Word limit setting */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Word Limit:
                  <input
                    type="number"
                    value={wordLimit || ''}
                    onChange={handleWordLimitChange}
                    placeholder="e.g., 500"
                    className="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
                {wordLimit && (
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">
                        {wordCount} / {wordLimit} words
                      </span>
                      <span className={`text-sm font-medium ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.round(limitProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isOverLimit ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(limitProgress, 100)}%` }}
                      ></div>
                    </div>
                    {isOverLimit && (
                      <p className="text-xs text-red-600 mt-1">
                        Exceeds limit by {wordCount - wordLimit} words
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Editor */}
            <div className="p-4">
              <HighlightedTextArea
                value={content}
                onChange={handleContentChange}
                suggestions={analysis?.suggestions || []}
                onSuggestionClick={(suggestion) => {
                  setSelectedSuggestion(suggestion)
                  // Calculate tooltip position
                  const rect = document.querySelector('.highlighted-text-area')?.getBoundingClientRect()
                  if (rect) {
                    setTooltipPosition({
                      x: rect.left + suggestion.startIndex * 8, // Rough estimate based on character width
                      y: rect.top + 50 // Position below the text
                    })
                  }
                }}
                placeholder="Start writing your essay here..."
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-base leading-relaxed highlighted-text-area"
              />
            </div>

            {/* Enhanced Stats */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Type className="h-4 w-4 text-gray-400 mr-1" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{wordCount}</div>
                  <div className="text-xs text-gray-500">Words</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Target className="h-4 w-4 text-gray-400 mr-1" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{sentences}</div>
                  <div className="text-xs text-gray-500">Sentences</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <FileText className="h-4 w-4 text-gray-400 mr-1" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{characterCount}</div>
                  <div className="text-xs text-gray-500">Characters</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">
                    {analysis?.averageWordsPerSentence?.toFixed(1) || '0'}
                  </div>
                  <div className="text-xs text-gray-500">Avg Words/Sentence</div>
                </div>
              </div>
            </div>

            {/* Readability Score */}
            {analysis && (
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Readability Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center bg-blue-50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-blue-600">{analysis.readabilityScore}</p>
                    <p className="text-xs text-gray-600">Reading Ease Score</p>
                  </div>
                  <div className="text-center bg-green-50 rounded-lg p-3">
                    <p className="text-lg font-semibold text-green-600">{analysis.readabilityGrade}</p>
                    <p className="text-xs text-gray-600">Grade Level</p>
                  </div>
                  <div className="text-center bg-yellow-50 rounded-lg p-3">
                    <p className="text-lg font-semibold text-yellow-600">{analysis.complexWords}</p>
                    <p className="text-xs text-gray-600">Complex Words</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggestions Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Writing Assistant</h3>
            
            {!analysis?.suggestions.length ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Great work!</p>
                <p className="text-xs text-gray-500 mt-1">
                  {content.trim().length > 10 ? 'No issues found in your writing.' : 'Start writing to see suggestions...'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Grammar Issues */}
                {suggestionsByType.grammar?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                      Grammar ({suggestionsByType.grammar.length})
                    </h4>
                    <div className="space-y-2">
                      {suggestionsByType.grammar.slice(0, 5).map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                          onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.message}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  "{suggestion.originalText.substring(0, 40)}..."
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedSuggestion?.id === suggestion.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              <div className="flex space-x-2">
                                {suggestion.suggestedText !== suggestion.originalText && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      applySuggestion(suggestion)
                                    }}
                                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                                  >
                                    Apply
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissSuggestion(suggestion.id)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spelling Issues */}
                {suggestionsByType.spelling?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                      Spelling ({suggestionsByType.spelling.length})
                    </h4>
                    <div className="space-y-2">
                      {suggestionsByType.spelling.slice(0, 5).map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                          onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {suggestion.message}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedSuggestion?.id === suggestion.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    applySuggestion(suggestion)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                                >
                                  Apply "{suggestion.suggestedText}"
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissSuggestion(suggestion.id)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Style Suggestions */}
                {suggestionsByType.style?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 text-blue-500 mr-1" />
                      Style ({suggestionsByType.style.length})
                    </h4>
                    <div className="space-y-2">
                      {suggestionsByType.style.slice(0, 3).map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                          onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.message}
                                </p>
                                <p className="text-xs text-gray-600 mt-1 truncate">
                                  "{suggestion.originalText.substring(0, 30)}..."
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedSuggestion?.id === suggestion.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              <div className="flex space-x-2">
                                {suggestion.suggestedText !== suggestion.originalText && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      applySuggestion(suggestion)
                                    }}
                                    className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                                  >
                                    Apply
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissSuggestion(suggestion.id)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vocabulary Suggestions */}
                {suggestionsByType.vocabulary?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <svg className="h-4 w-4 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Vocabulary ({suggestionsByType.vocabulary.length})
                    </h4>
                    <div className="space-y-2">
                      {suggestionsByType.vocabulary.slice(0, 3).map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                          onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {suggestion.message}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  "{suggestion.originalText}"
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedSuggestion?.id === suggestion.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              {suggestion.alternatives && (
                                <div className="mb-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Alternatives:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.alternatives.map((alt, index) => (
                                      <button
                                        key={index}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const newSuggestion = { ...suggestion, suggestedText: alt }
                                          applySuggestion(newSuggestion)
                                        }}
                                        className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100"
                                      >
                                        {alt}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissSuggestion(suggestion.id)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Dismiss
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Goal-Aligned Suggestions */}
                {suggestionsByType['goal-alignment']?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <Target className="h-4 w-4 text-green-500 mr-1" />
                      Goal-Aligned ({suggestionsByType['goal-alignment'].length})
                    </h4>
                    <div className="space-y-2">
                      {suggestionsByType['goal-alignment'].slice(0, 3).map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                          onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {getSeverityIcon(suggestion.severity)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {suggestion.message}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {selectedSuggestion?.id === suggestion.id && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-600 mb-2">{suggestion.explanation}</p>
                              <div className="flex space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissSuggestion(suggestion.id)
                                  }}
                                  className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                                >
                                  Got it
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tone Analysis Panel */}
      {showToneAnalysis && analysis?.toneAnalysis && (
        <ToneAnalysisPanel
          toneAnalysis={analysis.toneAnalysis}
          onClose={() => setShowToneAnalysis(false)}
        />
      )}

      {/* Enhanced Suggestion Tooltip */}
      {selectedSuggestion && tooltipPosition && (
        <SuggestionTooltip
          suggestion={selectedSuggestion}
          position={tooltipPosition}
          onApply={() => {
            applySuggestion(selectedSuggestion)
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onClose={() => {
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onDismiss={() => {
            dismissSuggestion(selectedSuggestion.id, false)
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
        />
      )}
    </div>
  )
} 