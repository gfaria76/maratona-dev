<template>
  <div class="file-editor-shell">
    <div class="file-tabs" role="tablist" aria-label="Arquivos Python">
      <button
        v-for="file in localFiles"
        :key="file.name"
        class="file-tab"
        :class="{ 'is-active': file.name === activeName }"
        type="button"
        role="tab"
        :aria-selected="file.name === activeName"
        @click="activeName = file.name"
      >
        <UIcon name="i-lucide-file-code-2" />
        <span>{{ file.name }}</span>
        <UIcon
          v-if="file.name !== 'main.py'"
          name="i-lucide-x"
          class="close-icon"
          @click.stop="removeFile(file.name)"
        />
      </button>

      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Adicionar arquivo"
        @click="addFile"
      />
    </div>

    <ClientOnly>
      <CodeEditor
        class="code-editor-fill"
        :model-value="activeFile?.content ?? ''"
        @update:model-value="updateActiveContent"
        @large-paste="emit('large-paste', $event)"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { CodigoArquivo } from '#shared/types/exam'

const props = defineProps<{
  modelValue: string
  files?: CodigoArquivo[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:files': [value: CodigoArquivo[]]
  'large-paste': [payload: { length: number }]
}>()

const activeName = ref('main.py')
const localFiles = ref<CodigoArquivo[]>(normalizeFiles(props.files?.length ? props.files : [{ name: 'main.py', content: props.modelValue }]))

const activeFile = computed(() => localFiles.value.find((file) => file.name === activeName.value) ?? localFiles.value[0])

watch(() => props.files, (files) => {
  localFiles.value = normalizeFiles(files?.length ? files : [{ name: 'main.py', content: props.modelValue }])
  if (!localFiles.value.some((file) => file.name === activeName.value)) {
    activeName.value = localFiles.value[0]?.name ?? 'main.py'
  }
}, { deep: true })

watch(() => props.modelValue, (value) => {
  const main = localFiles.value.find((file) => file.name === 'main.py')
  if (main && main.content !== value) {
    main.content = value
  }
})

function updateActiveContent(content: string) {
  localFiles.value = localFiles.value.map((file) => (
    file.name === activeName.value ? { ...file, content } : file
  ))

  const main = localFiles.value.find((file) => file.name === 'main.py') ?? localFiles.value[0]
  emit('update:files', localFiles.value)
  emit('update:modelValue', main?.content ?? '')
}

function addFile() {
  const rawName = window.prompt('Nome do arquivo Python', nextFileName())
  const name = normalizeFileName(rawName || '')
  if (!name || localFiles.value.some((file) => file.name === name)) return

  localFiles.value = [...localFiles.value, { name, content: '' }]
  activeName.value = name
  emit('update:files', localFiles.value)
}

function removeFile(name: string) {
  localFiles.value = localFiles.value.filter((file) => file.name !== name)
  if (!localFiles.value.some((file) => file.name === activeName.value)) {
    activeName.value = 'main.py'
  }
  emit('update:files', localFiles.value)
  emit('update:modelValue', localFiles.value.find((file) => file.name === 'main.py')?.content ?? '')
}

function nextFileName() {
  let index = 1
  while (localFiles.value.some((file) => file.name === `helper${index}.py`)) {
    index++
  }
  return `helper${index}.py`
}

function normalizeFiles(files: CodigoArquivo[]): CodigoArquivo[] {
  const seen = new Set<string>()
  const normalized = files
    .map((file) => ({ name: normalizeFileName(file.name), content: file.content ?? '' }))
    .filter((file) => {
      if (!file.name || seen.has(file.name)) return false
      seen.add(file.name)
      return true
    })

  const mainIndex = normalized.findIndex((file) => file.name === 'main.py')
  if (mainIndex === -1) {
    return [{ name: 'main.py', content: props.modelValue }, ...normalized]
  }

  const [main] = normalized.splice(mainIndex, 1)
  return main ? [main, ...normalized] : normalized
}

function normalizeFileName(value: string) {
  const clean = value.trim().replace(/\\/g, '/').replace(/^\/*/, '').replace(/\.\./g, '')
  if (!clean) return ''
  return clean.endsWith('.py') ? clean : `${clean}.py`
}
</script>

<style scoped>
.file-editor-shell {
  display: flex;
  height: 100%;
  min-height: 520px;
  max-height: none;
  flex-direction: column;
  resize: vertical;
  overflow: hidden;
  border: 1px solid rgba(25, 211, 255, 0.16);
  border-radius: 8px;
  background: rgba(7, 10, 18, 0.94);
}

.file-tabs {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  border-bottom: 1px solid rgba(25, 211, 255, 0.12);
  background: rgba(5, 8, 15, 0.92);
  padding: 5px;
}

.file-tab {
  display: inline-flex;
  height: 28px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: rgba(244, 247, 251, 0.62);
  cursor: pointer;
  font-family: "Roboto Mono", monospace;
  font-size: 12px;
  padding: 0 9px;
}

.file-tab:hover,
.file-tab.is-active {
  border-color: rgba(25, 211, 255, 0.22);
  background: rgba(25, 211, 255, 0.1);
  color: #f4f7fb;
}

.close-icon {
  color: rgba(244, 247, 251, 0.45);
}

.close-icon:hover {
  color: #ff4d8f;
}

.code-editor-fill {
  min-height: 0;
  flex: 1;
}
</style>
