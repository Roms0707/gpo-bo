# Snowplow Analytics -- Frontend Implementation Guide

## Overview

The backend has been fully configured to support per-tenant Snowplow analytics tracking. The consumer-facing frontend needs to integrate the Snowplow Browser SDK and wire it into authentication flows. This document provides everything needed to implement the integration.

---

## 1. Backend Infrastructure (Already Done)

### Database Configuration

The `project_configurations` table has two columns:

| Column             | Type    | Default | Description                                      |
| ------------------ | ------- | ------- | ------------------------------------------------ |
| `snowplow_enabled` | boolean | `false` | Whether Snowplow is active for this tenant        |
| `snowplow_app_id`  | text    | `null`  | The per-tenant Snowplow application identifier    |

### Current Tenant Configuration

| config_id              | snowplow_enabled | snowplow_app_id          |
| ---------------------- | ---------------- | ------------------------ |
| `default`              | `false`          | `null`                   |
| `ethio-esport`         | `true`           | `prod_dv_et_ethioarena`  |
| `orangearenatunisie`   | `true`           | `prod_dv_tn_orangearena` |

The `default` config will never have Snowplow enabled. Only branded tenants with an assigned `app_id` will track events.

### Collector Endpoint

The shared Snowplow collector URL for all tenants is stored in `platform_api_integrations` and returned by the edge function. **Do NOT hardcode it in the frontend.**

---

## 2. Edge Function: `get-snowplow-config`

This is the **only** endpoint the frontend needs to call.

### Request

**GET:**

```
{SUPABASE_URL}/functions/v1/get-snowplow-config?config_id={config_id}
```

**POST:**

```
POST {SUPABASE_URL}/functions/v1/get-snowplow-config
Content-Type: application/json

{ "config_id": "ethio-esport" }
```

### Authentication

- Pass the standard `Authorization: Bearer {ANON_KEY}` and `apikey` headers (same as other edge function calls)
- JWT verification is **disabled** on this function -- the anon key is sufficient
- The function uses `service_role` internally to read the configuration

### Response Interface

```typescript
interface SnowplowConfigResponse {
  success: boolean;
  enabled: boolean;
  collector_url?: string; // only present when enabled === true
  app_id?: string;        // only present when enabled === true
  error?: string;         // only present when success === false
}
```

### Example Responses

**Enabled tenant:**

```json
{
  "success": true,
  "enabled": true,
  "collector_url": "https://snp.dvtech.io",
  "app_id": "prod_dv_et_ethioarena"
}
```

**Disabled tenant:**

```json
{
  "success": true,
  "enabled": false
}
```

**Missing config_id:**

```json
{
  "success": false,
  "enabled": false,
  "error": "Missing config_id parameter"
}
```

---

## 3. Frontend Implementation Steps

### 3.1 Install the Snowplow Browser SDK

```bash
npm install @snowplow/browser-tracker
```

### 3.2 Create a Snowplow Service

Create a service (e.g. `src/services/snowplowService.ts`) that:

1. Calls `get-snowplow-config` with the current `config_id`
2. Initializes the tracker only if `enabled === true`
3. Exposes typed tracking functions that silently no-op when disabled

### 3.3 Tracker Initialization

Use `newTracker` from `@snowplow/browser-tracker` with these settings:

| Parameter              | Value                                                      |
| ---------------------- | ---------------------------------------------------------- |
| `namespace`            | Derive from config_id, e.g. `"dv_ethio-esport"`           |
| `appId`                | `app_id` from edge function response                       |
| `collector`            | `collector_url` from edge function response                |
| `eventMethod`          | `"post"`                                                   |
| `protocol`             | `"https"`                                                  |
| `forceSecureTracker`   | `true`                                                     |
| `stateStorageStrategy` | `"cookieAndLocalStorage"`                                  |
| `contexts.session`     | `true`                                                     |
| `sessionContext`       | `true`                                                     |

---

## 4. Event: `trackDvLogin`

This is the first event to implement.

### Schema

```
iglu:com.dgp/dv_login/jsonschema/1-0-5
```

### Payload Interface

```typescript
interface DvLoginEvent {
  type_of_action: 'login' | 'logout' | 'account_creation' | 'change_credentials' | 'remember_credentials';
  method: 'auto_cookie' | 'auto_token' | 'auto_he' | 'auto_sid' | 'manual';
  status: 'ok' | 'ko';
  type?: 'email' | 'msisdn' | 'login' | null;
}
```

