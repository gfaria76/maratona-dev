<template>
  <div class="exam-timer" :class="{ 'timer-warning': tempoCritico }">
    <UIcon :name="tempoCritico ? 'i-lucide-alarm-clock' : 'i-lucide-clock-3'" class="timer-icon" />
    <span>{{ tempoFormatado }}</span>
  </div>
</template>

<script setup lang="ts">

const exam = useExamStore()
const { tempoFormatado, tempoCritico } = storeToRefs(exam)
</script>

<style scoped>
.exam-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid rgba(25, 211, 255, 0.28);
  border-radius: 8px;
  background: rgba(5, 8, 15, 0.72);
  color: #19d3ff;
  font-family: "Roboto Mono", monospace;
  font-size: 18px;
  font-weight: 800;
  padding: 8px 14px;
}

.timer-icon {
  width: 20px;
  height: 20px;
}

.exam-timer.timer-warning {
  border-color: rgba(255, 77, 143, 0.5);
  color: #ff4d8f;
}
</style>
