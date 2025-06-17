import React, { useRef, useEffect, useState } from 'react';
import { TextSuggestion } from '../services/textAnalysisService';

interface HighlightedTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: TextSuggestion[];
  onSuggestionClick: (suggestion: TextSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export default function HighlightedTextArea({
  value,
  onChange,
  suggestions,
  onSuggestionClick,
  placeholder,
  className
}: HighlightedTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<TextSuggestion | null>(null);

  // Sync scroll between textarea and highlight overlay
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  // Generate highlighted HTML with suggestions
  const getHighlightedContent = () => {
    if (!suggestions.length) {
      return value.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    }

    // Sort suggestions by start index
    const sortedSuggestions = [...suggestions].sort((a, b) => a.startIndex - b.startIndex);
    
    let result = '';
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion) => {
      // Add text before suggestion
      result += value.slice(lastIndex, suggestion.startIndex).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
      
      // Add highlighted suggestion
      const suggestionText = value.slice(suggestion.startIndex, suggestion.endIndex);
      const severityClass = 
        suggestion.severity === 'error' ? 'bg-red-100 border-b-2 border-red-400' :
        suggestion.severity === 'warning' ? 'bg-yellow-100 border-b-2 border-yellow-400' :
        'bg-blue-100 border-b-2 border-blue-400';
      
      result += `<span 
        class="${severityClass} cursor-pointer relative inline-block"
        data-suggestion-id="${suggestion.id}"
        title="${suggestion.message}"
      >${suggestionText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</span>`;
      
      lastIndex = suggestion.endIndex;
    });

    // Add remaining text
    result += value.slice(lastIndex).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    
    return result;
  };

  // Handle clicks on highlighted suggestions
  useEffect(() => {
    const handleHighlightClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const suggestionId = target.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        if (suggestion) {
          onSuggestionClick(suggestion);
        }
      }
    };

    const highlightDiv = highlightRef.current;
    if (highlightDiv) {
      highlightDiv.addEventListener('click', handleHighlightClick);
      return () => highlightDiv.removeEventListener('click', handleHighlightClick);
    }
  }, [suggestions, onSuggestionClick]);

  return (
    <div className="relative">
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden"
        style={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          padding: '16px',
          border: '1px solid transparent',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          color: 'transparent',
          zIndex: 1
        }}
        onScroll={handleScroll}
      >
        <div 
          className="pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: getHighlightedContent() }}
        />
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative bg-transparent resize-none focus:outline-none ${className}`}
        style={{
          zIndex: 2,
          color: 'rgb(17, 24, 39)', // text-gray-900
          caretColor: 'rgb(17, 24, 39)'
        }}
      />

      {/* Vocabulary hover tooltip */}
      {hoveredSuggestion && hoveredSuggestion.type === 'vocabulary' && hoveredSuggestion.alternatives && (
        <div className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10 max-w-xs">
          <p className="text-sm font-medium text-gray-900 mb-2">Suggested alternatives:</p>
          <div className="flex flex-wrap gap-1">
            {hoveredSuggestion.alternatives.map((alt, index) => (
              <button
                key={index}
                onClick={() => {
                  // Replace word with alternative
                  const newValue = 
                    value.substring(0, hoveredSuggestion.startIndex) + 
                    alt + 
                    value.substring(hoveredSuggestion.endIndex);
                  onChange(newValue);
                  setHoveredSuggestion(null);
                }}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 