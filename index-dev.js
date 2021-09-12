process.env.NODE_APP_PATH = __dirname
require('@babel/register')({
  // Find babel.config.js up the folder structure.
  rootMode: 'upward',
  plugins: [
    [
      'babel-plugin-module-resolver',
      {
        root: ['./src'],
        alias: { '@': './src' }
      }
    ]
  ],
  ignore: ['node_modules']
})
require('./src/init')
