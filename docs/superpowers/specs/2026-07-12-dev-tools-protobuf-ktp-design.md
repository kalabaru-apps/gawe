# Dev Tools: Protobuf/Hex Inspector + KTP Mock Generator

**Date:** 2026-07-12
**Status:** Approved

## Context

The dev tools toolbox (`src/config/tools.ts`) already covers most "offline-first developer utility" needs (Base64, JSON/data conversion, hashing, JWT decode, regex tester, etc.) but is missing two things a fellow SE colleague raised as gaps:

1. A way to visualize/decode a raw protobuf payload and inspect its bytes as hex.
2. A way to generate mock Indonesian ID (KTP/NIK) data for QA staging tests.

Both fit the existing tool registry pattern: a `ToolDefinition` entry, a self-contained component implementing `ToolProps`, no backend, everything runs client-side.

## Scope

Two new tools, both under the `dev` category:

- `protobuf-inspector` — Protobuf & Hex Inspector
- `ktp-mock-generator` — KTP Mock Generator

Both are fully offline: no network calls, no telemetry, all decoding/generation happens in-browser.

## Tool 1: Protobuf & Hex Inspector

### Input

- Textarea accepting hex (with or without spaces/newlines) or Base64, auto-detected by character set.
- File drop zone accepting arbitrary binary files (`.bin`, `.pb`, or any file — read as raw bytes).
- Optional toggle: "Paste .proto schema" — reveals a second textarea for a `.proto` definition.

### Schemaless decode (default)

A hand-rolled wire-format reader (no dependency) parses the byte buffer:

- Reads tag varints, splits into field number + wire type (0=varint, 1=64-bit, 2=length-delimited, 5=32-bit).
- For length-delimited fields (wire type 2), attempts a recursive sub-message decode first; if that fails structurally, falls back to rendering as UTF-8 string, then raw bytes if not valid UTF-8.
- Produces a collapsible tree: `field <N> (<wiretype>): <value>`, nested messages expandable.
- Malformed input (truncated buffer, invalid varint continuation) surfaces an inline error banner and renders the tree up to the point of failure rather than discarding all output.

### Schema-aware decode (optional)

- When the user provides a `.proto` schema, dynamically import `protobufjs`, parse the schema, and decode the same buffer into named, typed fields per the message definition the user selects (if multiple messages are defined in the schema).
- Falls back to schemaless view if schema parsing fails, with an error shown.

### Hex dump companion panel

- Side panel showing offset | hex bytes | ASCII column, standard hex-dump layout.
- Selecting a node in the decoded tree highlights the corresponding byte range in the hex panel, and vice versa.
- Hex bytes are editable; edits trigger live re-decode of the full tree.

### Testing

- Unit tests for the varint/wire-format decoder: truncated buffer mid-varint, truncated length-delimited payload, deeply nested sub-messages, max-length (5-byte) varints, wire type 3/4 (deprecated groups) rejected gracefully.
- Unit test for hex ↔ bytes ↔ base64 round-trip conversion.

## Tool 2: KTP Mock Generator

### Data model

Generated record fields: NIK, nama, tempat lahir, tanggal lahir, jenis kelamin, golongan darah, alamat (jalan + nomor), RT/RW, kelurahan/desa, kecamatan, agama, status perkawinan, pekerjaan, kewarganegaraan, berlaku hingga.

### NIK generation

Format: `PPKKDDMMYYSSSS` (16 digits), per Kemendagri/Dukcapil NIK structure:

- `PP` — 2-digit province code
- `KK` — 2-digit kabupaten/kota code
- `DD` — day of birth (+40 if gender is female)
- `MM` — month of birth
- `YY` — 2-digit year of birth
- `SSSS` — 4-digit serial, randomized and de-duplicated within a single generation batch

Province and kabupaten/kota codes come from a bundled static dataset (`src/data/wilayah-indonesia.json`, ~500 rows) built from the public Kemendagri wilayah code table, sourced once and vendored offline — no runtime fetch. User can pick a specific province/city or leave it random.

### Other fields

- Name, address street, occupation, religion, marital status generated via `@faker-js/faker` (already a dependency), using Indonesian-appropriate value pools where the `id_ID` locale is thin (e.g. religion, blood type, marital status are custom pools, not faker locale data).
- Kelurahan/kecamatan are templated placeholder names tied to the selected kabupaten/kota (not a real full 3-level wilayah lookup — that dataset was explicitly scoped out for size).

### Output UI

- Batch generation (N records) rendered as a data table (structured fields, sortable/scrollable).
- Row action "Show detail" opens a visual KTP-card-shaped preview (blue card layout matching the real KTP) with:
  - A diagonal **CONTOH / SAMPLE** watermark baked into the rendered output — cannot be toggled off.
  - A generic silhouette placeholder instead of a photo — no real photo upload or face generation, to avoid producing anything that could pass as a real ID.
- Export: JSON and CSV, available both for the full batch (table view) and a single record (detail view).

### Guardrails (why they matter)

This tool generates data shaped like a real government ID. To keep it clearly a QA fixture and not a fraud tool:

- The watermark is not optional and is part of the rendered image/export preview, not just an on-screen overlay easily cropped out — it's baked into the same canvas/DOM used for any "download as image" action if that's added later.
- No real photo capture/upload path exists anywhere in the tool.
- NIK serials are randomized, not sequential/predictable in a way that could collide with real assigned NIKs in a meaningful way (structural validity only, not identity theft risk — there's no way to reverse this into a real person's actual NIK).

### Testing

- Unit tests for NIK generation: date encoding round-trip (including female +40 day offset), valid province/city code lookup against the dataset, serial uniqueness within a batch, leap-year date handling.
- Unit test for CSV/JSON export shape matching the displayed table.

## New Dependency

- `protobufjs` — added to `dependencies`, dynamically imported only when the user opts into schema-aware decode (keeps default bundle light).

## Out of Scope

- Full 3-level wilayah (kecamatan/kelurahan) dataset — too large to vendor for the accuracy gained; kelurahan/kecamatan are templated, not looked up.
- Photo-realistic KTP rendering suitable for printing or passing as a real ID — explicitly avoided (see Guardrails).
- Protobuf encode (JSON/tree → bytes) — this spec covers decode/inspect only; encode could be a future addition if requested.
