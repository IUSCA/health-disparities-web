import { Cohort } from "@/components/builder/models";
import {
  defaultQuery,
  isQueryEmpty,
  transformQueryForApi,
  transformStoredQuery,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import config from "@/config";
import { useCohortsStore } from "@/stores/cohorts";
import _ from "lodash";
import { storeToRefs } from "pinia";

const store = useCohortsStore();
const { totalParticipants } = storeToRefs(store);

class PhenotypeCohort extends Cohort {
  constructor(params) {
    const { schema: _schema, ...rest } = params;
    super({
      ...rest,
      schema: config.cohort.schema.phenotype,
    });
  }

  static fromJson(json) {
    const { query, ...rest } = json;
    const { name, namespace, version, criteria } = query;
    const cohort = new PhenotypeCohort({
      ...rest,
      schema: { name, namespace, version },
      criteria,
      is_dirty: false,
    });
    if (_.isEmpty(cohort.criteria)) {
      cohort.criteria = defaultQuery();
      cohort.size = totalParticipants.value;
    } else {
      cohort.criteria = transformStoredQuery(cohort.criteria);
    }
    return cohort;
  }

  toJson() {
    return {
      ...super.toJson(),
      query: {
        ...this.schema,
        criteria: transformQueryForApi(this.criteria),
      },
    };
  }

  isEmpty() {
    return isQueryEmpty(this.criteria);
  }

  static createEmpty() {
    return new PhenotypeCohort({
      id: _.uniqueId("cohort_"),
      name: store.makeNewName(),
      is_published: false,
      is_locked: false,
      is_protected: false,
      size: totalParticipants.value,
      criteria: defaultQuery(),
      schema: config.cohort.schema.phenotype,
      is_dirty: true,
      search_id: null, // id of cohort results stored temporarily
    });
  }
}

export { PhenotypeCohort };
