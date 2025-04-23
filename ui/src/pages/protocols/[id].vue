<template>
  <VaInnerLoading :loading="loading">
    <div v-if="protocol" class="space-y-4 mt-4">
      <!-- Protocol Details Section -->
      <VaCard>
        <VaCardTitle>
          <div class="flex flex-nowrap items-center w-full">
            <span class="flex-auto text-lg">Protocol Details</span>
            <AddEditButton class="flex-none" edit @click="editModal.show()" />
            <VaButton
              class="flex-none ml-3"
              icon="delete"
              preset="primary"
              round
              color="danger"
              border-color="danger"
              @click="deleteModal.show()"
            />
          </div>
        </VaCardTitle>
        <VaCardContent>
          <div class="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
            <!-- Title -->
            <div class="flex gap-1">
              <span class="font-semibold w-32"> Title: </span>
              <span>{{ protocol.name }}</span>
            </div>

            <!-- Created At -->
            <div class="flex gap-1 md:gap-2">
              <span class="font-semibold sm:w-32 md:w-auto">Created At:</span>
              <span>{{ datetime.absolute(protocol.created_at) }}</span>
            </div>

            <!-- Description -->
            <div class="md:col-span-2 flex gap-1 items-start">
              <span class="font-semibold w-32"> Description: </span>
              <div
                class="max-h-40 overflow-auto whitespace-pre-wrap border rounded pb-2 pr-2 flex-1"
              >
                {{ protocol.description }}
              </div>
            </div>

            <!-- Author -->
            <div class="flex gap-1 items-center">
              <span class="font-semibold w-32"> Author: </span>
              <UserAvatar
                :username="protocol.author.username"
                :name="protocol.author.name"
                class="inline-block"
                size="sm"
              />
              <span>{{ protocol.author.name }}</span>
            </div>
          </div>
        </VaCardContent>
      </VaCard>

      <!-- Users Section -->
      <VaCard>
        <VaCardTitle>
          <div class="flex flex-nowrap items-center w-full">
            <span class="flex-auto text-lg"> Associated Users </span>
            <va-button
              icon="person_add"
              class="px-1"
              color="success"
              @click="addUsersModal.show()"
            >
              <span class="ml-1"> Add Users </span>
            </va-button>
          </div>
        </VaCardTitle>
        <VaCardContent>
          <!-- Counts -->
          <div class="flex justify-between mb-4">
            <div>
              <span
                class="text-base font-medium"
                style="color: var(--va-text-primary)"
              >
                Total Users: {{ protocol.users.length }}
              </span>
            </div>
            <div v-show="filterInput">
              <span
                class="text-base font-medium"
                style="color: var(--va-text-primary)"
              >
                Showing:
                {{ filteredUsers.length }} of {{ protocol.users.length }}
              </span>
            </div>

            <div></div>
          </div>

          <!-- search bar and reset button -->
          <div class="flex items-center gap-3 mb-3">
            <!-- search bar -->
            <div class="flex-1">
              <va-input
                v-model="filterInput"
                class="w-full"
                placeholder="Search users by name, username or email..."
                outline
                clearable
              >
                <template #prependInner>
                  <Icon icon="material-symbols:search" class="text-xl" />
                </template>
              </va-input>
            </div>

            <!-- Reset button -->
            <div class="flex-none">
              <VaButton
                preset="secondary"
                icon="restart_alt"
                @click="resetView"
              >
                Reset Filters
              </VaButton>
            </div>
          </div>

          <VaDataTable
            :columns="userColumns"
            :items="filteredUsers"
            class="w-full protocol-users-table"
            :per-page="PER_PAGE"
            :current-page="currentPage"
            v-model:sort-by="sortBy"
            v-model:sorting-order="sortingOrder"
          >
            <template #cell(assigned_at)="{ value }">
              <span>{{ datetime.absolute(value) }}</span>
            </template>

            <template #cell(is_deleted)="{ source }">
              <span>
                {{ source ? "Removed" : "Active" }}
              </span>
            </template>

            <template #cell(actions)="{ rowData }">
              <VaButton
                color="danger"
                size="small"
                icon="person_remove"
                preset="primary"
                @click="removeUser(rowData)"
              >
                <span class="ml-1"> Remove </span>
              </VaButton>
            </template>

            <template #bodyAppend>
              <tr>
                <td colspan="6">
                  <div class="flex justify-center mt-4">
                    <VaPagination
                      v-model="currentPage"
                      :pages="pages"
                      v-if="pages !== 1"
                    />
                  </div>
                </td>
              </tr>
            </template>
          </VaDataTable>
        </VaCardContent>
      </VaCard>

      <!-- Participants Info -->
      <VaCard>
        <VaCardTitle>
          <span class="text-lg">Participants</span>
        </VaCardTitle>
        <VaCardContent>
          <p
            class="text-base font-medium"
            style="color: var(--va-text-primary)"
          >
            Total Participants: {{ protocol.num_participants }}
          </p>
        </VaCardContent>
      </VaCard>

      <AddUsersToProtocolModal
        ref="addUsersModal"
        :protocol="protocol"
        @update="fetch()"
      />

      <RemoveUserFromProtocolModal
        ref="removeUserModal"
        :protocol="protocol"
        @update="fetch()"
      />

      <EditProtocolModal
        ref="editModal"
        :protocol="protocol"
        @update="fetch()"
      />

      <DeleteProtocolModal
        ref="deleteModal"
        :protocol="protocol"
        @delete="router.push('/protocols')"
      />
    </div>
  </VaInnerLoading>
