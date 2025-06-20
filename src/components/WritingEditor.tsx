import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import ListItem from '@tiptap/extension-list-item'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import Blockquote from '@tiptap/extension-blockquote'
import CodeBlock from '@tiptap/extension-code-block'
import TextAlign from '@tiptap/extension-text-align'
import {
  Save,
  Palette,
  Target,
  Sparkles,
  AlertCircle,
  Info
} from 'lucide-react'
import { TextSuggestion, TextAnalysis } from '../services/textAnalysisService'
import LoadingSpinner from './LoadingSpinner'
import ToneAnalysisPanel from './ToneAnalysisPanel'
import SuggestionTooltip from './SuggestionTooltip'
import SuggestionHighlight from '../lib/SuggestionHighlight'
import EditorToolbar from './EditorToolbar'
import ExportService from '../services/exportService'

interface WritingEditorProps {
  initialText?: string
  onTextChange?: (text: string) => void
  onSave?: (text: string) => void
  suggestions?: TextSuggestion[]
  analysis?: TextAnalysis
  isAnalyzing?: boolean
  onRequestAnalysis?: (text: string, mode?: 'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment') => void
  writingGoal?: string
  onWritingGoalChange?: (goal: string) => void
  showToneAnalysis?: boolean
  onToggleToneAnalysis?: () => void
  className?: string
}

