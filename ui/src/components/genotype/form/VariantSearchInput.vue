<template>
  <va-input
    v-model="model"
    label="search"
    placeholder="Search by gene, variant, or genomic region"
    clearable
    inner-label
    @clear="emit('clear')"
    class="flex-none w-[370px]"
  >
    <template #prependInner>
      <Icon icon="material-symbols:search" class="text-xl" />
    </template>

    <template #appendInner>
      <VaPopover>
        <Icon
          :icon="error ? 'mdi-alert' : 'mdi:help-circle'"
          class="text-lg va-text-secondary"
          :class="{ ' text-amber-600 dark:text-amber-400': error }"
        />
        <template #title>
          <i v-if="error">
            The input text does not conform to any of the following patterns
          </i>
          <i v-else>Examples by query type:</i>
        </template>
        <template #body>
          <VariantSearchExample
            :example-searches="props.example_searches"
            @search="(val) => (model = val)"
            link-class="text-blue-200 hover:cursor-pointer hover:text-blue-500"
            class="text-sm"
          />
        </template>
      </VaPopover>
    </template>
  </va-input>
</template>

<script setup>
const model = defineModel();
const props = defineProps({
  example_searches: {
    type: Object,
    required: true,
  },
  error: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["clear"]);

// const isDark = useDark();
</script>
