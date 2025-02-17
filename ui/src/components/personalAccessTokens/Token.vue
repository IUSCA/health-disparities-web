<template>
  <div
    class="border border-[var(--va-muted)] border-solid bg-[var(--va-background-element)] py-2 px-4 rounded-lg flex gap-7"
    v-if="props.token"
  >
    <div class="flex-1">
      <!-- Token Header with Name, expiration and last used values -->
      <div class="mb-4">
        <div class="flex items-center gap-3">
          <p class="flex-1 text-lg font-semibold max-w-md truncate">
            {{ props.token.name }}
          </p>

          <p class="text-sm">
            <ExpiresIn :expiresAt="props.token.expires_at" show-label />
          </p>

          <p class="text-sm ml-auto">
            <LastUsed :last-used-at="props.token.last_used_at" showLabel />
          </p>
        </div>

        <!-- Token Description -->
        <p class="text-sm va-text-secondary" v-if="props.token.description">
          {{ props.token.description }}
        </p>
      </div>

      <!-- Token Key (displayed in a box with copy button) -->
      <div class="flex items-center mb-2">
        <p class="text-sm font-medium mr-1 min-w-12">Key:</p>
        <CopyText
          :text="props.token.key"
          class="flex-1 max-w-md"
          size="small"
        />
      </div>

      <!-- Token Secret (conditionally displayed based on `showSecret` prop) -->
      <div v-if="props.token.secret" class="mt-4 mb-4">
        <VaAlert color="warning" icon="warning">
          <div class="">
            Make sure to copy this secret now. You won't be able to see it
            again!
          </div>
        </VaAlert>

        <div class="flex items-center mt-2">
          <p class="font-medium mr-1 min-w-12">Secret:</p>
          <CopyText :text="props.token.secret" class="flex-1" />
        </div>
      </div>

      <!-- Token Scopes -->
      <div class="flex">
        <p class="text-sm font-medium mr-1 min-w-12">Scopes:</p>
        <ul class="text-sm va-text-secondary flex flex-wrap gap-2">
          <li v-for="scope in props.token.scopes" :key="scope">
            {{ scope }}
          </li>
        </ul>
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
  token: {
    type: Object,
    required: true,
  },
  showDelete: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["revoke"]);

/**
 * token = {
 *  id: 1,
 *  name: 'Token Name',
 *  description: 'Token Description',
 *  key: 'token-key',
 *  secret: 'token secret',
 *  scopes: ['scope1', 'scope2'],
 *  expires_at: '2021-09-01T00:00:00Z',
 *  last_used_at: '2021-09-01T00:00:00Z',
 * }
 */

// const loading = ref(false);

function handleRevoke() {
  emit("revoke", props.token.key);
}
</script>
