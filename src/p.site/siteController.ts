import { Request, Response } from 'express';

import { District } from './interface';
import * as siteModel from './siteModel';

export async function getSiteInfo(req: Request, res: Response) {
    try {
        const { offset = 10, pageSize = 10 } = req.query;

        const [siteInfo, districts] = await Promise.all([
            siteModel.fetchSiteInfo(Number(offset), Number(pageSize)),
            siteModel.fetchDistricts()
        ]);

        const enrichedSiteInfo = siteInfo.map(site => {
            return {
                ...site,
                district: site.district ? districts.find(d => d.id === Number(site.district)) ?? null : null
            };
        });

        return res.status(200).json({
            data: enrichedSiteInfo,
            message: 'Site information fetched successfully',
            pagination: {
                offset: Number(offset),
                pageSize: Number(pageSize),
                totalRecords: enrichedSiteInfo.length
            },
            success: true
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch site information' });
    }
}