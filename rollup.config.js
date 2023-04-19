import sass from 'rollup-plugin-sass'
import typescript from 'rollup-plugin-typescript2'
import image from '@rollup/plugin-image'
import css from 'rollup-plugin-import-css'

import pkg from './package.json'

export default {
  input: 'src/index.tsx',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      strict: false
    }
  ],
  plugins: [
    sass({ insert: true }),
    typescript({ objectHashIgnoreUnknownHack: true }),
    image(),
    css()
  ],
  external: ['react', 'react-dom']
}
