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
        :loading="data_loading"
      >
        <template #cell(name)="{ rowData }">
          <RouterLink :to="`/protocols/${rowData.id}`">
            <span class="va-link">
              {{ rowData.name }}
            </span>
          </RouterLink>
        </template>

        <template #cell(created_at)="{ value }">
          <span>{{ datetime.date(value) }}</span>
        </template>

        <template #cell(author)="{ source }">
          <div class="flex items-center gap-1">
            <UserAvatar :username="source?.username" :name="source?.name" />
            <span class="">{{ source?.username }}</span>
          </div>
        </template>

        <template #cell(actions)="{ rowData }">
          <div class="flex gap-1 justify-end">
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

  <!-- create modal -->
  <CreateProtocolModal ref="createModal" @create="fetch_protocols" redirect />

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
    @delete="fetch_protocols"
  />
</template>

<script setup>
import * as datetime from "@/services/datetime";
import protocolService from "@/services/protocols";

const protocols = ref([]);
const filterInput = ref("");
const debouncedFilterInput = refDebounced(filterInput, 200);
const data_loading = ref(false);

const columns = [
  { key: "name", sortable: true, width: "300px" },
  { key: "description", sortable: false, width: "400px", tdClass: "truncate" },
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
  { key: "actions", width: "100px", tdAlign: "right", thAlign: "right" },
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

const createModal = ref(null);
function openModalToCreateProtocol() {
  createModal.value.show();
}

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
  nav: [{ label: "Protocols" }]
  requiresRoles: ["operator", "admin"]
</route>
