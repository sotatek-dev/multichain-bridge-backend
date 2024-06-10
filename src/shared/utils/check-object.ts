export function isNullOrUndefined<T>(obj: T | null | undefined): obj is null | undefined {
  return typeof obj === 'undefined' || obj === null;
}

export function assignDefined(target, ...sources) {
  for (const source of sources) {
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val !== undefined) {
        target[key] = val;
      }
    }
  }
  return target;
}

export const isLocationDulyFilled = (location: string, longitude: number, latitude: number) => {
  //allow all fields empty
  if (!location && !longitude && !latitude) return true;
  //or all fields must be filled
  if (location && longitude && latitude) return true;
  return false;
};

export const isPhoneNumberValid = (phoneNumber: string, dialCode: string) => {
  let isValid = true;
  const dialRegex = new RegExp(`^\\${dialCode}`);
  const numberOnlyRegex = /^[0-9]+$/;
  if (!dialRegex.test(phoneNumber)) {
    isValid = false;
  }
  const phoneWithoutDialCode = phoneNumber.replace(dialRegex, '');
  if (!numberOnlyRegex.test(phoneWithoutDialCode)) {
    isValid = false;
  }
  return isValid;
};
