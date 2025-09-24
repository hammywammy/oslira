var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/utils/logger.ts
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
function logger(level, message, data, requestId) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}
var init_logger = __esm({
  "src/utils/logger.ts"() {
    __name(generateRequestId, "generateRequestId");
    __name(logger, "logger");
  }
});

// src/utils/response.ts
function createStandardResponse(success, data, error, requestId) {
  return {
    success,
    data,
    error,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "v3.0.0-enterprise-perfect",
    requestId
  };
}
var init_response = __esm({
  "src/utils/response.ts"() {
    __name(createStandardResponse, "createStandardResponse");
  }
});

// src/config/analysis-pipeline.ts
var analysis_pipeline_exports = {};
__export(analysis_pipeline_exports, {
  ANALYSIS_PIPELINE_CONFIG: () => ANALYSIS_PIPELINE_CONFIG
});
var ANALYSIS_PIPELINE_CONFIG;
var init_analysis_pipeline = __esm({
  "src/config/analysis-pipeline.ts"() {
    ANALYSIS_PIPELINE_CONFIG = {
      // Workflow Definitions
      workflows: {
        // Quick assessment only
        micro_only: {
          name: "micro_only",
          description: "Triage and basic analysis only",
          stages: [
            { name: "triage", type: "triage", required: true, model_tier: "economy" },
            {
              name: "light_analysis",
              type: "analysis",
              required: true,
              model_tier: "economy",
              conditions: [{ field: "analysis_type", operator: "==", value: "light" }]
            }
          ]
        },
        // AI-driven conditional execution
        auto: {
          name: "auto",
          description: "AI decides preprocessing based on data quality",
          stages: [
            { name: "context_generation", type: "context", required: true, model_tier: "economy" },
            { name: "triage", type: "triage", required: true, model_tier: "economy" },
            {
              name: "preprocessor",
              type: "preprocessor",
              required: false,
              model_tier: "economy",
              conditions: [
                { field: "triage.data_richness", operator: ">", value: 70 },
                { field: "analysis_type", operator: "==", value: "deep", skip_if_true: false }
              ]
            },
            {
              name: "main_analysis",
              type: "analysis",
              required: true,
              model_tier: "balanced",
              // Default tier
              conditions: [
                {
                  field: "triage.lead_score",
                  operator: ">",
                  value: 70
                  /* upgrade to premium if high score */
                }
              ]
            }
          ]
        },
        // Run everything regardless
        full: {
          name: "full",
          description: "Complete analysis pipeline - all stages",
          stages: [
            { name: "context_generation", type: "context", required: true, model_tier: "economy" },
            { name: "triage", type: "triage", required: true, model_tier: "economy" },
            { name: "preprocessor", type: "preprocessor", required: true, model_tier: "economy" },
            { name: "main_analysis", type: "analysis", required: true, model_tier: "balanced" }
          ]
        }
      },
      // Model Configurations
      models: {
        // Premium Tier Models
        "claude-opus-4.1": {
          name: "claude-opus-4.1",
          provider: "claude",
          intelligence: 100,
          cost_per_1k_in: 15,
          cost_per_1k_out: 75,
          max_context: 2e5,
          api_format: "claude_messages",
          backup: "gpt-5"
        },
        "gpt-5": {
          name: "gpt-5",
          provider: "openai",
          intelligence: 96,
          cost_per_1k_in: 1.25,
          cost_per_1k_out: 10,
          max_completion_tokens: 128e3,
          api_format: "gpt5_responses",
          backup: "claude-sonnet-4"
        },
        // Balanced Tier Models
        "claude-sonnet-4": {
          name: "claude-sonnet-4",
          provider: "claude",
          intelligence: 90,
          cost_per_1k_in: 3,
          cost_per_1k_out: 15,
          max_context: 2e5,
          api_format: "claude_messages",
          backup: "gpt-4o"
        },
        "gpt-4o": {
          name: "gpt-4o",
          provider: "openai",
          intelligence: 88,
          cost_per_1k_in: 2.5,
          cost_per_1k_out: 10,
          max_context: 128e3,
          api_format: "gpt_chat"
        },
        // Economy Tier Models
        "gpt-5-nano": {
          name: "gpt-5-nano",
          provider: "openai",
          intelligence: 64,
          cost_per_1k_in: 0.05,
          cost_per_1k_out: 0.4,
          max_completion_tokens: 64e3,
          api_format: "gpt5_responses",
          backup: "gpt-5-mini"
        },
        "gpt-5-mini": {
          name: "gpt-5-mini",
          provider: "openai",
          intelligence: 80,
          cost_per_1k_in: 0.25,
          cost_per_1k_out: 2,
          max_completion_tokens: 64e3,
          api_format: "gpt5_responses"
        }
      },
      // Analysis Type to Model Mappings
      analysis_mappings: {
        triage: {
          premium: "gpt-5-nano",
          balanced: "gpt-5-nano",
          economy: "gpt-5-nano"
        },
        preprocessor: {
          premium: "gpt-5-mini",
          balanced: "gpt-5-mini",
          economy: "gpt-5-nano"
        },
        light: {
          premium: "gpt-5",
          balanced: "gpt-4o",
          economy: "gpt-5-mini"
        },
        deep: {
          premium: "claude-opus-4.1",
          balanced: "gpt-5",
          economy: "claude-sonnet-4"
        },
        xray: {
          premium: "claude-opus-4.1",
          balanced: "claude-sonnet-4",
          economy: "gpt-5"
        },
        context: {
          premium: "gpt-5-mini",
          balanced: "gpt-5-mini",
          economy: "gpt-5-nano"
        }
      },
      // Default Settings
      defaults: {
        workflow: "auto",
        model_tier: "balanced",
        max_retries: 3,
        timeout_ms: 3e4
      }
    };
  }
});

// src/utils/helpers.ts
async function fetchJson(url, options, timeoutMs = 1e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return {};
    }
    const responseText = await response.text();
    if (!responseText.trim()) {
      return {};
    }
    return JSON.parse(responseText);
  } finally {
    clearTimeout(timeoutId);
  }
}
async function callWithRetry(url, options, retries = 3, delay = 1e3, timeoutMs = 3e4) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {};
        }
        const responseText = await res.text();
        if (!responseText.trim()) {
          return {};
        }
        return JSON.parse(responseText);
      } catch (error) {
        if (attempt === retries || error.name === "AbortError") {
          throw error;
        }
        logger("warn", `Retry attempt ${attempt}/${retries} failed`, { url, error: error.message });
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }
  throw new Error(`All ${retries} attempts failed for ${url}`);
}
var init_helpers = __esm({
  "src/utils/helpers.ts"() {
    init_logger();
    __name(fetchJson, "fetchJson");
    __name(callWithRetry, "callWithRetry");
  }
});

// src/services/aws-secrets-manager.ts
function logger2(level, message, data) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = { timestamp, level, message, ...data };
  console.log(JSON.stringify(logData));
}
function getAWSSecretsManager(env) {
  if (!awsSecretsInstance) {
    awsSecretsInstance = new AWSSecretsManager2(env);
  }
  return awsSecretsInstance;
}
var AWSSecretsManager2, awsSecretsInstance;
var init_aws_secrets_manager = __esm({
  "src/services/aws-secrets-manager.ts"() {
    __name(logger2, "logger");
    AWSSecretsManager2 = class {
      static {
        __name(this, "AWSSecretsManager");
      }
      accessKeyId;
      secretAccessKey;
      region;
      constructor(env) {
        console.log("AWSSecretsManager constructor called with env type:", typeof env);
        console.log("Env keys available:", Object.keys(env));
        try {
          this.accessKeyId = env.AWS_ACCESS_KEY_ID;
          console.log("Access Key ID retrieved:", !!this.accessKeyId);
        } catch (e) {
          console.error("Failed to get AWS_ACCESS_KEY_ID:", e);
          throw new Error(`Cannot access AWS_ACCESS_KEY_ID: ${e}`);
        }
        try {
          this.secretAccessKey = env.AWS_SECRET_ACCESS_KEY;
          console.log("Secret Access Key retrieved:", !!this.secretAccessKey);
        } catch (e) {
          console.error("Failed to get AWS_SECRET_ACCESS_KEY:", e);
          throw new Error(`Cannot access AWS_SECRET_ACCESS_KEY: ${e}`);
        }
        this.region = env.AWS_REGION || "us-east-1";
        console.log("Region set to:", this.region);
        if (!this.accessKeyId || !this.secretAccessKey) {
          throw new Error(`AWS credentials not configured - Access Key: ${!!this.accessKeyId}, Secret Key: ${!!this.secretAccessKey}`);
        }
        console.log("AWS credentials successfully configured");
      }
      async getSecret(secretName) {
        try {
          const response = await this.makeAWSRequest("GetSecretValue", {
            SecretId: `Oslira/${secretName}`,
            VersionStage: "AWSCURRENT"
          });
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AWS API error: ${response.status} - ${errorText}`);
          }
          const data = await response.json();
          if (!data.SecretString) {
            throw new Error("Secret has no string value");
          }
          const secretValue = JSON.parse(data.SecretString);
          logger2("info", "Retrieved secret from AWS Secrets Manager", {
            secretName,
            version: secretValue.version,
            rotatedBy: secretValue.rotatedBy
          });
          return secretValue.apiKey;
        } catch (error) {
          logger2("error", "Failed to retrieve secret from AWS", {
            secretName,
            error: error.message
          });
          throw new Error(`AWS Secrets retrieval failed: ${error.message}`);
        }
      }
      async putSecret(secretName, secretValue, rotatedBy = "manual") {
        try {
          const payload = {
            SecretId: `Oslira/${secretName}`,
            SecretString: JSON.stringify({
              apiKey: secretValue,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              version: `v${Date.now()}`,
              rotatedBy
            })
          };
          const response = await this.makeAWSRequest("PutSecretValue", payload);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AWS API error: ${response.status} - ${errorText}`);
          }
          logger2("info", "Successfully updated secret in AWS", {
            secretName,
            rotatedBy
          });
        } catch (error) {
          logger2("error", "Failed to store secret in AWS", {
            secretName,
            error: error.message
          });
          throw new Error(`AWS Secrets storage failed: ${error.message}`);
        }
      }
      async createSecret(secretName, secretValue, description) {
        try {
          const payload = {
            Name: `Oslira/${secretName}`,
            Description: description,
            SecretString: JSON.stringify({
              apiKey: secretValue,
              createdAt: (/* @__PURE__ */ new Date()).toISOString(),
              version: "v1",
              rotatedBy: "initial_setup"
            })
          };
          const response = await this.makeAWSRequest("CreateSecret", payload);
          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes("already exists")) {
              logger2("info", "Secret exists, updating instead", { secretName });
              await this.putSecret(secretName, secretValue, "migration");
              return;
            }
            throw new Error(`AWS API error: ${response.status} - ${errorText}`);
          }
          logger2("info", "Successfully created secret in AWS", { secretName });
        } catch (error) {
          logger2("error", "Failed to create secret in AWS", {
            secretName,
            error: error.message
          });
          throw new Error(`AWS Secrets creation failed: ${error.message}`);
        }
      }
      async listSecrets() {
        try {
          const response = await this.makeAWSRequest("ListSecrets", {
            Filters: [
              {
                Key: "name",
                Values: ["Oslira/"]
              }
            ],
            MaxResults: 20
          });
          if (!response.ok) {
            throw new Error(`AWS API error: ${response.status}`);
          }
          const data = await response.json();
          const secretNames = data.SecretList?.map(
            (secret) => secret.Name.replace("Oslira/", "")
          ) || [];
          logger2("info", "Listed AWS secrets", { count: secretNames.length });
          return secretNames;
        } catch (error) {
          logger2("error", "Failed to list AWS secrets", { error: error.message });
          return [];
        }
      }
      async enableRotation(secretName, lambdaArn) {
        try {
          const payload = {
            SecretId: `Oslira/${secretName}`,
            RotationLambdaARN: lambdaArn,
            RotationRules: {
              ScheduleExpression: "rate(7 days)",
              // Weekly rotation
              Duration: "PT30M"
              // 30 minutes rotation window
            }
          };
          const response = await this.makeAWSRequest("RotateSecret", payload);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AWS API error: ${response.status} - ${errorText}`);
          }
          logger2("info", "Enabled rotation for secret", { secretName, lambdaArn });
        } catch (error) {
          logger2("error", "Failed to enable rotation", {
            secretName,
            error: error.message
          });
          throw error;
        }
      }
      async makeAWSRequest(action, payload) {
        const endpoint = `https://secretsmanager.${this.region}.amazonaws.com/`;
        const headers = await this.createAuthHeaders(action, JSON.stringify(payload));
        return fetch(endpoint, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/x-amz-json-1.1",
            "X-Amz-Target": `secretsmanager.${action}`
          },
          body: JSON.stringify(payload)
        });
      }
      async createAuthHeaders(action, payload) {
        const now = /* @__PURE__ */ new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
        const dateStamp = amzDate.substr(0, 8);
        const canonicalHeaders = [
          `host:secretsmanager.${this.region}.amazonaws.com`,
          `x-amz-date:${amzDate}`,
          `x-amz-target:secretsmanager.${action}`
        ].join("\n");
        const signedHeaders = "host;x-amz-date;x-amz-target";
        const payloadHash = await this.sha256(payload);
        const canonicalRequest = [
          "POST",
          "/",
          "",
          canonicalHeaders,
          "",
          signedHeaders,
          payloadHash
        ].join("\n");
        const algorithm = "AWS4-HMAC-SHA256";
        const credentialScope = `${dateStamp}/${this.region}/secretsmanager/aws4_request`;
        const stringToSign = [
          algorithm,
          amzDate,
          credentialScope,
          await this.sha256(canonicalRequest)
        ].join("\n");
        const signature = await this.calculateSignature(stringToSign, dateStamp);
        const authorization = [
          `${algorithm} Credential=${this.accessKeyId}/${credentialScope}`,
          `SignedHeaders=${signedHeaders}`,
          `Signature=${signature}`
        ].join(", ");
        return {
          "Authorization": authorization,
          "X-Amz-Date": amzDate,
          "X-Amz-Target": `secretsmanager.${action}`
        };
      }
      async calculateSignature(stringToSign, dateStamp) {
        const kDate = await this.hmac(`AWS4${this.secretAccessKey}`, dateStamp);
        const kRegion = await this.hmac(kDate, this.region);
        const kService = await this.hmac(kRegion, "secretsmanager");
        const kSigning = await this.hmac(kService, "aws4_request");
        const signature = await this.hmac(kSigning, stringToSign);
        return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
      async hmac(key, data) {
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          typeof key === "string" ? new TextEncoder().encode(key) : key,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
      }
      async sha256(data) {
        const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    };
    awsSecretsInstance = null;
    __name(getAWSSecretsManager, "getAWSSecretsManager");
  }
});

// src/services/enhanced-config-manager.ts
function logger3(level, message, data, requestId) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}
function getEnhancedConfigManager(env) {
  if (!enhancedConfigManager) {
    enhancedConfigManager = new EnhancedConfigManager(env);
  }
  return enhancedConfigManager;
}
async function getApiKey(keyName2, env) {
  const manager = getEnhancedConfigManager(env);
  return await manager.getConfig(keyName2);
}
var EnhancedConfigManager, enhancedConfigManager;
var init_enhanced_config_manager = __esm({
  "src/services/enhanced-config-manager.ts"() {
    init_helpers();
    init_aws_secrets_manager();
    __name(logger3, "logger");
    EnhancedConfigManager = class {
      constructor(env) {
        this.env = env;
        console.log("EnhancedConfigManager env keys:", Object.keys(env));
        console.log("AWS vars check:", {
          AWS_ACCESS_KEY_ID: typeof env.AWS_ACCESS_KEY_ID,
          AWS_SECRET_ACCESS_KEY: typeof env.AWS_SECRET_ACCESS_KEY,
          values: {
            accessKey: env.AWS_ACCESS_KEY_ID?.substring(0, 4) + "...",
            secretKey: env.AWS_SECRET_ACCESS_KEY?.substring(0, 4) + "..."
          }
        });
        try {
          this.awsSecrets = getAWSSecretsManager(env);
          logger3("info", "AWS Secrets Manager initialized successfully");
        } catch (error) {
          logger3("error", "AWS Secrets Manager initialization failed", {
            error: error.message,
            hasAccessKey: !!env.AWS_ACCESS_KEY_ID,
            hasSecretKey: !!env.AWS_SECRET_ACCESS_KEY,
            region: env.AWS_REGION
          });
          this.awsSecrets = null;
        }
      }
      static {
        __name(this, "EnhancedConfigManager");
      }
      cache = /* @__PURE__ */ new Map();
      CACHE_TTL = 5 * 60 * 1e3;
      // 5 minutes
      awsSecrets;
      // Keys that should be stored in AWS Secrets Manager
      AWS_MANAGED_KEYS = [
        "OPENAI_API_KEY",
        "CLAUDE_API_KEY",
        "APIFY_API_TOKEN",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "SUPABASE_SERVICE_ROLE",
        "SUPABASE_ANON_KEY"
      ];
      async getConfig(keyName2) {
        const cached = this.cache.get(keyName2);
        if (cached && cached.expires > Date.now()) {
          logger3("info", `Config cache hit for ${keyName2}`, { source: cached.source });
          return cached.value;
        }
        try {
          let value = "";
          let source = "env";
          if (this.AWS_MANAGED_KEYS.includes(keyName2) && this.awsSecrets) {
            try {
              value = await this.awsSecrets.getSecret(keyName2);
              source = "aws";
              logger3("info", `Retrieved ${keyName2} from AWS Secrets Manager`);
            } catch (awsError) {
              logger3("warn", `AWS retrieval failed for ${keyName2}, trying Supabase fallback`, {
                error: awsError.message
              });
              value = await this.getFromSupabase(keyName2);
              source = "supabase";
            }
          } else {
            try {
              value = await this.getFromSupabase(keyName2);
              source = "supabase";
            } catch (supabaseError) {
              logger3("warn", `Supabase retrieval failed for ${keyName2}, trying environment`, {
                error: supabaseError.message
              });
              value = this.env[keyName2] || "";
              source = "env";
            }
          }
          if (!value) {
            logger3("error", `No value found for config key: ${keyName2}`);
            return "";
          }
          this.cache.set(keyName2, {
            value,
            expires: Date.now() + this.CACHE_TTL,
            source
          });
          logger3("info", `Config retrieved successfully`, { keyName: keyName2, source });
          logger3("info", "Config retrieved with details", {
            keyName: keyName2,
            source,
            hasValue: !!value,
            valueLength: value?.length || 0,
            valuePrefix: value?.substring(0, 10) || "NONE",
            isValidOpenAIFormat: value?.startsWith("sk-") || false
          });
          return value;
        } catch (error) {
          logger3("error", `Failed to retrieve config for ${keyName2}`, { error: error.message });
          const envValue = this.env[keyName2] || "";
          if (envValue) {
            logger3("info", `Using environment fallback for ${keyName2}`);
            return envValue;
          }
          return "";
        }
      }
      async updateConfig(keyName2, newValue2, updatedBy = "system") {
        try {
          if (this.AWS_MANAGED_KEYS.includes(keyName2) && this.awsSecrets) {
            try {
              await this.awsSecrets.putSecret(keyName2, newValue2, updatedBy);
              logger3("info", `Updated ${keyName2} in AWS Secrets Manager`);
              await this.updateSupabase(keyName2, newValue2, updatedBy);
              logger3("info", `Updated ${keyName2} in Supabase as backup`);
            } catch (awsError) {
              logger3("error", `Failed to update ${keyName2} in AWS, using Supabase only`, {
                error: awsError.message
              });
              await this.updateSupabase(keyName2, newValue2, updatedBy);
            }
          } else {
            await this.updateSupabase(keyName2, newValue2, updatedBy);
            logger3("info", `Updated ${keyName2} in Supabase`);
          }
          this.cache.delete(keyName2);
          await this.notifyConfigChange(keyName2, updatedBy);
        } catch (error) {
          logger3("error", `Failed to update config: ${keyName2}`, { error: error.message });
          throw error;
        }
      }
      async migrateToAWS(keyName2) {
        if (!this.AWS_MANAGED_KEYS.includes(keyName2)) {
          throw new Error(`${keyName2} is not configured for AWS migration`);
        }
        if (!this.awsSecrets) {
          throw new Error("AWS Secrets Manager not available");
        }
        try {
          const currentValue = await this.getFromSupabase(keyName2);
          if (!currentValue) {
            throw new Error(`No value found in Supabase for ${keyName2}`);
          }
          await this.awsSecrets.createSecret(keyName2, currentValue, `Oslira ${keyName2} - migrated from Supabase`);
          logger3("info", `Successfully migrated ${keyName2} to AWS Secrets Manager`);
          this.cache.delete(keyName2);
        } catch (error) {
          logger3("error", `Failed to migrate ${keyName2} to AWS`, { error: error.message });
          throw error;
        }
      }
      async getConfigStatus() {
        const status = {};
        for (const keyName2 of this.AWS_MANAGED_KEYS) {
          try {
            let awsStatus = "not_configured";
            let awsLastUpdated = "N/A";
            if (this.awsSecrets) {
              try {
                const awsValue = await this.awsSecrets.getSecret(keyName2);
                awsStatus = awsValue ? "configured" : "empty";
              } catch {
                awsStatus = "error";
              }
            }
            let supabaseStatus = "not_configured";
            let supabaseLastUpdated = "N/A";
            try {
              const supabaseValue = await this.getFromSupabase(keyName2);
              supabaseStatus = supabaseValue ? "configured" : "empty";
              const configItem = await this.getSupabaseMetadata(keyName2);
              supabaseLastUpdated = configItem?.updated_at || "N/A";
            } catch {
              supabaseStatus = "error";
            }
            const envValue = this.env[keyName2];
            const envStatus = envValue ? "configured" : "not_configured";
            status[keyName2] = {
              aws: {
                status: awsStatus,
                lastUpdated: awsLastUpdated
              },
              supabase: {
                status: supabaseStatus,
                lastUpdated: supabaseLastUpdated
              },
              environment: {
                status: envStatus
              },
              recommended_source: this.AWS_MANAGED_KEYS.includes(keyName2) ? "aws" : "supabase",
              migration_needed: awsStatus !== "configured" && this.AWS_MANAGED_KEYS.includes(keyName2)
            };
          } catch (error) {
            status[keyName2] = {
              error: error.message,
              aws: { status: "error" },
              supabase: { status: "error" },
              environment: { status: "unknown" }
            };
          }
        }
        return status;
      }
      async getFromSupabase(keyName2) {
        const serviceRoleKey = await this.getConfig("SUPABASE_SERVICE_ROLE");
        const headers = {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json"
        };
        const response = await fetchJson(
          `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName2}&environment=eq.production&select=key_value`,
          { headers }
        );
        if (!response.length) {
          return "";
        }
        return this.decryptValue(response[0].key_value);
      }
      async updateSupabase(keyName2, newValue2, updatedBy) {
        const headers = {
          apikey: this.env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
          "Content-Type": "application/json"
        };
        const encryptedValue = this.encryptValue(newValue2);
        await fetchJson(
          `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName2}&environment=eq.production`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              key_value: encryptedValue,
              updated_at: (/* @__PURE__ */ new Date()).toISOString(),
              updated_by: updatedBy
            })
          }
        );
      }
      async getSupabaseMetadata(keyName2) {
        const headers = {
          apikey: this.env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE}`,
          "Content-Type": "application/json"
        };
        const response = await fetchJson(
          `${this.env.SUPABASE_URL}/rest/v1/app_config?key_name=eq.${keyName2}&environment=eq.production&select=*`,
          { headers }
        );
        return response.length > 0 ? response[0] : null;
      }
      async notifyConfigChange(keyName2, updatedBy) {
        try {
          const notificationPromises = [];
          if (this.env.NETLIFY_BUILD_HOOK_URL) {
            notificationPromises.push(
              fetch(this.env.NETLIFY_BUILD_HOOK_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  trigger: "aws_config_update",
                  keyName: keyName2,
                  updatedBy,
                  timestamp: (/* @__PURE__ */ new Date()).toISOString()
                })
              })
            );
          }
          if (this.env.CLOUDFLARE_ZONE_ID && this.env.CLOUDFLARE_API_TOKEN) {
            notificationPromises.push(
              fetch(`https://api.cloudflare.com/client/v4/zones/${this.env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  files: [
                    `${this.env.WORKER_URL || ""}/config`,
                    `${this.env.WORKER_URL || ""}/v1/config`
                  ]
                })
              })
            );
          }
          await Promise.allSettled(notificationPromises);
          logger3("info", "Config change notifications sent", { keyName: keyName2, updatedBy });
        } catch (error) {
          logger3("warn", "Failed to send config change notifications", {
            keyName: keyName2,
            error: error.message
          });
        }
      }
      decryptValue(encryptedValue) {
        try {
          return atob(encryptedValue);
        } catch {
          return encryptedValue;
        }
      }
      encryptValue(value) {
        return btoa(value);
      }
    };
    enhancedConfigManager = null;
    __name(getEnhancedConfigManager, "getEnhancedConfigManager");
    __name(getApiKey, "getApiKey");
  }
});

