#!/bin/bash

python -m celery \
  -A workers.celery_app worker \
  --loglevel INFO \
  -O fair \
  --pidfile celery_worker.pid \
  --hostname 'biobank-celery-w1@%h' \
  --autoscale 8,3 \
  --queues 'hdw-dev.sca.iu.edu.q'
  # --detach
