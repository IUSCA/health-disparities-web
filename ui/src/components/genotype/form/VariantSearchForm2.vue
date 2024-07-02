<template>
  <div class="flex flex-wrap items-center gap-3">
    <VariantSearchInput
      v-model="param"
      :example_searches="props.example_searches"
      :error="error"
    />

    <!-- search / add button -->
    <VaButton
      @click="hadleClick"
      color="success"
      :disabled="error || param.trim() === ''"
      class="flex-none"
    >
      {{ searchParams.length > 0 ? "Add" : "Search" }}
    </VaButton>
  </div>
</template>

<script setup>
import { parseQuery } from "@/components/genotype/lib";

const searchParams = defineModel("searchParams");

const props = defineProps({
  example_searches: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["add"]);

const param = ref("");

const parsedParam = computed(() => parseQuery(param.value));
const error = computed(() => {
  return param.value.trim() !== "" && parsedParam.value === null;
});

function hadleClick() {
  if (error.value) return;

  if (parsedParam.value) {
    emit("add", parsedParam.value);
    param.value = "";
  }
}
</script>
