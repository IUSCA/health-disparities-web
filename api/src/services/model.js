const { Prisma } = require('@prisma/client');   
   
  
const getFieldsWithType = (model_name) => {
   // Get the metadata for all models
    const models = Prisma.dmmf.datamodel.models;

    // Find the specific model
    const model = models.find(m => m.name === model_name);

    // If it's not empty return the fields as an object
    if (model) {
      const fields = model.fields.reduce((acc, field) => {
        acc[field.name] = field.type
        return acc;
      }, {});
      // console.log(`fields = ${JSON.stringify(fields)}`)

      return fields
    } 

    return null
}

const getFields = (model_name) => {
  // Get the metadata for all models
  const models = Prisma.dmmf.datamodel.models;

  // Find the specific model
  const model = models.find(m => m.name === model_name);

  // If it's not empty return the fields as an array
  if (model) 
    return model.fields.map(field => field.name);

  
  return null
}

const getMetadata = (model_name) => {
  let data = {}
  let metaData = getFieldsWithType(model_name);
  console.log(metaData)
  data.fields = []
  for(let field of Object.keys(metaData)) {
    if(metaData[field] === 'Int' || metaData[field] === 'String' || metaData[field] === 'DateTime' || metaData[field] === 'Decimal' || metaData[field] === 'Boolean') {
      data.fields.push(`${field}`)
    } else {
      let subMetaData = getFieldsWithType(`${metaData[field]}`)
      // console.log('submetadata', subMetaData)
      data[metaData[field]] = []
      for(let subfield of Object.keys(subMetaData)) {
        if(subMetaData[subfield] === 'Int' || subMetaData[subfield] === 'String' || subMetaData[subfield] === 'DateTime' || subMetaData[subfield] === 'Decimal') {
          data[metaData[field]].push(`${subfield}`)
        }
      }
    }
  }
  
  return data
}

const getRelationships = (model_name) => {
  let data = {}
  let metaData = getFieldsWithType(model_name);

  data = []
  for(let field of Object.keys(metaData)) {
    if(metaData[field] !== 'Int' && metaData[field] !== 'String' && metaData[field] !== 'DateTime' && metaData[field] !== 'Decimal' && metaData[field] !== 'Boolean') {
      data.push(metaData[field])
    }
  }

  return data
}

const getMetadataAsSelect = (model_name, exclude = []) => {
  let data = {}
  let metaData = getFieldsWithType(model_name);

  for(let field of Object.keys(metaData)) {
    if(metaData[field] === 'Int' || metaData[field] === 'String' || metaData[field] === 'DateTime' || metaData[field] === 'Decimal') {
      if(!exclude.includes(field))
        data[field] = true
    } else {
      let subMetaData = getFieldsWithType(`${metaData[field]}`)
      // console.log('submetadata', subMetaData)
      data[field] = {select: {}}
      for(let subfield of Object.keys(subMetaData)) {
        if(subMetaData[subfield] === 'Int' || subMetaData[subfield] === 'String' || subMetaData[subfield] === 'DateTime' || subMetaData[subfield] === 'Decimal') {
          if(!exclude.includes(subfield))
            data[field]['select'][subfield] = true
        }
      }
    }
  }
  
  return data
}


module.exports = {
  getFieldsWithType,
  getFields,
  getMetadata,
  getMetadataAsSelect,
  getRelationships
};