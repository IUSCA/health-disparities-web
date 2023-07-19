#!/bin/bash
SUBNET="172.18.0.0/16"
GATEWAY="172.18.0.1"
NAME="biobank-net"
EXP_SUB=$( echo "${SUBNET}" | cut -d '.' -f1,2,3 )

function create {

sudo docker network rm ${NAME}
sudo docker network create ${NAME} --subnet="${SUBNET}" --gateway="${GATEWAY}" \
        --opt com.docker.network.bridge.enable_icc=true \
    --opt com.docker.network.bridge.ip_forward=true \
        --opt com.docker.network.bridge.enable_ip_masquerade=true \
        --opt com.docker.network.bridge.name=dockercbionet \
        --opt com.docker.network.driver.mtu=1500
###     --opt com.docker.network.bridge.host_binding_ipv4=0.0.0.0 \
}
if [[ -z `sudo docker network list | grep ${NAME}` ]]; then
    create
else
    echo "Network ${NAME} already exists!"
fi


