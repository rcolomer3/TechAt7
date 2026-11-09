import catalog from './categories.json';

export type NewsCategory = {name: string; description: string};

export const categoryCatalog: readonly NewsCategory[] = catalog.categories;
export const newsCategories: readonly string[] = categoryCatalog.map(category => category.name);

/** A missing or invalid saved selection means "show every category". */
export function normalizeCategorySelection(value: unknown): string[] {
 if (!Array.isArray(value)) return [...newsCategories];
 return newsCategories.filter(category => value.includes(category));
}
