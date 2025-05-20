RELEASE=$1
if [ -z "$RELEASE" ]; then
  # non-production
  # cSpell: ignore openapitools
  docker run --rm \
      -v "$PWD:/local" \
      openapitools/openapi-generator-cli generate \
        -i /local/swagger_public.json \
        -g bash \
        -o /local/clients/bash \
        -c /local/clientGenerationConfig.json \
  && bash ./postProcessClient.sh
else
  # production
  if [ ! -f ../.env ]; then
    echo "No .env file found in parent directory."
    
    exit 1;
  fi
  source ../.env
  echo "APP_UID:$APP_UID,APP_GID:$APP_GID"
  if [ -z "$APP_UID" ] || [ -z "$APP_GID" ]; then
    echo "APP_UID or APP_GID is not set in the .env file."
    exit 1;
  fi
  sudo docker run --rm \
      -u "${APP_UID}:${APP_GID}" \
      -v "$PWD:/local" \
      openapitools/openapi-generator-cli generate \
        -i /local/swagger_public.json \
        -g bash \
        -o /local/clients/bash \
        -c /local/clientGenerationConfig.json \
  && bash ./postProcessClient.sh
fi

# -i: input OpenAPI specification file
# -g: generator type
# -o: the output directory for the generated code
# -c: a configuration file for customizing code generation