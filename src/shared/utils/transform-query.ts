export const transformQuery = (s: string) =>
  s
    ?.trim()
    ?.toLowerCase()
    ?.replace(/['%]/g, (value: string) => `\\${value}`);

export const optionalBooleanMapper = new Map([
  ['undefined', undefined],
  ['true', true],
  ['false', false],
]);
