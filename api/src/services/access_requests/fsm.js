const StateMachine = require('../stateMachine');

const Roles = {
  REDCAP: 'redcap',
  ADMIN: 'admin',
  USER: 'user',
  SYSTEM: 'system',
};

const config = {
  states: ['INITIATED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED', 'EXPIRED'],
  transitions: [
    { from: 'INITIATED', to: 'PENDING', roles: [Roles.REDCAP] },
    { from: 'INITIATED', to: 'APPROVED', roles: [Roles.REDCAP] },
    { from: 'INITIATED', to: 'REJECTED', roles: [Roles.REDCAP] },
    { from: 'PENDING', to: 'APPROVED', roles: [Roles.REDCAP] },
    { from: 'PENDING', to: 'REJECTED', roles: [Roles.REDCAP] },
    { from: 'PENDING', to: 'CANCELED', roles: [Roles.ADMIN, Roles.USER] },
    { from: 'PENDING', to: 'EXPIRED', roles: [Roles.SYSTEM] },
    { from: 'APPROVED', to: 'EXPIRED', roles: [Roles.ADMIN, Roles.SYSTEM] },
  ],
};

function getFSM(status) {
  const fsm = new StateMachine(config);
  if (status) fsm.setState(status);
  return fsm;
}

module.exports = {
  config,
  getFSM,
  Roles,
};
