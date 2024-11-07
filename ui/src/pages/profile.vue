<template>
  <div>
    <va-card>
      <va-card-content>
        <va-form class="grid grid-cols-2 gap-5">
          <va-input v-model="profile.username" label="Username" readonly />
          <va-input v-model="profile.name" label="Name" readonly />
          <va-input v-model="profile.email" label="Email" readonly />
          <va-input v-model="profile.cas_id" label="IU CAS ID" readonly />
        </va-form>
        <div>
          <h3 class="mt-3 pb-2 text-lg">Roles</h3>
          <div class="flex gap-3">
            <va-chip
              outline
              v-for="role in profile.roles"
              :key="role"
              class="flex-[0_0]"
            >
              {{ role }}
            </va-chip>
          </div>
        </div>
        <div class="mt-5">
          <va-divider />
          <span class="font-light">
            Your username, roles, and other attributes can only be updated by
            site administrators.
            <a class="va-link" :href="`mailto:${config.contact.app_admin}`"
              >Contact us</a
            >
            if one of these items needs to be updated.
          </span>
        </div>
      </va-card-content>
    </va-card>

    <!-- Color theme switcher -->
    <va-card class="mt-5">
      <va-card-content>
        <div class="flex flex-col gap-5">
          <div class="flex items-center gap-3">
            Primary color:
            <VaColorPalette
              v-model="colors.primary"
              :palette="palette"
              @update:model-value="persistTheme"
            />
          </div>
        </div>
      </va-card-content>
    </va-card>

    <!-- API Keys -->
    <VaCard class="mt-5" v-if="config.enabledFeatures?.apiKeys">
      <VaCardTitle>
        <span class="text-xl"> API Key </span>
      </VaCardTitle>
      <VaCardContent>
        <VaInnerLoading :loading="loading">
          <!-- if there is no api key; show create button -->
          <div v-if="!apiKey">
            <div class="flex justify-center">
              <VaButton @click="createKey" class="" size="large">
                <div class="flex items-center">
                  <i-mdi-key-plus class="text-2xl mr-3" />
                  <span> Create an API Key </span>
                </div>
              </VaButton>
            </div>
            <div class="mt-5 space-y-3">
              <p>
                <strong>Purpose of an API Key:</strong> An API key allows you to
                securely connect and interact with our services
                programmatically. You'll use it to authenticate requests made
                from your applications to our API.
              </p>
              <p>
                <strong>Single API Key per User:</strong> You are allowed to
                generate only one API key per user.
              </p>
              <p>
                <strong>Validity: </strong> The API key will remain valid for 1
                year from the date of creation. After that, you'll need to
                generate a new key to continue using our API services.
              </p>
              <p>
                <strong>Important: </strong> When you first create your API key,
                you'll be shown the API Secret once. Make sure to store it
                securely, as it won't be shown again after creation.
              </p>
            </div>
          </div>

          <!-- else, show current api key details -->
          <div v-else class="">
            <div class="va-table-responsive">
              <table class="va-table">
                <tbody>
                  <tr>
                    <td><span class="font-semibold"> API Key </span></td>
                    <td><CopyText :text="apiKey.key" /></td>
                  </tr>
                  <tr v-if="apiKey.secret">
                    <td><span class="font-semibold">API Secret</span></td>
                    <td>
                      <CopyText :text="apiKey.secret" />
                      <VaAlert color="warning" class="mt-2">
                        <strong>Warning:</strong> This secret will not be
                        displayed again.
                      </VaAlert>
                    </td>
                  </tr>

                  <tr>
                    <td><span class="font-semibold"> Status </span></td>
                    <td>
                      <span>
                        {{
                          userService.isApiKeyexpired(apiKey)
                            ? "Expired"
                            : "Active"
                        }}
                      </span>
                    </td>
                  </tr>

                  <tr>
                    <td><span class="font-semibold"> Created </span></td>
                    <td>{{ datetime.absolute(apiKey.created_at) }}</td>
                  </tr>

                  <tr>
                    <td><span class="font-semibold"> Last Used </span></td>
                    <td v-if="apiKey.last_used_at">
                      {{ datetime.absolute(apiKey.last_used_at) }}
                    </td>
                    <td v-else>Never Used</td>
                  </tr>

                  <tr>
                    <td><span class="font-semibold"> Expires </span></td>
                    <td>{{ datetime.absolute(apiKey.expires_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="flex mt-5">
              <VaButton
                @click="deleteKey"
                class="ml-3"
                preset="primary"
                color="danger"
                border-color="danger"
              >
                <div class="flex items-center">
                  <i-mdi-key-remove class="text-lg mr-2" />
                  <span> Delete API Key </span>
                </div>
              </VaButton>
            </div>
          </div>
        </VaInnerLoading>
      </VaCardContent>
    </VaCard>
  </div>
</template>

<script setup>
import config from "@/config";
import * as datetime from "@/services/datetime";
import toast from "@/services/toast";
import userService from "@/services/user";
import { useAuthStore } from "@/stores/auth";
import { useColors } from "vuestic-ui";

const auth = useAuthStore();
const { colors } = useColors();

const palette = ["#154ec1", "#ef476f", "#ffd166", "#06d6a0", "#8338ec"];
const profile = auth.user;

function persistTheme() {
  auth.setTheme({
    primary: colors.primary,
  });
}

const loading = ref(false);
const apiKey = ref(null);
onMounted(() => {
  loading.value = true;
  userService
    .getApiKey(auth.user.username)
    .then((res) => {
      apiKey.value = res.data;
    })
    .catch((err) => {
      if (err?.response?.status === 404) {
        apiKey.value = null;
        return;
      }
      console.error(err);
      toast.error("Failed to fetch API key");
    })
    .finally(() => {
      loading.value = false;
    });
});

function createKey() {
  loading.value = true;
  userService
    .createApiKey(auth.user.username)
    .then((res) => {
      apiKey.value = res.data;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to create API key");
    })
    .finally(() => {
      loading.value = false;
    });
}

function deleteKey() {
  loading.value = true;
  userService
    .deleteApiKey(auth.user.username)
    .then(() => {
      apiKey.value = null;
    })
    .catch((err) => {
      console.error(err);
      toast.error("Failed to delete API key");
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>

<style>
.va-table-responsive {
  overflow: auto;
}
</style>

<route lang="yaml">
meta:
  title: Profile
  nav: [{ label: "Profile" }]
</route>
