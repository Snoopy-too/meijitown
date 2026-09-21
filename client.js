/**
 * Project Meiji - The Flying Dutchmen Lounge Client Adapter
 * Mounts Meiji Town within the lobby's Shadow DOM container, connects to
 * boardgame.io Socket.IO namespace, and synchronizes match state to MySQL.
 */

window.GameModules = window.GameModules || {};

function getTemplateHtml(mode = 'standard', playerName = 'Mayor', gameName = 'meiji-town') {
  return `
    <div class="meiji-module-root">
      <link rel="stylesheet" href="/game_modules/${gameName}/style.css">
      <link rel="stylesheet" href="/game_modules/${gameName}/public/css/style.css">
      <link rel="stylesheet" href="/game_modules/${gameName}/public/css/hud.css">
      <link rel="stylesheet" href="/game_modules/${gameName}/public/css/drawer.css">
      <link rel="stylesheet" href="/game_modules/${gameName}/public/css/civic.css">

      <!-- 3D Three.js Viewport Container -->
      <div id="canvas-container"></div>

      <!-- Top Chronicle Header: Stats & Era Context -->
      <header id="chronicle-banner" class="hud-topbar chronicle-banner">
        <div class="hud-topbar-row hud-row-primary header-vitals-row">
          <div class="header-brand-group">
            <div class="hud-title"><span class="kanji">明治</span> Meiji</div>
            <div class="hud-settlement-badge">
              <span id="val-cityname" class="hud-value hud-cityname">Edo-Tokyo</span>
              <span id="val-tier-badge" class="hud-tier-badge" title="Settlement Milestone Tier">村 (Tier 1)</span>
            </div>
            <div class="hud-mayor-badge" style="padding: 2px 8px; font-size: 11px; background: rgba(90,70,50,0.15); border-radius: 4px;">
              👤 <span id="val-mayor-name">${playerName}</span>
            </div>
          </div>

          <div class="header-vitals-group">
            <div class="hud-stat">
              <span class="hud-label">Treasury</span>
              <span id="val-treasury" class="hud-value" style="color: #b58900;">${mode === 'sandbox' ? '¥∞' : '¥10,000'}</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">Cashflow</span>
              <span id="val-cashflow" class="hud-value" style="color: #3a6332;">+¥0/mo</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">Population</span>
              <span id="val-population" class="hud-value">0</span>
            </div>
            <div class="hud-stat hud-happiness-stat" title="Citizen Satisfaction & Town Welfare">
              <span class="hud-label">Satisfaction</span>
              <span id="val-happiness" class="hud-value" style="color: #3a6332;">65%</span>
            </div>
          </div>

          <div class="header-demand-group">
            <div id="rci-container" class="demand-container rci-meter" title="Zoning Demand (R: Residential, C: Commercial, I: Industrial)">
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-res" class="bar-fill fill-res"></div></div>
                <span class="bar-tag bar-tag-r">R</span>
              </div>
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-com" class="bar-fill fill-com"></div></div>
                <span class="bar-tag bar-tag-c">C</span>
              </div>
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-ind" class="bar-fill fill-ind"></div></div>
                <span class="bar-tag bar-tag-i">I</span>
              </div>
            </div>
          </div>
        </div>

        <div class="hud-topbar-row hud-row-secondary header-controls-row">
          <div class="header-date-group">
            <span class="hud-label">Chronicle</span>
            <span id="val-date" class="hud-value">Meiji 5 (1872)</span>
          </div>

          <div id="time-controls" class="time-controls header-time-group" title="Simulation Speed [Space: Pause, 1x, 2x, 3x, 5x]">
            <button id="btn-time-pause" class="time-btn" data-speed="0" title="Pause simulation">⏸</button>
            <button id="btn-speed-1x" class="time-btn active" data-speed="1" title="Standard Speed (1x)">1x</button>
            <button id="btn-speed-2x" class="time-btn" data-speed="2" title="Fast Speed (2x)">2x</button>
            <button id="btn-speed-3x" class="time-btn" data-speed="3" title="Swift Speed (3x)">3x</button>
            <button id="btn-speed-5x" class="time-btn" data-speed="5" title="Hyper Speed (5x)">5x</button>
          </div>

          <div class="header-utility-group">
            <button id="audio-toggle-btn" class="time-btn audio-toggle-btn" title="Toggle Sound">🔊 On</button>
            <button id="lang-toggle-btn" class="time-btn lang-toggle-btn" title="Switch Language / 言語切替">🌐 日本語</button>
            <div class="time-audio-divider" aria-hidden="true"></div>
            <button id="btn-layers-toggle" class="time-btn hud-btn-civic" title="Map Data Overlays / 地図レイヤー">🗺️ <span>Layers</span></button>
            <button id="btn-policy-ledger" class="time-btn hud-btn-civic" title="Civic Policies & Imperial Edicts / 政策録">📜 <span>Edicts</span></button>
          </div>
        </div>
      </header>

      <!-- Contextual Surveyor Scope (Bottom-Left) -->
      <div id="surveyor-scope" class="surveyor-scope scope-minimized">
        <button id="scope-pill-badge" class="scope-pill" title="Survey Scope">🧭 Scope <span id="insp-coords">(0, 0)</span></button>
        <aside id="scope-card" class="scope-card">
          <div class="scope-header">
            <span>Surveyor's Scope</span>
            <button id="scope-toggle-btn" class="scope-close-btn">✕</button>
          </div>
          <div class="scope-body">
            <div class="scope-row"><span class="scope-label">Tile:</span><span id="insp-type" class="scope-value">Open Meadow</span></div>
            <div class="scope-row"><span class="scope-label">Stage:</span><span id="insp-stage" class="scope-value">Unoccupied</span></div>
            <div class="scope-row"><span class="scope-label">Road:</span><span id="insp-road" class="scope-value">No</span></div>
            <div class="scope-row"><span class="scope-label">Fire Hazard:</span><span id="insp-fire" class="scope-value">None (0%)</span></div>
            <div class="scope-row"><span class="scope-label">Sanitation:</span><span id="insp-water" class="scope-value">Clean (Safe)</span></div>
            <div class="scope-row"><span class="scope-label">Leisure:</span><span id="insp-leisure" class="scope-value">None</span></div>
            <div class="scope-row"><span class="scope-label">Order:</span><span id="insp-order" class="scope-value">Unpatrolled</span></div>
            <div class="scope-row"><span class="scope-label">Education:</span><span id="insp-education" class="scope-value">Unserved</span></div>
          </div>
        </aside>
      </div>

      <!-- Active Tool Floating Action Button -->
      <div id="active-tool-container" class="active-tool-container">
        <div id="active-tool-btn" class="active-tool-fab">
          <span id="fab-tool-icon" class="fab-icon">🧭</span>
          <span id="fab-tool-name" class="fab-name">Survey Mode</span>
          <button id="fab-rotate-btn" class="fab-rotate-btn" style="display: none;">⟳ <span id="fab-rotate-deg">0°</span></button>
          <button id="fab-cancel-btn" class="fab-cancel" style="display: none;">✕</button>
        </div>
      </div>

      <!-- Collapsible Build Menu Drawer -->
      <div id="drawer-overlay" class="drawer-overlay"></div>
      <nav id="build-drawer" class="build-drawer">
        <div class="drawer-header">
          <div class="drawer-title"><span class="kanji">建築目録</span> <span>Construction Catalogue</span></div>
          <button id="drawer-close-btn" class="drawer-close">✕</button>
        </div>

        <div class="drawer-tabs">
          <button class="drawer-tab-btn active" data-tab="infra">🛣️ Infrastructure</button>
          <button class="drawer-tab-btn" data-tab="zones">🏡 Zones</button>
          <button class="drawer-tab-btn" data-tab="civic">🏯 Public Services</button>
          <button class="drawer-tab-btn" data-tab="leisure">🍵 Leisure & Culture</button>
        </div>

        <!-- Infrastructure Panel -->
        <div id="tab-panel-infra" class="drawer-tab-panel active">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="road"><span class="item-icon">🛣️</span><span class="item-name">Dirt Road</span><span class="item-cost">¥10</span></button>
            <button class="drawer-item-btn" data-tool="stone_road"><span class="item-icon">🧱</span><span class="item-name">Stone Paving</span><span class="item-cost">¥30</span></button>
            <button class="drawer-item-btn" data-tool="canal"><span class="item-icon">🌊</span><span class="item-name">Canal</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="rail_track"><span class="item-icon">🛤️</span><span class="item-name">Rail Tracks</span><span class="item-cost">¥20</span></button>
            <button class="drawer-item-btn" data-tool="train_depot"><span class="item-icon">🚉</span><span class="item-name">Train Depot</span><span class="item-cost">¥350</span></button>
            <button class="drawer-item-btn" data-tool="harbor_pier"><span class="item-icon">⚓</span><span class="item-name">Cargo Pier</span><span class="item-cost">¥450</span></button>
            <button class="drawer-item-btn" data-tool="power_plant"><span class="item-icon">🏭</span><span class="item-name">Power Plant</span><span class="item-cost">¥600</span></button>
            <button class="drawer-item-btn item-btn-danger" data-tool="bulldozer"><span class="item-icon">🪓</span><span class="item-name">Demolish</span><span class="item-cost">¥5</span></button>
          </div>
        </div>

        <!-- Zones Panel -->
        <div id="tab-panel-zones" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="residential"><span class="item-icon">🏡</span><span class="item-name">Machiya (R)</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="commercial"><span class="item-icon">🏬</span><span class="item-name">Shouten (C)</span><span class="item-cost">¥20</span></button>
            <button class="drawer-item-btn" data-tool="industrial"><span class="item-icon">⚒️</span><span class="item-name">Workshop (I)</span><span class="item-cost">¥25</span></button>
            <button class="drawer-item-btn" data-tool="rice_paddy"><span class="item-icon">🌾</span><span class="item-name">Rice Paddy</span><span class="item-cost">¥10</span></button>
          </div>
        </div>

        <!-- Civic Panel -->
        <div id="tab-panel-civic" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="watchtower"><span class="item-icon">🏯</span><span class="item-name">Watchtower</span><span class="item-cost">¥250</span></button>
            <button class="drawer-item-btn" data-tool="fire_depot"><span class="item-icon">🚒</span><span class="item-name">Fire Depot</span><span class="item-cost">¥180</span></button>
            <button class="drawer-item-btn" data-tool="well"><span class="item-icon">💧</span><span class="item-name">Well (Ido)</span><span class="item-cost">¥60</span></button>
            <button class="drawer-item-btn" data-tool="koban"><span class="item-icon">🏮</span><span class="item-name">Police (Kōban)</span><span class="item-cost">¥110</span></button>
            <button class="drawer-item-btn" data-tool="school"><span class="item-icon">🏫</span><span class="item-name">Primary School</span><span class="item-cost">¥280</span></button>
            <button class="drawer-item-btn" data-tool="telegraph"><span class="item-icon">⚡</span><span class="item-name">Telegraph</span><span class="item-cost">¥220</span></button>
          </div>
        </div>

        <!-- Leisure Panel -->
        <div id="tab-panel-leisure" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="tree_willow"><span class="item-icon">🌸</span><span class="item-name">Canal Tree</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="shrine_park"><span class="item-icon">⛩️</span><span class="item-name">Shrine Park</span><span class="item-cost">¥50</span></button>
            <button class="drawer-item-btn" data-tool="ochaya"><span class="item-icon">🍵</span><span class="item-name">Teahouse</span><span class="item-cost">¥120</span></button>
            <button class="drawer-item-btn" data-tool="sento"><span class="item-icon">♨️</span><span class="item-name">Bathhouse</span><span class="item-cost">¥90</span></button>
            <button class="drawer-item-btn" data-tool="monument_pavilion"><span class="item-icon">🏛️</span><span class="item-name">Exposition Pavilion</span><span class="item-cost">¥2,000</span></button>
          </div>
        </div>

        <div id="drawer-tool-inspector" class="washi-inspector-strip">
          <div class="inspector-header">
            <span id="inspector-tool-name" class="inspector-name">Select an item</span>
            <span id="inspector-tool-cost" class="inspector-cost"></span>
          </div>
          <p id="inspector-tool-effect" class="inspector-desc">Hover over any building or tool to view municipal benefits.</p>
        </div>
      </nav>

      <!-- Save & Match Status Actions (Bottom Right) -->
      <div id="hud-actions" class="hud-actions">
        <button id="btn-save" class="action-btn btn-primary" title="Save city progress to MySQL database">
          <span>💾</span><span class="btn-label"> Save Match</span>
        </button>
      </div>

      <!-- Feedback Toasts & Inline Drag Badge -->
      <div id="toast-container"></div>
      <div id="drag-badge" style="display: none;"></div>
    </div>
  `;
}

