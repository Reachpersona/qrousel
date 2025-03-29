// yaml-to-json.js
const fs = require('fs');
const yaml = require('js-yaml');

const inputFile = process.argv[2] || './data/qrdata.yaml'; // Change path

try {
  const yamlData = fs.readFileSync(inputFile, 'utf8');
  const jsonData = yaml.load(yamlData);

  const jsContent = `
const contactsData = ${JSON.stringify(jsonData, null, 2)};

export default contactsData;
  `;

  // Ensure the ./src/data directory exists
  const outputDir = './src/data';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(`${outputDir}/qrdata.js`, jsContent);
  console.log(`${inputFile} converted to ${outputDir}/qrdata.js`);
} catch (error) {
  console.error(`Error converting ${inputFile} to ./src/data/qrdata.js:`, error);
}
