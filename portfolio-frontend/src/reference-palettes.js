// Colours were visually sampled from the user's compact palette screenshot.
// The source swatches are only a few pixels wide, so every HEX is approximate.
// source.row and source.column are one-based positions in the supplied grid.
const entries = [
  // Dark & Futuristic — 10
  ['scarlet-signal', 'Scarlet Signal', 'dark', 1, 2, ['#8D0A0D', '#CC1119', '#F0EAE6', '#144968', '#72A8C3']],
  ['violet-dusk', 'Violet Dusk', 'dark', 1, 12, ['#291C3A', '#503554', '#956476', '#C5878D', '#E4B6AD']],
  ['ember-noir', 'Ember Noir', 'dark', 1, 15, ['#21100E', '#501216', '#901E26', '#B72D39', '#CC4C55']],
  ['electric-amethyst', 'Electric Amethyst', 'dark', 2, 1, ['#180B32', '#361068', '#5E1699', '#8736CC', '#AF78E8']],
  ['golden-terminal', 'Golden Terminal', 'dark', 2, 3, ['#05070B', '#16191D', '#F1A207', '#F4E4C0', '#FAFAF6']],
  ['midnight-mist', 'Midnight Mist', 'dark', 2, 17, ['#111B30', '#223B60', '#47678B', '#A1B6B3', '#EEF2CF']],
  ['forest-after-dark', 'Forest After Dark', 'dark', 3, 12, ['#173924', '#456448', '#9DA77C', '#CFBC89', '#254351']],
  ['cinder-circuit', 'Cinder Circuit', 'dark', 6, 4, ['#111C2D', '#650A16', '#B62317', '#E68712', '#F1CA55']],
  ['deep-orchid', 'Deep Orchid', 'dark', 4, 18, ['#101A25', '#231C44', '#51256F', '#126A55', '#95C3AD']],
  ['oxblood-studio', 'Oxblood Studio', 'dark', 7, 4, ['#1A080F', '#4C0D1A', '#851723', '#B32B39', '#DA9685']],

  // Ocean, Blue & Cyan — 8
  ['azure-current', 'Azure Current', 'blue', 1, 8, ['#0B1774', '#0860A9', '#05A6CF', '#6BCFE6', '#C7F0F1']],
  ['harbour-sunrise', 'Harbour Sunrise', 'blue', 1, 9, ['#6CC1D9', '#2585A8', '#074866', '#F5A219', '#ED690C']],
  ['steel-horizon', 'Steel Horizon', 'blue', 1, 19, ['#182D47', '#3C5A79', '#7A90A9', '#BFCCD6', '#E4E7EA']],
  ['coastal-light', 'Coastal Light', 'blue', 2, 2, ['#0D355B', '#175B87', '#DCE9F2', '#F2CA60', '#EB6D3D']],
  ['prismatic-tide', 'Prismatic Tide', 'blue', 2, 14, ['#7E14D2', '#5935BD', '#398EC2', '#24B8C9', '#78E3D9']],
  ['blue-glacier', 'Blue Glacier', 'blue', 2, 19, ['#08226A', '#1450AF', '#218BC7', '#71C7E1', '#C3EEF3']],
  ['neon-marina', 'Neon Marina', 'blue', 3, 19, ['#143657', '#276CA6', '#2BAAD2', '#84D8E6', '#F3E9BE']],
  ['teal-pulse', 'Teal Pulse', 'blue', 5, 6, ['#0B4C63', '#207A96', '#2CB1CF', '#F4A21F', '#E66C14']],

  // Nature & Forest — 6
  ['cedar-meadow', 'Cedar Meadow', 'nature', 1, 1, ['#263A27', '#5F7040', '#E7EBD2', '#DFA363', '#AA5B2D']],
  ['sunlit-fern', 'Sunlit Fern', 'nature', 1, 6, ['#26462C', '#719A55', '#AFC570', '#D5DD90', '#F1EDBF']],
  ['sage-architecture', 'Sage Architecture', 'nature', 1, 13, ['#D8D7CE', '#B1BDA9', '#80967E', '#536D57', '#2E4640']],
  ['wild-botanical', 'Wild Botanical', 'nature', 2, 15, ['#426348', '#73A147', '#ACC45D', '#CAE57A', '#B83847']],
  ['soft-canopy', 'Soft Canopy', 'nature', 3, 7, ['#DAE4BB', '#CBD69F', '#A8BF8F', '#779F7D', '#C9A982']],
  ['moss-and-stone', 'Moss and Stone', 'nature', 5, 13, ['#C3D0BB', '#B6C69B', '#A9B77C', '#697E62', '#334D3F']],

  // Warm & Earthy — 6
  ['clay-rose', 'Clay Rose', 'warm', 1, 3, ['#7A482C', '#C98166', '#E8A8A1', '#F0C8C2', '#C7D08F']],
  ['autumn-wood', 'Autumn Wood', 'warm', 1, 7, ['#573820', '#98653C', '#C99151', '#E5BD7C', '#F2DFBE']],
  ['terracotta-grove', 'Terracotta Grove', 'warm', 1, 10, ['#593A25', '#86664E', '#AB8C66', '#C6BA98', '#50664C']],
  ['copper-flame', 'Copper Flame', 'warm', 2, 11, ['#170D0D', '#76131A', '#BD2518', '#ED6B0D', '#F6BD20']],
  ['honeyed-field', 'Honeyed Field', 'warm', 3, 5, ['#F2E0BD', '#E9BB7E', '#E7A263', '#BCCB99', '#768C82']],
  ['amber-paper', 'Amber Paper', 'warm', 6, 20, ['#7F3C1C', '#BC692D', '#DFA750', '#F4D3A7', '#F0E9DE']],

  // Elegant & Minimal — 6
  ['quiet-olive', 'Quiet Olive', 'minimal', 1, 11, ['#AEBE88', '#CED8AD', '#EBEDD3', '#F6E6C6', '#E2A576']],
  ['mist-and-ink', 'Mist and Ink', 'minimal', 2, 6, ['#2C3234', '#5F6A6B', '#A9B9B6', '#DCE6E1', '#F3F4F0']],
  ['woodland-neutral', 'Woodland Neutral', 'minimal', 2, 10, ['#173D2E', '#4B664D', '#828671', '#BDB08B', '#E2D3B3']],
  ['linen-studio', 'Linen Studio', 'minimal', 3, 14, ['#D4CBB9', '#BEBDA7', '#ABB69C', '#E2D8BF', '#F1EEE4']],
  ['monochrome-sage', 'Monochrome Sage', 'minimal', 5, 14, ['#F3F5F1', '#E0E5DB', '#B7BFB4', '#78847D', '#303B35']],
  ['slate-linen', 'Slate Linen', 'minimal', 6, 11, ['#342E30', '#514B47', '#77746D', '#AAA79C', '#D8D6CB']],

  // Vibrant & Creative — 6
  ['citrus-terminal', 'Citrus Terminal', 'vibrant', 1, 5, ['#10374B', '#E45914', '#FF9422', '#FFC13D', '#E7EDBE']],
  ['tropical-kinetic', 'Tropical Kinetic', 'vibrant', 1, 14, ['#B4E0E7', '#F9C078', '#EBA717', '#79B940', '#24672E']],
  ['solar-violet', 'Solar Violet', 'vibrant', 2, 4, ['#41459B', '#5E51BF', '#A165C6', '#FDBD13', '#F27217']],
  ['saffron-twilight', 'Saffron Twilight', 'vibrant', 3, 1, ['#0B243C', '#34556B', '#F0B20A', '#F9D331', '#F5EC78']],
  ['chromatic-sprint', 'Chromatic Sprint', 'vibrant', 6, 19, ['#F6900D', '#F9C02C', '#B41AF5', '#4B31DF', '#0CC9DD']],
  ['festival-current', 'Festival Current', 'vibrant', 7, 16, ['#F7D82A', '#EFA81A', '#E66830', '#2B9D9E', '#234F79']],

  // Pastel & Soft — 5
  ['lavender-cloud', 'Lavender Cloud', 'pastel', 1, 4, ['#CDBFDF', '#E8BAD8', '#F3B7D2', '#AEE2EF', '#8AC4EC']],
  ['rose-candy', 'Rose Candy', 'pastel', 1, 16, ['#F8D2DF', '#F4ADC5', '#F697B8', '#F87BA0', '#EA5C89']],
  ['powder-lilac', 'Powder Lilac', 'pastel', 1, 21, ['#A5B0C6', '#C4C8D9', '#E1D7E0', '#EADDF3', '#DAE1FA']],
  ['blush-garden', 'Blush Garden', 'pastel', 2, 7, ['#F5C7D5', '#E99DBB', '#BF5478', '#36675D', '#A3CBB9']],
  ['pastel-earth', 'Pastel Earth', 'pastel', 3, 2, ['#E1EAD5', '#DDE4B5', '#E6D4B5', '#B89F83', '#7F7065']],

  // Premium & Luxury — 3
  ['bronze-tide', 'Bronze Tide', 'luxury', 1, 17, ['#0B7180', '#338A8F', '#DDA027', '#BE6411', '#801925']],
  ['sapphire-ivory', 'Sapphire Ivory', 'luxury', 2, 16, ['#203253', '#465A73', '#7D9CAA', '#E2DEB8', '#F2ECD2']],
  ['gilded-ember', 'Gilded Ember', 'luxury', 3, 11, ['#2D1D1D', '#713022', '#B95536', '#E4AD68', '#F0D9A7']]
];

export const referencePaletteEntries = entries.map(([id, name, category, row, column, colors]) => ({
  id, name, category, family: category, colors,
  source: { row, column, approximate: true }
}));