const WritingEditor: React.FC<WritingEditorProps> = ({
  initialText = '',
  onTextChange,
  onSave,
  suggestions = [],
  analysis,
  isAnalyzing = false,
  onRequestAnalysis,
  writingGoal = '',
  onWritingGoalChange,
  showToneAnalysis = false,
  onToggleToneAnalysis,
  className = ''
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<TextSuggestion | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const [analysisMode, setAnalysisMode] = useState<'comprehensive' | 'grammar-only' | 'conciseness' | 'vocabulary' | 'goal-alignment'>('comprehensive')
  const [lastAnalyzedText, setLastAnalyzedText] = useState('')
  const [showWritingGoal, setShowWritingGoal] = useState(false)

  // TipTap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
      }),
      Underline,
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      ListItem,
      BulletList.configure({
        HTMLAttributes: {
          class: 'my-bullet-list',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'my-ordered-list',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'my-blockquote',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'my-code-block',
        },
      }),
      SuggestionHighlight,
    ],
    content: initialText,
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6',
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText()
      onTextChange?.(text)
      
      // Auto-analyze after user stops typing for 2 seconds
      if (text !== lastAnalyzedText && text.trim().length > 10) {
        const timeoutId = setTimeout(() => {
          onRequestAnalysis?.(text, analysisMode)
          setLastAnalyzedText(text)
        }, 2000)
        return () => clearTimeout(timeoutId)
      }
    },
  })

  // Apply suggestions as highlights
  useEffect(() => {
    if (!editor || !suggestions.length) return

    // Clear existing highlights
    editor.chain().focus().unsetSuggestionHighlight().run()

    // Apply new highlights
    suggestions.forEach(suggestion => {
      const { startIndex, endIndex } = suggestion
      editor
        .chain()
        .focus()
        .setTextSelection({ from: startIndex + 1, to: endIndex + 1 })
        .setSuggestionHighlight({
          'data-suggestion-id': suggestion.id,
          'data-type': suggestion.type
        })
        .run()
    })

    // Clear selection
    editor.chain().focus().blur().run()
  }, [editor, suggestions])

  const handleSave = () => {
    if (editor) {
      const text = editor.getText()
      onSave?.(text)
    }
  }

  const handleAnalyze = () => {
    if (editor) {
      const text = editor.getText()
      onRequestAnalysis?.(text, analysisMode)
      setLastAnalyzedText(text)
    }
  }

  const handleApplySuggestion = (suggestion: TextSuggestion) => {
    if (!editor) return

    const { startIndex, endIndex, suggestedText } = suggestion
    
    // Apply the suggestion
    editor
      .chain()
      .focus()
      .setTextSelection({ from: startIndex + 1, to: endIndex + 1 })
      .insertContent(suggestedText)
      .run()

    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  const handleDismissSuggestion = (suggestion: TextSuggestion) => {
    // Remove the highlight for this suggestion
    if (editor) {
      const { startIndex, endIndex } = suggestion
      editor
        .chain()
        .focus()
        .setTextSelection({ from: startIndex + 1, to: endIndex + 1 })
        .unsetSuggestionHighlight()
        .run()
    }
    
    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  const handleExport = async (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    if (!editor) return

    const htmlContent = editor.getHTML()
    const plainText = editor.getText()
    const filename = ExportService.generateFilename('document', format)

    try {
      switch (format) {
        case 'txt':
          ExportService.exportAsText(plainText, filename)
          break
        case 'md':
          ExportService.exportAsMarkdown(htmlContent, filename)
          break
        case 'docx':
          await ExportService.exportAsDocx(htmlContent, filename)
          break
        case 'pdf':
          await ExportService.exportAsPdf(htmlContent, filename)
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
      // Show error notification or fallback
    }
  }

  const getSuggestionStats = () => {
    const stats = {
      total: suggestions.length,
      grammar: suggestions.filter(s => s.type === 'grammar').length,
      spelling: suggestions.filter(s => s.type === 'spelling').length,
      style: suggestions.filter(s => s.type === 'style').length,
      clarity: suggestions.filter(s => s.type === 'clarity').length,
    }
    return stats
  }

  const stats = getSuggestionStats()

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
        {/* Editor Toolbar */}
        <EditorToolbar editor={editor} onExport={handleExport} />

        {/* Analysis Controls */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Analysis Mode Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Analysis:</label>
                <select
                  value={analysisMode}
                  onChange={(e) => setAnalysisMode(e.target.value as any)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="comprehensive">Comprehensive</option>
                  <option value="grammar-only">Grammar Only</option>
                  <option value="conciseness">Conciseness</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="goal-alignment">Goal Alignment</option>
                </select>
              </div>

              {/* Writing Goal */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowWritingGoal(!showWritingGoal)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Target size={16} />
                  Writing Goal
                </button>
              </div>

              {showWritingGoal && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={writingGoal}
                    onChange={(e) => onWritingGoalChange?.(e.target.value)}
                    placeholder="e.g., Write a compelling personal statement for college"
                    className="text-sm border border-gray-300 rounded px-3 py-1 w-80"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Analysis Stats */}
              {stats.total > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <AlertCircle size={16} className="text-red-500" />
                    {stats.grammar + stats.spelling} errors
                  </span>
                  <span className="flex items-center gap-1">
                    <Info size={16} className="text-blue-500" />
                    {stats.style + stats.clarity} suggestions
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isAnalyzing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Analyze
                  </>
                )}
              </button>

              <button
                onClick={() => onToggleToneAnalysis?.()}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                  showToneAnalysis
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Palette size={16} />
                Tone
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                <Save size={16} />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex">
          {/* Editor */}
          <div className="flex-1">
            <EditorContent 
              editor={editor}
              className="min-h-[500px]"
            />
          </div>

          {/* Sidebar */}
          {(showToneAnalysis || analysis) && (
            <div className="w-80 border-l border-gray-200 bg-gray-50">
              {showToneAnalysis && analysis?.toneAnalysis && (
                <ToneAnalysisPanel 
                  toneAnalysis={analysis.toneAnalysis} 
                  isLoading={isAnalyzing}
                  onClose={() => onToggleToneAnalysis?.()}
                />
              )}
              
              {analysis && (
                <div className="p-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="h-5 w-5 text-blue-500">📊</div>
                      <h3 className="font-semibold text-gray-900">Writing Statistics</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Word Count</span>
                        <span className="text-sm font-semibold">{analysis.wordCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Sentences</span>
                        <span className="text-sm font-semibold">{analysis.sentenceCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Readability Score</span>
                        <span className="text-sm font-semibold">{analysis.readabilityScore}/100</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg Words/Sentence</span>
                        <span className="text-sm font-semibold">{Math.round(analysis.wordCount / Math.max(analysis.sentenceCount, 1))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestion Tooltip */}
        {selectedSuggestion && tooltipPosition && (
          <SuggestionTooltip
            suggestion={selectedSuggestion}
            position={tooltipPosition}
            onApply={() => handleApplySuggestion(selectedSuggestion)}
            onDismiss={() => handleDismissSuggestion(selectedSuggestion)}
            onClose={() => {
              setSelectedSuggestion(null)
              setTooltipPosition(null)
            }}
          />
        )}
      </div>

      {/* Custom Styles for Suggestions */}
      <style>{`
        .suggestion-highlight {
          position: relative;
          cursor: pointer;
        }
        
        .suggestion-spelling {
          background-color: rgba(239, 68, 68, 0.2);
          border-bottom: 2px wavy #ef4444;
        }
        
        .suggestion-grammar {
          background-color: rgba(245, 158, 11, 0.2);
          border-bottom: 2px wavy #f59e0b;
        }
        
        .suggestion-style {
          background-color: rgba(59, 130, 246, 0.2);
          border-bottom: 2px wavy #3b82f6;
        }
        
        .suggestion-clarity {
          background-color: rgba(16, 185, 129, 0.2);
          border-bottom: 2px wavy #10b981;
        }
        
        .suggestion-vocabulary {
          background-color: rgba(139, 92, 246, 0.2);
          border-bottom: 2px wavy #8b5cf6;
        }
        
        .suggestion-goal-alignment {
          background-color: rgba(236, 72, 153, 0.2);
          border-bottom: 2px wavy #ec4899;
        }

        .my-bullet-list {
          list-style-type: disc;
          margin-left: 1.5rem;
        }
        
        .my-ordered-list {
          list-style-type: decimal;
          margin-left: 1.5rem;
        }
        
        .my-blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #6b7280;
        }
        
        .my-code-block {
          background-color: #f3f4f6;
          border-radius: 0.375rem;
          padding: 1rem;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          margin: 1rem 0;
        }
      `}</style>
    </>
  )
}

export default WritingEditor