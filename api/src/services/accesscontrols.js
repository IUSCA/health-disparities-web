const AccessControl = require('accesscontrol');

const grantsObject = {
  admin: {
    user: {
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
    cohort: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    participant: {
      'read:any': ['*'],
    },
    genai: {
      'create:any': ['*'],
    },
  },

  // user role permissions
  user: {
    user: {
      'read:own': ['*'],
      'update:own': ['*'],
    },
    projects: {
      'read:own': ['*', '!users'], // cannot read associated users to the project
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
    cohort: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:own': ['*'],
      'delete:own': ['*'],
    },
    participant: {
      'read:any': ['*'],
    },
    workflow: {
      'create:any': ['stage'], // can only create a stage workflow
    },
  },

  // operator role permissions
  operator: {
    user: {
      'read:any': ['*'],
      'update:any': ['*', '!roles'], // cannot update roles attribute of a user
      'create:any': ['*', '!roles'], // cannot set roles attribute while creating a user
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
    cohort: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
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
  },
};
const ac = new AccessControl(grantsObject);

module.exports = ac;
