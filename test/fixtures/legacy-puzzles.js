export const legacyPuzzles = [
  {
    name: 'easy',
    code: '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    expectedSolutions: 1,
  },
  {
    name: 'medium',
    code: '200080300060070084030500209000105408000000000402706000301007040720040060004010003',
    expectedSolutions: 1,
  },
  {
    name: 'hard',
    code: '000000012000035000000600070700000300000400800100000000000120000080000040050000600',
    expectedSolutions: 1,
  },
  {
    name: 'very-hard',
    code: '000300000000040000000000506460000070000070000020004000300900200040000700000008000',
    expectedSolutions: 2,
  },
  {
    name: 'fiendish',
    code: '000075400000000008080190000300001060000000034000068170204000603900000020530200000',
    expectedSolutions: 1,
  },
  {
    name: 'diabolical',
    code: '300000000050320000000000700000200900100040002063000000000000010000000000000082640',
    expectedSolutions: 2,
  },
  {
    name: 'extreme',
    code: '100007090030020008009600500005300900010080002600004000300000010040000007007000300',
    expectedSolutions: 1,
  },
  {
    name: 'p178-x-treme-gls',
    code: '002705900010000080000000000005201300030000010007906200000000000060000030004609700',
    expectedSolutions: 1,
  },
  {
    name: 'p179-ultimate-gls',
    code: '070008000500200300008040060060000900200080004009000070030020500006009002000100080',
    expectedSolutions: 1,
  },
];

export function parseGridCode(code) {
  if (typeof code !== 'string' || code.length !== 81 || !/^[0-9]{81}$/.test(code)) {
    throw new TypeError('Sudoku grid code must be an 81-character string containing only digits.');
  }

  return Array.from({ length: 9 }, (_, row) =>
    code
      .slice(row * 9, row * 9 + 9)
      .split('')
      .map(Number),
  );
}
