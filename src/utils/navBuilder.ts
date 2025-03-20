interface FlatNavItem {
    id: number;
    navId: string;
    title: string;
    type: string;
    position: number;
    status: number;
    parent_nav_id: string | null;
    section_id: string | null;
    path?: string | null;
    component?: string | null;
    layout?: string | null;
    icon?: string | null;
    is_protected: boolean;
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
  
    const navMap: Map<number, NavItem> = new Map();
  
    flatNavItems.forEach(item => {
        navMap.set(item.id, {
            id: item.id,
            navId: item.navId,
            title: item.title,
            type: item.type,
            position: item.position,
            status: item.status,
            parentNavId: item.parent_nav_id,
            sectionId: item.section_id,
            path: item.path || null,
            component: item.component || null,
            layout: item.layout || null,
            icon: item.icon || null,
            isProtected: item.is_protected,
            children: null,
        });
    });
  
    const rootItems: NavItem[] = [];
  
    flatNavItems.forEach(item => {
        const navItem = navMap.get(item.id);
        if (!navItem) return;
  
        if (item.parent_nav_id === null) {
            rootItems.push(navItem);
        } else {
            const parentItem = Array.from(navMap.values()).find(parent => parent.navId === item.parent_nav_id);
            if (parentItem) {
                if (!parentItem.children) {
                    parentItem.children = [];
                }
                parentItem.children.push(navItem);
            }
        }
    });
  
    const sortByPosition = (items: NavItem[]): void => {
        items.sort((a, b) => a.position - b.position);
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