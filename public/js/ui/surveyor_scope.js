// Project Meiji - Surveyor's Scope Tile Inspector (Bottom-Left Contextual Card)
// ponytail: minimized pill by default, expand on tile inspect, comprehensive tile metrics

import { CONFIG } from '../config.js';
import { i18n } from '../i18n.js';
import { RailAutoTiler } from '../renderer/railAutoTiler.js';

export class SurveyorScope {
    constructor(scopeElement, stateManager) {
        this.state = stateManager;
        const root = stateManager?.root || (typeof document !== 'undefined' ? document : null);
        const getEl = (id) => (root && root.getElementById ? root.getElementById(id) : (root && root.querySelector ? root.querySelector('#' + id) : (typeof document !== 'undefined' ? document.getElementById(id) : null)));

        this.dom = {
            card: scopeElement || getEl('surveyor-scope'),
            coords: getEl('insp-coords'),
            type: getEl('insp-type'),
            stage: getEl('insp-stage'),
            road: getEl('insp-road'),
            fire: getEl('insp-fire'),
            water: getEl('insp-water'),
            leisure: getEl('insp-leisure'),
            order: getEl('insp-order'),
            education: getEl('insp-education'),
            rotateRow: getEl('scope-rotate-row'),
            facing: getEl('insp-facing'),
            rotateBtn: getEl('scope-rotate-btn'),
            toggleBtn: getEl('scope-toggle-btn'),
            pillBadge: getEl('scope-pill-badge'),
        };
        this.isExpanded = false;
        this.lastCoord = null;
        this.lastGrid = null;
        this.lastSim = null;

        this.bindEvents();
        i18n.onChange(() => {
            if (this.lastCoord && this.lastGrid) {
                this.update(this.lastCoord.x, this.lastCoord.y, this.lastGrid, this.lastSim);
            }
        });
    }

