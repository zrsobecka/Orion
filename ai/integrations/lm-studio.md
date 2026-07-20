# LM Studio integration

LM Studio is Orion's local AI runtime. Rust owns server discovery, model selection, optional authentication, timeouts, and structured chat; each feature owns its prompts and schemas.

## Defaults and overrides

- Default server: `http://127.0.0.1:1234`
- Server override: `ORION_LM_STUDIO_BASE_URL`
- Model override: `ORION_LM_STUDIO_MODEL`
- Optional token: `LM_STUDIO_API_TOKEN`, with `LM_API_TOKEN` as a compatibility fallback

Without an override, Orion uses the first model from `GET /v1/models`. The server must run and the model must support structured output through `POST /v1/chat/completions`.

The integration is product-agnostic. Repository feature discovery requests `reasoning_effort: none` for bounded extraction. Future overview and flow evaluation remain separate consumers and may choose their own reasoning mode.
