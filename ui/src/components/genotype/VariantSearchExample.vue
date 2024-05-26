<template>
  <!-- search examples -->
  <div>
    <p>
      <span class="font-bold"> Gene </span> :
      <button
        class="va-link underline"
        @click="emit('search', props.example_searches['gene'])"
      >
        {{ props.example_searches["gene"] }}
      </button>
    </p>
    <p>
      <span class="font-bold"> Variant </span>:
      <button
        class="va-link underline"
        @click="emit('search', props.example_searches['variant'])"
      >
        {{ props.example_searches["variant"] }}
      </button>
    </p>
    <p>
      <span class="font-bold"> Genomic Region </span>:
      <button
        class="va-link underline"
        @click="emit('search', props.example_searches['genomic_region'])"
      >
        {{ props.example_searches["genomic_region"] }}
      </button>
    </p>
  </div>
</template>

<script setup>
const props = defineProps({
  example_searches: Object,
});
const emit = defineEmits(["search"]);
</script>