// src/services/universal-ai-adapter.ts
var universal_ai_adapter_exports = {};
__export(universal_ai_adapter_exports, {
  UniversalAIAdapter: () => UniversalAIAdapter,
  selectModel: () => selectModel
});
function selectModel(stage, modelTier, context) {
  const mapping = ANALYSIS_PIPELINE_CONFIG.analysis_mappings[stage];
  if (!mapping) {
    throw new Error(`No model mapping found for stage: ${stage}`);
  }
  if (context?.triage?.lead_score && context.triage.lead_score > 70 && modelTier === "balanced") {
    return mapping.premium || mapping.balanced;
  }
  return mapping[modelTier];
}
var UniversalAIAdapter;
var init_universal_ai_adapter = __esm({
  "src/services/universal-ai-adapter.ts"() {
    init_analysis_pipeline();
    init_enhanced_config_manager();
    init_logger();
    UniversalAIAdapter = class {
      static {
        __name(this, "UniversalAIAdapter");
      }
      env;
      requestId;
      constructor(env, requestId) {
        this.env = env;
        this.requestId = requestId;
      }
      async executeRequest(request) {
        const modelConfig = ANALYSIS_PIPELINE_CONFIG.models[request.model_name];
        if (!modelConfig) {
          throw new Error(`Unknown model: ${request.model_name}`);
        }
        try {
          return await this.callModel(modelConfig, request);
        } catch (error) {
          logger("warn", `Primary model ${request.model_name} failed, trying backup`, {
            error: error.message,
            requestId: this.requestId
          });
          if (modelConfig.backup) {
            const backupConfig = ANALYSIS_PIPELINE_CONFIG.models[modelConfig.backup];
            if (backupConfig) {
              return await this.callModel(backupConfig, request);
            }
          }
          throw error;
        }
      }
      async callModel(config, request) {
        switch (config.api_format) {
          case "gpt5_responses":
            return await this.callGPT5Responses(config, request);
          case "gpt_chat":
            return await this.callGPTChat(config, request);
          case "claude_messages":
            return await this.callClaudeMessages(config, request);
          default:
            throw new Error(`Unsupported API format: ${config.api_format}`);
        }
      }
      async callGPT5Responses(config, request) {
        const openaiKey = await getApiKey("OPENAI_API_KEY", this.env);
        if (!openaiKey) throw new Error("OpenAI API key not available");
        logger("info", "\u{1F680} GPT-5 Request Starting", {
          model: config.name,
          max_tokens: request.max_tokens,
          has_json_schema: !!request.json_schema,
          response_format: request.response_format,
          temperature: request.temperature,
          requestId: this.requestId
        });
        const body = {
          model: config.name,
          messages: [
            // ✅ CORRECT
            { role: "system", content: request.system_prompt },
            { role: "user", content: request.user_prompt }
          ],
          max_completion_tokens: request.max_tokens,
          // ✅ CORRECT
          ...request.json_schema && {
            response_format: {
              type: "json_schema",
              json_schema: request.json_schema
            }
          }
        };
        logger("info", "\u{1F4E4} GPT-5 Request Body", {
          model: body.model,
          input_length: body.input?.length,
          max_output_tokens: body.max_output_tokens,
          has_response_format: !!body.response_format,
          response_format_type: body.response_format?.type,
          temperature: body.temperature,
          requestId: this.requestId
        });
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        logger("info", "\u{1F4E5} GPT-5 Response Status", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries()),
          requestId: this.requestId
        });
        if (!response.ok) {
          const errorBody = await response.text();
          logger("error", "\u274C GPT-5 API Error Details", {
            status: response.status,
            statusText: response.statusText,
            errorBody,
            requestId: this.requestId
          });
          throw new Error(`GPT-5 API error: ${response.status} - ${errorBody}`);
        }
        const data = await response.json();
        logger("info", "\u2705 GPT-5 Response Success", {
          has_choices: !!data.choices,
          choices_length: data.choices?.length,
          has_usage: !!data.usage,
          first_choice_content_length: data.choices?.[0]?.message?.content?.length,
          usage_tokens: data.usage,
          requestId: this.requestId
        });
        const content = data.choices?.[0]?.message?.content || "";
        const usage = data.usage || {};
        return {
          content,
          usage: {
            input_tokens: usage.prompt_tokens || 0,
            output_tokens: usage.completion_tokens || 0,
            total_cost: this.calculateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0, config)
          },
          model_used: config.name,
          provider: config.provider
        };
      }
      async callClaudeMessages(config, request) {
        const claudeKey = await getApiKey("CLAUDE_API_KEY", this.env);
        if (!claudeKey) throw new Error("Claude API key not available");
        const body = {
          model: config.name,
          system: request.system_prompt,
          messages: [
            { role: "user", content: request.user_prompt }
          ],
          max_tokens: request.max_tokens,
          temperature: request.temperature || 0.7
        };
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": claudeKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }
        const data = await response.json();
        const content = data.content?.[0]?.text || "";
        const usage = data.usage || {};
        return {
          content,
          usage: {
            input_tokens: usage.input_tokens || 0,
            output_tokens: usage.output_tokens || 0,
            total_cost: this.calculateCost(usage.input_tokens || 0, usage.output_tokens || 0, config)
          },
          model_used: config.name,
          provider: config.provider
        };
      }
      calculateCost(inputTokens, outputTokens, config) {
        const inputCost = inputTokens / 1e3 * config.cost_per_1k_in;
        const outputCost = outputTokens / 1e3 * config.cost_per_1k_out;
        return inputCost + outputCost;
      }
    };
    __name(selectModel, "selectModel");
  }
});

// src/test/gpt5-test.ts
var gpt5_test_exports = {};
__export(gpt5_test_exports, {
  testGPT5Direct: () => testGPT5Direct
});
async function testGPT5Direct(env, requestId) {
  console.log("\u{1F9EA} Testing GPT-5 direct API call");
  try {
    const apiKey = await getApiKey("OPENAI_API_KEY", env);
    if (!apiKey) throw new Error("OpenAI API key not available");
    console.log("Testing gpt-5-nano...");
    const response1 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_completion_tokens: 50,
        response_format: { type: "json_object" }
      })
    });
    if (response1.ok) {
      const data1 = await response1.json();
      console.log("\u2705 gpt-5-nano works:", data1);
      return { success: true, model: "gpt-5-nano", data: data1 };
    } else {
      const error1 = await response1.text();
      console.log("\u274C gpt-5-nano failed:", response1.status, error1);
    }
    console.log("Testing gpt-5-mini...");
    const response2 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_completion_tokens: 50,
        response_format: { type: "json_object" }
      })
    });
    if (response2.ok) {
      const data2 = await response2.json();
      console.log("\u2705 gpt-5-mini works:", data2);
      return { success: true, model: "gpt-5-mini", data: data2 };
    } else {
      const error2 = await response2.text();
      console.log("\u274C gpt-5-mini failed:", response2.status, error2);
    }
    console.log("Testing gpt-5...");
    const response3 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_completion_tokens: 50,
        response_format: { type: "json_object" }
      })
    });
    if (response3.ok) {
      const data3 = await response3.json();
      console.log("\u2705 gpt-5 works:", data3);
      return { success: true, model: "gpt-5", data: data3 };
    } else {
      const error3 = await response3.text();
      console.log("\u274C gpt-5 failed:", response3.status, error3);
    }
    console.log("Testing fallback gpt-4o-mini...");
    const response4 = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: 'Say hello in JSON format with a "message" field.' }
        ],
        max_tokens: 50,
        response_format: { type: "json_object" }
      })
    });
    if (response4.ok) {
      const data4 = await response4.json();
      console.log("\u2705 gpt-4o-mini works as fallback:", data4);
      return { success: true, model: "gpt-4o-mini", data: data4, note: "fallback" };
    } else {
      const error4 = await response4.text();
      console.log("\u274C gpt-4o-mini also failed:", response4.status, error4);
      return { success: false, error: "All models failed" };
    }
  } catch (error) {
    console.error("\u{1F9EA} GPT-5 test failed:", error.message);
    return { success: false, error: error.message };
  }
}
var init_gpt5_test = __esm({
  "src/test/gpt5-test.ts"() {
    init_enhanced_config_manager();
    __name(testGPT5Direct, "testGPT5Direct");
  }
});

// src/utils/validation.ts
function extractUsername(input) {
  try {
    const cleaned = input.trim().replace(/^@/, "").toLowerCase();
    if (cleaned.includes("instagram.com")) {
      const url = new URL(cleaned);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      return pathSegments[0] || "";
    }
    return cleaned.replace(/[^a-z0-9._]/g, "");
  } catch {
    return "";
  }
}
function extractHashtags(text) {
  if (!text) return [];
  const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.toLowerCase()) : [];
}
function extractMentions(text) {
  if (!text) return [];
  const mentionRegex = /@[\w.]+/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map((mention) => mention.toLowerCase()) : [];
}
function normalizeRequest(body) {
  const errors = [];
  let profile_url = body.profile_url;
  if (!profile_url && body.username) {
    const username = extractUsername(body.username);
    profile_url = username ? `https://instagram.com/${username}` : "";
  }
  const analysis_type = body.analysis_type || body.type;
  const business_id = body.business_id;
  const user_id = body.user_id;
  if (!profile_url) errors.push("profile_url or username is required");
  if (!analysis_type || !["light", "deep", "xray"].includes(analysis_type)) {
    errors.push('analysis_type must be "light", "deep", or "xray"');
  }
  if (!business_id) errors.push("business_id is required");
  if (!user_id) errors.push("user_id is required");
  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }
  return {
    profile_url,
    username: extractUsername(profile_url),
    analysis_type,
    business_id,
    user_id
  };
}
function validateProfileData(responseData, analysisType) {
  if (!responseData) {
    throw new Error("No response data received from scraper");
  }
  if (typeof responseData !== "object") {
    throw new Error(`Invalid response data type: ${typeof responseData}`);
  }
  if (Array.isArray(responseData) && responseData.length > 0) {
    const profile = responseData[0];
    const hasOnlyUsername = Object.keys(profile).length <= 2 && profile.username && !profile.followersCount;
    if (hasOnlyUsername) {
      throw new Error("PROFILE_NOT_FOUND");
    }
  } else if (!Array.isArray(responseData)) {
    const hasOnlyUsername = Object.keys(responseData).length <= 2 && responseData.username && !responseData.followersCount;
    if (hasOnlyUsername) {
      throw new Error("PROFILE_NOT_FOUND");
    }
  }
  try {
    logger("info", "Starting CORRECTED profile data validation for nested posts structure", {
      analysisType,
      isArray: Array.isArray(responseData),
      length: Array.isArray(responseData) ? responseData.length : "not-array",
      dataType: typeof responseData
    });
    if (analysisType === "deep") {
      let profileItem;
      let posts = [];
      if (Array.isArray(responseData)) {
        profileItem = responseData.find(
          (item) => item.username || item.ownerUsername || item.followersCount !== void 0 && item.postsCount !== void 0 || item.latestPosts !== void 0
        );
        const separatePosts = responseData.filter(
          (item) => item.shortCode && (item.likesCount !== void 0 || item.likes !== void 0)
        );
        if (separatePosts.length > 0) {
          posts = separatePosts;
          logger("info", "Found posts as separate array items", { postsCount: posts.length });
        }
      } else {
        profileItem = responseData;
      }
      if (!profileItem) {
        throw new Error("No profile data found in scraper response");
      }
      if (profileItem.latestPosts && Array.isArray(profileItem.latestPosts) && profileItem.latestPosts.length > 0) {
        posts = profileItem.latestPosts;
        logger("info", "Found posts in nested latestPosts field", {
          nestedPostsCount: posts.length,
          samplePost: posts[0] ? {
            keys: Object.keys(posts[0]),
            shortCode: posts[0].shortCode || posts[0].code,
            likes: posts[0].likesCount || posts[0].likes,
            comments: posts[0].commentsCount || posts[0].comments
          } : "no-sample"
        });
      }
      logger("info", "Profile and posts detection completed", {
        profileFound: !!profileItem,
        postsSource: posts.length > 0 ? profileItem.latestPosts ? "nested_latestPosts" : "separate_array_items" : "none",
        postsCount: posts.length,
        profilePostsCount: profileItem.postsCount,
        latestPostsLength: profileItem.latestPosts?.length || 0
      });
      let engagement;
      if (posts.length > 0) {
        logger("info", "Starting MANUAL ENGAGEMENT CALCULATION with nested posts data");
        const validPosts = posts.filter((post) => {
          const likes = parseInt(String(
            post.likesCount || post.likes || post.like_count || post.likeCount || post.likescount || 0
          )) || 0;
          const comments = parseInt(String(
            post.commentsCount || post.comments || post.comment_count || post.commentCount || post.commentscount || post.commentCounts || 0
          )) || 0;
          const isValid = likes > 0 || comments > 0;
          if (!isValid) {
            logger("warn", "Post filtered out - no engagement data", {
              shortCode: post.shortCode || post.code || post.id,
              availableFields: Object.keys(post),
              rawLikesFields: {
                likesCount: post.likesCount,
                likes: post.likes,
                like_count: post.like_count
              },
              rawCommentsFields: {
                commentsCount: post.commentsCount,
                comments: post.comments,
                comment_count: post.comment_count
              },
              parsedLikes: likes,
              parsedComments: comments
            });
          }
          return isValid;
        });
        logger("info", "Manual calculation - Step 1: Filter valid posts from nested data", {
          totalPosts: posts.length,
          validPosts: validPosts.length,
          filteredOut: posts.length - validPosts.length,
          validPostsSample: validPosts.slice(0, 3).map((post) => ({
            shortCode: post.shortCode || post.code || post.id,
            likes: parseInt(String(post.likesCount || post.likes || post.like_count || 0)) || 0,
            comments: parseInt(String(post.commentsCount || post.comments || post.comment_count || 0)) || 0,
            caption: (post.caption || "").substring(0, 50)
          }))
        });
        if (validPosts.length > 0) {
          let totalLikes = 0;
          let totalComments = 0;
          for (const post of validPosts) {
            const likes = parseInt(String(
              post.likesCount || post.likes || post.like_count || post.likeCount || post.likescount || 0
            )) || 0;
            const comments = parseInt(String(
              post.commentsCount || post.comments || post.comment_count || post.commentCount || post.commentscount || post.commentCounts || 0
            )) || 0;
            totalLikes += likes;
            totalComments += comments;
          }
          logger("info", "Manual calculation - Step 2: Calculate totals from nested posts", {
            totalLikes,
            totalComments,
            validPostsCount: validPosts.length,
            averageLikesCalc: `${totalLikes} / ${validPosts.length} = ${Math.round(totalLikes / validPosts.length)}`,
            averageCommentsCalc: `${totalComments} / ${validPosts.length} = ${Math.round(totalComments / validPosts.length)}`
          });
          const avgLikes = validPosts.length > 0 ? Math.round(totalLikes / validPosts.length) : 0;
          const avgComments = validPosts.length > 0 ? Math.round(totalComments / validPosts.length) : 0;
          const totalEngagement = avgLikes + avgComments;
          const followers = parseInt(String(
            profileItem.followersCount || profileItem.followers || profileItem.follower_count || profileItem.followerscount || 0
          )) || 0;
          const engagementRate = followers > 0 ? Math.round(totalEngagement / followers * 1e4) / 100 : 0;
          logger("info", "Manual calculation - Steps 3-4: Calculate averages and engagement rate", {
            avgLikes,
            avgComments,
            totalEngagement,
            followers,
            followersSource: profileItem.followersCount ? "followersCount" : profileItem.followers ? "followers" : "other",
            engagementRate,
            engagementCalc: `(${totalEngagement} / ${followers}) * 100 = ${engagementRate}%`
          });
          if (avgLikes > 0 || avgComments > 0) {
            engagement = {
              avgLikes,
              avgComments,
              engagementRate,
              totalEngagement,
              postsAnalyzed: validPosts.length
            };
            logger("info", "\u2705 MANUAL ENGAGEMENT CALCULATION SUCCESSFUL with nested posts", {
              postsAnalyzed: engagement.postsAnalyzed,
              avgLikes: engagement.avgLikes,
              avgComments: engagement.avgComments,
              engagementRate: engagement.engagementRate,
              totalEngagement: engagement.totalEngagement,
              dataSource: "nested_latestPosts_field",
              calculationMethod: "manual_from_individual_posts"
            });
          } else {
            logger("error", "\u274C ENGAGEMENT CALCULATION FAILED - All calculated values are zero", {
              avgLikes,
              avgComments,
              totalLikes,
              totalComments,
              validPostsCount: validPosts.length,
              followers,
              debugInfo: "Check if posts have valid engagement data"
            });
          }
        } else {
          logger("error", "\u274C No valid posts with engagement found in nested data", {
            totalPostsInLatestPosts: posts.length,
            samplePostStructures: posts.slice(0, 2).map((post) => ({
              allKeys: Object.keys(post),
              shortCode: post.shortCode || post.code,
              possibleLikesValues: {
                likesCount: post.likesCount,
                likes: post.likes,
                like_count: post.like_count
              },
              possibleCommentsValues: {
                commentsCount: post.commentsCount,
                comments: post.comments,
                comment_count: post.comment_count
              }
            }))
          });
        }
      } else {
        logger("error", "\u274C No posts found in nested latestPosts field", {
          profilePostsCount: profileItem.postsCount,
          latestPostsExists: !!profileItem.latestPosts,
          latestPostsType: Array.isArray(profileItem.latestPosts) ? "array" : typeof profileItem.latestPosts,
          latestPostsLength: profileItem.latestPosts?.length || 0,
          profileKeys: Object.keys(profileItem).slice(0, 20)
        });
      }
      const latestPosts = posts.slice(0, 12).map((post) => {
        const caption = post.caption || post.edge_media_to_caption?.edges?.[0]?.node?.text || post.title || "";
        const hashtags = extractHashtags(caption);
        const mentions = extractMentions(caption);
        return {
          id: post.id || post.shortCode || post.code || post.pk || "",
          shortCode: post.shortCode || post.code || post.pk || "",
          caption,
          likesCount: parseInt(String(post.likesCount || post.likes || post.like_count || 0)) || 0,
          commentsCount: parseInt(String(post.commentsCount || post.comments || post.comment_count || 0)) || 0,
          timestamp: post.timestamp || post.taken_at || post.created_time || (/* @__PURE__ */ new Date()).toISOString(),
          url: post.url || `https://instagram.com/p/${post.shortCode || post.code}/`,
          type: post.type || post.__typename || (post.isVideo ? "video" : "photo"),
          hashtags,
          mentions,
          viewCount: parseInt(String(post.viewCount || post.views || post.video_view_count || 0)) || void 0,
          isVideo: Boolean(post.isVideo || post.type === "video" || post.__typename === "GraphVideo")
        };
      });
      const result = {
        username: (profileItem.username || profileItem.ownerUsername || "").toLowerCase(),
        displayName: profileItem.fullName || profileItem.displayName || profileItem.full_name || "",
        bio: profileItem.biography || profileItem.bio || "",
        followersCount: parseInt(String(profileItem.followersCount || profileItem.followers || 0)) || 0,
        followingCount: parseInt(String(profileItem.followingCount || profileItem.following || 0)) || 0,
        postsCount: parseInt(String(profileItem.postsCount || profileItem.posts || latestPosts.length)) || 0,
        isVerified: Boolean(profileItem.verified || profileItem.isVerified || profileItem.is_verified),
        isPrivate: Boolean(profileItem.private || profileItem.isPrivate || profileItem.is_private),
        profilePicUrl: profileItem.profilePicUrl || profileItem.profilePicture || profileItem.profile_pic_url || "",
        externalUrl: profileItem.externalUrl || profileItem.website || profileItem.external_url || "",
        isBusinessAccount: Boolean(profileItem.isBusinessAccount || profileItem.is_business_account),
        latestPosts,
        engagement
      };
      logger("info", "\u2705 Profile validation completed with nested posts support", {
        username: result.username,
        followers: result.followersCount,
        postsFound: result.latestPosts.length,
        hasRealEngagement: !!result.engagement,
        engagementSummary: result.engagement ? {
          avgLikes: result.engagement.avgLikes,
          avgComments: result.engagement.avgComments,
          engagementRate: result.engagement.engagementRate,
          postsAnalyzed: result.engagement.postsAnalyzed
        } : "NO_ENGAGEMENT_DATA"
      });
      return result;
    } else {
      const profile = Array.isArray(responseData) ? responseData[0] : responseData;
      if (!profile || !profile.username) {
        throw new Error("Invalid profile data received");
      }
      return {
        username: profile.username,
        displayName: profile.fullName || profile.displayName || "",
        bio: profile.biography || profile.bio || "",
        followersCount: parseInt(profile.followersCount?.toString() || "0") || 0,
        followingCount: parseInt(profile.followingCount?.toString() || "0") || 0,
        postsCount: parseInt(profile.postsCount?.toString() || "0") || 0,
        isVerified: Boolean(profile.verified || profile.isVerified),
        isPrivate: Boolean(profile.private || profile.isPrivate),
        profilePicUrl: profile.profilePicUrl || profile.profilePicture || "",
        externalUrl: profile.externalUrl || profile.website || "",
        isBusinessAccount: Boolean(profile.isBusinessAccount),
        latestPosts: [],
        engagement: void 0
      };
    }
  } catch (error) {
    logger("error", "Profile validation failed", {
      error: error.message,
      responseDataType: typeof responseData,
      responseDataKeys: typeof responseData === "object" && responseData ? Object.keys(responseData).slice(0, 20) : "not-object"
    });
    throw new Error(`Profile validation failed: ${error.message}`);
  }
}
function calculateConfidenceLevel(profile, analysisType) {
  let confidence = 50;
  if (profile.dataQuality === "high") confidence += 30;
  else if (profile.dataQuality === "medium") confidence += 15;
  if (profile.isVerified) confidence += 10;
  if ((profile.engagement?.postsAnalyzed || 0) > 0) {
    confidence += 20;
    if ((profile.engagement?.postsAnalyzed || 0) >= 5) confidence += 5;
    if ((profile.engagement?.postsAnalyzed || 0) >= 10) confidence += 5;
  }
  if (analysisType === "deep") confidence += 10;
  if (profile.isPrivate) confidence -= 15;
  return Math.min(95, Math.max(20, confidence));
}
var init_validation = __esm({
  "src/utils/validation.ts"() {
    init_logger();
    __name(extractUsername, "extractUsername");
    __name(extractHashtags, "extractHashtags");
    __name(extractMentions, "extractMentions");
    __name(normalizeRequest, "normalizeRequest");
    __name(validateProfileData, "validateProfileData");
    __name(calculateConfidenceLevel, "calculateConfidenceLevel");
  }
});

// src/services/micro-snapshot.ts
function createMicroSnapshot(profile) {
  const domains = [];
  if (profile.externalUrl) {
    try {
      const url = new URL(profile.externalUrl);
      domains.push(url.hostname.replace("www.", ""));
    } catch {
    }
  }
  const topCaptions = (profile.latestPosts || []).slice(0, 3).map((post) => (post.caption || "").slice(0, 50).trim()).filter((caption) => caption.length > 0);
  const estimatedRecentPosts = profile.followersCount > 0 ? Math.min(profile.postsCount, Math.max(1, Math.floor(profile.postsCount / 12))) : Math.min(profile.postsCount, 10);
  return {
    username: profile.username,
    followers: profile.followersCount,
    verified: profile.isVerified,
    private: profile.isPrivate,
    bio_short: (profile.bio || "").slice(0, 120).trim(),
    // Truncate to 120 chars
    external_domains: domains,
    posts_30d: estimatedRecentPosts,
    top_captions: topCaptions,
    engagement_signals: profile.engagement ? {
      avg_likes: profile.engagement.avgLikes,
      avg_comments: profile.engagement.avgComments,
      posts_analyzed: profile.engagement.postsAnalyzed
    } : null
  };
}
var init_micro_snapshot = __esm({
  "src/services/micro-snapshot.ts"() {
    __name(createMicroSnapshot, "createMicroSnapshot");
  }
});

