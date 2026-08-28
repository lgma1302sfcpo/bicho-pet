const employeeLoginDomain = "usuario.erp.invalid";

export function employeeLoginEmail(username: string) {
  return `${username.toLowerCase()}@${employeeLoginDomain}`;
}

export function loginNameFromEmail(email: string) {
  return email.endsWith(`@${employeeLoginDomain}`) ? email.slice(0, -(employeeLoginDomain.length + 1)) : email;
}
