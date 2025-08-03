# n8n Webhook Integration Research Summary

_Generated: 2025-08-03 | Sources: 15+_

## 🎯 Quick Reference

<key-points>
- Webhooks can return execution IDs for tracking via API polling
- Use "Respond to Webhook" node for custom response handling
- Configure webhook response mode: "When Last Node Finishes" or "Using Respond to Webhook Node"
- Test webhooks use different URLs than production webhooks
- API endpoints: GET /api/v1/executions/{id} for polling results
- Maximum payload size: 16MB (configurable in self-hosted)
</key-points>

## 📋 Overview

<summary>
n8n provides robust webhook integration capabilities for external systems like YAYA dashboard. This research covers proper webhook configuration, execution tracking, API polling patterns, and best practices for reliable workflow integration. The system supports both immediate responses and deferred result retrieval via API polling.
</summary>

## 🔧 Implementation Details

<details>

### 1. Webhook Trigger Configuration

**Basic Webhook Setup:**

```javascript
// Webhook node configuration
{
  "httpMethod": "POST",  // Important: Use POST, not GET
  "path": "webhook-endpoint-name",
  "authentication": "none", // or configure as needed
  "responseMode": "whenLastNodeFinishes" // or "responseInsteadOfWebhook"
}
```

**Response Mode Options:**

- **Immediately**: Returns response code and "Workflow got started" message
- **When Last Node Finishes**: Returns response code and data from last executed node
- **Using 'Respond to Webhook' Node**: Custom response handling via Respond to Webhook node

### 2. Execution ID Tracking Pattern

**Recommended Workflow Structure:**

```
Webhook Trigger → Process Data → [Optional: Store Results] → Respond to Webhook

```

**Execution ID Response Example:**

```javascript
// In Respond to Webhook node, return execution metadata
{
  "executionId": "{{ $execution.id }}",
  "workflowId": "{{ $workflow.id }}",
  "status": "completed",
  "timestamp": "{{ $now }}",
  "data": {
    // Your workflow results here
  }
}
```

### 3. API Polling Implementation

**Dashboard Polling Pattern:**