// src/services/prompts.ts
function getLightAnalysisJsonSchema() {
  return {
    name: "LightAnalysisResult",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: "integer", minimum: 0, maximum: 100 },
        engagement_score: { type: "integer", minimum: 0, maximum: 100 },
        niche_fit: { type: "integer", minimum: 0, maximum: 100 },
        quick_summary: {
          type: "string",
          maxLength: 200,
          description: "Short 1-2 sentence summary for dashboard lists"
        },
        confidence_level: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in analysis from 0.0 to 1.0"
        },
        // Light payload structure (for payloads table)
        light_payload: {
          type: "object",
          additionalProperties: false,
          properties: {
            insights: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 5,
              description: "Key insights about this profile for quick decision making"
            },
            audience_quality: {
              type: "string",
              enum: ["High", "Medium", "Low"],
              description: "Assessment of audience quality and engagement"
            },
            basic_demographics: {
              type: "string",
              description: "Basic audience demographics and characteristics"
            },
            engagement_summary: {
              type: "string",
              description: "Summary of engagement patterns and metrics"
            }
          },
          required: ["insights", "audience_quality", "basic_demographics", "engagement_summary"]
        }
      },
      required: ["score", "engagement_score", "niche_fit", "quick_summary", "confidence_level", "light_payload"]
    }
  };
}
function getDeepAnalysisJsonSchema() {
  return {
    name: "DeepAnalysisResult",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: "integer", minimum: 0, maximum: 100 },
        engagement_score: { type: "integer", minimum: 0, maximum: 100 },
        niche_fit: { type: "integer", minimum: 0, maximum: 100 },
        quick_summary: {
          type: "string",
          maxLength: 200,
          description: "Short 1-2 sentence summary for dashboard lists"
        },
        confidence_level: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in analysis from 0.0 to 1.0"
        },
        // Deep payload structure (for payloads table)
        deep_payload: {
          type: "object",
          additionalProperties: false,
          properties: {
            deep_summary: {
              type: "string",
              description: "Comprehensive analysis of the profile and partnership potential"
            },
            selling_points: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 8,
              description: "Key selling points for why this influencer is valuable"
            },
            outreach_message: {
              type: "string",
              description: "Personalized outreach message for this specific influencer"
            },
            engagement_breakdown: {
              type: "object",
              additionalProperties: false,
              properties: {
                avg_likes: { type: "integer", minimum: 0 },
                avg_comments: { type: "integer", minimum: 0 },
                engagement_rate: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["avg_likes", "avg_comments", "engagement_rate"],
              description: "Detailed engagement metrics breakdown"
            },
            audience_insights: {
              type: "string",
              description: "Detailed audience analysis and insights"
            },
            reasons: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 10,
              description: "Specific reasons why this profile is a good/bad fit"
            }
          },
          required: ["deep_summary", "selling_points", "outreach_message", "engagement_breakdown", "audience_insights", "reasons"]
        }
      },
      required: ["score", "engagement_score", "niche_fit", "quick_summary", "confidence_level", "deep_payload"]
    }
  };
}
function getXRayAnalysisJsonSchema() {
  return {
    name: "XRayAnalysisResult",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        // Core scores (for runs table)
        score: { type: "integer", minimum: 0, maximum: 100 },
        engagement_score: { type: "integer", minimum: 0, maximum: 100 },
        niche_fit: { type: "integer", minimum: 0, maximum: 100 },
        quick_summary: {
          type: "string",
          maxLength: 200,
          description: "Short 1-2 sentence summary for dashboard lists"
        },
        confidence_level: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in analysis from 0.0 to 1.0"
        },
        // X-Ray payload structure (for payloads table)
        xray_payload: {
          type: "object",
          additionalProperties: false,
          properties: {
            copywriter_profile: {
              type: "object",
              additionalProperties: false,
              properties: {
                demographics: {
                  type: "string",
                  description: "Age, gender, location, lifestyle demographics"
                },
                psychographics: {
                  type: "string",
                  description: "Personality traits, values, interests, motivations"
                },
                pain_points: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 6,
                  description: "Key problems and frustrations this person faces"
                },
                dreams_desires: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 6,
                  description: "Goals, aspirations, and desired outcomes"
                }
              },
              required: ["demographics", "psychographics", "pain_points", "dreams_desires"]
            },
            commercial_intelligence: {
              type: "object",
              additionalProperties: false,
              properties: {
                budget_tier: {
                  type: "string",
                  enum: ["low-budget", "mid-market", "premium", "luxury"],
                  description: "Estimated spending capacity based on lifestyle indicators"
                },
                decision_role: {
                  type: "string",
                  enum: ["primary", "influencer", "gatekeeper", "researcher"],
                  description: "Role in purchasing decisions"
                },
                buying_stage: {
                  type: "string",
                  enum: ["unaware", "problem-aware", "solution-aware", "product-aware", "ready-to-buy"],
                  description: "Current stage in buying journey"
                },
                objections: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 5,
                  description: "Likely objections and concerns about purchasing"
                }
              },
              required: ["budget_tier", "decision_role", "buying_stage", "objections"]
            },
            persuasion_strategy: {
              type: "object",
              additionalProperties: false,
              properties: {
                primary_angle: {
                  type: "string",
                  enum: ["transformation", "status", "convenience", "fear-of-missing-out", "social-proof", "authority"],
                  description: "Primary persuasion angle to use"
                },
                hook_style: {
                  type: "string",
                  enum: ["problem-agitation", "curiosity-gap", "social-proof", "authority-positioning", "story-based"],
                  description: "Most effective hook style for this person"
                },
                proof_elements: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 7,
                  description: "Types of proof that would be most convincing"
                },
                communication_style: {
                  type: "string",
                  enum: ["casual-friendly", "professional", "authoritative", "empathetic", "energetic"],
                  description: "Communication tone that would resonate best"
                }
              },
              required: ["primary_angle", "hook_style", "proof_elements", "communication_style"]
            }
          },
          required: ["copywriter_profile", "commercial_intelligence", "persuasion_strategy"]
        }
      },
      required: ["score", "engagement_score", "niche_fit", "quick_summary", "confidence_level", "xray_payload"]
    }
  };
}
function buildLightAnalysisPrompt(profile, business, context) {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ? `Real engagement data: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)` : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;
  const triageContext = context?.triage ? `
## TRIAGE INSIGHTS
- **Lead Score**: ${context.triage.lead_score}/100
- **Data Quality**: ${context.triage.data_richness}/100  
- **Key Observations**: ${context.triage.focus_points?.join(", ") || "None"}
` : "";
  return `# LIGHT ANALYSIS: Quick Business Fit Assessment
${triageContext}

# LIGHT ANALYSIS: 10-Second Lead Check

## PROFILE SNAPSHOT
- **Handle**: @${profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Verified**: ${profile.isVerified ? "Yes \u2713" : "No"}
- **Private**: ${profile.isPrivate ? "Yes (LIMITED DATA)" : "No"}
- **Bio**: "${profile.bio || "Empty"}"
- **Link**: ${profile.externalUrl || "None"}
- **Posts**: ${profile.postsCount}
- **Following**: ${profile.followingCount} (Ratio: ${(profile.followersCount / profile.followingCount).toFixed(1)}:1)

## YOUR BUSINESS
- **Company**: ${business.name} (${business.industry})
- **Target**: ${business.target_audience}
- **Goal**: ${business.value_proposition}

## MISSION: Quick Pass/Fail Decision

Generate a rapid lead assessment. Focus ONLY on what's visible from Instagram:

### SCORING (0-100)
- **score**: Partnership viability (0=waste of time, 100=pursue immediately)
- **engagement_score**: Audience quality signal (high following/follower ratio = bot risk)
- **niche_fit**: Match to ${business.target_audience}
- **confidence_level**: Data reliability (0.2 if private, 0.5 if <1000 followers, else 0.7-0.9)

### LIGHT PAYLOAD REQUIREMENTS

**insights** (2-5 bullets):
- Follower tier: Nano (<10k), Micro (10-100k), Mid (100k-1M), Macro (1M+)
- Follow ratio red flags (following > followers = likely spam)
- Bio signals (email present? business category? CTAs?)
- Content frequency estimate from posts/account age
- Verification/business account as trust signals

**audience_quality**: 
- "High" = Verified OR business account with good follow ratio
- "Medium" = Normal ratios, active posting
- "Low" = Poor ratios, low posts, or private

**basic_demographics**: 
Extract ONLY from bio/username: language hints, location tags, niche keywords. 
If nothing extractable: "No demographic signals in bio"

**engagement_summary**: 
With ${profile.followersCount} followers, estimate typical engagement:
- Nano: 5-7% ER expected
- Micro: 2-4% ER expected  
- Mid: 1-2% ER expected
- Macro: 0.5-1% ER expected
State if account likely above/below benchmark based on post count and account age.

### DECISION LOGIC
- Score >70: Clear signals of fit + reachable + active
- Score 40-70: Possible fit but needs deep analysis
- Score <40: Wrong fit OR dead account OR spam signals

Return JSON only. Make the decision binary: pursue or skip.
`;
}
function buildDeepAnalysisPrompt(profile, business, context) {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ? `REAL ENGAGEMENT DATA: ${profile.engagement.engagementRate}% rate (${profile.engagement.avgLikes} avg likes, ${profile.engagement.avgComments} avg comments across ${profile.engagement.postsAnalyzed} posts)` : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;
  const triageContext = context?.triage ? `
## TRIAGE INSIGHTS  
- **Lead Score**: ${context.triage.lead_score}/100 (${context.triage.confidence * 100}% confidence)
- **Focus Areas**: ${context.triage.focus_points?.join(", ") || "General analysis"}
` : "";
  const preprocessorContext = context?.preprocessor ? `
## EXTRACTED PROFILE FACTS
- **Content Themes**: ${context.preprocessor.content_themes?.join(", ") || "Unknown"}
- **Posting Pattern**: ${context.preprocessor.posting_cadence || "Unknown"}
- **Collaboration History**: ${context.preprocessor.collaboration_history || "No evidence"}
- **Contact Readiness**: ${context.preprocessor.contact_readiness || "Unknown"}
- **Brand Mentions**: ${context.preprocessor.brand_mentions?.join(", ") || "None found"}
` : "";
  const contentInfo = (profile.latestPosts?.length || 0) > 0 ? `Recent content themes: ${profile.latestPosts.slice(0, 3).map((p) => `"${p.caption?.slice(0, 100) || "Visual content"}"...`).join(" | ")}` : "Content analysis limited - no recent posts available";
  return `
  # DEEP ANALYSIS: Partnership Intelligence Report

## VERIFIED PROFILE DATA
- **Handle**: @${profile.username}
- **Metrics**: ${profile.followersCount.toLocaleString()} followers | ${profile.postsCount} posts
- **Bio**: "${profile.bio || "No bio"}"
- **Link**: ${profile.externalUrl || "No external link"}
- **Status**: ${profile.isVerified ? "Verified \u2713" : "Unverified"} | ${profile.isBusinessAccount ? "Business" : "Personal"}

## ACTUAL ENGAGEMENT DATA
${profile.engagement && profile.engagement.postsAnalyzed > 0 ? `REAL METRICS from ${profile.engagement.postsAnalyzed} posts:
    - Avg Likes: ${profile.engagement.avgLikes.toLocaleString()}
    - Avg Comments: ${profile.engagement.avgComments.toLocaleString()}
    - Engagement Rate: ${profile.engagement.engagementRate}%
    - Total Interactions: ${profile.engagement.totalEngagement.toLocaleString()}` : `ESTIMATED for ${profile.followersCount.toLocaleString()} followers (no post data available)`}

## CONTENT ANALYSIS
${(profile.latestPosts?.length || 0) > 0 ? `Latest ${profile.latestPosts.length} posts analyzed:
    ${profile.latestPosts.slice(0, 3).map(
    (p) => `- ${p.likesCount.toLocaleString()} likes, ${p.commentsCount} comments: "${(p.caption || "").slice(0, 50)}..."`
  ).join("\n    ")}` : "No recent posts available for analysis"}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Target**: ${business.target_audience}
- **Value Prop**: ${business.value_proposition}

## DEEP ANALYSIS REQUIREMENTS

### SCORING FRAMEWORK
- **score**: Overall partnership value (0-100)
- **engagement_score**: Based on ACTUAL data if available, else use follower-tier benchmarks
- **niche_fit**: Alignment with ${business.target_audience}
- **confidence_level**: ${profile.engagement?.postsAnalyzed ? "0.85-0.95 (real data)" : "0.4-0.6 (estimated)"}

### DEEP PAYLOAD - BE SPECIFIC

**deep_summary** (4-6 sentences):
Start with engagement reality check. State actual ER% vs expected for their follower tier. Identify content patterns from captions/hashtags. Assess partnership viability based on measurable signals. End with specific recommendation.

**selling_points** (3-8 bullets):
ONLY claims you can defend with numbers:
- "ER of ${profile.engagement?.engagementRate}% beats follower tier average"
- "Consistent posting (${profile.latestPosts?.length || 0} recent posts)"
- "High comment ratio suggests engaged community"
- "Verified status + business account = platform trust"
NO generic claims like "great content" or "strong influence"

**outreach_message** (150-250 words):
Open with specific metric about their engagement rate and follower count
Reference actual content theme from their posts
Propose specific collaboration format (Reel, Carousel, Story series)
Include concrete success metric (target reach, engagement, conversions)
End with clear CTA and contact preference

**engagement_breakdown**:
Use REAL data when available from profile.engagement object

**audience_insights**:
From actual post performance:
- High engagement posts topics (from captions)
- Comment patterns (questions vs praise vs emojis)
- Posting time patterns if visible
- Hashtag communities they engage

**reasons** (3-10 specific points):
Each must reference a metric or observation:
- "ER of X% is Y% above category average"
- "Bio contains email, suggesting openness to partnerships"
- "Recent posts show collaborations with similar brands"
- "Recent posts show consistent activity"

### DECISION OUTPUTS
If score >75: Provide exact outreach angle and first message
If score 50-75: List 2-3 tests to validate fit
If score <50: State specific disqualifiers

Return JSON only. Every claim must trace to profile data.
  `;
}
function buildXRayAnalysisPrompt(profile, business, context) {
  const engagementInfo = (profile.engagement?.postsAnalyzed || 0) > 0 ? `REAL ENGAGEMENT DATA: ${profile.engagement?.engagementRate}% rate (${profile.engagement?.avgLikes} avg likes, ${profile.engagement?.avgComments} avg comments across ${profile.engagement?.postsAnalyzed} posts)` : `Estimated engagement based on ${profile.followersCount.toLocaleString()} followers`;
  const triageContext = context?.triage ? `
## STRATEGIC CONTEXT
- **Lead Quality**: ${context.triage.lead_score}/100 (${Math.round(context.triage.confidence * 100)}% confidence)
- **Analysis Focus**: ${context.triage.focus_points?.join(" | ") || "Comprehensive profile"}
` : "";
  const preprocessorContext = context?.preprocessor ? `
## BEHAVIORAL INTELLIGENCE
- **Content Strategy**: ${context.preprocessor.content_themes?.join(" + ") || "Unknown themes"}
- **Engagement Drivers**: ${context.preprocessor.engagement_patterns || "Unknown patterns"}
- **Brand Relationships**: ${context.preprocessor.brand_mentions?.length > 0 ? context.preprocessor.brand_mentions.join(", ") : "No brand connections visible"}
- **Business Readiness**: ${context.preprocessor.contact_readiness || "Unknown"}
- **Collaboration Track Record**: ${context.preprocessor.collaboration_history || "No evidence"}
` : "";
  const contentInfo = (profile.latestPosts?.length || 0) > 0 ? `Recent content analysis: ${profile.latestPosts.slice(0, 5).map((p) => `"${p.caption?.slice(0, 150) || "Visual content"}"...`).join(" | ")}` : "Content analysis limited - profile access restricted";
  return `
  # X-RAY ANALYSIS: Deep Psychological & Commercial Profiling

## PROFILE INTELLIGENCE
- **Handle**: @${profile.username} (${profile.followersCount.toLocaleString()} followers)
- **Verification**: ${profile.isVerified ? "VERIFIED \u2713 (trust signal)" : "Unverified"}
- **Account Type**: ${profile.isBusinessAccount ? "Business Account" : "Personal/Creator"}
- **Bio Signals**: "${profile.bio || "No bio"}"
- **Link Strategy**: ${profile.externalUrl ? `Active (${profile.externalUrl.includes("linktr") ? "Linktree" : "Direct site"})` : "No external link"}

## BEHAVIORAL DATA
${(profile.engagement?.postsAnalyzed || 0) > 0 ? `MEASURED BEHAVIOR from ${profile.engagement.postsAnalyzed} posts:
    - Engagement: ${profile.engagement.engagementRate}% (${profile.engagement.avgLikes} likes, ${profile.engagement.avgComments} comments avg)
    - Comment Ratio: ${(profile.engagement.avgComments / profile.engagement.avgLikes * 100).toFixed(1)}% (community engagement signal)
    - Per-Post Reach: ~${(profile.engagement.avgLikes / profile.followersCount * 100).toFixed(1)}% of audience` : "Limited behavioral data - assessment based on profile signals"}

## CONTENT PATTERNS
${(profile.latestPosts?.length || 0) > 0 ? `${profile.latestPosts.length} recent posts reveal:
    ${profile.latestPosts.slice(0, 5).map((p) => {
    const wordCount = (p.caption || "").split(" ").length;
    const hasQuestion = (p.caption || "").includes("?");
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(p.caption || "");
    const hasCTA = /(link|bio|shop|swipe|save|comment|share|tag)/i.test(p.caption || "");
    return `- ${p.likesCount} likes: ${wordCount} words, ${hasQuestion ? "question" : "statement"}, ${hasEmoji ? "emojis" : "no emojis"}, ${hasCTA ? "CTA present" : "no CTA"}`;
  }).join("\n    ")}` : "No content patterns available"}

## BUSINESS CONTEXT
- **Your Company**: ${business.name} (${business.industry})
- **Your Audience**: ${business.target_audience}
- **Your Goal**: ${business.value_proposition}

## X-RAY INTELLIGENCE EXTRACTION

### SCORING (same as deep but with psychological confidence)
- **score**: Partnership value (0-100)
- **engagement_score**: Audience quality (0-100)
- **niche_fit**: Strategic alignment (0-100)
- **confidence_level**: ${profile.latestPosts?.length >= 5 ? "0.8-0.95" : "0.3-0.5"}

### COPYWRITER PROFILE - Extract from Instagram patterns only

**demographics**:
Based on visual content + bio + captions:
- Age signals: Caption formality, emoji usage, cultural references
- Location: Tagged locations, timezone patterns, language
- Lifestyle: Post locations (gym/travel/home), brand mentions

**psychographics**:
From content themes and caption style:
- Values: What they celebrate/criticize in captions
- Communication: Long vs short captions, question frequency, emoji density
- Authority style: Educational vs entertainment vs inspiration

**pain_points** (2-6 from content):
Look for complaint patterns, questions asked, problems mentioned:
- "Posts about specific topics suggest frustration with relevant issues"
- "Asking followers about problems indicates struggle with those areas"
- "Collaboration requests suggest need for partnerships"

**dreams_desires** (2-6 from content):
From aspirational posts, goals mentioned, celebration posts:
- "Celebrates achievements suggesting their values and priorities"
- "Posts about future goals indicating their desires and aspirations"
- "Hashtags show aspiration toward specific outcomes or lifestyles"

### COMMERCIAL INTELLIGENCE - Based on observable signals

**budget_tier**:
- "luxury": Verified + >1M followers + brand collabs visible
- "premium": 100k-1M followers + business account + professional content
- "mid-market": 10k-100k followers + consistent posting
- "low-budget": <10k followers or inconsistent activity

**decision_role**:
- "primary": Solopreneur/creator (no team visible)
- "influencer": Part of network (collabs/mentions visible)
- "gatekeeper": Business account with team mentions
- "researcher": Asks audience for input frequently

**buying_stage** (for partnerships):
- "ready-to-buy": Email in bio + past collabs + business account
- "product-aware": Mentions partnerships but no clear CTA
- "solution-aware": Business account but no collab history
- "problem-aware": Growing but not monetizing
- "unaware": Personal account, no business signals

**objections** (2-5 based on patterns):
- From low engagement: "Audience quality concerns"
- From irregular posting: "Consistency issues"
- From no collab history: "Unproven partnership record"
- From caption style: "Brand voice misalignment"

### PERSUASION STRATEGY - How to approach based on their patterns

**primary_angle**:
- "transformation": If posts show before/after, growth, change
- "status": If posts show achievements, milestones, recognition
- "convenience": If posts emphasize ease, simplicity, efficiency
- "fear-of-missing-out": If posts use urgency, limited time, exclusive
- "social-proof": If posts show testimonials, community, numbers
- "authority": If posts teach, guide, demonstrate expertise

**hook_style** (based on their content style):
- "problem-agitation": If they discuss pain points
- "curiosity-gap": If they use questions, teasers
- "social-proof": If they showcase results, testimonials
- "authority-positioning": If they teach, educate
- "story-based": If they share personal narratives

**proof_elements** (3-7 they'd respond to):
Based on what THEY use in content:
- Numbers/metrics if they share stats
- Visual proof if they post before/afters
- Testimonials if they share feedback
- Process proof if they show behind-scenes
- Authority proof if they cite sources

**communication_style** (match their tone):
- "casual-friendly": Heavy emoji use, informal language
- "professional": Business language, formal structure
- "authoritative": Educational, factual, structured
- "empathetic": Personal stories, emotional language
- "energetic": Exclamations, caps, enthusiasm markers

## CRITICAL REQUIREMENT
Every insight must reference observable Instagram behavior. No external assumptions.
Mark any field as "insufficient_data" if you can't defend it from the profile.

Return JSON only. This is intelligence for high-stakes outreach - be precise.
  `;
}
function buildOutreachMessagePrompt(profile, business, analysis) {
  return `# PERSONALIZED OUTREACH MESSAGE GENERATION

## TARGET PROFILE
- **Username**: @${profile.username}
- **Display Name**: ${profile.displayName || profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Bio**: "${profile.bio || "No bio available"}"
- **Verified**: ${profile.isVerified ? "Yes" : "No"}
- **Business Account**: ${profile.isBusinessAccount ? "Yes" : "No"}

## BUSINESS CONTEXT
- **Company**: ${business.name}
- **Industry**: ${business.industry}
- **Value Proposition**: ${business.value_proposition}
- **Target Audience**: ${business.target_audience}

## ANALYSIS INSIGHTS
- **Overall Score**: ${analysis.score}/100
- **Niche Fit**: ${analysis.niche_fit}/100
- **Key Selling Points**: ${analysis.selling_points?.join(", ") || "Not available"}

## MESSAGE REQUIREMENTS
Write a personalized outreach message that:

1. **Addresses them personally** using their display name or username
2. **Shows genuine interest** in their content/audience
3. **Mentions specific details** from their profile (follower count, niche, etc.)
4. **Clearly states the collaboration opportunity** 
5. **Includes a clear call-to-action**
6. **Maintains professional but friendly tone**
7. **Keeps length between 150-250 words**

## TONE GUIDELINES
- Professional but approachable
- Genuine interest, not generic template
- Confident but not pushy
- Focus on mutual benefit
- Include specific numbers when relevant (follower count, etc.)

Generate ONLY the message text - no subject line, no extra formatting, no introduction. Start directly with the greeting.`;
}
function buildQuickSummaryPrompt(profile) {
  return `Generate a concise 1-2 sentence summary for this Instagram profile:

@${profile.username} - ${profile.followersCount.toLocaleString()} followers
Bio: "${profile.bio || "No bio"}"
Verified: ${profile.isVerified ? "Yes" : "No"}
Engagement: ${profile.engagement?.engagementRate || "Unknown"}%

Create a brief summary suitable for dashboard lists. Focus on key characteristics and business potential. Maximum 150 characters.`;
}
function getTriageJsonSchema() {
  return {
    name: "TriageResult",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        lead_score: { type: "integer", minimum: 0, maximum: 100 },
        data_richness: { type: "integer", minimum: 0, maximum: 100 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        early_exit: { type: "boolean" },
        focus_points: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4
        }
      },
      required: ["lead_score", "data_richness", "confidence", "early_exit", "focus_points"]
    }
  };
}
function buildTriagePrompt(snapshot, businessOneLiner) {
  return `# LEAD TRIAGE: Quick Pass/Fail Decision

## YOUR BUSINESS
${businessOneLiner}

## PROFILE SNAPSHOT
- **Username**: @${snapshot.username}
- **Followers**: ${snapshot.followers.toLocaleString()}
- **Status**: ${snapshot.verified ? "Verified \u2713" : "Unverified"} | ${snapshot.private ? "Private \u26A0\uFE0F" : "Public"}
- **Bio**: "${snapshot.bio_short || "No bio"}"
- **External Links**: ${snapshot.external_domains.length > 0 ? snapshot.external_domains.join(", ") : "None"}
- **Recent Activity**: ~${snapshot.posts_30d} posts estimated
- **Sample Content**: ${snapshot.top_captions.length > 0 ? snapshot.top_captions.map((cap) => `"${cap}..."`).join(" | ") : "No captions available"}
- **Engagement Data**: ${snapshot.engagement_signals ? `${snapshot.engagement_signals.avg_likes.toLocaleString()} avg likes, ${snapshot.engagement_signals.avg_comments} comments (${snapshot.engagement_signals.posts_analyzed} posts)` : "Not available"}

## TASK: 10-Second Lead Decision

Score this profile on two dimensions:

**lead_score (0-100)**: Business fit potential
- 80-100: Clear target match, obvious collaboration potential
- 60-79: Good fit signals, worth deeper analysis  
- 40-59: Possible fit but unclear value
- 20-39: Weak signals, probably wrong audience
- 0-19: Obviously wrong fit, different niche entirely

**data_richness (0-100)**: Available information quality
- 80-100: Rich content, engagement data, clear patterns
- 60-79: Good content samples, some engagement signals
- 40-59: Basic profile info, limited content visibility
- 20-39: Minimal data, private account or sparse content
- 0-19: Almost no usable information

**confidence (0-1)**: How certain are you about these scores?

**focus_points**: 2-4 specific observations that drove your scores

## EARLY EXIT RULES
- If lead_score < 25 OR data_richness < 20 \u2192 Set early_exit: true
- Otherwise \u2192 Set early_exit: false

Return ONLY JSON:
{
  "lead_score": 0-100,
  "data_richness": 0-100, 
  "confidence": 0-1,
  "early_exit": true|false,
  "focus_points": ["observation 1", "observation 2", "..."]
}`;
}
function getPreprocessorJsonSchema() {
  return {
    name: "PreprocessorResult",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        posting_cadence: { type: "string" },
        content_themes: {
          type: "array",
          items: { type: "string" },
          maxItems: 5
        },
        audience_signals: {
          type: "array",
          items: { type: "string" },
          maxItems: 4
        },
        brand_mentions: {
          type: "array",
          items: { type: "string" }
        },
        engagement_patterns: { type: "string" },
        collaboration_history: { type: "string" },
        contact_readiness: { type: "string" },
        content_quality: { type: "string" }
      },
      required: ["posting_cadence", "content_themes", "audience_signals", "brand_mentions", "engagement_patterns", "collaboration_history", "contact_readiness", "content_quality"]
    }
  };
}
function buildPreprocessorPrompt(profile) {
  const postsData = profile.latestPosts || [];
  const engagementData = profile.engagement || null;
  return `# DATA EXTRACTION: Instagram Profile Facts

## PROFILE OVERVIEW
- **Username**: @${profile.username}
- **Followers**: ${profile.followersCount.toLocaleString()}
- **Bio**: "${profile.bio || "No bio"}"
- **External Link**: ${profile.externalUrl || "None"}
- **Account Type**: ${profile.isBusinessAccount ? "Business" : "Personal"} | ${profile.isVerified ? "Verified" : "Unverified"}

## CONTENT ANALYSIS
- **Posts Available**: ${postsData.length}
- **Engagement Data**: ${engagementData ? `${engagementData.engagementRate}% rate (${engagementData.avgLikes} avg likes, ${engagementData.avgComments} comments)` : "Not available"}

## POST SAMPLES
${postsData.slice(0, 8).map(
    (post, i) => `**Post ${i + 1}**: ${post.likesCount.toLocaleString()} likes, ${post.commentsCount} comments
  Caption: "${(post.caption || "").slice(0, 150)}${post.caption && post.caption.length > 150 ? "..." : ""}"`
  ).join("\n")}

## EXTRACTION TASK

Based ONLY on observable data above, extract:

**posting_cadence**: Frequency pattern (daily/weekly/sporadic/inactive)

**content_themes**: Top 3-5 recurring topics/niches from captions and context

**audience_signals**: 2-4 demographic/psychographic signals about followers from comments, content style, language

**brand_mentions**: List any brand names, products, or companies mentioned

**engagement_patterns**: Style of engagement (high comments vs likes, question-heavy, community-focused, etc)

**collaboration_history**: Evidence of sponsorships, partnerships, or promotional content

**contact_readiness**: Email in bio, business account, link in bio, or other contact signals

**content_quality**: Production value assessment (professional/amateur/mixed)

Extract ONLY what you can verify from the data provided. Use "insufficient_data" for unclear fields.

Return ONLY JSON:
{
  "posting_cadence": "...",
  "content_themes": ["theme1", "theme2", "theme3"],
  "audience_signals": ["signal1", "signal2"],
  "brand_mentions": ["brand1", "brand2"],
  "engagement_patterns": "...",
  "collaboration_history": "...",
  "contact_readiness": "...",
  "content_quality": "..."
}`;
}
var init_prompts = __esm({
  "src/services/prompts.ts"() {
    __name(getLightAnalysisJsonSchema, "getLightAnalysisJsonSchema");
    __name(getDeepAnalysisJsonSchema, "getDeepAnalysisJsonSchema");
    __name(getXRayAnalysisJsonSchema, "getXRayAnalysisJsonSchema");
    __name(buildLightAnalysisPrompt, "buildLightAnalysisPrompt");
    __name(buildDeepAnalysisPrompt, "buildDeepAnalysisPrompt");
    __name(buildXRayAnalysisPrompt, "buildXRayAnalysisPrompt");
    __name(buildOutreachMessagePrompt, "buildOutreachMessagePrompt");
    __name(buildQuickSummaryPrompt, "buildQuickSummaryPrompt");
    __name(getTriageJsonSchema, "getTriageJsonSchema");
    __name(buildTriagePrompt, "buildTriagePrompt");
    __name(getPreprocessorJsonSchema, "getPreprocessorJsonSchema");
    __name(buildPreprocessorPrompt, "buildPreprocessorPrompt");
  }
});

