<template>
  <div :title="props.is_favorited ? 'Favorited' : 'Not Favorited'">
    <i-mdi-star v-if="props.is_favorited" class="" style="color: #ffb300" />
    <i-mdi-star-outline v-else class="va-text-secondary" />
  </div>
</template>

<script setup>
const props = defineProps({
  is_favorited: {
    type: Boolean,
    required: true,
  },
});
</script>
