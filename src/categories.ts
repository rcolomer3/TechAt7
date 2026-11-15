import catalog from './categories.json';

export type NewsCategory = {name: string; description: string};

export const categoryCatalog: readonly NewsCategory[] = catalog.categories;
export const newsCategories: readonly string[] = categoryCatalog.map(category => category.name);

/** A missing or invalid saved selection means "show every category". */
export function normalizeCategorySelection(value: unknown): string[] {
 if (!Array.isArray(value)) return [...newsCategories];
 return newsCategories.filter(category => value.includes(category));
}

const categoryColors: Readonly<Record<string,string>> = {
 "Apple": "#64748b",
 "Android": "#368350",
 "Google": "#3973be",
 "Microsoft": "#456594",
 "Inteligencia artificial": "#7858bd",
 "Tecnología": "#356e73",
 "Lanzamientos": "#ac552f",
 "Hardware": "#586b87",
 "Desarrollo": "#816138",
 "Web y privacidad": "#368181",
 "Seguridad": "#b14c58",
 "Ciencia": "#537e42",
 "Videojuegos": "#8a4d96",
 "Empresas": "#7d6360",
 "Movilidad": "#267a9a",
 "Criptomonedas": "#a76b29",
 "Regulación": "#765e8a",
 "Redes sociales": "#9f4f72",
 "Startups": "#b15d48",
 "Cloud": "#4486a4",
 "Open source": "#40816f",
 "Realidad virtual": "#625ab5",
 "Domótica": "#6f803b",
 "Audio y vídeo": "#9d528a",
 "Fotografía": "#997442"
};

export function categoryColor(category:string):string {
 return Object.hasOwn(categoryColors,category)?categoryColors[category]:'var(--accent)';
}