// src/services/triage.ts
async function runTriage(snapshot, businessOneLiner, env, requestId) {
  console.log(`\u{1F50D} [Triage] Starting for @${snapshot.username}`);
  try {
    const modelName = selectModel("triage", "economy");
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: "You are a lead qualification expert. Analyze Instagram profiles quickly and return ONLY valid JSON.",
      user_prompt: buildTriagePrompt(snapshot, businessOneLiner),
      max_tokens: 200,
      json_schema: getTriageJsonSchema(),
      response_format: "json",
      temperature: 0.1
    });
    const result = JSON.parse(response.content);
    result.early_exit = false;
    console.log(`\u{1F50D} [Triage] Result: Score ${result.lead_score}, Data ${result.data_richness}, Model: ${response.model_used}`);
    return {
      result,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: "triage"
      }
    };
  } catch (error) {
    console.error(`\u{1F50D} [Triage] Failed:`, error.message);
    throw new Error(`Triage failed: ${error.message}`);
  }
}
var init_triage = __esm({
  "src/services/triage.ts"() {
    init_universal_ai_adapter();
    init_prompts();
    __name(runTriage, "runTriage");
  }
});

// src/services/preprocessor.ts
async function runPreprocessor(profile, env, requestId) {
  const cacheKey = generateCacheKey(profile);
  const cached = await getCachedPreprocessor(cacheKey, env);
  if (cached) {
    console.log(`\u{1F4CB} [Preprocessor] Cache hit for @${profile.username}`);
    return {
      result: cached,
      costDetails: {
        actual_cost: 0,
        tokens_in: 0,
        tokens_out: 0,
        model_used: "cached",
        block_type: "preprocessor"
      }
    };
  }
  console.log(`\u{1F4CB} [Preprocessor] Starting for @${profile.username}`);
  try {
    const modelName = selectModel("preprocessor", "economy");
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: "You are a data extraction specialist. Extract structured facts from Instagram profiles. Only include what you can observe directly.",
      user_prompt: buildPreprocessorPrompt(profile),
      max_tokens: 400,
      json_schema: getPreprocessorJsonSchema(),
      response_format: "json",
      temperature: 0.2
    });
    const result = JSON.parse(response.content);
    await cachePreprocessor(cacheKey, result, env);
    console.log(`\u{1F4CB} [Preprocessor] Completed for @${profile.username}, cached for 48h, model: ${response.model_used}`);
    return {
      result,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: "preprocessor"
      }
    };
  } catch (error) {
    console.error(`\u{1F4CB} [Preprocessor] Failed:`, error.message);
    throw new Error(`Preprocessor failed: ${error.message}`);
  }
}
function generateCacheKey(profile) {
  const contentHash = profile.latestPosts?.slice(0, 5).map((p) => `${p.shortCode}:${p.likesCount}:${p.commentsCount}`).join("|") || "no-posts";
  return `preprocessor:${profile.username}:${profile.followersCount}:${contentHash}`;
}
async function getCachedPreprocessor(cacheKey, env) {
  try {
    if (!env.ANALYSIS_CACHE) return null;
    const cached = await env.ANALYSIS_CACHE.get(cacheKey, "json");
    if (cached && cached.expires > Date.now()) {
      return cached.result;
    }
    return null;
  } catch (error) {
    console.warn("Cache read failed:", error.message);
    return null;
  }
}
async function cachePreprocessor(cacheKey, result, env) {
  try {
    if (!env.ANALYSIS_CACHE) return;
    const cacheData = {
      result,
      expires: Date.now() + 48 * 60 * 60 * 1e3
      // 48 hours
    };
    await env.ANALYSIS_CACHE.put(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Cache write failed:", error.message);
  }
}
var init_preprocessor = __esm({
  "src/services/preprocessor.ts"() {
    init_universal_ai_adapter();
    init_prompts();
    __name(runPreprocessor, "runPreprocessor");
    __name(generateCacheKey, "generateCacheKey");
    __name(getCachedPreprocessor, "getCachedPreprocessor");
    __name(cachePreprocessor, "cachePreprocessor");
  }
});

// src/config/models.ts
var models_exports = {};
__export(models_exports, {
  CREDIT_PRICING: () => CREDIT_PRICING,
  MODEL_CONFIG: () => MODEL_CONFIG,
  calculateCost: () => calculateCost,
  calculateCreditCost: () => calculateCreditCost,
  getTotalCreditsRequired: () => getTotalCreditsRequired
});
function calculateCreditCost(analysisType, actualCost, tokensUsed) {
  const baseFee = CREDIT_PRICING.base_fees[analysisType] || 1;
  if (tokensUsed > CREDIT_PRICING.token_cap) {
    return baseFee * 1.5;
  }
  const costWithMargin = actualCost * (1 + CREDIT_PRICING.margin_target);
  const finalCost = Math.max(baseFee + costWithMargin, CREDIT_PRICING.minimum_charge);
  return Math.round(finalCost * 100) / 100;
}
function calculateCost(tokensIn, tokensOut, modelType) {
  const config = MODEL_CONFIG[modelType];
  if (!config) throw new Error(`Unknown model type: ${modelType}`);
  const totalTokens = tokensIn + tokensOut;
  return totalTokens * config.cost_per_1k / 1e3;
}
function getTotalCreditsRequired(analysisType, estimatedCost) {
  const baseFee = CREDIT_PRICING.base_fees[analysisType];
  const totalCost = baseFee + estimatedCost;
  return Math.max(totalCost, CREDIT_PRICING.minimum_charge);
}
var MODEL_CONFIG, CREDIT_PRICING;
var init_models = __esm({
  "src/config/models.ts"() {
    MODEL_CONFIG = {
      triage: {
        model: "gpt-4o-mini",
        // Using existing model until GPT-5 available
        cost_per_1k: 15e-5,
        max_in: 600,
        max_out: 200
      },
      preproc: {
        model: "gpt-4o-mini",
        cost_per_1k: 15e-5,
        max_in: 800,
        max_out: 400
      },
      light: {
        model: "gpt-4o",
        cost_per_1k: 25e-4,
        max_in: 800,
        max_out: 400
      },
      deep: {
        model: "gpt-4o",
        cost_per_1k: 25e-4,
        max_in: 1200,
        max_out: 600
      },
      xray: {
        model: "gpt-4o",
        cost_per_1k: 25e-4,
        max_in: 1500,
        max_out: 800
      }
    };
    CREDIT_PRICING = {
      base_fees: {
        light: 0.5,
        deep: 1,
        xray: 2
      },
      minimum_charge: 0.1,
      // Prevent negative margins
      token_cap: 2200,
      // Skip remaining if hit
      margin_target: 0.3
      // 30% target margin over actual costs
    };
    __name(calculateCreditCost, "calculateCreditCost");
    __name(calculateCost, "calculateCost");
    __name(getTotalCreditsRequired, "getTotalCreditsRequired");
  }
});

// src/services/ai-analysis.ts
var ai_analysis_exports = {};
__export(ai_analysis_exports, {
  generateOutreachMessage: () => generateOutreachMessage,
  generateQuickSummary: () => generateQuickSummary,
  performAIAnalysis: () => performAIAnalysis
});
async function performAIAnalysis(profile, business, analysisType, env, requestId, context, modelTier = "balanced") {
  console.log(`\u{1F916} [AI Analysis] Starting ${analysisType} analysis with ${modelTier} tier`);
  try {
    const modelName = selectModel(analysisType, modelTier, context);
    console.log(`\u{1F916} [AI Analysis] Selected model: ${modelName}`);
    let prompt;
    let jsonSchema;
    switch (analysisType) {
      case "light":
        prompt = buildLightAnalysisPrompt(profile, business, context);
        jsonSchema = getLightAnalysisJsonSchema();
        break;
      case "deep":
        prompt = buildDeepAnalysisPrompt(profile, business, context);
        jsonSchema = getDeepAnalysisJsonSchema();
        break;
      case "xray":
        prompt = buildXRayAnalysisPrompt(profile, business, context);
        jsonSchema = getXRayAnalysisJsonSchema();
        break;
      default:
        throw new Error(`Unsupported analysis type: ${analysisType}`);
    }
    const aiAdapter = new UniversalAIAdapter(env, requestId);
    const response = await aiAdapter.executeRequest({
      model_name: modelName,
      system_prompt: getSystemPrompt(analysisType),
      user_prompt: prompt,
      max_tokens: getMaxTokens(analysisType),
      json_schema: jsonSchema,
      response_format: "json"
    });
    const rawResult = JSON.parse(response.content);
    const transformedResult = transformAnalysisResult(rawResult, analysisType, profile);
    console.log(`\u{1F916} [AI Analysis] Completed with model: ${response.model_used}, cost: $${response.usage.total_cost.toFixed(4)}`);
    return {
      result: transformedResult,
      costDetails: {
        actual_cost: response.usage.total_cost,
        tokens_in: response.usage.input_tokens,
        tokens_out: response.usage.output_tokens,
        model_used: response.model_used,
        block_type: analysisType
      }
    };
  } catch (error) {
    console.error(`\u{1F916} [AI Analysis] Failed:`, error.message);
    throw new Error(`AI analysis failed: ${error.message}`);
  }
}
function getSystemPrompt(analysisType) {
  const prompts = {
    light: "You are an expert business analyst specializing in influencer partnerships. Return ONLY valid JSON matching the exact schema provided.",
    deep: "You are an expert business analyst specializing in influencer partnerships. Provide comprehensive analysis. Return ONLY valid JSON matching the exact schema provided.",
    xray: "You are an expert business analyst and psychological profiler specializing in influencer partnerships. Provide deep psychological insights. Return ONLY valid JSON matching the exact schema provided."
  };
  return prompts[analysisType] || prompts.light;
}
function getMaxTokens(analysisType) {
  const limits = {
    light: 500,
    deep: 800,
    xray: 1200
  };
  return limits[analysisType] || 500;
}
function transformAnalysisResult(rawResult, analysisType, profile) {
  const baseResult = {
    score: rawResult.score || 0,
    engagement_score: rawResult.engagement_score || 0,
    niche_fit: rawResult.niche_fit || 0,
    quick_summary: rawResult.quick_summary || "",
    confidence_level: rawResult.confidence_level || calculateConfidenceLevel(profile, analysisType),
    audience_quality: "Medium",
    engagement_insights: "",
    selling_points: [],
    reasons: []
  };
  switch (analysisType) {
    case "light":
      if (rawResult.light_payload) {
        baseResult.audience_quality = rawResult.light_payload.audience_quality || "Medium";
        baseResult.engagement_insights = rawResult.light_payload.engagement_summary || "";
        baseResult.selling_points = rawResult.light_payload.insights || [];
        baseResult.reasons = rawResult.light_payload.insights || [];
      }
      break;
    case "deep":
      if (rawResult.deep_payload) {
        baseResult.deep_summary = rawResult.deep_payload.deep_summary;
        baseResult.selling_points = rawResult.deep_payload.selling_points || [];
        baseResult.reasons = rawResult.deep_payload.reasons || [];
        baseResult.outreach_message = rawResult.deep_payload.outreach_message;
        baseResult.audience_quality = "High";
        baseResult.engagement_insights = rawResult.deep_payload.audience_insights || "";
        if (rawResult.deep_payload.engagement_breakdown) {
          baseResult.avg_likes = rawResult.deep_payload.engagement_breakdown.avg_likes;
          baseResult.avg_comments = rawResult.deep_payload.engagement_breakdown.avg_comments;
          baseResult.engagement_rate = rawResult.deep_payload.engagement_breakdown.engagement_rate;
        }
      }
      break;
    case "xray":
      if (rawResult.xray_payload) {
        baseResult.audience_quality = "Premium";
        baseResult.engagement_insights = `Commercial Intelligence: ${rawResult.xray_payload.commercial_intelligence?.budget_tier || "Unknown"} budget tier`;
        baseResult.selling_points = [
          ...rawResult.xray_payload.copywriter_profile?.pain_points || [],
          ...rawResult.xray_payload.copywriter_profile?.dreams_desires || []
        ];
        baseResult.reasons = rawResult.xray_payload.persuasion_strategy?.key_messages || [];
        baseResult.copywriter_profile = rawResult.xray_payload.copywriter_profile;
        baseResult.commercial_intelligence = rawResult.xray_payload.commercial_intelligence;
        baseResult.persuasion_strategy = rawResult.xray_payload.persuasion_strategy;
      }
      break;
  }
  return baseResult;
}
function buildOpenAIChatBody(opts) {
  const { model, messages, maxTokens, temperature, responseFormatJSON, jsonSchema } = opts;
  if (isGPT5(model)) {
    const body2 = {
      model,
      messages,
      max_completion_tokens: maxTokens
    };
    if (jsonSchema) {
      body2.response_format = {
        type: "json_schema",
        json_schema: jsonSchema
      };
    } else if (responseFormatJSON) {
      body2.response_format = { type: "json_object" };
    }
    return body2;
  }
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: typeof temperature === "number" ? temperature : 0.7
  };
  if (jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: jsonSchema
    };
  } else if (responseFormatJSON) {
    body.response_format = { type: "json_object" };
  }
  return body;
}
function parseChoiceSafe(choice) {
  if (!choice) return "";
  const msg = choice?.message;
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((c) => typeof c === "string" ? c : c?.text ?? "").join(" ").trim();
  }
  return "";
}
function log(level, message, data, requestId) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const logData = { timestamp, level, message, requestId, ...data };
  console.log(JSON.stringify(logData));
}
async function generateOutreachMessage(profile, analysis, business, env) {
  try {
    const prompt = buildOutreachMessagePrompt(profile, analysis, business);
    const openaiKey = await getApiKey("OPENAI_API_KEY", env);
    if (!openaiKey) throw new Error("OpenAI API key not available");
    const body = buildOpenAIChatBody({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a professional copywriter specializing in influencer outreach. Write personalized, compelling messages that feel human and authentic." },
        { role: "user", content: prompt }
      ],
      maxTokens: 500
    });
    const response = await callWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      },
      2,
      // 2 retries
      2e3,
      // 2 second delay
      15e3
      // 15 second timeout
    );
    const content = parseChoiceSafe(response?.choices?.[0]);
    if (!content) throw new Error("Empty outreach message response");
    log("info", "Outreach message generated successfully", {
      username: profile.username,
      messageLength: content.length
    });
    return content;
  } catch (error) {
    log("error", "Outreach message generation failed", {
      error: error.message,
      username: profile.username
    });
    return `Hi @${profile.username}! I came across your ${profile.isVerified ? "verified" : "amazing"} profile and was impressed by your content. I think there could be a great partnership opportunity between you and ${business.name}. Would love to chat about how we can work together! \u{1F91D}`;
  }
}
async function generateQuickSummary(profile, analysis, env) {
  try {
    const prompt = buildQuickSummaryPrompt(profile, analysis);
    const openaiKey = await getApiKey("OPENAI_API_KEY", env);
    if (!openaiKey) {
      return `${profile.isVerified ? "Verified" : "Unverified"} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || "unknown"}% indicates ${analysis.audience_quality ? String(analysis.audience_quality).toLowerCase() : "unknown"} audience quality.`;
    }
    const body = buildOpenAIChatBody({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a business analyst. Provide concise, professional summaries of influencer profiles." },
        { role: "user", content: prompt }
      ],
      maxTokens: 200
    });
    const response = await callWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      },
      2,
      // 2 retries
      2e3,
      // 2 second delay
      1e4
      // 10 second timeout
    );
    const content = parseChoiceSafe(response?.choices?.[0]);
    return content || `${profile.username} analysis summary generated successfully.`;
  } catch (error) {
    log("warn", "Quick summary generation failed, using fallback", {
      error: error.message,
      username: profile.username
    });
    return `${profile.isVerified ? "Verified" : "Unverified"} profile with ${profile.followersCount.toLocaleString()} followers and ${analysis.score}/100 business compatibility score. Engagement rate of ${profile.engagement?.engagementRate || "unknown"}% indicates ${analysis.audience_quality ? String(analysis.audience_quality).toLowerCase() : "unknown"} audience quality.`;
  }
}
var isGPT5;
var init_ai_analysis = __esm({
  "src/services/ai-analysis.ts"() {
    init_helpers();
    init_validation();
    init_enhanced_config_manager();
    init_prompts();
    init_models();
    init_universal_ai_adapter();
    isGPT5 = /* @__PURE__ */ __name((m) => /^gpt-5/i.test(m), "isGPT5");
    __name(performAIAnalysis, "performAIAnalysis");
    __name(getSystemPrompt, "getSystemPrompt");
    __name(getMaxTokens, "getMaxTokens");
    __name(transformAnalysisResult, "transformAnalysisResult");
    __name(buildOpenAIChatBody, "buildOpenAIChatBody");
    __name(parseChoiceSafe, "parseChoiceSafe");
    __name(log, "log");
    __name(generateOutreachMessage, "generateOutreachMessage");
    __name(generateQuickSummary, "generateQuickSummary");
  }
});

