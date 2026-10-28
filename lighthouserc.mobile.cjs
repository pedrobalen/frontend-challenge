// Auditoria mobile (perfil padrão do Lighthouse: Moto G Power com throttling de 4G lento).
module.exports = require('./lighthouse/base.cjs')({ preset: 'mobile', outputDir: 'lighthouse/reports/mobile' })
