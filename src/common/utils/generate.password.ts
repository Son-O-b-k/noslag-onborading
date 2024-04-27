export function generateRandomPassword(length: number): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

export function generateEmployeeID(length: number): string {
  const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let employeeID = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    employeeID += charset[randomIndex];
  }

  // const formattedCompany = company.toLowerCase().trim().replace(/\s+/g, '');

  // return `${employeeID}@${formattedCompany}`;

  return `${employeeID}`;
}
