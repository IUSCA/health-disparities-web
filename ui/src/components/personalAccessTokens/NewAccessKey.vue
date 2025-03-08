<template>
  <VaForm ref="formRef" class="flex flex-col gap-5 max-w-2xl">
    <VaInput
      label="Name"
      v-model="name"
      placeholder="Give your access key a name"
      required-mark
      :rules="[(value) => (value && value.length > 0) || 'Field is required']"
    />
    <VaTextarea
      label="Description"
      v-model="description"
      placeholder="What's this access key for?"
    />

    <!-- user select -->
    <VaFormField
      v-model="owner"
      :rules="[(v) => !!v || 'Field is required']"
      v-if="!props.forSelf"
    >
      <UserSelectInput
        v-model="owner"
        label="Owner"
        placeholder="Click here to select a user to own this access key"
      />
    </VaFormField>

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
        The access key will expire on {{ expiration_date }}
      </p>
    </div>

    <!-- scopes -->
    <div>
      <p class="font-bold text-xs va-text-primary">SCOPES</p>
      <span class="text-sm va-text-secondary">
        Scopes determine the permissions granted to the access key.
      </span>

      <div class="flex flex-col gap-1 mt-1">
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

    <!-- input to add one or more IP addresses or subnets for whitelisting -->
    <IPListForm
      v-model="ipList"
      label="Whitelist IPs and Subnets"
      v-if="!props.forSelf"
    />

    <!-- button -->
    <div class="flex gap-3 mt-5">
      <VaButton preset="secondary" @click="emit('cancel')">Cancel</VaButton>
      <div class="ml-auto">
        <VaButton @click="generateAccessKey" :disabled="loading || !isValid">
          Generate Access Key
        </VaButton>
      </div>
    </div>
  </VaForm>
</template>

<script setup>
import accessKeyService from "@/services/access_keys";
import toast from "@/services/toast";
import { useAuthStore } from "@/stores/auth";
import dayjs from "dayjs";
import { useForm } from "vuestic-ui";

const props = defineProps({
  forSelf: {
    type: Boolean,
    default: false,
  },
});

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
const owner = ref();
const ipList = ref([]);

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
  accessKeyService
    .getAllScopes()
    .then((res) => {
      scopes.value = res.data.data;
    })
    .finally(() => {
      loading.value = false;
    });
});

function generateAccessKey() {
  if (validate()) {
    loading.value = true;

    accessKeyService
      .create({
        username: owner.value?.username || auth.user.username,
        name: name.value,
        description: description.value,
        validity_days: validity_days.value,
        scopes: selectedScopeNames.value,
        whitelisted_subnets: ipList.value,
      })
      .then((res) => {
        emit("created", res.data);
        toast.success("Access Key generated successfully");
      })
      .catch((err) => {
        console.log(err);
        toast.error(
          `Failed to generate access key : ${err.response.data.message}`,
        );
      })
      .finally(() => {
        loading.value = false;
      });
  }
}
</script>
