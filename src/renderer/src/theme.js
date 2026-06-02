// MD3 state layer opacities
const stateVars = {
  'hover-opacity': 0.08,
  'focus-opacity': 0.12,
  'selected-opacity': 0.08,
  'activated-opacity': 0.12,
  'pressed-opacity': 0.12,
  'dragged-opacity': 0.16,
  'disabled-opacity': 0.38,
  'idle-opacity': 0.04,
  'border-opacity': 0.12,
  'high-emphasis-opacity': 1,
  'medium-emphasis-opacity': 0.74
}

const shape = {
  'radius-btn': '4px',
  'radius-btn-icon': '4px',
  'radius-btn-fab': '50%',
  'radius-card': '8px',
  'radius-chip': '6px',
  'radius-dialog': '12px',
  'radius-input': '4px',
  'radius-menu': '4px',
  'radius-snackbar': '4px',
  'radius-tooltip': '4px'
}

// ─── Base Surfaces ────────────────────────────────────────────────────────
const baseDarkSurface = {
  background: '#212121',
  surface: '#212121',
  'surface-dim': '#212121',
  'surface-bright': '#424242',
  'surface-light': '#212121',
  'surface-variant': '#424242',
  'surface-container-lowest': '#000000',
  'surface-container-low': '#212121',
  'surface-container': '#424242',
  'surface-container-high': '#616161',
  'surface-container-highest': '#757575',
  'on-background': '#FAFAFA',
  'on-surface': '#FAFAFA',
  'on-surface-variant': '#BDBDBD',
  outline: '#9E9E9E',
  'outline-variant': '#616161',
  shadow: '#000000',
  scrim: '#000000',
  'inverse-surface': '#FAFAFA',
  'inverse-on-surface': '#212121',
  'inverse-primary': '#616161',
  error: '#FFB4AB',
  'on-error': '#690005',
  'error-container': '#93000A',
  'on-error-container': '#FFDAD6',
  info: '#A7C7F9',
  'on-info': '#173050',
  'info-container': '#1E4F86',
  'on-info-container': '#D6E3FF',
  success: '#A8DDB5',
  'on-success': '#183823',
  'success-container': '#1E5C2F',
  'on-success-container': '#C8EDD5',
  warning: '#F8D48B',
  'on-warning': '#3E2D00',
  'warning-container': '#5A4200',
  'on-warning-container': '#FDEECB'
}

const baseLightSurface = {
  background: '#FAFAFA',
  surface: '#FAFAFA',
  'surface-dim': '#E0E0E0',
  'surface-bright': '#FFFFFF',
  'surface-light': '#FAFAFA',
  'surface-variant': '#E0E0E0',
  'surface-container-lowest': '#FFFFFF',
  'surface-container-low': '#F5F5F5',
  'surface-container': '#EEEEEE',
  'surface-container-high': '#E0E0E0',
  'surface-container-highest': '#BDBDBD',
  'on-background': '#212121',
  'on-surface': '#212121',
  'on-surface-variant': '#424242',
  outline: '#757575',
  'outline-variant': '#BDBDBD',
  shadow: '#000000',
  scrim: '#000000',
  'inverse-surface': '#212121',
  'inverse-on-surface': '#FAFAFA',
  'inverse-primary': '#EEEEEE',
  error: '#BA1A1A',
  'on-error': '#FFFFFF',
  'error-container': '#FFDAD6',
  'on-error-container': '#410002',
  info: '#3865A8',
  'on-info': '#FFFFFF',
  'info-container': '#D6E3FF',
  'on-info-container': '#0D1E40',
  success: '#3D7A4E',
  'on-success': '#FFFFFF',
  'success-container': '#C8EDD5',
  'on-success-container': '#0A2116',
  warning: '#8A6500',
  'on-warning': '#FFFFFF',
  'warning-container': '#FDEECB',
  'on-warning-container': '#2A1D00'
}

// ─── Theme Builder Factory ──────────────────────────────────────────────────
function createTheme(isDark, pri, sec, ter) {
  const base = isDark ? baseDarkSurface : baseLightSurface
  return {
    dark: isDark,
    colors: {
      ...base,
      primary: pri.base,
      'on-primary': pri.on,
      'primary-container': pri.container,
      'on-primary-container': pri.onContainer,
      'primary-darken-1': pri.darken,

      secondary: sec.base,
      'on-secondary': sec.on,
      'secondary-container': sec.container,
      'on-secondary-container': sec.onContainer,
      'secondary-darken-1': sec.darken,

      tertiary: ter.base,
      'on-tertiary': ter.on,
      'tertiary-container': ter.container,
      'on-tertiary-container': ter.onContainer,
    },
    variables: { ...stateVars, ...shape }
  }
}

