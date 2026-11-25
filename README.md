# Monkey C generator

Draw icons and other shapes for Garmin Connect IQ watch faces, and copy them as
Monkey C drawing calls.

**Use it at <https://cedernaes.com/monkey-c-generator/>**

- See your shapes on the watch's own pixel grid, without anti-aliasing, inside a
  round, semi-round or rectangular screen.
- Trace over a reference image, such as a simulator screenshot.
- Copy the code as plain pixels, as helper calls that scale to other screens, or
  as a reusable `drawIcon(dc, x, y, s)` function.

Everything runs in your browser. Nothing you draw or load is sent to a server.

## Development

Needs Node.js 22.12 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm test
```

## License

[AGPL v3.0](LICENSE)
