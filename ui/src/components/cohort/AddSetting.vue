<script setup>

const data = ref

</script>


<template>
<va-select   class="w-screen" v-model="include.category" :options="cohortStore.categories" label="Category" @update:modelValue="getIncludes( index, include.category)"  />

<div class="flex" v-if="include.category">
  <va-select class="w-full border-gray-800 border border-solid rounded"  v-model="include.field" :options="include.options" label="Field" />
  <va-input class="w-2  w-full rounded"  v-model="include.val" label="Value" />
</div>
</template>