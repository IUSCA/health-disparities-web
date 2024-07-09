<template>
  <div class="flex gap-3 justify-between items-center md:items-start">
    <VaAvatar :color="stringToRGB(props.title || '')">
      <p class="text-3xl flex items-center justify-center">
        <Icon :icon="props.icon" />
      </p>
    </VaAvatar>
    <div class="text-right">
      <div class="min-w-[9rem]">
        <div v-if="props.loading" class="ml-auto h-[2.5rem] py-1">
          <VaSkeleton height="100%" width="100%" animation="wave" :delay="0" />
        </div>
        <p class="text-4xl font-semibold text-[var(--va-primary)]" v-else>
          {{ number_formatter.format(props.total) }}
        </p>

        <p class="mt-[-0.4rem]">{{ props.units }}</p>
      </div>

      <div class="mt-2" v-if="Number.isFinite(props.participants)">
        <div v-if="props.loading" class="ml-auto h-[2rem] w-[75%] py-1">
          <VaSkeleton height="100%" width="100%" animation="wave" :delay="0" />
        </div>
        <p class="text-2xl font-semibold text-[var(--va-info)]" v-else>
          {{ number_formatter.format(props.participants) }}
        </p>
        <p class="mt-[-0.4rem] text-sm">participants</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { stringToRGB } from "@/services/colors";
const props = defineProps({
  title: String,
  icon: String,
  loading: Boolean,
  total: Number,
  participants: Number,
  units: {
    type: String,
    default: "terms",
  },
});
const number_formatter = Intl.NumberFormat("en");
</script>
