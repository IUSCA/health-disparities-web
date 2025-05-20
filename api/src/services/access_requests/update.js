// CQRS-style: Separate Command Handler with clear responsibilities

const _ = require('lodash/fp');
const { Prisma, PrismaClient } = require('@prisma/client');

const ConflictError = require('../errors/ConflictError');
const { findOne } = require('./read');
const { toAuditEntry, toAuditStageEntry } = require('./utils');
const { Roles } = require('./fsm');

const prisma = new PrismaClient();

const UPDATABLE_FIELDS = ['decision_date', 'status', 'notes', 'expires_at', 'last_synced_at', 'upstream_record_id'];
const STAGE_FIELDS = ['id', 'status', 'decision_date', 'metadata'];
const CONFLICT_ERROR_MESSAGE = 'Conflict detected: access request was modified concurrently';

class UpdateAccessRequestCommand {
  constructor({ identifiers, updates, context }) {
    // console.log('UpdateAccessRequestCommand', { identifiers, updates, context });
    this.identifiers = identifiers;
    this.updates = updates;
    this.context = context || {};
    this.userId = this.context.user?.id;
    this.version = this.context.version;
    this.changeSource = this.context.source;
    this.request = null;
    this.changedStages = [];
    this.cleanedUpdates = {};
  }

  validate() {
    if (!this.userId) {
      throw new Error('User context is required for auditing changes');
    }
    if (!this.version) {
      throw new Error('Version is required for optimistic concurrency control');
    }
    if (!this.changeSource) {
      throw new Error('Change source is required for auditing changes');
    }
    if (!(Object.values(Roles).includes(this.changeSource))) {
      throw new Error(
        `${this.changeSource} is an invalid source. Valid sources are ${Object.values(Roles).join(', ')}`,
      );
    }
  }

  async loadCurrentState() {
    this.request = await findOne(this.identifiers);
  }

  /**
   * Ensures updates contain only valid fields and removes undefined values.
   *
   * - Filters the updates to include only fields specified in UPDATABLE_FIELDS.
   * - Removes keys with undefined values from the updates.
   * - Processes the `stages` field in the updates:
   *   - For each stage, retains only fields specified in STAGE_FIELDS and removes keys with undefined values.
   *   - Filters out stages that do not have both `id` and `status` keys or have falsy values for these keys.
   */
  sanitizeUpdates() {
    this.cleanedUpdates = _.flow(
      _.pick(UPDATABLE_FIELDS),
      _.omitBy(_.isUndefined),
    )(this.updates);

    const cleanedStages = (this.updates.stages || [])
      .map(_.flow(
        _.pick(STAGE_FIELDS),
        _.omitBy(_.isUndefined),
      ))
      .filter((s) => s.id && s.status);

    this.changedStages = this.filterUnchangedStages(cleanedStages);
  }

  /**
   * Filters out unchanged stages from the incoming stages and assigns the changed stages
   * to the `this.changedStages` property. A stage is considered changed if any of its
   * properties differ from the corresponding stage in the original request.
   */
  filterUnchangedStages(cleanedStages) {
    return cleanedStages.filter((incoming) => {
      const original = this.request.stages.find((s) => s.id === incoming.id);
      return original && Object.entries(incoming)
        .some(([k, v]) => !_.isEqual(original[k], v));
    });
  }

  requestChanged() {
    return Object.entries(this.cleanedUpdates)
      .some(([key, value]) => !_.isEqual(this.request[key], value));
  }

  nothingChanged() {
    return !this.requestChanged() && this.changedStages.length === 0;
  }

  async persist(tx) {
    if (this.version < 1) {
      this.version = this.request.version;
    }

    const updates = [];
    if (this.requestChanged()) {
      const updatedRequest = await tx.cohort_access_request.update({
        where: { id: this.request.id, version: this.version },
        data: { ...this.cleanedUpdates, version: { increment: 1 } },
      }).catch((e) => {
        if (e instanceof Prisma.PrismaClientKnownRequestError
            && (e.code === 'P2025' || e.code === 'P2015')) {
          throw new ConflictError(CONFLICT_ERROR_MESSAGE);
        }
        throw e;
      });

      await tx.access_request_audit_log.create({
        data: {
          action: 'update',
          access_request_id: this.request.id,
          changed_by_id: this.userId,
          old_data: toAuditEntry(this.request),
          new_data: toAuditEntry(updatedRequest),
          reason: this.context.reason,
          change_source: this.changeSource,
        },
      });

      updates.push(updatedRequest);
    }

    if (this.changedStages.length > 0) {
      const updatedStages = await Promise.all(
        this.changedStages.map((stage) => tx.access_request_stage.update({
          where: {
            access_request_id_definition_id: {
              access_request_id: this.request.id,
              definition_id: stage.id,
            },
          },
          data: _.omit(['id'])(stage),
        })),
      );

      await tx.access_request_audit_log.createMany({
        data: updatedStages.map((updatedStage) => ({
          action: 'update',
          access_request_id: this.request.id,
          stage_id: updatedStage.id,
          changed_by_id: this.userId,
          old_data: toAuditStageEntry(this.request.stages.find((s) => s.id === updatedStage.id)),
          new_data: toAuditStageEntry(updatedStage),
          reason: this.context.reason,
          change_source: this.context.source,
        })),
      });

      updates.push(...updatedStages);
    }

    return updates.length > 0 ? findOne({ id: this.request.id }) : this.request;
  }

  async execute() {
    this.validate();

    await this.loadCurrentState();

    this.sanitizeUpdates();

    if (this.nothingChanged()) {
      return this.request;
    }

    return prisma.$transaction((tx) => this.persist(tx));
  }
}

module.exports = UpdateAccessRequestCommand;
