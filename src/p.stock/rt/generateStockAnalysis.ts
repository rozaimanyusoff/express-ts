// Utility to generate analysis section from stock tracking data
// Usage: const analysis = generateStockAnalysis(data)

interface StockTracking {
  items: { item_code: string; item_name: string };
  status: string;
  issuance?: {
    issue_to?: { id: number; name: string };
  };
}

interface Analysis {
  stock: {
    total_items: number;
    total_issued: number;
    total_available: number;
    total_defective: number;
    total_installed: number;
    total_uninstalled: number;
  };
  teams: Array<{
    team_id: number;
    team_name: string;
    issued_count: number;
    available_count: number;
    defective_count: number;
    installed_count: number;
    uninstalled_count: number;
  }>;
  top_5_items: Array<{
    item_code: string;
    item_name: string;
    issued_count: number;
    available_count: number;
    defective_count: number;
    installed_count: number;
    uninstalled_count: number;
  }>;
}

export function generateStockAnalysis(data: StockTracking[]): Analysis {
  let total_items = data.length;
  let total_issued = 0, total_available = 0, total_defective = 0, total_installed = 0, total_uninstalled = 0;
  const teamMap = new Map<number, any>();
  const itemMap = new Map<string, any>();

  for (const entry of data) {
    switch (entry.status) {
      case "issued": total_issued++; break;
      case "available": total_available++; break;
      case "defective": total_defective++; break;
      case "installed": total_installed++; break;
      case "uninstalled": total_uninstalled++; break;
    }
    if (entry.issuance && entry.issuance.issue_to) {
      const { id, name } = entry.issuance.issue_to;
      if (!teamMap.has(id)) {
        teamMap.set(id, {
          team_id: id,
          team_name: name,
          issued_count: 0,
          available_count: 0,
          defective_count: 0,
          installed_count: 0,
          uninstalled_count: 0,
        });
      }
      const team = teamMap.get(id);
      switch (entry.status) {
        case "issued": team.issued_count++; break;
        case "available": team.available_count++; break;
        case "defective": team.defective_count++; break;
        case "installed": team.installed_count++; break;
        case "uninstalled": team.uninstalled_count++; break;
      }
    }
    const { item_code, item_name } = entry.items;
    if (!itemMap.has(item_code)) {
      itemMap.set(item_code, {
        item_code,
        item_name,
        issued_count: 0,
        available_count: 0,
        defective_count: 0,
        installed_count: 0,
        uninstalled_count: 0,
      });
    }
    const item = itemMap.get(item_code);
    switch (entry.status) {
      case "issued": item.issued_count++; break;
      case "available": item.available_count++; break;
      case "defective": item.defective_count++; break;
      case "installed": item.installed_count++; break;
      case "uninstalled": item.uninstalled_count++; break;
    }
  }
  const top_5_items = Array.from(itemMap.values())
    .sort((a, b) => b.issued_count - a.issued_count)
    .slice(0, 5);
  return {
    stock: {
      total_items,
      total_issued,
      total_available,
      total_defective,
      total_installed,
      total_uninstalled,
    },
    teams: Array.from(teamMap.values()),
    top_5_items,
  };
}
