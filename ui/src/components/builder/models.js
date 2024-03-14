import {
  defaultQuery,
  isQueryEmpty,
  transformQueryForApi,
  transformStoredQuery,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import config from "@/config";
import cohortService from "@/services/cohort2";
import { useCohortsStore } from "@/stores/cohorts";
import _ from "lodash";
import { storeToRefs } from "pinia";

const store = useCohortsStore();
const { totalParticipants } = storeToRefs(store);

class Cohort {
  constructor({
    id,
    name,
    description,
    size,
    created_at,
    updated_at,
    schema,
    criteria,
    is_published,
    is_locked,
    is_dirty,
    is_protected,
    search_id,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.size = size;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.schema = schema;
    this.criteria = criteria;
    this.is_published = is_published;
    this.is_locked = is_locked;
    this.is_protected = is_protected;

    this.is_dirty = is_dirty;
    this.search_id = search_id;
  }

  // static or instance method?
  static fromJson(json) {
    const { query, ...rest } = json;
    const { name, namespace, version, criteria } = query;
    return new Cohort({
      ...rest,
      schema: { name, namespace, version },
      criteria,
    });
  }

  isEmpty() {
    return false;
  }

  isNew() {
    return !this.id || this.id.startsWith("cohort_");
  }

  save({ name, description, is_published, is_locked }) {
    const updates = { name, description, is_published, is_locked };
    const data = Object.assign(this.toJson(), updates);
    return (
      this.isNew()
        ? cohortService.create(data)
        : cohortService.update(this.id, data)
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

  toJson() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      is_published: this.is_published,
      is_locked: this.is_locked,
      query: {
        ...this.schema,
        criteria: this.criteria,
      },
    };
  }

  hasUnsavedChanges() {
    return this.is_dirty && !this.isNew();
  }
}

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

class CombinationCohort extends Cohort {
  constructor(params) {
    const { schema: _schema, ...rest } = params;
    super({
      ...rest,
      schema: config.cohort.schema.combination,
    });
  }
}

function isPhenotypeQuery({ name, namespace, version }) {
  return (
    name === config.cohort.schema.phenotype.name &&
    namespace === config.cohort.schema.phenotype.namespace &&
    version === config.cohort.schema.phenotype.version
  );
}

function isCombinationQuery({ name, namespace, version }) {
  return (
    name === config.cohort.schema.combination.name &&
    namespace === config.cohort.schema.combination.namespace &&
    version === config.cohort.schema.combination.version
  );
}

function createCohort(json) {
  if (isPhenotypeQuery(json.query)) {
    return PhenotypeCohort.fromJson(json);
  } else if (isCombinationQuery(json.query)) {
    return new CombinationCohort.fromJson(json);
  } else {
    return new Cohort(json);
  }
}

export {
  Cohort,
  CombinationCohort,
  PhenotypeCohort,
  createCohort,
  isPhenotypeQuery
};

