import { useRef, useEffect, useState, useCallback } from 'react';
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
  className = ''
}: HighlightedTextAreaProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastCursorPosition = useRef(0);
  const isUpdating = useRef(false);

  // Get cursor position in text content
  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return 0;
    
    try {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current!);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      
      // Use textContent for more accurate positioning and clamp to valid range
      const textBeforeCursor = preCaretRange.toString();
      return Math.min(Math.max(0, textBeforeCursor.length), value.length);
    } catch (error) {
      // Return a safe fallback position
      return Math.min(Math.max(0, lastCursorPosition.current), value.length);
    }
  }, [value.length]);

  // Set cursor position in text content
  const setCursorPosition = useCallback((position: number) => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    if (!selection) return;

    try {
      const range = document.createRange();
      let currentPos = 0;
      let targetNode: Node | null = null;
      let targetOffset = 0;

      // Walk through all text nodes
      const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT
      );

      let node = walker.nextNode();
      while (node) {
        const textLength = node.textContent?.length || 0;
        if (currentPos + textLength >= position) {
          targetNode = node;
          targetOffset = position - currentPos;
          break;
        }
        currentPos += textLength;
        node = walker.nextNode();
      }

      if (targetNode) {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (error) {
      // Silently handle cursor positioning errors
    }
  }, []);

  // Create highlighted content with proper escaping
  const createHighlightedContent = useCallback(() => {
    if (!suggestions.length) {
      return value.replace(/\n/g, '<br>') || '';
    }

    // Sort suggestions by position to avoid overlap issues
    const sortedSuggestions = [...suggestions]
      .filter(s => s.startIndex >= 0 && s.endIndex <= value.length && s.startIndex < s.endIndex)
      .sort((a, b) => a.startIndex - b.startIndex);

    // Remove overlapping suggestions
    const validSuggestions = sortedSuggestions.filter((suggestion, index) => {
      if (index === 0) return true;
      const prevSuggestion = sortedSuggestions[index - 1];
      return suggestion.startIndex >= prevSuggestion.endIndex;
    });

    if (!validSuggestions.length) {
      return value.replace(/\n/g, '<br>') || '';
    }

    let result = '';
    let lastIndex = 0;

    validSuggestions.forEach((suggestion) => {
      // Add text before suggestion
      const beforeText = value.slice(lastIndex, suggestion.startIndex);
      result += beforeText.replace(/\n/g, '<br>');

      // Add highlighted suggestion
      const suggestionText = value.slice(suggestion.startIndex, suggestion.endIndex);
      const colorClass = suggestion.type === 'spelling' ? 'text-red-600 bg-red-100' :
                        suggestion.type === 'grammar' ? 'text-yellow-600 bg-yellow-100' :
                        'text-blue-600 bg-blue-100';
      
      result += `<span class="${colorClass} underline decoration-wavy cursor-pointer rounded px-0.5" data-suggestion="${suggestion.id}" title="${suggestion.message.replace(/"/g, '&quot;')}">${suggestionText.replace(/\n/g, '<br>')}</span>`;
      
      lastIndex = suggestion.endIndex;
    });

    // Add remaining text
    const remainingText = value.slice(lastIndex);
    result += remainingText.replace(/\n/g, '<br>');

    return result;
  }, [value, suggestions]);

  // Handle content changes with cursor position preservation
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    if (isUpdating.current) return;
    
    const target = e.currentTarget;
    const text = target.innerText || '';
    
    // Store cursor position before updating
    lastCursorPosition.current = getCursorPosition();
    
    onChange(text);
  }, [onChange, getCursorPosition]);

  // Handle paste to ensure plain text only
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    
    // Store cursor position
    lastCursorPosition.current = getCursorPosition();
    
    document.execCommand('insertText', false, text);
  }, [getCursorPosition]);

  // Handle suggestion clicks
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const suggestionId = target.getAttribute('data-suggestion');
    
    if (suggestionId) {
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        onSuggestionClick(suggestion, target);
        return;
      }
    }
    
    // Update cursor position for regular clicks
    setTimeout(() => {
      lastCursorPosition.current = getCursorPosition();
    }, 0);
  }, [suggestions, onSuggestionClick, getCursorPosition]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Restore cursor position when focusing
    setTimeout(() => {
      setCursorPosition(lastCursorPosition.current);
    }, 0);
  }, [setCursorPosition]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    lastCursorPosition.current = getCursorPosition();
  }, [getCursorPosition]);

  // Update highlighting when suggestions change, preserving cursor
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Always store current cursor position before updating, regardless of focus
    const currentPos = getCursorPosition();
    
    isUpdating.current = true;
    const newContent = createHighlightedContent();
    
    // Only update if content actually changed to prevent unnecessary re-renders
    if (editor.innerHTML !== newContent) {
      editor.innerHTML = newContent;
      
      // Restore cursor position with a slight delay to ensure DOM is updated
      setTimeout(() => {
        // Only restore cursor if we're focused and position is valid
        if (isFocused && currentPos >= 0 && currentPos <= value.length) {
          setCursorPosition(currentPos);
        }
        isUpdating.current = false;
      }, 10); // Slightly longer delay for better stability
    } else {
      isUpdating.current = false;
    }
  }, [suggestions, createHighlightedContent, isFocused, getCursorPosition, setCursorPosition, value.length]);

  // Update content with cursor preservation when value changes externally
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentText = editor.innerText || '';
    if (currentText !== value) {
      // Store cursor position before any content changes
      const currentPos = isFocused ? getCursorPosition() : lastCursorPosition.current;
      
      isUpdating.current = true;
      editor.innerHTML = createHighlightedContent();
      
      // Restore cursor position if focused and position is valid
      if (isFocused && currentPos >= 0 && currentPos <= value.length) {
        setTimeout(() => {
          setCursorPosition(currentPos);
          isUpdating.current = false;
        }, 10);
      } else {
        isUpdating.current = false;
      }
    }
  }, [value, createHighlightedContent, isFocused, setCursorPosition, getCursorPosition]);

  // Initialize content when component mounts
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    
    if (!editor.innerHTML) {
      editor.innerHTML = createHighlightedContent();
    }
  }, [createHighlightedContent]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`
          w-full h-full resize-none focus:outline-none
          whitespace-pre-wrap break-words
          ${className}
        `}
        style={{
          minHeight: '100%',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Placeholder */}
      {!value && placeholder && (
        <div className="absolute top-0 left-0 pointer-events-none text-gray-400 whitespace-pre-wrap">
          {placeholder}
        </div>
      )}
    </div>
  );
} 