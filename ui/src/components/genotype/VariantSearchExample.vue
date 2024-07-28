<template>
  <!-- search examples -->
  <div>
    <p>
      <span class="font-bold"> Gene </span> :
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['gene'])"
      >
        {{ props.exampleSearches["gene"] }}
      </button>
    </p>
    <p>
      <span class="font-bold"> Variant </span>:
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['variant'])"
      >
        {{ props.exampleSearches["variant"] }}
      </button>
    </p>
    <p>
      <span class="font-bold"> Genomic Region </span>:
      <button
        :class="props.linkClass"
        class="underline"
        @click="emit('search', props.exampleSearches['genomic_region'])"
      >
        {{ props.exampleSearches["genomic_region"] }}
      </button>
    </p>
  </div>
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
