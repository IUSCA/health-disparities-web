<template>
  <VaCard class="mt-5">
    <VaCardContent>
      <VaInnerLoading :loading="loading">
        <NoToken
          v-if="fetched && keys.length === 0"
          @generate-token="handleGenerate"
        />
        <div v-else-if="fetched">
          <div class="flex justify-between items-center mb-5">
            <div class="text-xl font-semibold">Personal Access Tokens</div>
            <VaButton
              preset="primary"
              border-color="primary"
              @click="handleGenerate"
            >
              Generate new token
            </VaButton>
          </div>
          <!-- tokens -->
          <div class="flex flex-col gap-3">
            <Token
              v-for="key in keys"
              :key="key.id"
              :token="key"
              @delete="handleDelete"
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

  <NewTokenModal ref="newTokenModal" @update="fetchKeys" />
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";

// const props = defineProps({});
const auth = useAuthStore();

const loading = ref(false);
const keys = ref([]);
const fetched = ref(false);
const newTokenModal = ref(null);

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
      toast.error("Failed to fetch API keys");
    })
    .finally(() => {
      loading.value = false;
    });
}

onMounted(() => {
  fetchKeys();
});

function handleDelete(key) {
  console.log("revoke", key);
  // show modal
}

function handleGenerate() {
  console.log("generate");
  newTokenModal.value.show();
}
</script>
