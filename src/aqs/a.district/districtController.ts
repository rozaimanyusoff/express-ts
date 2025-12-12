import { Request, Response } from 'express';

import * as organizationModel from '../a.organization/organizationModel';
import * as districtModel from './districtModel';

export const getAllDistrict = async (req: Request, res: Response): Promise<Response> => {
    try {
        const [ districts, organizations ] = await Promise.all([
            districtModel.findAllDistricts(),
            organizationModel.findAllOrganizations()
        ]);

        districts.map(district => {
            const organization = organizations.find(org => org.id === district.organizationId);
            if (organization) {
                (district as any).organizationName = organization.name;
            }

            return {
                code: district.code,
                id: district.id,
                isActive: district.isActive,
                name: district.name,
                organization: {
                    id: district.organizationId,
                    name: organization ? organization.name : 'N/A'
                }
            }
        });

        
        return res.status(200).json({
            data: districts,
            message: 'Districts fetched successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to fetch districts' });
    }
}

export const saveDistrict = async (req: Request, res: Response) => {
    const { code, name, organizationId } = req.body;

    try {
        const result = await districtModel.saveDistrict(organizationId, name, code);
        return res.status(200).json({
            data: result,
            message: 'A new district saved successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to save district: '});
    }
}

export const bulkCreateDistricts = async (req: Request, res: Response) => {
    const districts = req.body.districts; // Expecting an array of districts

    try {
        const results = [];
        for (const district of districts) {
            const { code, name, organizationId } = district;
            const result = await districtModel.saveDistrict(organizationId, name, code);
            results.push(result);
        }

        return res.status(200).json({
            data: results,
            message: 'Bulk districts created successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to bulk create districts: '});
    }
}

export const updateDistrict = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, name, organizationId } = req.body;

    try {
        const result = await districtModel.updateDistrict(id, organizationId, name, code);

        return res.status(200).json({
            data: result,
            message: 'District updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update district: '});
    }
}

export const toggleDistrict = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await districtModel.toggleDistrict(id, isActive);

        return res.status(200).json({
            data: result,
            message: 'Status district updated successfully',
            success: true
        });
    } catch (error) {
        return res.status(500).json({ error: (error as Error).message, message: 'Failed to update status district: '});
    }
}