```javascript
// 1. Send webhook request
const webhookResponse = await fetch(
  'https://your-instance.app.n8n.cloud/webhook/your-endpoint',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestData),
  }
)

const { executionId } = await webhookResponse.json()

// 2. Poll for results using n8n API
const pollForResults = async executionId => {
  const response = await fetch(
    `https://your-instance.app.n8n.cloud/api/v1/executions/${executionId}`,
    {
      headers: { Authorization: 'Bearer YOUR_API_KEY' },
    }
  )

  const execution = await response.json()

  if (execution.status === 'success') {
    return execution.data
  } else if (execution.status === 'failed') {
    throw new Error('Workflow execution failed')
  } else {
    // Still running, poll again
    await new Promise(resolve => setTimeout(resolve, 1000))
    return pollForResults(executionId)
  }
}
```

### 4. Advanced Response Handling

**Using Respond to Webhook Node:**

```javascript
// Place this node after your processing nodes
{
  "responseCode": 200,
  "responseBody": {
    "executionId": "{{ $execution.id }}",

    "status": "processing",
    // Include immediate results if available
    "preview": "{{ $json.summary }}"
  },
  "headers": {
    "Content-Type": "application/json",
    "X-Execution-ID": "{{ $execution.id }}"
  }

}
```

**Enable Response Output Branch:**

- Open Respond to Webhook node
- Go to Settings tab
- Enable "Enable Response Output Branch"
- This creates a second output containing the response data

### 5. Error Handling and Status Codes

**HTTP Response Codes:**

- 200: Successful execution
- 500: Workflow error before Respond to Webhook executes
- 403: IP not whitelisted (if IP whitelisting enabled)

**Error Response Pattern:**

```javascript
// In your workflow, add error handling
if (error) {
  return {
    executionId: '{{ $execution.id }}',
    status: 'error',
    error: error.message,
    timestamp: '{{ $now }}',
  }
}
```

</details>

## ⚠️ Important Considerations

<warnings>
- **Method Mismatch**: Ensure webhook accepts POST requests, not GET (common issue)
- **Path Conflicts**: Only one webhook per path/method combination allowed

- **Response Timing**: Choose appropriate response mode for your use case
- **API Access**: n8n API requires paid plan (not available during free trial)
- **Execution Limits**: Monitor execution history and clean up old executions
- **Security**: Use authentication and IP whitelisting for production
- **Payload Size**: Default 16MB limit (configurable in self-hosted instances)
- **Response Once**: Respond to Webhook node only executes once per workflow run

</warnings>

## 🔍 Troubleshooting Common Issues

<troubleshooting>

### Issue: "Cannot see workflow response"

**Root Causes:**

1. Webhook configured for GET instead of POST
2. Response mode set to "Immediately" instead of "When Last Node Finishes"
3. Respond to Webhook node not properly configured
4. Workflow error preventing response

**Solutions:**

1. Check webhook HTTP method configuration
2. Set response mode to "When Last Node Finishes" or use Respond to Webhook node
3. Add error handling nodes
4. Test with webhook test URL first

### Issue: "Execution ID not returned"

**Solutions:**

1. Use Respond to Webhook node with custom response
2. Include `{{ $execution.id }}` in response body
3. Enable execution data in workflow settings

### Issue: "API polling returns no data"

**Root Causes:**

1. Execution ID not valid
2. API authentication issues
3. Execution still running
4. Execution data not saved

**Solutions:**

1. Verify execution ID format
2. Check API key and permissions
3. Implement proper polling with status checks

4. Configure workflow to save execution data

### Issue: "Webhook timeout"

**Solutions:**

1. Optimize workflow performance

2. Use asynchronous pattern (immediate response + API polling)
3. Implement webhook response early in workflow
4. Break complex workflows into smaller parts

</troubleshooting>

## 🏗️ Architecture Patterns

<patterns>

### Pattern 1: Immediate Response

```
Webhook → Quick Processing → Respond to Webhook
```

Use when: Processing takes < 30 seconds

### Pattern 2: Async with Polling

```
Webhook → Store Request → Respond with Execution ID → Background Processing
Dashboard polls: GET /api/v1/executions/{id}
```

Use when: Long-running processes (> 30 seconds)

### Pattern 3: Hybrid Approach

```
Webhook → Quick Results + Start Background → Respond with Both
```

Use when: Need immediate feedback plus detailed results later

</patterns>

## 🔧 Configuration Examples

<configuration>

### Production Webhook Configuration

```javascript
{
  "webhook": {
    "httpMethod": "POST",
    "path": "yaya-creative-assistant",
    "authentication": "headerAuth",
    "responseMode": "responseInsteadOfWebhook",
    "ipWhitelist": ["your.dashboard.ip"]
  }
}
```

### Dashboard Integration Code

```javascript
// /api/workflows/execute endpoint
export async function POST(request) {
  try {
    // Send to n8n webhook
    const webhookResponse = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_API_KEY}`,
      },
      body: JSON.stringify(await request.json()),
    })

    const result = await webhookResponse.json()

    if (result.executionId) {
      // Store execution ID for polling
      return Response.json({
        executionId: result.executionId,
        status: 'processing',
      })
    } else {
      // Immediate result available
      return Response.json({
        status: 'completed',
        data: result,
      })
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

</configuration>

## 🔗 Resources

<references>
- [Webhook Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/) - Core webhook functionality
- [Respond to Webhook Node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/) - Custom response handling  
_ [n8n API Reference](https://docs.n8n.io/api/api-reference/) - REST API endpoints
_
- [Webhook Common Issues](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/common-issues/) - Troubleshooting guide
- [Executions Documentation](https://docs.n8n.io/workflows/executions/) - Execution tracking and management
- [n8n Community Forum](https://community.n8n.io/) - Community support and examples
</references>

## 🏷️ Metadata

<meta>
research-date: 2025-08-03
confidence: high
version-checked: n8n v1.86.1+
integration-pattern: webhook-trigger + api-polling
use-case: external-dashboard-integration
</meta>

## 💡 Best Practices Summary

1. **Always use POST** for webhook requests from external systems
2. **Implement proper error handling** in workflows
3. **Use Respond to Webhook node** for custom responses and execution ID tracking
4. **Set up API polling** for long-running workflows
5. **Test with webhook test URLs** before production deployment
6. **Configure authentication and IP whitelisting** for security
7. **Monitor execution history** and implement cleanup procedures
8. **Use hybrid patterns** for optimal user experience (immediate feedback + detailed results)

---

_This research provides comprehensive guidance for integrating n8n webhooks with external dashboard systems like YAYA, ensuring reliable workflow execution and result retrieval._
