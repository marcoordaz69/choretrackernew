module.exports = {
  // ... other config options ...
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.mjs'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'react/jsx-runtime': 'react/jsx-runtime.js'
    },
  },
}