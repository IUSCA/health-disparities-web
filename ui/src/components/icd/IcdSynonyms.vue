<template>
  <VaInnerLoading :loading="loading">
    <div class="flex gap-3 overflow-x-scroll">
      <VaButton
        @click="emit('search', name)"
        color="primary"
        preset="plain"
        v-for="name in names"
        :key="name"
      >
        <div class="max-w-[200px] truncate">
          {{ name }}
        </div>
      </VaButton>
    </div>
  </VaInnerLoading>
</template>

<script setup>
import icd10Service from "@/services/icd10";

const props = defineProps({
  keyword: String,
});
const emit = defineEmits(["search"]);

const loading = ref(false);
const names = ref([]);

watch(
  () => props.keyword,
  () => {
    handleSearch();
  },
  { immediate: true },
);

function handleSearch() {
  console.log("searching for", props.keyword);
  loading.value = true;
  icd10Service
    .searchSynonyms({ keyword: props.keyword })
    .then((res) => {
      names.value = res.data.map((item) => item.concept_name);
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