### Firing the Event

```typescript
import { trackSelfDescribingEvent } from '@snowplow/browser-tracker';

function trackDvLogin(event: DvLoginEvent): void {
  if (!isSnowplowInitialized()) return;

  trackSelfDescribingEvent({
    event: {
      schema: 'iglu:com.dgp/dv_login/jsonschema/1-0-5',
      data: event,
    },
  });
}
```

---

## 5. Where to Fire `trackDvLogin`

### Manual Login (email/password or Kliento password)

```typescript
// success
trackDvLogin({ type_of_action: 'login', method: 'manual', status: 'ok', type: 'email' });
// use type: 'msisdn' for phone-based, 'login' for username-based

// failure
trackDvLogin({ type_of_action: 'login', method: 'manual', status: 'ko', type: 'email' });
```

### Auto Login (session restore from cookie/localStorage)

```typescript
// restored
trackDvLogin({ type_of_action: 'login', method: 'auto_cookie', status: 'ok', type: null });

// expired/invalid
trackDvLogin({ type_of_action: 'login', method: 'auto_cookie', status: 'ko', type: null });
```

### OTP Login (Kliento OTP flow)

```typescript
// verified
trackDvLogin({ type_of_action: 'login', method: 'auto_token', status: 'ok', type: 'msisdn' });

// failed
trackDvLogin({ type_of_action: 'login', method: 'auto_token', status: 'ko', type: 'msisdn' });
```

### Logout

```typescript
trackDvLogin({ type_of_action: 'logout', method: 'manual', status: 'ok', type: null });
```

### Account Creation (registration)

```typescript
// success
trackDvLogin({ type_of_action: 'account_creation', method: 'manual', status: 'ok', type: 'msisdn' });
// use type: 'email' for email-based registration

// failure
trackDvLogin({ type_of_action: 'account_creation', method: 'manual', status: 'ko', type: 'msisdn' });
```

---

## 6. Recommended Architecture

### React Context + Hook (Recommended)

Create a `SnowplowProvider` that wraps the app and initializes the tracker after the tenant config is resolved:

```
App
  -> ProjectConfigProvider (resolves config_id)
    -> SnowplowProvider (calls edge function, initializes tracker)
      -> AuthProvider (fires trackDvLogin events)
        -> Routes
```

Expose a hook:

```typescript
const { trackDvLogin, isReady } = useSnowplow();
```

### Key Principles

- Initialization must happen **after** `config_id` is known but **before** any auth events fire
- All tracking functions must be safe to call even when Snowplow is disabled (silent no-ops)
- Never hardcode the collector URL or app_id -- always fetch from the edge function
- Cache initialization -- only call the edge function once per page load

---

## 7. Development and Testing

### Local Development

With the `default` config_id, the edge function returns `enabled: false` and no events are sent. This is expected. Log a message so developers are aware:

```
[Snowplow] Tracking disabled for this tenant (config_id: default)
```

### Testing with Real Tenants

Override your local `config_id` to `ethio-esport` or `orangearenatunisie` to test actual event firing.

### Verifying Events

1. Open the browser **Network** tab
2. Look for POST requests to the collector URL path `/com.snowplowanalytics.snowplow/tp2`
3. Verify that events fire on login, logout, session restore, and registration

### Expected Behavior

| Tenant                 | Edge Function Returns | Tracker Initializes | Events Fire |
| ---------------------- | --------------------- | ------------------- | ----------- |
| `default`              | `enabled: false`      | No                  | No          |
| `ethio-esport`         | `enabled: true`       | Yes                 | Yes         |
| `orangearenatunisie`   | `enabled: true`       | Yes                 | Yes         |

---

## 8. Future Extensibility

The service is designed to support additional event types beyond `dv_login`. When new schemas are provided:

1. Add a new typed interface for the event payload
2. Add a new `track*` function in the service
3. Wire it into the relevant UI flow

The tracker initialization and tenant-awareness logic remains unchanged.

---

## 9. Quick Reference

| Item               | Value                                                           |
| ------------------ | --------------------------------------------------------------- |
| NPM Package        | `@snowplow/browser-tracker`                                     |
| Edge Function      | `GET /functions/v1/get-snowplow-config?config_id={config_id}`   |
| Login Event Schema | `iglu:com.dgp/dv_login/jsonschema/1-0-5`                       |
| Collector URL      | Fetched from edge function (do not hardcode)                    |
