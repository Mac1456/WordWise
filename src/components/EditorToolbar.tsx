import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Type,
  Download,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Minus
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor | null;
  onExport: (format: 'txt' | 'md' | 'docx' | 'pdf') => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor, onExport }) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFontMenu, setShowFontMenu] = useState(false);

  if (!editor) {
    return null;
  }

  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
  const fontFamilies = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
  ];

  const exportFormats = [
    { format: 'txt' as const, label: 'Plain Text (.txt)', icon: '📄' },
    { format: 'md' as const, label: 'Markdown (.md)', icon: '📝' },
    { format: 'docx' as const, label: 'Word Document (.docx)', icon: '📄' },
    { format: 'pdf' as const, label: 'PDF Document (.pdf)', icon: '📕' },
  ];

  const handleFontSizeChange = (size: string) => {
    // Apply font size using CSS styling
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    setShowFontMenu(false);
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    // Apply font family using CSS styling  
    editor.chain().focus().setFontFamily(fontFamily).run();
    setShowFontMenu(false);
  };

  const handleTextAlign = (alignment: 'left' | 'center' | 'right') => {
    // Apply text alignment using CSS styling
    editor.chain().focus().setTextAlign(alignment).run();
  };

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-2 flex flex-wrap items-center gap-2">
      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Font Family & Size */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <div className="relative">
          <button
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <Type size={14} />
            Font
            <ChevronDown size={12} />
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
              <div className="p-2 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-500 mb-2">Font Family</div>
                {fontFamilies.map((font) => (
                  <button
                    key={font.value}
                    onClick={() => handleFontFamilyChange(font.value)}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-50 rounded"
                    style={{ fontFamily: font.value }}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Font Size</div>
                <div className="grid grid-cols-4 gap-1">
                  {fontSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Text Formatting */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded ${
            editor.isActive('bold')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded ${
            editor.isActive('italic')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded ${
            editor.isActive('underline')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Underline"
        >
          <Underline size={16} />
        </button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded ${
            editor.isActive('bulletList')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded ${
            editor.isActive('orderedList')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
      </div>

      {/* Block Elements */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded ${
            editor.isActive('blockquote')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Quote"
        >
          <Quote size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-2 rounded ${
            editor.isActive('codeBlock')
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Code Block"
        >
          <Code size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Horizontal Line"
        >
          <Minus size={16} />
        </button>
      </div>

      {/* Text Alignment */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
        <button
          onClick={() => handleTextAlign('left')}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: 'left' }) || !editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Align Left"
        >
          <AlignLeft size={16} />
        </button>
        <button
          onClick={() => handleTextAlign('center')}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: 'center' })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Align Center"
        >
          <AlignCenter size={16} />
        </button>
        <button
          onClick={() => handleTextAlign('right')}
          className={`p-2 rounded ${
            editor.isActive({ textAlign: 'right' })
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
          title="Align Right"
        >
          <AlignRight size={16} />
        </button>
      </div>

      {/* Export Menu */}
      <div className="relative ml-auto">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Download size={16} />
          Export
          <ChevronDown size={14} />
        </button>
        {showExportMenu && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
            {exportFormats.map((format) => (
              <button
                key={format.format}
                onClick={() => {
                  onExport(format.format);
                  setShowExportMenu(false);
                }}
                className="block w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
              >
                <span className="text-lg">{format.icon}</span>
                <span className="text-sm">{format.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar; 