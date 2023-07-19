#!/bin/bash
SVCNAME=meilisearch
CONTNAME=biobank-${SVCNAME}
DOCKERDATA=/opt/sca/docker/biobank
LOGDIR=${DOCKERDATA}/logs/${CONTNAME}
CONFDIR=${DOCKERDATA}/conf/${CONTNAME}
APPDIR=${DOCKERDATA}/apps/${CONTNAME}
DATADIR=${DOCKERDATA}/data/${CONTNAME}
HUBNAME=getmeili/meilisearch:v1.1
NET="biobank-net"
CONT_IP="172.18.0.43"

sudo docker rm -f ${CONTNAME}

sudo docker run -d \
  --restart=always \
  --name=${CONTNAME} \
  --net=${NET} \
  --ip=${CONT_IP} \
  -e MEILI_HTTP_PAYLOAD_SIZE_LIMIT=10Gb \
  -v ${DATADIR}:/meili_data:rw \
  ${HUBNAME}