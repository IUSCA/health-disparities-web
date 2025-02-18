<template>
  <div
    class="border border-[var(--va-muted)] border-solid bg-[var(--va-background-element)] py-2 px-4 rounded-lg flex gap-7"
    v-if="props.accessKey"
  >
    <div class="flex-1">
      <!-- Name, expiration and last used values -->
      <div class="mb-4">
        <div class="flex items-center gap-3">
          <p class="flex-1 text-lg font-semibold max-w-md truncate">
            {{ props.accessKey.name }}
          </p>

          <p class="text-sm">
            <ExpiresIn :expiresAt="props.accessKey.expires_at" show-label />
          </p>

          <p class="text-sm ml-auto">
            <LastUsed :last-used-at="props.accessKey.last_used_at" showLabel />
          </p>
        </div>

        <!-- Description -->
        <p class="text-sm va-text-secondary" v-if="props.accessKey.description">
          {{ props.accessKey.description }}
        </p>
      </div>

      <!-- Key (displayed in a box with copy button) -->
      <div class="flex items-center mb-2">
        <p class="text-sm font-medium mr-1 min-w-12">Key:</p>
        <CopyText
          :text="props.accessKey.key"
          class="flex-1 max-w-md"
          size="small"
        />
      </div>

      <!-- Secret (conditionally displayed based on `showSecret` prop) -->
      <div v-if="props.accessKey.secret" class="mt-4 mb-4">
        <VaAlert color="warning" icon="warning">
          <div class="">
            Make sure to copy this secret now. You won't be able to see it
            again!
          </div>
        </VaAlert>

        <div class="flex items-center mt-2">
          <p class="font-medium mr-1 min-w-12">Secret:</p>
          <CopyText :text="props.accessKey.secret" class="flex-1" />
        </div>
      </div>

      <!-- User -->
      <div class="flex items-center mb-2" v-if="!props.forSelf">
        <p class="text-sm font-medium mr-1 min-w-12">User:</p>
        <p class="text-sm va text-secondary" v-if="props.accessKey.user">
          {{ props.accessKey.user.name }} (
          {{ props.accessKey.user.username }} )
        </p>
      </div>

      <!-- Scopes -->
      <div class="flex mb-2">
        <p class="text-sm font-medium mr-1 min-w-12">Scopes:</p>
        <ul class="text-sm va-text-secondary flex flex-wrap gap-2">
          <li v-for="scope in props.accessKey.scopes" :key="scope">
            {{ scope }}
          </li>
        </ul>
      </div>

      <!-- Whitelisted subnets -->
      <div class="flex flex-wrap gap-2 items-center" v-if="!props.forSelf">
        <p class="text-sm font-medium mr-1 min-w-12">Whitelisted Subnets:</p>
        <VaChip
          v-for="ip in props.accessKey.whitelisted_subnets"
          :key="ip"
          size="small"
        >
          <span class="font-mono text-xs"> {{ ip }} </span>
        </VaChip>
        <p v-if="(props.accessKey?.whitelisted_subnets || []).length === 0">
          <span class="text-sm va-text-secondary"> None </span>
        </p>
      </div>
    </div>

    <!-- Delete button -->
    <div class="flex-none flex items-center" v-if="props.showDelete">
      <VaButton
        preset="secondary"
        color="danger"
        border-color="danger"
        @click="handleRevoke"
      >
        Revoke
      </VaButton>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  accessKey: {
    type: Object,
    required: true,
  },
  showDelete: {
    type: Boolean,
    default: true,
  },
  forSelf: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["revoke"]);

/**
 * {
 *  id: 1,
 *  name: 'Name',
 *  description: 'Description',
 *  key: 'key',
 *  secret: 'secret',
 *  scopes: ['scope1', 'scope2'],
 *  expires_at: '2021-09-01T00:00:00Z',
 *  last_used_at: '2021-09-01T00:00:00Z',
 * }
 */

// const loading = ref(false);

function handleRevoke() {
  emit("revoke", props.accessKey.key);
}
</script>
