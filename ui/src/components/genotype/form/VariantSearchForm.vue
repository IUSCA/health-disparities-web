<template>
  <div class="flex flex-wrap items-center gap-3">
    <VariantSearchInput
      v-model="param"
      :example_searches="props.example_searches"
      :error="error"
      @keydown.enter.prevent="handleClick"
    />

    <!-- search / add button -->
    <VaButton
      @click="handleClick"
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

const props = defineProps({
  searchParams: {
    type: Array,
    required: true,
  },
  example_searches: {
    type: Object,
    required: true,
  },
  replacementParam: {
    type: String,
    required: false,
  },
});

const emit = defineEmits(["add"]);

const param = ref("");

// when this prop is updated, update the input field with the new value
watch(
  () => props.replacementParam,
  (newVal) => {
    if (newVal) {
      // parse replacementParam. it is of the form <epoch>|<text>
      const parts = newVal.split("|", 2); // split into at most 2 parts
      param.value = parts[1];
    }
  },
);

const parsedParams = computed(() => {
  // if the param has commas,
  // first parse it assuming it is a single query
  // if it fails, then split by commas and parse each one
  const parsedParam = parseQuery(param.value);

  if (parsedParam == null && param.value.includes(",")) {
    return param.value
      .split(",")
      .map((s) => parseQuery(s.trim()))
      .filter((v) => v != null);
  }
  return parsedParam ? [parsedParam] : [];
});
const error = computed(() => {
  return param.value.trim() !== "" && parsedParams.value.length === 0;
});

function handleClick() {
  if (error.value) return;
  if (param.value.trim() === "") return;

  if (parsedParams.value.length > 0) {
    parsedParams.value.forEach((v) => emit("add", v));
    param.value = "";
  }
}
</script>
