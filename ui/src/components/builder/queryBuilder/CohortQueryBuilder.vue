<template>
  <!-- overlay fade: https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_image_overlay_opacity -->
  <div class="container">
    <div class="middle" v-if="props.locked">
      <i-mdi-lock class="text-3xl text-gray-600 dark:text-gray-100" />
    </div>
    <div :class="props.locked ? 'locked-form' : ''">
      <div :class="props.locked ? 'pointer-events-none' : ''">
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

        <QueryBuilder :config="config" v-model="query">
          <template #groupOperator="props">
            <div class="flex items-center gap-3">
              <span>Matching</span>
              <VaSelect
                :model-value="props.currentOperator"
                @update:model-value="(v) => props.updateCurrentOperator(v)"
                :options="props.operators"
                text-by="name"
                value-by="identifier"
                class="group-operator-select w-32 flex-none text-sm"
                size="small"
              >
              </VaSelect>
            </div>
          </template>

          <template #groupControl="grpCtrlProps">
            <div class="flex items-center gap-3">
              <VaButton
                @click="
                  filterSelectModal.show((node) => {
                    if (!node) return;
                    grpCtrlProps.addRule(node.id);
                  })
                "
                size="small"
                color="primary"
                icon="add"
                preset="primary"
                v-if="!props.locked"
              >
                Add Filter
              </VaButton>

              <VaButton
                @click="(v) => grpCtrlProps.newGroup()"
                size="small"
                color="primary"
                icon="post_add"
                preset="primary"
                v-if="!props.locked"
              >
                Add Group
              </VaButton>
            </div>
          </template>

          <template #rule="ruleCtrl">
            <div
              class="flex flex-wrap items-center gap-2 md:gap-3 text-sm w-[calc(100%-2rem)] max-w-3xl"
            >
              <FilterChip
                :filters="cohortFilters"
                :identifier="ruleCtrl.ruleIdentifier"
              />
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
                    ruleCtrl.updateRuleData(v);
                  }
                "
              />
            </div>
          </template>
        </QueryBuilder>
      </div>
    </div>
  </div>

  <FilterSelectModal :filters="cohortFilters" ref="filterSelectModal" />
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
import QBAsyncSelect from "./filterComponents/QBAsyncSelect.vue";
import QBDate from "./filterComponents/QBDate.vue";
import QBDxNameSelect from "./filterComponents/QBDxNameSelect.vue";
import QBInput from "./filterComponents/QBInput.vue";
import QBSelect from "./filterComponents/QBSelect.vue";

const props = defineProps({
  locked: Boolean,
});
// v-model:query - bidirectional binding
// should be either null or a compatible query object. {} is not compatible.
const query = defineModel("query");

const filterSelectModal = ref(null);
// const query = ref(null);

/**
 * Default operators for different data types.
 */
const defultOperators = {
  select: "in",
  number: "eq",
  text: "eq",
  date: "lte",
  asyncSelect: "in",
};

const config = {
  operators: [
    {
      name: "All",
      identifier: "AND",
    },
    {
      name: "Any",
      identifier: "OR",
    },
    {
      name: "Excluding all",
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
      component: getComponent(field),
      initialValue: getInitialValue(field.type),
      connectorIdentifier: field.type,
      defaultConnectorValue: defultOperators[field.type],
    };
  }),
};

function getComponent(field) {
  if (field.id === "dx.name") {
    return QBDxNameSelect;
  }
  switch (field.type) {
    case "number":
      return QBInput;
    case "date":
      return QBDate;
    case "select":
      return QBSelect;
    case "asyncSelect":
      return QBAsyncSelect;
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
    case "asyncSelect":
      return () => [];
    default:
      return null;
  }
}
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
.container {
  position: relative;
}

.locked-form {
  opacity: 1;
  display: block;
  width: 100%;
  height: auto;
  transition: 0.5s ease;
  backface-visibility: hidden;
}

.container:hover .locked-form {
  opacity: 0.3;
}

.middle {
  opacity: 0;
  transition: 0.5s ease;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  -ms-transform: translate(-50%, -50%);
  text-align: center;
}

.container:hover .middle {
  opacity: 1;
}
</style>

<style lang="scss">
html.dark .query-builder-child__delete-child {
  color: var(--va-text-color);
  text-shadow: none;
  opacity: 0.7;
}
</style>
