export const parseFormData = (body: any, files?: { [fieldname: string]: Express.Multer.File[] }) => {
  const parsedBody: any = {};

  Object.keys(body).forEach((key) => {
    let value = body[key];

    // 1️⃣ Parse JSON strings for top-level fields
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try { 
        value = JSON.parse(value); 
      } catch {}
    }

    // 2️⃣ Handle nested fields like basicInformation[vehicleName]
    const nestedMatch = key.match(/^(\w+)\[(\w+)\]$/);
    if (nestedMatch) {
      const [, parent, child] = nestedMatch;
      if (!parsedBody[parent]) parsedBody[parent] = {};
      parsedBody[parent][child] = value;
    } else {
      parsedBody[key] = value;
    }
  });

  // 3️⃣ Force nested objects to be objects if still strings
  const objectFields = [
    'basicInformation',
    'technicalInformation',
    'electricHybrid',
    'equipment',
    'extras',
    'colour',
    'seatsAndDoors',
    'energyAndEnvironment',
    'euroStandard',
    'location'
  ];

  objectFields.forEach(field => {
    if (parsedBody[field] && typeof parsedBody[field] === 'string') {
      try {
        parsedBody[field] = JSON.parse(parsedBody[field]);
      } catch {
        parsedBody[field] = {};
      }
    }
  });

  // 4️⃣ Handle file uploads
  if (files) {
    Object.keys(files).forEach((field) => {
      const filePaths = files[field].map(f => `/uploads/${f.filename}`);
      if (field.includes('basicInformation')) {
        parsedBody.basicInformation = parsedBody.basicInformation || {};
        const name = field.match(/\[(\w+)\]/)?.[1] || 'productImage';
        parsedBody.basicInformation[name] = filePaths;
      } else {
        parsedBody[field] = filePaths;
      }
    });
  }

  return parsedBody;
};
// Helper to parse individual values
const parseValue = (value: any): any => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return value

  // Booleans
  if (value === 'true') return true
  if (value === 'false') return false

  // Numbers
  const trimmed = value.trim()
  if (trimmed !== '' && !isNaN(Number(trimmed))) return parseFloat(trimmed)

  // JSON objects or arrays
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}
