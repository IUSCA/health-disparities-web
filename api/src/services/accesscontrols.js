const AccessControl = require('accesscontrol'); // cspell: disable-line

const CONSTANTS = require('../constants');

const grantsObject = {
  admin: {
    user: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    api_keys: {
      'create:any': ['*'],
      'read:any': ['*', '!secret'], // cannot read the secret of the api key
      'delete:any': ['*'],
    },
    scopes: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    api_keys_audit_logs: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    workflow: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    datasets: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    dataset_name: {
      'read:any': ['*'],
    },
    instruments: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    projects: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    project_dataset_files: {
      'read:any': ['*'],
    },
    statistics: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    metrics: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    about: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    auth: {
      'create:any': ['*'],
    },
    variant: {
      'read:any': ['*'],
    },
    snapshot: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    protocol: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    source: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
    },
    phenotype_file: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    genotype_set: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    genotype_file: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    genotype_sample: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    cohorts: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    cohort_data: {
      'read:any': ['*'],
    },
    participant: {
      'read:any': ['*'],
    },
    genai: {
      'create:any': ['*'],
    },
    notifications: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    fs: {
      'read:any': ['*'],
    },
    upload: {
      'create:any': ['*'],
    },
    cohort_access_requests: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
  },

  // user role permissions
  user: {
    user: {
      'read:own': ['*'],
      'update:own': ['*'],
    },
    api_keys: {
      'read:own': ['*', '!secret'], // cannot read the secret of the api key
      'create:own': ['*'],
      'delete:own': ['*'],
    },
    scopes: {
      'read:any': ['*'],
    },
    projects: {
      'read:own': ['*', '!users'], // cannot read associated users to the project
    },
    datasets: {
      'create:any': ['*'],
      'read:own': ['*'],
      'update:own': ['*'],
    },
    dataset_name: {
      'read:any': ['*'],
    },
    project_dataset_files: {
      'read:own': ['*'],
    },
    variant: {
      'read:any': ['*'],
    },
    snapshot: {
      'read:any': ['*'],
    },
    source: {
      'read:any': ['*'],
    },
    cohorts: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:own': ['*'],
      'delete:own': ['*'],
    },
    cohort_data: {
      'read:any': ['*'],
    },
    participant: {
      'read:any': ['*'],
    },
    workflow: {
      // user role can only create these four workflows
      'create:any': [
        CONSTANTS.WORKFLOWS.INTEGRATED,
        CONSTANTS.WORKFLOWS.STAGE,
        CONSTANTS.WORKFLOWS.PROCESS_DATASET_UPLOAD,
        CONSTANTS.WORKFLOWS.CANCEL_DATASET_UPLOAD,
      ],
    },
    instruments: {
      'read:any': ['*'],
    },
    statistics: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    upload: {
      'create:any': ['*'],
    },
    fs: {
      'read:any': ['*'],
    },
    cohort_access_requests: {
      'create:own': ['*'],
      'read:own': ['*', '!audit_logs', '!upstream_record_id'], // cannot read audit logs and upstream record id
    },
  },

  // operator role permissions
  operator: {
    user: {
      'read:any': ['*'],
      'update:any': ['*', '!roles'], // cannot update roles attribute of a user
      'create:any': ['*', '!roles'], // cannot set roles attribute while creating a user
    },
    api_keys: {
      'read:own': ['*', '!secret'], // cannot read the secret of the api key
      'create:own': ['*'],
      'delete:own': ['*'],
    },
    scopes: {
      'read:any': ['*'],
    },
    workflow: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
    },
    datasets: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    dataset_name: {
      'read:any': ['*'],
    },
    instruments: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    projects: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    project_dataset_files: {
      'read:any': ['*'],
    },
    variant: {
      'read:any': ['*'],
    },
    statistics: {
      'create:any': ['*'],
      'read:any': ['*'],
    },
    metrics: {
      'read:any': ['*'],
    },
    snapshot: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    protocol: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    source: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
    },
    cohorts: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    cohort_data: {
      'read:any': ['*'],
    },
    participant: {
      'read:any': ['*'],
    },
    about: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    genai: {
      'create:any': ['*'],
    },
    notifications: {
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    fs: {
      'read:any': ['*'],
    },
    upload: {
      'create:any': ['*'],
    },
    cohort_access_requests: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
  },
};
const ac = new AccessControl(grantsObject);

module.exports = ac;
