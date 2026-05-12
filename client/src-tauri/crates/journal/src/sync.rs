use crate::{EntryMeta, GetEntriesResult, JournalData, JournalError, QueryCondition};

pub struct JournalSyncClient {
    client: reqwest::Client,
    backend_url: String,
}

impl JournalSyncClient {
    pub fn new(client: reqwest::Client, backend_url: String) -> Self {
        Self {
            client,
            backend_url,
        }
    }

    pub async fn get_entries(
        &self,
        page: i64,
        condition: &[QueryCondition],
        auth_token: Option<&str>,
    ) -> Result<GetEntriesResult, JournalError> {
        let condition_json = serde_json::to_string(condition)?;
        let url = format!(
            "{}/api/journal?Action=GetEntries&page={}&condition={}",
            self.backend_url, page, condition_json
        );
        let response = self
            .request(self.client.get(url), auth_token)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(JournalError::Message(format!(
                "Get entries failed with status: {}",
                response.status()
            )));
        }

        let payload = response.json::<serde_json::Value>().await?;
        let message = payload.get("message").cloned().unwrap_or(payload);

        let entries = message["entries"]
            .as_array()
            .ok_or_else(|| JournalError::Message("Missing entries array in response".to_string()))?
            .iter()
            .map(|item| {
                let created_at = item["createdAt"]
                    .as_i64()
                    .ok_or_else(|| JournalError::Message("Missing createdAt".to_string()))?;
                let time = millis_to_datetime(created_at);

                Ok(EntryMeta {
                    id: item["id"]
                        .as_str()
                        .ok_or_else(|| JournalError::Message("Missing id".to_string()))?
                        .to_string(),
                    draft: item["draft"]
                        .as_str()
                        .ok_or_else(|| JournalError::Message("Missing draft".to_string()))?
                        .to_string(),
                    year: i64::from(time.year()),
                    month: i64::from(u8::from(time.month())),
                    day: i64::from(time.day()),
                })
            })
            .collect::<Result<Vec<_>, JournalError>>()?;

        let has_more = message["hasMore"]
            .as_bool()
            .or_else(|| message["has_more"].as_bool())
            .ok_or_else(|| JournalError::Message("Missing hasMore in response".to_string()))?;

        Ok(GetEntriesResult { entries, has_more })
    }

    pub async fn full_sync(
        &self,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        let url = format!("{}/api/journal?Action=FullSync", self.backend_url);
        self.send_json(self.client.get(url), auth_token).await
    }

    pub async fn push(
        &self,
        data: JournalData,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        let url = format!("{}/api/journal?Action=Push", self.backend_url);
        self.send_json_with_timeout(self.client.post(url).json(&data), auth_token)
            .await
    }

    pub async fn pull(
        &self,
        version: i64,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        let url = format!(
            "{}/api/journal?Action=Pull&since={version}",
            self.backend_url
        );
        self.send_json_with_timeout(self.client.get(url), auth_token)
            .await
    }

    async fn send_json(
        &self,
        request: reqwest::RequestBuilder,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        let response = self.request(request, auth_token).send().await?;
        if !response.status().is_success() {
            return Err(JournalError::Message(format!(
                "Request failed with status: {}",
                response.status()
            )));
        }
        Ok(response.json::<serde_json::Value>().await?)
    }

    async fn send_json_with_timeout(
        &self,
        request: reqwest::RequestBuilder,
        auth_token: Option<&str>,
    ) -> Result<serde_json::Value, JournalError> {
        match tokio::time::timeout(
            std::time::Duration::from_secs(5),
            self.send_json(request, auth_token),
        )
        .await
        {
            Ok(result) => result,
            Err(_) => Err(JournalError::Message(
                "Request timeout after 5s".to_string(),
            )),
        }
    }

    fn request(
        &self,
        request: reqwest::RequestBuilder,
        auth_token: Option<&str>,
    ) -> reqwest::RequestBuilder {
        match auth_token.filter(|value| !value.is_empty()) {
            Some(token) => request.header("Onlyquant-Token", token),
            None => request,
        }
    }
}

fn millis_to_datetime(timestamp: i64) -> time::OffsetDateTime {
    time::OffsetDateTime::from_unix_timestamp(timestamp / 1000)
        .unwrap_or(time::OffsetDateTime::UNIX_EPOCH)
}