// ─── Rainbow Themes ───────────────────────────────────────────────────────
export const redLight = createTheme(false,
  { base: '#B3261E', on: '#FFFFFF', container: '#F9DEDC', onContainer: '#410E0B', darken: '#8C1D18' },
  { base: '#775652', on: '#FFFFFF', container: '#FFDAD6', onContainer: '#2C1513', darken: '#5D3F3B' },
  { base: '#705C2E', on: '#FFFFFF', container: '#FBDFA6', onContainer: '#251A00' }
)
export const redDark = createTheme(true,
  { base: '#F2B8B5', on: '#601410', container: '#8C1D18', onContainer: '#F9DEDC', darken: '#B3261E' },
  { base: '#E7BDB8', on: '#442926', container: '#5D3F3B', onContainer: '#FFDAD6', darken: '#775652' },
  { base: '#DEC48C', on: '#3E2E04', container: '#564419', onContainer: '#FBDFA6' }
)

export const orangeLight = createTheme(false,
  { base: '#984816', on: '#FFFFFF', container: '#FFDBC7', onContainer: '#341100', darken: '#76330A' },
  { base: '#765747', on: '#FFFFFF', container: '#FFDBC7', onContainer: '#2C1609', darken: '#5D4031' },
  { base: '#666031', on: '#FFFFFF', container: '#ECE4AA', onContainer: '#201C00' }
)
export const orangeDark = createTheme(true,
  { base: '#FFB68C', on: '#542200', container: '#76330A', onContainer: '#FFDBC7', darken: '#984816' },
  { base: '#E6BEAC', on: '#432B1D', container: '#5D4031', onContainer: '#FFDBC7', darken: '#765747' },
  { base: '#CFC890', on: '#373107', container: '#4E481C', onContainer: '#ECE4AA' }
)

export const yellowLight = createTheme(false,
  { base: '#6C5E0F', on: '#FFFFFF', container: '#F8E287', onContainer: '#211B00', darken: '#524600' },
  { base: '#665E40', on: '#FFFFFF', container: '#EFE2BC', onContainer: '#211B04', darken: '#4F472A' },
  { base: '#43664E', on: '#FFFFFF', container: '#C5ECAE', onContainer: '#00210F' }
)
export const yellowDark = createTheme(true,
  { base: '#DBC66E', on: '#383000', container: '#524600', onContainer: '#F8E287', darken: '#6C5E0F' },
  { base: '#D2C6A1', on: '#363016', container: '#4F472A', onContainer: '#EFE2BC', darken: '#665E40' },
  { base: '#A9D0B3', on: '#143723', container: '#2C4E38', onContainer: '#C5ECAE' }
)

export const greenLight = createTheme(false,
  { base: '#1A6C30', on: '#FFFFFF', container: '#A5F5AC', onContainer: '#002107', darken: '#00531E' },
  { base: '#516350', on: '#FFFFFF', container: '#D4E8D0', onContainer: '#0F1F10', darken: '#3A4B3A' },
  { base: '#39656B', on: '#FFFFFF', container: '#BCEBF1', onContainer: '#001F23' }
)
export const greenDark = createTheme(true,
  { base: '#8AD892', on: '#003911', container: '#00531E', onContainer: '#A5F5AC', darken: '#1A6C30' },
  { base: '#B8CCB5', on: '#243424', container: '#3A4B3A', onContainer: '#D4E8D0', darken: '#516350' },
  { base: '#A0CFD5', on: '#00363C', container: '#1F4D53', onContainer: '#BCEBF1' }
)

export const blueLight = createTheme(false,
  { base: '#0061A4', on: '#FFFFFF', container: '#D1E4FF', onContainer: '#001D36', darken: '#00497D' },
  { base: '#535F70', on: '#FFFFFF', container: '#D7E3F7', onContainer: '#101C2B', darken: '#3B4758' },
  { base: '#6B5778', on: '#FFFFFF', container: '#F2DAFF', onContainer: '#251431' }
)
export const blueDark = createTheme(true,
  { base: '#9ECAFF', on: '#003258', container: '#00497D', onContainer: '#D1E4FF', darken: '#0061A4' },
  { base: '#BBC7DB', on: '#253140', container: '#3B4758', onContainer: '#D7E3F7', darken: '#535F70' },
  { base: '#D6BEE4', on: '#3B2948', container: '#523F5F', onContainer: '#F2DAFF' }
)