function mountMeijiClient(container, config) {
  if (!container) return;

  const matchID = config && config.matchID ? config.matchID : '';
  const playerID = config && config.playerID !== undefined ? String(config.playerID) : '0';
  const credentials = config && config.credentials ? config.credentials : '';
  const playerName = config && config.playerName ? config.playerName : 'Mayor';
  const gameName = config && config.gameName ? config.gameName : 'meiji-town';
  const mode = (config && config.setupData && config.setupData.mode) || (config && config.mode) || 'standard';

  // Set global asset base and manual mount flag
  window.__MEIJI_ASSET_BASE__ = `/game_modules/${gameName}/public/`;
  window.__MEIJI_MANUAL_MOUNT__ = true;

  // Render HTML scaffolding into Shadow DOM container
  container.innerHTML = getTemplateHtml(mode, playerName, gameName);

  // Setup Three.js ESM import map if not present
  if (!document.querySelector('script[type="importmap"]')) {
    const importMap = document.createElement('script');
    importMap.type = 'importmap';
    importMap.textContent = JSON.stringify({
      imports: {
        "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
        "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
      }
    });
    document.head.appendChild(importMap);
  }

  let latestSyncState = null;
  function applySyncState(state) {
    if (!state || !window.game || !state.G) return;
    const G = state.G;
    if (G.vitals && G.vitals.treasury !== undefined) {
      window.game.treasury = G.vitals.treasury;
    }
    if (G.chronicle) {
      window.game.currentYear = G.chronicle.currentYear;
      window.game.currentMonth = G.chronicle.currentMonth;
    }
    if (G.gridSnapshot && window.game.grid) {
      try {
        window.game.grid.loadFromMap(G.gridSnapshot);
      } catch (e) {}
    }
    window.game.updateHUD();
  }

  // Connect to boardgame.io Socket.IO namespace
  let socket = null;
  if (typeof io !== 'undefined') {
    const nspUrl = `${window.location.origin}/${gameName}`;
    socket = io(nspUrl);
    window.__currentMeijiSocket = socket;

    socket.on('connect', () => {
      console.log(`[Meiji] Connected to socket namespace for match ${matchID}`);
      socket.emit('sync', matchID, String(playerID), credentials);
    });

    socket.on('sync', (mId, syncData) => {
      if (mId === matchID && syncData && syncData.state) {
        console.log('[Meiji] Synced state from match:', syncData.state);
        latestSyncState = syncData.state;
        applySyncState(syncData.state);
      }
    });
  }

  // Dynamically load the Meiji Town ES module engine
  import(`/game_modules/${gameName}/public/js/app.js`)
    .then(({ GameStateManager }) => {
      if (GameStateManager) {
        window.game = new GameStateManager(container);
        console.log('[Meiji] GameStateManager mounted inside lounge container.');
        if (latestSyncState) {
          applySyncState(latestSyncState);
        }

        // Override save handler to save via boardgame.io move -> MySQL
        const saveBtn = container.querySelector('#btn-save');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            if (socket && window.game) {
              const snapshot = {
                vitals: {
                  cityName: window.game.cityName,
                  treasury: window.game.treasury,
                  population: window.game.population,
                  satisfaction: window.game.metrics?.townHappiness || 65
                },
                chronicle: {
                  currentYear: window.game.currentYear,
                  currentMonth: window.game.currentMonth
                },
                gridSnapshot: window.game.grid ? window.game.grid.exportToArray() : []
              };

              socket.emit('makeMove', 'syncCityState', [snapshot], matchID, String(playerID), credentials);
              if (window.game.showToast) {
                window.game.showToast('💾 Match state saved to lounge database!');
              }
            }
          });
        }
      }
    })
    .catch((err) => {
      console.error('[Meiji] Failed to load Meiji Town module:', err);
    });
}

function unmountMeijiClient() {
  if (window.__currentMeijiSocket) {
    try { window.__currentMeijiSocket.disconnect(); } catch (e) {}
    window.__currentMeijiSocket = null;
  }
  if (window.game) {
    if (window.game.simulation && typeof window.game.simulation.stop === 'function') {
      window.game.simulation.stop();
    }
    if (window.game.renderer && typeof window.game.renderer.destroy === 'function') {
      window.game.renderer.destroy();
    }
    window.game = null;
  }
  console.log('[Meiji] Unmounted Meiji Town client.');
}

window.GameModules['meiji-town'] = {
  mountClient: mountMeijiClient,
  unmountClient: unmountMeijiClient
};
window.GameModules['meijitown'] = window.GameModules['meiji-town'];
