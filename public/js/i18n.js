// Project Meiji - Bilingual (Japanese / English) Localization Engine (i18n.js)
// ponytail: zero-dependency key-value translation dictionary, localStorage persistence & declarative DOM updates

export const TRANSLATIONS = {
    en: {
        // Topbar HUD
        'hud.title_sub': 'Meiji',
        'hud.settlement': 'Settlement',
        'hud.treasury': 'Treasury',
        'hud.cashflow': 'Cashflow',
        'hud.population': 'Population',
        'hud.satisfaction': 'Satisfaction',
        'hud.satisfaction_title': 'Citizen Satisfaction & Town Welfare',
        'hud.chronicle': 'Chronicle',
        'hud.rci_title': 'Zoning Demand (R: Residential, C: Commercial, I: Industrial)',
        'hud.rci_r': 'R',
        'hud.rci_c': 'C',
        'hud.rci_i': 'I',
        'hud.audio_on': '🔊 On',
        'hud.audio_mute': '🔇 Mute',
        'hud.lang_btn': '🌐 日本語',
        'hud.lang_title': 'Switch Language to Japanese [L]',
        'hud.layers': 'Layers',
        'hud.layers_title': 'Map Data Overlays [O] / 地図レイヤー',
        'hud.layers_menu_title': 'Map Data Overlays',
        'layer.normal': 'Normal View',
        'layer.fire': '🔥 Fire Hazard',
        'layer.sanitation': '💧 Sanitation & Water',
        'layer.electric': '⚡ Electric Grid',
        'layer.pollution': '🏭 Coal Soot Pollution',

        // Time Controls
        'time.pause_title': 'Pause simulation [Space]',
        'time.slow_title': 'Baseline Speed (1x) [~ or \\]',
        'time.normal_title': 'Standard Speed (1x) [Shift+1]',
        'time.fast_title': 'Fast Speed (2x) [Shift+2]',
        'time.hyper_title': 'Hyper Speed (5x) [Shift+5]',
        'time.speed_1x_title': 'Standard Speed (1x) [Shift+1]',
        'time.speed_2x_title': 'Fast Speed (2x) [Shift+2]',
        'time.speed_3x_title': 'Swift Speed (3x) [Shift+3]',
        'time.speed_5x_title': 'Hyper Speed (5x) [Shift+5]',

        // Action Toolbar
        'action.save': 'Save',
        'action.save_title': 'Commit current settlement state to MySQL database',
        'action.reload': 'Reload',
        'action.reload_title': 'Reload state from MySQL database',
        'action.new': 'New',
        'action.new_title': 'Start a completely new settlement (Meiji 1872)',
        'confirm.reset_city_title': 'Start a New Settlement?',
        'confirm.reset_city_msg': 'Name your new Meiji settlement to begin in 1872 with ¥5,000 in treasury.\n\nAll existing buildings will be cleared. Do you wish to proceed?',
        'confirm.reset_city_placeholder': 'Settlement Name (e.g. Edo-Tokyo, Yokohama)',
        'confirm.reset_city_ok': 'Found Settlement',
        'confirm.reset_city_cancel': 'Keep Building',

        // Build Drawer
        'drawer.title': 'Construction Catalogue',
        'tab.infra': '🛣️ Infrastructure',
        'tab.zones': '🏡 Zones',
        'tab.civic': '🏯 Public Services',
        'tab.leisure': '🍵 Leisure & Culture',

        // Tool Names
        'tool.survey': 'Survey Mode',
        'tool.road': 'Dirt Road',
        'tool.stone_road': 'Stone Paving',
        'tool.canal': 'Canal (Hori)',
        'tool.rail_track': 'Rail Tracks',
        'tool.train_depot': 'Train Depot',
        'tool.bulldozer': 'Demolish',
        'tool.residential': 'Machiya (R)',
        'tool.commercial': 'Shouten (C)',
        'tool.industrial': 'Workshop (I)',
        'tool.watchtower': 'Watchtower',
        'tool.fire_depot': 'Fire Depot',
        'tool.well': 'Well (Ido)',
        'tool.koban': 'Police (Kōban)',
        'tool.tree_willow': 'Canal Tree',
        'tool.shrine_park': 'Shrine Park',
        'tool.ochaya': 'Teahouse',
        'tool.sento': 'Bathhouse',
        'tool.school': 'Primary School',
        'tool.rice_paddy': 'Rice Paddy',
        'tool.telegraph': 'Telegraph Office',
        'tool.harbor_pier': 'Cargo Pier',
        'tool.power_plant': 'Coal Steam Plant',
        'tool.waterworks': 'Water Filtration Basin',
        'tool.pavilion': 'Exhibition Pavilion',
        'tool.suimon': 'Watergate Sluice',

        // Map Overlays
        'layer.normal': 'Normal View',
        'layer.fire': '🔥 Fire Hazard',
        'layer.sanitation': '💧 Sanitation & Water',
        'layer.electric': '⚡ Electric Grid',
        'layer.pollution': '🏭 Coal Soot Pollution',
        'layer.flood': '🌊 Flood Inundation Risk',

        // Surveyor Scope
        'scope.title': "Surveyor's Scope",
        'scope.pill': '🧭 Scope',
        'scope.tile': 'Tile:',
        'scope.stage': 'Stage:',
        'scope.road': 'Road:',
        'scope.fire_hazard': 'Fire Hazard:',
        'scope.sanitation': 'Sanitation:',
        'scope.leisure': 'Leisure:',
        'scope.order': 'Order:',
        'scope.education': 'Education:',
        'scope.facing': 'Facing:',
        'scope.rotate_btn': '⟳ Rotate (R)',

        // Chronicle Ledger
        'chronicle.title': 'Historical Ledger',
        'chronicle.subtitle': 'Meiji Town Chronicle & Municipal Archives',
        'chronicle.charters': 'Imperial Charters Earned',
        'chronicle.events': 'Historical Events & Milestones',

        // Surveyor Inspector Values
        'val.open_meadow': 'Open Meadow',
        'val.unoccupied': 'Unoccupied',
        'val.scaffolding': 'Scaffolding (Under Construction)',
        'val.built': 'Active',
        'val.on_fire': 'On Fire!',
        'val.burned': 'Burned Ruins',
        'val.yes': 'Yes (Connected)',
        'val.no': 'No',
        'val.clean': 'Clean (Safe)',
        'val.cholera_risk': 'Cholera Risk!',
        'val.patrolled': 'Patrolled',
        'val.unpatrolled': 'Unpatrolled',
        'val.firebreak_stone': 'Absolute Firebreak / +25% Com',
        'val.firebreak_dirt': 'Operational Firebreak',
        'val.navigable_waterway': 'Navigable Waterway / Firebreak',
        'val.rail_crossing': 'Rail-Road Level Crossing (Fumikiri)',

        // Orientation
        'dir.north': 'North (0°)',
        'dir.east': 'East (90°)',
        'dir.south': 'South (180°)',
        'dir.west': 'West (270°)',

        // Layers & Civic HUD
        'hud.layers': 'Layers',
        'hud.layers_title': 'Map Data Overlays [O] / 地図レイヤー',
        'hud.edicts': 'Edicts',
        'hud.edicts_title': 'Civic Policies & Imperial Edicts [P] / 政策録',
        'layer.normal': 'Normal',
        'layer.fire': 'Fire Risk',
        'layer.water': 'Sanitation / Water',
        'layer.happiness': 'Welfare / Value',

        // Milestones
        'milestone.badge_title': 'Settlement Milestone Tier',
        'milestone.imperial_decree': 'Imperial Settlement Charter',
        'milestone.unlocked_title': 'Civic Capabilities Unlocked',
        'milestone.charter_grant': 'Treasury Charter Grant:',
        'milestone.accept': 'Accept Imperial Charter',

        // Policies
        'policy.title': 'Civic Edicts & Policies',
        'policy.night_watch_name': 'Night Fire Watch (Yakin)',
        'policy.night_watch_desc': 'Vigilant citizen watchmen patrol wooden alleys with hyōshigi clappers throughout the night to detect embers early.',
        'policy.night_watch_eff1': '-40% Fire Outbreak Risk',
        'policy.night_watch_eff2': '-¥15/mo Upkeep',
        'policy.night_watch_eff3': '-5% Night Commerce',
        'policy.clean_water_name': 'Clean Water Mandate (Seisui-rei)',
        'policy.clean_water_desc': 'Enforces strict well boiling and communal aqua-sanitation regulations across all serviced residential blocks.',
        'policy.clean_water_eff1': '+10% Population Growth',
        'policy.clean_water_eff2': '-¥10/mo Public Health Cost',
        'policy.modernization_name': 'Modernization Subsidy (Bunmei Kaika)',
        'policy.modernization_desc': 'Municipal co-financing to accelerate the conversion of wooden machiya into fireproof Kura-zukuri and Giyōfū brick structures.',
        'policy.modernization_eff1': '+50% Renovation Speed',
        'policy.modernization_eff2': '-¥50 per Building Conversion',
        'policy.night_watch_hint': 'Recommended during dry winter months (Nov–Feb) or in dense wooden quarters.',
        'policy.clean_water_hint': 'Recommended when population growth stagnates or disease outbreak occurs.',
        'policy.modernization_hint': 'Recommended only when treasury exceeds ¥500 and brickworks are available.',
        'hud.advisor_guidance': 'Advisor Guidance',
        'advisor.title': 'Municipal Advisor',
        'advisor.open_edicts': 'Open Edicts',
        'advisor.dismiss': 'Dismiss',
    },
    ja: {
        // Topbar HUD
        'hud.title_sub': 'めいじ',
        'hud.settlement': '拠点集落',
        'hud.treasury': '国庫資金',
        'hud.cashflow': '月間収支',
        'hud.population': '町人口',
        'hud.satisfaction': '町民満足度',
        'hud.satisfaction_title': '町民の満足度と福祉水準',
        'hud.chronicle': '時代年代記',
        'hud.rci_title': '地区需要 (住: 居住, 商: 商業, 工: 工業)',
        'hud.rci_r': '住',
        'hud.rci_c': '商',
        'hud.rci_i': '工',
        'hud.audio_on': '🔊 オン',
        'hud.audio_mute': '🔇 消音',
        'hud.lang_btn': '🌐 English',
        'hud.lang_title': '英語に切り替え [L]',
        'hud.layers': '階層地図',
        'hud.layers_title': '地図データレイヤー切替 [O]',
        'hud.layers_menu_title': '地図データレイヤー',
        'layer.normal': '標準表示',
        'layer.fire': '🔥 火災危険度',
        'layer.sanitation': '💧 上水・衛生網',
        'layer.electric': '⚡ 電力網',
        'layer.pollution': '🏭 煤煙公害',

        // Time Controls
        'time.pause_title': '時間を一時停止 [スペース]',
        'time.slow_title': '基準速度 (1倍速) [~ または \\]',
        'time.normal_title': '標準速度 (1倍速) [Shift+1]',
        'time.fast_title': '高速進行 (2倍速) [Shift+2]',
        'time.hyper_title': '超高速進行 (5倍速) [Shift+5]',
        'time.speed_1x_title': '標準速度 (1倍速) [Shift+1]',
        'time.speed_2x_title': '高速進行 (2倍速) [Shift+2]',
        'time.speed_3x_title': '快速進行 (3倍速) [Shift+3]',
        'time.speed_5x_title': '超高速進行 (5倍速) [Shift+5]',

        // Action Toolbar
        'action.save': '保存',
        'action.save_title': '現在の街の状態を保存する',
        'action.reload': '再読込',
        'action.reload_title': '保存された街の状態を読み直す',
        'action.new': '新規開始',
        'action.new_title': '明治五年の新たな集落造りを開始する',
        'confirm.reset_city_title': '新たな集落を開拓しますか？',
        'confirm.reset_city_msg': '新たな集落名を入力して、国庫資金¥5,000で明治五年の開拓を開始します。\n\n既存の全建物が撤去されます。実行しますか？',
        'confirm.reset_city_placeholder': '集落名 (例: 江戸東京、横浜)',
        'confirm.reset_city_ok': '集落を建国',
        'confirm.reset_city_cancel': '建築を続ける',

        // Build Drawer
        'drawer.title': '建築目録',
        'tab.infra': '🛣️ 交通・水路',
        'tab.zones': '🏡 地区指定',
        'tab.civic': '🏯 公共施設',
        'tab.leisure': '🍵 娯楽・文化',

        // Tool Names
        'tool.survey': '測量視察',
        'tool.road': '往来土道',
        'tool.stone_road': '石畳舗装',
        'tool.canal': '堀・水路',
        'tool.rail_track': '鉄道路線',
        'tool.train_depot': '停車場・駅',
        'tool.bulldozer': '撤去・取壊し',
        'tool.residential': '町家 (居住)',
        'tool.commercial': '商店 (商業)',
        'tool.industrial': '作業場 (工業)',
        'tool.watchtower': '火の見櫓',
        'tool.fire_depot': '消防屯所',
        'tool.well': '共同井戸',
        'tool.koban': '交番・派出所',
        'tool.tree_willow': '水辺並木・桜',
        'tool.shrine_park': '神社境内・公園',
        'tool.ochaya': '伝統茶屋',
        'tool.sento': '町湯・銭湯',
        'tool.school': '尋常小学校',
        'tool.rice_paddy': '灌漑水田',
        'tool.telegraph': '電信分局 (電信柱網)',
        'tool.harbor_pier': '船着場 (港湾荷揚場)',
        'tool.power_plant': '石炭火力発電所',
        'tool.waterworks': '浄水場 (近代沈殿池)',
        'tool.pavilion': '内国勧業博覧会館',
        'tool.suimon': '明治水門・防潮樋',

        // Map Overlays
        'layer.normal': '標準表示',
        'layer.fire': '🔥 火災危険度',
        'layer.sanitation': '💧 上水・衛生度',
        'layer.electric': '⚡ 電信・電力網',
        'layer.pollution': '🏭 煤煙公害',
        'layer.flood': '🌊 浸水水害リスク',

        // Surveyor Scope
        'scope.title': '測量士の手帳',
        'scope.pill': '🧭 測量手帳',
        'scope.tile': '地目:',
        'scope.stage': '状態:',
        'scope.road': '道路接続:',
        'scope.fire_hazard': '火災危険度:',
        'scope.sanitation': '衛生環境:',
        'scope.leisure': '娯楽水準:',
        'scope.order': '治安巡回:',
        'scope.education': '教育学区:',
        'scope.facing': '向首方角:',
        'scope.rotate_btn': '⟳ 回転 (R)',

        // Chronicle Ledger
        'chronicle.title': '歴史年代記',
        'chronicle.subtitle': '明治都市年代記・公文書録',
        'chronicle.charters': '下賜済の勅許状',
        'chronicle.events': '年代記事件・歴史的出来事',

        // Surveyor Inspector Values
        'val.open_meadow': '未開墾の原野',
        'val.unoccupied': '空地',
        'val.scaffolding': '普請中 (建設中)',
        'val.built': '稼働中',
        'val.on_fire': '出火中・延焼中!',
        'val.burned': '焼跡・瓦礫',
        'val.yes': '接続あり',
        'val.no': '未接続',
        'val.clean': '清浄 (安全)',
        'val.cholera_risk': 'コレラ感染警戒!',
        'val.patrolled': '巡回警戒中',
        'val.unpatrolled': '警備巡回なし',
        'val.firebreak_stone': '完全防火帯 / 商業売上+25%',
        'val.firebreak_dirt': '基本防火帯機能',
        'val.navigable_waterway': '通船水路 / 防火水利',
        'val.rail_crossing': '鉄道踏切 (踏切道)',

        // Orientation
        'dir.north': '北向き (0°)',
        'dir.east': '東向き (90°)',
        'dir.south': '南向き (180°)',
        'dir.west': '西向き (270°)',

        // Layers & Civic HUD
        'hud.layers': '地図層',
        'hud.layers_title': '地図データレイヤー切替 [O]',
        'hud.edicts': '政策録',
        'hud.edicts_title': '市政政策・勅令布告録 [P]',
        'layer.normal': '通常表示',
        'layer.fire': '火災危険度',
        'layer.water': '上水・衛生網',
        'layer.happiness': '住民満足度・地価',

        // Milestones
        'milestone.badge_title': '集落発展段階 (マイルストーン)',
        'milestone.imperial_decree': '明治政府 勅命認可証書',
        'milestone.unlocked_title': '新たに解放された都市機能',
        'milestone.charter_grant': '国庫開拓特例下賜金:',
        'milestone.accept': '勅書を拝受する',

        // Policies
        'policy.title': '市政政策・勅令布告録',
        'policy.night_watch_name': '夜番火の用心 (夜勤)',
        'policy.night_watch_desc': '町火消と町民夜番が拍子木を打ち鳴らし、深夜の木造密集地を警戒巡視して失火の芽を未然に防ぎます。' ,
        'policy.night_watch_eff1': '火災発生率 -40%',
        'policy.night_watch_eff2': '月間維持費 -¥15',
        'policy.night_watch_eff3': '夜間商業収益 -5%',
        'policy.clean_water_name': '清水清掃令 (清水令)',
        'policy.clean_water_desc': '共同井戸の衛生管理と煮沸消毒を徹底し、上水享受区域の防疫体制を強化します。',
        'policy.clean_water_eff1': '人口流入率 +10%',
        'policy.clean_water_eff2': '公衆衛生費 -¥10/月',
        'policy.modernization_name': '文明開化助成 (近代化助成)',
        'policy.modernization_desc': '木造町家から不燃の土蔵造り・擬洋風赤煉瓦街への建て替え普請費用を町費より助成します。',
        'policy.modernization_eff1': '改築速度 +50%',
        'policy.modernization_eff2': '改築1件につき国庫-¥50',
        'policy.night_watch_hint': '乾燥する冬季 (11月〜2月) や木造密集地域での施行が推奨されます。',
        'policy.clean_water_hint': '人口増加が停滞している時や疫病発生時に効果的です。',
        'policy.modernization_hint': '国庫資金が¥500を超え、煉瓦街建設を推進する際に推奨されます。',
        'hud.advisor_guidance': '助言役の案内',
        'advisor.title': '市政相談役',
        'advisor.open_edicts': '政策録を開く',
        'advisor.dismiss': '閉じる',
    }
};

