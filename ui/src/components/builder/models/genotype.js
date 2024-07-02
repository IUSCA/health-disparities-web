import { Cohort } from "@/components/builder/models";
import {
  defaultQuery,
  transformQueryForApi,
  transformStoredQuery,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import { DEFAULT_ZYGOSITIES } from "@/components/genotype/constants";
import config from "@/config";
import variantService from "@/services/variants";
import { useCohortsStore } from "@/stores/cohorts";
import _ from "lodash";
import { storeToRefs } from "pinia";

const store = useCohortsStore();
const { totalParticipants } = storeToRefs(store);

class GenotypeCohort extends Cohort {
  constructor(params) {
    const { schema: _schema, ...rest } = params;
    super({
      ...rest,
      schema: config.cohort.schema.genotype,
      supports_editing: true,
    });
  }

  static fromJson(json) {
    const { query, ...rest } = json;
    const {
      name,
      namespace,
      version,
      criteria,
      ranges,
      zygosities,
      source_id,
      snapshot_id,
    } = query;
    return new GenotypeCohort({
      ...rest,
      schema: { name, namespace, version },
      criteria: {
        criteria: transformStoredQuery(criteria),
        ranges,
        zygosities,
        source_id,
        snapshot_id,
      },
    });
  }

  isEmpty() {
    return (
      _.isEmpty(this.criteria?.ranges) || _.isEmpty(this.criteria?.zygosities)
    );
  }

  toJson() {
    return {
      ...super.toJson(),
      query: {
        ...this.schema,
        ...this.criteria,
        criteria: transformQueryForApi(this.criteria.criteria),
      },
    };
  }

  static defaultCriteria() {
    return {
      criteria: defaultQuery(),
      ranges: [],
      zygosities: DEFAULT_ZYGOSITIES,
      source_id: 1,
      snapshot_id: 1,
    };
  }

  save({ name, description, is_published, is_locked } = {}) {
    const updates = _.omitBy(
      { name, description, is_published, is_locked },
      _.isNil,
    );
    const data = Object.assign(this.toJson(), updates);
    return (
      this.isNew()
        ? variantService.createCohort(data)
        : variantService.updateCohort(this.id, data)
    ).then((res) => {
      this.id = res.data.id;
      this.name = res.data.name;
      this.description = res.data.description;
      this.is_published = res.data.is_published;
      this.is_locked = res.data.is_locked;
      this.is_dirty = false;
      return res.data;
    });
  }

  static createEmpty() {
    return new GenotypeCohort({
      id: _.uniqueId("cohort_"),
      name: store.makeNewName(),
      is_published: false,
      is_locked: false,
      is_protected: false,
      size: totalParticipants.value,
      criteria: GenotypeCohort.defaultCriteria(),
      schema: config.cohort.schema.genotype,
      is_dirty: true,
      search_id: null, // id of cohort results stored temporarily
    });
  }
}

export { GenotypeCohort };
