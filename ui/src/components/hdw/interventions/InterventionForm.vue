<template>
  <div class="grid grid-cols-1 md:grid-cols-12 gap-3 min-h-[600px] mt-5">
    <!-- Left Panel -->
    <div class="col-span-1 md:col-span-8">
      <VaCard class="w-full">
        <VaCardTitle>
          <span class="text-base">Define Intervention Criteria</span>
        </VaCardTitle>
        <VaCardContent>
          <div class="flex flex-col gap-5 mt-4">
            <!-- Category Selection -->
            <div class="flex gap-3 items-start">
              <span class="w-[120px] va-text-primary pt-2">Category</span>
              <VaOptionList
                v-model="category"
                :options="categoryOptions"
                type="radio"
                text-by="label"
                value-by="value"
                class="flex-1"
              />
            </div>

            <VaDivider class="my-3" />

            <!-- Diagnoses Selection -->
            <div v-if="category === 'dx'">
              <div class="flex gap-3 items-start">
                <label for="launch_dx_search" class="w-[120px] va-text-primary">
                  Diagnoses
                </label>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <VaButton
                      preset="primary"
                      icon="search"
                      id="launch_dx_search"
                      size="small"
                      borderColor="primary"
                      @click="openDxSearch"
                    >
                      Search for Diagnoses
                    </VaButton>

                    <VaButton
                      color="secondary"
                      preset="secondary"
                      icon="refresh"
                      @click="resetSelection"
                      class="ml-2"
                    >
                      Reset
                    </VaButton>
                  </div>
                </div>
              </div>

              <div v-if="selected.length > 0" class="mt-2">
                <HDWSelectedEntities
                  :selected-list="selected"
                  entity-type="Diagnoses"
                  @remove-item="handleRemoveItem"
                />
              </div>
            </div>

            <!-- Procedures Selection -->
            <div
              v-else-if="category === 'procedure'"
              class="flex gap-3 items-start"
            >
              <label
                for="launch_procedures_search"
                class="w-[120px] va-text-primary"
              >
                Procedures
              </label>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <VaButton
                    preset="primary"
                    icon="search"
                    id="launch_procedures_search"
                    size="small"
                    borderColor="primary"
                    @click="openProceduresSearch"
                  >
                    Search for Procedures
                  </VaButton>

                  <VaButton
                    color="secondary"
                    preset="secondary"
                    icon="refresh"
                    @click="resetSelection"
                    class="ml-2"
                  >
                    Reset
                  </VaButton>
                </div>

                <div v-if="selected.length > 0">
                  <HDWSelectedEntities
                    :selected-list="selected"
                    entity-type="Procedures"
                    @remove-item="handleRemoveItem"
                  />
                </div>
              </div>
            </div>
          </div>
        </VaCardContent>
      </VaCard>
    </div>

    <!-- Right Panel -->
    <div class="col-span-1 md:col-span-4">
      <VaCard class="w-full">
        <VaCardTitle>
          <span class="text-base">Create Intervention</span>
        </VaCardTitle>
        <VaCardContent>
          <VaForm ref="formRef" class="flex flex-col gap-3 px-4">
            <VaInput
              label="Name"
              placeholder="Enter intervention name"
              v-model="name"
              required-mark
              :rules="[(v) => !!v || 'Name is required']"
            />

            <VaTextarea
              label="Description"
              placeholder="Describe your intervention"
              v-model="description"
            />

            <div class="flex justify-center">
              <VaButton
                class="mr-2 flex-1 max-w-md"
                color="success"
                :disabled="loading || selected.length === 0 || !isValid"
                @click="createIntervention"
              >
                <div class="flex items-center">
                  <i-mdi-plus class="mr-2" />
                  <span>Create Intervention</span>
                </div>
              </VaButton>
            </div>
          </VaForm>
        </VaCardContent>
      </VaCard>
    </div>
  </div>

  <!-- Search Modals -->
  <HDWEntitySearch
    ref="dxSearchModal"
    :selected-list="selected"
    @select="handleSelect"
    :search-fn="(query) => searchService.dx(query)"
    entity-type="Diagnoses"
  />

  <HDWEntitySearch
    ref="proceduresSearchModal"
    :selected-list="selected"
    @select="handleSelect"
    :search-fn="(query) => searchService.procedures(query)"
    entity-type="Procedures"
  />
</template>

<script setup>
import interventionService from "@/services/hdw/interventions";
import searchService from "@/services/hdw/search";
import { useForm } from "vuestic-ui";

const { isValid, validate } = useForm("formRef");

const emit = defineEmits(["create"]);

// Reactive state
const formRef = ref(null);
const loading = ref(false);
const name = ref("");
const description = ref("");
const selected = ref([]);
const category = ref("dx");

// Modal references
const dxSearchModal = ref(null);
const proceduresSearchModal = ref(null);

// Options
const categoryOptions = [
  { label: "Diagnosis", value: "dx" },
  { label: "Procedure", value: "procedure" },
];

// Watchers
watch(category, () => {
  selected.value = [];
});

// Methods
function resetSelection() {
  selected.value = [];
}

function openDxSearch() {
  dxSearchModal.value.show();
}

function openProceduresSearch() {
  proceduresSearchModal.value.show();
}

function handleSelect(selectedItems) {
  selected.value = selectedItems;
}

function handleRemoveItem(item) {
  selected.value = selected.value.filter(
    (selectedItem) => selectedItem.code !== item.code,
  );
}

function createIntervention() {
  validate();
  if (!isValid.value) return;

  loading.value = true;
  interventionService
    .create({
      name: name.value,
      description: description.value,
      category: category.value,
      concept_ids: selected.value.map((item) => item.id),
    })
    .then((res) => {
      console.log("Intervention created successfully:", res);
      emit("create");
      // Reset form
      name.value = "";
      description.value = "";
      selected.value = [];
    })
    .catch((err) => {
      console.error("Failed to create intervention:", err);
    })
    .finally(() => {
      loading.value = false;
    });
}
</script>
