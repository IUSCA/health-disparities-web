<template>
  <div class="flex-1">
    <va-input
      v-model="filterInput"
      class="w-full"
      :placeholder="`Type / to search cohorts`"
      outline
      clearable
      input-class="search-input"
    >
      <template #prependInner>
        <Icon icon="material-symbols:search" class="text-xl" />
      </template>
    </va-input>
    <va-data-table
      :items="items"
      :columns="columns"
      :loading="data_loading"
      hoverable
      :row-bind="getRowBind"
      @row:click="onClick"
      style="height: 400px; overflow-y: auto"
    >
      <template #cell(created_at)="{ value }">
        <span>{{ datetime.date(value) }}</span>
      </template>

      <template #cell(published)="{ source }">
        <span v-if="source" class="flex justify-center">
          <i-mdi-check-circle-outline class="text-green-700" />
        </span>
        <span v-else class="flex justify-center">
          <i-mdi-close-circle-outline class="text-red-700" />
        </span>
      </template>
    </va-data-table>
  </div>
</template>

<script setup>
import useSearchKeyShortcut from "@/composables/useSearchKeyShortcut";
import cohortService from "@/services/cohort2";
import * as datetime from "@/services/datetime";

useSearchKeyShortcut();
// const props = defineProps({});

const emit = defineEmits(["select"]);

const filterInput = ref("");

const columns = [
  {
    key: "name",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
  },
  {
    key: "description",
    sortable: false,
  },
  {
    key: "participants",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "100px",
  },
  {
    key: "created_at",
    label: "Created on",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "100px",
  },
  {
    key: "published",
    thAlign: "center",
    tdAlign: "center",
    width: "80px",
  },
];

const cohorts = ref([]);
const data_loading = ref(false);
const items = computed(() => {
  return cohorts.value.filter((cohort) => {
    const searchText = filterInput.value.toLowerCase();
    return (
      !searchText ||
      (cohort.name || "").toLowerCase().includes(searchText) ||
      (cohort.description || "").toLowerCase().includes(searchText)
    );
  });
});

cohortService
  .search()
  .then((res) => {
    cohorts.value = res.data;
    data_loading.value = false;
  })
  .finally(() => {
    data_loading.value = false;
  });

function onClick(event) {
  const row = event.item;
  emit("select", row);
}

function getRowBind() {
  return { class: ["cursor-pointer"] };
}
</script>
