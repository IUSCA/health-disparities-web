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

        <template #cell(author)="{ rowData }">
          <UserAvatar
            :username="rowData.author.username"
            :name="rowData.author.name"
          />
        </template>

        <template #cell(status)="{ rowData }">
          <div class="flex items-center justify-center gap-1">
            <CohortVisibilityIcon :visibility="rowData?.visibility" />
            <!-- <CohortLockedIcon :is_locked="rowData?.is_locked" /> -->
            <VaPopover v-if="rowData?.is_archived" message="Archived">
              <i-mdi-archive class="va-text-secondary text-sm" />
            </VaPopover>
          </div>
        </template>

        <template #cell(type)="{ rowData }">
          <span class="capitalize">{{ rowData?.query?.schema?.name }}</span>
        </template>

        <template #cell(actions)="{ rowData }">
          <div class="flex items-center justify-start gap-1">
            <!-- <va-button
              size="small"
              color="primary"
              @click="onCopy(rowData)"
              class="mr-1"
            >
              Copy
            </va-button> -->

            <!-- Download data -->
            <VaPopover message="Download data">
              <VaButton
                color="primary"
                @click="onDownload(rowData)"
                class="mr-1"
                icon="download"
                preset="plain"
              >
              </VaButton>
            </VaPopover>

            <!-- cannot delete currently selected cohorts -->
            <VaPopover v-if="can('delete', rowData)" message="Delete">
              <va-button
                color="danger"
                @click="onDelete(rowData)"
                class="mr-1"
                :disabled="props.selected.includes(rowData.id)"
                icon="delete"
                preset="plain"
              >
              </va-button>
            </VaPopover>

            <!-- unarchive -->
            <VaPopover
              v-if="can('unarchive', rowData)"
              message="Restore from archive"
            >
              <va-button
                color="primary"
                @click="onUnarchive(rowData)"
                class="mr-1"
                icon="unarchive"
                preset="plain"
              >
              </va-button>
            </VaPopover>

            <!-- archive -->
            <VaPopover v-if="can('archive', rowData)" message="Archive">
              <va-button
                color="primary"
                @click="onArchive(rowData)"
                class="mr-1"
                icon="archive"
                preset="plain"
              >
              </va-button>
            </VaPopover>

            <!-- change visibility -->
            <VaPopover
              v-if="rowData?.allowed_transitions?.length > 0"
              message="Change visibility"
            >
              <va-button
                color="primary"
                @click="onChangeVisibility(rowData)"
                class="mr-1"
                icon="visibility"
                preset="plain"
              >
              </va-button>
            </VaPopover>

            <!-- share -->
            <VaPopover message="Share">
              <va-button
                color="primary"
                @click="onShare(rowData)"
                class="mr-1"
                icon="share"
                preset="plain"
              >
              </va-button>
            </VaPopover>
          </div>
        </template>

        <template #cell(favorite)="{ rowData }">
          <div class="flex items-center justify-center">
            <CohortFavoriteButton :cohort="rowData" :key="rowData.id" />
          </div>
        </template>

        <template #cell(size)="{ rowData }">
          <CohortSize :cohort="rowData" class="text-center" />
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
  <CohortDeleteModal ref="deleteModal" @update="onUpdateRefetchData" />
  <CohortDownloadModal ref="downloadModal" @update="onUpdateRefetchData" />
  <CohortChangeVisibilityModal
    ref="changeVisibilityModal"
    @update="onUpdateRefetchData"
  />
  <CohortShareModal ref="shareModal" @update="onUpdateRefetchData" />
</template>

<script setup>
import { CV } from "@/components/cohorts/models";
import cohortService from "@/services/cohorts2";
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import { useModal } from "vuestic-ui";
import { useColors } from "vuestic-ui/web-components";

const props = defineProps({
  params: Object, // search params
  selected: {
    type: Array,
    default: () => [],
  },
  showActions: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["select"]);

const { colors } = useColors();
const { confirm } = useModal();

const deleteModal = ref(null);
const downloadModal = ref(null);

// table parent div's width is 944px
const columns = [
  ...(props.showActions
    ? [
        {
          key: "favorite",
          label: " ",
          width: "20px",
          thAlign: "center",
          tdAlign: "center",
        },
      ]
    : []),
  {
    key: "name",
    sortable: true,
    sortingOptions: ["desc", "asc", null],
    width: "400px",
    tdClass: "truncate",
  },
  {
    key: "type",
    width: "100px",
  },
  {
    key: "author",
    label: "Author",
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
  ...(props.showActions
    ? [
        {
          key: "actions",
          width: "120px",
        },
      ]
    : []),
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
  const { view_mode, type, search_term, status } = props.params;
  const searchParams = {
    sort_by: _sortBy,
    sort_order: _sortingOrder,
    limit: LIMIT,
    offset: offset.value,
  };

  // view_mode can be one of "created_by_me", "published", "shared_with_me"
  if (view_mode === "created_by_me") {
    searchParams.created_by_me = true;
  } else if (view_mode === "published") {
    searchParams.visibility = CV.PUBLIC;
  } else if (view_mode === "shared_with_me") {
    searchParams.shared_with_me = true;
  }

  // type
  if (type) {
    searchParams.type = type;
  }
  // search term
  if (search_term) {
    searchParams.search_term = search_term;
  }

  // status can be one of "all", "archived", "favorited"
  if (status === "archived") {
    searchParams.archived = true;
  } else if (status === "favorited") {
    searchParams.favorited = true;
  }
  // console.log("searchParams", searchParams);
  // console.log("props.params", props.params);
  return cohortService.search(searchParams).then((res) => {
    return res.data?.data || [];
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

function onUpdateRefetchData() {
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

function can(action, cohort) {
  return (cohort?.permitted_actions || []).includes(action);
}

function onUnarchive(row) {
  confirm({
    message:
      "Are you sure you want to restore this cohort from archive? It will be editable again.",
    okText: "Restore",
  }).then(async (ok) => {
    if (!ok) return;
    data_loading.value = true;
    try {
      await cohortService.unarchive(row.id);
      toast.success("Cohort restored from archive successfully");
    } catch (err) {
      err?.response?.data?.message
        ? toast.error("Unable to restore cohort : " + err.response.data.message)
        : toast.error("Unable to restore cohort");
    }

    onUpdateRefetchData();
  });
}

function onArchive(row) {
  confirm({
    message:
      "Archiving a cohort will lock it and prevent it from being used in other cohorts, but it will not delete any data. You can restore it later if needed.",
    okText: "Archive",
  }).then((ok) => {
    if (!ok) return;
    data_loading.value = true;
    cohortService
      .archive(row.id)
      .then(() => {
        toast.success("Cohort archived successfully");
        onUpdateRefetchData();
      })
      .catch((err) => {
        data_loading.value = false;
        err?.response?.data?.message
          ? toast.error(
              "Unable to archive cohort : " + err.response.data.message,
            )
          : toast.error("Unable to archive cohort");
      });
  });
}

const changeVisibilityModal = ref(null);
function onChangeVisibility(row) {
  changeVisibilityModal.value.show(row);
}

const shareModal = ref(null);
function onShare(row) {
  shareModal.value.show(row);
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
