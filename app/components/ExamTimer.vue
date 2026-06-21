<template>
  <UBadge
    :color="tempoCritico ? 'error' : 'primary'"
    variant="soft"
    size="lg"
    class="exam-timer"
    :class="{ 'timer-warning': tempoCritico }"
  >
    <UIcon
      :name="tempoCritico ? 'i-lucide-alarm-clock' : 'i-lucide-clock-3'"
      class="timer-icon"
    />
    <span>{{ tempoFormatado }}</span>
  </UBadge>
</template>

<script setup lang="ts">
const exam = useExamStore();
const { tempoFormatado, tempoCritico } = storeToRefs(exam);
</script>

<style scoped>
.exam-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Roboto Mono", monospace;
  font-size: 18px;
  font-weight: 800;
  padding: 8px 14px;
}

.timer-icon {
  width: 20px;
  height: 20px;
}
</style>
