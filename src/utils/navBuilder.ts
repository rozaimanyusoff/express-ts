interface FlatNavItem {
    id: number;
    navId: string;
    title: string;
    type: string;
    position: number;
    status: number;
    icon?: string | null;
    path?: string | null;
    component?: string | null;
    layout?: string | null;
    is_protected: boolean;
    parent_nav_id: string | null;
    section_id: string | null;
}

interface NavItem extends Omit<FlatNavItem, 'parent_nav_id' | 'section_id' | 'is_protected'> {
    parentNavId: string | null;
    sectionId: string | null;
    isProtected: boolean;
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
            id: item.id,
            navId: item.navId,
            title: item.title,
            type: item.type,
            position: item.position,
            status: item.status,
            icon: item.icon || null,
            path: item.path || null,
            component: item.component || null,
            layout: item.layout || null,
            isProtected: item.is_protected,
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

    // Sort items by position recursively
    const sortByPosition = (items: NavItem[]): void => {
        items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        items.forEach(item => {
            if (item.children) {
                sortByPosition(item.children);
            }
        });
    };

    sortByPosition(rootItems);
    return rootItems;
};

export default buildNavigationTree;