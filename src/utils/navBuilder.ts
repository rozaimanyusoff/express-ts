interface FlatNavItem {
    navId: string;
    title: string;
    type: string;
    path?: string | null;
    parent_nav_id: string | null;
    section_id: string | null;
}

interface NavItem extends Omit<FlatNavItem, 'parent_nav_id' | 'section_id' | 'is_protected'> {
    parentNavId: string | null;
    sectionId: string | null;
    children: NavItem[] | null;
}

const buildNavigationTree = (flatNavItems: FlatNavItem[]): NavItem[] => {
    if (!Array.isArray(flatNavItems)) {
        throw new Error('Invalid flatNavItems format');
    }

    const navMap: Map<string, NavItem> = new Map();

    // Map flat items to NavItem objects
    flatNavItems.forEach(item => {
        navMap.set(item.navId, {
            navId: item.navId,
            title: item.title,
            type: item.type,
            path: item.path || null,
            parentNavId: item.parent_nav_id, // Keep raw parent_nav_id for now
            sectionId: item.section_id,
            children: null,
        });
    });

    const rootItems: NavItem[] = [];

    // Build the tree structure
    flatNavItems.forEach(item => {
        const navItem = navMap.get(item.navId);
        if (!navItem) return;

        if (item.parent_nav_id === null || !navMap.has(item.parent_nav_id)) {
            // Treat items with no valid parent as root-level items
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

    return rootItems;
};

export default buildNavigationTree;