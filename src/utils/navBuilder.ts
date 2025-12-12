// This function builds a navigation tree from a flat array of navigation items.
// It expects parent_nav_id and section_id to be number|null (not string).
// If your data source always provides structured navigation, you may not need this builder.
// For best results, ensure your DB always returns the structure you want to serve.

// If you want to keep this utility for future use, you can leave it as is.
// Otherwise, you can remove this file and directly use structured navigation from your DB/model.

interface FlatNavItem {
    navId: number;
    parent_nav_id: null | number | string;
    path: null | string;
    position: number;
    section_id: null | number | string;
    status: number;
    title: string;
    type: string;
}

interface NavItem {
    children: NavItem[] | null;
    navId: number;
    parent_nav_id: null | number;
    path: null | string;
    position: number;
    section_id: null | number;
    status: number;
    title: string;
    type: string;
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

    const navMap = new Map<number, NavItem>();
    normalizedItems.forEach(item => {
        navMap.set(item.navId, {
            children: null,
            navId: item.navId,
            parent_nav_id: item.parent_nav_id,
            path: item.path,
            position: item.position,
            section_id: item.section_id,
            status: item.status,
            title: item.title,
            type: item.type,
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