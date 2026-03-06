# Citoid

Citoid is a Bun-powered service which locates citation data given a URL, DOI and other persistent identifiers.

[Citoid Documentation on mediawiki.org](https://www.mediawiki.org/wiki/Citoid)

## Quickstart
1. Run `bun install`
2. Run `bun run start -c config.dev.yaml`
3. Open [http://localhost:1970/?doc](http://localhost:1970/?doc#!/Citations/get_api) in your browser

## One-shot CLI (`citoid-local`)
Run locally:

```bash
bun run local --help
bun run local cite bibtex 10.48550/arXiv.1706.03762
```

Run directly from GitHub (no npm publish required):

```bash
bunx github:YOUR_ORG/mediawiki-services-citoid#main citoid-local --help
```

## Packaging & publish
Dry-run package contents:

```bash
bun run pack:dry-run
```

Publish to npm:

```bash
npm publish
```
