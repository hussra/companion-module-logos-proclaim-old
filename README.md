# companion-module-logos-proclaim

See [HELP.md](./companion/HELP.md) and [LICENSE](./LICENSE)

Useful references:

- [Proclaim App Command API](https://support.faithlife.com/hc/en-us/articles/4972373093005)
- [Companion 2.x module](https://github.com/Cameron-D/companion-module-faithlife-proclaim) by [Cameron-D](https://github.com/Cameron-D)

Known issues:

- Proclaim currently requires the authentication header name to be capitalized as ProclaimAuthToken - there is
  code in sendAppCommand() which can be removed once Proclaim updates this.
- Proclaim currently returns API responses with the text/html content-type rather than text/plain and text/json
  as appropriate. I think this may be why I had to use Got's .text() method rather than .json(), and manually
  strip the byte order marker, to be able to parse the response containing the authentication token.
