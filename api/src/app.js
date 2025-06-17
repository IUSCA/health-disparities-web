const fs = require('fs');

const express = require('express');
const cookieParser = require('cookie-parser');
const requestLogger = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const config = require('config');
const cors = require('cors');

const indexRouter = require('./routes/index');
const {
  notFound,
  errorHandler,
  prismaNotFoundHandler,
  assertionErrorHandler,
  axiosErrorHandler,
  prismaConstraintFailedHandler,
  conflictErrorHandler,
} = require('./middleware/error');
const { apiKeyAuditLogger } = require('./middleware/loggers');

// Register application
const app = express();

// Enable CORS for all origins
// justification: allow requests from swagger UI hosted on biobank.sca.iu.edu
app.use(cors({
  origin: 'https://biobank.sca.iu.edu',
  optionsSuccessStatus: 200,
}));

// remove fingerprinting header
app.disable('x-powered-by');

// request logger - https://github.com/expressjs/morgan
if (config.get('mode') === 'production') {
  app.use(requestLogger('combined', { skip: (req, res) => res.statusCode < 400 }));
} else {
  app.use(requestLogger('dev'));
}

// save every request made using API access key to the database
app.use(apiKeyAuditLogger);

// request parsing middleware
app.use(express.json({ limit: '50mb' }));

// extended: false -> use querystring instead of qs library to parse urlencoded
// query string removes ? ex: ?a=b will be {a: b} does not parse nested objects:
// ?person[name]=bobby&person[age]=3 will be { 'person[age]': '3',
// 'person[name]': 'bobby' } see https://stackoverflow.com/questions/29960764/what-does-extended-mean-in-express-4-0
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(cookieParser());

// compress all responses
app.use(compression());

// serve swagger docs
// only serve complete api docs in development
// always serve public api docs
if (!['production', 'test'].includes(config.get('mode'))) {
  // mount swagger ui
  try {
    const swaggerDevFile = JSON.parse(fs.readFileSync('./swagger_output.json'));
    app.use('/doc/dev', swaggerUi.serveFiles(swaggerDevFile), swaggerUi.setup(swaggerDevFile));
  } catch (e) {
    console.warn('Unable to load "./swagger_output.json". Run "npm run swagger" to generate the file.');
  }
}
try {
  const swaggerPublicFile = JSON.parse(fs.readFileSync('./swagger_public.json'));
  app.use('/doc', swaggerUi.serveFiles(swaggerPublicFile), swaggerUi.setup(swaggerPublicFile));
  // endpoint to download the swagger spec
  app.get('/spec.json', (req, res) => {
    res.download('./swagger_public.json', 'biobank-api-spec.json');
  });
} catch (e) {
  console.warn('Unable to load "./swagger_public.json". Run "npm run swagger" to generate the file.');
}

// mount router
app.use('/', indexRouter);

// handle unknown routes
app.use(notFound);

// handle prisma errors
app.use(prismaNotFoundHandler);
app.use(prismaConstraintFailedHandler);

// handle assertions errors and send 400
app.use(assertionErrorHandler);

// handle conflict errors
app.use(conflictErrorHandler);

// handle axios errors
app.use(axiosErrorHandler);

// pass any unhandled errors to the error handler
app.use(errorHandler);

module.exports = app;
