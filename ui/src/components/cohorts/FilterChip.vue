<template>
  <div class="flex items-center truncate">
    <va-chip class="" size="small" square :color="stringToRGB(category.key)">
      <Icon :icon="category.icon" class="md:mr-1" />
      <span class="hidden md:inline text-xs"> {{ category.label }} </span>

      <i-mdi-chevron-right class="" />

      <span class="font-semibold">
        {{ filter.label }}
      </span>
    </va-chip>
  </div>
</template>

<script setup>
import { stringToRGB } from "@/services/colors";

const props = defineProps({
  filters: Object,
  identifier: String,
  seperator: {
    type: String,
    default: ".",
  },
});

const category = ref(null);
const filter = ref(null);

watch(
  () => props.identifier,
  () => {
    const [category_key, filer_key] = props.identifier.split(props.seperator);

    category.value = props.filters.find(
      (category) => category.key === category_key,
    );
    filter.value = category.value.filters.find(
      (filter) => filter.key === filer_key,
    );
  },
  {
    immediate: true,
  },
);
</script>
