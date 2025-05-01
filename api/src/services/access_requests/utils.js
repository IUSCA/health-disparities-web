const _ = require('lodash/fp');

function mapStage(stage) {
  return {
    id: stage.definition.id,
    name: stage.definition.name,
    description: stage.definition.description,
    status: stage.status,
    metadata: stage.metadata,
    decision_date: stage.decision_date,
    updated_at: stage.updated_at,
  };
}

const toAuditEntry = _.omit([
  'id', 'created_at', 'updated_at', 'stages', 'cohort', 'requester', 'audit_logs',
]);
const toAuditStageEntry = _.pick(['status', 'decision_date', 'metadata']);

module.exports = {

  toAuditEntry,
  toAuditStageEntry,
  mapStage,
};
