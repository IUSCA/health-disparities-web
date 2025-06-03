<template>
  <va-modal
    v-model="visible"
    :title="`Share '${cohort?.name}'`"
    fixed-layout
    close-button
    hide-default-actions
    @close="hide"
  >
    <VaInnerLoading :loading="loading">
      <div v-if="cohort.visibility === CV.PRIVATE">
        <VaAlert color="info" outline>
          <div class="flex flex-col gap-2">
            <p>
              This cohort is private. To share it with others, you must first
              change its visibility to
              <b>UNLISTED</b>.
            </p>

            <span class="va-text-danger">
              Note: Changing to UNLISTED will lock the cohort and further
              editing will not be possible.
            </span>

            When you finalize the cohort, you can share it with others.
          </div>

          <div class="mt-4 flex justify-center items-center">
            <VaButton color="primary" @click="onChangeVisibility">
              Change Visibility to UNLISTED
            </VaButton>
          </div>
        </VaAlert>
      </div>
      <div v-else class="min-h-[300px]">
        <div class="mb-5">
          <UserSelect @select="onShare" :default-visible="false" />
        </div>

        <p class="font-semibold mb-4" v-if="sharedUsers.length > 0">
          People with access
          <span> ({{ sharedUsers.length }})</span>
        </p>
        <p v-else class="my-4 text-center va-text-secondary max-w-lg mx-auto">
          You haven't shared this cohort with others yet. To grant access,
          select users from the list above.
        </p>
        <ProjectUsersList
          :users="sharedUsers"
          show-remove
          @remove="onUnshare"
        />
      </div>
    </VaInnerLoading>
  </va-modal>
</template>

<script setup>
import { CV } from "@/components/cohorts/models";
import cohortService from "@/services/cohorts2";
import toast from "@/services/toast";

defineExpose({
  show,
  hide,
});
const emit = defineEmits(["update"]);

const loading = ref(false);
const visible = ref(false);

const cohort = ref(null);
const sharedUsers = ref([]);

function hide() {
  visible.value = false;
  cohort.value = null;
  loading.value = false;
}

function show(_cohort) {
  cohort.value = _cohort;
  visible.value = true;
}

watch(cohort, () => {
  // get users with whom the cohort is shared
  if (cohort.value) {
    loading.value = true;
    cohortService
      .getSharedUsers(cohort.value.id)
      .then((res) => {
        sharedUsers.value = res.data;
      })
      .catch((error) => {
        console.error("Failed to fetch shared users:", error);
        toast.error("Failed to fetch shared users.");
      })
      .finally(() => {
        loading.value = false;
      });
  }
});

function onChangeVisibility() {
  if (cohort.value) {
    loading.value = true;
    cohortService
      .updateVisibility(cohort.value.id, CV.UNLISTED)
      .then(() => {
        toast.success("Cohort visibility changed to UNLISTED.");
        emit("update");
        hide();
      })
      .catch((error) => {
        console.error("Failed to change visibility:", error);
        toast.error("Failed to change visibility.");
      })
      .finally(() => {
        loading.value = false;
      });
  }
}

function onShare(user) {
  if (cohort.value) {
    loading.value = true;
    cohortService
      .share(cohort.value.id, user.id)
      .then(() => {
        toast.success(`Cohort shared with ${user.name}.`);
        if (!sharedUsers.value.some((u) => u.id === user.id)) {
          sharedUsers.value.push(user);
        }
      })
      .catch((error) => {
        console.error("Failed to share cohort:", error);
        toast.error("Failed to share cohort.");
      })
      .finally(() => {
        loading.value = false;
      });
  }
}

function onUnshare(user) {
  if (cohort.value) {
    loading.value = true;
    cohortService
      .unshare(cohort.value.id, user.id)
      .then(() => {
        toast.success(`Cohort unshared from ${user.name}.`);
        sharedUsers.value = sharedUsers.value.filter((u) => u.id !== user.id);
      })
      .catch((error) => {
        console.error("Failed to unshare cohort:", error);
        toast.error("Failed to unshare cohort.");
      })
      .finally(() => {
        loading.value = false;
      });
  }
}
</script>
