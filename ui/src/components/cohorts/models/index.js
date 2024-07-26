import * as queryBuilder from "@/components/cohorts/queryBuilder/index";
import { DEFAULT_ZYGOSITIES } from "@/components/genotype/constants";
import cohortService from "@/services/cohorts";
import _ from "lodash";

const DEFAULT_SNAPSHOT_ID = 1; // todo
const DEFAULT_SOURCE_ID = 1; // todo

class Cohort {
  constructor({
    id,
    name,
    description,
    created_at,
    updated_at,
    schema,
    query,
    is_published,
    is_locked,
    is_protected,
    size,
    is_dirty,
    search_id,
    supports_editing,
    supports_copying,
  } = {}) {
    const SCHEMA = {
      name: "default",
      namespace: "edu.iu.biobank",
      version: "1.0.0",
    };
    const uniqueId = _.uniqueId();
    this.id = id || `cohort_${uniqueId}`;
    this.name = name || `Cohort ${uniqueId}`;
    this.description = description || "";
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.schema = schema || SCHEMA;
    this.query = query || this.defaultQuery();
    this.is_published = is_published || false;
    this.is_locked = is_locked || false;
    this.is_protected = is_protected || false;
    this.size = size || 0;
    this.search_id = search_id;
    this.supports_editing = supports_editing || false;
    this.supports_copying = supports_copying || false;
    this.is_dirty = is_dirty == null ? this.supports_editing : is_dirty;
  }

  /**
   * Creates a new instance of the class using data from the API.
   * Cohort.fromApiData(data) creates a new instance of Cohort.
   * PhenotypeCohort.fromApiData(data) creates a new instance of PhenotypeCohort.
   * @param {Object} data - The data received from the API.
   * @returns {Object} - A new instance of the class.
   */
  static fromApiData(data) {
    const { query, ...rest } = data;
    return new this({
      ...rest,
      schema: query.schema,
      query: query.body,
      is_dirty: false,
    });
  }

  toApiPayload() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      query: {
        schema: this.schema,
        body: this.query,
      },
      is_published: this.is_published,
      is_locked: this.is_locked,
      is_protected: this.is_protected,
    };
  }

  isNew() {
    return !this.id || this.id.startsWith("cohort_");
  }

  hasUnsavedChanges() {
    return this.is_dirty && !this.isNew();
  }

  isCopyingDisabled() {
    return this.isEmpty() || this.isNew() || !this.supports_copying;
  }

  save({ name, description, is_published, is_locked } = {}) {
    const updates = _.omitBy(
      { name, description, is_published, is_locked },
      _.isNil,
    );
    const data = Object.assign(this.toApiPayload(), updates);
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
      this.is_protected = res.data.is_protected;
      this.updated_at = res.data.updated_at;
      this.is_dirty = false;
    });
  }

  copy() {
    return new this.constructor({
      id: _.uniqueId("cohort_"),
      name: `Copy of ${this.name}`,
      description: this.description,
      size: this.size,
      schema: structuredClone(toRaw(this.schema)),
      query: structuredClone(toRaw(this.query)),
    });
  }

  export() {}

  clearQuery() {
    this.query = this.defaultQuery();
  }

  searchParticipants() {
    return cohortService
      .searchParticipants({
        query: {
          schema: this.schema,
          body: this.query,
        },
        search_id: this.search_id,
      })
      .then((res) => {
        this.size = res.data.count;
        this.search_id = res.data.search_id;
      });
  }

  // subclass should implement the below methods
  isEmpty(_query) {
    throw new Error('must implement "isEmpty" method');
  }

  defaultQuery() {
    throw new Error('must implement "defaultQuery" method');
  }
}

class PhenotypeCohort extends Cohort {
  constructor(params) {
    const SCHEMA = {
      name: "phenotype",
      namespace: "edu.iu.biobank",
      version: "1.0.0",
    };
    super({
      ...params,
      schema: SCHEMA,
      supports_editing: true,
      supports_copying: true,
    });
  }

  isEmpty(_query) {
    // TODO: what if snapsnhot is null?
    const query = _query || this.query;
    return queryBuilder.isStandardQueryEmpty(query.filters);
  }

  defaultQuery() {
    return {
      filters: queryBuilder.defaultStandardQuery(),
      snapshot_id: DEFAULT_SNAPSHOT_ID,
    };
  }
}

class CombinationCohort extends Cohort {
  constructor(params) {
    const SCHEMA = {
      name: "combination",
      namespace: "edu.iu.biobank",
      version: "1.0.0",
    };
    super({
      ...params,
      schema: SCHEMA,
      supports_editing: true,
      supports_copying: true,
    });
  }

  isEmpty(_query) {
    const query = _query || this.query;
    return query.cohort_ids.length < 2 || query.operators.length < 1;
  }

  defaultQuery() {
    return {
      cohort_ids: [],
      operators: [],
    };
  }
}

class GenotypeCohort extends Cohort {
  constructor(params) {
    const SCHEMA = {
      name: "genotype",
      namespace: "edu.iu.biobank",
      version: "1.0.0",
    };
    super({
      ...params,
      schema: SCHEMA,
      supports_editing: true,
      supports_copying: true,
    });
  }

  isEmpty(_query) {
    const query = _query || this.query;
    return (
      queryBuilder.isStandardQueryEmpty(query.filters) ||
      _.isEmpty(query.ranges) ||
      _.isEmpty(query.zygosities)
    );
  }

  defaultQuery() {
    return {
      filters: queryBuilder.defaultStandardQuery(),
      ranges: [],
      zygosities: structuredClone(DEFAULT_ZYGOSITIES),
      snapshot_id: DEFAULT_SNAPSHOT_ID,
      source_id: DEFAULT_SOURCE_ID,
    };
  }
}

function createCohort(data) {
  if (data.query.schema.name === "phenotype") {
    return PhenotypeCohort.fromApiData(data);
  } else if (data.query.schema.name === "combination") {
    return CombinationCohort.fromApiData(data);
  } else if (data.query.schema.name === "genotype") {
    return GenotypeCohort.fromApiData(data);
  } else {
    return Cohort.fromApiData(data);
  }
}

export {
  Cohort,
  CombinationCohort,
  createCohort,
  GenotypeCohort,
  PhenotypeCohort
};

