<template>
  <div ref="editorContainer" class="code-editor-wrapper" />
</template>

<script setup lang="ts">
import type { EditorView as CodeMirrorEditorView, ViewUpdate } from '@codemirror/view'

/**
 * CodeMirror 6 wrapper — Python syntax highlighting with neon dark theme.
 * Uses dynamic imports to avoid SSR issues.
 */

const props = defineProps<{
  modelValue: string
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'large-paste': [payload: { length: number }]
}>()

const editorContainer = ref<HTMLElement>()
let editorView: CodeMirrorEditorView | null = null

onMounted(async () => {
  if (!editorContainer.value) return
  editorContainer.value.addEventListener('paste', handlePaste)

  // Dynamic imports for SSR safety
  const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } = await import('@codemirror/view')
  const { EditorState } = await import('@codemirror/state')
  const { python } = await import('@codemirror/lang-python')
  const { oneDark } = await import('@codemirror/theme-one-dark')
  const { defaultKeymap, indentWithTab, history, historyKeymap } = await import('@codemirror/commands')
  const { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput } = await import('@codemirror/language')

  const updateListener = EditorView.updateListener.of((update: ViewUpdate) => {
    if (update.docChanged) {
      emit('update:modelValue', update.state.doc.toString())
    }
  })

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      indentOnInput(),
      python(),
      oneDark,
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      updateListener,
      EditorView.theme({
        '&': {
          backgroundColor: '#0d0d18',
        },
        '.cm-content': {
          caretColor: '#00e5ff',
          fontFamily: '"Roboto Mono", monospace',
        },
        '.cm-cursor': {
          borderLeftColor: '#00e5ff',
        },
        '.cm-activeLine': {
          backgroundColor: '#00e5ff08',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#00e5ff10',
        },
        '.cm-gutters': {
          backgroundColor: '#0a0a12',
          color: '#ffffff30',
          borderRight: '1px solid #00e5ff15',
        },
        '.cm-lineNumbers .cm-gutterElement': {
          color: '#00e5ff40',
        },
        '&.cm-focused .cm-matchingBracket': {
          backgroundColor: '#00e5ff20',
          outline: '1px solid #00e5ff40',
        },
        '.cm-selectionBackground': {
          backgroundColor: '#00e5ff15 !important',
        },
      }),
      EditorState.readOnly.of(props.readonly ?? false),
      EditorView.lineWrapping,
      EditorState.tabSize.of(4),
    ],
  })

  editorView = new EditorView({
    state,
    parent: editorContainer.value,
  })
})

// Watch for external changes to modelValue
watch(() => props.modelValue, (newVal) => {
  if (!editorView) return
  const currentVal = editorView.state.doc.toString()
  if (newVal !== currentVal) {
    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: newVal,
      },
    })
  }
})

onBeforeUnmount(() => {
  editorContainer.value?.removeEventListener('paste', handlePaste)
  editorView?.destroy()
})

function handlePaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') || ''
  if (text.length >= 240) {
    emit('large-paste', { length: text.length })
  }
}
</script>

<style scoped>
.code-editor-wrapper {
  height: 100%;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
}

.code-editor-wrapper :deep(.cm-editor) {
  height: 100%;
}
</style>
