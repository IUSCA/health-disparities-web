import icd10Service from "@/services/icd10";
import _ from "lodash";
import { acceptHMRUpdate, defineStore } from "pinia";

export const useIcdStore = defineStore("icd", () => {
  let data = {};

  function reset() {
    data = {};
  }

  async function getAll(codes) {
    console.log("store.getAll codes", codes);
    const missing_codes = codes.filter((code) => !data[code]);
    if (missing_codes.length > 0) {
      await icd10Service.get({ codes: missing_codes }).then((res) => {
        const new_mapping = res.data.reduce((acc, item) => {
          const {
            concept_id,
            concept_code,
            concept_name,
            concept_class_id,
            domain_id,
            path,
          } = item;
          acc[concept_code] = {
            concept_id,
            concept_code,
            concept_name,
            concept_class_id,
            domain_id,
            path,
          };
          return acc;
        }, {});
        Object.assign(data, new_mapping);
      });
    }
    return _.cloneDeep(_.pick(data, codes));
  }

  return {
    data,
    reset,
    getAll,
  };
});

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useIcdStore, import.meta.hot));
