# vite-plugin-system

__Note: this plugin requires `vite@^2.0.0`.__

Generate pure systemjs app with vite.

## Usage

```js
// vite.config.js
import system from 'vite-plugin-system'

export default {
  plugins: [
    system()
  ]
}
```

## Options

### `systemPath`

__Default:__ `systemjs/dist/s.min.js`

### `distPath`

__Default:__ `system/s.min.[hash].js`
