#!/bin/bash
SVCNAME=postgres
CONTNAME=biobank-${SVCNAME}
DOCKERDATA=/opt/sca/docker/biobank
LOGDIR=${DOCKERDATA}/logs/${CONTNAME}
CONFDIR=${DOCKERDATA}/conf/${CONTNAME}
APPDIR=${DOCKERDATA}/apps/${CONTNAME}
DATADIR=${DOCKERDATA}/data/${CONTNAME}
HUBNAME=postgres:14.5
NET="biobank-net"
CONT_IP="172.18.0.42"

sudo docker rm -f ${CONTNAME}

sudo docker run -d \
  --restart=always \
  --name=${CONTNAME} \
  --net=${NET} \
  --ip=${CONT_IP} \
  -e POSTGRES_USER=biobankuser \
  -e POSTGRES_PASSWORD=example \
  -e POSTGRES_DB=biobank \
  -v ${DATADIR}:/var/lib/postgresql/data:rw \
  ${HUBNAME}