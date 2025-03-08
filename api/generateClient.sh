docker run --rm \
    -v $PWD:/local \
    openapitools/openapi-generator-cli generate \
      -i /local/swagger_public.json \
      -g bash \
      -o /local/clients/bash \
      -c /local/clientGenerationConfig.json

# -i: input OpenAPI specification file
# -g: generator type
# -o: the output directory for the generated code
# -c: a configuration file for customizing code generation