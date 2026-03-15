export const CATEGORIES = [
    { name: 'Fashion',                color: '#FEF7C5' },
    { name: 'Beauty & Personal Care', color: '#ff6ba4' },
    { name: 'Health & Wellness',      color: '#3ad8ec' },
    { name: 'Food & Beverage',        color: '#F0816D' },
    { name: 'Mom & Kids',             color: '#F5D1EF' },
    { name: 'IT & Gadgets',           color: '#253A82' },
    { name: 'Home & Living',          color: '#ffc800' },
    { name: 'Toys & Collectibles',    color: '#BCD3F9' },
    { name: 'Pet',                    color: '#F5842B' },
    { name: 'Automotive',             color: '#234C58' },
    { name: 'Lifestyle',              color: '#3fc974' },
];

export const CATEGORY_COLOR_MAP = Object.fromEntries(
    CATEGORIES.map(c => [c.name, c.color])
);
