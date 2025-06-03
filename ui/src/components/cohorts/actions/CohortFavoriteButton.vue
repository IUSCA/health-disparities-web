<template>
  <VaButton @click="toggleFavorite" preset="plain">
    <CohortFavoriteIcon :is_favorited="isFavorited" />
  </VaButton>
</template>

<script setup>
import cohortService from "@/services/cohorts2";
import toast from "@/services/toast";

const props = defineProps({
  cohort: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update"]);

const loading = ref(false);
const isFavorited = ref(props.cohort.is_favorited);

function toggleFavorite() {
  loading.value = true;

  const apiFn = isFavorited.value
    ? cohortService.unfavorite
    : cohortService.favorite;

  apiFn(props.cohort.id)
    .then(() => {
      isFavorited.value = !isFavorited.value;
      emit("update");
    })
    .catch((error) => {
      console.error("Failed to toggle favorite status:", error);
      toast.error(
        `Failed to ` +
          (isFavorited.value ? "unfavorite" : "favorite") +
          ` cohort`,
      );
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
