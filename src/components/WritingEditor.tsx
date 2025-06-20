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
  Target,
  BookOpen,
  Download,
  Trash2,
  CheckCheck,
  Zap,
  Sparkles,
  BrainCircuit,
  ArrowRight,
  X
} from 'lucide-react'

interface WritingEditorProps {
  documentId?: string
}

export default function WritingEditor({ documentId }: WritingEditorProps) {
  const navigate = useNavigate()
  const { 
    currentDocument, 
    loadDocuments, 
    updateDocument, 
    deleteDocument,
    setCurrentDocument 
  } = useDocumentStore()

  const [content, setContent] = useState('')
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<TextSuggestion | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [showToneAnalysis, setShowToneAnalysis] = useState(false)
  const [isRunningToneAnalysis, setIsRunningToneAnalysis] = useState(false)

  // Load document
  useEffect(() => {
    if (documentId) {
      loadDocuments().then(() => {
        const doc = useDocumentStore.getState().documents.find(d => d.id === documentId)
        if (doc) {
          setCurrentDocument(doc)
          setContent(doc.content || '')
        }
      })
    }
  }, [documentId, loadDocuments, setCurrentDocument])

  // Debounced analysis effect
  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      if (content.trim().length < 10) return

      setIsAutoAnalyzing(true)
      try {
        const result = await textAnalysisService.analyzeTextInstant(content)
        setAnalysis(result)
      } catch (error) {
        console.error('Auto-analysis failed:', error)
      } finally {
        setIsAutoAnalyzing(false)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [content])

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
  }

  const handleSave = async () => {
    if (!currentDocument) return
    
    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content })
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
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
    if (!currentDocument) return
    
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        await deleteDocument(currentDocument.id)
        navigate('/dashboard')
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }

  const applySuggestion = (suggestion: TextSuggestion) => {
    const beforeText = content.slice(0, suggestion.startIndex)
    const afterText = content.slice(suggestion.endIndex)
    const newContent = beforeText + suggestion.suggestedText + afterText
    
    setContent(newContent)
    
    if (analysis) {
      const updatedSuggestions = analysis.suggestions.filter(s => s.id !== suggestion.id)
      setAnalysis({ ...analysis, suggestions: updatedSuggestions })
    }
  }

  const dismissSuggestion = (suggestionId: string) => {
    if (analysis) {
      const updatedSuggestions = analysis.suggestions.filter(s => s.id !== suggestionId)
      setAnalysis({ ...analysis, suggestions: updatedSuggestions })
    }
  }

  const applyAllSuggestions = () => {
    if (!analysis?.suggestions.length) return
    
    const sortedSuggestions = [...analysis.suggestions].sort((a, b) => b.startIndex - a.startIndex)
    
    let newContent = content
    sortedSuggestions.forEach(suggestion => {
      const beforeText = newContent.slice(0, suggestion.startIndex)
      const afterText = newContent.slice(suggestion.endIndex)
      newContent = beforeText + suggestion.suggestedText + afterText
    })
    
    setContent(newContent)
    setAnalysis({ ...analysis, suggestions: [] })
  }

  const handleToneAnalysis = async () => {
    if (content.length < 50) return
    
    setIsRunningToneAnalysis(true)
    try {
      const toneAnalysis = await textAnalysisService.analyzeToneOnly(content)
      setAnalysis(prev => prev ? { ...prev, toneAnalysis } : {
        suggestions: [],
        readabilityScore: 0,
        readabilityGrade: 'N/A',
        wordCount: content.trim().split(/\s+/).filter(w => w.length > 0).length,
        sentenceCount: content.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        characterCount: content.length,
        averageWordsPerSentence: 0,
        complexWords: 0,
        toneAnalysis
      })
      setShowToneAnalysis(true)
    } catch (error) {
      console.error('Tone analysis failed:', error)
    } finally {
      setIsRunningToneAnalysis(false)
    }
  }

  const handleManualAIAnalysis = async () => {
    if (!content || isAnalyzing) return
    
    setIsAnalyzing(true)
    try {
      const result = await textAnalysisService.analyzeText(content)
      setAnalysis(result)
    } catch (error) {
      console.error('Manual analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSuggestionCardProps = (suggestion: TextSuggestion) => {
    switch (suggestion.type) {
      case 'spelling':
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800',
        }
      case 'grammar':
        return {
          icon: <CheckCircle className="h-4 w-4 text-yellow-500" />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          titleColor: 'text-yellow-800',
        }
      case 'style':
        return {
          icon: <Sparkles className="h-4 w-4 text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-800',
        }
      case 'vocabulary':
        return {
          icon: <Lightbulb className="h-4 w-4 text-purple-500" />,
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          titleColor: 'text-purple-800',
        }
      default:
        return {
          icon: <CheckCircle className="h-4 w-4 text-gray-500" />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          titleColor: 'text-gray-800',
        }
    }
  }

  const SuggestionCard = ({ suggestion }: { suggestion: TextSuggestion }) => {
    const cardProps = getSuggestionCardProps(suggestion)
    
    return (
      <div className={`p-3 rounded-lg border transition-all ${cardProps.borderColor} ${cardProps.bgColor}`}>
        <div className="flex items-start">
          <div className="mr-2 flex-shrink-0">{cardProps.icon}</div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${cardProps.titleColor} capitalize`}>
              {suggestion.type.replace('-', ' ')}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              {suggestion.message}
            </p>
          </div>
          <button 
            onClick={() => dismissSuggestion(suggestion.id)} 
            className="p-1 -mr-1 -mt-1 rounded-full text-gray-400 hover:bg-gray-200"
          >
            <X size={14} />
          </button>
        </div>
        
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="line-through text-gray-500 truncate">
            {suggestion.originalText}
          </span>
          <ArrowRight size={12} className="text-gray-400 flex-shrink-0" />
          <span className="font-medium text-green-600 truncate">
            {suggestion.suggestedText}
          </span>
        </div>
        
        <div className="mt-3 flex gap-2">
          <button 
            onClick={() => dismissSuggestion(suggestion.id)} 
            className="flex-1 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
          >
            Dismiss
          </button>
          <button 
            onClick={() => applySuggestion(suggestion)} 
            className="flex-1 px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No Document Selected</h2>
          <p className="text-gray-500 mt-2">Please select a document to begin editing.</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const words = content.trim().split(/\s+/).filter(word => word.length > 0)
  const wordCount = analysis?.wordCount || words.length

  return (
    <div className="h-full flex bg-gray-50">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Stats Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <BookOpen size={14} />
              <span>{wordCount} words</span>
            </div>
            <div className="flex items-center space-x-1">
              <Target size={14} />
              <span>{Math.ceil(wordCount / 200)} min read</span>
            </div>
            <div className="flex items-center space-x-1">
              <BrainCircuit size={14} />
              <span>Clarity: {analysis?.readabilityScore ? Math.round(analysis.readabilityScore) : 'N/A'}/100</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToneAnalysis}
              disabled={isRunningToneAnalysis || content.length < 50}
              className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isRunningToneAnalysis ? 'Analyzing...' : 'Tone Analysis'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDownload}
              className="p-1 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
              title="Download"
            >
              <Download size={16} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-red-500 bg-red-100 rounded hover:bg-red-200"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 overflow-hidden">
          <HighlightedTextArea
            value={content}
            onChange={handleContentChange}
            suggestions={analysis?.suggestions || []}
            onSuggestionClick={(suggestion, element) => {
              const rect = element.getBoundingClientRect()
              setSelectedSuggestion(suggestion)
              setTooltipPosition({ x: rect.left + window.scrollX, y: rect.bottom + window.scrollY })
            }}
            placeholder="Start writing your personal statement..."
            className="w-full h-full p-6 text-lg leading-relaxed text-gray-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Suggestions Panel */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Sparkles className="mr-2 text-purple-500" size={20} />
              Suggestions
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={handleManualAIAnalysis}
                disabled={isAutoAnalyzing || isAnalyzing}
                className="p-2 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 disabled:opacity-50"
                title="Run AI Analysis"
              >
                <Zap size={14} />
              </button>
              <button
                onClick={applyAllSuggestions}
                disabled={!analysis?.suggestions?.length}
                className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 disabled:opacity-50"
                title={`Apply All ${analysis?.suggestions?.length || 0} Suggestions`}
              >
                <CheckCheck size={14} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {analysis?.suggestions?.length ? (
            <div className="space-y-3">
              {analysis.suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {isAutoAnalyzing || isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-sm">Analyzing your text...</p>
                </>
              ) : (
                <>
                  <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                  <h3 className="font-medium text-gray-700">All Clear!</h3>
                  <p className="text-sm mt-1">No suggestions at the moment.</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {selectedSuggestion && tooltipPosition && (
        <SuggestionTooltip
          suggestion={selectedSuggestion}
          position={tooltipPosition}
          onApply={() => {
            if (selectedSuggestion) applySuggestion(selectedSuggestion)
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onClose={() => {
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onDismiss={() => {
            if (selectedSuggestion) dismissSuggestion(selectedSuggestion.id)
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
        />
      )}
      
      {/* Tone Analysis Panel */}
      {showToneAnalysis && analysis?.toneAnalysis && (
        <ToneAnalysisPanel
          toneAnalysis={analysis.toneAnalysis}
          isLoading={isRunningToneAnalysis}
          onClose={() => setShowToneAnalysis(false)}
        />
      )}
    </div>
  )
}