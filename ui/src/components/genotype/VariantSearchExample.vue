<template>
  <!-- search examples -->
  <ul class="list-inside list-disc">
    <li>
      <span class="font-bold"> Gene </span> :
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['gene'])"
      >
        {{ props.exampleSearches["gene"] }}
      </button>
    </li>
    <li>
      <span class="font-bold"> Variant </span>:
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['variant'])"
      >
        {{ props.exampleSearches["variant"] }}
      </button>
    </li>
    <li>
      <span class="font-bold"> Genomic Region </span>:
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['genomic_region'])"
      >
        {{ props.exampleSearches["genomic_region"] }}
      </button>
    </li>
  </ul>
</template>

<script setup>
const props = defineProps({
  exampleSearches: Object,
  linkClass: {
    type: String,
    default: "va-link",
  },
});
const emit = defineEmits(["search"]);
</script>
