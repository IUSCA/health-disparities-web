docker run --rm \
    -v $PWD:/local openapitools/openapi-generator-cli generate \
    -i /local/swagger_public.json \
    -g bash \
    -o /local/clients/bash \
    -c /local/clientGenerationConfig.json