interface FlatNavItem {
    id: number;
    title: string;
    type: string;
    position: number;
    status: number;
    path: string | null;
    parent_nav_id: number | null | string;
    section_id: number | null | string;
}

interface NavItem {
    id: number;
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

    // Build a title-to-id map for string parent_nav_id/section_id
    const titleToId = new Map<string, number>();
    flatNavItems.forEach(item => {
        titleToId.set(item.title, item.id);
    });

    // Normalize parent_nav_id and section_id to numbers or null
    const normalizedItems = flatNavItems.map(item => {
        let parent_nav_id = item.parent_nav_id;
        let section_id = item.section_id;
        if (typeof parent_nav_id === 'string') {
            parent_nav_id = titleToId.get(parent_nav_id) ?? null;
        }
        if (typeof section_id === 'string') {
            section_id = titleToId.get(section_id) ?? null;
        }
        return {
            ...item,
            parent_nav_id,
            section_id,
        };
    });

    const navMap: Map<number, NavItem> = new Map();
    normalizedItems.forEach(item => {
        navMap.set(item.id, {
            id: item.id,
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
        const navItem = navMap.get(item.id);
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