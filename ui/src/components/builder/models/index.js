import {
  defaultQuery,
  transformQueryForApi,
  transformStoredQuery,
} from "@/components/builder/queryBuilder/cohortQueryBuilder";
import { DEFAULT_ZYGOSITIES } from "@/components/genotype/constants";
import config from "@/config";
import cohortService from "@/services/cohort2";
import variantService from "@/services/variants";
import _ from "lodash";

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
    supports_editing,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.size = size;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.schema = schema;
    this.criteria = criteria;
    this.is_published = is_published || false;
    this.is_locked = is_locked || false;
    this.is_protected = is_protected || false;

    this.is_dirty = is_dirty;
    this.search_id = search_id;

    this.supports_editing = supports_editing || false;
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

  save({ name, description, is_published, is_locked } = {}) {
    const updates = _.omitBy(
      { name, description, is_published, is_locked },
      _.isNil,
    );
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

  defaultCriteria() {
    return {};
  }

  // create a clone of the cohort
  // change name to "Copy of <name>"
  // set published and locked to false
  // set dirty to true if the original cohort supports editing
  copy() {
    return new this.constructor({
      id: _.uniqueId("cohort_"),
      name: `Copy of ${this.name}`,
      description: this.description,
      size: this.size,
      schema: this.schema,
      criteria: this.criteria,
      is_dirty: this.supports_editing,
      supports_editing: this.supports_editing,
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

  static fromJson(json) {
    const { query, ...rest } = json;
    const { name, namespace, version, criteria } = query;
    return new CombinationCohort({
      ...rest,
      schema: { name, namespace, version },
      criteria,
    });
  }

  static createEmpty() {
    return new CombinationCohort({
      id: _.uniqueId("cohort_"),
      name: "Combined Cohort",
      size: 0,
      criteria: {
        cohort_ids: [],
        operators: [],
      },
      is_dirty: true,
    });
  }
}

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

  defaultCriteria() {
    return {
      criteria: defaultQuery(),
      ranges: [],
      zygosities: DEFAULT_ZYGOSITIES,
      source_id: null,
      snapshot_id: null,
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
}

export { Cohort, CombinationCohort, GenotypeCohort };
