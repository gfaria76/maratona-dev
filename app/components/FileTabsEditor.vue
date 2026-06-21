<template>
  <div class="file-editor-shell">
    <UTabs
      v-model="activeName"
      :items="fileTabItems"
      :content="false"
      size="xs"
      variant="link"
      class="file-tabs"
      :ui="{ list: 'gap-1 overflow-x-auto px-1', trigger: 'font-mono' }"
    >
      <template #default="{ item }">
        <UIcon name="i-lucide-file-code-2" class="size-4" />
        <span>{{ item.label }}</span>
        <UIcon
          v-if="item.value !== 'main.py'"
          name="i-lucide-x"
          class="close-icon"
          @click.stop.prevent="removeFile(String(item.value))"
        />
      </template>

      <template #list-trailing>
        <UTooltip text="Adicionar arquivo Python">
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Adicionar arquivo"
            @click="addFile"
          />
        </UTooltip>
      </template>
    </UTabs>

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
import type { CodigoArquivo } from "#shared/types/exam";

const props = defineProps<{
  modelValue: string;
  files?: CodigoArquivo[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
  "update:files": [value: CodigoArquivo[]];
  "large-paste": [payload: { length: number }];
}>();

const activeName = ref("main.py");
const localFiles = ref<CodigoArquivo[]>(
  normalizeFiles(
    props.files?.length
      ? props.files
      : [{ name: "main.py", content: props.modelValue }],
  ),
);

const activeFile = computed(
  () =>
    localFiles.value.find((file) => file.name === activeName.value) ??
    localFiles.value[0],
);
const fileTabItems = computed(() =>
  localFiles.value.map((file) => ({
    label: file.name,
    value: file.name,
  })),
);

watch(
  () => props.files,
  (files) => {
    localFiles.value = normalizeFiles(
      files?.length ? files : [{ name: "main.py", content: props.modelValue }],
    );
    if (!localFiles.value.some((file) => file.name === activeName.value)) {
      activeName.value = localFiles.value[0]?.name ?? "main.py";
    }
  },
  { deep: true },
);

watch(
  () => props.modelValue,
  (value) => {
    const main = localFiles.value.find((file) => file.name === "main.py");
    if (main && main.content !== value) {
      main.content = value;
    }
  },
);

function updateActiveContent(content: string) {
  localFiles.value = localFiles.value.map((file) =>
    file.name === activeName.value ? { ...file, content } : file,
  );

  const main =
    localFiles.value.find((file) => file.name === "main.py") ??
    localFiles.value[0];
  emit("update:files", localFiles.value);
  emit("update:modelValue", main?.content ?? "");
}

function addFile() {
  const rawName = window.prompt("Nome do arquivo Python", nextFileName());
  const name = normalizeFileName(rawName || "");
  if (!name || localFiles.value.some((file) => file.name === name)) return;

  localFiles.value = [...localFiles.value, { name, content: "" }];
  activeName.value = name;
  emit("update:files", localFiles.value);
}

function removeFile(name: string) {
  localFiles.value = localFiles.value.filter((file) => file.name !== name);
  if (!localFiles.value.some((file) => file.name === activeName.value)) {
    activeName.value = "main.py";
  }
  emit("update:files", localFiles.value);
  emit(
    "update:modelValue",
    localFiles.value.find((file) => file.name === "main.py")?.content ?? "",
  );
}

function nextFileName() {
  let index = 1;
  while (localFiles.value.some((file) => file.name === `helper${index}.py`)) {
    index++;
  }
  return `helper${index}.py`;
}

function normalizeFiles(files: CodigoArquivo[]): CodigoArquivo[] {
  const seen = new Set<string>();
  const normalized = files
    .map((file) => ({
      name: normalizeFileName(file.name),
      content: file.content ?? "",
    }))
    .filter((file) => {
      if (!file.name || seen.has(file.name)) return false;
      seen.add(file.name);
      return true;
    });

  const mainIndex = normalized.findIndex((file) => file.name === "main.py");
  if (mainIndex === -1) {
    return [{ name: "main.py", content: props.modelValue }, ...normalized];
  }

  const [main] = normalized.splice(mainIndex, 1);
  return main ? [main, ...normalized] : normalized;
}

function normalizeFileName(value: string) {
  const clean = value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/*/, "")
    .replace(/\.\./g, "");
  if (!clean) return "";
  return clean.endsWith(".py") ? clean : `${clean}.py`;
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
  border: 1px solid color-mix(in oklab, var(--ui-primary) 16%, transparent);
  border-radius: 8px;
  background: color-mix(in oklab, var(--ui-bg) 94%, black);
}

.file-tabs {
  min-height: 38px;
  border-bottom: 1px solid
    color-mix(in oklab, var(--ui-primary) 12%, transparent);
  background: color-mix(in oklab, var(--ui-bg) 90%, black);
  padding: 5px;
}

.close-icon {
  color: var(--ui-text-dimmed);
}

.close-icon:hover {
  color: var(--ui-error);
}

.code-editor-fill {
  min-height: 0;
  flex: 1;
}
</style>
