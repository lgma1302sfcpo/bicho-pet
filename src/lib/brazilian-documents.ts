function digits(value: string) {
  return value.replace(/\D/g, "");
}

function repeated(value: string) {
  return /^(\d)\1+$/.test(value);
}

function modulusDigit(base: string, weights: number[]) {
  const total = base.split("").reduce((sum, value, index) => sum + Number(value) * weights[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCpf(value: string) {
  const document = digits(value);
  if (document.length !== 11 || repeated(document)) return false;
  const first = modulusDigit(document.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = modulusDigit(`${document.slice(0, 9)}${first}`, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return document.endsWith(`${first}${second}`);
}

export function isValidCnpj(value: string) {
  const document = digits(value);
  if (document.length !== 14 || repeated(document)) return false;
  const first = modulusDigit(document.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = modulusDigit(`${document.slice(0, 12)}${first}`, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return document.endsWith(`${first}${second}`);
}

export function isValidCpfOrCnpj(value: string) {
  const document = digits(value);
  return document.length === 11 ? isValidCpf(document) : document.length === 14 ? isValidCnpj(document) : false;
}

export function isValidSaoPauloStateRegistration(value: string) {
  const registration = digits(value);
  if (registration.length !== 12 || repeated(registration)) return false;
  const firstSum = registration.slice(0, 8).split("").reduce((sum, digit, index) => sum + Number(digit) * [1, 3, 4, 5, 6, 7, 8, 10][index], 0);
  const first = firstSum % 11 === 10 ? 0 : firstSum % 11;
  const secondSum = registration.slice(0, 11).split("").reduce((sum, digit, index) => sum + Number(digit) * [3, 2, 10, 9, 8, 7, 6, 5, 4, 3, 2][index], 0);
  const second = secondSum % 11 === 10 ? 0 : secondSum % 11;
  return Number(registration[8]) === first && Number(registration[11]) === second;
}
