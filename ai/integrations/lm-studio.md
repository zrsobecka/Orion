# LM Studio integration

LM Studio is Orion's local AI runtime. The Rust integration owns server discovery, model
selection, optional authentication, timeouts, and structured chat requests. Product prompts and
schemas remain inside the feature that uses them.

## Defaults and overrides

- Default server: `http://127.0.0.1:1234`
- Server override: `ORION_LM_STUDIO_BASE_URL`
- Model override: `ORION_LM_STUDIO_MODEL`
- Optional token: `LM_STUDIO_API_TOKEN`, with `LM_API_TOKEN` as a compatibility fallback

Without a model override, Orion uses the first model returned by `GET /v1/models`. LM Studio must
be running and the selected model must support structured output through
`POST /v1/chat/completions`.

The integration is intentionally product-agnostic. Repository feature discovery is its first
consumer and requests `reasoning_effort: none` because it is a bounded extraction task. Future
overview and flow evaluation should remain separate consumers and may choose a reasoning mode
appropriate to their broader evaluation task.
