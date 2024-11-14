/* eslint-disable no-restricted-syntax */
/* eslint-disable guard-for-in */
/* eslint-disable no-console */
const fs = require('fs');

// Paths for the input Swagger file and the output file for public routes
const inputSwaggerPath = './swagger_output.json';
const outputSwaggerPath = './swagger_public.json';

// Function to filter routes tagged with "public"
function filterPublicRoutes(swaggerData) {
  const filteredPaths = {};

  // Iterate over all paths in the Swagger JSON
  for (const path in swaggerData.paths) {
    const methods = swaggerData.paths[path];

    // Filter each method within the path based on the "public" tag
    const filteredMethods = {};
    for (const method in methods) {
      const operation = methods[method];
      if (operation.tags && operation.tags.includes('public')) {
        // remove the "public" tag from the operation
        operation.tags = operation.tags.filter((tag) => tag !== 'public');
        filteredMethods[method] = operation;
      }
    }

    // Add path to filteredPaths if it has any "public" tagged methods
    if (Object.keys(filteredMethods).length > 0) {
      filteredPaths[path] = filteredMethods;
    }
  }

  // Return a new Swagger JSON object with only public paths
  return {
    ...swaggerData,
    paths: filteredPaths,
  };
}

// Read the original Swagger JSON file
fs.readFile(inputSwaggerPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading Swagger file:', err);
    return;
  }

  // Parse the Swagger JSON
  let swaggerData;
  try {
    swaggerData = JSON.parse(data);
  } catch (parseError) {
    console.error('Error parsing Swagger JSON:', parseError);
    return;
  }

  // Filter for public routes
  const publicSwaggerData = filterPublicRoutes(swaggerData);

  // Write the filtered public Swagger JSON to a new file
  fs.writeFile(outputSwaggerPath, JSON.stringify(publicSwaggerData, null, 2), (writeErr) => {
    if (writeErr) {
      console.error('Error writing public Swagger file:', writeErr);
    } else {
      console.log(`Successfully created ${outputSwaggerPath} with public routes.`);
    }
  });
});