// src/services/analysis-orchestrator.ts
async function runAnalysis(profile, business, analysisType, env, requestId) {
  const startTime = Date.now();
  let triageTime = 0;
  let preprocessorTime = 0;
  let analysisTime = 0;
  const costs = [];
  const blocksUsed = [];
  const enrichedBusiness = {
    ...business,
    business_one_liner: business.business_one_liner || null,
    business_context_pack: business.business_context_pack || null
  };
  if (!enrichedBusiness.business_one_liner || !enrichedBusiness.business_context_pack) {
    logger("warn", "Business context missing, generating fallback", { business_id: business.id, requestId });
    const generatedContext = await ensureBusinessContext(business, env, requestId);
    Object.assign(enrichedBusiness, generatedContext);
  }
  logger("info", "Starting analysis orchestration", {
    username: profile.username,
    analysisType,
    business_name: enrichedBusiness.business_name || enrichedBusiness.name,
    has_one_liner: !!enrichedBusiness.business_one_liner
  }, requestId);
  try {
    const triageStart = Date.now();
    const snapshot = createMicroSnapshot(profile);
    const triageResponse = await runTriage(snapshot, enrichedBusiness.business_one_liner, env, requestId);
    triageTime = Date.now() - triageStart;
    costs.push(triageResponse.costDetails);
    blocksUsed.push("triage");
    logger("info", "Triage completed, proceeding to analysis", {
      username: profile.username,
      lead_score: triageResponse.result.lead_score,
      data_richness: triageResponse.result.data_richness
    }, requestId);
    const needsPreprocessor = shouldRunPreprocessor(analysisType, triageResponse.result);
    let preprocessorResult = null;
    if (needsPreprocessor) {
      const preprocessorStart = Date.now();
      try {
        const preprocessorResponse = await runPreprocessor(profile, env, requestId);
        preprocessorTime = Date.now() - preprocessorStart;
        preprocessorResult = preprocessorResponse.result;
        costs.push(preprocessorResponse.costDetails);
        blocksUsed.push("preprocessor");
        logger("info", "Preprocessor completed", {
          username: profile.username,
          cached: preprocessorResponse.costDetails.actual_cost === 0,
          themes: preprocessorResult.content_themes?.length || 0
        }, requestId);
      } catch (prepError) {
        preprocessorTime = Date.now() - preprocessorStart;
        logger("warn", "Preprocessor failed, continuing without it", {
          error: prepError.message
        }, requestId);
      }
    }
    const analysisStart = Date.now();
    const context = {
      triage: triageResponse.result,
      preprocessor: preprocessorResult
    };
    const analysisResponse = await performAIAnalysis(
      profile,
      enrichedBusiness,
      analysisType,
      env,
      requestId,
      context
    );
    analysisTime = Date.now() - analysisStart;
    costs.push(analysisResponse.costDetails);
    blocksUsed.push(analysisType);
    const totalTime = Date.now() - startTime;
    logger("info", "Analysis orchestration completed", {
      username: profile.username,
      analysisType,
      overall_score: analysisResponse.result.score,
      blocks_used: blocksUsed.join("+"),
      total_ms: totalTime,
      total_cost: aggregateCosts(costs).actual_cost
    }, requestId);
    return {
      result: analysisResponse.result,
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: "success"
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger("error", "Analysis orchestration failed", {
      username: profile.username,
      error: error.message,
      blocks_completed: blocksUsed.join("+"),
      total_ms: totalTime
    }, requestId);
    return {
      result: { error: error.message },
      totalCost: aggregateCosts(costs),
      performance: {
        triage_ms: triageTime,
        preprocessor_ms: preprocessorTime,
        analysis_ms: analysisTime,
        total_ms: totalTime
      },
      verdict: "error"
    };
  }
}
function shouldRunPreprocessor(analysisType, triageResult) {
  switch (analysisType) {
    case "light":
      return false;
    // Light never needs preprocessor
    case "deep":
      return triageResult.data_richness >= 70;
    // Deep only if rich data
    case "xray":
      return true;
    // X-ray always needs preprocessor
    default:
      return false;
  }
}
function aggregateCosts(costs) {
  return {
    actual_cost: costs.reduce((sum, cost) => sum + (cost.actual_cost || 0), 0),
    tokens_in: costs.reduce((sum, cost) => sum + (cost.tokens_in || 0), 0),
    tokens_out: costs.reduce((sum, cost) => sum + (cost.tokens_out || 0), 0),
    blocks_used: costs.map((cost) => cost.block_type).filter(Boolean),
    total_blocks: costs.length
  };
}
var init_analysis_orchestrator = __esm({
  "src/services/analysis-orchestrator.ts"() {
    init_micro_snapshot();
    init_triage();
    init_preprocessor();
    init_ai_analysis();
    init_logger();
    __name(runAnalysis, "runAnalysis");
    __name(shouldRunPreprocessor, "shouldRunPreprocessor");
    __name(aggregateCosts, "aggregateCosts");
  }
});

// src/services/database.ts
async function upsertLead(leadData, env) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json"
  };
  try {
    logger("info", "Upserting lead record", {
      username: leadData.username,
      business_id: leadData.business_id
    });
    const cleanLeadData = {
      user_id: leadData.user_id,
      business_id: leadData.business_id,
      username: leadData.username,
      display_name: leadData.full_name || leadData.displayName || null,
      profile_picture_url: leadData.profile_pic_url || leadData.profilePicUrl || null,
      bio_text: leadData.bio || null,
      external_website_url: leadData.external_url || leadData.externalUrl || null,
      // Profile metrics
      follower_count: parseInt(leadData.followers_count || leadData.followersCount) || 0,
      following_count: parseInt(leadData.following_count || leadData.followingCount) || 0,
      post_count: parseInt(leadData.posts_count || leadData.postsCount) || 0,
      // Profile attributes
      is_verified_account: leadData.is_verified || leadData.isVerified || false,
      is_private_account: leadData.is_private || leadData.isPrivate || false,
      is_business_account: leadData.is_business_account || leadData.isBusinessAccount || false,
      // Platform info
      platform_type: "instagram",
      profile_url: leadData.profile_url || `https://instagram.com/${leadData.username}`,
      // Update timestamp
      last_updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const upsertQuery = `
      ${env.SUPABASE_URL}/rest/v1/leads?on_conflict=user_id,username,business_id
    `;
    const leadResponse = await fetch(upsertQuery, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify(cleanLeadData)
    });
    if (!leadResponse.ok) {
      const errorText = await leadResponse.text();
      throw new Error(`Failed to upsert lead: ${leadResponse.status} - ${errorText}`);
    }
    const leadResult = await leadResponse.json();
    if (!leadResult || !leadResult.length) {
      throw new Error("Failed to create/update lead record - no data returned");
    }
    const lead_id = leadResult[0].lead_id;
    logger("info", "Lead upserted successfully", { lead_id, username: leadData.username });
    return lead_id;
  } catch (error) {
    logger("error", "upsertLead failed", { error: error.message });
    throw new Error(`Lead upsert failed: ${error.message}`);
  }
}
async function insertAnalysisRun(lead_id, user_id, business_id, analysisType, analysisResult2, env) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json"
  };
  try {
    logger("info", "Inserting analysis run", {
      lead_id,
      analysisType,
      score: analysisResult2.score
    });
    const runData = {
      lead_id,
      user_id,
      business_id,
      analysis_type: analysisType,
      analysis_version: "1.0",
      // Universal scores (required for all analysis types)
      overall_score: Math.round(parseFloat(analysisResult2.score) || 0),
      niche_fit_score: Math.round(parseFloat(analysisResult2.niche_fit) || 0),
      engagement_score: Math.round(parseFloat(analysisResult2.engagement_score) || 0),
      // Quick reference data
      summary_text: analysisResult2.quick_summary || null,
      confidence_level: parseFloat(analysisResult2.confidence_level) || null,
      // Processing metadata
      run_status: "completed",
      ai_model_used: "gpt-4o",
      analysis_completed_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const runResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/runs`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(runData)
    });
    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      throw new Error(`Failed to insert run: ${runResponse.status} - ${errorText}`);
    }
    const runResult = await runResponse.json();
    if (!runResult || !runResult.length) {
      throw new Error("Failed to create run record - no data returned");
    }
    const run_id = runResult[0].run_id;
    logger("info", "Analysis run inserted successfully", { run_id, analysisType });
    return run_id;
  } catch (error) {
    logger("error", "insertAnalysisRun failed", { error: error.message });
    throw new Error(`Run insert failed: ${error.message}`);
  }
}
async function insertAnalysisPayload(run_id, lead_id, user_id, business_id, analysisType, analysisData, env) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json"
  };
  try {
    logger("info", "Inserting analysis payload", {
      run_id,
      analysisType,
      dataKeys: Object.keys(analysisData || {}).length
    });
    let structuredPayload;
    switch (analysisType) {
      case "light":
        structuredPayload = {
          insights: analysisData.selling_points || [],
          audience_quality: analysisData.audience_quality || "Unknown",
          basic_demographics: analysisData.engagement_insights || null,
          engagement_summary: `Avg engagement: ${analysisData.engagement_score || 0}%`
        };
        break;
      case "deep":
        structuredPayload = {
          deep_summary: analysisData.deep_summary || null,
          selling_points: analysisData.selling_points || [],
          outreach_message: analysisData.outreach_message || null,
          engagement_breakdown: {
            avg_likes: parseInt(analysisData.avg_likes) || 0,
            avg_comments: parseInt(analysisData.avg_comments) || 0,
            engagement_rate: parseFloat(analysisData.engagement_rate) || 0
          },
          latest_posts: analysisData.latest_posts || null,
          audience_insights: analysisData.engagement_insights || null,
          reasons: analysisData.reasons || []
        };
        break;
      case "xray":
        structuredPayload = {
          copywriter_profile: analysisData.copywriter_profile || {},
          commercial_intelligence: analysisData.commercial_intelligence || {},
          persuasion_strategy: analysisData.persuasion_strategy || {}
        };
        break;
      default:
        structuredPayload = analysisData;
    }
    const payloadData = {
      run_id,
      lead_id,
      user_id,
      business_id,
      analysis_type: analysisType,
      analysis_data: structuredPayload,
      data_size_bytes: JSON.stringify(structuredPayload).length
    };
    const payloadResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/payloads`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(payloadData)
    });
    if (!payloadResponse.ok) {
      const errorText = await payloadResponse.text();
      throw new Error(`Failed to insert payload: ${payloadResponse.status} - ${errorText}`);
    }
    const payloadResult = await payloadResponse.json();
    if (!payloadResult || !payloadResult.length) {
      throw new Error("Failed to create payload record - no data returned");
    }
    const payload_id = payloadResult[0].payload_id;
    logger("info", "Analysis payload inserted successfully", { payload_id, analysisType });
    return payload_id;
  } catch (error) {
    logger("error", "insertAnalysisPayload failed", { error: error.message });
    throw new Error(`Payload insert failed: ${error.message}`);
  }
}
async function saveCompleteAnalysis(leadData, analysisData, analysisType, env) {
  try {
    logger("info", "Starting complete analysis save", {
      username: leadData.username,
      analysisType
    });
    const lead_id = await upsertLead(leadData, env);
    const run_id = await insertAnalysisRun(
      lead_id,
      leadData.user_id,
      leadData.business_id,
      analysisType,
      analysisData || analysisResult,
      // Use analysisResult if analysisData is null
      env
    );
    if (analysisData && (analysisType === "deep" || analysisType === "xray")) {
      await insertAnalysisPayload(
        run_id,
        lead_id,
        leadData.user_id,
        leadData.business_id,
        analysisType,
        analysisData,
        env
      );
    }
    logger("info", "Complete analysis save successful", {
      lead_id,
      run_id,
      analysisType
    });
    return run_id;
  } catch (error) {
    logger("error", "saveCompleteAnalysis failed", { error: error.message });
    throw new Error(`Complete analysis save failed: ${error.message}`);
  }
}
async function updateCreditsAndTransaction(user_id, cost, newBalance, description, transactionType, env, run_id, costDetails) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json"
  };
  try {
    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/users?id=eq.${user_id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ credits: newBalance })
      },
      1e4
    );
    const transactionData = {
      user_id,
      amount: -cost,
      type: transactionType,
      description,
      run_id: run_id || null,
      actual_cost: costDetails?.actual_cost || null,
      tokens_in: costDetails?.tokens_in || null,
      tokens_out: costDetails?.tokens_out || null,
      model_used: costDetails?.model_used || null,
      block_type: costDetails?.block_type || null,
      processing_duration_ms: costDetails?.processing_duration_ms || null,
      blocks_used: costDetails?.blocks_used?.join("+") || null,
      margin: cost - (costDetails?.actual_cost || 0)
      // Track profit margin
    };
    await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/credit_transactions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(transactionData)
      },
      1e4
    );
  } catch (error) {
    logger("error", "updateCreditsAndTransaction error:", error.message);
    throw new Error(`Failed to update credits: ${error.message}`);
  }
}
async function fetchUserAndCredits(user_id, env) {
  try {
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/users?select=*&id=eq.${user_id}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`User fetch failed: ${response.status}`);
    }
    const users = await response.json();
    if (!users.length) {
      return { isValid: false, error: "User not found" };
    }
    const user = users[0];
    return {
      isValid: true,
      credits: user.credits || 0,
      userId: user.id
    };
  } catch (error) {
    logger("error", "fetchUserAndCredits failed", { error: error.message });
    return { isValid: false, error: error.message };
  }
}
async function fetchBusinessProfile(business_id, user_id, env) {
  try {
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/business_profiles?select=*,business_one_liner,business_context_pack,context_version,context_updated_at&id=eq.${business_id}&user_id=eq.${user_id}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error(`Business profile fetch failed: ${response.status}`);
    }
    const profiles = await response.json();
    if (!profiles.length) {
      throw new Error("Business profile not found or access denied");
    }
    return profiles[0];
  } catch (error) {
    logger("error", "fetchBusinessProfile failed", { error: error.message });
    throw new Error(`Business profile fetch failed: ${error.message}`);
  }
}
var init_database = __esm({
  "src/services/database.ts"() {
    init_helpers();
    init_logger();
    __name(upsertLead, "upsertLead");
    __name(insertAnalysisRun, "insertAnalysisRun");
    __name(insertAnalysisPayload, "insertAnalysisPayload");
    __name(saveCompleteAnalysis, "saveCompleteAnalysis");
    __name(updateCreditsAndTransaction, "updateCreditsAndTransaction");
    __name(fetchUserAndCredits, "fetchUserAndCredits");
    __name(fetchBusinessProfile, "fetchBusinessProfile");
  }
});

// src/services/instagram-scraper.ts
var instagram_scraper_exports = {};
__export(instagram_scraper_exports, {
  scrapeInstagramProfile: () => scrapeInstagramProfile
});
async function scrapeInstagramProfile(username, analysisType, env) {
  const apifyToken = await getApiKey("APIFY_API_TOKEN", env);
  if (!apifyToken) {
    throw new Error("Profile scraping service not configured");
  }
  logger("info", "Starting profile scraping", { username, analysisType });
  try {
    if (analysisType === "light") {
      logger("info", "Using light scraper for basic profile data");
      const lightInput = {
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      };
      const profileResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lightInput)
        },
        3,
        2e3,
        3e4
      );
      logger("info", "Light scraper raw response", {
        isArray: Array.isArray(profileResponse),
        length: profileResponse?.length,
        firstItem: profileResponse?.[0] ? Object.keys(profileResponse[0]).slice(0, 10) : "undefined",
        responseType: typeof profileResponse
      });
      if (!profileResponse || !Array.isArray(profileResponse) || profileResponse.length === 0) {
        throw new Error("Profile not found or private");
      }
      const profileData = validateProfileData(profileResponse[0], "light");
      profileData.scraperUsed = "light";
      profileData.dataQuality = "medium";
      return profileData;
    } else if (analysisType === "deep") {
      logger("info", "Deep analysis: Starting with deep scraper configurations");
      const deepConfigs = [
        {
          name: "primary_deep",
          input: {
            directUrls: [`https://instagram.com/${username}/`],
            resultsLimit: 12,
            addParentData: false,
            enhanceUserSearchWithFacebookPage: false,
            onlyPostsNewerThan: "2024-01-01",
            resultsType: "details",
            searchType: "hashtag"
          }
        },
        {
          name: "alternative_deep",
          input: {
            directUrls: [`https://www.instagram.com/${username}/`],
            resultsLimit: 10,
            addParentData: true,
            enhanceUserSearchWithFacebookPage: false,
            onlyPostsNewerThan: "2023-06-01",
            resultsType: "details"
          }
        }
      ];
      let lastError = null;
      for (const config of deepConfigs) {
        try {
          logger("info", `Trying deep scraper config: ${config.name}`, { username });
          const deepResponse = await callWithRetry(
            `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${apifyToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config.input)
            },
            2,
            3e3,
            6e4
          );
          logger("info", `Deep scraper (${config.name}) response received`, {
            responseLength: deepResponse?.length,
            hasData: !!deepResponse?.[0]
          });
          if (deepResponse && Array.isArray(deepResponse) && deepResponse.length > 0) {
            const profileItems = deepResponse.filter((item) => item.username || item.ownerUsername);
            const postItems = deepResponse.filter((item) => item.shortCode && item.likesCount !== void 0);
            logger("info", "Deep scraper data analysis", {
              totalItems: deepResponse.length,
              profileItems: profileItems.length,
              postItems: postItems.length,
              config: config.name
            });
            if (profileItems.length === 0) {
              logger("warn", `No profile data found in ${config.name} response`);
              continue;
            }
            const profileData = validateProfileData(deepResponse, "deep");
            profileData.scraperUsed = config.name;
            profileData.dataQuality = postItems.length >= 3 ? "high" : postItems.length >= 1 ? "medium" : "low";
            logger("info", "Deep scraping successful", {
              username: profileData.username,
              postsFound: profileData.latestPosts?.length || 0,
              hasRealEngagement: !!profileData.engagement,
              avgLikes: profileData.engagement?.avgLikes || "N/A",
              avgComments: profileData.engagement?.avgComments || "N/A",
              engagementRate: profileData.engagement?.engagementRate || "N/A",
              dataQuality: profileData.dataQuality
            });
            return profileData;
          } else {
            throw new Error(`${config.name} returned no usable data`);
          }
        } catch (configError) {
          logger("warn", `Deep scraper config ${config.name} failed`, { error: configError.message });
          lastError = configError;
          continue;
        }
      }
      logger("warn", "All deep scraper configs failed, falling back to light scraper - NO ENGAGEMENT DATA");
      const lightInput = {
        usernames: [username],
        resultsType: "details",
        resultsLimit: 1
      };
      const lightResponse = await callWithRetry(
        `https://api.apify.com/v2/acts/dSCLg0C3YEZ83HzYX/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lightInput)
        },
        3,
        2e3,
        3e4
      );
      if (!lightResponse || !Array.isArray(lightResponse) || lightResponse.length === 0) {
        throw new Error("Profile not found on any scraper");
      }
      const profile = lightResponse[0];
      const fallbackProfile = {
        username: profile.username || username,
        displayName: profile.fullName || profile.displayName || "",
        bio: profile.biography || profile.bio || "",
        followersCount: parseInt(profile.followersCount) || 0,
        followingCount: parseInt(profile.followingCount) || 0,
        postsCount: parseInt(profile.postsCount) || 0,
        isVerified: Boolean(profile.verified || profile.isVerified),
        isPrivate: Boolean(profile.private || profile.isPrivate),
        profilePicUrl: profile.profilePicUrl || profile.profilePicture || "",
        externalUrl: profile.externalUrl || profile.website || "",
        isBusinessAccount: Boolean(profile.isBusinessAccount),
        latestPosts: [],
        engagement: void 0,
        // NO FAKE DATA - explicitly undefined
        scraperUsed: "light_fallback",
        dataQuality: "low"
      };
      logger("info", "Fallback scraping completed - NO ENGAGEMENT DATA AVAILABLE", {
        username: fallbackProfile.username,
        followers: fallbackProfile.followersCount,
        dataNote: "Real engagement data could not be scraped"
      });
      return fallbackProfile;
    } else if (analysisType === "xray") {
      logger("info", "X-Ray analysis: Using deep scraper for comprehensive data");
      return scrapeInstagramProfile(username, "deep", env);
    }
  } catch (error) {
    logger("error", "All scraping methods failed", { username, error: error.message });
    let errorMessage = "Failed to retrieve profile data";
    if (error.message.includes("not found") || error.message.includes("404")) {
      errorMessage = "Instagram profile not found";
    } else if (error.message.includes("private") || error.message.includes("403")) {
      errorMessage = "This Instagram profile is private";
    } else if (error.message.includes("rate limit") || error.message.includes("429")) {
      errorMessage = "Instagram is temporarily limiting requests. Please try again in a few minutes.";
    } else if (error.message.includes("timeout")) {
      errorMessage = "Profile scraping timed out. Please try again.";
    }
    throw new Error(errorMessage);
  }
}
var init_instagram_scraper = __esm({
  "src/services/instagram-scraper.ts"() {
    init_logger();
    init_helpers();
    init_validation();
    init_enhanced_config_manager();
    __name(scrapeInstagramProfile, "scrapeInstagramProfile");
  }
});

// src/handlers/analyze.ts
var analyze_exports = {};
__export(analyze_exports, {
  handleAnalyze: () => handleAnalyze
});
async function handleAnalyze(c) {
  const requestId = generateRequestId();
  try {
    logger("info", "Analysis request received", { requestId });
    const body = await c.req.json();
    const {
      profile_url,
      username,
      analysis_type,
      business_id,
      user_id,
      workflow = "auto",
      // NEW: Default to auto workflow
      model_tier = "balanced",
      // NEW: Default to balanced tier
      force_model
      // NEW: Optional model override
    } = normalizeRequest(body);
    logger("info", "Request validated", {
      requestId,
      username,
      analysis_type,
      business_id
    });
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    if (!userResult.isValid) {
      return c.json(createStandardResponse(
        false,
        void 0,
        userResult.error,
        requestId
      ), 400);
    }
    const creditCost = analysis_type === "deep" ? 2 : analysis_type === "xray" ? 3 : 1;
    if (userResult.credits < creditCost) {
      return c.json(createStandardResponse(
        false,
        void 0,
        `Insufficient credits. Need ${creditCost}, have ${userResult.credits}`,
        requestId
      ), 402);
    }
    logger("info", "User validation passed", {
      userId: user_id,
      credits: userResult.credits,
      creditCost
    });
    let profileData;
    try {
      logger("info", "Starting profile scraping", { username });
      const { scrapeInstagramProfile: scrapeInstagramProfile2 } = await Promise.resolve().then(() => (init_instagram_scraper(), instagram_scraper_exports));
      profileData = await scrapeInstagramProfile2(username, analysis_type, c.env);
      logger("info", "Profile scraping completed", {
        username: profileData.username,
        followersCount: profileData.followersCount,
        dataQuality: profileData.dataQuality
      });
    } catch (scrapeError) {
      if (scrapeError.message === "PROFILE_NOT_FOUND") {
        logger("info", "Profile not found", { username });
        return c.json(createStandardResponse(
          false,
          void 0,
          "Instagram profile not found",
          requestId
        ), 404);
      }
      logger("error", "Profile scraping failed", { error: scrapeError.message });
      return c.json(createStandardResponse(
        false,
        void 0,
        `Profile scraping failed: ${scrapeError.message}`,
        requestId
      ), 500);
    }
    let orchestrationResult;
    try {
      orchestrationResult = await runAnalysis(
        profileData,
        business,
        analysis_type,
        c.env,
        requestId
      );
      if (orchestrationResult.verdict === "early_exit") {
        return c.json(createStandardResponse(true, {
          ...orchestrationResult.result,
          performance: orchestrationResult.performance,
          credits_used: 0
          // No credits charged for early exit
        }, void 0, requestId));
      }
      if (orchestrationResult.verdict === "error") {
        return c.json(createStandardResponse(
          false,
          void 0,
          `Analysis failed: ${orchestrationResult.result.error}`,
          requestId
        ), 500);
      }
    } catch (orchestrationError) {
      logger("error", "Analysis orchestration failed", { error: orchestrationError.message });
      return c.json(createStandardResponse(
        false,
        void 0,
        `Analysis orchestration failed: ${orchestrationError.message}`,
        requestId
      ), 500);
    }
    const analysisResult2 = orchestrationResult.result;
    const leadData = {
      user_id,
      business_id,
      username: profileData.username,
      full_name: profileData.displayName,
      profile_pic_url: profileData.profilePicUrl,
      bio: profileData.bio,
      external_url: profileData.externalUrl,
      followers_count: profileData.followersCount,
      following_count: profileData.followingCount,
      posts_count: profileData.postsCount,
      is_verified: profileData.isVerified,
      is_private: profileData.isPrivate,
      is_business_account: profileData.isBusinessAccount || false,
      profile_url
    };
    let analysisData = null;
    if (analysis_type === "deep" || analysis_type === "xray") {
      analysisData = {
        ...analysisResult2,
        // Engagement data from scraping
        avg_likes: profileData.engagement?.avgLikes || 0,
        avg_comments: profileData.engagement?.avgComments || 0,
        engagement_rate: profileData.engagement?.engagementRate || 0,
        // Structured data
        latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
        engagement_data: profileData.engagement ? JSON.stringify({
          avg_likes: profileData.engagement.avgLikes,
          avg_comments: profileData.engagement.avgComments,
          engagement_rate: profileData.engagement.engagementRate,
          posts_analyzed: profileData.engagement.postsAnalyzed,
          data_source: "real_scraped_calculation"
        }) : null,
        // Analysis metadata
        analysis_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        ai_model_used: "gpt-4o",
        scraperUsed: profileData.scraperUsed,
        dataQuality: profileData.dataQuality
      };
    }
    let run_id;
    try {
      run_id = await saveCompleteAnalysis(leadData, analysisResult2, analysis_type, c.env);
      logger("info", "Database save successful", { run_id, username: profileData.username });
    } catch (saveError) {
      logger("error", "Database save failed", { error: saveError.message });
      return c.json(createStandardResponse(
        false,
        void 0,
        `Database save failed: ${saveError.message}`,
        requestId
      ), 500);
    }
    let finalCreditCost = creditCost;
    try {
      const { calculateCreditCost: calculateCreditCost2 } = await Promise.resolve().then(() => (init_models(), models_exports));
      const totalTokens = orchestrationResult.totalCost.tokens_in + orchestrationResult.totalCost.tokens_out;
      const dynamicCreditCost = calculateCreditCost2(analysis_type, orchestrationResult.totalCost.actual_cost, totalTokens);
      finalCreditCost = Math.max(creditCost, dynamicCreditCost);
      const costDetails = {
        actual_cost: orchestrationResult.totalCost.actual_cost,
        tokens_in: orchestrationResult.totalCost.tokens_in,
        tokens_out: orchestrationResult.totalCost.tokens_out,
        model_used: orchestrationResult.totalCost.blocks_used.join("+"),
        block_type: orchestrationResult.totalCost.blocks_used.join("+"),
        processing_duration_ms: orchestrationResult.performance.total_ms,
        blocks_used: orchestrationResult.totalCost.blocks_used
      };
      const newBalance = userResult.credits - finalCreditCost;
      await updateCreditsAndTransaction(
        user_id,
        finalCreditCost,
        newBalance,
        `${analysis_type} analysis (${orchestrationResult.totalCost.blocks_used.join("+")})`,
        "use",
        c.env,
        run_id,
        costDetails
      );
      logger("info", "Credits updated with cost tracking", {
        userId: user_id,
        creditsCharged: finalCreditCost,
        actualCost: costDetails.actual_cost,
        margin: finalCreditCost - costDetails.actual_cost,
        tokensCapped: totalTokens > 2200,
        remaining: newBalance,
        blocks: orchestrationResult.totalCost.blocks_used.join("+"),
        processingMs: orchestrationResult.performance.total_ms
      });
    } catch (creditError) {
      logger("error", "Credit update failed", { error: creditError.message });
    }
    const responseData = {
      run_id,
      profile: {
        username: profileData.username,
        displayName: profileData.displayName,
        followersCount: profileData.followersCount,
        isVerified: profileData.isVerified,
        profilePicUrl: profileData.profilePicUrl,
        dataQuality: profileData.dataQuality || "medium",
        scraperUsed: profileData.scraperUsed || "unknown"
      },
      analysis: {
        overall_score: analysisResult2.score,
        niche_fit_score: analysisResult2.niche_fit,
        engagement_score: analysisResult2.engagement_score,
        type: analysis_type,
        confidence_level: analysisResult2.confidence_level,
        summary_text: analysisResult2.quick_summary,
        // Include detailed data for deep/xray analyses
        ...analysis_type === "deep" && {
          audience_quality: analysisResult2.audience_quality,
          selling_points: analysisResult2.selling_points,
          reasons: analysisResult2.reasons,
          deep_summary: analysisResult2.deep_summary,
          outreach_message: analysisData?.outreach_message || null,
          engagement_breakdown: profileData.engagement ? {
            avg_likes: profileData.engagement.avgLikes,
            avg_comments: profileData.engagement.avgComments,
            engagement_rate: profileData.engagement.engagementRate,
            posts_analyzed: profileData.engagement.postsAnalyzed,
            data_source: "real_scraped_calculation"
          } : {
            data_source: "no_real_data_available",
            avg_likes: 0,
            avg_comments: 0,
            engagement_rate: 0
          }
        },
        ...analysis_type === "xray" && {
          copywriter_profile: analysisData?.copywriter_profile || {},
          commercial_intelligence: analysisData?.commercial_intelligence || {},
          persuasion_strategy: analysisData?.persuasion_strategy || {}
        }
      },
      credits: {
        used: finalCreditCost,
        remaining: userResult.credits - finalCreditCost,
        actual_cost: orchestrationResult.totalCost.actual_cost,
        margin: finalCreditCost - orchestrationResult.totalCost.actual_cost
      },
      metadata: {
        request_id: requestId,
        analysis_completed_at: (/* @__PURE__ */ new Date()).toISOString(),
        schema_version: "3.0",
        orchestration: {
          blocks_used: orchestrationResult.totalCost.blocks_used,
          performance_ms: orchestrationResult.performance,
          total_cost: orchestrationResult.totalCost.actual_cost
        }
      }
    };
    logger("info", "Analysis completed successfully", {
      run_id,
      username: profileData.username,
      overall_score: analysisResult2.score,
      confidence: analysisResult2.confidence_level,
      dataQuality: profileData.dataQuality
    });
    return c.json(createStandardResponse(true, responseData, void 0, requestId));
  } catch (error) {
    logger("error", "Analysis request failed", { error: error.message, requestId });
    return c.json(createStandardResponse(
      false,
      void 0,
      error.message,
      requestId
    ), 500);
  }
}
var init_analyze = __esm({
  "src/handlers/analyze.ts"() {
    init_logger();
    init_response();
    init_validation();
    init_analysis_orchestrator();
    init_database();
    __name(handleAnalyze, "handleAnalyze");
  }
});

