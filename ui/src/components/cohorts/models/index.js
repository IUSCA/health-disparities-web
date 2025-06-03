import * as queryBuilder from "@/components/cohorts/queryBuilder/index";
import { DEFAULT_ZYGOSITIES } from "@/components/genotype/constants";
import cohortService from "@/services/cohorts2";
import _ from "lodash";

const DEFAULT_SNAPSHOT_ID = 1; // todo
const DEFAULT_SOURCE_ID = 1; // todo
const CV = {
  PRIVATE: "PRIVATE",
  UNLISTED: "UNLISTED",
  PUBLIC: "PUBLIC",
};

class Cohort {
  static NAME_PREFIX = "Cohort ";
  static ID_PREFIX = "cohort_";

  constructor({
    id,
    name,
    description,
    created_at,
    updated_at,
    schema,
    query,
    is_locked,
    visibility,
    is_archived,
    is_favorited,
    size,
    is_dirty,
    search_id,
    supports_editing,
    supports_copying,
    supports_genai,
  } = {}) {
    const SCHEMA = {
      name: "default",
      namespace: "edu.iu.biobank",
      version: "1.0.0",
    };

    let uniqueId = null;
    if (!id || !name) {
      // generate one unique id for both id and name
      uniqueId = _.uniqueId();
    }
    this.id = id || this.constructor.uniqueId(uniqueId);
    this.name = name || `${this.constructor.NAME_PREFIX}${uniqueId}`;
    this.description = description || "";
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.schema = schema || SCHEMA;
    this.query = query || this.defaultQuery();
    this.is_locked = is_locked || false;
    this.visibility = visibility || CV.PRIVATE;
    this.is_archived = is_archived || false;
    this.is_favorited = is_favorited || false;
    this.size = size || 0;
    this.search_id = search_id;
    this.supports_editing = supports_editing || false;
    this.supports_copying = supports_copying || false;
    this.supports_genai = supports_genai || false;
    this.is_dirty = is_dirty == null ? null : is_dirty;
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

  static uniqueId(id) {
    if (id) {
      return `${this.ID_PREFIX}${id}`;
    }
    return _.uniqueId(this.ID_PREFIX);
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
    };
  }

  isNew() {
    // never saved to the server
    return !this.id || this.id.startsWith(this.constructor.ID_PREFIX);
  }

  hasUnsavedChanges() {
    // never saved or has been modified since the last save
    if (this.isNew() && !this.search_id) {
      // if the cohort is new and has not been searched yet,
      // it is not considered to have unsaved changes
      return false;
    }
    return this.is_dirty;
  }

  isCopyingDisabled() {
    // cannot copy if the cohort is empty, new (never saved), or does not support copying
    return this.isEmpty() || this.isNew() || !this.supports_copying;
  }

  save({ name, description, use_suggested_name_if_new = false } = {}) {
    const updates = _.omitBy(
      {
        name:
          name ||
          (use_suggested_name_if_new && this.isNew()
            ? this.suggested_name
            : null),
        description,
      },
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
      this.updated_at = res.data.updated_at;
      this.is_dirty = false;
    });
  }

  updateVisibility(visibility) {
    cohortService.updateVisibility(this.id, visibility).then((res) => {
      this.visibility = res.data.visibility;
      this.is_locked = res.data.is_locked;
      this.updated_at = res.data.updated_at;
      // this.is_dirty = false; // TODO
    });
  }

  copy() {
    return new this.constructor({
      id: this.constructor.uniqueId(),
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

  searchParticipants(set_as_dirty = true) {
    if (set_as_dirty) {
      this.is_dirty = true;
    }
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

  getLatestId() {
    // returns an id of the latest searched / saved cohort row in the table
    // in some edge cases, between the query being updated in the cohort and search being completed,
    // the returned id may be null or may not be found in the table
    // always use this method after searchParticipants() / save() to get a valid id
    if (this.is_dirty) {
      return this.search_id;
    } else {
      if (this.isNew()) {
        return null;
      }
      return this.id;
    }
  }

  isSavingDisabled() {
    return this.isEmpty() || this.is_locked;
  }

  // subclass should implement the below methods
  isEmpty(_query) {
    throw new Error('must implement "isEmpty" method');
  }

  defaultQuery() {
    throw new Error('must implement "defaultQuery" method');
  }

  // suggested_name is set by genAI
  // if it is not set, use the name
  getDisplayName() {
    return (this.isNew() ? this.suggested_name : this.name) || this.name;
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
      supports_genai: true,
    });
  }

  isEmpty(_query) {
    // TODO: what if snapshot is null?
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
      supports_editing: false,
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
    return _.isEmpty(query.ranges) || _.isEmpty(query.zygosities);
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
  CV,
  GenotypeCohort,
  PhenotypeCohort
};

