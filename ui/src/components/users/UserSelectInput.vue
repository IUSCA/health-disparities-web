<template>
  <VaInput
    v-if="showInput"
    :model-value="props.displayFn(selectedUser)"
    :label="props.label"
    readonly
    :placeholder="props.placeholder"
    @click="showInput = false"
    class="cursor-pointer"
  >
    <template #prependInner>
      <Icon :icon="props.icon" class="text-lg" />
    </template>

    <template #appendInner>
      <VaButton
        @click.stop="handleClear"
        preset="plain"
        color="danger"
        v-if="selectedUser"
      >
        <i-mdi-close />
      </VaButton>
    </template>
  </VaInput>
  <UserSelect
    @select="handleUserSelect"
    :label="props.label"
    default-visible
    show-close
    @close="showInput = true"
    v-else
  />
</template>

<script setup>
const selectedUser = defineModel();

const props = defineProps({
  label: {
    type: String,
    default: null,
  },
  placeholder: {
    type: String,
    default: "Click here to select a user",
  },
  displayFn: {
    type: Function,
    default: (user) => (user ? `${user.name} (${user.username})` : null),
  },
  icon: {
    type: String,
    default: "mdi-account",
  },
});

const emit = defineEmits(["select", "clear"]);

const showInput = ref(true);

function handleUserSelect(user) {
  selectedUser.value = user;
  showInput.value = true;
  emit("select", user);
}

function handleClear() {
  selectedUser.value = null;
  emit("clear");
}
</script>
