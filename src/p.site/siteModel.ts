import { pool3 } from "../utils/db";
import { SiteSummary, District } from "./interface";

export const fetchSiteInfo = async (offset: number, pageSize: number): Promise<SiteSummary[]> => {
  const [rows] = await pool3.query(`
    SELECT 
        a.id AS site_id,
        a.module,
        CASE
            WHEN a.module = 'apmc' THEN SUBSTRING_INDEX(a.site_code, '_', 2) ELSE a.site_code
        END AS site_code,
        CASE
            WHEN a.module = 'apmc' THEN SUBSTRING_INDEX(a.site_code, '_', -1)
            ELSE NULL
        END AS pma_code,
        a.site_name,

        CASE 
            WHEN MAX(CASE WHEN b.asset_db = 'latitude' THEN b.record END) IS NOT NULL 
                THEN MAX(CASE WHEN b.asset_db = 'latitude' THEN b.record END) 
            ELSE a.latitude 
        END AS latitude,

        CASE
            WHEN MAX(CASE WHEN b.asset_db = 'longtitude' THEN b.record END) IS NOT NULL 
                THEN MAX(CASE WHEN b.asset_db = 'longtitude' THEN b.record END) 
            ELSE a.longtitude 
        END AS longtitude,

        CASE
            WHEN MAX(CASE WHEN b.asset_db = 'district' THEN b.record END) IS NOT NULL 
                THEN MAX(CASE WHEN b.asset_db = 'district' THEN b.record END) 
            ELSE a.district 
        END AS district,

        a.d_brand AS logger,
        a.site_status

    FROM ranhill.asset_data a
    LEFT JOIN ranhill.audit_trail_data b 
        ON a.id = b.asset_id

    GROUP BY 
        a.id, a.module, a.site_code, a.site_name, 
        a.d_brand, a.site_status

    ORDER BY
        a.module,
        a.site_code ASC

    LIMIT ?, ?;
    `, [offset, pageSize]);
  return rows as SiteSummary[];
};

export const fetchDistricts = async (): Promise<District[]> => {
  const [rows] = await pool3.query(`
    SELECT id, districtname as name
    FROM ranhill.district;
    `);
  return rows as District[];
};