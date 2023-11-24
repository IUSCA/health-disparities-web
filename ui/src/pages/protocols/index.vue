<template>
  <div>
    <!-- search bar and create button -->
    <div class="flex items-center gap-3 mb-3">
      <!-- search bar -->
      <div class="flex-1">
        <va-input
          v-model="filterInput"
          class="w-full"
          placeholder="Search protocols by name, author or description..."
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
          @click="openModalToCreateProtocol"
        >
          Create Protocol
        </va-button>
      </div>
    </div>

    <!-- protocols table -->
    <div>
      <va-data-table
        :items="row_items"
        :columns="columns"
        v-model:sort-by="sortBy"
        v-model:sorting-order="sortingOrder"
        hoverable
        :loading="data_loading"
      >
        <template #cell(created_at)="{ value }">
          <span>{{ datetime.date(value) }}</span>
        </template>

        <template #cell(author)="{ source }">
          <span>{{ source?.username }}</span>
        </template>

        <template #cell(actions)="{ rowData }">
          <div class="flex gap-1">
            <va-button
              preset="plain"
              icon="edit"
              @click="openModalToEditProtocol(rowData)"
            />
            <va-button
              preset="plain"
              icon="delete"
              color="danger"
              @click="openModalToDeleteProtocol(rowData)"
            />
          </div>
        </template>
      </va-data-table>
    </div>
  </div>

  <!-- edit modal -->
  <EditProtocolModal
    ref="editModal"
    :protocol="selectedForEdit"
    @update="fetch_protocols"
  />

  <!-- delete modal -->
  <DeleteProtocolModal
    ref="deleteModal"
    :protocol="selectedForDeletion"
    @update="fetch_protocols"
  />
</template>

<script setup>
import { useNavStore } from "@/stores/nav";
import protocolService from "@/services/protocols";
import * as datetime from "@/services/datetime";
const nav = useNavStore();

nav.setNavItems([
  {
    label: "Protocols",
  },
]);

const protocols = ref([]);
const filterInput = ref("");
const debouncedFilterInput = refDebounced(filterInput, 200);
const data_loading = ref(false);

const columns = [
  { key: "name", sortable: true },
  { key: "description", sortable: true },
  { key: "author", sortable: true },
  { key: "created_at", sortable: true, width: "120px" },
  {
    key: "users",
    sortable: true,
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  {
    key: "participants",
    sortable: true,
    width: "80px",
    thAlign: "center",
    tdAlign: "center",
  },
  { key: "actions", width: "80px" },
];

// initial sorting order
const sortBy = ref("created_at");
const sortingOrder = ref("desc");

const row_items = computed(() => {
  const searchText = debouncedFilterInput.value?.toLowerCase() || "";
  return protocols.value.filter((s) => {
    return (
      searchText === "" ||
      customFilteringFn(searchText, {
        name: s.name,
        description: s.description,
        author: s.author?.username,
      })
    );
  });
});

function customFilteringFn(searchText, { name, description, author }) {
  return (
    (name || "").toLowerCase().includes(searchText) ||
    (description || "").toLowerCase().includes(searchText) ||
    (author || "").toLowerCase().includes(searchText)
  );
}

function fetch_protocols() {
  data_loading.value = true;
  return protocolService
    .getAll()
    .then((res) => {
      protocols.value = res.data;
    })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => {
      data_loading.value = false;
    });
}

fetch_protocols();

// edit modal code
// template ref binding
const editModal = ref(null);
const selectedForEdit = ref(null);

function openModalToEditProtocol(rowData) {
  // const { name, description, browser_enabled, funding } = rowData;
  // projectFormStore.$patch({ name, description, browser_enabled, funding });
  selectedForEdit.value = rowData;
  editModal.value.show();
}

function openModalToCreateProtocol() {}

// delete modal code
// template ref binding
const deleteModal = ref(null);
const selectedForDeletion = ref({});

function openModalToDeleteProtocol(rowData) {
  selectedForDeletion.value = rowData;
  deleteModal.value.show();
}
</script>

<route lang="yaml">
meta:
  title: Protocols
  requiresRoles: ["operator", "admin"]
</route>