// src/handlers/bulk-analyze.ts
var bulk_analyze_exports = {};
__export(bulk_analyze_exports, {
  handleBulkAnalyze: () => handleBulkAnalyze
});
async function handleBulkAnalyze(c) {
  const requestId = generateRequestId();
  try {
    logger("info", "Bulk analysis request received", { requestId });
    const body = await c.req.json();
    const { profiles, analysis_type, business_id, user_id } = body;
    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return c.json(createStandardResponse(
        false,
        void 0,
        "profiles array is required and cannot be empty",
        requestId
      ), 400);
    }
    if (!analysis_type || !["light", "deep", "xray"].includes(analysis_type)) {
      return c.json(createStandardResponse(
        false,
        void 0,
        'analysis_type must be "light", "deep", or "xray"',
        requestId
      ), 400);
    }
    if (!business_id || !user_id) {
      return c.json(createStandardResponse(
        false,
        void 0,
        "business_id and user_id are required",
        requestId
      ), 400);
    }
    const profileCount = profiles.length;
    if (profileCount > 50) {
      return c.json(createStandardResponse(
        false,
        void 0,
        "Maximum 50 profiles per bulk request",
        requestId
      ), 400);
    }
    logger("info", "Bulk request validated", {
      requestId,
      profileCount,
      analysis_type,
      business_id
    });
    const [userResult, business] = await Promise.all([
      fetchUserAndCredits(user_id, c.env),
      fetchBusinessProfile(business_id, user_id, c.env)
    ]);
    if (!userResult.isValid) {
      return c.json(createStandardResponse(
        false,
        void 0,
        userResult.error,
        requestId
      ), 400);
    }
    const creditCostPerAnalysis = analysis_type === "deep" ? 2 : analysis_type === "xray" ? 3 : 1;
    const totalCreditCost = profileCount * creditCostPerAnalysis;
    if (userResult.credits < totalCreditCost) {
      return c.json(createStandardResponse(
        false,
        void 0,
        `Insufficient credits. Need ${totalCreditCost}, have ${userResult.credits}`,
        requestId
      ), 402);
    }
    logger("info", "User validation passed for bulk analysis", {
      userId: user_id,
      credits: userResult.credits,
      totalCreditCost,
      profileCount
    });
    const results = [];
    const errors = [];
    let creditsUsed = 0;
    const { scrapeInstagramProfile: scrapeInstagramProfile2 } = await Promise.resolve().then(() => (init_instagram_scraper(), instagram_scraper_exports));
    const { performAIAnalysis: performAIAnalysis2 } = await Promise.resolve().then(() => (init_ai_analysis(), ai_analysis_exports));
    const BATCH_SIZE = 5;
    for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
      const batch = profiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (profile) => {
        const profileId = `${i + batch.indexOf(profile) + 1}`;
        try {
          logger("info", `Processing profile ${profileId}/${profileCount}`, { profile });
          const username = extractUsername(profile);
          if (!username) {
            throw new Error("Invalid username or URL format");
          }
          const profile_url = profile.includes("instagram.com") ? profile : `https://instagram.com/${username}`;
          let profileData;
          try {
            profileData = await scrapeInstagramProfile2(profile_url, c.env);
            logger("info", `Profile scraped successfully`, {
              username: profileData.username,
              followersCount: profileData.followersCount
            });
          } catch (scrapeError) {
            throw new Error(`Scraping failed: ${scrapeError.message}`);
          }
          let analysisResult2;
          try {
            analysisResult2 = await performAIAnalysis2(profileData, analysis_type, user_id, c.env);
            logger("info", `AI analysis completed`, {
              username: profileData.username,
              score: analysisResult2.score
            });
          } catch (analysisError) {
            throw new Error(`AI analysis failed: ${analysisError.message}`);
          }
          const leadData = {
            user_id,
            business_id,
            username: profileData.username,
            full_name: profileData.displayName,
            profile_pic_url: profileData.profilePicUrl,
            bio: profileData.bio,
            external_url: profileData.externalUrl,
            followers_count: profileData.followersCount,
            following_count: profileData.followingCount,
            posts_count: profileData.postsCount,
            is_verified: profileData.isVerified,
            is_private: profileData.isPrivate,
            is_business_account: profileData.isBusinessAccount || false,
            profile_url
          };
          let analysisData = null;
          if (analysis_type === "deep" || analysis_type === "xray") {
            analysisData = {
              ...analysisResult2,
              // Engagement data from scraping
              avg_likes: profileData.engagement?.avgLikes || 0,
              avg_comments: profileData.engagement?.avgComments || 0,
              engagement_rate: profileData.engagement?.engagementRate || 0,
              // Structured data
              latest_posts: profileData.latestPosts ? JSON.stringify(profileData.latestPosts) : null,
              engagement_data: profileData.engagement ? JSON.stringify({
                avg_likes: profileData.engagement.avgLikes,
                avg_comments: profileData.engagement.avgComments,
                engagement_rate: profileData.engagement.engagementRate,
                posts_analyzed: profileData.engagement.postsAnalyzed,
                data_source: "real_scraped_calculation"
              }) : null,
              // Analysis metadata
              analysis_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              ai_model_used: "gpt-4o",
              scraperUsed: profileData.scraperUsed,
              dataQuality: profileData.dataQuality
            };
          }
          let run_id;
          try {
            run_id = await saveCompleteAnalysis(leadData, analysisData, analysis_type, c.env);
            logger("info", `Database save successful for ${profileData.username}`, { run_id });
          } catch (saveError) {
            throw new Error(`Database save failed: ${saveError.message}`);
          }
          creditsUsed += creditCostPerAnalysis;
          const responseData = {
            run_id,
            profile: {
              username: profileData.username,
              displayName: profileData.displayName,
              followersCount: profileData.followersCount,
              isVerified: profileData.isVerified,
              profilePicUrl: profileData.profilePicUrl,
              dataQuality: profileData.dataQuality || "medium",
              scraperUsed: profileData.scraperUsed || "unknown"
            },
            analysis: {
              overall_score: analysisResult2.score,
              niche_fit_score: analysisResult2.niche_fit,
              engagement_score: analysisResult2.engagement_score,
              type: analysis_type,
              confidence_level: analysisResult2.confidence_level,
              summary_text: analysisResult2.quick_summary,
              // Include detailed data for deep/xray analyses
              ...analysis_type === "deep" && {
                audience_quality: analysisResult2.audience_quality,
                selling_points: analysisResult2.selling_points,
                reasons: analysisResult2.reasons,
                deep_summary: analysisResult2.deep_summary,
                outreach_message: analysisData?.outreach_message || null,
                engagement_breakdown: profileData.engagement ? {
                  avg_likes: profileData.engagement.avgLikes,
                  avg_comments: profileData.engagement.avgComments,
                  engagement_rate: profileData.engagement.engagementRate,
                  posts_analyzed: profileData.engagement.postsAnalyzed,
                  data_source: "real_scraped_calculation"
                } : {
                  data_source: "no_real_data_available",
                  avg_likes: 0,
                  avg_comments: 0,
                  engagement_rate: 0
                }
              },
              ...analysis_type === "xray" && {
                copywriter_profile: analysisData?.copywriter_profile || {},
                commercial_intelligence: analysisData?.commercial_intelligence || {},
                persuasion_strategy: analysisData?.persuasion_strategy || {}
              }
            },
            credits: {
              used: creditCostPerAnalysis,
              remaining: userResult.credits - creditsUsed
            },
            metadata: {
              request_id: requestId,
              analysis_completed_at: (/* @__PURE__ */ new Date()).toISOString(),
              schema_version: "3.0"
            }
          };
          return responseData;
        } catch (error) {
          logger("error", `Profile ${profileId} analysis failed`, {
            profile,
            error: error.message
          });
          errors.push({
            profile,
            error: error.message
          });
          return null;
        }
      });
      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result) => {
        if (result) {
          results.push(result);
        }
      });
      logger("info", `Batch ${Math.floor(i / BATCH_SIZE) + 1} completed`, {
        processed: Math.min(i + BATCH_SIZE, profiles.length),
        total: profiles.length,
        successful: results.length,
        errors: errors.length
      });
    }
    if (creditsUsed > 0) {
      try {
        const newBalance = userResult.credits - creditsUsed;
        await updateCreditsAndTransaction(
          user_id,
          creditsUsed,
          newBalance,
          `Bulk ${analysis_type} analysis - ${results.length} profiles`,
          "use",
          c.env
        );
        logger("info", "Bulk credits updated successfully", {
          creditsUsed,
          remainingCredits: newBalance
        });
      } catch (creditError) {
        logger("error", "Bulk credit update failed", { error: creditError.message });
      }
    }
    const bulkResult = {
      total_requested: profileCount,
      successful: results.length,
      failed: errors.length,
      results,
      errors,
      credits_used: creditsUsed,
      credits_remaining: userResult.credits - creditsUsed
    };
    logger("info", "Bulk analysis completed", {
      requestId,
      totalRequested: profileCount,
      successful: results.length,
      failed: errors.length,
      creditsUsed
    });
    return c.json(createStandardResponse(true, bulkResult, void 0, requestId));
  } catch (error) {
    logger("error", "Bulk analysis request failed", { error: error.message, requestId });
    return c.json(createStandardResponse(
      false,
      void 0,
      error.message,
      requestId
    ), 500);
  }
}
var init_bulk_analyze = __esm({
  "src/handlers/bulk-analyze.ts"() {
    init_logger();
    init_response();
    init_validation();
    init_database();
    __name(handleBulkAnalyze, "handleBulkAnalyze");
  }
});

