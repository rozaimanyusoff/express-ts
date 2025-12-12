import { Request, Response } from 'express';
import * as districtModel from './districtModel';
import * as organizationModel from '../a.organization/organizationModel';

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
                id: district.id,
                organization: {
                    id: district.organizationId,
                    name: organization ? organization.name : 'N/A'
                },
                name: district.name,
                code: district.code,
                isActive: district.isActive
            }
        });

        
        return res.status(200).json({
            success: true,
            message: 'Districts fetched successfully',
            data: districts
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to fetch districts', error: (error as Error).message });
    }
}

export const saveDistrict = async (req: Request, res: Response) => {
    const { organizationId, name, code } = req.body;

    try {
        const result = await districtModel.saveDistrict(organizationId, name, code);
        return res.status(200).json({
            success: true,
            message: 'A new district saved successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to save district: ', error: (error as Error).message});
    }
}

export const bulkCreateDistricts = async (req: Request, res: Response) => {
    const districts = req.body.districts; // Expecting an array of districts

    try {
        const results = [];
        for (const district of districts) {
            const { organizationId, name, code } = district;
            const result = await districtModel.saveDistrict(organizationId, name, code);
            results.push(result);
        }

        return res.status(200).json({
            success: true,
            message: 'Bulk districts created successfully',
            data: results
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to bulk create districts: ', error: (error as Error).message});
    }
}

export const updateDistrict = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { organizationId, name, code } = req.body;

    try {
        const result = await districtModel.updateDistrict(id, organizationId, name, code);

        return res.status(200).json({
            success: true,
            message: 'District updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update district: ', error: (error as Error).message});
    }
}

export const toggleDistrict = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    try {
        const result = await districtModel.toggleDistrict(id, isActive);

        return res.status(200).json({
            success: true,
            message: 'Status district updated successfully',
            data: result
        });
    } catch (error) {
        return res.status(500).json({ message: 'Failed to update status district: ', error: (error as Error).message});
    }
}