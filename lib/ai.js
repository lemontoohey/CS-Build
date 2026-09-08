// AI receipt parsing — provider-agnostic. Whoever runs this build (you or
// your friend) picks a provider and pastes their own API key on the
// Settings page; nothing is hardcoded to one AI account. Both providers are
// called over plain fetch (built into Node 22+) — no SDK to install.
//
// This never writes to the database itself — it only extracts a best-guess
// structure from a receipt image/PDF page. A human still has to confirm it
// on the "Add receipt" screen before it becomes a real transaction.

const { store } = require('./store');

const PROVIDERS = ['anthropic', 'openai'];

async function getAiConfig() {
  const provider = (await store.getSetting('ai_provider')) || process.env.AI_PROVIDER || 'anthropic';
  const key =
    (await store.getSetting('ai_api_key')) ||
    (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY) ||
    null;
  return { provider: PROVIDERS.includes(provider) ? provider : 'anthropic', key };
}

async function saveAiConfig({ provider, key }) {
  if (PROVIDERS.includes(provider)) {
    await store.setSetting('ai_provider', provider);
  }
  if (key) {
    await store.setSetting('ai_api_key', key);
  }
}

async function isAiConfigured() {
  const { key } = await getAiConfig();
  return Boolean(key);
}

function receiptFields(categoryNames) {
  return {
    supplier: { type: 'string', description: 'Business name on the receipt.' },
    date: { type: 'string', description: 'Receipt date in YYYY-MM-DD format, if legible.' },
    total_amount: { type: 'number', description: 'Total amount paid, in dollars (e.g. 452.30).' },
    gst_amount: {
      type: 'number',
      description: 'GST component in dollars, if shown or calculable. 0 if not applicable.',
    },
    line_items: {
      type: 'array',
      description: 'Individual line items on the receipt.',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, amount: { type: 'number' } },
        required: ['description', 'amount'],
      },
    },
    suggested_category: {
      type: 'string',
      description: `Best-guess budget category for this receipt, chosen from exactly this list: ${categoryNames.join(
        ', '
      )}. Use "Uncategorised" only if nothing fits.`,
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description: 'How confident you are in this extraction overall.',
    },
  };
}

const RECEIPT_PROMPT =
  'This is a photo or scan of a building-materials receipt or invoice for a house build. ' +
  'Extract the details into the record_receipt tool/function. If a figure is not legible, leave it out ' +
  "rather than guessing a specific number. Flag your overall confidence honestly — this is a " +
  'construction site owner-builder tool, not a source of truth, so under-confidence is safer than over-confidence.';

async function callAnthropic({ apiKey, base64, mediaType, categoryNames }) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
  const tool = {
    name: 'record_receipt',
    description: 'Records the structured details extracted from a photographed or scanned receipt/invoice.',
    input_schema: {
      type: 'object',
      properties: receiptFields(categoryNames),
      required: ['total_amount', 'suggested_category', 'confidence'],
    },
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      tools: [tool],
      tool_choice: { type: 'tool', name: 'record_receipt' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: RECEIPT_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Anthropic API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const toolUse = (data.content || []).find((block) => block.type === 'tool_use');
  if (!toolUse) throw new Error('Claude did not return a structured extraction for this receipt.');
  return toolUse.input;
}

async function callOpenAi({ apiKey, base64, mediaType, categoryNames }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const tool = {
    type: 'function',
    function: {
      name: 'record_receipt',
      description: 'Records the structured details extracted from a photographed or scanned receipt/invoice.',
      parameters: {
        type: 'object',
        properties: receiptFields(categoryNames),
        required: ['total_amount', 'suggested_category', 'confidence'],
      },
    },
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      tools: [tool],
      tool_choice: { type: 'function', function: { name: 'record_receipt' } },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_PROMPT },
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error('OpenAI did not return a structured extraction for this receipt.');
  return JSON.parse(call.function.arguments);
}

async function parseReceipt({ base64, mediaType, categoryNames }) {
  const { provider, key } = await getAiConfig();
  if (!key) {
    throw new Error('No AI provider configured — add an API key on the Settings page to enable AI receipt parsing.');
  }

  if (provider === 'openai') {
    return callOpenAi({ apiKey: key, base64, mediaType, categoryNames });
  }
  return callAnthropic({ apiKey: key, base64, mediaType, categoryNames });
}

module.exports = { parseReceipt, isAiConfigured, getAiConfig, saveAiConfig, PROVIDERS };
