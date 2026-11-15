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
 "Apple": "#738296",
 "Android": "#299444",
 "Google": "#2674e9",
 "Microsoft": "#00a8ba",
 "Inteligencia artificial": "#7940df",
 "Tecnología": "#6472b6",
 "Lanzamientos": "#ff6d21",
 "Hardware": "#536071",
 "Desarrollo": "#a67a26",
 "Web y privacidad": "#8b3d76",
 "Seguridad": "#e0354a",
 "Ciencia": "#65a82e",
 "Videojuegos": "#bb31cf",
 "Empresas": "#875344",
 "Movilidad": "#138ccd",
 "Criptomonedas": "#e99a10",
 "Regulación": "#695d91",
 "Redes sociales": "#e34f9b",
 "Startups": "#bb5332",
 "Cloud": "#58b3e6",
 "Open source": "#098e6c",
 "Realidad virtual": "#5028a5",
 "Domótica": "#a4a928",
 "Audio y vídeo": "#ca356c",
 "Fotografía": "#ac7c94"
};

export function categoryColor(category:string):string {
 return Object.hasOwn(categoryColors,category)?categoryColors[category]:'var(--accent)';
}