export const indigoLight = createTheme(false,
  { base: '#4858A9', on: '#FFFFFF', container: '#DFE0FF', onContainer: '#000B62', darken: '#2F4090' },
  { base: '#5B5D72', on: '#FFFFFF', container: '#E0E1F9', onContainer: '#181A2C', darken: '#434559' },
  { base: '#77536D', on: '#FFFFFF', container: '#FFD7F1', onContainer: '#2D1128' }
)
export const indigoDark = createTheme(true,
  { base: '#BAC3FF', on: '#152778', container: '#2F4090', onContainer: '#DFE0FF', darken: '#4858A9' },
  { base: '#C3C5DD', on: '#2D2F42', container: '#434559', onContainer: '#E0E1F9', darken: '#5B5D72' },
  { base: '#E6B8D8', on: '#44263E', container: '#5D3C55', onContainer: '#FFD7F1' }
)

export const violetLight = createTheme(false,
  { base: '#6C4EA0', on: '#FFFFFF', container: '#EADCF9', onContainer: '#260058', darken: '#543685' },
  { base: '#635B70', on: '#FFFFFF', container: '#E9DEF8', onContainer: '#1E182A', darken: '#4B4358' },
  { base: '#7E525D', on: '#FFFFFF', container: '#FFD9E2', onContainer: '#31101B' }
)
export const violetDark = createTheme(true,
  { base: '#D2BCFD', on: '#3D1C6F', container: '#543685', onContainer: '#EADCF9', darken: '#6C4EA0' },
  { base: '#CCC2DC', on: '#342D40', container: '#4B4358', onContainer: '#E9DEF8', darken: '#635B70' },
  { base: '#EFB8C7', on: '#492530', container: '#633B46', onContainer: '#FFD9E2' }
)

// ─── Pink & Modern Accents ────────────────────────────────────────────────
export const pinkLight = createTheme(false,
  { base: '#9B4269', on: '#FFFFFF', container: '#FFD8E8', onContainer: '#3D0022', darken: '#7C2850' },
  { base: '#765464', on: '#FFFFFF', container: '#FFD8E8', onContainer: '#2C1220', darken: '#5C3C4B' },
  { base: '#805343', on: '#FFFFFF', container: '#FFDBD0', onContainer: '#321207' }
)
export const pinkDark = createTheme(true,
  { base: '#FFAFD0', on: '#5E1139', container: '#7C2850', onContainer: '#FFD8E8', darken: '#9B4269' },
  { base: '#E5BDD0', on: '#432635', container: '#5C3C4B', onContainer: '#FFD8E8', darken: '#765464' },
  { base: '#F1B8A6', on: '#4B281C', container: '#663D30', onContainer: '#FFDBD0' }
)

export const tealLight = createTheme(false,
  { base: '#006970', on: '#FFFFFF', container: '#7CF4FF', onContainer: '#002022', darken: '#004F55' },
  { base: '#4A6364', on: '#FFFFFF', container: '#CCE8EA', onContainer: '#041F21', darken: '#324B4C' },
  { base: '#4D5F7C', on: '#FFFFFF', container: '#D4E3FF', onContainer: '#061C36' }
)
export const tealDark = createTheme(true,
  { base: '#4CD9E4', on: '#00363A', container: '#004F55', onContainer: '#7CF4FF', darken: '#006970' },
  { base: '#B0CCC4', on: '#1C3436', container: '#324B4C', onContainer: '#CCE8EA', darken: '#4A6364' },
  { base: '#B4C8EB', on: '#1F314B', container: '#364763', onContainer: '#D4E3FF' }
)

export const amberLight = createTheme(false,
  { base: '#885200', on: '#FFFFFF', container: '#FFDDB5', onContainer: '#2A1700', darken: '#663D00' },
  { base: '#705A41', on: '#FFFFFF', container: '#FBDDBD', onContainer: '#271805', darken: '#56432B' },
  { base: '#52643E', on: '#FFFFFF', container: '#D4EABB', onContainer: '#102003' }
)
export const amberDark = createTheme(true,
  { base: '#FFB86A', on: '#482A00', container: '#663D00', onContainer: '#FFDDB5', darken: '#885200' },
  { base: '#DEC2A2', on: '#3F2D17', container: '#56432B', onContainer: '#FBDDBD', darken: '#705A41' },
  { base: '#B8CEA1', on: '#253514', container: '#3B4C28', onContainer: '#D4EABB' }
)

