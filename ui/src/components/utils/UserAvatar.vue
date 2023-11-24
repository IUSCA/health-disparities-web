<template>
  <va-avatar :color="stringToRGB(props.username || '')" size="small">
    <span class="text-sm uppercase">{{ initials(props.name) }}</span>
  </va-avatar>
</template>

<script setup>
import { stringToRGB } from "@/services/colors";
import { initials } from "@/services/utils";
const props = defineProps(["username", "name"]);
</script>
