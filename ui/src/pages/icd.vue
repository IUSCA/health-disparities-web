<template>
  <div class="flex">
    <div class="w-1/2">
      <VaTreeView
        v-model:checked="selectedNodes"
        :nodes="nodes"
        selectable
        :textBy="(x) => `${x.code} ${x.name}`"
        expandAll
      />
    </div>

    <div class="w-1/2 flex flex-col">
      <div v-for="node in sortedNodes" :key="node.id">
        <div>{{ node.code }} - {{ node.name }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
// const props = defineProps({});
import { cmp } from "@/services/utils";

const selectedNodes = ref([]);

const _data = {
  40475049: {
    id: "40475049",
    code: "E10-E14",
    name: "Diabetes mellitus",
    class: 1,
    children: {
      45576436: {
        id: "45576436",
        code: "E10",
        name: "Type 1 diabetes mellitus",
        class: 2,
        children: {
          45755355: {
            id: "45755355",
            code: "E10.0",
            name: "Insulin-dependent diabetes mellitus",
            class: 3,
          },
          45755356: {
            id: "45755356",
            code: "E10.1",
            name: "Diabetes mellitus with ketoacidosis",
            class: 3,
          },
          45755357: {
            id: "45755357",
            code: "E10.2",
            name: "Diabetes mellitus with renal complications",
            class: 3,
          },
          45755358: {
            id: "45755358",
            code: "E10.3",
            name: "Diabetes mellitus with ophthalmic complications",
            class: 3,
          },
        },
      },
      45576437: {
        id: "45576437",
        code: "E11",
        name: "Type 2 diabetes mellitus",
        class: 2,
        children: {
          45755359: {
            id: "45755359",
            code: "E11.0",
            name: "Non-insulin-dependent diabetes mellitus",
            class: 3,
          },
          45755360: {
            id: "45755360",
            code: "E11.1",
            name: "Diabetes mellitus with ketoacidosis",
            class: 3,
          },
          45755361: {
            id: "45755361",
            code: "E11.2",
            name: "Diabetes mellitus with renal complications",
            class: 3,
          },
          45755362: {
            id: "45755362",
            code: "E11.3",
            name: "Diabetes mellitus with ophthalmic complications",
            class: 3,
          },
        },
      },
      45576438: {
        id: "45576438",
        code: "E12",
        name: "Malnutrition-related diabetes mellitus",
        class: 2,
        children: {
          45755363: {
            id: "45755363",
            code: "E12.0",
            name: "Malnutrition-related diabetes mellitus with ketoacidosis",
            class: 3,
          },
          45755364: {
            id: "45755364",
            code: "E12.1",
            name: "Malnutrition-related diabetes mellitus with renal complications",
            class: 3,
          },
          45755365: {
            id: "45755365",
            code: "E12.2",
            name: "Malnutrition-related diabetes mellitus with ophthalmic complications",
            class: 3,
          },
        },
      },
      45576439: {
        id: "45576439",
        code: "E13",
        name: "Other specified diabetes mellitus",
        class: 2,
        children: {
          45755366: {
            id: "45755366",
            code: "E13.0",
            name: "Other specified diabetes mellitus with ketoacidosis",
            class: 3,
          },
          45755367: {
            id: "45755367",
            code: "E13.1",
            name: "Other specified diabetes mellitus with renal complications",
            class: 3,
          },
          45755368: {
            id: "45755368",
            code: "E13.2",
            name: "Other specified diabetes mellitus with ophthalmic complications",
            class: 3,
          },
        },
      },
      45576440: {
        id: 45576440,
        code: "E14",
        name: "Unspecified diabetes mellitus",
        class: 2,
        children: {
          45755369: {
            id: "45755369",
            code: "E14.0",
            name: "Unspecified diabetes mellitus with ketoacidosis",
            class: 3,
          },
          45755370: {
            id: "45755370",
            code: "E14.1",
            name: "Unspecified diabetes mellitus with renal complications",
            class: 3,
          },
          45755371: {
            id: "45755371",
            code: "E14.2",
            name: "Unspecified diabetes mellitus with ophthalmic complications",
            class: 3,
          },
        },
      },
    },
  },
  40475150: {
    id: "40475150",
    code: "N00-N08",
    name: "Glomerular diseases",
    class: 1,
    children: {
      45592123: {
        id: "45592123",
        code: "N08",
        name: "Glomerular disorders in diseases classified elsewhere",
        class: 2,
        children: {
          45755372: {
            id: "45755372",
            code: "N08.3",
            name: "Glomerular disorders in diabetes mellitus",
            class: 3,
          },
        },
      },
    },
  },
};
const nodes = ref(format(_data));

function format(data) {
  return Object.values(data).map((n) => {
    const children = format(n.children || {});
    return {
      id: n.id,
      code: n.code,
      name: n.name,
      level: n.class,
      ...(children.length ? { children } : {}),
    };
  });
}

const cmpFn = (a, b) => cmp(a.id, b.id);
const filterFn = (node) => {
  return !!selectedNodes.value.find((id) => id === node.id);
};

const sortedNodes = computed(() => {
  return flattenTree(nodes.value);
});

function flattenTree(data) {
  return data.sort(cmpFn).reduce((acc, curr) => {
    return [
      ...acc,
      ...(filterFn(curr) ? [curr] : []),
      ...flattenTree(curr.children || []),
    ];
  }, []);
}
</script>
