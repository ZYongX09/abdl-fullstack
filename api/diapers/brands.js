// api/diapers/brands.js
const { diapers } = require('../lib/db');
module.exports = (req, res) => res.json({ brands: [...new Set(diapers().map(d => d.brand))] });
