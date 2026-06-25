import Editor from '@monaco-editor/react';
import { useRef, useEffect } from 'react';

interface CodeEditorProps {
  code: string;
  setCode: (val: string) => void;
}

export function CodeEditor({ code, setCode }: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    const handleEditorCommand = (e: any) => {
      if (!editorRef.current) return;
      const editor = editorRef.current;
      const cmd = e.detail;

      switch (cmd) {
        case 'undo':
          editor.trigger('keyboard', 'undo', null);
          break;
        case 'redo':
          editor.trigger('keyboard', 'redo', null);
          break;
        case 'cut':
          editor.focus();
          editor.trigger('keyboard', 'editor.action.clipboardCutAction', null);
          break;
        case 'copy':
          editor.focus();
          editor.trigger('keyboard', 'editor.action.clipboardCopyAction', null);
          break;
        case 'paste':
          editor.focus();
          editor.trigger('keyboard', 'editor.action.clipboardPasteAction', null);
          break;
        case 'find':
          editor.trigger('keyboard', 'actions.find', null);
          break;
        case 'replace':
          editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
          break;
        case 'format':
          import('../api/makerApi').then(({ api }) => {
            api.formatCode(editor.getValue())
              .then(formatted => {
                if (formatted) setCode(formatted);
              })
              .catch(err => {
                console.error('Format failed:', err);
                alert('Formatting failed: ' + err.message);
              });
          });
          break;
      }
    };

    document.addEventListener('editor-command', handleEditorCommand);
    return () => document.removeEventListener('editor-command', handleEditorCommand);
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    editor.focus();

    monaco.languages.registerCompletionItemProvider('cpp', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        const suggestions = [
          {
            label: 'setup',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'void setup() {\n  $0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arduino setup() function',
            range: range
          },
          {
            label: 'loop',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'void loop() {\n  $0\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Arduino loop() function',
            range: range
          },
          {
            label: 'pinMode',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'pinMode(${1:pin}, ${2:OUTPUT});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Configures the specified pin to behave either as an input or an output.',
            range: range
          },
          {
            label: 'digitalWrite',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'digitalWrite(${1:pin}, ${2:HIGH});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Write a HIGH or a LOW value to a digital pin.',
            range: range
          },
          {
            label: 'Serial.println',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'Serial.println(${1:"text"});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Prints data to the serial port as human-readable ASCII text followed by a carriage return character.',
            range: range
          },
          {
            label: 'delay',
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: 'delay(${1:1000});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Pauses the program for the amount of time (in milliseconds).',
            range: range
          }
        ];
        return { suggestions };
      }
    });
  };

  return (
    <div className="flex-1 border border-border rounded-xl bg-[#1e1e1e] overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-lg flex flex-col">
      <div className="h-10 bg-[#252526] border-b border-[#333] flex items-center px-4 gap-2">
         <div className="flex gap-1.5">
           <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
           <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
           <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
         </div>
         <span className="text-xs text-gray-400 font-mono ml-4">sketch.ino</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="cpp"
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'Courier New', Consolas, monospace",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            formatOnPaste: true,
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}
