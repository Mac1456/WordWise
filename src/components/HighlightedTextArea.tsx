import { useRef, useLayoutEffect, useState, useMemo, Fragment, useCallback } from 'react';
import { TextSuggestion } from '../services/textAnalysisService';

interface HighlightedTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: TextSuggestion[];
  onSuggestionClick: (suggestion: TextSuggestion, target: HTMLElement) => void;
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

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      const textarea = textareaRef.current;
      const highlight = highlightRef.current;
      
      // Sync scroll position exactly
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Add scroll event listener
      textarea.addEventListener('scroll', handleScroll, { passive: true });
      
      // Sync initial scroll position
      handleScroll();
      
      return () => {
        textarea.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);

  useLayoutEffect(() => {
    const syncStyles = () => {
      if (textareaRef.current && highlightRef.current) {
        const textarea = textareaRef.current;
        const highlight = highlightRef.current;
        const computedStyle = window.getComputedStyle(textarea);
        
        const stylesToCopy = [
          'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
          'lineHeight', 'letterSpacing', 'wordSpacing', 'textIndent',
          'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
          'borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
          'borderRadius', 'boxSizing', 'textAlign', 'textTransform',
          'whiteSpace', 'wordBreak', 'wordWrap', 'overflowWrap', 'tabSize'
        ];
        
        stylesToCopy.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
          (highlight.style as any)[prop] = value;
        });

        // FIXED: Ensure exact positioning and sizing
        highlight.style.position = 'absolute';
        highlight.style.top = '0';
        highlight.style.left = '0';
        highlight.style.border = `${computedStyle.borderWidth} solid transparent`;
        highlight.style.width = `${textarea.clientWidth}px`;
        highlight.style.height = `${textarea.clientHeight}px`;
        highlight.style.textDecoration = 'none';
        highlight.style.overflow = 'hidden';
        highlight.style.pointerEvents = 'none';
        highlight.style.zIndex = '1';
        
        // FIXED: Ensure text rendering matches exactly
        highlight.style.fontFeatureSettings = computedStyle.fontFeatureSettings;
        highlight.style.fontVariantLigatures = computedStyle.fontVariantLigatures;
        highlight.style.textRendering = computedStyle.textRendering;
        (highlight.style as any).webkitFontSmoothing = (computedStyle as any).webkitFontSmoothing;
        (highlight.style as any).mozOsxFontSmoothing = (computedStyle as any).mozOsxFontSmoothing;
        
        // FIXED: Match exact dimensions and scroll behavior
        highlight.style.maxHeight = textarea.style.maxHeight || computedStyle.maxHeight;
        highlight.style.minHeight = textarea.style.minHeight || computedStyle.minHeight;
        highlight.style.resize = 'none';
        highlight.style.outline = 'none';
        
        // Sync scroll position
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
      }
    };

    syncStyles();
    
    // Re-sync on window resize or content changes
    const handleResize = () => {
      requestAnimationFrame(syncStyles);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [className, value, suggestions]);

  const highlightedContent = useMemo(() => {
    // Create a stable copy of suggestions to work with
    const suggestionsToRender = [...suggestions];
    
    // Validate and filter suggestions to ensure they match the current value
    const validSuggestions = suggestionsToRender.filter(suggestion => {
      // Basic range validation
      if (
        suggestion.startIndex < 0 || 
        suggestion.endIndex > value.length || 
        suggestion.startIndex >= suggestion.endIndex
      ) {
        return false;
      }
      
      const actualText = value.slice(suggestion.startIndex, suggestion.endIndex);
      
      // Exact match - ideal case
      if (actualText === suggestion.originalText) {
        return true;
      }
      
      // Allow for minor differences (whitespace, case, punctuation)
      const normalizeText = (text: string) => 
        text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      
      const normalizedActual = normalizeText(actualText);
      const normalizedOriginal = normalizeText(suggestion.originalText);
      
      if (normalizedActual === normalizedOriginal) {
        return true;
      }
      
      // For single-word suggestions, allow partial matches
      if (suggestion.originalText.trim().split(/\s+/).length === 1) {
        const actualWords = actualText.trim().split(/\s+/);
        const originalWords = suggestion.originalText.trim().split(/\s+/);
        
        // Check if the suggestion word is contained in the actual text
        if (actualWords.some(word => normalizeText(word) === normalizeText(originalWords[0]))) {
          return true;
        }
      }
      
      // If we still don't have a match, skip this suggestion silently
      // (don't log warning to reduce console noise)
      return false;
    });

    if (validSuggestions.length === 0) {
      return value;
    }

    // Sort by start index and filter out any remaining overlaps
    const sortedSuggestions = validSuggestions
      .sort((a, b) => a.startIndex - b.startIndex)
      .filter((suggestion, index, arr) => {
        if (index === 0) return true;
        const prev = arr[index - 1];
        return suggestion.startIndex >= prev.endIndex;
      });
    
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;

    sortedSuggestions.forEach((suggestion, index) => {
      // Add text before this suggestion
      if (suggestion.startIndex > lastIndex) {
        parts.push(value.slice(lastIndex, suggestion.startIndex));
      }
      
      const suggestionText = value.slice(suggestion.startIndex, suggestion.endIndex);
      
      const severityClass = 
        suggestion.type === 'spelling' ? 'bg-red-200/50 border-b-2 border-red-500' :
        suggestion.type === 'grammar' ? 'bg-yellow-200/50 border-b-2 border-yellow-500' :
        suggestion.severity === 'error' ? 'bg-red-200/50 border-b-2 border-red-500' :
        suggestion.severity === 'warning' ? 'bg-yellow-200/50 border-b-2 border-yellow-500' :
        'bg-blue-200/50 border-b-2 border-blue-500';
      
      parts.push(
        <span
          key={`${suggestion.id}-${index}`}
          className={`${severityClass} cursor-pointer relative inline-block rounded-sm px-0.5`}
          onClick={(e) => onSuggestionClick(suggestion, e.currentTarget)}
          title={suggestion.message}
        >
          {suggestionText}
        </span>
      );
      
      lastIndex = suggestion.endIndex;
    });

    // Add remaining text after the last suggestion
    if (lastIndex < value.length) {
      parts.push(value.slice(lastIndex));
    }
    
    return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
  }, [value, suggestions, onSuggestionClick]);

  return (
    <div className="relative">
      <div
        ref={highlightRef}
        className="absolute top-0 left-0 pointer-events-none overflow-hidden"
        style={{
          color: 'transparent',
          zIndex: 1,
          userSelect: 'none'
        }}
      >
        <div className="pointer-events-auto whitespace-pre-wrap break-words">
          {highlightedContent}
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative resize-none focus:outline-none bg-transparent ${className}`}
        style={{
          zIndex: 2,
          color: 'rgb(17, 24, 39)',
          caretColor: 'rgb(17, 24, 39)'
        }}
        spellCheck="false"
        autoCapitalize="false"
        autoCorrect="false"
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