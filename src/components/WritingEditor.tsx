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
  Trash2,
  CheckCheck,
  Zap,
  BookOpen,
  Scissors
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
  const [analysisMode, setAnalysisMode] = useState<'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment'>('comprehensive')
  const [writingGoal, setWritingGoal] = useState<string>('personal-statement')
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [analysisTimeout, setAnalysisTimeout] = useState<NodeJS.Timeout | null>(null)

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

  // Optimized text analysis with better debouncing and conflict prevention
  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null)
      setIsAutoAnalyzing(false)
      return
    }

    // Clear any existing analysis timeout
    if (analysisTimeout) {
      clearTimeout(analysisTimeout)
    }

    // Skip if already analyzing to prevent conflicts
    if (isAnalyzing || isAutoAnalyzing) {
      return
    }

    const analyzeTimer = setTimeout(async () => {
      if (content.trim().length > 10 && !isAnalyzing && !isAutoAnalyzing) {
        setIsAutoAnalyzing(true)
        try {
          const result = await textAnalysisService.analyzeText(content, writingGoal, false, analysisMode, wordLimit || undefined)
          setAnalysis(result)
        } catch (error) {
          console.error('Auto-analysis failed:', error)
        } finally {
          setIsAutoAnalyzing(false)
        }
      }
    }, 2000) // Increased to 2 seconds for better performance

    setAnalysisTimeout(analyzeTimer)
    return () => {
      clearTimeout(analyzeTimer)
      setAnalysisTimeout(null)
    }
  }, [content, isAnalyzing, isAutoAnalyzing, writingGoal, analysisMode, wordLimit])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Shift+A: Apply all suggestions
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault()
        if (analysis?.suggestions.length && analysis.suggestions.length > 0) {
          if (confirm(`Apply all ${analysis.suggestions.length} suggestions? (Ctrl+Shift+A)`)) {
            applyAllSuggestions()
          }
        }
      }
      
      // Ctrl+Shift+E: Apply all error corrections
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault()
        const errorSuggestions = analysis?.suggestions.filter(s => s.severity === 'error') || []
        if (errorSuggestions.length > 0) {
          if (confirm(`Apply all ${errorSuggestions.length} error corrections? (Ctrl+Shift+E)`)) {
            applyAllSuggestions(errorSuggestions)
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [analysis])

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
    
    // Immediately clear all suggestions to remove highlighting
    setAnalysis(null)
    setSelectedSuggestion(null)
    
    // Apply the change
    setContent(newContent)
    
    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }
    
    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      autoSave(newContent)
    }, 2000)
    setAutoSaveTimeout(timeout)
    
    // Track suggestion acceptance for learning
    console.log('Suggestion applied:', {
      type: suggestion.type,
      severity: suggestion.severity,
      originalText: suggestion.originalText,
      suggestedText: suggestion.suggestedText
    })
    
    // Note: Re-analysis will be triggered automatically by the content change effect
    // with proper debouncing to prevent performance issues
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

  const applyAllSuggestions = async (suggestionsToApply?: TextSuggestion[]) => {
    if (!analysis || !analysis.suggestions.length) return

    const suggestions = suggestionsToApply || analysis.suggestions
    if (suggestions.length === 0) return

    // Immediately clear suggestions to remove highlighting
    setAnalysis(null)
    setSelectedSuggestion(null)

    // Sort suggestions by start index in descending order (end to start)
    // This prevents index conflicts when applying multiple changes
    const sortedSuggestions = [...suggestions].sort((a, b) => b.startIndex - a.startIndex)
    
    let newContent = content
    let appliedCount = 0

    console.log(`Applying ${sortedSuggestions.length} suggestions in bulk...`)

    // Apply all suggestions to the text
    for (const suggestion of sortedSuggestions) {
      // Verify the suggestion is still valid (text hasn't changed)
      const originalText = newContent.substring(suggestion.startIndex, suggestion.endIndex)
      if (originalText === suggestion.originalText) {
        newContent = 
          newContent.substring(0, suggestion.startIndex) + 
          suggestion.suggestedText + 
          newContent.substring(suggestion.endIndex)
        
        appliedCount++
        console.log(`Applied: "${suggestion.originalText}" → "${suggestion.suggestedText}"`)
      } else {
        console.warn(`Skipping suggestion "${suggestion.originalText}" - text has changed`)
      }
    }

    if (appliedCount === 0) {
      alert('No suggestions could be applied. The text may have changed.')
      return
    }

    // Update content
    setContent(newContent)

    // Clear existing timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout)
    }

    // Set new timeout for auto-save
    const timeout = setTimeout(() => {
      autoSave(newContent)
    }, 2000)
    setAutoSaveTimeout(timeout)

    // Show success message
    alert(`Successfully applied ${appliedCount} suggestion${appliedCount === 1 ? '' : 's'}!`)
    
    // Note: Re-analysis will be triggered automatically by the content change effect
    console.log(`Bulk application completed: ${appliedCount} suggestions applied`)
  }

  const applyAllByType = (type: string) => {
    if (!analysis) return
    const suggestionsOfType = analysis.suggestions.filter(s => s.type === type)
    if (suggestionsOfType.length === 0) return
    
    const confirmMessage = `Apply all ${suggestionsOfType.length} ${type} suggestion${suggestionsOfType.length === 1 ? '' : 's'}?`
    if (confirm(confirmMessage)) {
      applyAllSuggestions(suggestionsOfType)
    }
  }

  const applyAllErrors = () => {
    if (!analysis) return
    const errorSuggestions = analysis.suggestions.filter(s => s.severity === 'error')
    if (errorSuggestions.length === 0) return
    
    const confirmMessage = `Apply all ${errorSuggestions.length} error correction${errorSuggestions.length === 1 ? '' : 's'}?`
    if (confirm(confirmMessage)) {
      applyAllSuggestions(errorSuggestions)
    }
  }

  const applyAllSpelling = () => applyAllByType('spelling')
  const applyAllGrammar = () => applyAllByType('grammar')

  const handleToneAnalysis = async () => {
    if (!content.trim() || content.trim().length < 50) {
      alert('Please write at least 50 characters for tone analysis.')
      return
    }

    // Prevent multiple simultaneous analyses
    if (isRunningToneAnalysis || isAnalyzing || isAutoAnalyzing) {
      console.log('Analysis already in progress, skipping tone analysis...')
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

  const runAIAnalysis = async (specificMode?: 'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment') => {
    if (!content.trim() || content.trim().length < 20) {
      alert('Please write at least 20 characters for AI analysis.')
      return
    }

    // Prevent multiple simultaneous analyses
    if (isAnalyzing || isAutoAnalyzing) {
      console.log('Analysis already in progress, skipping...')
      return
    }

    setIsAnalyzing(true)
    
    // Clear existing analysis timeout to prevent conflicts
    if (analysisTimeout) {
      clearTimeout(analysisTimeout)
      setAnalysisTimeout(null)
    }

    const targetMode = specificMode || analysisMode
    try {
      const result = await textAnalysisService.analyzeText(content, writingGoal, false, targetMode, wordLimit || undefined)
      setAnalysis(result)
      console.log(`Manual AI analysis completed (${targetMode})`)
    } catch (error) {
      console.error('Manual AI analysis failed:', error)
      alert('AI analysis failed. Please check your OpenAI API key and try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleManualAIAnalysis = () => runAIAnalysis()

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
  const isAnyAnalysisRunning = isAnalyzing || isAutoAnalyzing || isRunningToneAnalysis

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

            {/* Simplified Controls */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap items-center gap-4">
                {/* Word Limit */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">
                    Limit:
                    <input
                      type="number"
                      value={wordLimit || ''}
                      onChange={handleWordLimitChange}
                      placeholder="500"
                      className="ml-1 w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </label>
                  {wordLimit && (
                    <span className={`text-sm ${isOverLimit ? 'text-red-600' : 'text-green-600'}`}>
                      {wordCount}/{wordLimit}
                    </span>
                  )}
                </div>

                {/* Writing Goal */}
                <select
                  value={writingGoal}
                  onChange={(e) => setWritingGoal(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="personal-statement">Personal Statement</option>
                  <option value="leadership">Leadership</option>
                  <option value="resilience">Resilience</option>
                  <option value="service">Community Service</option>
                  <option value="creativity">Creativity</option>
                  <option value="academic">Academic</option>
                  <option value="personal-growth">Personal Growth</option>
                  <option value="diversity">Diversity</option>
                  <option value="career-goals">Career Goals</option>
                </select>

                {/* Analysis Mode */}
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as any)}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="comprehensive">All Features</option>
                  <option value="grammar-only">Grammar Only</option>
                  <option value="conciseness">Conciseness</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="goal-alignment">Goal Alignment</option>
                </select>

                {/* Quick Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => runAIAnalysis('grammar-only')}
                    disabled={isAnalyzing || content.trim().length < 20}
                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                    title="Grammar Check"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => runAIAnalysis('conciseness')}
                    disabled={isAnalyzing || content.trim().length < 50}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    title="Make Concise"
                  >
                    📝
                  </button>
                  <button
                    onClick={() => runAIAnalysis('vocabulary')}
                    disabled={isAnalyzing || content.trim().length < 50}
                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                    title="Enhance Vocabulary"
                  >
                    📚
                  </button>
                  <button
                    onClick={() => runAIAnalysis('goal-alignment')}
                    disabled={isAnalyzing || content.trim().length < 100}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
                    title="Goal Alignment"
                  >
                    🎯
                  </button>
                </div>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Suggestions</h3>
              <div className="flex items-center space-x-2">
                {isAnyAnalysisRunning && (
                  <div className="flex items-center space-x-1 text-xs text-blue-600">
                    <div className="animate-spin h-3 w-3 border border-blue-600 border-t-transparent rounded-full"></div>
                    <span>Analyzing...</span>
                  </div>
                )}
                {analysis?.suggestions.length ? (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {analysis.suggestions.length}
                  </span>
                ) : null}
              </div>
            </div>
            
            {/* Bulk Action Buttons */}
            {analysis?.suggestions.length && analysis.suggestions.length > 1 && !isAnyAnalysisRunning && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-medium text-gray-700">Quick Actions</div>
                  <div className="text-xs text-gray-500" title="Keyboard shortcuts: Ctrl+Shift+A (Apply All), Ctrl+Shift+E (Fix Errors)">
                    ⌨️ Shortcuts
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (analysis && confirm(`Apply all ${analysis.suggestions.length} suggestions?`)) {
                        applyAllSuggestions()
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors flex items-center justify-center space-x-1"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Apply All ({analysis?.suggestions.length || 0})</span>
                  </button>
                  {errorCount > 0 && (
                    <button
                      onClick={applyAllErrors}
                      className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Zap className="h-3 w-3" />
                      <span>Fix Errors ({errorCount})</span>
                    </button>
                  )}
                </div>
                
                {/* Type-specific buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {suggestionsByType.spelling?.length > 0 && (
                    <button
                      onClick={applyAllSpelling}
                      className="px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Type className="h-3 w-3" />
                      <span>Spelling ({suggestionsByType.spelling.length})</span>
                    </button>
                  )}
                  {suggestionsByType.grammar?.length > 0 && (
                    <button
                      onClick={applyAllGrammar}
                      className="px-3 py-2 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>Grammar ({suggestionsByType.grammar.length})</span>
                    </button>
                  )}
                  {suggestionsByType.vocabulary?.length > 0 && (
                    <button
                      onClick={() => applyAllByType('vocabulary')}
                      className="px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Lightbulb className="h-3 w-3" />
                      <span>Vocabulary ({suggestionsByType.vocabulary.length})</span>
                    </button>
                  )}
                  {suggestionsByType.conciseness?.length > 0 && (
                    <button
                      onClick={() => applyAllByType('conciseness')}
                      className="px-3 py-2 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 transition-colors flex items-center justify-center space-x-1"
                    >
                      <Scissors className="h-3 w-3" />
                      <span>Concise ({suggestionsByType.conciseness.length})</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            {!analysis?.suggestions.length ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Great work!</p>
                <p className="text-xs text-gray-500 mt-1">
                  {content.trim().length > 10 ? 'No issues found in your writing.' : 'Start writing to see suggestions...'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* All Suggestions - Simplified */}
                {analysis.suggestions.slice(0, 10).map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${getSeverityColor(suggestion.severity)}`}
                    onClick={() => setSelectedSuggestion(suggestion.id === selectedSuggestion?.id ? null : suggestion)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                        {getSeverityIcon(suggestion.severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              suggestion.type === 'grammar' ? 'bg-red-100 text-red-700' :
                              suggestion.type === 'vocabulary' ? 'bg-purple-100 text-purple-700' :
                              suggestion.type === 'conciseness' ? 'bg-blue-100 text-blue-700' :
                              suggestion.type === 'goal-alignment' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {suggestion.type.replace('-', ' ')}
                            </span>
                            {suggestion.wordsSaved && (
                              <span className="text-xs text-green-600">-{suggestion.wordsSaved}w</span>
                            )}
                          </div>
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
                        <p className="text-xs text-gray-600 mb-3 break-words">{suggestion.explanation}</p>
                        {suggestion.originalText !== suggestion.suggestedText && (
                          <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                            <div className="text-gray-500 mb-1">Suggested:</div>
                            <div className="text-gray-900 break-words">{suggestion.suggestedText}</div>
                          </div>
                        )}
                        {suggestion.alternatives && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Alternatives:</div>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.alternatives.slice(0, 3).map((alt, index) => (
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
                              applySuggestion(suggestion)
                            }}
                            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                          >
                            Apply
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