export const mintLight = createTheme(false,
  { base: '#006C4C', on: '#FFFFFF', container: '#75F9C9', onContainer: '#002114', darken: '#005239' },
  { base: '#4D6358', on: '#FFFFFF', container: '#CFE9DB', onContainer: '#092017', darken: '#354B41' },
  { base: '#3E6374', on: '#FFFFFF', container: '#C2E8FD', onContainer: '#001F29' }
)
export const mintDark = createTheme(true,
  { base: '#55DCAE', on: '#003826', container: '#005239', onContainer: '#75F9C9', darken: '#006C4C' },
  { base: '#B3CCBF', on: '#1F342B', container: '#354B41', onContainer: '#CFE9DB', darken: '#4D6358' },
  { base: '#A6CBE0', on: '#0A3544', container: '#254B5C', onContainer: '#C2E8FD' }
)

export const coralLight = createTheme(false,
  { base: '#9E3B39', on: '#FFFFFF', container: '#FFDAD6', onContainer: '#410003', darken: '#7C2424' },
  { base: '#775653', on: '#FFFFFF', container: '#FFDAD6', onContainer: '#2C1513', darken: '#5D3F3C' },
  { base: '#715B2E', on: '#FFFFFF', container: '#FDE1A6', onContainer: '#261A00' }
)
export const coralDark = createTheme(true,
  { base: '#FFB4AC', on: '#601013', container: '#7C2424', onContainer: '#FFDAD6', darken: '#9E3B39' },
  { base: '#E7BDB9', on: '#442927', container: '#5D3F3C', onContainer: '#FFDAD6', darken: '#775653' },
  { base: '#E0C48C', on: '#3E2E04', container: '#574319', onContainer: '#FDE1A6' }
)

export const plumLight = createTheme(false,
  { base: '#85255F', on: '#FFFFFF', container: '#FFD8E9', onContainer: '#370025', darken: '#680447' },
  { base: '#715764', on: '#FFFFFF', container: '#FBD9E9', onContainer: '#291520', darken: '#583F4C' },
  { base: '#7E535C', on: '#FFFFFF', container: '#FFD9E1', onContainer: '#31101A' }
)
export const plumDark = createTheme(true,
  { base: '#FFAFD5', on: '#500036', container: '#680447', onContainer: '#FFD8E9', darken: '#85255F' },
  { base: '#DEBDCD', on: '#402935', container: '#583F4C', onContainer: '#FBD9E9', darken: '#715764' },
  { base: '#EEB8C5', on: '#4A252E', container: '#643C44', onContainer: '#FFD9E1' }
)

export const slateLight = createTheme(false,
  { base: '#485E71', on: '#FFFFFF', container: '#D0E4FF', onContainer: '#001D34', darken: '#2F4659' },
  { base: '#545F69', on: '#FFFFFF', container: '#D8E3EF', onContainer: '#111C24', darken: '#3C4751' },
  { base: '#685869', on: '#FFFFFF', container: '#EFDCF0', onContainer: '#221624' }
)
export const slateDark = createTheme(true,
  { base: '#AAC7E2', on: '#173042', container: '#2F4659', onContainer: '#D0E4FF', darken: '#485E71' },
  { base: '#BCC7D3', on: '#26313A', container: '#3C4751', onContainer: '#D8E3EF', darken: '#545F69' },
  { base: '#D3C0D4', on: '#382A3A', container: '#4F4151', onContainer: '#EFDCF0' }
)

// ─── Base Grey ────────────────────────────────────────────────────────────
export const greyLight = createTheme(false,
  { base: '#212121', on: '#FAFAFA', container: '#E0E0E0', onContainer: '#212121', darken: '#424242' },
  { base: '#616161', on: '#FAFAFA', container: '#EEEEEE', onContainer: '#212121', darken: '#424242' },
  { base: '#757575', on: '#FAFAFA', container: '#F5F5F5', onContainer: '#212121' }
)
export const greyDark = createTheme(true,
  { base: '#FAFAFA', on: '#212121', container: '#424242', onContainer: '#FAFAFA', darken: '#F5F5F5' },
  { base: '#BDBDBD', on: '#212121', container: '#616161', onContainer: '#FAFAFA', darken: '#9E9E9E' },
  { base: '#9E9E9E', on: '#212121', container: '#757575', onContainer: '#FAFAFA' }
)

const themes = {
  redLight, redDark,
  orangeLight, orangeDark,
  yellowLight, yellowDark,
  greenLight, greenDark,
  blueLight, blueDark,
  indigoLight, indigoDark,
  violetLight, violetDark,
  pinkLight, pinkDark,
  tealLight, tealDark,
  amberLight, amberDark,
  mintLight, mintDark,
  coralLight, coralDark,
  plumLight, plumDark,
  slateLight, slateDark,
  greyLight, greyDark
}

export default themes
