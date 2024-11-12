<template>
  <!-- <div class="text-2xl font-semibold mb-7">New personal access token</div> -->
  <VaForm ref="formRef" class="flex flex-col gap-5 max-w-2xl">
    <VaInput
      label="Name"
      v-model="name"
      placeholder="Give your token a name"
      required-mark
      :rules="[(value) => (value && value.length > 0) || 'Name is required']"
    />
    <VaTextarea
      label="Description"
      v-model="description"
      placeholder="What's this token for?"
    />

    <!-- Expiration (number of days) -->
    <div class="flex items-end">
      <VaSelect
        v-model="validity_days"
        :options="validity_days_options"
        placeholder="Select an option"
        label="Expiration (days)"
        required-mark
        class="w-1/5"
      />
      <p class="va-text-secondary pb-2 ml-5">
        The token will expire on {{ expiration_date }}
      </p>
    </div>

    <!-- scopes -->
    <div>
      <p class="font-semibold">Select scopes</p>
      <span class="va-text-secondary">
        Scopes define the access for personal tokens.
      </span>

      <div class="flex flex-col gap-1 mt-3">
        <div v-for="scope in scopes" :key="scope.id" class="grid grid-cols-12">
          <div class="col-span-4">
            <VaCheckbox
              v-model="selectedScopes[scope.name]"
              :label="scope.name"
            />
          </div>

          <div class="col-span-8 va-text-secondary">
            {{ scope.description }}
          </div>
        </div>
      </div>
    </div>

    <!-- button -->
    <div class="flex gap-3">
      <VaButton preset="secondary" @click="emit('cancel')">Cancel</VaButton>
      <div class="ml-auto">
        <VaButton @click="generateToken" :disabled="loading || !isValid">
          Generate Token
        </VaButton>
      </div>
    </div>
  </VaForm>
</template>

<script setup>
import apiKeyService from "@/services/api_keys";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";
import dayjs from "dayjs";
import { useForm } from "vuestic-ui";

// const props = defineProps({});
const auth = useAuthStore();
const { isValid, validate } = useForm("formRef");
const emit = defineEmits(["created", "cancel"]);

const validity_days_options = [30, 60, 90, 180];
const scopes = ref([]);
const loading = ref(false);
const selectedScopes = ref({});

const name = ref("");
const description = ref("");
const validity_days = ref(validity_days_options[0]);

const expiration_date = computed(() => {
  const today = dayjs();
  const expiry_date = today.add(validity_days.value, "day");
  return expiry_date.format("ddd, MMM D YYYY");
});

// scope object
// {
//   id: 1,
//   name: "read:users",
//   description: "Read user information",
//   resource: "users",
//   action: "read",
// }

const selectedScopeNames = computed(() => {
  return Object.keys(selectedScopes.value).filter(
    (scopeName) => selectedScopes.value[scopeName],
  );
});

onMounted(() => {
  loading.value = true;
  apiKeyService
    .getAllScopes()
    .then((res) => {
      scopes.value = res.data;
    })
    .finally(() => {
      loading.value = false;
    });
});

function generateToken() {
  if (validate()) {
    loading.value = true;

    apiKeyService
      .create({
        username: auth.user.username,
        name: name.value,
        description: description.value,
        validity_days: validity_days.value,
        scopes: selectedScopeNames.value,
      })
      .then((res) => {
        emit("created", res.data);
        toast.success("Token generated successfully");
      })
      .catch((err) => {
        console.log(err);
        toast.error(`Failed to generate token : ${err.response.data.message}`);
      })
      .finally(() => {
        loading.value = false;
      });
  }
}
</script>