// src/handlers/legacy.ts
var legacy_exports = {};
__export(legacy_exports, {
  handleLegacyAnalyze: () => handleLegacyAnalyze,
  handleLegacyBulkAnalyze: () => handleLegacyBulkAnalyze
});
async function handleLegacyAnalyze(c) {
  const requestId = generateRequestId();
  logger("info", "Legacy analyze endpoint called, redirecting to v1", { requestId });
  try {
    const body = await c.req.json();
    const normalizedBody = {
      ...body,
      analysis_type: body.analysis_type || body.type || "light"
    };
    const v1Request = new Request(c.req.url.replace("/analyze", "/v1/analyze"), {
      method: "POST",
      headers: c.req.header(),
      body: JSON.stringify(normalizedBody)
    });
    const response = await fetch(v1Request.url, {
      method: v1Request.method,
      headers: Object.fromEntries(v1Request.headers.entries()),
      body: v1Request.body
    });
    return response;
  } catch (error) {
    logger("error", "Legacy endpoint forwarding failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleLegacyBulkAnalyze(c) {
  const requestId = generateRequestId();
  logger("info", "Legacy bulk-analyze endpoint called, redirecting to v1", { requestId });
  try {
    const body = await c.req.json();
    const v1Request = new Request(c.req.url.replace("/bulk-analyze", "/v1/bulk-analyze"), {
      method: "POST",
      headers: c.req.header(),
      body: JSON.stringify(body)
    });
    const response = await fetch(v1Request.url, {
      method: v1Request.method,
      headers: Object.fromEntries(v1Request.headers.entries()),
      body: v1Request.body
    });
    return response;
  } catch (error) {
    logger("error", "Legacy bulk endpoint forwarding failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
var init_legacy = __esm({
  "src/handlers/legacy.ts"() {
    init_logger();
    init_response();
    __name(handleLegacyAnalyze, "handleLegacyAnalyze");
    __name(handleLegacyBulkAnalyze, "handleLegacyBulkAnalyze");
  }
});

// src/handlers/billing.ts
var billing_exports = {};
__export(billing_exports, {
  handleCreateCheckoutSession: () => handleCreateCheckoutSession,
  handleCreatePortalSession: () => handleCreatePortalSession,
  handleStripeWebhook: () => handleStripeWebhook
});
async function handleStripeWebhook(c) {
  const requestId = generateRequestId();
  try {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json(createStandardResponse(false, void 0, "Missing stripe signature", requestId), 400);
    }
    const body = await c.req.text();
    const event = JSON.parse(body);
    logger("info", "Stripe webhook received", { eventType: event.type, requestId });
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    switch (event.type) {
      case "checkout.session.completed":
        await fetch(`${c.env.SUPABASE_URL}/rest/v1/users`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            stripe_customer_id: event.data.object.customer,
            subscription_status: "active",
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
        break;
      case "customer.subscription.deleted":
        await fetch(`${c.env.SUPABASE_URL}/rest/v1/users`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            subscription_status: "cancelled",
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
        break;
      default:
        logger("info", "Unhandled webhook event", { eventType: event.type, requestId });
    }
    return c.json(createStandardResponse(true, { received: true }, void 0, requestId));
  } catch (error) {
    logger("error", "Webhook processing failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 400);
  }
}
async function handleCreateCheckoutSession(c) {
  const requestId = generateRequestId();
  try {
    const body = await c.req.json();
    const { priceId, user_id, successUrl, cancelUrl } = body;
    if (!priceId || !user_id) {
      return c.json(createStandardResponse(false, void 0, "priceId and user_id are required", requestId), 400);
    }
    const stripeSecretKey = await getApiKey("STRIPE_SECRET_KEY", c.env);
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "mode": "subscription",
        "client_reference_id": user_id,
        "success_url": successUrl || `${c.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        "cancel_url": cancelUrl || `${c.env.FRONTEND_URL}/pricing`
      })
    });
    if (!stripeResponse.ok) {
      throw new Error("Failed to create Stripe checkout session");
    }
    const session = await stripeResponse.json();
    return c.json(createStandardResponse(true, {
      sessionId: session.id,
      url: session.url
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Checkout session creation failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleCreatePortalSession(c) {
  const requestId = generateRequestId();
  try {
    const body = await c.req.json();
    const { customerId, returnUrl } = body;
    if (!customerId) {
      return c.json(createStandardResponse(false, void 0, "customerId is required", requestId), 400);
    }
    const stripeSecretKey = await getApiKey("STRIPE_SECRET_KEY", c.env);
    const stripeResponse = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        "customer": customerId,
        "return_url": returnUrl || `${c.env.FRONTEND_URL}/dashboard`
      })
    });
    if (!stripeResponse.ok) {
      throw new Error("Failed to create Stripe portal session");
    }
    const session = await stripeResponse.json();
    return c.json(createStandardResponse(true, { url: session.url }, void 0, requestId));
  } catch (error) {
    logger("error", "Portal session creation failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
var init_billing = __esm({
  "src/handlers/billing.ts"() {
    init_logger();
    init_response();
    init_enhanced_config_manager();
    __name(handleStripeWebhook, "handleStripeWebhook");
    __name(handleCreateCheckoutSession, "handleCreateCheckoutSession");
    __name(handleCreatePortalSession, "handleCreatePortalSession");
  }
});

// src/services/analytics.ts
async function getAnalyticsSummary(env) {
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json"
  };
  try {
    const [leadsWithRuns, payloadsData, usersResponse] = await Promise.all([
      // Get leads with their latest runs
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/leads?select=lead_id,username,follower_count,first_discovered_at,runs(run_id,analysis_type,overall_score,niche_fit_score,engagement_score,created_at)&order=runs.created_at.desc`,
        { headers }
      ),
      // Get payload data for engagement analysis
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/payloads?select=analysis_data,created_at,analysis_type`,
        { headers }
      ),
      // Get user data
      fetchJson(
        `${env.SUPABASE_URL}/rest/v1/users?select=id,created_at,subscription_status,credits`,
        { headers }
      )
    ]);
    const allRuns = leadsWithRuns.flatMap(
      (lead) => lead.runs?.map((run) => ({
        ...run,
        lead_id: lead.lead_id,
        username: lead.username,
        follower_count: lead.follower_count
      })) || []
    );
    const now = /* @__PURE__ */ new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString();
    const totalAnalyses = allRuns.length;
    const recentAnalyses = allRuns.filter((run) => run.created_at > sevenDaysAgo).length;
    const monthlyAnalyses = allRuns.filter((run) => run.created_at > thirtyDaysAgo).length;
    const uniqueLeads = new Set(allRuns.map((run) => run.lead_id)).size;
    const avgOverallScore = totalAnalyses > 0 ? Math.round(allRuns.reduce((sum, run) => sum + (run.overall_score || 0), 0) / totalAnalyses) : 0;
    const avgNicheFitScore = totalAnalyses > 0 ? Math.round(allRuns.reduce((sum, run) => sum + (run.niche_fit_score || 0), 0) / totalAnalyses) : 0;
    const avgEngagementScore = totalAnalyses > 0 ? Math.round(allRuns.reduce((sum, run) => sum + (run.engagement_score || 0), 0) / totalAnalyses) : 0;
    const highScoreAnalyses = allRuns.filter((run) => (run.overall_score || 0) > 75).length;
    const conversionRate = totalAnalyses > 0 ? Math.round(highScoreAnalyses / totalAnalyses * 100) : 0;
    const deepPayloads = payloadsData.filter((p) => p.analysis_type === "deep");
    let avgEngagementRate = 0;
    if (deepPayloads.length > 0) {
      const engagementRates = deepPayloads.map((p) => p.analysis_data?.engagement_breakdown?.engagement_rate || 0).filter((rate) => rate > 0);
      avgEngagementRate = engagementRates.length > 0 ? Math.round(engagementRates.reduce((sum, rate) => sum + rate, 0) / engagementRates.length * 100) / 100 : 0;
    }
    const activeUsers = usersResponse.filter((user) => user.subscription_status === "active").length;
    const totalCreditsAvailable = usersResponse.reduce((sum, user) => sum + (user.credits || 0), 0);
    const lightAnalyses = allRuns.filter((run) => run.analysis_type === "light").length;
    const deepAnalyses = allRuns.filter((run) => run.analysis_type === "deep").length;
    const xrayAnalyses = allRuns.filter((run) => run.analysis_type === "xray").length;
    const previousWeekRuns = allRuns.filter((run) => {
      const runDate = new Date(run.created_at);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1e3);
      return runDate > twoWeeksAgo && runDate <= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    }).length;
    const growthRate = previousWeekRuns > 0 ? Math.round((recentAnalyses - previousWeekRuns) / previousWeekRuns * 100) : recentAnalyses > 0 ? 100 : 0;
    return {
      success: true,
      summary: {
        totalAnalyses,
        uniqueLeads,
        averageOverallScore: avgOverallScore,
        averageNicheFitScore: avgNicheFitScore,
        averageEngagementScore: avgEngagementScore,
        conversionRate: `${conversionRate}%`,
        avgEngagementRate: `${avgEngagementRate}%`,
        recentActivity: recentAnalyses,
        monthlyActivity: monthlyAnalyses,
        activeUsers,
        totalCreditsAvailable,
        analysisBreakdown: {
          light: lightAnalyses,
          deep: deepAnalyses,
          xray: xrayAnalyses
        }
      },
      trends: {
        analysesGrowth: `${growthRate >= 0 ? "+" : ""}${growthRate}%`,
        scoreImprovement: avgOverallScore > 60 ? "above_average" : "needs_improvement",
        engagementTrend: avgEngagementRate > 3 ? "healthy" : "low_engagement",
        userGrowth: activeUsers > 0 ? "active" : "no_subscribers"
      },
      insights: {
        topPerformingScore: Math.max(...allRuns.map((run) => run.overall_score || 0)),
        mostActiveWeek: recentAnalyses > previousWeekRuns ? "current" : "previous",
        recommendedFocus: conversionRate < 20 ? "improve_lead_quality" : "scale_operations",
        engagementBenchmark: avgEngagementRate > 3 ? "exceeds_benchmark" : "below_benchmark"
      }
    };
  } catch (error) {
    logger("error", "getAnalyticsSummary failed", { error: error.message });
    return {
      success: false,
      error: error.message,
      summary: {
        totalAnalyses: 0,
        uniqueLeads: 0,
        averageOverallScore: 0,
        conversionRate: "0%",
        avgEngagementRate: "0%",
        recentActivity: 0,
        monthlyActivity: 0,
        activeUsers: 0,
        totalCreditsAvailable: 0,
        analysisBreakdown: { light: 0, deep: 0, xray: 0 }
      }
    };
  }
}
var init_analytics = __esm({
  "src/services/analytics.ts"() {
    init_helpers();
    init_logger();
    __name(getAnalyticsSummary, "getAnalyticsSummary");
  }
});

// src/handlers/analytics.ts
var analytics_exports = {};
__export(analytics_exports, {
  generateAIInsights: () => generateAIInsights,
  handleAnalyticsSummary: () => handleAnalyticsSummary,
  handleGenerateInsights: () => handleGenerateInsights
});
async function handleAnalyticsSummary(c) {
  try {
    const summary = await getAnalyticsSummary(c.env);
    return c.json(summary, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json"
    });
  } catch (error) {
    logger("error", "Analytics summary error", { error: error.message });
    return c.json({
      success: false,
      error: "Failed to generate analytics summary",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, 500);
  }
}
async function handleGenerateInsights(c) {
  try {
    logger("info", "AI insights generation requested - using real data");
    const insights = await generateAIInsights(c.env);
    return c.json(insights, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
  } catch (error) {
    logger("error", "AI insights generation failed", { error: error.message });
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
}
async function generateAIInsights(env) {
  try {
    logger("info", "Generating AI insights with real data");
    const headers = {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const recentRuns = await fetchJson(
      `${env.SUPABASE_URL}/rest/v1/runs?select=*,leads(username,follower_count)&order=created_at.desc&limit=100`,
      { headers }
    );
    const insights = {
      success: true,
      insights: {
        totalAnalyses: recentRuns.length,
        averageScore: recentRuns.reduce((sum, run) => sum + (run.overall_score || 0), 0) / recentRuns.length,
        topPerformers: recentRuns.filter((run) => run.overall_score > 80).slice(0, 5).map((run) => ({
          username: run.leads?.username,
          score: run.overall_score
        })),
        trends: {
          highEngagement: recentRuns.filter((run) => run.engagement_score > 70).length,
          goodNicheFit: recentRuns.filter((run) => run.niche_fit_score > 70).length
        }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    return insights;
  } catch (error) {
    logger("error", "generateAIInsights failed", { error: error.message });
    return {
      success: false,
      error: error.message,
      insights: null
    };
  }
}
var init_analytics2 = __esm({
  "src/handlers/analytics.ts"() {
    init_logger();
    init_analytics();
    init_helpers();
    __name(handleAnalyticsSummary, "handleAnalyticsSummary");
    __name(handleGenerateInsights, "handleGenerateInsights");
    __name(generateAIInsights, "generateAIInsights");
  }
});

// src/handlers/debug.ts
var debug_exports = {};
__export(debug_exports, {
  handleDebugEngagement: () => handleDebugEngagement,
  handleDebugParsing: () => handleDebugParsing,
  handleDebugScrape: () => handleDebugScrape
});
async function handleDebugEngagement(c) {
  const username = c.req.param("username");
  try {
    logger("info", "Starting engagement calculation debug test", { username });
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 10,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };
    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deepInput)
      },
      1,
      1e3,
      3e4
    );
    if (!rawResponse || !Array.isArray(rawResponse)) {
      return c.json({
        success: false,
        error: "No response or invalid response format",
        username
      });
    }
    const analysisResults = {
      totalItems: rawResponse.length,
      itemTypes: {},
      profileItems: [],
      postItems: [],
      fieldAnalysis: {},
      engagementFieldAnalysis: {}
    };
    rawResponse.forEach((item, index) => {
      const itemType = item.type || item.__typename || "unknown";
      analysisResults.itemTypes[itemType] = (analysisResults.itemTypes[itemType] || 0) + 1;
      if (item.username || item.ownerUsername || item.followersCount !== void 0 && item.postsCount !== void 0) {
        analysisResults.profileItems.push({
          index,
          keys: Object.keys(item),
          username: item.username || item.ownerUsername,
          followers: item.followersCount || item.followers,
          posts: item.postsCount || item.posts
        });
      }
      if (item.shortCode || item.code) {
        const engagementData = {
          likesCount: item.likesCount,
          likes: item.likes,
          like_count: item.like_count,
          likeCount: item.likeCount,
          commentsCount: item.commentsCount,
          comments: item.comments,
          comment_count: item.comment_count,
          commentCount: item.commentCount
        };
        analysisResults.postItems.push({
          index,
          shortCode: item.shortCode || item.code,
          keys: Object.keys(item),
          engagementData,
          parsedLikes: parseInt(String(item.likesCount || item.likes || item.like_count || 0)) || 0,
          parsedComments: parseInt(String(item.commentsCount || item.comments || item.comment_count || 0)) || 0
        });
      }
      Object.keys(item).forEach((key) => {
        if (!analysisResults.fieldAnalysis[key]) {
          analysisResults.fieldAnalysis[key] = 0;
        }
        analysisResults.fieldAnalysis[key]++;
        if (key.toLowerCase().includes("like") || key.toLowerCase().includes("comment") || key.toLowerCase().includes("engagement")) {
          if (!analysisResults.engagementFieldAnalysis[key]) {
            analysisResults.engagementFieldAnalysis[key] = [];
          }
          if (analysisResults.engagementFieldAnalysis[key].length < 3) {
            analysisResults.engagementFieldAnalysis[key].push(item[key]);
          }
        }
      });
    });
    let manualCalculationTest = null;
    if (analysisResults.postItems.length > 0) {
      const validPosts = analysisResults.postItems.filter(
        (post) => post.parsedLikes > 0 || post.parsedComments > 0
      );
      if (validPosts.length > 0) {
        const totalLikes = validPosts.reduce((sum, post) => sum + post.parsedLikes, 0);
        const totalComments = validPosts.reduce((sum, post) => sum + post.parsedComments, 0);
        const avgLikes = Math.round(totalLikes / validPosts.length);
        const avgComments = Math.round(totalComments / validPosts.length);
        manualCalculationTest = {
          validPostsCount: validPosts.length,
          totalLikes,
          totalComments,
          avgLikes,
          avgComments,
          calculationSteps: {
            step1: `Found ${validPosts.length} valid posts out of ${analysisResults.postItems.length}`,
            step2: `Total likes: ${totalLikes}, Total comments: ${totalComments}`,
            step3: `Avg likes: ${totalLikes} / ${validPosts.length} = ${avgLikes}`,
            step4: `Avg comments: ${totalComments} / ${validPosts.length} = ${avgComments}`
          }
        };
      }
    }
    return c.json({
      success: true,
      username,
      debug: {
        rawResponseStructure: analysisResults,
        manualCalculationTest,
        recommendations: [
          analysisResults.postItems.length === 0 ? "No post items found - check scraper configuration" : "Post items found \u2713",
          analysisResults.profileItems.length === 0 ? "No profile items found - check scraper response" : "Profile items found \u2713",
          !manualCalculationTest ? "Manual calculation failed - no valid engagement data" : "Manual calculation successful \u2713"
        ],
        troubleshooting: {
          mostCommonFields: Object.entries(analysisResults.fieldAnalysis).sort(([, a], [, b]) => b - a).slice(0, 10),
          engagementFields: analysisResults.engagementFieldAnalysis,
          itemTypeDistribution: analysisResults.itemTypes
        }
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      username
    }, 500);
  }
}
async function handleDebugScrape(c) {
  const username = c.req.param("username");
  const analysisType = c.req.query("type") || "light";
  try {
    const profileData = await scrapeInstagramProfile(username, analysisType, c.env);
    return c.json({
      success: true,
      username,
      analysisType,
      profileData,
      debug: {
        hasRealEngagement: (profileData.engagement?.postsAnalyzed || 0) > 0,
        realEngagementStats: profileData.engagement || null,
        hasLatestPosts: !!profileData.latestPosts,
        postsCount: profileData.latestPosts?.length || 0,
        dataQuality: profileData.dataQuality,
        scraperUsed: profileData.scraperUsed,
        noFakeData: true,
        manualCalculation: true
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      username,
      analysisType
    }, 500);
  }
}
async function handleDebugParsing(c) {
  const username = c.req.param("username");
  try {
    const deepInput = {
      directUrls: [`https://instagram.com/${username}/`],
      resultsLimit: 5,
      addParentData: false,
      enhanceUserSearchWithFacebookPage: false,
      onlyPostsNewerThan: "2024-01-01",
      resultsType: "details",
      searchType: "hashtag"
    };
    const rawResponse = await callWithRetry(
      `https://api.apify.com/v2/acts/shu8hvrXbJbY3Eb9W/run-sync-get-dataset-items?token=${c.env.APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deepInput)
      },
      1,
      1e3,
      3e4
    );
    const profileItems = rawResponse?.filter((item) => item.username || item.ownerUsername) || [];
    const postItems = rawResponse?.filter((item) => item.shortCode && item.likesCount !== void 0) || [];
    let engagementTest = null;
    if (postItems.length > 0) {
      const validPosts = postItems.filter((post) => {
        const likes = parseInt(post.likesCount) || 0;
        const comments = parseInt(post.commentsCount) || 0;
        return likes > 0 || comments > 0;
      });
      if (validPosts.length > 0) {
        const totalLikes = validPosts.reduce((sum, post) => sum + (parseInt(post.likesCount) || 0), 0);
        const totalComments = validPosts.reduce((sum, post) => sum + (parseInt(post.commentsCount) || 0), 0);
        const avgLikes = Math.round(totalLikes / validPosts.length);
        const avgComments = Math.round(totalComments / validPosts.length);
        const totalEngagement = avgLikes + avgComments;
        engagementTest = {
          postsAnalyzed: validPosts.length,
          totalLikes,
          totalComments,
          avgLikes,
          avgComments,
          totalEngagement,
          calculation: "manual_as_specified"
        };
      }
    }
    return c.json({
      success: true,
      username,
      rawResponseLength: rawResponse?.length || 0,
      profileItems: profileItems.length,
      postItems: postItems.length,
      firstItemKeys: rawResponse?.[0] ? Object.keys(rawResponse[0]) : [],
      hasProfileData: profileItems.length > 0,
      hasPostData: postItems.length > 0,
      samplePost: postItems[0] || null,
      engagementCalculationTest: engagementTest
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      username
    }, 500);
  }
}
var init_debug = __esm({
  "src/handlers/debug.ts"() {
    init_logger();
    init_helpers();
    init_instagram_scraper();
    __name(handleDebugEngagement, "handleDebugEngagement");
    __name(handleDebugScrape, "handleDebugScrape");
    __name(handleDebugParsing, "handleDebugParsing");
  }
});

// src/handlers/test.ts
var test_exports = {};
__export(test_exports, {
  handleDebugEnv: () => handleDebugEnv,
  handleTestApify: () => handleTestApify,
  handleTestOpenAI: () => handleTestOpenAI,
  handleTestPost: () => handleTestPost,
  handleTestSupabase: () => handleTestSupabase
});
async function handleTestSupabase(c) {
  try {
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const response = await fetch(`${c.env.SUPABASE_URL}/rest/v1/users?limit=1`, { headers });
    const data = await response.text();
    return c.json({
      status: response.status,
      ok: response.ok,
      data: data.substring(0, 200),
      hasUrl: !!c.env.SUPABASE_URL,
      hasServiceRole: !!c.env.SUPABASE_SERVICE_ROLE
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
async function handleTestApify(c) {
  try {
    const response = await fetch(`https://api.apify.com/v2/key-value-stores?token=${c.env.APIFY_API_TOKEN}&limit=1`);
    return c.json({
      status: response.status,
      ok: response.ok,
      hasToken: !!c.env.APIFY_API_TOKEN
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
async function handleTestOpenAI(c) {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${c.env.OPENAI_KEY}` }
    });
    return c.json({
      status: response.status,
      ok: response.ok,
      hasKey: !!c.env.OPENAI_KEY
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
async function handleTestPost(c) {
  try {
    const body = await c.req.json();
    return c.json({
      received: body,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      enterprise: true
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
async function handleDebugEnv(c) {
  return c.json({
    // Existing checks
    supabase: c.env.SUPABASE_URL ? "SET" : "MISSING",
    serviceRole: c.env.SUPABASE_SERVICE_ROLE ? "SET" : "MISSING",
    anonKey: c.env.SUPABASE_ANON_KEY ? "SET" : "MISSING",
    openai: c.env.OPENAI_KEY ? "SET" : "MISSING",
    claude: c.env.CLAUDE_KEY ? "SET" : "MISSING",
    apify: c.env.APIFY_API_TOKEN ? "SET" : "MISSING",
    stripe: c.env.STRIPE_SECRET_KEY ? "SET" : "MISSING",
    // Add AWS checks
    awsAccessKey: c.env.AWS_ACCESS_KEY_ID ? "SET" : "MISSING",
    awsSecretKey: c.env.AWS_SECRET_ACCESS_KEY ? "SET" : "MISSING",
    awsRegion: c.env.AWS_REGION ? "SET" : "MISSING",
    enterprise: true,
    version: "v3.0.0-enterprise-perfect"
  });
}
var init_test = __esm({
  "src/handlers/test.ts"() {
    __name(handleTestSupabase, "handleTestSupabase");
    __name(handleTestApify, "handleTestApify");
    __name(handleTestOpenAI, "handleTestOpenAI");
    __name(handleTestPost, "handleTestPost");
    __name(handleDebugEnv, "handleDebugEnv");
  }
});

// src/test/orchestration-integration.ts
var orchestration_integration_exports = {};
__export(orchestration_integration_exports, {
  runIntegrationTests: () => runIntegrationTests
});
async function runIntegrationTests(env) {
  const results = [];
  const testProfile = {
    username: "fitness_coach_test",
    displayName: "Fitness Coach",
    followersCount: 45e3,
    followingCount: 1200,
    postsCount: 850,
    isVerified: false,
    isPrivate: false,
    profilePicUrl: "https://example.com/pic.jpg",
    bio: "Certified personal trainer helping busy professionals get fit \u{1F4AA} DM for custom workout plans",
    externalUrl: "https://fitcoach.com",
    isBusinessAccount: true,
    latestPosts: [
      {
        id: "1",
        shortCode: "abc123",
        caption: "5 morning exercises that will transform your day! Save this post \u{1F4CC} #fitness #morningworkout #health",
        likesCount: 1200,
        commentsCount: 45,
        timestamp: "2025-01-10T08:00:00Z",
        url: "https://instagram.com/p/abc123",
        type: "photo",
        hashtags: ["#fitness", "#morningworkout", "#health"],
        mentions: [],
        isVideo: false
      }
    ],
    engagement: {
      avgLikes: 950,
      avgComments: 35,
      engagementRate: 2.2,
      totalEngagement: 985,
      postsAnalyzed: 12
    },
    scraperUsed: "deep_test",
    dataQuality: "high"
  };
  const testBusiness = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    user_id: "550e8400-e29b-41d4-a716-446655440000",
    name: "FitTech Solutions",
    industry: "fitness technology",
    target_audience: "health-conscious professionals aged 25-45",
    value_proposition: "AI-powered fitness apps that adapt to busy schedules",
    target_problems: "lack of time for gym, inconsistent workout routines",
    business_name: "FitTech Solutions"
  };
  const contextStart = Date.now();
  try {
    const context = await ensureBusinessContext(testBusiness, env, "test-context");
    const contextDuration = Date.now() - contextStart;
    results.push({
      phase: "business_context",
      success: !!context.business_one_liner,
      cost: 1e-3,
      // Estimated
      duration_ms: contextDuration
    });
  } catch (error) {
    results.push({
      phase: "business_context",
      success: false,
      cost: 0,
      duration_ms: Date.now() - contextStart,
      error: error.message
    });
  }
  const lightStart = Date.now();
  try {
    const lightResult = await runAnalysis(testProfile, testBusiness, "light", env, "test-light");
    results.push({
      phase: "light_analysis",
      success: lightResult.verdict === "success",
      cost: lightResult.totalCost.actual_cost,
      duration_ms: lightResult.performance.total_ms,
      error: lightResult.verdict === "error" ? lightResult.result.error : void 0
    });
  } catch (error) {
    results.push({
      phase: "light_analysis",
      success: false,
      cost: 0,
      duration_ms: Date.now() - lightStart,
      error: error.message
    });
  }
  const deepStart = Date.now();
  try {
    const deepResult = await runAnalysis(testProfile, testBusiness, "deep", env, "test-deep");
    results.push({
      phase: "deep_analysis",
      success: deepResult.verdict === "success",
      cost: deepResult.totalCost.actual_cost,
      duration_ms: deepResult.performance.total_ms,
      error: deepResult.verdict === "error" ? deepResult.result.error : void 0
    });
  } catch (error) {
    results.push({
      phase: "deep_analysis",
      success: false,
      cost: 0,
      duration_ms: Date.now() - deepStart,
      error: error.message
    });
  }
  const snapshotStart = Date.now();
  try {
    const snapshot = createMicroSnapshot(testProfile);
    const snapshotDuration = Date.now() - snapshotStart;
    const isValid = snapshot.username === testProfile.username && snapshot.followers === testProfile.followersCount && snapshot.engagement_signals?.avg_likes === testProfile.engagement.avgLikes;
    results.push({
      phase: "micro_snapshot",
      success: isValid,
      cost: 0,
      duration_ms: snapshotDuration
    });
  } catch (error) {
    results.push({
      phase: "micro_snapshot",
      success: false,
      cost: 0,
      duration_ms: Date.now() - snapshotStart,
      error: error.message
    });
  }
  return results;
}
var init_orchestration_integration = __esm({
  "src/test/orchestration-integration.ts"() {
    init_analysis_orchestrator();
    init_micro_snapshot();
    __name(runIntegrationTests, "runIntegrationTests");
  }
});

// src/handlers/enhanced-admin.ts
var enhanced_admin_exports = {};
__export(enhanced_admin_exports, {
  handleGetAuditLog: () => handleGetAuditLog,
  handleGetConfigStatus: () => handleGetConfigStatus,
  handleMigrateToAWS: () => handleMigrateToAWS,
  handleTestApiKey: () => handleTestApiKey,
  handleUpdateApiKey: () => handleUpdateApiKey
});
function verifyAdminAccess(c) {
  const authHeader = c.req.header("Authorization");
  const adminToken = c.env.ADMIN_TOKEN;
  if (!adminToken) {
    logger("error", "ADMIN_TOKEN not configured in environment");
    return false;
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === adminToken;
}
async function handleUpdateApiKey(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess(c)) {
      logger("warn", "Unauthorized admin access attempt", { requestId });
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const body = await c.req.json();
    const { keyName: keyName2, newValue: newValue2 } = body;
    if (!keyName2 || !newValue2) {
      return c.json(createStandardResponse(false, void 0, "keyName and newValue are required", requestId), 400);
    }
    const allowedKeys = [
      "OPENAI_API_KEY",
      "CLAUDE_API_KEY",
      "APIFY_API_TOKEN",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PUBLISHABLE_KEY",
      "WORKER_URL",
      "NETLIFY_BUILD_HOOK_URL"
    ];
    if (!allowedKeys.includes(keyName2)) {
      return c.json(createStandardResponse(false, void 0, "Invalid key name", requestId), 400);
    }
    const keyValidation = validateApiKeyFormat(keyName2, newValue2);
    if (!keyValidation.valid) {
      return c.json(createStandardResponse(false, void 0, keyValidation.error, requestId), 400);
    }
    const userEmail2 = c.req.header("X-User-Email") || "admin-panel";
    const configManager = getEnhancedConfigManager(c.env);
    await configManager.updateConfig(keyName2, newValue2, userEmail2);
    const testResult = await testApiKey(keyName2, newValue2, c.env);
    logger("info", "API key updated via enhanced admin panel", {
      keyName: keyName2,
      updatedBy: userEmail2,
      testResult: testResult.success,
      usedAWS: isAWSManagedKey(keyName2),
      requestId
    });
    return c.json(createStandardResponse(true, {
      message: `${keyName2} updated successfully`,
      testResult,
      storage: isAWSManagedKey(keyName2) ? "AWS Secrets Manager + Supabase backup" : "Supabase only",
      autoSyncTriggered: true
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Enhanced admin key update failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleGetConfigStatus(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const configManager = getEnhancedConfigManager(c.env);
    const status = await configManager.getConfigStatus();
    let awsStatus = "not_configured";
    try {
      const awsSecrets = getAWSSecretsManager(c.env);
      const awsSecretsList = await awsSecrets.listSecrets();
      awsStatus = "connected";
      Object.keys(status).forEach((keyName2) => {
        if (isAWSManagedKey(keyName2)) {
          status[keyName2].migration_recommended = status[keyName2].aws.status !== "configured";
          status[keyName2].in_aws = awsSecretsList.includes(keyName2);
        }
      });
    } catch (awsError) {
      awsStatus = `error: ${awsError.message}`;
    }
    logger("info", "Enhanced config status retrieved", { requestId, awsStatus });
    return c.json(createStandardResponse(true, {
      status,
      aws_connectivity: awsStatus,
      migration_summary: {
        total_keys: Object.keys(status).length,
        aws_managed_keys: Object.keys(status).filter((k) => isAWSManagedKey(k)).length,
        migration_needed: Object.values(status).filter((s) => s.migration_recommended).length
      }
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Failed to get enhanced config status", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleMigrateToAWS(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const body = await c.req.json();
    const { keyNames, migrateAll } = body;
    const configManager = getEnhancedConfigManager(c.env);
    const awsManagedKeys = ["OPENAI_API_KEY", "CLAUDE_API_KEY", "APIFY_API_TOKEN", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
    const keysToMigrate = migrateAll ? awsManagedKeys : keyNames || [];
    if (keysToMigrate.length === 0) {
      return c.json(createStandardResponse(false, void 0, "No keys specified for migration", requestId), 400);
    }
    const results = [];
    for (const keyName2 of keysToMigrate) {
      try {
        await configManager.migrateToAWS(keyName2);
        results.push({
          keyName: keyName2,
          success: true,
          message: "Successfully migrated to AWS Secrets Manager"
        });
        logger("info", "Key migrated to AWS", { keyName: keyName2, requestId });
      } catch (migrationError) {
        results.push({
          keyName: keyName2,
          success: false,
          error: migrationError.message
        });
        logger("error", "Key migration failed", {
          keyName: keyName2,
          error: migrationError.message,
          requestId
        });
      }
    }
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;
    return c.json(createStandardResponse(true, {
      message: `Migration completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: keysToMigrate.length,
        successful: successCount,
        failed: failureCount
      }
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Migration process failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleTestApiKey(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const { keyName: keyName2, keyValue } = await c.req.json();
    if (!keyName2) {
      return c.json(createStandardResponse(false, void 0, "keyName is required", requestId), 400);
    }
    let valueToTest = keyValue;
    if (!valueToTest) {
      const configManager = getEnhancedConfigManager(c.env);
      valueToTest = await configManager.getConfig(keyName2);
    }
    if (!valueToTest) {
      return c.json(createStandardResponse(false, void 0, "No key value to test", requestId), 400);
    }
    const testResult = await testApiKey(keyName2, valueToTest, c.env);
    logger("info", "API key tested via enhanced admin", {
      keyName: keyName2,
      success: testResult.success,
      requestId
    });
    return c.json(createStandardResponse(true, testResult, void 0, requestId));
  } catch (error) {
    logger("error", "Enhanced API key test failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleGetAuditLog(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const auditLog = await fetchJson(
      `${c.env.SUPABASE_URL}/rest/v1/app_config?environment=eq.production&select=key_name,updated_at,updated_by&order=updated_at.desc&limit=${limit}&offset=${offset}`,
      { headers }
    );
    const formattedLog = auditLog.map((entry) => ({
      keyName: entry.key_name,
      action: "UPDATE",
      timestamp: entry.updated_at,
      user: entry.updated_by || "system",
      id: `${entry.key_name}-${entry.updated_at}`,
      storage: isAWSManagedKey(entry.key_name) ? "AWS + Supabase" : "Supabase"
    }));
    return c.json(createStandardResponse(true, {
      log: formattedLog,
      total: formattedLog.length,
      limit,
      offset,
      hasAWSIntegration: true
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Failed to get enhanced audit log", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
function isAWSManagedKey(keyName2) {
  const awsManagedKeys = [
    "OPENAI_API_KEY",
    "CLAUDE_API_KEY",
    "APIFY_API_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET"
  ];
  return awsManagedKeys.includes(keyName2);
}
function validateApiKeyFormat(keyName2, keyValue) {
  const validations = {
    "OPENAI_API_KEY": /* @__PURE__ */ __name((key) => key.startsWith("sk-") && key.length > 20, "OPENAI_API_KEY"),
    "CLAUDE_API_KEY": /* @__PURE__ */ __name((key) => key.startsWith("sk-ant-") && key.length > 30, "CLAUDE_API_KEY"),
    "APIFY_API_TOKEN": /* @__PURE__ */ __name((key) => key.startsWith("apify_api_") && key.length > 20, "APIFY_API_TOKEN"),
    "STRIPE_SECRET_KEY": /* @__PURE__ */ __name((key) => (key.startsWith("sk_live_") || key.startsWith("sk_test_")) && key.length > 20, "STRIPE_SECRET_KEY"),
    "STRIPE_WEBHOOK_SECRET": /* @__PURE__ */ __name((key) => key.startsWith("whsec_") && key.length > 20, "STRIPE_WEBHOOK_SECRET"),
    "STRIPE_PUBLISHABLE_KEY": /* @__PURE__ */ __name((key) => (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 20, "STRIPE_PUBLISHABLE_KEY"),
    "WORKER_URL": /* @__PURE__ */ __name((key) => key.startsWith("https://") && key.includes(".workers.dev"), "WORKER_URL"),
    "NETLIFY_BUILD_HOOK_URL": /* @__PURE__ */ __name((key) => key.startsWith("https://api.netlify.com/build_hooks/"), "NETLIFY_BUILD_HOOK_URL")
  };
  const validator = validations[keyName2];
  if (!validator) {
    return { valid: true };
  }
  if (!validator(keyValue)) {
    return { valid: false, error: `Invalid format for ${keyName2}` };
  }
  return { valid: true };
}
async function testApiKey(keyName2, keyValue, env) {
  try {
    switch (keyName2) {
      case "OPENAI_API_KEY":
        const openaiResponse = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${keyValue}` }
        });
        return {
          success: openaiResponse.ok,
          message: openaiResponse.ok ? "OpenAI API key is valid" : "OpenAI API key is invalid",
          details: { status: openaiResponse.status, source: "enhanced_admin" }
        };
      case "CLAUDE_API_KEY":
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": keyValue,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1
          })
        });
        return {
          success: claudeResponse.status !== 401 && claudeResponse.status !== 403,
          message: claudeResponse.status !== 401 && claudeResponse.status !== 403 ? "Claude API key is valid" : "Claude API key is invalid",
          details: { status: claudeResponse.status, source: "enhanced_admin" }
        };
      case "APIFY_API_TOKEN":
        const apifyResponse = await fetch(`https://api.apify.com/v2/key-value-stores?token=${keyValue}&limit=1`);
        return {
          success: apifyResponse.ok,
          message: apifyResponse.ok ? "Apify API token is valid" : "Apify API token is invalid",
          details: { status: apifyResponse.status, source: "enhanced_admin" }
        };
      case "STRIPE_SECRET_KEY":
        const stripeResponse = await fetch("https://api.stripe.com/v1/charges?limit=1", {
          headers: { "Authorization": `Bearer ${keyValue}` }
        });
        return {
          success: stripeResponse.ok,
          message: stripeResponse.ok ? "Stripe secret key is valid" : "Stripe secret key is invalid",
          details: { status: stripeResponse.status, source: "enhanced_admin" }
        };
      case "STRIPE_WEBHOOK_SECRET":
        return {
          success: keyValue.startsWith("whsec_"),
          message: keyValue.startsWith("whsec_") ? "Webhook secret format is valid" : "Invalid webhook secret format",
          details: { source: "enhanced_admin" }
        };
      case "STRIPE_PUBLISHABLE_KEY":
        return {
          success: keyValue.startsWith("pk_live_") || keyValue.startsWith("pk_test_"),
          message: keyValue.startsWith("pk_live_") || keyValue.startsWith("pk_test_") ? "Stripe publishable key format is valid" : "Invalid publishable key format",
          details: { source: "enhanced_admin" }
        };
      case "WORKER_URL":
        const workerResponse = await fetch(`${keyValue}/health`);
        return {
          success: workerResponse.ok,
          message: workerResponse.ok ? "Worker URL is accessible" : "Worker URL is not accessible",
          details: { status: workerResponse.status, source: "enhanced_admin" }
        };
      case "NETLIFY_BUILD_HOOK_URL":
        return {
          success: keyValue.includes("api.netlify.com/build_hooks/"),
          message: keyValue.includes("api.netlify.com/build_hooks/") ? "Netlify build hook URL format is valid" : "Invalid Netlify build hook URL",
          details: { source: "enhanced_admin" }
        };
      default:
        return {
          success: false,
          message: "Testing not implemented for this key type",
          details: { source: "enhanced_admin" }
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: { error: error.message, source: "enhanced_admin" }
    };
  }
}
var init_enhanced_admin = __esm({
  "src/handlers/enhanced-admin.ts"() {
    init_enhanced_config_manager();
    init_aws_secrets_manager();
    init_logger();
    init_response();
    init_helpers();
    __name(verifyAdminAccess, "verifyAdminAccess");
    __name(handleUpdateApiKey, "handleUpdateApiKey");
    __name(handleGetConfigStatus, "handleGetConfigStatus");
    __name(handleMigrateToAWS, "handleMigrateToAWS");
    __name(handleTestApiKey, "handleTestApiKey");
    __name(handleGetAuditLog, "handleGetAuditLog");
    __name(isAWSManagedKey, "isAWSManagedKey");
    __name(validateApiKeyFormat, "validateApiKeyFormat");
    __name(testApiKey, "testApiKey");
  }
});

// src/handlers/admin.ts
var admin_exports = {};
__export(admin_exports, {
  handleGetAuditLog: () => handleGetAuditLog2,
  handleGetConfig: () => handleGetConfig,
  handleGetConfigStatus: () => handleGetConfigStatus2,
  handleTestApiKey: () => handleTestApiKey2,
  handleUpdateApiKey: () => handleUpdateApiKey2
});
function verifyAdminAccess2(c) {
  const authHeader = c.req.header("Authorization");
  const adminToken = c.env.ADMIN_TOKEN;
  if (!adminToken) {
    logger("error", "ADMIN_TOKEN not configured in environment");
    return false;
  }
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  const token = authHeader.substring(7);
  return token === adminToken;
}
async function handleUpdateApiKey2(c) {
  const requestId = generateRequestId();
  const sensitiveKeys = ["OPENAI_API_KEY", "CLAUDE_API_KEY", "APIFY_API_TOKEN", "STRIPE_SECRET_KEY"];
  if (sensitiveKeys.includes(keyName)) {
    const awsSecrets = new AWSSecretsManager(c.env);
    await awsSecrets.putSecret(keyName, newValue);
    const configManager = getConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
  } else {
    const configManager = getConfigManager(c.env);
    await configManager.updateConfig(keyName, newValue, userEmail);
  }
  try {
    if (!verifyAdminAccess2(c)) {
      logger("warn", "Unauthorized admin access attempt", { requestId });
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const body = await c.req.json();
    const { keyName: keyName2, newValue: newValue2 } = body;
    if (!keyName2 || !newValue2) {
      return c.json(createStandardResponse(false, void 0, "keyName and newValue are required", requestId), 400);
    }
    const allowedKeys = [
      "OPENAI_API_KEY",
      "CLAUDE_API_KEY",
      "APIFY_API_TOKEN",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PUBLISHABLE_KEY",
      "WORKER_URL",
      "NETLIFY_BUILD_HOOK_URL",
      "SUPABASE_SERVICE_ROLE",
      "SUPABASE_ANON_KEY"
      // ✅ ADD THIS
    ];
    if (!allowedKeys.includes(keyName2)) {
      return c.json(createStandardResponse(false, void 0, "Invalid key name", requestId), 400);
    }
    const keyValidation = validateApiKeyFormat2(keyName2, newValue2);
    if (!keyValidation.valid) {
      return c.json(createStandardResponse(false, void 0, keyValidation.error, requestId), 400);
    }
    const userEmail2 = c.req.header("X-User-Email") || "admin-panel";
    const configManager = getEnhancedConfigManager(c.env);
    await configManager.updateConfig(keyName2, newValue2, userEmail2);
    await triggerAutoSync(keyName2, userEmail2, c.env);
    const testResult = await testApiKey2(keyName2, newValue2, c.env);
    logger("info", "API key updated via admin panel", {
      keyName: keyName2,
      updatedBy: userEmail2,
      testResult: testResult.success,
      requestId
    });
    return c.json(createStandardResponse(true, {
      message: `${keyName2} updated successfully`,
      testResult
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Admin key update failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function triggerAutoSync(keyName2, updatedBy, env) {
  const promises = [];
  if (env.NETLIFY_BUILD_HOOK_URL) {
    promises.push(
      fetch(env.NETLIFY_BUILD_HOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: "config_update",
          keyName: keyName2,
          updatedBy,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      }).then((response) => {
        if (response.ok) {
          logger("info", "Netlify rebuild triggered", { keyName: keyName2 });
        } else {
          logger("error", "Netlify rebuild failed", { keyName: keyName2, status: response.status });
        }
      }).catch((error) => {
        logger("error", "Netlify rebuild request failed", { keyName: keyName2, error: error.message });
      })
    );
  }
  if (env.CONFIG_KV_NAMESPACE) {
    promises.push(
      env.CONFIG_KV_NAMESPACE.delete(`config:${keyName2}`).then(() => logger("info", "Cloudflare KV cache cleared", { keyName: keyName2 })).catch((error) => logger("warn", "Failed to clear KV cache", { keyName: keyName2, error: error.message }))
    );
  }
  if (env.CLOUDFLARE_ZONE_ID && env.CLOUDFLARE_API_TOKEN) {
    promises.push(
      fetch(`https://api.cloudflare.com/client/v4/zones/${env.CLOUDFLARE_ZONE_ID}/purge_cache`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          files: [
            `${env.WORKER_URL}/config`,
            `${env.WORKER_URL}/v1/config`
          ]
        })
      }).then(() => logger("info", "CDN cache purged", { keyName: keyName2 })).catch((error) => logger("warn", "CDN cache purge failed", { keyName: keyName2, error: error.message }))
    );
  }
  if (env.SLACK_WEBHOOK_URL) {
    promises.push(
      fetch(env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `\u{1F511} Config Updated: \`${keyName2}\` was updated by ${updatedBy}`,
          channel: "#alerts"
        })
      }).catch((error) => logger("warn", "Slack notification failed", { error: error.message }))
    );
  }
  await Promise.allSettled(promises);
  logger("info", "Auto-sync completed", {
    keyName: keyName2,
    updatedBy,
    syncOperations: promises.length
  });
}
async function handleGetConfigStatus2(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess2(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const configKeys = await fetchJson(
      `${c.env.SUPABASE_URL}/rest/v1/app_config?environment=eq.production&select=key_name,updated_at,updated_by,key_value`,
      { headers }
    );
    const allowedKeys = [
      "OPENAI_API_KEY",
      "CLAUDE_API_KEY",
      "APIFY_API_TOKEN",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET"
    ];
    const status = {};
    for (const keyName2 of allowedKeys) {
      const configItem = configKeys.find((item) => item.key_name === keyName2);
      if (configItem) {
        const hasValue = configItem.key_value && configItem.key_value.length > 0;
        status[keyName2] = {
          configured: hasValue,
          lastUpdated: configItem.updated_at,
          updatedBy: configItem.updated_by || "system",
          status: hasValue ? "CONFIGURED" : "EMPTY"
        };
      } else {
        const envValue = c.env[keyName2];
        status[keyName2] = {
          configured: !!envValue,
          lastUpdated: "N/A",
          updatedBy: "environment",
          status: envValue ? "ENV_FALLBACK" : "MISSING"
        };
      }
    }
    logger("info", "Config status retrieved", { requestId });
    return c.json(createStandardResponse(true, { status }, void 0, requestId));
  } catch (error) {
    logger("error", "Failed to get config status", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleTestApiKey2(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess2(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const { keyName: keyName2, keyValue } = await c.req.json();
    if (!keyName2) {
      return c.json(createStandardResponse(false, void 0, "keyName is required", requestId), 400);
    }
    let valueToTest = keyValue;
    if (!valueToTest) {
      const configManager = getConfigManager(c.env);
      valueToTest = await configManager.getConfig(keyName2);
    }
    if (!valueToTest) {
      return c.json(createStandardResponse(false, void 0, "No key value to test", requestId), 400);
    }
    const testResult = await testApiKey2(keyName2, valueToTest, c.env);
    logger("info", "API key tested", { keyName: keyName2, success: testResult.success, requestId });
    return c.json(createStandardResponse(true, testResult, void 0, requestId));
  } catch (error) {
    logger("error", "API key test failed", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function handleGetAuditLog2(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess2(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const headers = {
      apikey: c.env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json"
    };
    const auditLog = await fetchJson(
      `${c.env.SUPABASE_URL}/rest/v1/app_config?environment=eq.production&select=key_name,updated_at,updated_by&order=updated_at.desc&limit=${limit}&offset=${offset}`,
      { headers }
    );
    const formattedLog = auditLog.map((entry) => ({
      keyName: entry.key_name,
      action: "UPDATE",
      timestamp: entry.updated_at,
      user: entry.updated_by || "system",
      id: `${entry.key_name}-${entry.updated_at}`
    }));
    return c.json(createStandardResponse(true, {
      log: formattedLog,
      total: formattedLog.length,
      limit,
      offset
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Failed to get audit log", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
async function testApiKey2(keyName2, keyValue, env) {
  try {
    switch (keyName2) {
      case "OPENAI_API_KEY":
        const openaiResponse = await fetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${keyValue}` }
        });
        return {
          success: openaiResponse.ok,
          message: openaiResponse.ok ? "OpenAI API key is valid" : "OpenAI API key test failed",
          details: { status: openaiResponse.status }
        };
      case "CLAUDE_API_KEY":
        const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": keyValue,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            messages: [{ role: "user", content: "test" }],
            max_tokens: 1
          })
        });
        return {
          success: claudeResponse.ok,
          message: claudeResponse.ok ? "Claude API key is valid" : "Claude API key test failed",
          details: { status: claudeResponse.status }
        };
      case "APIFY_API_TOKEN":
        const apifyResponse = await fetch(`https://api.apify.com/v2/key-value-stores?token=${keyValue}&limit=1`);
        return {
          success: apifyResponse.ok,
          message: apifyResponse.ok ? "Apify API token is valid" : "Apify API token test failed",
          details: { status: apifyResponse.status }
        };
      case "STRIPE_SECRET_KEY":
        const stripeResponse = await fetch("https://api.stripe.com/v1/customers?limit=1", {
          headers: { "Authorization": `Bearer ${keyValue}` }
        });
        return {
          success: stripeResponse.ok,
          message: stripeResponse.ok ? "Stripe secret key is valid" : "Stripe secret key test failed",
          details: { status: stripeResponse.status }
        };
      // ✅ ADD THIS NEW CASE:
      case "SUPABASE_SERVICE_ROLE":
        const supabaseResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/users?limit=1`, {
          headers: {
            "apikey": keyValue,
            "Authorization": `Bearer ${keyValue}`,
            "Content-Type": "application/json"
          }
        });
        return {
          success: supabaseResponse.ok,
          message: supabaseResponse.ok ? "Supabase service role is valid" : "Supabase service role test failed",
          details: {
            status: supabaseResponse.status,
            supabaseUrl: env.SUPABASE_URL
          }
        };
      case "STRIPE_WEBHOOK_SECRET":
        return {
          success: true,
          message: "Webhook secret format validation passed (cannot test without webhook event)",
          details: { format: "whsec_*", length: keyValue.length }
        };
      default:
        return {
          success: false,
          message: `Testing not implemented for ${keyName2}`,
          details: { keyName: keyName2, available: ["OPENAI_API_KEY", "CLAUDE_API_KEY", "APIFY_API_TOKEN", "STRIPE_SECRET_KEY", "SUPABASE_SERVICE_ROLE", "STRIPE_WEBHOOK_SECRET"] }
        };
    }
  } catch (error) {
    return {
      success: false,
      message: `Test failed: ${error.message}`,
      details: { error: error.message, keyName: keyName2 }
    };
  }
}
function validateApiKeyFormat2(keyName2, keyValue) {
  const validations = {
    "OPENAI_API_KEY": /* @__PURE__ */ __name((key) => key.startsWith("sk-") && key.length > 20, "OPENAI_API_KEY"),
    "CLAUDE_API_KEY": /* @__PURE__ */ __name((key) => key.startsWith("sk-ant-") && key.length > 30, "CLAUDE_API_KEY"),
    "APIFY_API_TOKEN": /* @__PURE__ */ __name((key) => key.startsWith("apify_api_") && key.length > 20, "APIFY_API_TOKEN"),
    "STRIPE_SECRET_KEY": /* @__PURE__ */ __name((key) => (key.startsWith("sk_live_") || key.startsWith("sk_test_")) && key.length > 20, "STRIPE_SECRET_KEY"),
    "STRIPE_WEBHOOK_SECRET": /* @__PURE__ */ __name((key) => key.startsWith("whsec_") && key.length > 20, "STRIPE_WEBHOOK_SECRET"),
    "STRIPE_PUBLISHABLE_KEY": /* @__PURE__ */ __name((key) => (key.startsWith("pk_live_") || key.startsWith("pk_test_")) && key.length > 20, "STRIPE_PUBLISHABLE_KEY"),
    "WORKER_URL": /* @__PURE__ */ __name((key) => key.startsWith("https://") && key.includes(".workers.dev"), "WORKER_URL"),
    "NETLIFY_BUILD_HOOK_URL": /* @__PURE__ */ __name((key) => key.startsWith("https://api.netlify.com/build_hooks/"), "NETLIFY_BUILD_HOOK_URL"),
    "SUPABASE_SERVICE_ROLE": /* @__PURE__ */ __name((key) => key.startsWith("eyJ") && key.includes(".") && key.length > 100, "SUPABASE_SERVICE_ROLE"),
    // JWT format
    "SUPABASE_ANON_KEY": /* @__PURE__ */ __name((key) => key.startsWith("eyJ") && key.includes(".") && key.length > 100, "SUPABASE_ANON_KEY")
    // ✅ ADD THIS - JWT format
  };
  const validator = validations[keyName2];
  if (!validator) {
    return { valid: true };
  }
  if (!validator(keyValue)) {
    return { valid: false, error: `Invalid format for ${keyName2}` };
  }
  return { valid: true };
}
function isAWSManagedKey2(keyName2) {
  const awsManagedKeys = [
    "OPENAI_API_KEY",
    "CLAUDE_API_KEY",
    "APIFY_API_TOKEN",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_SERVICE_ROLE",
    "SUPABASE_ANON_KEY"
    // ✅ ADD THIS
  ];
  return awsManagedKeys.includes(keyName2);
}
async function handleGetConfig(c) {
  const requestId = generateRequestId();
  try {
    if (!verifyAdminAccess2(c)) {
      return c.json(createStandardResponse(false, void 0, "Unauthorized access", requestId), 401);
    }
    const { keyName: keyName2 } = await c.req.json();
    if (!keyName2) {
      return c.json(createStandardResponse(false, void 0, "keyName is required", requestId), 400);
    }
    const configManager = getEnhancedConfigManager(c.env);
    const value = await configManager.getConfig(keyName2);
    if (!value) {
      return c.json(createStandardResponse(false, void 0, `${keyName2} not found`, requestId), 404);
    }
    logger("info", "Config value retrieved via admin API", { keyName: keyName2, requestId });
    return c.json(createStandardResponse(true, {
      keyName: keyName2,
      value,
      source: isAWSManagedKey2(keyName2) ? "aws" : "supabase"
    }, void 0, requestId));
  } catch (error) {
    logger("error", "Failed to get config value", { error: error.message, requestId });
    return c.json(createStandardResponse(false, void 0, error.message, requestId), 500);
  }
}
var init_admin = __esm({
  "src/handlers/admin.ts"() {
    init_enhanced_config_manager();
    init_logger();
    init_response();
    init_helpers();
    __name(verifyAdminAccess2, "verifyAdminAccess");
    __name(handleUpdateApiKey2, "handleUpdateApiKey");
    __name(triggerAutoSync, "triggerAutoSync");
    __name(handleGetConfigStatus2, "handleGetConfigStatus");
    __name(handleTestApiKey2, "handleTestApiKey");
    __name(handleGetAuditLog2, "handleGetAuditLog");
    __name(testApiKey2, "testApiKey");
    __name(validateApiKeyFormat2, "validateApiKeyFormat");
    __name(isAWSManagedKey2, "isAWSManagedKey");
    __name(handleGetConfig, "handleGetConfig");
  }
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf(
    "/",
    url.charCodeAt(9) === 58 ? 13 : 8
  );
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : void 0;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      const existingVary = c.req.header("Vary");
      if (existingVary) {
        set("Vary", existingVary);
      } else {
        set("Vary", "Origin");
      }
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
  }, "cors2");
}, "cors");

// src/index.ts
init_logger();
init_response();
var app = new Hono2();
app.use("*", cors({
  origin: "*",
  // Allow all origins temporarily for debugging
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false
  // Set to false when using wildcard origin
}));
app.get("/debug/raw-env", async (c) => {
  return c.json({
    allEnvKeys: Object.keys(c.env),
    awsKeys: {
      AWS_ACCESS_KEY_ID: typeof c.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: typeof c.env.AWS_SECRET_ACCESS_KEY
    },
    rawAccess: {
      directAccessKeyId: c.env["AWS_ACCESS_KEY_ID"],
      directSecretKey: c.env["AWS_SECRET_ACCESS_KEY"]
    }
  });
});
app.get("/test-pipeline-config", async (c) => {
  try {
    const { ANALYSIS_PIPELINE_CONFIG: ANALYSIS_PIPELINE_CONFIG2 } = await Promise.resolve().then(() => (init_analysis_pipeline(), analysis_pipeline_exports));
    const { UniversalAIAdapter: UniversalAIAdapter2, selectModel: selectModel2 } = await Promise.resolve().then(() => (init_universal_ai_adapter(), universal_ai_adapter_exports));
    const tests = {
      triage_economy: selectModel2("triage", "economy"),
      light_balanced: selectModel2("light", "balanced"),
      deep_premium: selectModel2("deep", "premium"),
      xray_with_upgrade: selectModel2("xray", "balanced", { triage: { lead_score: 85 } })
    };
    return c.json({
      success: true,
      config_loaded: true,
      available_workflows: Object.keys(ANALYSIS_PIPELINE_CONFIG2.workflows),
      available_models: Object.keys(ANALYSIS_PIPELINE_CONFIG2.models),
      model_selection_tests: tests,
      sample_workflow: ANALYSIS_PIPELINE_CONFIG2.workflows.auto
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/test-gpt5", async (c) => {
  const requestId = generateRequestId();
  try {
    const { testGPT5Direct: testGPT5Direct2 } = await Promise.resolve().then(() => (init_gpt5_test(), gpt5_test_exports));
    const result = await testGPT5Direct2(c.env, requestId);
    return c.json({
      success: true,
      test_result: result,
      requestId
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message,
      requestId
    }, 500);
  }
});
app.get("/", (c) => {
  return c.json({
    status: "healthy",
    service: "OSLIRA Enterprise Analysis API - MODULAR VERSION",
    version: "v3.1.0-modular",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    features: [
      "modular_architecture",
      "lazy_loading",
      "real_engagement_calculation",
      "enterprise_analytics"
    ]
  });
});
app.get("/health", (c) => c.json({ status: "healthy", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
app.post("/v1/analyze", async (c) => {
  const { handleAnalyze: handleAnalyze2 } = await Promise.resolve().then(() => (init_analyze(), analyze_exports));
  return handleAnalyze2(c);
});
app.post("/v1/bulk-analyze", async (c) => {
  const { handleBulkAnalyze: handleBulkAnalyze2 } = await Promise.resolve().then(() => (init_bulk_analyze(), bulk_analyze_exports));
  return handleBulkAnalyze2(c);
});
app.post("/analyze", async (c) => {
  const { handleLegacyAnalyze: handleLegacyAnalyze2 } = await Promise.resolve().then(() => (init_legacy(), legacy_exports));
  return handleLegacyAnalyze2(c);
});
app.post("/bulk-analyze", async (c) => {
  const { handleLegacyBulkAnalyze: handleLegacyBulkAnalyze2 } = await Promise.resolve().then(() => (init_legacy(), legacy_exports));
  return handleLegacyBulkAnalyze2(c);
});
app.post("/stripe-webhook", async (c) => {
  const { handleStripeWebhook: handleStripeWebhook2 } = await Promise.resolve().then(() => (init_billing(), billing_exports));
  return handleStripeWebhook2(c);
});
app.post("/billing/create-checkout-session", async (c) => {
  const { handleCreateCheckoutSession: handleCreateCheckoutSession2 } = await Promise.resolve().then(() => (init_billing(), billing_exports));
  return handleCreateCheckoutSession2(c);
});
app.post("/billing/create-portal-session", async (c) => {
  const { handleCreatePortalSession: handleCreatePortalSession2 } = await Promise.resolve().then(() => (init_billing(), billing_exports));
  return handleCreatePortalSession2(c);
});
app.get("/analytics/summary", async (c) => {
  const { handleAnalyticsSummary: handleAnalyticsSummary2 } = await Promise.resolve().then(() => (init_analytics2(), analytics_exports));
  return handleAnalyticsSummary2(c);
});
app.post("/ai/generate-insights", async (c) => {
  const { handleGenerateInsights: handleGenerateInsights2 } = await Promise.resolve().then(() => (init_analytics2(), analytics_exports));
  return handleGenerateInsights2(c);
});
app.get("/debug-engagement/:username", async (c) => {
  const { handleDebugEngagement: handleDebugEngagement2 } = await Promise.resolve().then(() => (init_debug(), debug_exports));
  return handleDebugEngagement2(c);
});
app.get("/debug-scrape/:username", async (c) => {
  const { handleDebugScrape: handleDebugScrape2 } = await Promise.resolve().then(() => (init_debug(), debug_exports));
  return handleDebugScrape2(c);
});
app.get("/debug-parsing/:username", async (c) => {
  const { handleDebugParsing: handleDebugParsing2 } = await Promise.resolve().then(() => (init_debug(), debug_exports));
  return handleDebugParsing2(c);
});
app.get("/debug-env", async (c) => {
  const { handleDebugEnv: handleDebugEnv2 } = await Promise.resolve().then(() => (init_test(), test_exports));
  return handleDebugEnv2(c);
});
app.get("/test-orchestration", async (c) => {
  const { runIntegrationTests: runIntegrationTests2 } = await Promise.resolve().then(() => (init_orchestration_integration(), orchestration_integration_exports));
  try {
    const results = await runIntegrationTests2(c.env);
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);
    const successCount = results.filter((r) => r.success).length;
    return c.json({
      success: true,
      summary: {
        total_tests: results.length,
        passed: successCount,
        failed: results.length - successCount,
        total_cost: totalCost,
        total_duration_ms: totalDuration
      },
      results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
app.get("/test-supabase", async (c) => {
  const { handleTestSupabase: handleTestSupabase2 } = await Promise.resolve().then(() => (init_test(), test_exports));
  return handleTestSupabase2(c);
});
app.get("/test-apify", async (c) => {
  const { handleTestApify: handleTestApify2 } = await Promise.resolve().then(() => (init_test(), test_exports));
  return handleTestApify2(c);
});
app.get("/test-openai", async (c) => {
  const { handleTestOpenAI: handleTestOpenAI2 } = await Promise.resolve().then(() => (init_test(), test_exports));
  return handleTestOpenAI2(c);
});
app.post("/test-post", async (c) => {
  const { handleTestPost: handleTestPost2 } = await Promise.resolve().then(() => (init_test(), test_exports));
  return handleTestPost2(c);
});
app.post("/admin/migrate-to-aws", async (c) => {
  const { handleMigrateToAWS: handleMigrateToAWS2 } = await Promise.resolve().then(() => (init_enhanced_admin(), enhanced_admin_exports));
  return handleMigrateToAWS2(c);
});
app.post("/admin/update-key", async (c) => {
  const { handleUpdateApiKey: handleUpdateApiKey3 } = await Promise.resolve().then(() => (init_enhanced_admin(), enhanced_admin_exports));
  return handleUpdateApiKey3(c);
});
app.get("/admin/config-status", async (c) => {
  const { handleGetConfigStatus: handleGetConfigStatus3 } = await Promise.resolve().then(() => (init_enhanced_admin(), enhanced_admin_exports));
  return handleGetConfigStatus3(c);
});
app.get("/admin/audit-log", async (c) => {
  const { handleGetAuditLog: handleGetAuditLog3 } = await Promise.resolve().then(() => (init_enhanced_admin(), enhanced_admin_exports));
  return handleGetAuditLog3(c);
});
app.post("/admin/test-key", async (c) => {
  const { handleTestApiKey: handleTestApiKey3 } = await Promise.resolve().then(() => (init_enhanced_admin(), enhanced_admin_exports));
  return handleTestApiKey3(c);
});
app.post("/admin/get-config", async (c) => {
  const { handleGetConfig: handleGetConfig2 } = await Promise.resolve().then(() => (init_admin(), admin_exports));
  return handleGetConfig2(c);
});
app.onError((err, c) => {
  const requestId = generateRequestId();
  logger("error", "Unhandled enterprise worker error", {
    error: err.message,
    stack: err.stack,
    requestId
  });
  return c.json(createStandardResponse(false, void 0, "Internal server error", requestId), 500);
});
app.notFound((c) => {
  const requestId = generateRequestId();
  return c.json({
    success: false,
    error: "Endpoint not found",
    requestId,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "v3.1.0-modular",
    architecture: "modular_with_lazy_loading",
    available_endpoints: [
      "GET / - Health check",
      "GET /health - Simple health status",
      "GET /config - Configuration",
      "POST /v1/analyze - Main analysis endpoint",
      "POST /v1/bulk-analyze - Bulk analysis",
      "POST /billing/* - Stripe endpoints",
      "GET /analytics/* - Analytics endpoints",
      "GET /debug-* - Debug endpoints",
      "GET /test-* - Test endpoints"
    ]
  }, 404);
});
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
