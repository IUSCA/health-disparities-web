<template>
  <va-modal
    v-model="visible"
    :title="cohort?.name ? `Delete - ${cohort.name}` : 'Delete Cohort'"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
    size="large"
  >
    <VaInnerLoading :loading="loading">
      <!-- No dependents: simple delete -->
      <div v-if="dependentCohorts.length === 0">
        <p>
          Are you sure you want to delete
          <strong>{{ cohort.name }}</strong
          >?
        </p>
        <p class="mt-2">This action cannot be undone.</p>
      </div>

      <!-- Has dependents: offer archive or delete all -->
      <div v-else>
        <div class="mb-4 font-semibold">
          <span>
            This cohort cannot be deleted because it is referenced in the
            following cohorts:
          </span>
        </div>
        <div>
          <ul class="list-item space-y-2">
            <li v-for="c in dependentCohorts" :key="c.id" class="ml-4">
              <div class="flex flex-nowrap items-center gap-3">
                <div>
                  <i-mdi-account-group
                    class="text-2xl"
                    :style="{
                      color: stringToRGB(`${c.id}-${c.name}`),
                    }"
                  />
                </div>
                <div class="flex items-center gap-3">
                  <div
                    class="leading-4 max-w-[600px] whitespace-nowrap overflow-clip overflow-ellipsis"
                    :title="c.name"
                  >
                    {{ c.name }}
                  </div>
                  <div class="text-sm va-text-secondary w-[72px]">
                    <CohortSize :cohort="c" class="font-semibold" />
                    <span> pax. </span>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <!-- Choice between archive and delete -->
          <VaRadio
            v-model="actionChoice"
            class="mt-5"
            :options="[
              { label: 'Archive this cohort', value: 'archive' },
              {
                label: 'Delete all dependent cohorts as well',
                value: 'delete',
              },
            ]"
            text-by="label"
            value-by="value"
          />

          <!-- Delete confirmation only if delete is chosen -->
          <div class="my-2 max-w-2xl">
            <div v-if="actionChoice === 'delete'">
              <p class="font-semibold tracking-wide">
                Are you sure you want to delete
                {{ maybePluralize(1 + dependentCohorts.length, "cohort") }}?
                This action cannot be undone.
              </p>
            </div>

            <div v-else-if="actionChoice === 'archive'">
              <p class="tracking-wide">
                Archiving a cohort will lock it and prevent it from being used
                in other cohorts, but it will not delete any data. You can
                restore it later if needed.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- action buttons -->
      <div class="flex justify-end gap-3">
        <va-button @click="hide" :disabled="loading" preset="primary"
          >Cancel</va-button
        >
        <va-button
          v-if="dependentCohorts.length === 0"
          color="danger"
          @click="onDelete(cohort)"
          :disabled="loading"
        >
          Delete
        </va-button>
        <template v-else>
          <va-button
            v-if="actionChoice === 'archive'"
            @click="onArchive"
            :disabled="loading"
          >
            Archive
          </va-button>
          <va-button
            v-if="actionChoice === 'delete'"
            color="danger"
            @click="onDelete(cohort)"
            :disabled="loading"
          >
            {{ `Delete ${1 + dependentCohorts.length} Cohorts` }}
          </va-button>
        </template>
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import cohortService from "@/services/cohorts2";
import { stringToRGB } from "@/services/colors";
import toast from "@/services/toast";
import { maybePluralize } from "@/services/utils";

defineExpose({
  show,
  hide,
});

const emit = defineEmits(["update"]);

const visible = ref(false);
const loading = ref(false);
const cohort = ref(null);
const reason = ref(null);
const dependentCohorts = ref([]);
const actionChoice = ref("archive"); // 'archive' or 'delete'

function hide() {
  visible.value = false;
  cohort.value = null;
  reason.value = null;
  dependentCohorts.value = [];
  actionChoice.value = "archive";
  loading.value = false;
}

function show(_cohort) {
  cohort.value = _cohort;
  visible.value = true;
}

watch(cohort, () => {
  if (!cohort.value) return;
  loading.value = true;

  cohortService
    .getDependents(cohort.value.id)
    .then((res) => {
      dependentCohorts.value = res.data || [];
      // Default to archive if there are dependents
      actionChoice.value =
        dependentCohorts.value.length > 0 ? "archive" : "delete";
    })
    .catch((err) => {
      console.error(err);
      toast.error("Unable to fetch cohort details");
    })
    .finally(() => {
      loading.value = false;
    });
});

function onDelete(row) {
  loading.value = true;
  return cohortService
    .delete({ id: row.id, delete_dependents: true })
    .then((res) => {
      const count = res.data.count;
      toast.success(`${maybePluralize(count, "cohort")} deleted successfully`);
      emit("update");
      hide();
    })
    .catch((err) => {
      err?.response?.data?.message
        ? toast.error("Unable to delete cohort : " + err.response.data.message)
        : toast.error("Unable to delete cohort");
    })
    .finally(() => {
      loading.value = false;
    });
}

function onArchive() {
  loading.value = true;
  return cohortService
    .archive(cohort.value.id)
    .then(() => {
      toast.success("Cohort archived successfully");
      emit("update");
      hide();
    })
    .catch((err) => {
      err?.response?.data?.message
        ? toast.error("Unable to archive cohort : " + err.response.data.message)
        : toast.error("Unable to archive cohort");
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
