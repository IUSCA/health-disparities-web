<script setup>
import cohortService from '@/services/cohort'

const all = ref(null)
const columns = ref([])

onMounted(async () => {

  cohortService.getMyCohorts().then(results => {
    all.value = results.data

    // Split excludes and includes to separate columns
    all.value = all.value.map(item => {
      const { excludes, includes } = item.query;
      return {
        id: item.id,
        cohort: item.name,
        participants: item.participants,
        includes,
        excludes,
        position: '',
        SNP: ''
        
      };
    });

    // Set columns dynamically by using the first item in the array
    for(let key of Object.keys(all.value[0])) {
      columns.value.push({ key: key, sortable: true, sortingOptions: ["desc", "asc", null] })
    }

    // Add actions column
    columns.value.push({ key: "actions", label: "Actions" })
                    
    console.log(all.value)
  })
})

const analyze = (id) => console.log(id)
const SNP = ref(null)
</script>

<template>
  <va-data-table v-if="all" :items="all" :columns="columns" >
    <template #cell(includes)="{ rowData }">
      <div v-for="group of rowData.includes">
        <div v-for="include of group.query">
          <div v-if="include.val">{{ include.category }}.{{ include.field }} {{ include.op }} {{ include.val }}</div>
        </div>
      </div>
    </template>
    <template #cell(excludes)="{ rowData }">
      <div v-for="group of rowData.excludes">
        <div v-for="include of group.query">
          <div v-if="include.val">{{ include.category }}.{{ include.field }} {{ include.op }} {{ include.val }}</div>
        </div>
      </div>
    </template>
    <template #cell(position)="{ rowData }">
      <va-select class="mb-2 border-gray-500 border border-solid rounded" v-model="rowData.position" label="Position" :options="['23452343', '23425321', '578977', '534345353', '45645688']" searchable highlight-matched-text allow-create="unique" @create-new="addNewGroup" @update:modelValue="showGroup(grouping.group, group)"  />
    </template>
    <template #cell(SNP)="{ rowData }">
      <va-select class="mb-2 border-gray-500 border border-solid rounded" v-model="rowData.SNP" label="SNP" :options="['rs123123', 'rs23125435', 'rs978123', 'rs428394719', 'rs42789479']" searchable highlight-matched-text allow-create="unique" @create-new="addNewGroup" @update:modelValue="showGroup(grouping.group, group)"  />
    </template>
    <template #cell(actions)="{ rowData }">
      <va-button preset="secondary" border-color="primary" @click="analyze(rowData.id)" class="va-button mx-2"><Icon icon="carbon:ibm-process-mining" />&nbsp; Analyze</va-button>
    </template>
  </va-data-table>
</template>