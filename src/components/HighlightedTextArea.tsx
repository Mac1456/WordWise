import { useRef, useEffect, useState, useMemo } from 'react';
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

  // Sync styles between textarea and highlight overlay
  useEffect(() => {
    const syncStyles = () => {
      if (textareaRef.current && highlightRef.current) {
        const textarea = textareaRef.current;
        const highlight = highlightRef.current;
        
        // Get computed styles from textarea
        const computedStyle = window.getComputedStyle(textarea);
        
        // Apply exact styles to highlight overlay
        const stylesToCopy = [
          'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
          'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent',
          'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
          'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
          'borderRadius', 'boxSizing', 'textAlign', 'textTransform',
          'whiteSpace', 'wordBreak', 'wordWrap', 'overflowWrap'
        ];
        
        stylesToCopy.forEach(prop => {
          if (prop === 'borderWidth' || prop.includes('border')) {
            // Make borders transparent to maintain spacing without visual border
            if (prop === 'borderWidth') {
              highlight.style.border = `${computedStyle.borderWidth} solid transparent`;
            } else {
              (highlight.style as any)[prop] = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
            }
          } else {
            (highlight.style as any)[prop] = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
          }
        });
        
        // Ensure exact positioning and dimensions
        const rect = textarea.getBoundingClientRect();
        highlight.style.width = `${textarea.clientWidth}px`;
        highlight.style.height = `${textarea.clientHeight}px`;
        
        // Ensure text decoration is removed from highlights
        highlight.style.textDecoration = 'none';
      }
    };

    // Sync immediately and after various delays
    syncStyles();
    
    const timers = [
      setTimeout(syncStyles, 1),
      setTimeout(syncStyles, 10),
      setTimeout(syncStyles, 50),
      setTimeout(syncStyles, 100),
      setTimeout(syncStyles, 200)
    ];
    
    // Also sync on window resize
    const handleResize = () => syncStyles();
    window.addEventListener('resize', handleResize);
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', handleResize);
    };
  }, [className, value, suggestions]); // Re-sync when className, value, or suggestions change

  // Memoize highlighted content for better performance
  const highlightedContent = useMemo(() => {
    // Early return for no suggestions - improves performance
    if (!suggestions.length) {
      return value.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    }

    // Filter out suggestions with invalid indices or empty text
    const validSuggestions = suggestions.filter(suggestion => {
      const suggestionText = value.slice(suggestion.startIndex, suggestion.endIndex);
      return (
        suggestion.startIndex >= 0 &&
        suggestion.endIndex <= value.length &&
        suggestion.startIndex < suggestion.endIndex &&
        suggestionText.trim().length > 0 // Don't highlight empty or whitespace-only text
      );
    });

    if (!validSuggestions.length) {
      return value.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    }

    // Sort suggestions by start index and remove overlaps
    const sortedSuggestions = [...validSuggestions]
      .sort((a, b) => a.startIndex - b.startIndex)
      .filter((suggestion, index, arr) => {
        // Remove overlapping suggestions (keep the first one)
        if (index === 0) return true;
        const prev = arr[index - 1];
        return suggestion.startIndex >= prev.endIndex;
      });
    
    let result = '';
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion) => {
      // Add text before suggestion
      const beforeText = value.slice(lastIndex, suggestion.startIndex);
      result += beforeText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
      
      // Add highlighted suggestion
      const suggestionText = value.slice(suggestion.startIndex, suggestion.endIndex);
      const severityClass = 
        suggestion.severity === 'error' ? 'bg-red-100 border-b-2 border-red-400' :
        suggestion.severity === 'warning' ? 'bg-yellow-100 border-b-2 border-yellow-400' :
        'bg-blue-100 border-b-2 border-blue-400';
      
      result += `<span 
        class="${severityClass} cursor-pointer relative inline-block rounded px-0.5"
        data-suggestion-id="${suggestion.id}"
        title="${suggestion.message.replace(/"/g, '&quot;')}"
      >${suggestionText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;')}</span>`;
      
      lastIndex = suggestion.endIndex;
    });

    // Add remaining text
    const remainingText = value.slice(lastIndex);
    result += remainingText.replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
    
    return result;
  }, [value, suggestions]); // Only recalculate when value or suggestions change

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
    <div className="relative w-full h-full">
      {/* Highlight overlay - positioned behind textarea */}
      <div
        ref={highlightRef}
        className="absolute top-0 left-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words"
        style={{
          color: 'transparent',
          zIndex: 1,
          width: '100%',
          height: '100%',
          background: 'transparent',
          userSelect: 'none'
        }}
        onScroll={handleScroll}
      >
        <div 
          className="pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
      </div>
      
      {/* Actual textarea - positioned above highlights */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative resize-none focus:outline-none w-full h-full ${className}`}
        style={{
          zIndex: 2,
          background: 'transparent',
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