<template>
  <div
    class="flex flex-wrap items-center gap-1 w-full text-sm max-h-[100px] overflow-y-scroll"
  >
    <div class="flex-none mr-2" v-if="props.searchParams.length > 1">
      <VaPopover>
        <template #body>
          <p class="max-w-sm">
            This search is performed using OR logic. Results will include
            variants that match any of the selected search parameters.
          </p>
        </template>
        <VaChip size="small">
          <i-mdi-information-circle class="ml-[-2px] mr-1 mt-[-4px] text-sm" />
          <p class="mt-[-4px]">Inclusive Search</p>
        </VaChip>
      </VaPopover>
    </div>

    <div class="mr-2" v-else>
      <VaChip v-if="props.searchParams.length > 0" size="small">
        <span> Search </span>
      </VaChip>
    </div>

    <VaChip
      v-for="(param, idx) in props.searchParams"
      :key="idx"
      class="flex-none"
      closeable
      outline
      size="small"
      @update:modelValue="emit('remove', param)"
      @click="emit('selectText', makeText(param))"
    >
      <span class="font-semibold pr-1 capitalize"> {{ param.type }}: </span>
      <span> {{ makeText(param) }} </span>
    </VaChip>
  </div>
</template>

<script setup>
const props = defineProps({
  searchParams: {
    type: Array,
    required: true,
  },
});
const emit = defineEmits(["remove", "selectText"]);

function makeText(param) {
  if (param.text) return param.text;
  if (param.type === "gene") {
    return param.value.name;
  }

  if (param.type === "variant") {
    return `${param.value.chr}-${param.value.position}-${param.value.ref}-${param.value.alt}`;
  }

  if (param.type === "region") {
    return `chr${param.value.chr}:${param.value.start}-${param.value.end}`;
  }
}
</script>
