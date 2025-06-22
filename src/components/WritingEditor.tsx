import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocumentStore } from '../stores/documentStore'
import { textAnalysisService, TextAnalysis, TextSuggestion } from '../services/textAnalysisService'
import { firebaseAIService } from '../services/firebaseAIService'
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
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set())
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false)
  const [suggestionIgnoreCount, setSuggestionIgnoreCount] = useState<Map<string, number>>(new Map())
  const [permanentlyBlockedSuggestions, setPermanentlyBlockedSuggestions] = useState<Set<string>>(new Set())
  const [lastAnalysisSuggestions, setLastAnalysisSuggestions] = useState<Set<string>>(new Set())

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
          // Clear dismissed suggestions and blocked suggestions when loading new document
          setDismissedSuggestions(new Set())
          setSuggestionIgnoreCount(new Map())
          setPermanentlyBlockedSuggestions(new Set())
          setLastAnalysisSuggestions(new Set())
          console.log('WritingEditor: Document loaded successfully')
        }
      })
    }
  }, [documentId, loadDocuments, setCurrentDocument])

  // 🚀 OPTIMIZED: Adaptive debounced analysis with smart timing
  useEffect(() => {
    if (!content.trim()) {
      setAnalysis(null)
      return
    }

    // Skip auto-analysis if we're currently applying a suggestion
    if (isApplyingSuggestion) {
      console.log('WritingEditor: Skipping auto-analysis - applying suggestion')
      return
    }

    // Adaptive delay based on content length and changes
    const getAnalysisDelay = () => {
      const contentLength = content.length
      const wordCount = content.trim().split(/\s+/).length
      
      // Shorter delay for shorter content, longer for complex text
      if (contentLength < 100) return 500 // Quick response for short text
      if (wordCount < 50) return 750      // Medium delay for medium text  
      return 1000                         // Standard delay for longer text
    }

    const timeoutId = setTimeout(async () => {
      if (content.trim().length < 10) return
      if (isApplyingSuggestion) {
        console.log('WritingEditor: Skipping auto-analysis - applying suggestion')
        return
      }

      setIsAutoAnalyzing(true)
      try {
        console.log('WritingEditor: Starting optimized auto-analysis')
        const startTime = performance.now()
        
        const result = await textAnalysisService.analyzeTextInstant(content)
        
        // Filter out dismissed and permanently blocked suggestions from auto-analysis results
        if (result && result.suggestions) {
          const originalCount = result.suggestions.length
          const filteredSuggestions = result.suggestions.filter(suggestion => {
            const contentKey = getSuggestionContentKey(suggestion)
            return !dismissedSuggestions.has(suggestion.id) && 
                   !permanentlyBlockedSuggestions.has(contentKey)
          })
          result.suggestions = filteredSuggestions
          if (originalCount > filteredSuggestions.length) {
            console.log(`WritingEditor: Filtered ${originalCount - filteredSuggestions.length} dismissed/blocked suggestions from auto-analysis`)
          }
        }
        
        setAnalysis(result)
        
        const endTime = performance.now()
        console.log(`WritingEditor: Auto-analysis completed in ${Math.round(endTime - startTime)}ms`)
      } catch (error) {
        console.error('WritingEditor: Auto-analysis failed:', error)
      } finally {
        setIsAutoAnalyzing(false)
      }
    }, getAnalysisDelay())

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

  const applySuggestion = (suggestion: TextSuggestion, alternativeText?: string) => {
    const textToApply = alternativeText || suggestion.suggestedText
    console.log('WritingEditor: Applying suggestion:', suggestion.type, `"${suggestion.originalText}" → "${textToApply}"`)
    
    // Set flag to prevent auto-analysis during suggestion application
    setIsApplyingSuggestion(true)
    
    try {
      // Enhanced position validation with multiple fallback strategies
      let startIndex = suggestion.startIndex
      let endIndex = suggestion.endIndex
      let currentText = content.slice(startIndex, endIndex)
      
      if (currentText !== suggestion.originalText) {
        console.warn('WritingEditor: Suggestion text mismatch, attempting to locate...')
        
        // Strategy 1: Search in a wider area around the original position
        const searchRadius = 100
        const searchStart = Math.max(0, startIndex - searchRadius)
        const searchEnd = Math.min(content.length, endIndex + searchRadius)
        const searchArea = content.slice(searchStart, searchEnd)
        let foundIndex = searchArea.indexOf(suggestion.originalText)
        
        if (foundIndex !== -1) {
          startIndex = searchStart + foundIndex
          endIndex = startIndex + suggestion.originalText.length
          console.log('WritingEditor: Position corrected using wide search to:', startIndex, '-', endIndex)
        } else {
          // Strategy 2: Try case-insensitive search
          const lowerOriginal = suggestion.originalText.toLowerCase()
          const lowerSearchArea = searchArea.toLowerCase()
          foundIndex = lowerSearchArea.indexOf(lowerOriginal)
          
          if (foundIndex !== -1) {
            startIndex = searchStart + foundIndex
            endIndex = startIndex + suggestion.originalText.length
            console.log('WritingEditor: Position corrected using case-insensitive search to:', startIndex, '-', endIndex)
          } else {
            // Strategy 3: Try finding first occurrence in entire text
            foundIndex = content.indexOf(suggestion.originalText)
            if (foundIndex !== -1) {
              startIndex = foundIndex
              endIndex = startIndex + suggestion.originalText.length
              console.log('WritingEditor: Position corrected using full text search to:', startIndex, '-', endIndex)
            } else {
              // Strategy 4: Try partial matching (first few words)
              const words = suggestion.originalText.split(' ')
              if (words.length > 1) {
                const partialText = words.slice(0, Math.ceil(words.length / 2)).join(' ')
                foundIndex = content.indexOf(partialText)
                if (foundIndex !== -1) {
                  startIndex = foundIndex
                  endIndex = startIndex + suggestion.originalText.length
                  console.log('WritingEditor: Position corrected using partial match to:', startIndex, '-', endIndex)
                } else {
                  console.error('WritingEditor: Cannot locate suggestion text anywhere, skipping application')
                  return
                }
              } else {
                console.error('WritingEditor: Cannot locate suggestion text, skipping application')
                return
              }
            }
          }
        }
      }
      
      const beforeText = content.slice(0, startIndex)
      const afterText = content.slice(endIndex)
      const newContent = beforeText + textToApply + afterText
      
      setContent(newContent)
      
      if (analysis) {
        // Calculate the change in text length
        const lengthDiff = textToApply.length - suggestion.originalText.length
        
        // Remove the applied suggestion and adjust positions of remaining suggestions
        const updatedSuggestions = analysis.suggestions
          .filter(s => s.id !== suggestion.id)
          .map(s => {
            // Only adjust suggestions that come after the applied suggestion
            if (s.startIndex > endIndex) {
              return {
                ...s,
                startIndex: s.startIndex + lengthDiff,
                endIndex: s.endIndex + lengthDiff
              }
            }
            return s
          })
        
        setAnalysis({ ...analysis, suggestions: updatedSuggestions })
        console.log('WritingEditor: Remaining suggestions after applying:', updatedSuggestions.length)
      }
    } finally {
      // Re-enable auto-analysis after a short delay to let things settle
      setTimeout(() => {
        setIsApplyingSuggestion(false)
        console.log('WritingEditor: Re-enabled auto-analysis')
      }, 1500) // 1.5 second delay to prevent immediate re-analysis
    }
  }

  // Generate a content-based key for tracking suggestions across analysis runs
  const getSuggestionContentKey = (suggestion: TextSuggestion): string => {
    return `${suggestion.type}:${suggestion.originalText}→${suggestion.suggestedText}`
  }

  // Track ignored suggestions when running fresh AI analysis
  const trackIgnoredSuggestions = () => {
    if (!analysis?.suggestions) return

    // For each suggestion from the last analysis that wasn't applied
    analysis.suggestions.forEach(suggestion => {
      const contentKey = getSuggestionContentKey(suggestion)
      
      // If this suggestion wasn't applied (not in appliedSuggestions), count it as ignored
      if (!appliedSuggestions.has(suggestion.id)) {
        setSuggestionIgnoreCount(prev => {
          const newMap = new Map(prev)
          const currentCount = newMap.get(contentKey) || 0
          const newCount = currentCount + 1
          newMap.set(contentKey, newCount)
          
          console.log(`WritingEditor: Suggestion "${contentKey}" ignored ${newCount} time(s)`)
          
          // If ignored twice, permanently block it
          if (newCount >= 2) {
            setPermanentlyBlockedSuggestions(prevBlocked => {
              const newBlocked = new Set([...prevBlocked, contentKey])
              console.log(`WritingEditor: Permanently blocking suggestion "${contentKey}" after ${newCount} ignores`)
              return newBlocked
            })
          }
          
          return newMap
        })
      }
    })
  }

  const dismissSuggestion = (suggestionId: string) => {
    console.log('WritingEditor: Dismissing suggestion:', suggestionId)
    
    // Find the suggestion to get its content key
    const suggestion = analysis?.suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      const contentKey = getSuggestionContentKey(suggestion)
      
      // Increment ignore count for this content-based suggestion (dismissing counts as ignoring)
      setSuggestionIgnoreCount(prev => {
        const newMap = new Map(prev)
        const currentCount = newMap.get(contentKey) || 0
        const newCount = currentCount + 1
        newMap.set(contentKey, newCount)
        
        console.log(`WritingEditor: Suggestion "${contentKey}" dismissed/ignored ${newCount} time(s)`)
        
        // If dismissed/ignored twice, permanently block it
        if (newCount >= 2) {
          setPermanentlyBlockedSuggestions(prevBlocked => {
            const newBlocked = new Set([...prevBlocked, contentKey])
            console.log(`WritingEditor: Permanently blocking suggestion "${contentKey}" after ${newCount} dismissals/ignores`)
            return newBlocked
          })
        }
        
        return newMap
      })
    }
    
    // Track dismissed suggestion to prevent reappearance in current session
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]))
    
    // Clear content-specific cache entries to prevent dismissed suggestions from reappearing
    textAnalysisService.clearAnalysisCache(content)
    firebaseAIService.clearCache(content)
    
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
    
    console.log('WritingEditor: Starting manual AI analysis (refresh mode)')
    setIsAnalyzing(true)
    
    try {
      // Track ignored suggestions from the previous analysis before clearing
      trackIgnoredSuggestions()
      
      // Clear current suggestions and dismissed suggestions for a fresh start
      // Keep permanently blocked suggestions to respect user's permanent dismissals/ignores
      console.log('WritingEditor: Clearing all suggestions for fresh analysis')
      setDismissedSuggestions(new Set())
      setAnalysis(null)
      
      // Clear both caches to force fresh AI analysis
      textAnalysisService.clearAnalysisCache()
      firebaseAIService.clearCache()
      
      // Get fresh analysis and filter out permanently blocked suggestions
      const result = await textAnalysisService.analyzeText(content)
      
      // Filter out permanently blocked suggestions even in refresh mode
      if (result && result.suggestions) {
        const originalCount = result.suggestions.length
        const filteredSuggestions = result.suggestions.filter(suggestion => {
          const contentKey = getSuggestionContentKey(suggestion)
          return !permanentlyBlockedSuggestions.has(contentKey)
        })
        result.suggestions = filteredSuggestions
        if (originalCount > filteredSuggestions.length) {
          console.log(`WritingEditor: Filtered ${originalCount - filteredSuggestions.length} permanently blocked suggestions from refresh`)
        }
      }
      
      setAnalysis(result)
      console.log('WritingEditor: Manual AI analysis completed with fresh suggestions')
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
  
  // Filter suggestions for display and highlighting (filter dismissed and permanently blocked)
  const filteredSuggestions = analysis?.suggestions?.filter(suggestion => {
    const contentKey = getSuggestionContentKey(suggestion)
    return !dismissedSuggestions.has(suggestion.id) && 
           !permanentlyBlockedSuggestions.has(contentKey)
  }) || []

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
            suggestions={filteredSuggestions}
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
                title="Get Fresh AI Suggestions (ignores unapplied suggestions, permanently blocks after 2 ignores)"
              >
                <Zap size={14} />
              </button>
              <button
                onClick={applyAllSuggestions}
                disabled={!filteredSuggestions.length}
                className="p-2 bg-green-100 text-green-700 rounded-full hover:bg-green-200 disabled:opacity-50"
                title={`Apply All ${filteredSuggestions.length} Suggestions`}
              >
                <CheckCheck size={14} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSuggestions.length ? (
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion) => (
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
          onApply={(alternativeText?: string) => {
            console.log('WritingEditor: Applying suggestion from tooltip', alternativeText ? `(alternative: ${alternativeText})` : '')
            if (selectedSuggestion) applySuggestion(selectedSuggestion, alternativeText)
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