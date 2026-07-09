type QueryValue = string | number | boolean | null | undefined;

type SearchParamsInput = Record<string, QueryValue>;

export function buildPathWithSearch(pathname: string, params: SearchParamsInput = {}, hash = ''): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    searchParams.set(key, String(value));
  });

  const search = searchParams.toString();
  const hashFragment = hash ? `#${hash.replace(/^#/, '')}` : '';

  return `${pathname}${search ? `?${search}` : ''}${hashFragment}`;
}