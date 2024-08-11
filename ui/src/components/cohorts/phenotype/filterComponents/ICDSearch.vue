<template>
  <div class="w-full">
    <!-- show selected values - model -->
    <div class="flex flex-row flex-wrap gap-1 w-full overflow-y-scroll">
      <VaChip
        v-for="node in compactList"
        :key="node.concept_code"
        square
        size="small"
        @click="
          selectedNodes = model;
          selectModal = true;
        "
        class="whitespace-nowrap cursor-pointer"
        :color="colors.backgroundBorder"
      >
        {{ node.concept_code }} - &nbsp;

        <span class="truncate max-w-[150px]">{{ node.concept_name }}</span>

        <span v-if="node.num_descendants > 0">
          &nbsp;(+{{ node.num_descendants }})
        </span>
      </VaChip>
    </div>

    <!-- buttons to open modal to search and select diagnosis name / code -->
    <div
      class="flex gap-3"
      :class="{ 'mt-2': compactList.length > 0 }"
      v-if="!props.readOnly"
    >
      <VaButton
        size="small"
        color="primary"
        icon="search"
        @click="
          selectedByName = model;
          nameModal = true;
        "
      >
        Search by Name
      </VaButton>
      <VaButton
        size="small"
        color="primary"
        icon="search"
        @click="
          selectedByCode = model;
          codeModal = true;
        "
      >
        Search by Code
      </VaButton>
    </div>
  </div>

  <!-- Modal -->
  <VaModal
    v-model="nameModal"
    title="Search by Name"
    close-button
    size="large"
    fixed-layout
    @ok="model = selectedByName"
  >
    <IcdNameSearch v-model="selectedByName" />
  </VaModal>

  <VaModal
    v-model="codeModal"
    title="Search by Code"
    close-button
    size="large"
    fixed-layout
    @ok="model = selectedByCode"
  >
    <IcdCodeSearch v-model="selectedByCode" />
  </VaModal>

  <VaModal
    v-model="selectModal"
    title="Selected Diagnoses"
    close-button
    size="large"
    fixed-layout
    @ok="model = selectedNodes"
  >
    <div class="h-screen">
      <VaTreeView
        v-model:checked="selectedNodes"
        :nodes="treeNodes"
        selectable
        trackBy="concept_id"
        :valueBy="(x) => x.concept_code"
        expand-all
        class="whitespace-nowrap"
      >
        <!-- :color="stringToRGB('12345' + node.concept_code[0] + '678910')" -->
        <template #content="node">
          <div class="flex">
            <div class="flex-none flex items-center">
              <span class="font-semibold mr-2">{{ node.concept_code }}</span>

              <span> {{ node.concept_name }} </span>

              <!-- domain id icon -->
              <div
                v-if="node.domain_id"
                :title="`Domain: ${node.domain_id}`"
                class="ml-1"
              >
                <Icon
                  :icon="`mdi-alphabet-${node.domain_id.toLowerCase()[0]}-circle-outline`"
                />
              </div>
            </div>
          </div>
        </template>
      </VaTreeView>
    </div>
  </VaModal>
</template>

<script setup>
import { createTree, formatTree } from "@/components/icd/tree_utils";
import { useIcdStore } from "@/stores/icd";
import { useColors } from "vuestic-ui";

const model = defineModel();

const props = defineProps({
  identifier: String,
  range: Boolean,
  readOnly: {
    type: Boolean,
    default: false,
  },
});

const icdStore = useIcdStore();
const { colors } = useColors();

const codeModal = ref(false);
const nameModal = ref(false);
const selectModal = ref(false);

const selectedByName = ref([]);
const selectedByCode = ref([]);
const selectedNodes = ref([]);

const treeNodes = ref([]);
const compactList = ref([]);
const loading = ref(false);

watch(
  model,
  () => {
    loading.value = true;
    icdStore
      .getAll(model.value)
      .then((mapping) => {
        const tree = createTree(Object.values(mapping));
        const formattedTree = formatTree(tree);
        treeNodes.value = formattedTree.children || [];
        compactList.value = toCompactList(formattedTree.children || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        loading.value = false;
      });
  },
  { deep: true, immediate: true },
);

function toCompactList(tree) {
  // for each top level node, count the number of children
  return tree.map((node) => {
    const { children: _, ...rest } = node;
    return {
      ...rest,
      num_descendants: countDescendants(node),
    };
  });
}

function countDescendants(node) {
  if (!node.children) return 0;
  return (
    node.children.reduce((acc, child) => acc + countDescendants(child), 0) +
    node.children.length
  );
}
</script>
