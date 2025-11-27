export  const parseFormData = (body: any, files?: { [fieldname: string]: Express.Multer.File[] }) => {
  const parsedBody: any = {}

  Object.keys(body).forEach(key => {
    const value = body[key]
    
    if (value === null || value === undefined) {
      return
    }

    if (typeof value === 'object' && value.constructor && (value.constructor.name === 'File' || Array.isArray(value))) {
      return
    }
    
    const nestedMatch = key.match(/^(\w+)\[(\w+)\]$/)
    if (nestedMatch) {
      const [, parent, child] = nestedMatch
      if (!parsedBody[parent]) {
        parsedBody[parent] = {}
      }
      parsedBody[parent][child] = parseValue(value)
    }
    else if (key.includes('[') && key.includes(']')) {
      const parts = key.match(/(\w+)(?:\[(\w+)\])?(?:\[(\w+)\])?/)
      if (parts) {
        const [, level1, level2, level3] = parts
        
        if (level3) {
          if (!parsedBody[level1]) parsedBody[level1] = {}
          if (!parsedBody[level1][level2]) parsedBody[level1][level2] = {}
          parsedBody[level1][level2][level3] = parseValue(value)
        } else if (level2) {
          if (!parsedBody[level1]) parsedBody[level1] = {}
          parsedBody[level1][level2] = parseValue(value)
        }
      }
    }
    else if (key.endsWith('[]') || /\[\d+\]$/.test(key)) {
      const arrayKey = key.replace(/\[\d*\]$/, '')
      if (!parsedBody[arrayKey]) {
        parsedBody[arrayKey] = []
      }
      parsedBody[arrayKey].push(parseValue(value))
    }
    else {
      parsedBody[key] = parseValue(value)
    }
  })

  if (files) {
    if (files['productImage']) {
      parsedBody.basicInformation = parsedBody.basicInformation || {}
      parsedBody.basicInformation.productImage = `/productImage/${files['productImage'][0].filename}`
    }
    
    if (files['basicInformation[productImage]']) {
      parsedBody.basicInformation = parsedBody.basicInformation || {}
      parsedBody.basicInformation.productImage = `/productImage/${files['basicInformation[productImage]'][0].filename}`
    }

    if (files['basicInformation[insuranceProof]']) {
      parsedBody.basicInformation = parsedBody.basicInformation || {}
      parsedBody.basicInformation.insuranceProof = `/insuranceProof/${files['basicInformation[insuranceProof]'][0].filename}`
      
    }

    // Handle other image fields
    if (files['image']) {
      parsedBody.image = files['image'].map(file => `/images/${file.filename}`)
    }

    if (files['tradeLicences']) {
      parsedBody.tradeLicences = files['tradeLicences'].map(
        file => `/tradeLicences/${file.filename}`
      )
    }

    if (files['proofOwnerId']) {
      parsedBody.proofOwnerId = files['proofOwnerId'].map(
        file => `/proofOwnerId/${file.filename}`
      )
    }
  }

  return parsedBody
}

// Helper to parse values
const parseValue = (value: any): any => {
  // Skip if undefined, null, or empty
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  // Skip if it's not a string (like File objects, arrays, etc.)
  if (typeof value !== 'string') {
    return value
  }

  // Handle boolean strings
  if (value === 'true') return true
  if (value === 'false') return false

  // Handle number strings (only for pure numeric strings)
  const trimmedValue = value.trim()
  if (trimmedValue !== '' && !isNaN(Number(trimmedValue)) && !isNaN(parseFloat(trimmedValue))) {
    return parseFloat(trimmedValue)
  }

  // Handle JSON strings
  if (value.startsWith('{') || value.startsWith('[')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}