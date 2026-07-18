use std::{env, time::Duration};

use reqwest::blocking::{Client, RequestBuilder};
use serde::Deserialize;
use serde_json::{json, Value};

#[derive(Debug, Deserialize)]
struct ModelsResponse {
    data: Vec<ModelRecord>,
}

#[derive(Debug, Deserialize)]
struct ModelRecord {
    id: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: String,
}

pub struct StructuredChatRequest<'a> {
    pub system_prompt: &'a str,
    pub user_prompt: &'a str,
    pub schema_name: &'a str,
    pub schema: Value,
    pub reasoning_effort: Option<&'a str>,
    pub max_tokens: u32,
}

pub struct StructuredChatResponse {
    pub model: String,
    pub content: String,
}

fn configured_base_url() -> String {
    env::var("ORION_LM_STUDIO_BASE_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:1234".to_string())
        .trim_end_matches('/')
        .to_string()
}

fn authenticate(request: RequestBuilder) -> RequestBuilder {
    let token = env::var("LM_STUDIO_API_TOKEN")
        .or_else(|_| env::var("LM_API_TOKEN"))
        .ok();
    match token.filter(|value| !value.trim().is_empty()) {
        Some(token) => request.bearer_auth(token),
        None => request,
    }
}

fn client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(4))
        .timeout(Duration::from_secs(180))
        .build()
        .map_err(|error| format!("Could not prepare the LM Studio connection: {error}"))
}

fn select_model(client: &Client, base_url: &str) -> Result<String, String> {
    let response = authenticate(client.get(format!("{base_url}/v1/models")))
        .send()
        .map_err(|_| {
            "Could not reach LM Studio. Start its local server in the Developer tab and retry."
                .to_string()
        })?;
    let status = response.status();
    let body = response
        .text()
        .map_err(|error| format!("Could not read the LM Studio model list: {error}"))?;
    if !status.is_success() {
        return Err(format!(
            "LM Studio rejected the model list request (HTTP {}). Check its server authentication settings.",
            status.as_u16()
        ));
    }
    let models: ModelsResponse = serde_json::from_str(&body)
        .map_err(|error| format!("LM Studio returned an invalid model list: {error}"))?;
    if let Ok(configured) = env::var("ORION_LM_STUDIO_MODEL") {
        let configured = configured.trim();
        if !configured.is_empty() && models.data.iter().any(|model| model.id == configured) {
            return Ok(configured.to_string());
        }
        if !configured.is_empty() {
            return Err(format!(
                "The configured LM Studio model '{configured}' is not available. Load it or update ORION_LM_STUDIO_MODEL."
            ));
        }
    }
    models
        .data
        .into_iter()
        .map(|model| model.id)
        .find(|id| !id.trim().is_empty())
        .ok_or_else(|| {
            "LM Studio has no available model. Download or load a model and retry.".to_string()
        })
}

pub fn structured_chat(
    request: StructuredChatRequest<'_>,
) -> Result<StructuredChatResponse, String> {
    let client = client()?;
    let base_url = configured_base_url();
    let model = select_model(&client, &base_url)?;
    let mut payload = json!({
        "model": model,
        "messages": [
            { "role": "system", "content": request.system_prompt },
            { "role": "user", "content": request.user_prompt }
        ],
        "response_format": {
            "type": "json_schema",
            "json_schema": {
                "name": request.schema_name,
                "strict": true,
                "schema": request.schema
            }
        },
        "temperature": 0.1,
        "max_tokens": request.max_tokens,
        "stream": false
    });
    if let Some(reasoning_effort) = request.reasoning_effort {
        payload["reasoning_effort"] = json!(reasoning_effort);
    }
    let response = authenticate(client.post(format!("{base_url}/v1/chat/completions")))
        .json(&payload)
        .send()
        .map_err(|error| {
            if error.is_timeout() {
                "LM Studio did not finish the analysis within three minutes. Try a smaller or faster model."
                    .to_string()
            } else {
                "The LM Studio analysis request failed. Check that its server and selected model are running."
                    .to_string()
            }
        })?;
    let status = response.status();
    let body = response
        .text()
        .map_err(|error| format!("Could not read the LM Studio response: {error}"))?;
    if !status.is_success() {
        let detail = serde_json::from_str::<Value>(&body).ok().and_then(|value| {
            value
                .pointer("/error/message")
                .or_else(|| value.get("message"))
                .and_then(Value::as_str)
                .map(str::trim)
                .filter(|message| !message.is_empty())
                .map(|message| message.chars().take(300).collect::<String>())
        });
        return Err(format!(
            "LM Studio could not complete the structured request (HTTP {}).{}",
            status.as_u16(),
            detail
                .map(|message| format!(" {message}"))
                .unwrap_or_else(|| {
                    " The selected model may not support structured output.".to_string()
                })
        ));
    }
    let chat: ChatResponse = serde_json::from_str(&body)
        .map_err(|error| format!("LM Studio returned an invalid chat response: {error}"))?;
    let content = chat
        .choices
        .first()
        .map(|choice| choice.message.content.trim())
        .filter(|content| !content.is_empty())
        .ok_or_else(|| "LM Studio returned an empty response.".to_string())?;
    Ok(StructuredChatResponse {
        model,
        content: content.to_string(),
    })
}
