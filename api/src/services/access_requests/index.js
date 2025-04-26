const UpdateAccessRequestCommand = require('./update');
const { findAll, findOne } = require('./read');
const { create } = require('./create');
const fsm = require('./fsm');
const { mapStages } = require('./utils');

async function update({ identifiers, updates, context }) {
  const command = new UpdateAccessRequestCommand({ identifiers, updates, context });
  return command.execute();
}

module.exports = {
  findAll,
  findOne,
  update,
  create,
  fsm,
  mapStages,
};
