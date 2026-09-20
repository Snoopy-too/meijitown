// Project Meiji - Tool Effects & Purpose Data Layer
// ponytail: centralized tool metadata catalog (< 250 lines)

export const TOOL_CATALOG = {
    well: {
        name: { en: 'Well (Ido)', ja: '井戸' },
        cost: 80, upkeep: 2,
        effect: {
            en: 'Provides fresh water within 5 tiles. Eliminates disease risk and satisfies basic sanitation.',
            ja: '半径5タイルに生活用水を供給。伝染病を防ぎ衛生を確保。'
        },
        category: 'civic'
    },
    fire_watchtower: {
        name: { en: 'Watchtower (Hinomi-yagura)', ja: '火の見櫓' },
        cost: 250, upkeep: 5,
        effect: {
            en: 'Detects blazes across 6 tiles. Rings alarm bell to summon nearby Hikeshi brigades.',
            ja: '半径6タイルの火災を早期発見。半鐘で消火隊を誘導。'
        },
        category: 'civic'
    },
    shrine_park: {
        name: { en: 'Shrine Park (Jinja)', ja: '神社・鎮守の杜' },
        cost: 50, upkeep: 0,
        effect: {
            en: 'Provides Leisure & Culture within 4 tiles (+10% satisfaction). Calms panic during disasters.',
            ja: '半径4タイルの住宅に娯楽と安心を提供（満足度+10%）。'
        },
        category: 'leisure'
    },
    road: {
        name: { en: 'Dirt Road', ja: '往来土道' },
        cost: 10, upkeep: 1,
        effect: {
            en: 'Essential dirt thoroughfare for pedestrian commerce and horse carts.',
            ja: '歩行者や荷車の往来を支える基礎的な土道。'
        },
        category: 'infra'
    },
    stone_road: {
        name: { en: 'Stone Paving (Ishidatami)', ja: '石畳舗装' },
        cost: 30, upkeep: 1,
        effect: {
            en: 'Meiji granite paving. Accelerates movement and acts as an absolute firebreak.',
            ja: '御影石の石畳。往来を円滑にし、延焼を完全に阻止する防火帯。'
        },
        category: 'infra'
    },
    canal: {
        name: { en: 'Canal (Hori)', ja: '堀・水路' },
        cost: 15, upkeep: 0,
        effect: {
            en: 'Historical water artery for cargo barges. Serves as a wide firebreak.',
            ja: '荷船が航行する歴史的水路。広域な延焼遮断帯としても機能。'
        },
        category: 'infra'
    },
    rail_track: {
        name: { en: 'Iron Rail Track', ja: '鉄道路線' },
        cost: 20, upkeep: 1,
        effect: {
            en: 'Iron rails laid on wooden ties. Connects passenger and freight depots.',
            ja: '枕木と鉄条による軌道。旅客駅と貨物駅を結ぶ近代交通網。'
        },
        category: 'infra'
    },
    train_depot: {
        name: { en: 'Train Depot', ja: '停車場・駅' },
        cost: 350, upkeep: 10,
        effect: {
            en: 'Station terminal spurring high-density modernization and commerce.',
            ja: '周辺の商業近代化と集客を促す鉄道の玄関口。'
        },
        category: 'infra'
    },
    tree_willow: {
        name: { en: 'Canal Tree (Willow & Sakura)', ja: '水辺並木・桜' },
        cost: 15, upkeep: 0,
        effect: {
            en: 'Beautifies roadsides and canal banks, enhancing urban charm.',
            ja: '街道や堀端を彩る桜と柳。景観美と情緒を高める。'
        },
        category: 'infra'
    },
    residential: {
        name: { en: 'Machiya Residence Zone', ja: '町家 (居住区画)' },
        cost: 15, upkeep: 0,
        effect: {
            en: 'Zones land for traditional wooden townhouses housing townspeople.',
            ja: '町人が暮らす木造長屋・町家の居住区画を指定。'
        },
        category: 'zones'
    },
    commercial: {
        name: { en: 'Shouten Commercial Zone', ja: '商店 (商業区画)' },
        cost: 20, upkeep: 0,
        effect: {
            en: 'Zones merchant storefronts to generate municipal tax revenue.',
            ja: '税収と賑わいを生み出す商人宿・商店街の商業区画を指定。'
        },
        category: 'zones'
    },
    industrial: {
        name: { en: 'Workshop Industrial Zone', ja: '作業場 (工業区画)' },
        cost: 25, upkeep: 0,
        effect: {
            en: 'Zones craft workshops and mills creating jobs. Emits coal smoke.',
            ja: '職人工房や製糸所を誘致し雇用を創出。煤煙が発生。'
        },
        category: 'zones'
    },
    rice_paddy: {
        name: { en: 'Irrigated Rice Paddy (Suiden)', ja: '灌漑水田' },
        cost: 10, upkeep: 0,
        effect: {
            en: 'Agrarian paddy yielding annual autumn harvest bonuses (+¥20/tile).',
            ja: '秋の収穫期に年貢・増収ボーナス（+¥20）をもたらす灌漑水田。'
        },
        category: 'zones'
    },
    fire_depot: {
        name: { en: 'Fire Depot (Hikeshi-sho)', ja: '消防屯所' },
        cost: 180, upkeep: 5,
        effect: {
            en: 'Dispatches trained firefighters across 10 road tiles to extinguish blazes.',
            ja: '道路網10タイル圏内に消火隊を急行させ火災を迅速鎮火。'
        },
        category: 'civic'
    },
    koban: {
        name: { en: 'Police Box (Kōban)', ja: '交番・派出所' },
        cost: 110, upkeep: 3,
        effect: {
            en: 'Patrols an 8-tile radius to maintain public peace and suppress crime.',
            ja: '半径8タイルを警ら。治安を維持し犯罪や暴動を抑止。'
        },
        category: 'civic'
    },
    school: {
        name: { en: 'Primary School (Shōgakkō)', ja: '尋常小学校' },
        cost: 280, upkeep: 8,
        effect: {
            en: 'Educates youth within 8 tiles, elevating citywide literacy and enlightenment.',
            ja: '半径8タイルの学童を教育し、近代化度と文明開化を推進。'
        },
        category: 'civic'
    },
    telegraph: {
        name: { en: 'Telegraph Office (Denshin-kyoku)', ja: '電信分局' },
        cost: 220, upkeep: 6,
        effect: {
            en: 'Provides telegraph grid coverage, granting a +30% range boost to civic buildings.',
            ja: '電信網を敷設。送電・通信で公共施設の有効範囲を30%拡大。'
        },
        category: 'civic'
    },
    harbor_pier: {
        name: { en: 'Cargo Pier (Funatsuki-ba)', ja: '船着場 (港湾荷揚場)' },
        cost: 450, upkeep: 12,
        effect: {
            en: 'Harbor cargo pier facilitating raw materials, silk export, and trade.',
            ja: '水運物流と生糸輸出を支え、商業・工業需要を大きく底上げ。'
        },
        category: 'infra'
    },
    power_plant: {
        name: { en: 'Coal Power Plant', ja: '石炭火力発電所' },
        cost: 600, upkeep: 25,
        effect: {
            en: 'Steam coal facility powering industrial mills and Western brick arcades.',
            ja: '蒸気火力で近代工場群や銀座煉瓦街へ電力を供給。周辺に煤煙。'
        },
        category: 'civic'
    },
    waterworks: {
        name: { en: 'Water Filtration Basin', ja: '浄水場 (近代沈殿池)' },
        cost: 350, upkeep: 15,
        effect: {
            en: 'Pressurized clean water grid supplying potable water across 18 tiles.',
            ja: '半径18タイルへ近代的な加圧上水を配給しコレラ等の疫病を撲滅。'
        },
        category: 'civic'
    },
    monument_pavilion: {
        name: { en: 'National Exposition Pavilion', ja: '内国勧業博覧会館' },
        cost: 2000, upkeep: 0,
        effect: { en: 'Grand exposition pavilion celebrating Meiji modernization.', ja: '明治の産業振興を祝う壮麗な殿堂。' },
        category: 'civic'
    },
    suimon: {
        name: { en: 'Watergate Sluice (Suimon)', ja: '明治水門・防潮樋' },
        cost: 180, upkeep: 4,
        effect: { en: 'Prevents upstream canal surges and protects from typhoon flood.', ja: '運河の高潮・逆流を遮断し台風水害を防止。' },
        category: 'civic'
    },
    ochaya: {
        name: { en: 'Traditional Teahouse (Ochaya)', ja: '伝統茶屋' },
        cost: 120, upkeep: 3,
        effect: { en: 'Hospitality and leisure within 6 tiles, raising satisfaction.', ja: '半径6タイルに伝統の憩いを提供（満足度向上）。' },
        category: 'leisure'
    },
    sento: {
        name: { en: 'Public Bathhouse (Sentō)', ja: '町湯・銭湯' },
        cost: 90, upkeep: 2,
        effect: { en: 'Promotes communal sanitation (+50%) and leisure (+25%) within 5 tiles.', ja: '半径5タイルの衛生度と娯楽度を向上。' },
        category: 'leisure'
    },
    bulldozer: {
        name: { en: 'Demolition & Clearance', ja: '撤去・取壊し' },
        cost: 5, upkeep: 0,
        effect: { en: 'Demolishes structures, clears burned ruins, and reclaims urban land.', ja: '建物・道路の取壊し、瓦礫の撤去、整地。' },
        category: 'inspect'
    },
    inspect: {
        name: { en: "Surveyor's Scope", ja: '測量手帳・視察' },
        cost: 0, upkeep: 0,
        effect: { en: 'Inspects tile status, land value, fire/flood hazards, and citizen feedback.', ja: 'タイルの状態、地価、火災・水害リスク、住民の声を調査。' },
        category: 'inspect'
    }
};

// Aliases for seamless cross-referencing
TOOL_CATALOG.watchtower = TOOL_CATALOG.fire_watchtower;
TOOL_CATALOG.pavilion = TOOL_CATALOG.monument_pavilion;

export function getToolCatalogEntry(toolKey) {
    if (!toolKey) return null;
    const key = String(toolKey).toLowerCase();
    if (TOOL_CATALOG[key]) return TOOL_CATALOG[key];
    if (key === 'watchtower' || key === 'fire_watchtower') return TOOL_CATALOG.fire_watchtower;
    if (key === 'pavilion' || key === 'monument_pavilion') return TOOL_CATALOG.monument_pavilion;
    return null;
}
