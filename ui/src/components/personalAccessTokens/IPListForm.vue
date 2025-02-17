<template>
  <div class="">
    <VaInput
      v-model="newIp"
      :label="props.label"
      placeholder="Enter an IP or CIDR subnet (e.g. 192.168.1.0/24)"
      class="w-full"
      clearable
      :error="!!errorMessage"
      :error-messages="errorMessage ? [errorMessage] : []"
      @keydown.enter="addIp"
    >
      <template #append>
        <VaButton @click="addIp" class="ml-2">Add IP</VaButton>
      </template>
    </VaInput>
    <!-- <p v-if="errorMessage" class="text-red-500">{{ errorMessage }}</p> -->

    <div class="flex flex-wrap gap-2 mt-3">
      <VaChip
        v-for="ip in ipList"
        :key="ip"
        closeable
        @update:modelValue="removeIp(ip)"
        size="small"
        @click="newIp = ip"
      >
        <span class="font-mono text-xs"> {{ ip }} </span>
      </VaChip>
    </div>
  </div>
</template>

<script setup>
import cidrRegex from "cidr-regex";
import { isIP } from "is-ip";
const props = defineProps({
  label: {
    type: String,
    default: "IP or CIDR subnet",
  },
});

const ipList = defineModel({
  type: Array,
  default: () => [],
});
const newIp = ref("");
const errorMessage = ref("");

const addIp = () => {
  console.log(
    "Adding IP:",
    newIp.value,
    cidrRegex({ exact: true }).test(newIp.value),
    isIP(newIp.value),
  );
  if (!cidrRegex({ exact: true }).test(newIp.value) && !isIP(newIp.value)) {
    errorMessage.value = "Invalid IP or CIDR subnet";
    return;
  }
  if (!ipList.value.includes(newIp.value)) {
    ipList.value.push(newIp.value);
  }
  newIp.value = "";
  errorMessage.value = "";
};

const removeIp = (ip) => {
  ipList.value = ipList.value.filter((item) => item !== ip);
};

watch(newIp, () => {
  // if changed, reset error message
  if (errorMessage.value) {
    errorMessage.value = "";
  }
});
</script>
