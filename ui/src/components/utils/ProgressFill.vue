<!-- 
  Usage: 
    <ProgressFill :percentage="50" color="#4caf50">
      <div class="flex justify-between">
        <span>50%</span>
      </div>
    </ProgressFill>
-->

<template>
  <div class="w-full overflow-hidden relative">
    <div
      class="progress-fill"
      :style="{ width: `${props.percentage}%`, backgroundColor: props.color }"
    ></div>
    <div class="progress-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  percentage: {
    type: Number,
    default: 0,
    validator: (value) => value >= 0 && value <= 100,
  },
  color: {
    type: String,
    default: "#4caf50",
  },
});
</script>

<style scoped>
.progress-fill {
  height: 100%;
  transition: width 0.3s ease; /* Smooth transition */
  position: absolute;
  top: 0;
  left: 0;
}

.progress-content {
  position: relative;
  z-index: 1; /* Ensure content is above the fill */
  width: 100%; /* Always take full width */
  height: 100%; /* Always take full height */
}
</style>
