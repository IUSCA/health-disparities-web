<template>
  <div>
    <VaSelect
      v-model="model"
      :options="options"
      class="text-sm"
      multiple
      :loading="loading"
      :max-visible-options="3"
      selected-top-shown
    />
  </div>
</template>

<script setup>
import cohortService from "@/services/cohort2";

const props = defineProps({
  modelValue: {
    type: [Array, String],
    default: () => [],
  },
  identifier: String,
  separator: {
    type: String,
    default: ".",
  },
});
const emit = defineEmits(["update:modelValue"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
  },
});

const options = ref([]);
const loading = ref(false);

watch(
  () => props.identifier,
  () => {
    const category = props.identifier.split(props.separator)[0];
    const field = props.identifier.split(props.separator)[1];
    loading.value = true;
    cohortService
      .unique(category, field)
      .then((res) => {
        options.value = Object.keys(res.data);
      })
      .finally(() => {
        loading.value = false;
      });
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
:deep {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
}
</style>
