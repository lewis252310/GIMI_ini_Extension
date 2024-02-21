const fs = require('fs');
const yaml = require('js-yaml');

const fileYaml = './gimi-ini_extension/syntaxes/gimi_ini.tmLanguage.yaml';
const fileJson = './gimi-ini_extension/syntaxes/gimi_ini.tmLanguage.json';

const Mode_e = {
  JSON_TO_YAML: 'j2y',
  YAML_TO_JSON: 'y2j'
}
const validModes = Object.values(Mode_e);

const mode = process.argv[2];

if (!mode && !validModes.includes(mode)) {
  console.error('Usage: node convertYamlToJson.js <convert_mode>');
  console.error('');
  console.error('Optional arguments:');
  console.error(`  convert_mode     '${Mode_e.YAML_TO_JSON}' for YAML to JSON`);
  console.error(`                   '${Mode_e.JSON_TO_YAML}' for JSON to YAML`);
  process.exit(1);
}

try {
  if (mode === Mode_e.JSON_TO_YAML) {
    const jsonDoc = JSON.parse(fs.readFileSync(fileJson, 'utf8'));
    fs.writeFileSync(fileYaml, yaml.dump(jsonDoc), 'utf8');
    console.log('Converted JSON to YAML successfully!');
  } else if (mode === Mode_e.YAML_TO_JSON) {
    const doc = yaml.load(fs.readFileSync(fileYaml, 'utf8'));
    // console.log(doc.repository.section_TextureOverride.patterns[0].match)
    fs.writeFileSync(fileJson, JSON.stringify(doc, null, 2), 'utf8');
    console.log('Converted YAML to JSON successfully!');
  }
} catch (e) {
  console.error('Error during conversion:', e);
}