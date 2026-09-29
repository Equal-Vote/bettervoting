import fs from 'fs';

// Load the generated schema
const schemaPath = './dist/schema.json';
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));

// Function to recursively replace $ref values
function replaceRefs(obj) {
  if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (key === '$ref' && typeof obj[key] === 'string') {
        obj[key] = obj[key].replace('#/definitions/', '#/components/schemas/');
      } else {
        replaceRefs(obj[key]);
      }
    }
  }
}

// Replace $ref paths
replaceRefs(schema);

// Move definitions to components.schemas
schema.components = schema.components || {};
schema.components.schemas = schema.definitions;
delete schema.definitions;

// Save the updated schema
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

console.log('Schema references updated successfully.');
