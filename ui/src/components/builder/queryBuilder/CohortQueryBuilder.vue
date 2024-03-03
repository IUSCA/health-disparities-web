<template>
  <div>
    <!-- {{ query }}
    <br />
    <br />
    {{ transformQueryForApi(query) }}
    <br />
    <br />
    {{ transformStoredQuery(transformQueryForApi(query)) }}
    <br />
    <br />
    {{
      JSON.stringify(query) ===
      JSON.stringify(transformStoredQuery(transformQueryForApi(query)))
    }} -->

    <!-- Button positioned absolutely overlaps a div. to make it clickable z-index is set to 1 -->
    <VaButton
      @click="clearFilters"
      size="small"
      color="primary"
      icon="backspace"
      outline
      preset="primary"
      v-if="someFilters"
      class="absolute top-3 right-3"
      style="z-index: 1"
    >
      Clear All Filters
    </VaButton>

    <QueryBuilder :config="config" v-model="query">
      <template #groupOperator="props">
        <div class="flex items-center gap-3">
          <span>Operator</span>
          <VaSelect
            :model-value="props.currentOperator"
            @update:model-value="(v) => props.updateCurrentOperator(v)"
            :options="props.operators"
            text-by="name"
            value-by="identifier"
            class="group-operator-select w-28 flex-none text-sm"
            size="small"
          >
          </VaSelect>
        </div>
      </template>

      <template #groupControl="props">
        <div class="flex items-center gap-3">
          <VaButton
            @click="
              filterSelectModal.show((node) => {
                if (!node) return;
                props.addRule(node.id);
              })
            "
            size="small"
            color="primary"
            icon="add"
            preset="primary"
          >
            Add Filter
          </VaButton>

          <VaButton
            @click="(v) => props.newGroup()"
            size="small"
            color="primary"
            icon="post_add"
            preset="primary"
          >
            Add Group
          </VaButton>
        </div>
      </template>

      <template #rule="ruleCtrl">
        <div class="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
          <FilterChip :identifier="ruleCtrl.ruleIdentifier" />
          <VaSelect
            :model-value="ruleCtrl.connectorValue"
            @update:model-value="(v) => ruleCtrl.updateConnectorValue(v)"
            :options="ruleCtrl.connectorDefinition.options"
            text-by="label"
            value-by="key"
            class="group-operator-select w-36 flex-none"
            size="small"
          >
          </VaSelect>
          <component
            v-if="!isUnaryOperator(ruleCtrl.connectorValue)"
            :is="ruleCtrl.ruleComponent"
            :identifier="ruleCtrl.ruleIdentifier"
            :model-value="ruleCtrl.ruleData"
            :range="ruleCtrl.connectorValue === 'between'"
            @update:model-value="
              (v) => {
                console.log('update', v);
                ruleCtrl.updateRuleData(v);
              }
            "
          />
        </div>
      </template>
    </QueryBuilder>
  </div>

  <!-- z-index is set to 10 to hide the absolutely positioned button with z-index 1 -->
  <FilterSelectModal ref="filterSelectModal" style="z-index: 10" />
</template>

<script setup>
import { QueryBuilder } from "@metal_brains/query-builder-vue";
import "@metal_brains/query-builder-vue/dist/style.css";

import {
  cohortFilters,
  flatten,
  isUnaryOperator,
  operators,
} from "../cohortFilters";
import { defaultQuery, defultOperators } from "./cohortQueryBuilder";
import QBDate from "./filterComponents/QBDate.vue";
import QBInput from "./filterComponents/QBInput.vue";
import QBSelect from "./filterComponents/QBSelect.vue";

// const props = defineProps({});
// v-model:query - bidirectional binding
// should be either null or a compatible query object. {} is not compatible.
const query = defineModel("query");

const filterSelectModal = ref(null);
// const query = ref(null);
const config = {
  operators: [
    {
      name: "AND",
      identifier: "AND",
    },
    {
      name: "OR",
      identifier: "OR",
    },
    {
      name: "Exclude",
      identifier: "NOT_AND",
    },
  ],
  connectors: operators,
  colors: ["hsl(88, 50%, 55%)", "hsl(187, 100%, 45%)", "hsl(15, 100%, 55%)"],
  // rules: [
  //   {
  //     identifier: "txt",
  //     name: "Text Selection",
  //     component: Input,
  //     initialValue: "",
  //   },
  //   {
  //     identifier: "num",
  //     name: "Number Selection",
  //     component: Input,
  //     initialValue: 10,
  //   },
  // ],
  rules: flatten(cohortFilters).map((field) => {
    return {
      identifier: field.id,
      name: field.label,
      component: getComponentByType(field.type),
      initialValue: getInitialValue(field.type),
      connectorIdentifier: field.type,
      defaultConnectorValue: defultOperators[field.type],
    };
  }),
};

function getComponentByType(type) {
  switch (type) {
    case "text":
      return QBInput;
    case "number":
      return QBInput;
    case "date":
      return QBDate;
    case "select":
      return QBSelect;
    default:
      return QBInput;
  }
}

function getInitialValue(type) {
  switch (type) {
    case "text":
      return null;
    case "number":
      return null;
    case "date":
      return null;
    case "select":
      return () => [];
    default:
      return null;
  }
}

const someFilters = computed(() => {
  return query.value && query.value.children?.length > 0;
});

const clearFilters = () => {
  query.value = defaultQuery();
};
</script>

<style scoped lang="scss">
:deep(.group-operator-select) {
  .va-input-wrapper__field {
    --va-input-wrapper-min-height: 24px;
  }
}

:deep(.query-builder-group__group-selection-slot) {
  margin-bottom: 0.5rem;
}

:deep(.query-builder-rule) {
  background-color: inherit;
  padding: 0.25rem;
}

:deep(.query-builder-child__delete-child) {
  top: 6px;
  font-size: 1.25rem;
}

:deep(.query-builder-group__child) {
  margin-bottom: 0 !important;
}

:deep(.query-builder-group) .query-builder-group {
  padding-top: 1rem;
  padding-left: 1rem;
  padding-bottom: 1rem;
  // background-color: aqua;
}
</style>

<style lang="scss">
html.dark .query-builder-child__delete-child {
  color: var(--va-text-color);
  text-shadow: none;
  opacity: 0.7;
}
</style>
