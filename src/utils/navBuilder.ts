// This function builds a navigation tree from a flat array of navigation items.
// It expects parent_nav_id and section_id to be number|null (not string).
// If your data source always provides structured navigation, you may not need this builder.
// For best results, ensure your DB always returns the structure you want to serve.

// If you want to keep this utility for future use, you can leave it as is.
// Otherwise, you can remove this file and directly use structured navigation from your DB/model.

interface FlatNavItem {
    navId: number;
    title: string;
    type: string;
    position: number;
    status: number;
    path: string | null;
    parent_nav_id: number | null | string;
    section_id: number | null | string;
}

interface NavItem {
    navId: number;
    title: string;
    type: string;
    position: number;
    status: number;
    path: string | null;
    parent_nav_id: number | null;
    section_id: number | null;
    children: NavItem[] | null;
}

const buildNavigationTree = (flatNavItems: FlatNavItem[]): NavItem[] => {
    if (!Array.isArray(flatNavItems)) {
        throw new Error('Invalid flatNavItems format');
    }

    // Build a title-to-navId map for string parent_nav_id/section_id
    const titleToNavId = new Map<string, number>();
    flatNavItems.forEach(item => {
        titleToNavId.set(item.title, item.navId);
    });

    // Normalize parent_nav_id and section_id to numbers or null
    const normalizedItems = flatNavItems.map(item => {
        let parent_nav_id = item.parent_nav_id;
        let section_id = item.section_id;
        if (typeof parent_nav_id === 'string') {
            parent_nav_id = titleToNavId.get(parent_nav_id) ?? null;
        }
        if (typeof section_id === 'string') {
            section_id = titleToNavId.get(section_id) ?? null;
        }
        return {
            ...item,
            parent_nav_id,
            section_id,
        };
    });

    const navMap: Map<number, NavItem> = new Map();
    normalizedItems.forEach(item => {
        navMap.set(item.navId, {
            navId: item.navId,
            title: item.title,
            type: item.type,
            position: item.position,
            status: item.status,
            path: item.path,
            parent_nav_id: item.parent_nav_id,
            section_id: item.section_id,
            children: null,
        });
    });

    const rootItems: NavItem[] = [];
    normalizedItems.forEach(item => {
        const navItem = navMap.get(item.navId);
        if (!navItem) return;
        if (item.parent_nav_id === null || !navMap.has(item.parent_nav_id)) {
            rootItems.push(navItem);
        } else {
            const parentItem = navMap.get(item.parent_nav_id);
            if (parentItem) {
                if (!parentItem.children) {
                    parentItem.children = [];
                }
                parentItem.children.push(navItem);
            }
        }
    });

    // Set children to null if empty array
    const setNullChildren = (items: NavItem[]) => {
        items.forEach(item => {
            if (item.children && item.children.length === 0) {
                item.children = null;
            } else if (item.children) {
                setNullChildren(item.children);
            }
        });
    };
    setNullChildren(rootItems);

    return rootItems;
};

export default buildNavigationTree;