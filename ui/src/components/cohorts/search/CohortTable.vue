<template>
  <!--  -->
  <div ref="infiniteScrollTarget" style="height: 440px; overflow-y: scroll">
    <va-infinite-scroll
      :load="onScrollToEnd"
      :scroll-target="infiniteScrollTarget"
      :disabled="infiniteScrollDisabled"
    >
      <va-data-table
        v-model:sort-by="sortBy"
        v-model:sorting-order="sortingOrder"
        :items="cohorts"
        :columns="columns"
        :loading="data_loading"
        disableClientSideSorting
        :row-bind="getRowBind"
      >
        <template #cell(name)="{ rowData }">
          <span
            class="va-link text-left"
            @click="onClick(rowData)"
            @keydown.enter="onClick(rowData)"
            role="button"
            tabindex="0"
            v-if="!props.selected.includes(rowData.id)"
          >
            {{ rowData.name }}
          </span>
          <span v-else>{{ rowData.name }}</span>
        </template>

        <template #cell(updated_at)="{ value }">
          <span>{{ datetime.date(value) }}</span>
        </template>

        <template #cell(author_username)="{ rowData }">
          <UserAvatar
            :username="rowData.author_username"
            :name="rowData.author_name"
          />
        </template>

        <template #cell(status)="{ rowData }">
          <div class="flex items-center justify-center gap-1">
            <CohortPublishedIcon :is_published="rowData?.is_published" />
            <CohortLockedIcon :is_locked="rowData?.is_locked" />
          </div>
        </template>

        <template #cell(actions)="{ rowData }">
          <div class="flex items-center justify-center gap-1">
            <!-- <va-button
              size="small"
              color="primary"
              @click="onCopy(rowData)"
              class="mr-1"
            >
              Copy
            </va-button> -->

            <!-- Download data -->
            <VaButton
              size="small"
              color="primary"
              @click="onDownload(rowData)"
              class="mr-1"
              icon="download"
              preset="primary"
              :disabled="!rowData?.is_published"
            >
            </VaButton>

            <!-- cannot delete published cohort -->
            <!-- cannot delete currently selected cohorts -->
            <va-button
              size="small"
              color="danger"
              @click="onDelete(rowData)"
              class="mr-1"
              :disabled="
                rowData?.is_published || props.selected.includes(rowData.id)
              "
              v-if="props.showDelete"
              icon="delete"
              preset="primary"
            >
            </va-button>
          </div>
        </template>
      </va-data-table>
      <div
        v-if="infiniteScrollDisabled"
        class="mt-5 flex justify-center"
        :style="{ color: colors.secondary }"
      >
        No more data to load
      </div>
    </va-infinite-scroll>
  </div>
  <CohortDeleteModal ref="deleteModal" @update="onDeleteSuccess" />
  <CohortDownloadModal ref="downloadModal" />
</template>

<script setup>
import cohortService from "@/services/cohorts";
import * as datetime from "@/services/datetime";
import { useColors } from "vuestic-ui/web-components";

const props = defineProps({
  params: Object, // search params
  selected: {
    type: Array,
    default: () => [],
  },
  showDelete: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["select"]);

const { colors } = useColors();

const deleteModal = ref(null);
const downloadModal = ref(null);

// table parent div's width is 944px
const columns = [
  {
    key: "name",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "400px",
    tdClass: "truncate",
  },
  // {
  //   key: "type",
  //   width: "100px",
  // },
  {
    key: "author_username",
    label: "Author",
    sortable: true,
    width: "100px",
  },
  {
    key: "size",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "updated_at",
    label: "Last Updated",
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
  {
    key: "actions",
    thAlign: "center",
    tdAlign: "center",
    width: "120px",
  },
];

const cohorts = ref([]);
const data_loading = ref(false);
const sortBy = ref("created_at");
const sortingOrder = ref("desc");
const infiniteScrollTarget = ref(null);
const LIMIT = 10;
const offset = ref(0);
const infiniteScrollDisabled = ref(false);

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
    infiniteScrollDisabled.value = false;

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

function onClick(row) {
  // do not select if already selected
  if (props.selected.includes(row.id)) {
    return;
  }
  emit("select", row);
}

function onScrollToEnd() {
  // load more data
  offset.value += LIMIT;
  return fetch().then((data) => {
    if (data && data.length < LIMIT) {
      infiniteScrollDisabled.value = true;
    }
    cohorts.value = cohorts.value.concat(data || []);
  });
}

function getRowBind(row) {
  if (props.selected.includes(row.id)) {
    return { class: ["disabled-row"] };
  }
}

function onDelete(row) {
  deleteModal.value.show(row);
}

function onDeleteSuccess() {
  data_loading.value = true;
  offset.value = 0;
  infiniteScrollDisabled.value = false;

  fetch()
    .then((data) => {
      cohorts.value = data;
    })
    .finally(() => {
      data_loading.value = false;
    });
}

function onDownload(row) {
  downloadModal.value.show(row);
}
</script>

<style lang="scss">
:root {
  --disabled-row-bg: #b5b5b5;
}

html.dark {
  --disabled-row-bg: #4a4a4a;
}
</style>

<style scoped lang="scss">
:deep(.disabled-row) {
  background-color: var(--disabled-row-bg);
  cursor: not-allowed !important;
}
</style>
