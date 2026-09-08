const http = require('node:http');
const { URL } = require('node:url');

require('./env').loadEnv();

const { sendHtml, sendJson, readJsonBody, redirect, notFound } = require('./lib/http');
const { handleDashboard } = require('./routes/dashboard');
const { handleBudgetPage, handleBudgetUpdate, handleBudgetNew } = require('./routes/budget');
const { handleTransactionNew, handleTransactionCreate } = require('./routes/transactions');
const { handleReceiptsNewPage, handleReceiptParseApi } = require('./routes/receipts');
const {
  handleDocumentsPage,
  handleDocumentUploadApi,
  handleDocumentFile,
} = require('./routes/documents');
const { handleDiaryPage, handleDiaryCreate } = require('./routes/diary');
const {
  handleMaterialsPage,
  handleMaterialNew,
  handleMaterialStatus,
  handleQuoteNew,
} = require('./routes/materials');
const { handleSchedulePage, handleScheduleUpdate } = require('./routes/schedule');
const { handleTradesPage, handleTradeNew } = require('./routes/trades');
const {
  handleCompliancePage,
  handleComplianceToggle,
  handleComplianceNew,
} = require('./routes/compliance');
const {
  handleSettingsPage,
  handleSettingsAiUpdate,
  handleSettingsBackendLocal,
  handleSettingsBackendSupabase,
  handleSettingsBackendGoogleDrive,
  handleGoogleOauthStart,
  handleGoogleOauthCallback,
  handleGoogleDisconnect,
} = require('./routes/settings');

const PORT = Number(process.env.PORT) || 3000;

const server = http.createServer(async (req, res) => {
  let pathname = '';
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    pathname = url.pathname;
    const query = Object.fromEntries(url.searchParams.entries());
    const flash = query.flash;
    const helpers = { sendHtml, sendJson, readJsonBody };

    // --- GET routes ---
    if (req.method === 'GET' && pathname === '/') {
      return await handleDashboard(req, res, helpers);
    }
    if (req.method === 'GET' && pathname === '/budget') {
      return await handleBudgetPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/transactions/new') {
      return await handleTransactionNew(req, res, helpers, query);
    }
    if (req.method === 'GET' && pathname === '/receipts/new') {
      return await handleReceiptsNewPage(req, res, helpers);
    }
    if (req.method === 'GET' && pathname === '/documents') {
      return await handleDocumentsPage(req, res, helpers, query);
    }
    if (req.method === 'GET' && pathname.startsWith('/documents/file/')) {
      const id = pathname.slice('/documents/file/'.length);
      return await handleDocumentFile(req, res, id);
    }
    if (req.method === 'GET' && pathname === '/diary') {
      return await handleDiaryPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/materials') {
      return await handleMaterialsPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/schedule') {
      return await handleSchedulePage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/trades') {
      return await handleTradesPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/compliance') {
      return await handleCompliancePage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/settings') {
      return await handleSettingsPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/oauth/google/start') {
      return await handleGoogleOauthStart(req, res, helpers);
    }
    if (req.method === 'GET' && pathname === '/oauth/google/callback') {
      return await handleGoogleOauthCallback(req, res, helpers, query);
    }

    // --- POST routes (HTML forms) ---
    if (req.method === 'POST' && pathname === '/budget/update') {
      return await handleBudgetUpdate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/budget/new') {
      return await handleBudgetNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/transactions') {
      return await handleTransactionCreate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/diary') {
      return await handleDiaryCreate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/materials/new') {
      return await handleMaterialNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/materials/status') {
      return await handleMaterialStatus(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/materials/quotes/new') {
      return await handleQuoteNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/schedule/update') {
      return await handleScheduleUpdate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/trades/new') {
      return await handleTradeNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/compliance/toggle') {
      return await handleComplianceToggle(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/compliance/new') {
      return await handleComplianceNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/settings/ai') {
      return await handleSettingsAiUpdate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/settings/backend/local') {
      return await handleSettingsBackendLocal(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/settings/backend/supabase') {
      return await handleSettingsBackendSupabase(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/settings/backend/google_drive') {
      return await handleSettingsBackendGoogleDrive(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/settings/google/disconnect') {
      return await handleGoogleDisconnect(req, res, helpers);
    }

    // --- POST routes (JSON APIs, used by client-side JS for file upload) ---
    if (req.method === 'POST' && pathname === '/api/receipts/parse') {
      return await handleReceiptParseApi(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/documents/upload') {
      return await handleDocumentUploadApi(req, res, helpers);
    }

    return notFound(res);
  } catch (err) {
    console.error(err);
    // A handful of store-layer errors are things a non-technical person can
    // actually act on from the Settings page (Google Drive not connected
    // yet, a bad Supabase key) — send them there with a plain-English flash
    // instead of a raw stack-trace-flavoured error page.
    const actionable = /Google Drive|Google sign-in|Supabase (REST )?error/.test(err.message);
    if (actionable && pathname !== '/settings' && !res.headersSent) {
      return redirect(res, '/settings?flash=' + encodeURIComponent(err.message));
    }
    if (!res.headersSent) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Something went wrong: ' + err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`House Cooper build tool running at http://localhost:${PORT}`);
});
