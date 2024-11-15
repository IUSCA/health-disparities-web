docker run --rm \
    -v $PWD:/local openapitools/openapi-generator-cli generate \
    -i /local/swagger_public.json \
    -g bash \
    -o /local/out/bash \
    -c /local/clientGenerationConfig.json