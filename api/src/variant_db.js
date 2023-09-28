require('dotenv-safe').config();
const postgres = require('postgres');
const config = require('config');

const password = encodeURIComponent(config.get('variant_db.password'));
const variant_db_config = config.get('variant_db');

const sql = postgres({ ...variant_db_config, password });

module.exports = sql;
