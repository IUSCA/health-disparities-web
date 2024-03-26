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
        <Icon icon="mdi:help-circle" class="text-base va-text-secondary" />
        <template #title>
          <i>Examples by query type:</i>
        </template>
        <template #body>
          <p>
            <span class="font-bold"> Gene </span> :
            {{ props.example_searches["gene"] }}
          </p>
          <p>
            <span class="font-bold"> Variant </span>:
            {{ props.example_searches["variant"] }}
          </p>
          <p>
            <span class="font-bold"> Genomic Region </span>:
            {{ props.example_searches["genomic_region"] }}
          </p>
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
});

const emit = defineEmits(["clear"]);
</script>
