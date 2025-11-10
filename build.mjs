import esbuild from 'esbuild'


await esbuild.build({
entryPoints: ['src/content-script.ts'],
outfile: 'dist/content.js',
format: 'iife',
target: ['chrome100'],
bundle: true,
minify: true,
sourcemap: false,
legalComments: 'none',
treeShaking: true,
logLevel: 'info',
define: {
'process.env.NODE_ENV': '"production"'
},
supported: { 'dynamic-import': false },
drop: ['console'] // 実運用で console を落としたい場合は有効化
})