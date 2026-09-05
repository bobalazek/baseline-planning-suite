import type { Employee } from '@repo/shared-common';

/**
 * Free-text search over the register (F3). Matches name or role, case- and accent-insensitively,
 * so that searching "okafor" finds "Adaeze Okafor" and searching "lead" finds every Tech Lead.
 */
export function searchEmployees(
  employees: readonly Employee[],
  query: string
): readonly Employee[] {
  const needle = normalise(query);

  if (needle.length === 0) {
    return employees;
  }

  return employees.filter(
    (employee) =>
      normalise(employee.name).includes(needle) || normalise(employee.role).includes(needle)
  );
}

export function sortEmployeesByName(employees: readonly Employee[]): readonly Employee[] {
  return [...employees].sort((a, b) => a.name.localeCompare(b.name));
}

function normalise(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
