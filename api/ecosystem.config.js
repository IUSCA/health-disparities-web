module.exports = [{
  script: 'src/index.js',
  name: 'api',
  exec_mode: 'cluster',
  instances: 2,
  exp_backoff_restart_delay: 100,
  max_restarts: 3,
  watch: true,
}, {
  script: 'src/scripts/delete_temp_cohorts.js',
  name: 'delete_temp_cohorts',
  cron_restart: '0 */1 * * *', // every 1 hour
},
];
