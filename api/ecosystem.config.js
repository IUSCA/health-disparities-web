module.exports = [{
  script: 'src/index.js',
  name: 'api',
  exec_mode: 'cluster',
  instances: 2,
  exp_backoff_restart_delay: 100,
  max_restarts: 3,
  watch: false,
},
{
  name: 'delete temp cohorts',
  script: 'src/scripts/delete_temp_cohorts.js',
  cron_restart: '0 * * * *', // minute 0 of every hour
  autorestart: false,
},
];