    bindEvents() {
        if (this.dom.toggleBtn) {
            this.dom.toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
        if (this.dom.pillBadge) {
            this.dom.pillBadge.addEventListener('click', (e) => {
                e.stopPropagation();
                this.expand();
            });
        }
        if (this.dom.rotateBtn) {
            this.dom.rotateBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.state && typeof this.state.rotateInspectedTile === 'function') {
                    this.state.rotateInspectedTile();
                }
            });
        }
    }

    toggle() {
        if (this.isExpanded) this.minimize();
        else this.expand();
    }

    expand() {
        this.isExpanded = true;
        if (this.dom.card) {
            this.dom.card.classList.add('scope-expanded');
            this.dom.card.classList.remove('scope-minimized');
        }
    }

    minimize() {
        this.isExpanded = false;
        if (this.dom.card) {
            this.dom.card.classList.remove('scope-expanded');
            this.dom.card.classList.add('scope-minimized');
        }
    }

    update(x, y, grid, simulation) {
        this.lastCoord = { x, y };
        this.lastGrid = grid;
        this.lastSim = simulation;

        if (this.dom.coords) this.dom.coords.textContent = `(${x}, ${y})`;
        if (this.dom.pillBadge) this.dom.pillBadge.textContent = `${i18n.t('scope.pill')} (${x}, ${y})`;

        const tile = grid.getTile(x, y);
        const isJa = i18n.getLanguage() === 'ja';
        let desc = isJa ? '未開墾の原野' : 'Open Meadow';
        let stageText = isJa ? '空地' : 'Unoccupied';

        if (tile.type === CONFIG.TYPES.ROAD) {
            if (tile.roadTier === 2) {
                desc = isJa ? '石畳往来 (石畳道)' : 'Stone Paved Road (Ishidatami)';
                stageText = isJa ? '完全防火帯 / 商業売上+25%' : 'Absolute Firebreak / +25% Com';
            } else {
                desc = isJa ? '往来土道' : 'Dirt Thoroughfare';
                stageText = isJa ? '基本防火帯機能' : 'Operational Firebreak';
            }
        } else if (tile.type === CONFIG.TYPES.CANAL) {
            if (tile.hasBridge) {
                desc = tile.roadTier === 2
                    ? (isJa ? '太鼓石橋・堀水路' : 'Stone Bridge (Taiko-bashi) / Canal')
                    : (isJa ? '木造太鼓橋・堀水路' : 'Wooden Bridge (Taiko-bashi) / Canal');
                stageText = isJa ? '通船水路 / 防火水利' : 'Navigable Waterway / Firebreak';
            } else {
                desc = isJa ? '開削堀 (水路)' : 'Excavated Canal (Hori)';
                stageText = isJa ? '通船水路 / 防火水利' : 'Navigable Waterway / Firebreak';
            }
        } else if (tile.type === CONFIG.TYPES.RAIL) {
            const mask = RailAutoTiler.getBitmask(tile, grid);
            const seg = RailAutoTiler.getRailDescription(mask);
            if (tile.hasCrossing) {
                desc = isJa ? `鉄道踏切 (${seg})` : `Rail Crossing (${seg})`;
            } else {
                desc = isJa ? `鉄道路線: ${seg}` : `Track Segment: ${seg}`;
            }
            stageText = isJa ? '列車運行速度: 100% (連続製鉄軌条)' : 'Train Speed Rating: 100% (Continuous Iron Gauge)';
        } else if (tile.type === CONFIG.TYPES.PARK) {
            desc = tile.subType === 'willow'
                ? (isJa ? '枝垂柳 (柳樹)' : 'Weeping Willow (Yanagi)')
                : (isJa ? '桜並木 (桜花)' : 'Sakura Cherry Tree');
            stageText = isJa ? '美化景観 / 文化風雅' : 'Beautification / Cultural Flora';
        } else if (tile.type === CONFIG.TYPES.SERVICE) {
            if (tile.serviceType === CONFIG.SERVICES.FIRE_DEPOT) {
                desc = isJa ? '消防屯所 (火消所)' : 'Fire Brigade Depot (Hikeshi-sho)';
                stageText = (isJa ? '十町道路出動圏内' : '10-Tile Road Dispatch Active') + (tile.isTelegraphConnected ? (isJa ? ' [電信:+30%]' : ' [⚡ +30%]') : '');
            } else if (tile.serviceType === CONFIG.SERVICES.WELL) {
                desc = isJa ? '共同井戸 (掘抜井戸)' : 'Communal Well (Ido)';
                stageText = isJa ? '六町範囲飲用水給水' : '6-Tile Clean Water Sanitation';
            } else if (tile.serviceType === CONFIG.SERVICES.OCHAYA) {
                desc = isJa ? '伝統茶屋 (水茶屋)' : 'Traditional Teahouse (Ochaya)';
                stageText = isJa ? '六町範囲町民娯楽' : '6-Tile Leisure Zone Active';
            } else if (tile.serviceType === CONFIG.SERVICES.SENTO) {
                desc = isJa ? '町湯 (銭湯)' : 'Public Bathhouse (Sentō)';
                stageText = isJa ? '五町範囲衛生・保養' : '5-Tile Sanitation & Leisure Active';
            } else if (tile.serviceType === CONFIG.SERVICES.KOBAN) {
                desc = isJa ? '明治交番 (派出所)' : 'Meiji Police Box (Kōban)';
                stageText = (isJa ? '八町範囲治安維持' : '8-Tile Public Order Active') + (tile.isTelegraphConnected ? (isJa ? ' [電信:+30%]' : ' [⚡ +30%]') : '');
            } else if (tile.serviceType === CONFIG.SERVICES.SHRINE_PARK) {
                desc = isJa ? '神社境内公園 (社寺)' : 'Neighborhood Shrine Park (Jinjanoki)';
                stageText = isJa ? '近隣居住満足度+5%' : '+5% Local Residential Leisure';
            } else if (tile.serviceType === CONFIG.SERVICES.SCHOOL) {
                desc = isJa ? '明治尋常小学校 (学制施行)' : 'Primary School (Shōgakkō)';
                stageText = (isJa ? '八町就学学区・近代化促進' : '8-Tile Education Active') + (tile.isTelegraphConnected ? (isJa ? ' [電信:+30%]' : ' [⚡ +30%]') : '');
            } else if (tile.serviceType === CONFIG.SERVICES.TELEGRAPH) {
                desc = isJa ? '電信局 (電信取扱所)' : 'Telegraph Office (Denshin-kyoku)';
                stageText = isJa ? '石畳通信網統括 / 官公署範囲+30%' : 'Active Grid: +30% Civic Range';
            } else if (tile.serviceType === CONFIG.SERVICES.TRAIN_DEPOT) {
                const hasRoad = grid.hasAdjacentRoad(x, y);
                desc = isJa ? '停車場・駅舎' : 'Rural Train Depot (Inaka no Eki)';
                stageText = hasRoad
                    ? (isJa ? '街道接続中: 工・商需要2倍 (維持費 ¥10/月)' : 'Connected: 2× Ind/Com Demand (¥10/mo)')
                    : (isJa ? '街道未接続: 需要停止中 (維持費 ¥10/月)' : 'No Road: Demand Inactive (¥10/mo)');
            } else if (tile.serviceType === CONFIG.SERVICES.HARBOR_PIER) {
                const ox = tile.originX !== undefined ? tile.originX : x;
                const oy = tile.originY !== undefined ? tile.originY : y;
                const month = (this.state && this.state.currentMonth) ? this.state.currentMonth : 1;
                const info = (this.state && this.state.tradePierManager && typeof this.state.tradePierManager.getInspectionData === 'function')
                    ? this.state.tradePierManager.getInspectionData(ox, oy, month)
                    : null;
                desc = isJa ? '船着場 (港湾荷揚場)' : 'Harbor Cargo Pier (Funatsuki-ba)';
                if (info) {
                    const connText = isJa ? info.connectionTextJa : info.connectionText;
                    const yieldText = info.quarterlyYield > 0 ? `+¥${info.quarterlyYield}` : '¥0';
                    stageText = `${connText} | ${isJa ? '輸出配当' : 'Export'}: ${yieldText}`;
                } else {
                    stageText = isJa ? '通船水路・物産輸出拠点' : 'Canal Port & Surplus Export';
                }
            } else if (tile.serviceType === CONFIG.SERVICES.POWER_PLANT) {
                desc = isJa ? '火力発電所 (石炭発電)' : 'Coal Steam Power Plant (Karyoku Hatsudensho)';
                stageText = isJa ? '送電網供給中 (煤煙汚染: 4町範囲)' : 'Active Grid Generator (Pollution: 4-Tile Radius)';
            } else if (tile.serviceType === CONFIG.SERVICES.WATERWORKS) {
                desc = isJa ? '近代浄水場 (上水ろ過池)' : 'Modern Water Filtration Basin (Jōsuijō)';
                stageText = isJa ? '18町近代上水道配水網展開中' : '18-Tile Clean Water Network Active';
            } else if (tile.serviceType === CONFIG.SERVICES.PAVILION) {
                desc = isJa ? '内国勧業博覧会パビリオン' : 'National Industrial Exhibition Pavilion (Hakurankai)';
                stageText = isJa ? '明治維新凱旋記念碑' : 'Imperial Meiji Restoration Triumph Monument';
            } else if (tile.serviceType === CONFIG.SERVICES.WATCHTOWER) {
                desc = isJa ? '火の見櫓 (見張櫓)' : 'Fire Watchtower (Hinomi-yagura)';
                stageText = (isJa ? '六町火災監視警戒圏' : '6-Tile Fire Protection Radius') + (tile.isTelegraphConnected ? (isJa ? ' [電信:+30%]' : ' [⚡ +30%]') : '');
            } else if (tile.serviceType === (CONFIG.SERVICES.SUIMON || 'suimon')) {
                desc = isJa ? '明治水門 (防潮樋)' : 'Watergate Sluice (Suimon)';
                stageText = isJa ? '五町範囲水害・高潮逆流遮断' : '5-Tile Typhoon Surge Barrier Active';
            } else {
                desc = isJa ? '官公署・公共施設' : 'Civic Service Facility';
                stageText = isJa ? '公共機能稼働中' : 'Operational Civic Function';
            }
        } else if (tile.type === CONFIG.TYPES.AGRICULTURE) {
            desc = isJa ? '灌漑水田 (稲作農地)' : 'Irrigated Rice Paddy (Suiden)';
            const month = (this.state && this.state.currentMonth) ? this.state.currentMonth : 1;
            const season = (month >= 3 && month <= 5) ? (isJa ? '春水田 (田植え・湛水)' : 'Spring (Flooded Seedlings)')
                : (month >= 6 && month <= 8) ? (isJa ? '夏水田 (青田繁茂)' : 'Summer (Lush Emerald Stalks)')
                : (month >= 9 && month <= 11) ? (isJa ? '秋水田 (豊作黄金稲穂・収穫+¥20)' : 'Autumn (Golden Harvest +¥20)')
                : (isJa ? '冬水田 (刈跡乾田)' : 'Winter (Dry Stubble Earth)');
            stageText = season;
        } else if (tile.type === CONFIG.TYPES.ZONE) {
            if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                desc = tile.level >= 2
                    ? (isJa ? '町家居住区 (蔵造り)' : 'Residential (Kura-zukuri)')
                    : (isJa ? '町家居住区 (木造町家)' : 'Residential (Machiya)');
            } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL) {
                if (tile.level >= 4) desc = isJa ? '銀座煉瓦街 (西洋赤煉瓦アーケード)' : 'Western Brick Arcade (Ginza Rengagai)';
                else if (tile.level === 3) desc = isJa ? '擬洋風煉瓦街 (銀座風赤煉瓦商館)' : 'Commercial (Giyōfū Red Brick Arcade)';
                else if (tile.level >= 2) desc = isJa ? '二階建大店商店' : 'Commercial (Two-Story Shop)';
                else desc = isJa ? '下町商店 (小間物・呉服店)' : 'Commercial (Shouten)';
            } else if (tile.zoneType === CONFIG.ZONES.INDUSTRIAL) {
                desc = isJa ? '鍛冶工房・瓦窯・作業場' : 'Industrial (Workshop & Kiln)';
            }

            if (tile.stage === CONFIG.STAGES.ON_FIRE) stageText = isJa ? '🔥 猛火延焼中! (消火急行)' : '🔥 CONFLAGRATION! (Burning)';
            else if (tile.stage === CONFIG.STAGES.BURNED) stageText = isJa ? '⚠️ 焼跡瓦礫 (取壊し [-¥5])' : '⚠️ Charred Ruins (Demolish [-¥5])';
            else if (tile.stage === CONFIG.STAGES.SCAFFOLDING) {
                stageText = tile.targetLevel >= 4
                    ? (isJa ? '銀座赤煉瓦街へ近代化普請中' : 'Modernizing to Ginza Brick (Scaffold)')
                    : (tile.targetLevel >= 3
                        ? (isJa ? '擬洋風煉瓦館へ近代化普請中' : 'Modernizing to Giyōfū (Scaffold)')
                        : (isJa ? '新規建築普請中 (足場組立)' : 'Under Construction (Scaffold)'));
            } else if (tile.stage === CONFIG.STAGES.BUILT) {
                stageText = tile.level >= 4
                    ? (isJa ? '第四水準 (銀座煉瓦街・最高商業収益)' : 'Active Level 4 (Ginza Brick Arcade)')
                    : (tile.level >= 3
                        ? (isJa ? '第三水準 (耐火赤煉瓦構造)' : 'Active Level 3 (Fireproof Brick)')
                        : (tile.level >= 2
                            ? (isJa ? '第二水準 (耐火土蔵造り)' : 'Active Level 2 (Fireproof)')
                            : (isJa ? '第一水準 (木造普請)' : 'Active Level 1')));
            } else {
                stageText = isJa ? '区画指定済 (空地)' : 'Zoned (Unoccupied)';
            }
        }

        if (this.dom.type) this.dom.type.textContent = desc;
        if (this.dom.stage) {
            this.dom.stage.textContent = stageText;
            this.dom.stage.style.color = tile.stage === CONFIG.STAGES.ON_FIRE ? '#b33927' : '';
        }

        const hasRoad = grid.hasAdjacentRoad(x, y);
        if (this.dom.road) {
            this.dom.road.textContent = hasRoad ? (isJa ? '街道接続あり' : 'Connected') : (isJa ? '未接続 (孤立)' : 'No Access');
            this.dom.road.style.color = hasRoad ? '#3a6332' : '#8c7355';
        }

        if (this.dom.fire) {
            let fireText = isJa ? 'なし (0%)' : 'None (0%)';
            let fireColor = '#3a6332';
            if (tile.stage === CONFIG.STAGES.ON_FIRE) {
                fireText = isJa ? '🔥 猛火 (100%)' : '🔥 Blazing (100%)';
                fireColor = '#b33927';
            } else if (tile.stage === CONFIG.STAGES.BURNED) {
                fireText = isJa ? '焼跡・瓦礫' : 'Charred Ruins';
                fireColor = '#6b5c4d';
            } else if (tile.type === CONFIG.TYPES.CANAL) {
                fireText = isJa ? '堀防火帯 (延焼遮断)' : 'Water Firebreak (Immune)';
                fireColor = '#3a6332';
            } else if (tile.type === CONFIG.TYPES.ROAD && tile.roadTier === 2) {
                fireText = isJa ? '石畳防火帯 (延焼遮断)' : 'Stone Firebreak (Immune)';
                fireColor = '#3a6332';
            } else if (tile.type === CONFIG.TYPES.ZONE && (tile.stage === CONFIG.STAGES.BUILT || tile.stage === CONFIG.STAGES.SCAFFOLDING)) {
                if (tile.level >= 2) {
                    fireText = isJa ? '耐火構造 (0%)' : 'Fireproof (0%)';
                } else {
                    const info = simulation ? simulation.getTileFireRiskDetails(tile) : { risk: 5, protected: false };
                    fireText = `${info.risk}% (${info.protected ? (isJa ? '消防防護 -50%' : 'Protected -50%') : (isJa ? '無防備' : 'Vulnerable')})`;
                    fireColor = info.risk > 30 ? '#b33927' : (info.risk > 15 ? '#b58900' : '#3a6332');
                }
            }
            this.dom.fire.textContent = fireText;
            this.dom.fire.style.color = fireColor;
        }

        if (this.dom.water) {
            if (tile.type === CONFIG.TYPES.CANAL) {
                this.dom.water.textContent = isJa ? '清流・通船水利' : 'Flowing Waterway';
                this.dom.water.style.color = '#2c4765';
            } else if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                const covered = simulation ? simulation.isWellCovered(x, y) : false;
                this.dom.water.textContent = covered ? (isJa ? '清浄 (安全)' : 'Clean (Safe)') : (isJa ? 'コレラ危険 (井戸なし)' : 'At Risk (No Well)');
                this.dom.water.style.color = covered ? '#3a6332' : '#b33927';
            } else if (tile.type === CONFIG.TYPES.AGRICULTURE) {
                const isIrrigated = (this.state && this.state.agriculture && typeof this.state.agriculture.isIrrigated === 'function')
                    ? this.state.agriculture.isIrrigated(x, y)
                    : (grid.hasAdjacentCanal(x, y) || (simulation && simulation.isWellCovered(x, y)));
                this.dom.water.textContent = isIrrigated ? (isJa ? '灌漑潤沢 (通水)' : 'Irrigated (Safe)') : (isJa ? '渇水 (水利未達)' : 'Parched (Dry)');
                this.dom.water.style.color = isIrrigated ? '#3a6332' : '#b33927';
            } else if (tile.type === CONFIG.TYPES.SERVICE && (tile.serviceType === CONFIG.SERVICES.WELL || tile.serviceType === CONFIG.SERVICES.SENTO)) {
                this.dom.water.textContent = isJa ? '湧水給水稼働中' : 'Active Spring Supply';
                this.dom.water.style.color = '#2c4765';
            } else if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.HARBOR_PIER) {
                this.dom.water.textContent = isJa ? '港湾水利・運河接続' : 'Harbor Basin';
                this.dom.water.style.color = '#2c4765';
            } else {
                this.dom.water.textContent = isJa ? '対象外' : 'N/A';
                this.dom.water.style.color = '#8c7355';
            }
        }

        if (this.dom.leisure) {
            if (tile.type === CONFIG.TYPES.ZONE && tile.zoneType === CONFIG.ZONES.RESIDENTIAL) {
                const isOchaya = simulation ? simulation.isOchayaCovered(x, y) : false;
                const isSento = simulation ? simulation.isSentoCovered(x, y) : false;
                const isShrine = simulation && typeof simulation.isShrineCovered === 'function'
                    ? simulation.isShrineCovered(x, y)
                    : (simulation && simulation.happiness && typeof simulation.happiness.isShrineCovered === 'function'
                        ? simulation.happiness.isShrineCovered(x, y)
                        : false);

                if (isShrine && !isOchaya && !isSento) {
                    this.dom.leisure.textContent = isJa ? '鎮守の杜 (参拝圏内 / 満足度+10%)' : 'Shrine (Blessed / +10% Satisfaction)';
                    this.dom.leisure.style.color = '#3a6332';
                } else {
                    const venues = [];
                    if (isOchaya) venues.push(isJa ? '茶屋' : 'Teahouse');
                    if (isSento) venues.push(isJa ? '銭湯' : 'Bathhouse');
                    if (isShrine) venues.push(isJa ? '鎮守の杜 (+10%)' : 'Shrine (+10%)');

                    if (venues.length > 0) {
                        this.dom.leisure.textContent = isJa ? venues.join('・') : venues.join(' & ');
                        this.dom.leisure.style.color = '#3a6332';
                    } else {
                        this.dom.leisure.textContent = isJa ? 'なし' : 'None';
                        this.dom.leisure.style.color = '#b33927';
                    }
                }
            } else if (tile.type === CONFIG.TYPES.SERVICE && (tile.serviceType === CONFIG.SERVICES.OCHAYA || tile.serviceType === CONFIG.SERVICES.SENTO || tile.serviceType === CONFIG.SERVICES.SHRINE_PARK)) {
                this.dom.leisure.textContent = tile.serviceType === CONFIG.SERVICES.SHRINE_PARK ? (isJa ? '近隣神社' : 'Neighborhood Shrine') : (isJa ? '公共文化施設' : 'Civic Venue');
                this.dom.leisure.style.color = '#2c4765';
            } else if (tile.type === CONFIG.TYPES.PARK) {
                this.dom.leisure.textContent = isJa ? '景観美化' : 'Scenic Flora';
                this.dom.leisure.style.color = '#3a6332';
            } else {
                this.dom.leisure.textContent = isJa ? '対象外' : 'N/A';
                this.dom.leisure.style.color = '#8c7355';
            }
        }

        if (this.dom.order) {
            if (tile.type === CONFIG.TYPES.ZONE) {
                const isSecured = simulation ? simulation.isOrderCovered(x, y) : false;
                const lvl = tile.level || 1;
                if (isSecured) {
                    this.dom.order.textContent = isJa ? '警邏巡回中 (+10%治安増益)' : 'Secured (+10% Revenue)';
                    this.dom.order.style.color = '#3a6332';
                } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL && lvl >= 2) {
                    const pen = lvl >= 3 ? '-30%' : '-15%';
                    this.dom.order.textContent = isJa ? `警備巡回なし (${pen} 盗難被害)` : `Unpatrolled (${pen} Crime)`;
                    this.dom.order.style.color = '#b33927';
                } else if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL && lvl >= 2) {
                    const pen = lvl >= 3 ? '-25%' : '-20%';
                    this.dom.order.textContent = isJa ? `警備巡回なし (${pen} 治安不満)` : `Unpatrolled (${pen} Morale)`;
                    this.dom.order.style.color = '#b33927';
                } else {
                    this.dom.order.textContent = isJa ? '警備巡回なし' : 'Unpatrolled';
                    this.dom.order.style.color = '#8c7355';
                }
            } else if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.KOBAN) {
                this.dom.order.textContent = isJa ? '警視本署・交番' : 'Headquarters';
                this.dom.order.style.color = '#2c4765';
            } else {
                const isSecured = simulation ? simulation.isOrderCovered(x, y) : false;
                this.dom.order.textContent = isSecured ? (isJa ? '警邏巡回中' : 'Secured') : (isJa ? '警備巡回なし' : 'Unpatrolled');
                this.dom.order.style.color = isSecured ? '#3a6332' : '#8c7355';
            }
        }

        if (this.dom.education) {
            const hasEdu = (this.state && this.state.schoolSystem && typeof this.state.schoolSystem.isEducationCovered === 'function')
                ? this.state.schoolSystem.isEducationCovered(x, y)
                : (simulation && typeof simulation.isEducationCovered === 'function' ? simulation.isEducationCovered(x, y) : false);

            if (tile.type === CONFIG.TYPES.SERVICE && tile.serviceType === CONFIG.SERVICES.SCHOOL) {
                this.dom.education.textContent = isJa ? '文部省認可校' : 'Primary School';
                this.dom.education.style.color = '#2c4765';
            } else if (tile.type === CONFIG.TYPES.ZONE) {
                const lvl = tile.level || 1;
                if (hasEdu) {
                    this.dom.education.textContent = isJa ? '就学済 (教育圏内)' : 'Educated';
                    this.dom.education.style.color = '#3a6332';
                } else if (tile.zoneType === CONFIG.ZONES.COMMERCIAL && lvl >= 3) {
                    this.dom.education.textContent = isJa ? '未就学 (-20% 帳簿人材不足)' : 'Unserved (-20% Clerks)';
                    this.dom.education.style.color = '#b33927';
                } else if (tile.zoneType === CONFIG.ZONES.RESIDENTIAL && lvl >= 3) {
                    this.dom.education.textContent = isJa ? '未就学 (-25% 教育不満)' : 'Unserved (-25% Morale)';
                    this.dom.education.style.color = '#b33927';
                } else {
                    this.dom.education.textContent = isJa ? '未就学' : 'Unserved';
                    this.dom.education.style.color = '#8c7355';
                }
            } else {
                this.dom.education.textContent = isJa ? '対象外' : 'N/A';
                this.dom.education.style.color = '#8c7355';
            }
        }

        if (this.dom.rotateRow) {
            const isRotatable = tile && (tile.type === CONFIG.TYPES.SERVICE || (tile.type === CONFIG.TYPES.ZONE && tile.stage === CONFIG.STAGES.BUILT));
            if (isRotatable) {
                this.dom.rotateRow.style.display = 'flex';
                let rotIdx = 0;
                if (typeof tile.rotation === 'number') {
                    rotIdx = ((tile.rotation % 4) + 4) % 4;
                } else if (this.state && this.state.renderer) {
                    rotIdx = ((Math.round(this.state.renderer.getFacingAngleForTile(x, y) / (Math.PI / 2)) % 4) + 4) % 4;
                }
                const dirs = [i18n.t('dir.north'), i18n.t('dir.east'), i18n.t('dir.south'), i18n.t('dir.west')];
                if (this.dom.facing) this.dom.facing.textContent = dirs[rotIdx];
            } else {
                this.dom.rotateRow.style.display = 'none';
            }
        }
    }
}
