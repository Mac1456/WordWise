import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../stores/documentStore'
import { textAnalysisService, TextAnalysis, TextSuggestion } from '../services/textAnalysisService'
import { ExportService } from '../services/exportService'
import HighlightedTextArea from './HighlightedTextArea'
import ToneAnalysisPanel from './ToneAnalysisPanel'
import SuggestionTooltip from './SuggestionTooltip'
import { 
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
  X,
  ChevronDown
} from 'lucide-react'

interface WritingEditorProps {
  documentId?: string
}

export default function WritingEditor({ documentId }: WritingEditorProps) {
  console.log('WritingEditor: Component rendering started')
  
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
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  console.log('WritingEditor: State initialized')

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showExportDropdown && !target.closest('.export-dropdown')) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showExportDropdown])

  // Load document
  useEffect(() => {
    if (documentId) {
      console.log('WritingEditor: Loading document with ID:', documentId)
      loadDocuments().then(() => {
        const doc = useDocumentStore.getState().documents.find(d => d.id === documentId)
        if (doc) {
          setCurrentDocument(doc)
          setContent(doc.content || '')
          console.log('WritingEditor: Document loaded successfully')
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
        console.log('WritingEditor: Starting auto-analysis')
        const result = await textAnalysisService.analyzeTextInstant(content)
        setAnalysis(result)
        console.log('WritingEditor: Auto-analysis completed')
      } catch (error) {
        console.error('WritingEditor: Auto-analysis failed:', error)
      } finally {
        setIsAutoAnalyzing(false)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [content])

  const handleContentChange = (newContent: string) => {
    console.log('WritingEditor: Content changed, length:', newContent.length)
    setContent(newContent)
  }

  const handleSave = async () => {
    if (!currentDocument) return
    
    console.log('WritingEditor: Saving document')
    setIsSaving(true)
    try {
      await updateDocument(currentDocument.id, { content })
      console.log('WritingEditor: Document saved successfully')
    } catch (error) {
      console.error('WritingEditor: Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    if (!currentDocument || !content.trim()) return
    
    console.log('WritingEditor: Exporting as', format)
    setIsExporting(true)
    setShowExportDropdown(false)
    
    try {
      const filename = ExportService.sanitizeFilename(currentDocument.title)
      const title = currentDocument.title
      
      switch (format) {
        case 'txt':
          ExportService.exportAsTxt(content, filename)
          break
        case 'md':
          ExportService.exportAsMarkdown(content, filename, title)
          break
        case 'docx':
          await ExportService.exportAsDocx(content, filename, title)
          break
        case 'pdf':
          ExportService.exportAsPdf(content, filename, title)
          break
      }
      console.log('WritingEditor: Export completed successfully')
    } catch (error) {
      console.error('WritingEditor: Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!currentDocument) return
    
    if (confirm('Are you sure you want to delete this document?')) {
      console.log('WritingEditor: Deleting document')
      try {
        await deleteDocument(currentDocument.id)
        navigate('/dashboard')
        console.log('WritingEditor: Document deleted successfully')
      } catch (error) {
        console.error('WritingEditor: Delete failed:', error)
      }
    }
  }

  const applySuggestion = (suggestion: TextSuggestion) => {
    console.log('WritingEditor: Applying suggestion:', suggestion.type)
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
    console.log('WritingEditor: Dismissing suggestion:', suggestionId)
    if (analysis) {
      const updatedSuggestions = analysis.suggestions.filter(s => s.id !== suggestionId)
      setAnalysis({ ...analysis, suggestions: updatedSuggestions })
    }
  }

  const applyAllSuggestions = () => {
    if (!analysis?.suggestions.length) return
    
    console.log('WritingEditor: Applying all suggestions, count:', analysis.suggestions.length)
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
    if (!content.trim() || content.length < 50) return
    
    console.log('WritingEditor: Starting tone analysis')
    setIsRunningToneAnalysis(true)
    try {
      const result = await textAnalysisService.analyzeToneOnly(content)
      if (result && analysis) {
        setAnalysis({ ...analysis, toneAnalysis: result })
        setShowToneAnalysis(true)
        console.log('WritingEditor: Tone analysis completed')
      }
    } catch (error) {
      console.error('WritingEditor: Tone analysis failed:', error)
    } finally {
      setIsRunningToneAnalysis(false)
    }
  }

  const handleManualAIAnalysis = async () => {
    if (!content.trim()) return
    
    console.log('WritingEditor: Starting manual AI analysis')
    setIsAnalyzing(true)
    try {
      const result = await textAnalysisService.analyzeText(content)
      setAnalysis(result)
      console.log('WritingEditor: Manual AI analysis completed')
    } catch (error) {
      console.error('WritingEditor: Manual AI analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSuggestionCardProps = (suggestion: TextSuggestion) => {
    console.log('WritingEditor: Getting suggestion card props for:', suggestion.type)
    
    switch (suggestion.type) {
      case 'grammar':
        return {
          icon: <AlertCircle size={16} className="text-red-500" />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800'
        }
      case 'spelling':
        return {
          icon: <AlertCircle size={16} className="text-orange-500" />,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          titleColor: 'text-orange-800'
        }
      case 'style':
        return {
          icon: <Lightbulb size={16} className="text-blue-500" />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          titleColor: 'text-blue-800'
        }
      default:
        return {
          icon: <CheckCircle size={16} className="text-green-500" />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          titleColor: 'text-green-800'
        }
    }
  }

  const SuggestionCard = ({ suggestion }: { suggestion: TextSuggestion }) => {
    console.log('WritingEditor: Rendering SuggestionCard for:', suggestion.id)
    const props = getSuggestionCardProps(suggestion)
    
    return (
      <div className={`p-3 rounded-lg border ${props.bgColor} ${props.borderColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {props.icon}
            <span className={`text-sm font-medium ${props.titleColor}`}>
              {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
            </span>
          </div>
          <button 
            onClick={() => dismissSuggestion(suggestion.id)} 
            className="text-gray-400 hover:text-gray-600"
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

  console.log('WritingEditor: About to render JSX')

  if (!currentDocument) {
    console.log('WritingEditor: No current document, rendering placeholder')
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

  console.log('WritingEditor: Rendering main editor interface')
  
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
            <div className="relative export-dropdown">
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={isExporting || !content.trim()}
                className="flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
                title="Export Document"
              >
                <Download size={14} className="mr-1" />
                {isExporting ? 'Exporting...' : 'Export'}
                <ChevronDown size={12} className="ml-1" />
              </button>
              
              {showExportDropdown && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <button
                      onClick={() => handleExport('txt')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText size={14} className="mr-2" />
                      Text (.txt)
                    </button>
                    <button
                      onClick={() => handleExport('md')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText size={14} className="mr-2" />
                      Markdown (.md)
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText size={14} className="mr-2" />
                      Word (.docx)
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <FileText size={14} className="mr-2" />
                      PDF (.pdf)
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              console.log('WritingEditor: Suggestion clicked:', suggestion.id)
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
            console.log('WritingEditor: Applying suggestion from tooltip')
            if (selectedSuggestion) applySuggestion(selectedSuggestion)
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onClose={() => {
            console.log('WritingEditor: Closing tooltip')
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
          onDismiss={() => {
            console.log('WritingEditor: Dismissing suggestion from tooltip')
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
          onClose={() => {
            console.log('WritingEditor: Closing tone analysis panel')
            setShowToneAnalysis(false)
          }}
        />
      )}
    </div>
  )
}