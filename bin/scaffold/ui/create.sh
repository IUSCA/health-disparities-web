#!/bin/bash


read -p 'What is the name of the model you would like a store for? ' model

cp bin/scaffold/ui/store.js ui/src/stores/${model}.js
sed -i "s/MODEL/${model}/g" ui/src/stores/${model}.js

read -p 'What is the name of the model you would like a service for? [enter for same as store] ' service

if [[ -z "$service" ]]; then
  service=$model
fi

cp bin/scaffold/ui/service.js ui/src/services/${service}.js
sed -i "s/MODEL/${service}/g" ui/src/services/${service}.js