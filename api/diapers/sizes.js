// api/diapers/sizes.js
const { diapers } = require('../lib/db');
module.exports = (req, res) => res.json({ sizes: [...new Set(diapers().flatMap(d => d.sizes?.map(s => s.label)||[]))] });
