<script setup>

const emit = defineEmits(["save"])

import cohortService from '@/services/cohort'

const categories = ref([])
const fields = ref([])

cohortService.getCategories().then(result => categories.value = result.data)
const getFields = (val) => cohortService.getFields(val) .then(result => fields.value = result.data)

const chosen_fields = ref({})

const setting_name = ref('')

const getHeader = (field) => makeLabel(field) + " - " +  Object.keys(chosen_fields.value).filter(key => key.startsWith(field)).length
const makeLabel = (label) => label.replace(/(^|_)(\w)/g, function ($0, $1, $2) { return ($1 && ' ') + $2.toUpperCase(); })

const save = async () => {
  await cohortService.saveSetting({name: setting_name.value, fields: chosen_fields.value})
  emit('save', { name: setting_name.value, fields: chosen_fields.value })
}

</script>

<template>
<div class="w-full">
  <va-input class="mb-2 w-full" v-model="setting_name" label="Display Name" />
  <br />
  <va-accordion v-model="value" class="max-w-sm">
    <va-collapse v-for="(field, index) in categories" :key="index" :header="getHeader(field)" @click="getFields(field)">
      <div v-if="fields" class="mt-3">
        <va-switch @click.stop class="mr-2" v-model="chosen_fields[`${field}.${option}`]" v-for="option in fields">{{ option }}</va-switch>
      </div>
      <div v-else>
        <va-loading />
      </div>
      <br />
    </va-collapse>
  </va-accordion>
  <va-button v-if="chosen_fields !== {}" class="mt-2 w-full" @click="save"><Icon icon="ic:baseline-save" /> &nbsp; Save</va-button>
</div>

</template>