</template>

<script setup>
import * as datetime from "@/services/datetime";
import protocolService from "@/services/protocols";
import { useNavStore } from "@/stores/nav";

const props = defineProps({
  id: String,
});

const nav = useNavStore();
const router = useRouter();

const PER_PAGE = 10;

const protocol = ref();
const loading = ref(false);
const addUsersModal = ref(null);
const removeUserModal = ref(null);
const editModal = ref(null);
const deleteModal = ref(null);
const filterInput = ref("");
const currentPage = ref(1);
const sortBy = ref("assigned_at");
const sortingOrder = ref("desc");

const userColumns = [
  {
    key: "username",
    label: "Username",
    sortable: true,
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
  },
  {
    key: "assigned_at",
    label: "Assigned At",
    sortable: true,
  },
  {
    key: "is_deleted",
    label: "Status",
    sortable: true,
  },
  {
    key: "actions",
    label: "Actions",
    tdAlign: "right",
    thAlign: "right",
  },
];

const filteredUsers = computed(() => {
  if (!protocol.value) return [];
  const users = protocol.value.users;
  if (!filterInput.value) return users;
  return users.filter((user) => {
    const nameMatch = user.name
      ? user.name.toLowerCase().includes(filterInput.value.toLowerCase())
      : false;
    const usernameMatch = user.username
      ? user.username.toLowerCase().includes(filterInput.value.toLowerCase())
      : false;
    const emailMatch = user.email
      ? user.email.toLowerCase().includes(filterInput.value.toLowerCase())
      : false;
    return nameMatch || usernameMatch || emailMatch;
  });
});

const pages = computed(() => {
  return PER_PAGE && PER_PAGE !== 0
    ? Math.ceil(filteredUsers.value.length / PER_PAGE)
    : filteredUsers.value.length;
});

watch(
  protocol,
  () => {
    nav.setNavItems([
      {
        label: "Protocols",
        to: "/protocols",
      },
      {
        label: protocol.value?.name || "",
      },
    ]);
  },
  {
    immediate: true,
  },
);

function fetch() {
  if (props.id == null) return;
  loading.value = true;
  protocolService
    .get(props.id)
    .then((res) => {
      protocol.value = res.data;
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetch();
});

function removeUser(user) {
  removeUserModal.value.show(user);
}

function resetView() {
  filterInput.value = "";
  currentPage.value = 1;
  sortBy.value = "assigned_at";
  sortingOrder.value = "desc";
}
</script>

<route lang="yaml">
meta:
  title: Protocols
  nav: [{ label: "Protocols" }]
  requiresRoles: ["operator", "admin"]
</route>

<style scoped>
.protocol-users-table {
  --va-data-table-cell-padding: 5px;
}
</style>
