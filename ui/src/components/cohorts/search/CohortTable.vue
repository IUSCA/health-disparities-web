<template>
  <!--  -->
  <div ref="infinitescrollTarget" style="height: 440px; overflow-y: scroll">
    <va-infinite-scroll
      :load="onScrollToEnd"
      :scroll-target="infinitescrollTarget"
      :disabled="infinitescrollDisabled"
    >
      <va-data-table
        v-model:sort-by="sortBy"
        v-model:sorting-order="sortingOrder"
        :items="cohorts"
        :columns="columns"
        hoverable
        clickable
        :loading="data_loading"
        disableClientSideSorting
        @row:click="onClick"
      >
        <!-- <template #cell(type)="{ rowData }">
      <span class="uppercase text-sm">{{ rowData?.query?.name }}</span>
    </template> -->

        <template #cell(created_at)="{ value }">
          <span>{{ datetime.date(value) }}</span>
        </template>

        <template #cell(updated_at)="{ value }">
          <span>{{ datetime.date(value) }}</span>
        </template>

        <template #cell(status)="{ rowData }">
          <div class="flex items-center justify-center gap-1">
            <CohortPublishedIcon :is_published="rowData?.is_published" />
            <CohortLockedIcon :is_locked="rowData?.is_locked" />
          </div>
        </template>

        <!-- <template #cell(actions)="{ rowData }">
      <div>
        <va-button
          size="small"
          color="primary"
          @click="onCopy(rowData)"
          class="mr-1"
        >
          Copy
        </va-button>
        <va-button
          size="small"
          color="danger"
          @click="onDelete(rowData)"
          class="mr-1"
          :disabled="rowData?.is_locked"
        >
          Delete
        </va-button>
      </div>
    </template> -->
      </va-data-table>
      <div
        v-if="infinitescrollDisabled"
        class="mt-5 flex justify-center"
        :style="{ color: colors.secondary }"
      >
        No more data to load
      </div>
    </va-infinite-scroll>
  </div>
</template>

<script setup>
import cohortService from "@/services/cohorts";
import * as datetime from "@/services/datetime";
import { useColors } from "vuestic-ui/web-components";

const props = defineProps({
  params: Object, // search params
});

const emit = defineEmits(["select"]);

const { colors } = useColors();

// table parent div's width is 944px
const columns = [
  {
    key: "name",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    tdClass: "truncate",
    width: "400px",
  },
  // {
  //   key: "type",
  //   width: "100px",
  // },
  {
    key: "size",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "created_at",
    label: "Created on",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "100px",
  },
  {
    key: "updated_at",
    label: "Updated on",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "100px",
  },
  {
    key: "status",
    thAlign: "center",
    tdAlign: "center",
    width: "80px",
  },
  // {
  //   key: "actions",
  //   thAlign: "center",
  //   tdAlign: "center",
  //   width: "120px",
  // },
];

const cohorts = ref([]);
const data_loading = ref(false);
const sortBy = ref("created_at");
const sortingOrder = ref("desc");
const infinitescrollTarget = ref(null);
const LIMIT = 10;
const offset = ref(0);
const infinitescrollDisabled = ref(false);

function fetch() {
  // when the sorting order is null, the sorting is not applied
  const _sortingOrder = sortingOrder.value;
  const _sortBy = _sortingOrder == null ? null : sortBy.value;
  return cohortService
    .search({
      ...props.params,
      sort_by: _sortBy,
      sort_order: _sortingOrder,
      limit: LIMIT,
      offset: offset.value,
    })
    .then((res) => {
      return res.data;
    });
}

watch(
  [() => props.params, sortBy, sortingOrder],
  () => {
    data_loading.value = true;
    offset.value = 0;
    infinitescrollDisabled.value = false;

    fetch()
      .then((data) => {
        cohorts.value = data;
      })
      .finally(() => {
        data_loading.value = false;
      });
  },
  { deep: true, immediate: true },
);

function onClick(event) {
  const row = event.item;
  emit("select", row);
}

function onScrollToEnd() {
  // load more data
  offset.value += LIMIT;
  return fetch().then((data) => {
    if (data && data.length < LIMIT) {
      infinitescrollDisabled.value = true;
    }
    cohorts.value = cohorts.value.concat(data || []);
  });
}
</script>
