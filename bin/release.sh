#!/bin/bash

echo "Updating UI..."
cd ui
npm install
npm run build
if [ ! -f .cert/cert.pem ]; then
    echo "Generating fresh cert..."
    mkdir -p .cert
    openssl req -subj '/CN=localhost' -x509 -newkey rsa:4096 -nodes -keyout ./.cert/key.pem -out ./.cert/cert.pem 
    cd ..
fi

echo "Updating api..."
cd ../api
if [ ! -f "keys/auth.key" ]; then
    echo "Generating fresh key..."
    cd keys
    ./genkey.sh
    cd ..
fi
npm install

cd ..

pm2 start pm2.yml --time
