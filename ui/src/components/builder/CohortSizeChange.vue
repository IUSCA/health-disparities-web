<template>
  <span
    v-if="props.change !== null"
    class="va-text-secondary"
    :style="{
      color: props.change >= 0 ? colors.success : colors.danger,
    }"
  >
    <span v-if="props.parenthesis">(</span>
    <span v-if="props.change >= 0">
      +{{ number_formatter.format(props.change) }}</span
    >
    <span v-else>
      {{ number_formatter.format(props.change) }}
    </span>
    <span v-if="props.parenthesis">)</span>
  </span>
</template>

<script setup>
import { useColors } from "vuestic-ui";
const { colors } = useColors();
const props = defineProps({
  change: Number,
  parenthesis: Boolean,
});

const number_formatter = Intl.NumberFormat("en", { notation: "compact" });
</script>
