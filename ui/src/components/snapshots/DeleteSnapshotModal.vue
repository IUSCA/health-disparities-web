<template>
  <va-modal
    class="delete-snapshot-modal"
    v-model="visible"
    title="Delete Snapshot?"
    no-outside-dismiss
    fixed-layout
    ok-text="Delete"
    @ok="handleOk"
    @cancel="hide"
  >
    <va-inner-loading :loading="loading">
      <div>Are you sure you want to delete {{ props.snapshot.name }}?</div>
    </va-inner-loading>
  </va-modal>
</template>

<script setup>
import snapshotService from "@/services/snapshots";

const props = defineProps(["snapshot"]);
const emit = defineEmits(["update"]);

// parent component can invoke these methods through the template ref
defineExpose({
  show,
  hide,
});

const visible = ref(false);
const loading = ref(false);

function hide() {
  loading.value = false;
  visible.value = false;
}

function show() {
  visible.value = true;
}

function handleOk() {
  loading.value = true;
  const id = props.snapshot.id;

  snapshotService.delete(id).finally(() => {
    loading.value = false;
    hide();
    emit("update");
  });
}
</script>
