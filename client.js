/**
 * Project Meiji - The Flying Dutchmen Lounge Client Adapter
 * Mounts Meiji Town within the lobby's Shadow DOM container, connects to
 * boardgame.io Socket.IO namespace, and synchronizes match state to MySQL.
 */

window.GameModules = window.GameModules || {};

function getTemplateHtml(mode = 'standard', playerName = 'Mayor', gameName = 'meiji-town') {
  const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('meiji_lang') : null;
  const isJa = savedLang === 'ja' || (!savedLang && typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('ja'));

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
            <div class="hud-title"><span class="kanji">明治</span> <span data-i18n="hud.title_sub">Meiji</span></div>
            <div class="hud-settlement-badge">
              <span id="val-cityname" class="hud-value hud-cityname">Edo-Tokyo</span>
              <span id="val-tier-badge" class="hud-tier-badge" title="Settlement Milestone Tier" data-i18n-title="milestone.badge_title">村 (Tier 1)</span>
            </div>
            <div class="hud-mayor-badge" style="padding: 2px 8px; font-size: 11px; background: rgba(90,70,50,0.15); border-radius: 4px;">
              👤 <span id="val-mayor-name">${playerName}</span>
            </div>
          </div>

          <div class="header-vitals-group">
            <div class="hud-stat">
              <span class="hud-label" data-i18n="hud.treasury">${isJa ? '国庫資金' : 'Treasury'}</span>
              <span id="val-treasury" class="hud-value" style="color: #b58900;">${mode === 'sandbox' ? '¥∞' : '¥5,000'}</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label" data-i18n="hud.cashflow">${isJa ? '月間収支' : 'Cashflow'}</span>
              <span id="val-cashflow" class="hud-value" style="color: #3a6332;">+¥0/mo</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label" data-i18n="hud.population">${isJa ? '町人口' : 'Population'}</span>
              <span id="val-population" class="hud-value">0</span>
            </div>
            <div class="hud-stat hud-happiness-stat" title="Citizen Satisfaction & Town Welfare" data-i18n-title="hud.satisfaction_title">
              <span class="hud-label" data-i18n="hud.satisfaction">${isJa ? '町民満足度' : 'Satisfaction'}</span>
              <span id="val-happiness" class="hud-value" style="color: #3a6332;">65%</span>
            </div>
          </div>

          <div class="header-demand-group">
            <div id="rci-container" class="demand-container rci-meter" title="Zoning Demand (R: Residential, C: Commercial, I: Industrial)" data-i18n-title="hud.rci_title">
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-res" class="bar-fill fill-res"></div></div>
                <span class="bar-tag bar-tag-r" data-i18n="hud.rci_r">R</span>
              </div>
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-com" class="bar-fill fill-com"></div></div>
                <span class="bar-tag bar-tag-c" data-i18n="hud.rci_c">C</span>
              </div>
              <div class="demand-bar">
                <div class="bar-track"><div id="fill-ind" class="bar-fill fill-ind"></div></div>
                <span class="bar-tag bar-tag-i" data-i18n="hud.rci_i">I</span>
              </div>
            </div>
          </div>
        </div>

        <div class="hud-topbar-row hud-row-secondary header-controls-row">
          <div class="header-date-group">
            <span class="hud-label" data-i18n="hud.chronicle">${isJa ? '時代年代記' : 'Chronicle'}</span>
            <span id="val-date" class="hud-value">${isJa ? '明治5年 (1872年) 睦月 (1月)' : 'Meiji 5 (1872)'}</span>
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
            <div id="lang-selector-group" class="lang-selector-group" style="display: inline-flex; gap: 2px;">
              <button id="btn-lang-en" class="time-btn lang-btn ${isJa ? '' : 'active'}" data-lang="en" title="English / 英語">EN</button>
              <button id="btn-lang-ja" class="time-btn lang-btn ${isJa ? 'active' : ''}" data-lang="ja" title="日本語 / Japanese">日本語</button>
            </div>
            <button id="lang-toggle-btn" class="time-btn lang-toggle-btn ${isJa ? 'active' : ''}" title="Switch Language / 言語切替" style="display: none;">🌐 ${isJa ? '日本語' : 'EN'}</button>
            <div class="time-audio-divider" aria-hidden="true"></div>
            <button id="btn-layers-toggle" class="time-btn hud-btn-civic" title="Map Data Overlays / 地図レイヤー" data-i18n-title="hud.layers_title">🗺️ <span data-i18n="hud.layers">${isJa ? '階層地図' : 'Layers'}</span></button>
            <button id="btn-policy-ledger" class="time-btn hud-btn-civic" title="Civic Policies & Imperial Edicts / 政策録" data-i18n-title="hud.edicts_title">📜 <span data-i18n="hud.edicts">${isJa ? '政策録' : 'Edicts'}</span></button>
            <!-- Washi Map Layers Dropdown Popover -->
            <div id="layer-menu-popover" class="layer-menu-popover washi-card" style="display: none;">
              <div class="layer-menu-header"><h4 data-i18n="hud.layers_menu_title">${isJa ? '地図レイヤー表示' : 'Map Data Overlays'}</h4></div>
              <div class="layer-menu-options">
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="none" checked><span data-i18n="layer.normal">${isJa ? '通常表示' : 'Normal View'}</span></label>
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="fire"><span data-i18n="layer.fire">${isJa ? '🔥 火災危険度' : '🔥 Fire Hazard'}</span></label>
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="sanitation"><span data-i18n="layer.sanitation">${isJa ? '💧 衛生・井戸水道' : '💧 Sanitation & Water'}</span></label>
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="electric"><span data-i18n="layer.electric">${isJa ? '⚡ 送電網・電灯' : '⚡ Electric Grid'}</span></label>
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="pollution"><span data-i18n="layer.pollution">${isJa ? '🏭 石炭煤煙公害' : '🏭 Coal Soot Pollution'}</span></label>
                <label class="layer-radio-item"><input type="radio" name="layer-mode" value="flood"><span data-i18n="layer.flood">${isJa ? '🌊 水害危険度' : '🌊 Flood Risk'}</span></label>
                <div style="margin: 4px 0; border-top: 1px dashed #8c7355; opacity: 0.4;"></div>
                <label class="layer-radio-item" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;"><span>🧑‍💼 <span data-i18n="hud.advisor_guidance">${isJa ? '助言役の手引き' : 'Advisor Guidance'}</span></span><input type="checkbox" id="toggle-advisor-guidance" checked style="cursor: pointer;"></label>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Contextual Surveyor Scope (Bottom-Left) -->
      <div id="surveyor-scope" class="surveyor-scope scope-minimized">
        <button id="scope-pill-badge" class="scope-pill" title="Survey Scope" data-i18n-title="scope.pill">🧭 <span data-i18n="scope.pill">Scope</span> <span id="insp-coords">(0, 0)</span></button>
        <aside id="scope-card" class="scope-card">
          <div class="scope-header">
            <span data-i18n="scope.title">${isJa ? '測量士の手帳' : "Surveyor's Scope"}</span>
            <button id="scope-toggle-btn" class="scope-close-btn">✕</button>
          </div>
          <div class="scope-body">
            <div class="scope-row"><span class="scope-label" data-i18n="scope.tile">${isJa ? '地目:' : 'Tile:'}</span><span id="insp-type" class="scope-value">${isJa ? '未開墾の原野' : 'Open Meadow'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.stage">${isJa ? '状態:' : 'Stage:'}</span><span id="insp-stage" class="scope-value">${isJa ? '空地' : 'Unoccupied'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.road">${isJa ? '道路接続:' : 'Road:'}</span><span id="insp-road" class="scope-value">${isJa ? '未接続' : 'No'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.fire_hazard">${isJa ? '火災危険度:' : 'Fire Hazard:'}</span><span id="insp-fire" class="scope-value">${isJa ? 'なし (0%)' : 'None (0%)'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.sanitation">${isJa ? '衛生環境:' : 'Sanitation:'}</span><span id="insp-water" class="scope-value">${isJa ? '清浄 (安全)' : 'Clean (Safe)'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.leisure">${isJa ? '娯楽水準:' : 'Leisure:'}</span><span id="insp-leisure" class="scope-value">${isJa ? 'なし' : 'None'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.order">${isJa ? '治安巡回:' : 'Order:'}</span><span id="insp-order" class="scope-value">${isJa ? '警備巡回なし' : 'Unpatrolled'}</span></div>
            <div class="scope-row"><span class="scope-label" data-i18n="scope.education">${isJa ? '教育学区:' : 'Education:'}</span><span id="insp-education" class="scope-value">${isJa ? '未就学' : 'Unserved'}</span></div>
          </div>
        </aside>
      </div>

      <!-- Active Tool Floating Action Button -->
      <div id="active-tool-container" class="active-tool-container">
        <div id="active-tool-btn" class="active-tool-fab">
          <span id="fab-tool-icon" class="fab-icon">🧭</span>
          <span id="fab-tool-name" class="fab-name">${isJa ? '測量視察' : 'Survey Mode'}</span>
          <button id="fab-rotate-btn" class="fab-rotate-btn" style="display: none;">⟳ <span id="fab-rotate-deg">0°</span></button>
          <button id="fab-cancel-btn" class="fab-cancel" style="display: none;">✕</button>
        </div>
      </div>

      <!-- Collapsible Build Menu Drawer -->
      <div id="drawer-overlay" class="drawer-overlay"></div>
      <nav id="build-drawer" class="build-drawer">
        <div class="drawer-header">
          <div class="drawer-title"><span class="kanji">建築目録</span> <span class="drawer-subtitle" data-i18n="drawer.title">${isJa ? '(都市造営・普請)' : 'Construction Catalogue'}</span></div>
          <button id="drawer-close-btn" class="drawer-close">✕</button>
        </div>

        <div class="drawer-tabs">
          <button class="drawer-tab-btn active" data-tab="infra" data-i18n="tab.infra">${isJa ? '🛣️ 交通・水路' : '🛣️ Infrastructure'}</button>
          <button class="drawer-tab-btn" data-tab="zones" data-i18n="tab.zones">${isJa ? '🏡 地区指定' : '🏡 Zones'}</button>
          <button class="drawer-tab-btn" data-tab="civic" data-i18n="tab.civic">${isJa ? '🏯 公共施設' : '🏯 Public Services'}</button>
          <button class="drawer-tab-btn" data-tab="leisure" data-i18n="tab.leisure">${isJa ? '🍵 娯楽・文化' : '🍵 Leisure & Culture'}</button>
        </div>

        <!-- Infrastructure Panel -->
        <div id="tab-panel-infra" class="drawer-tab-panel active">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="road"><span class="item-icon">🛣️</span><span class="item-name">${isJa ? '往来土道' : 'Dirt Road'}</span><span class="item-cost">¥10</span></button>
            <button class="drawer-item-btn" data-tool="stone_road"><span class="item-icon">🧱</span><span class="item-name">${isJa ? '石畳舗装' : 'Stone Paving'}</span><span class="item-cost">¥30</span></button>
            <button class="drawer-item-btn" data-tool="canal"><span class="item-icon">🌊</span><span class="item-name">${isJa ? '堀・水路' : 'Canal (Hori)'}</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="rail_track"><span class="item-icon">🛤️</span><span class="item-name">${isJa ? '鉄道路線' : 'Rail Tracks'}</span><span class="item-cost">¥20</span></button>
            <button class="drawer-item-btn" data-tool="train_depot"><span class="item-icon">🚉</span><span class="item-name">${isJa ? '停車場・駅' : 'Train Depot'}</span><span class="item-cost">¥350</span></button>
            <button class="drawer-item-btn" data-tool="harbor_pier"><span class="item-icon">⚓</span><span class="item-name">${isJa ? '船着場 (港湾荷揚場)' : 'Cargo Pier'}</span><span class="item-cost">¥450</span></button>
            <button class="drawer-item-btn" data-tool="power_plant"><span class="item-icon">🏭</span><span class="item-name">${isJa ? '石炭火力発電所' : 'Coal Steam Plant'}</span><span class="item-cost">¥600</span></button>
            <button class="drawer-item-btn item-btn-danger" data-tool="bulldozer"><span class="item-icon">🪓</span><span class="item-name">${isJa ? '撤去・取壊し' : 'Demolish'}</span><span class="item-cost">¥5</span></button>
          </div>
        </div>

        <!-- Zones Panel -->
        <div id="tab-panel-zones" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="residential"><span class="item-icon">🏡</span><span class="item-name">${isJa ? '町家 (居住)' : 'Machiya (R)'}</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="commercial"><span class="item-icon">🏬</span><span class="item-name">${isJa ? '商店 (商業)' : 'Shouten (C)'}</span><span class="item-cost">¥20</span></button>
            <button class="drawer-item-btn" data-tool="industrial"><span class="item-icon">⚒️</span><span class="item-name">${isJa ? '作業場 (工業)' : 'Workshop (I)'}</span><span class="item-cost">¥25</span></button>
            <button class="drawer-item-btn" data-tool="rice_paddy"><span class="item-icon">🌾</span><span class="item-name">${isJa ? '灌漑水田' : 'Rice Paddy'}</span><span class="item-cost">¥10</span></button>
          </div>
        </div>

        <!-- Civic Panel -->
        <div id="tab-panel-civic" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="watchtower"><span class="item-icon">🏯</span><span class="item-name">${isJa ? '火の見櫓' : 'Watchtower'}</span><span class="item-cost">¥250</span></button>
            <button class="drawer-item-btn" data-tool="fire_depot"><span class="item-icon">🚒</span><span class="item-name">${isJa ? '消防屯所' : 'Fire Depot'}</span><span class="item-cost">¥180</span></button>
            <button class="drawer-item-btn" data-tool="well"><span class="item-icon">💧</span><span class="item-name">${isJa ? '共同井戸' : 'Well (Ido)'}</span><span class="item-cost">¥60</span></button>
            <button class="drawer-item-btn" data-tool="koban"><span class="item-icon">🏮</span><span class="item-name">${isJa ? '交番・派出所' : 'Police (Kōban)'}</span><span class="item-cost">¥110</span></button>
            <button class="drawer-item-btn" data-tool="school"><span class="item-icon">🏫</span><span class="item-name">${isJa ? '尋常小学校' : 'Primary School'}</span><span class="item-cost">¥280</span></button>
            <button class="drawer-item-btn" data-tool="telegraph"><span class="item-icon">⚡</span><span class="item-name">${isJa ? '電信分局 (電信柱網)' : 'Telegraph'}</span><span class="item-cost">¥220</span></button>
          </div>
        </div>

        <!-- Leisure Panel -->
        <div id="tab-panel-leisure" class="drawer-tab-panel">
          <div class="drawer-grid">
            <button class="drawer-item-btn" data-tool="tree_willow"><span class="item-icon">🌸</span><span class="item-name">${isJa ? '水辺並木・桜' : 'Canal Tree'}</span><span class="item-cost">¥15</span></button>
            <button class="drawer-item-btn" data-tool="shrine_park"><span class="item-icon">⛩️</span><span class="item-name">${isJa ? '神社境内・公園' : 'Shrine Park'}</span><span class="item-cost">¥50</span></button>
            <button class="drawer-item-btn" data-tool="ochaya"><span class="item-icon">🍵</span><span class="item-name">${isJa ? '伝統茶屋' : 'Teahouse'}</span><span class="item-cost">¥120</span></button>
            <button class="drawer-item-btn" data-tool="sento"><span class="item-icon">♨️</span><span class="item-name">${isJa ? '町湯・銭湯' : 'Bathhouse'}</span><span class="item-cost">¥90</span></button>
            <button class="drawer-item-btn" data-tool="monument_pavilion"><span class="item-icon">🏛️</span><span class="item-name">${isJa ? '内国勧業博覧会館' : 'Exposition Pavilion'}</span><span class="item-cost">¥2,000</span></button>
          </div>
        </div>

        <div id="drawer-tool-inspector" class="washi-inspector-strip">
          <div class="inspector-header">
            <span id="inspector-tool-name" class="inspector-name">${isJa ? '項目を選択またはカーソルを合わせる' : 'Select or hover over an item'}</span>
            <span id="inspector-tool-cost" class="inspector-cost"></span>
          </div>
          <p id="inspector-tool-effect" class="inspector-desc">${isJa ? '建物や道具にカーソルを合わせると、効果や費用を確認できます。' : 'Hover over any building or tool (including locked items) to view its purpose and municipal benefits.'}</p>
          <div id="inspector-tool-lock-status" class="inspector-lock-note" style="display: none;"></div>
        </div>
      </nav>

      <!-- Save & Match Status Actions (Bottom Right) -->
      <div id="hud-actions" class="hud-actions">
        <button id="btn-save" class="action-btn btn-primary" title="Save city progress to MySQL database" data-i18n-title="action.save_title">
          <span>💾</span><span class="btn-label" data-i18n="action.save">${isJa ? ' 保存' : ' Save Match'}</span>
        </button>
      </div>

      <!-- Feedback Toasts & Inline Drag Badge -->
      <div id="toast-container"></div>
      <div id="drag-badge" style="display: none;"></div>

      <!-- Civic Policy Ledger Slide-out Drawer (Hidden by default) -->
      <div id="policy-drawer-scrim" class="policy-drawer-scrim">
        <div id="policy-drawer" class="policy-drawer">
          <div class="policy-header">
            <div class="policy-header-title">
              <span class="policy-seal-icon">政</span>
              <span data-i18n="policy.title">${isJa ? '政策録・布告' : 'Civic Edicts & Policies'}</span>
            </div>
            <button id="policy-close-btn" class="policy-close-btn" title="Close Policy Ledger">✕</button>
          </div>
          <div class="policy-body">
            <!-- Edict 1: Night Fire Watch -->
            <div class="policy-card" id="card-policy-night-watch">
              <div class="policy-card-top">
                <span class="policy-name" data-i18n="policy.night_watch_name">${isJa ? '夜警火の番 (夜番)' : 'Night Fire Watch (Yakin)'}</span>
                <label class="policy-switch">
                  <input type="checkbox" id="toggle-policy-night-watch" data-policy="night_watch">
                  <span class="policy-slider"></span>
                </label>
              </div>
              <div class="policy-desc" data-i18n="policy.night_watch_desc">
                ${isJa ? '町民夜警が拍子木を鳴らし夜間巡回を行い、火の粉の早期発見・初期消火を徹底します。' : 'Vigilant citizen watchmen patrol wooden alleys with hyōshigi clappers throughout the night to detect embers early.'}
              </div>
              <div class="policy-effects">
                <span class="policy-tag pos" data-i18n="policy.night_watch_eff1">${isJa ? '-40% 出火率低減' : '-40% Fire Outbreak Risk'}</span>
                <span class="policy-tag neg" data-i18n="policy.night_watch_eff2">${isJa ? '-¥15/月 維持費' : '-¥15/mo Upkeep'}</span>
                <span class="policy-tag neg" data-i18n="policy.night_watch_eff3">${isJa ? '-5% 夜間商業' : '-5% Night Commerce'}</span>
              </div>
              <div class="policy-hint" data-i18n="policy.night_watch_hint">${isJa ? '乾燥する冬期 (11月〜2月) や木造密集区での施行を推奨。' : 'Recommended during dry winter months (Nov–Feb) or in dense wooden quarters.'}</div>
            </div>

            <!-- Edict 2: Clean Water Mandate -->
            <div class="policy-card" id="card-policy-clean-water">
              <div class="policy-card-top">
                <span class="policy-name" data-i18n="policy.clean_water_name">${isJa ? '清水平癒令 (清潔法)' : 'Clean Water Mandate (Seisui-rei)'}</span>
                <label class="policy-switch">
                  <input type="checkbox" id="toggle-policy-clean-water" data-policy="clean_water">
                  <span class="policy-slider"></span>
                </label>
              </div>
              <div class="policy-desc" data-i18n="policy.clean_water_desc">
                ${isJa ? '共同井戸の煮沸消毒と水路衛生を義務づけ、疫病の蔓延を防止します。' : 'Enforces strict well boiling and communal aqua-sanitation regulations across all serviced residential blocks.'}
              </div>
              <div class="policy-effects">
                <span class="policy-tag pos" data-i18n="policy.clean_water_eff1">${isJa ? '+10% 人口増加率' : '+10% Population Growth'}</span>
                <span class="policy-tag neg" data-i18n="policy.clean_water_eff2">${isJa ? '-¥10/月 公衆衛生費' : '-¥10/mo Public Health Cost'}</span>
              </div>
              <div class="policy-hint" data-i18n="policy.clean_water_hint">${isJa ? '人口停滞時やコレラ発生時に有効。' : 'Recommended when population growth stagnates or disease outbreak occurs.'}</div>
            </div>

            <!-- Edict 3: Modernization Subsidy -->
            <div class="policy-card" id="card-policy-modernization-subsidy">
              <div class="policy-card-top">
                <span class="policy-name" data-i18n="policy.modernization_name">${isJa ? '文明開化助成 (煉瓦・蔵造)' : 'Modernization Subsidy (Bunmei Kaika)'}</span>
                <label class="policy-switch">
                  <input type="checkbox" id="toggle-policy-modernization-subsidy" data-policy="modernization_subsidy">
                  <span class="policy-slider"></span>
                </label>
              </div>
              <div class="policy-desc" data-i18n="policy.modernization_desc">
                ${isJa ? '木造長屋から耐火蔵造り・擬洋風煉瓦建築への改築に公費助成金を支給します。' : 'Municipal co-financing to accelerate the conversion of wooden machiya into fireproof Kura-zukuri and Giyōfū brick structures.'}
              </div>
              <div class="policy-effects">
                <span class="policy-tag pos" data-i18n="policy.modernization_eff1">${isJa ? '+50% 耐火改築速度' : '+50% Renovation Speed'}</span>
                <span class="policy-tag neg" data-i18n="policy.modernization_eff2">${isJa ? '-¥50 改築毎助成' : '-¥50 per Building Conversion'}</span>
              </div>
              <div class="policy-hint" data-i18n="policy.modernization_hint">${isJa ? '国庫が¥500以上あり近代化を急ぐ場合に推奨。' : 'Recommended only when treasury exceeds ¥500 and brickworks are available.'}</div>
            </div>
          </div>
          <div class="policy-footer">
            <span id="policy-active-count">${isJa ? '施行中勅令: 0件' : '0 Edicts Enacted'}</span>
            <span id="policy-monthly-cost">${isJa ? '月間財政影響: -¥0/月' : '¥0/mo Fiscal Impact'}</span>
          </div>
        </div>
      </div>

      <!-- Settlement Milestone Celebration Modal (Hidden by default) -->
      <div id="milestone-modal-scrim" class="meiji-modal-scrim">
        <div class="meiji-parchment-card">
          <div class="milestone-seal">勅</div>
          <div class="milestone-header">
            <div class="milestone-subtitle" data-i18n="milestone.imperial_decree">${isJa ? '明治天皇勅令・勅諚' : 'Imperial Settlement Charter'}</div>
            <div id="milestone-title" class="milestone-title">${isJa ? '開拓宿場町' : 'Bustling Post Town'}</div>
          </div>
          <div id="milestone-body" class="milestone-body">
            ${isJa ? '町並みは賑わいを増し、多くの商人や民が集い栄えています！' : 'The settlement has flourished with industrious townsfolk and thriving commerce!'}
          </div>
          <div class="milestone-features">
            <div class="milestone-features-title" data-i18n="milestone.unlocked_title">${isJa ? '解禁された都市機能' : 'Civic Capabilities Unlocked'}</div>
            <ul id="milestone-features-list"></ul>
          </div>
          <div class="milestone-reward-banner">
            <span class="reward-label" data-i18n="milestone.charter_grant">${isJa ? '勅旨開拓助成金:' : 'Treasury Charter Grant:'}</span>
            <span id="milestone-reward-val" class="reward-amount">+¥1,000</span>
          </div>
          <div class="milestone-actions"><button id="btn-milestone-claim" class="btn-milestone-claim" data-i18n="milestone.accept">${isJa ? '勅許を受諾する' : 'Accept Imperial Charter'}</button></div>
        </div>
      </div>

      <!-- Imperial Meiji Restoration Triumph Capstone Modal (Hidden by default) -->
      <div id="triumph-modal-scrim" class="meiji-modal-scrim">
        <div class="meiji-parchment-card triumph-modal-card" style="border: 2px solid #b8860b; max-width: 520px;">
          <div class="milestone-seal" style="background: #b8860b;">栄</div>
          <div class="milestone-header">
            <div class="milestone-subtitle" style="color: #b8860b; font-weight: bold;">${isJa ? '明治維新・大業結実' : 'Imperial Meiji Restoration Triumph'}</div>
            <div class="milestone-title" style="color: #8b0000; font-size: 1.4rem;">${isJa ? '内国勧業博覧会・偉業顕彰' : 'National Industrial Exposition'}</div>
          </div>
          <div class="milestone-body" style="font-size: 0.95rem; line-height: 1.6; margin: 12px 0;">
            ${isJa ? '内国勧業博覧会館が堂々完成し、欧米列強の使節や全国の使者が集います。町長の偉業は永久に顕彰されます。' : 'The National Industrial Exhibition Pavilion stands triumphant! Delegations from across the empire and foreign envoys marvel at the flourishing manufactures, railways, telegraphs, and electrified modern avenues.'}
          </div>
          <div class="milestone-actions"><button id="btn-triumph-close" class="btn-milestone-claim" style="background: #8b0000; color: #fff;">${isJa ? '歴史に刻み都市を継続' : 'Inscribe in Municipal History'}</button></div>
        </div>
      </div>

      <!-- Historical Chronicle & Municipal Ledger Modal (Hidden by default) -->
      <div id="chronicle-ledger-modal" class="meiji-modal-scrim" style="display: none;">
        <div class="meiji-parchment-card chronicle-modal-card" style="max-width: 540px; width: 90%; max-height: 85vh; overflow-y: auto;">
          <button id="chronicle-close-btn" class="scope-close-btn" title="Close">✕</button>
          <div class="milestone-seal">史</div>
          <div class="milestone-header">
            <div class="milestone-subtitle" data-i18n="chronicle.subtitle">${isJa ? '明治都市年代記・公文書' : 'Meiji Town Chronicle & Municipal Archives'}</div>
            <div class="milestone-title" data-i18n="chronicle.title">${isJa ? '歴史統計原簿' : 'Historical Ledger'}</div>
          </div>
          <div class="chronicle-section" style="margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.82rem; background: rgba(0,0,0,0.04); padding: 8px; border-radius: 4px;">
            <div><strong>${isJa ? '開拓草創:' : 'Founding:'}</strong> <span id="ledger-founding-date">Meiji 5 (1872)</span></div>
            <div><strong>${isJa ? '現行時代:' : 'Current:'}</strong> <span id="ledger-current-date">Meiji 5 (1872)</span></div>
            <div><strong>${isJa ? '累計税収:' : 'Total Taxes:'}</strong> <span id="ledger-stat-taxes" style="color: #3a6332; font-weight: bold;">¥0</span></div>
            <div><strong>${isJa ? '消火実績:' : 'Fires Extinguished:'}</strong> <span id="ledger-stat-fires" style="color: #2c4765; font-weight: bold;">0</span></div>
            <div style="grid-column: span 2;"><strong>${isJa ? '最高人口:' : 'Peak Population:'}</strong> <span id="ledger-stat-peak-pop" style="font-weight: bold;">0</span></div>
          </div>
          <div class="milestone-features" style="margin-top: 14px;">
            <div class="milestone-features-title" data-i18n="chronicle.charters">${isJa ? '授与された勅定定書' : 'Imperial Charters Earned'}</div>
            <ul id="ledger-charters-list" style="list-style: none; padding: 0; margin: 6px 0; display: flex; flex-direction: column; gap: 4px;"></ul>
          </div>
          <div class="milestone-features" style="margin-top: 14px;">
            <div class="milestone-features-title" data-i18n="chronicle.events">${isJa ? '歴史的記録・大事件' : 'Historical Events & Milestones'}</div>
            <ul id="ledger-events-list" style="list-style: none; padding: 0; margin: 6px 0; max-height: 160px; overflow-y: auto; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;"></ul>
          </div>
        </div>
      </div>

      <!-- Reusable Washi Confirmation Modal -->
      <div id="confirmation-modal" class="modal-overlay hidden" style="display: none;">
        <div class="modal-card washi-card confirmation-card">
          <div id="confirm-modal-icon" class="modal-seal" style="font-size: 2.2rem; margin-bottom: 8px;">⛩️</div>
          <h3 id="confirm-modal-title" style="margin-top: 0;"></h3>
          <p id="confirm-modal-message" class="confirm-modal-message" style="margin: 14px 0 12px; font-size: 0.92rem; line-height: 1.5; color: #3c2a1d; white-space: pre-line;"></p>
          <div id="confirm-modal-input-container" style="display: none; margin-bottom: 18px;">
            <input type="text" id="confirm-modal-input" maxlength="40" style="width: 85%; padding: 8px 12px; font-family: inherit; font-size: 1rem; border: 1.5px solid #8c7355; border-radius: 4px; background: #fffdf9; color: #2b1f14; text-align: center;" />
          </div>
          <div class="modal-actions" style="display: flex; gap: 12px; justify-content: center;"><button id="confirm-modal-cancel" class="btn-wood-cancel">${isJa ? '取消' : 'Cancel'}</button><button id="confirm-modal-ok" class="btn-wood-confirm">${isJa ? '確認' : 'Confirm'}</button></div>
        </div>
      </div>
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

        let lastSaveTime = 0;
        window.game.saveMatch = (isAuto = false) => {
          const now = Date.now();
          if (now - lastSaveTime < 800) return;
          lastSaveTime = now;

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
              window.game.showToast(isAuto ? '💾 Auto-saved settlement to database.' : '💾 Settlement saved to database!');
            }
          }
        };

        // Override save handler to save via boardgame.io move -> MySQL
        const saveBtn = container.querySelector('#btn-save');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            if (window.game && typeof window.game.saveMatch === 'function') {
              window.game.saveMatch(false);
            }
          });
        }

        // Automatic background save every 60 seconds
        if (window.__meijiAutoSaveTimer) {
          clearInterval(window.__meijiAutoSaveTimer);
        }
        window.__meijiAutoSaveTimer = setInterval(() => {
          if (window.game && typeof window.game.saveMatch === 'function') {
            window.game.saveMatch(true);
          }
        }, 60000);
      }
    })
    .catch((err) => {
      console.error('[Meiji] Failed to load Meiji Town module:', err);
    });
}

function unmountMeijiClient() {
  if (window.__meijiAutoSaveTimer) {
    clearInterval(window.__meijiAutoSaveTimer);
    window.__meijiAutoSaveTimer = null;
  }
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
