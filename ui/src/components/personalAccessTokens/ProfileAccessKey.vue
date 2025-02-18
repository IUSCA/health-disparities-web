<template>
  <VaCard class="mt-5">
    <VaCardContent>
      <VaInnerLoading :loading="loading">
        <NoAccessKey
          v-if="fetched && keys.length === 0"
          @generate-access-key="handleGenerate"
        />
        <div v-else-if="fetched">
          <div class="flex justify-between items-center mb-5">
            <div class="text-xl font-semibold">Personal Access Keys</div>
            <VaButton
              preset="primary"
              border-color="primary"
              @click="handleGenerate"
              v-if="config.apiKeys.generation.enabledInProfile"
            >
              Generate new key
            </VaButton>
          </div>
          <!-- keys -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AccessKey
              v-for="key in keys"
              :key="key.id"
              :access-key="key"
              for-self
              @revoke="handleRevoke"
            />
          </div>
        </div>

        <div class="flex justify-center">
          <div class="flex flex-col items-center max-w-2xl text-center">
            <!-- Link to API docs -->
            <div class="mt-5">
              <a href="/api/doc/" target="_blank" class="va-link">
                API Documentation
              </a>
            </div>

            <!-- info -->
            <div
              class="mt-5 text-sm border border-solid rounded px-3 py-4 va-text-secondary"
            >
              Personal access keys function like ordinary username and password.
              They can be used over HTTPS to authenticate to the API using Basic
              Authentication.
            </div>
          </div>
        </div>
      </VaInnerLoading>
    </VaCardContent>
  </VaCard>

  <NewAccessKeyModal ref="newAccessKeyModal" @update="fetchKeys" />
</template>

<script setup>
import config from "@/config";
import apiKeyService from "@/services/api_keys";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";
import { useModal } from "vuestic-ui";

// const props = defineProps({});
const auth = useAuthStore();
const { confirm } = useModal();

const loading = ref(false);
const keys = ref([]);
const fetched = ref(false);
const newAccessKeyModal = ref(null);

function fetchKeys() {
  loading.value = true;
  apiKeyService
    .getAll({
      username: auth.user.username,
    })
    .then((response) => {
      fetched.value = true;
      keys.value = response.data.data;
    })
    .catch((error) => {
      console.error(error);
      toast.error("Failed to fetch access keys");
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchKeys();
});

function handleRevoke(key) {
  confirm({
    message: "Are you sure you want to revoke this key?",
    okText: "Revoke",
  }).then((ok) => {
    if (!ok) {
      return;
    }
    loading.value = true;
    apiKeyService
      .revoke({ username: auth.user.username, key })
      .then(() => {
        toast.success("Key revoked successfully");
        fetchKeys();
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to revoke key");
      })
      .finally(() => {
        loading.value = false;
      });
  });
}

function handleGenerate() {
  console.log("generate");
  newAccessKeyModal.value.show();
}
</script>
