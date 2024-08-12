<template>
  <div class="flex flex-wrap gap-3 overflow-x-scroll w-full">
    <VaButton
      @click="emit('search', name)"
      color="primary"
      preset="plain"
      v-for="name in names"
      :key="name"
    >
      <div class="max-w-[300px] truncate">
        {{ name }}
      </div>
    </VaButton>
    <div v-if="notFound">None Found</div>
  </div>
</template>

<script setup>
import icd10Service from "@/services/icd10";

const props = defineProps({
  keyword: String,
});
const emit = defineEmits(["search"]);

const loading = ref(false);
const names = ref([]);
const notFound = ref(false);

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
  notFound.value = false;
  icd10Service
    .searchSynonyms({ keyword: props.keyword })
    .then((res) => {
      names.value = res.data.map((item) => item.concept_name);
      notFound.value = names.value.length === 0;
    })
    .catch((err) => {
      console.log(err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
