// Auditoria desktop: build otimizado servido pelo `vite preview`, cenário padrão dos mocks.
module.exports = require('./lighthouse/base.cjs')({ preset: 'desktop', outputDir: 'lighthouse/reports/desktop' })
