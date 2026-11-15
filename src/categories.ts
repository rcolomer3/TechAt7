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
 "Apple": "hsl(0 65% 49%)",
 "Android": "hsl(138 65% 49%)",
 "Google": "hsl(275 65% 49%)",
 "Microsoft": "hsl(53 65% 49%)",
 "Inteligencia artificial": "hsl(190 65% 49%)",
 "Tecnología": "hsl(328 65% 49%)",
 "Lanzamientos": "hsl(105 65% 49%)",
 "Hardware": "hsl(243 65% 49%)",
 "Desarrollo": "hsl(20 65% 49%)",
 "Web y privacidad": "hsl(158 65% 49%)",
 "Seguridad": "hsl(295 65% 49%)",
 "Ciencia": "hsl(73 65% 49%)",
 "Videojuegos": "hsl(210 65% 49%)",
 "Empresas": "hsl(348 65% 49%)",
 "Movilidad": "hsl(125 65% 49%)",
 "Criptomonedas": "hsl(263 65% 49%)",
 "Regulación": "hsl(40 65% 49%)",
 "Redes sociales": "hsl(178 65% 49%)",
 "Startups": "hsl(315 65% 49%)",
 "Cloud": "hsl(93 65% 49%)",
 "Open source": "hsl(230 65% 49%)",
 "Realidad virtual": "hsl(8 65% 49%)",
 "Domótica": "hsl(145 65% 49%)",
 "Audio y vídeo": "hsl(283 65% 49%)",
 "Fotografía": "hsl(60 65% 49%)"
};

export function categoryColor(category:string):string {
 return Object.hasOwn(categoryColors,category)?categoryColors[category]:'var(--accent)';
}

