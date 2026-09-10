const http = require('node:http');
const { URL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');

require('./env').loadEnv();

const { sendHtml, sendJson, readJsonBody, redirect, notFound } = require('./lib/http');
const { handleDashboard, handleDashboardReviewApi } = require('./routes/dashboard');
const { handleBudgetPage, handleBudgetUpdate, handleBudgetNew } = require('./routes/budget');
const { handleTransactionNew, handleTransactionCreate } = require('./routes/transactions');
const { handleReceiptsNewPage, handleReceiptParseApi } = require('./routes/receipts');
const {
  handleDocumentsPage,
  handleDocumentUploadApi,
  handleDocumentFile,
} = require('./routes/documents');
const {
  handleDiaryPage,
  handleDiaryCreate,
  handleDiaryStructureApi,
  handleDiaryWeatherApi,
} = require('./routes/diary');
const {
  handlePhotosPage,
  handlePhotoUploadApi,
  handlePhotoFile,
  handlePhotoToggleDefect,
} = require('./routes/photos');
const {
  handlePurchaseOrdersPage,
  handlePurchaseOrderCreate,
  handlePurchaseOrderDetail,
  handlePurchaseOrderStatus,
  handlePurchaseOrderPrint,
} = require('./routes/purchase-orders');
const {
  handleMaterialsPage,
  handleMaterialNew,
  handleMaterialStatus,
  handleQuoteNew,
} = require('./routes/materials');
const { handleSchedulePage, handleScheduleUpdate, handleScheduleCascade } = require('./routes/schedule');
const { handleCalculatorsPage } = require('./routes/calculators');
const {
  handlePlanMeasurePage,
  handlePlanMeasureState,
  handlePlanMeasureScale,
  handlePlanMeasureSave,
  handlePlanMeasureDelete,
  handlePlanMeasureSend,
  handlePlanMeasureTakeoffApi,
  handlePlanMeasureTakeoffConfirm,
} = require('./routes/plan-measure');
const { handleFormulatePage, handleFormulateNew, handleFormulateApply } = require('./routes/formulate');
const {
  handlePriceBookPage,
  handlePriceBookItemNew,
  handlePriceBookApplyOne,
  handlePriceBookApplyCheapest,
} = require('./routes/price-book');
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
    if (req.method === 'GET' && pathname === '/photos') {
      return await handlePhotosPage(req, res, helpers, query, flash);
    }
    if (req.method === 'GET' && pathname.startsWith('/photos/file/')) {
      const photoId = pathname.slice('/photos/file/'.length);
      return await handlePhotoFile(req, res, photoId);
    }
    if (req.method === 'GET' && pathname === '/diary') {
      return await handleDiaryPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/materials') {
      return await handleMaterialsPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname === '/purchase-orders') {
      return await handlePurchaseOrdersPage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname.startsWith('/purchase-orders/') && pathname.endsWith('/print')) {
      const poId = pathname.slice('/purchase-orders/'.length, -'/print'.length);
      return await handlePurchaseOrderPrint(req, res, poId);
    }
    if (req.method === 'GET' && pathname.startsWith('/purchase-orders/')) {
      const poId = pathname.slice('/purchase-orders/'.length);
      return await handlePurchaseOrderDetail(req, res, helpers, poId, flash);
    }
    if (req.method === 'GET' && pathname === '/calculators') {
      return await handleCalculatorsPage(req, res, helpers, query, flash);
    }
    if (req.method === 'GET' && pathname === '/plan-measure') {
      return await handlePlanMeasurePage(req, res, helpers, query, flash);
    }
    if (req.method === 'GET' && pathname === '/formulate') {
      return await handleFormulatePage(req, res, helpers, query, flash);
    }
    if (req.method === 'GET' && pathname === '/price-book') {
      return await handlePriceBookPage(req, res, helpers, query, flash);
    }
    if (req.method === 'GET' && pathname === '/schedule') {
      return await handleSchedulePage(req, res, helpers, flash);
    }
    if (req.method === 'GET' && pathname.startsWith('/public/')) {
      const name = path.basename(pathname);
      const file = path.join(__dirname, 'public', name);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return notFound(res);
      const types = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
      return;
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
    if (req.method === 'POST' && pathname.startsWith('/photos/') && pathname.endsWith('/defect')) {
      const photoId = pathname.slice('/photos/'.length, -'/defect'.length);
      return await handlePhotoToggleDefect(req, res, helpers, photoId);
    }
    if (req.method === 'POST' && pathname === '/materials/new') {
      return await handleMaterialNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/purchase-orders/new') {
      return await handlePurchaseOrderCreate(req, res, helpers);
    }
    if (req.method === 'POST' && pathname.startsWith('/purchase-orders/') && pathname.endsWith('/status')) {
      const poId = pathname.slice('/purchase-orders/'.length, -'/status'.length);
      return await handlePurchaseOrderStatus(req, res, helpers, poId);
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
    if (req.method === 'POST' && pathname === '/schedule/cascade') {
      return await handleScheduleCascade(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/formulate/new') {
      return await handleFormulateNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/formulate/apply') {
      return await handleFormulateApply(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/price-book/items/new') {
      return await handlePriceBookItemNew(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/price-book/apply-one') {
      return await handlePriceBookApplyOne(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/price-book/apply-cheapest') {
      return await handlePriceBookApplyCheapest(req, res, helpers);
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
    if (req.method === 'GET' && pathname === '/api/plan-measure/state') {
      return await handlePlanMeasureState(req, res, helpers, query);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/scale') {
      return await handlePlanMeasureScale(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/measurements') {
      return await handlePlanMeasureSave(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/measurements/delete') {
      return await handlePlanMeasureDelete(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/send-to-materials') {
      return await handlePlanMeasureSend(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/takeoff') {
      return await handlePlanMeasureTakeoffApi(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/plan-measure/takeoff/confirm') {
      return await handlePlanMeasureTakeoffConfirm(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/diary/structure') {
      return await handleDiaryStructureApi(req, res, helpers);
    }
    if (req.method === 'POST' && pathname === '/api/photos/upload') {
      return await handlePhotoUploadApi(req, res, helpers);
    }
    if (req.method === 'GET' && pathname === '/api/diary/weather') {
      return await handleDiaryWeatherApi(req, res, helpers, query);
    }
    if (req.method === 'POST' && pathname === '/api/dashboard/review') {
      return await handleDashboardReviewApi(req, res, helpers);
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
