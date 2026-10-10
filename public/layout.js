const LAYOUT = [
  { zone: 'L', zoneName: '左区', rows: 7, cols: 3 },
  { zone: 'M', zoneName: '中区', rows: 7, cols: 4 },
  { zone: 'R', zoneName: '右区', rows: 6, cols: 3 },
];

function seatLabel(zoneName, row, col) {
  return `${zoneName} ${row}排${col}座`;
}
