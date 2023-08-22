#!/bin/bash
SVCNAME=typesense
CONTNAME=biobank-${SVCNAME}
DOCKERDATA=/opt/sca/docker/biobank
LOGDIR=${DOCKERDATA}/logs/${CONTNAME}
CONFDIR=${DOCKERDATA}/conf/${CONTNAME}
APPDIR=${DOCKERDATA}/apps/${CONTNAME}
DATADIR=${DOCKERDATA}/data/${CONTNAME}
HUBNAME=typesense/typesense:0.24.1
NET="biobank-net"
CONT_IP="172.18.0.44"

sudo docker rm -f ${CONTNAME}

sudo docker run -d \
  --restart=always \
  --name=${CONTNAME} \
  --net=${NET} \
  --ip=${CONT_IP} \
  -v ${DATADIR}:/data\
  ${HUBNAME}