#!/bin/bash


read -p 'What is the name of the model you would like a route for? ' model

cp bin/scaffold/api/route.js api/routes/${model}.js
sed -i "s/MODEL/${model}/g" api/routes/${model}.js

sed -i "s/module.exports = router;/router.use('\/${model}', require('.\/${model}')); \\n module.exports = router;/g" api/routes/index.js
