<template>
  <div>
    <!-- search bar and create button -->
    <div class="flex items-center gap-3 mb-3">
      <!-- search bar -->
      <div class="flex-1">
        <va-input
          v-model="filterInput"
          class="w-full"
          placeholder="Search snapshots by id, name, author, or description..."
          outline
          clearable
        >
          <template #prependInner>
            <Icon icon="material-symbols:search" class="text-xl" />
          </template>
        </va-input>
      </div>

      <!-- create button -->
      <div class="flex-none">
        <va-button
          icon="add"
          class="px-1"
          color="success"
          @click="openModalToCreateSnapshot"
        >
          Create Snapshot
        </va-button>
      </div>
    </div>

    <!-- snapshots table -->
    <div>
      <va-data-table
        :items="row_items"
        :columns="columns"
        v-model:sort-by="sortBy"
        v-model:sorting-order="sortingOrder"
        hoverable
        :loading="data_loading"
      >
        <template #cell(timestamp)="{ value }">
          <span>{{ datetime.absolute(value) }}</span>
        </template>

        <template #cell(author)="{ rowData }">
          <span class="ml-1"> {{ rowData?.author?.username }} </span>
        </template>

        <template #cell(published)="{ source }">
          <div class="flex justify-center">
            <i-mdi-check
              v-if="source"
              style="color: var(--va-success)"
              class="text-lg font-bold"
            />
            <i-mdi-close
              v-else
              style="color: var(--va-danger)"
              class="text-lg font-bold"
            />
          </div>
        </template>

        <template #cell(actions)="{ rowData }">
          <div class="flex gap-1">
            <va-button
              preset="plain"
              icon="edit"
              @click="openModalToEditSnapshot(rowData)"
            />
            <va-button
              preset="plain"
              icon="delete"
              color="danger"
              :disabled="!(rowData.enrolls == 0 && rowData.disenrolls == 0)"
              @click="openModalToDeleteSnapshot(rowData)"
            />
          </div>
        </template>
      </va-data-table>
    </div>
  </div>

  <!-- edit modal -->
  <CreateEditSnapshotModal
    ref="editModal"
    :edit="editing"
    :snapshot="selectedForEdit"
    @update="fetch_snapshots"
  />

  <!-- delete modal -->
  <DeleteSnapshotModal
    ref="deleteModal"
    :snapshot="selectedForDeletion"
    @update="fetch_snapshots"
  />
</template>

<script setup>
import * as datetime from "@/services/datetime";
import snapshotService from "@/services/snapshots";

const snapshots = ref([]);
const filterInput = ref("");
const debouncedFilterInput = refDebounced(filterInput, 200);
const data_loading = ref(false);

const columns = [
  { key: "id", sortable: true },
  { key: "name", sortable: true },
  { key: "description", sortable: true },
  { key: "author", sortable: true },
  { key: "timestamp", sortable: true, width: "200px" },
  {
    key: "enrolls",
    sortable: true,
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "disenrolls",
    sortable: true,
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  { key: "published", width: "80px", thAlign: "center", tdAlign: "center" },
  { key: "actions", width: "80px" },
];

// initial sorting order
const sortBy = ref("timestamp");
const sortingOrder = ref("desc");

const row_items = computed(() => {
  const searchText = debouncedFilterInput.value?.toLowerCase() || "";
  return snapshots.value.filter((s) => {
    return (
      searchText === "" ||
      customFilteringFn(searchText, {
        id: s.id,
        name: s.name,
        description: s.description,
        author: s.author?.username,
      })
    );
  });
});

function customFilteringFn(searchText, { id, name, description, author }) {
  return (
    (name || "").toLowerCase().includes(searchText) ||
    (description || "").toLowerCase().includes(searchText) ||
    (author || "").toLowerCase().includes(searchText) ||
    `${id}` === searchText
  );
}

function fetch_snapshots() {
  data_loading.value = true;
  return snapshotService
    .getAll()
    .then((res) => {
      snapshots.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      data_loading.value = false;
    });
}

fetch_snapshots();

// edit modal code
// template ref binding
const editModal = ref(null);
const selectedForEdit = ref(null);
const editing = ref(false);

function openModalToEditSnapshot(rowData) {
  // const { name, description, browser_enabled, funding } = rowData;
  // projectFormStore.$patch({ name, description, browser_enabled, funding });
  editing.value = true;
  selectedForEdit.value = rowData;
  editModal.value.show();
}

function openModalToCreateSnapshot() {
  editing.value = false;
  editModal.value.show();
}

// delete modal code
// template ref binding
const deleteModal = ref(null);
const selectedForDeletion = ref({});

function openModalToDeleteSnapshot(rowData) {
  selectedForDeletion.value = rowData;
  deleteModal.value.show();
}
</script>

<route lang="yaml">
meta:
  title: Snapshots
  nav: [{ label: "Snapshots" }]
  requiresRoles: ["operator", "admin"]
</route>
