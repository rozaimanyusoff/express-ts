// Utility to generate analysis section from stock tracking data
// Usage: const analysis = generateStockAnalysis(data)

interface Analysis {
  stock: {
    total_available: number;
    total_defective: number;
    total_installed: number;
    total_issued: number;
    total_items: number;
    total_uninstalled: number;
  };
  teams: {
    available_count: number;
    defective_count: number;
    installed_count: number;
    issued_count: number;
    team_id: number;
    team_name: string;
    uninstalled_count: number;
  }[];
  top_5_items: {
    available_count: number;
    defective_count: number;
    installed_count: number;
    issued_count: number;
    item_code: string;
    item_name: string;
    uninstalled_count: number;
  }[];
}

interface StockTracking {
  issuance?: {
    issue_to?: { id: number; name: string };
  };
  items: { item_code: string; item_name: string };
  status: string;
}

export function generateStockAnalysis(data: StockTracking[]): Analysis {
  const total_items = data.length;
  let total_available = 0, total_defective = 0, total_installed = 0, total_issued = 0, total_uninstalled = 0;
  const teamMap = new Map<number, any>();
  const itemMap = new Map<string, any>();

  for (const entry of data) {
    switch (entry.status) {
      case "available": total_available++; break;
      case "defective": total_defective++; break;
      case "installed": total_installed++; break;
      case "issued": total_issued++; break;
      case "uninstalled": total_uninstalled++; break;
    }
    if (entry.issuance?.issue_to) {
      const { id, name } = entry.issuance.issue_to;
      if (!teamMap.has(id)) {
        teamMap.set(id, {
          available_count: 0,
          defective_count: 0,
          installed_count: 0,
          issued_count: 0,
          team_id: id,
          team_name: name,
          uninstalled_count: 0,
        });
      }
      const team = teamMap.get(id);
      switch (entry.status) {
        case "available": team.available_count++; break;
        case "defective": team.defective_count++; break;
        case "installed": team.installed_count++; break;
        case "issued": team.issued_count++; break;
        case "uninstalled": team.uninstalled_count++; break;
      }
    }
    const { item_code, item_name } = entry.items;
    if (!itemMap.has(item_code)) {
      itemMap.set(item_code, {
        available_count: 0,
        defective_count: 0,
        installed_count: 0,
        issued_count: 0,
        item_code,
        item_name,
        uninstalled_count: 0,
      });
    }
    const item = itemMap.get(item_code);
    switch (entry.status) {
      case "available": item.available_count++; break;
      case "defective": item.defective_count++; break;
      case "installed": item.installed_count++; break;
      case "issued": item.issued_count++; break;
      case "uninstalled": item.uninstalled_count++; break;
    }
  }
  const top_5_items = Array.from(itemMap.values())
    .sort((a, b) => b.issued_count - a.issued_count)
    .slice(0, 5);
  return {
    stock: {
      total_available,
      total_defective,
      total_installed,
      total_issued,
      total_items,
      total_uninstalled,
    },
    teams: Array.from(teamMap.values()),
    top_5_items,
  };
}
