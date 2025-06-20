import { Mark } from '@tiptap/core';

export interface SuggestionHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    suggestionHighlight: {
      setSuggestionHighlight: (attributes?: { 'data-suggestion-id': string; 'data-type': string }) => ReturnType;
      toggleSuggestionHighlight: (attributes?: { 'data-suggestion-id': string; 'data-type': string }) => ReturnType;
      unsetSuggestionHighlight: () => ReturnType;
    };
  }
}

export const SuggestionHighlight = Mark.create<SuggestionHighlightOptions>({
  name: 'suggestionHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      'data-suggestion-id': {
        default: null,
        parseHTML: element => element.getAttribute('data-suggestion-id'),
        renderHTML: attributes => {
          if (!attributes['data-suggestion-id']) {
            return {};
          }
          return {
            'data-suggestion-id': attributes['data-suggestion-id'],
          };
        },
      },
      'data-type': {
        default: null,
        parseHTML: element => element.getAttribute('data-type'),
        renderHTML: attributes => {
          if (!attributes['data-type']) {
            return {};
          }
          return {
            'data-type': attributes['data-type'],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-suggestion-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes['data-type'] || 'spelling';
    const className = `suggestion-highlight suggestion-${type}`;
    
    return ['span', { ...this.options.HTMLAttributes, ...HTMLAttributes, class: className }, 0];
  },

  addCommands() {
    return {
      setSuggestionHighlight:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleSuggestionHighlight:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetSuggestionHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default SuggestionHighlight; 