const JAPANESE_MONTHS = ['睦月 (1月)', '如月 (2月)', '弥生 (3月)', '卯月 (4月)', '皐月 (5月)', '水無月 (6月)', '文月 (7月)', '葉月 (8月)', '長月 (9月)', '神無月 (10月)', '霜月 (11月)', '師走 (12月)'];
const ENGLISH_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

class I18nManager {
    constructor() {
        const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('meiji_lang') : null;
        if (savedLang && (savedLang === 'en' || savedLang === 'ja')) {
            this.lang = savedLang;
        } else if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('ja')) {
            this.lang = 'ja';
        } else {
            this.lang = 'en';
        }
        this.listeners = new Set();
    }

    getLanguage() {
        return this.lang;
    }

    setLanguage(newLang) {
        if (newLang !== 'en' && newLang !== 'ja') return;
        this.lang = newLang;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('meiji_lang', newLang);
        }
        this.updateDOM();
        for (const fn of this.listeners) {
            try { fn(this.lang); } catch (e) { console.error(e); }
        }
    }

    toggleLanguage() {
        this.setLanguage(this.lang === 'en' ? 'ja' : 'en');
        return this.lang;
    }

    onChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    t(key, fallback = null) {
        const dict = TRANSLATIONS[this.lang] || TRANSLATIONS.en;
        if (dict[key] !== undefined) return dict[key];
        if (TRANSLATIONS.en[key] !== undefined) return TRANSLATIONS.en[key];
        return fallback !== null ? fallback : key;
    }

    formatEraDate(year, month) {
        const meijiYear = year - 1867;
        const m = Math.max(1, Math.min(12, month));
        if (this.lang === 'ja') {
            const eraYearStr = meijiYear === 1 ? '元年' : `${meijiYear}年`;
            return `明治${eraYearStr} (${year}年) ${JAPANESE_MONTHS[m - 1]}`;
        }
        return `Meiji ${meijiYear} (${year}) - ${ENGLISH_MONTHS[m - 1]}`;
    }

    updateDOM() {
        if (typeof document === 'undefined') return;

        // Text Content updates
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });

        // Title / Tooltip attribute updates
        const titledElements = document.querySelectorAll('[data-i18n-title]');
        titledElements.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.t(key);
            if (translation) {
                el.setAttribute('title', translation);
            }
        });

        // Language toggle button text & tooltip
        const langBtn = document.getElementById('lang-toggle-btn');
        if (langBtn) {
            langBtn.textContent = this.t('hud.lang_btn');
            langBtn.title = this.t('hud.lang_title');
        }

        // HTML lang attribute
        document.documentElement.lang = this.lang;
    }
}

export const i18n = new I18nManager();
