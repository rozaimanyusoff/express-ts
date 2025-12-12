import { Request, Response } from 'express';

import asyncHandler from '../../utils/asyncHandler';
import * as nrwEmployeeModel from './nrwEmployeeModel';

// ---- EMPLOYEES ----
export const createEmployee = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createEmployee(data);
  res.status(201).json({
    data: result,
    message: 'Employee created',
    status: 'success'
  });
};

export const getEmployees = async (req: Request, res: Response) => {
  const employees = await nrwEmployeeModel.getEmployees();
  
  // Get all unique level, department, costcenter, and location IDs
  const levelIds = [...new Set((employees as any[]).map((emp: any) => emp.level).filter(Boolean))];
  const departmentIds = [...new Set((employees as any[]).map((emp: any) => emp.department_id).filter(Boolean))];
  const costcenterIds = [...new Set((employees as any[]).map((emp: any) => emp.costcenter_id).filter(Boolean))];
  const locationIds = [...new Set((employees as any[]).map((emp: any) => emp.location_id).filter(Boolean))];

  // Fetch all related data
  const levels = levelIds.length > 0 ? await nrwEmployeeModel.getLevelsByIds(levelIds) : [];
  const departments = departmentIds.length > 0 ? await nrwEmployeeModel.getDepartmentsByIds(departmentIds) : [];
  const costcenters = costcenterIds.length > 0 ? await nrwEmployeeModel.getCostcentersByIds(costcenterIds) : [];
  const locations = locationIds.length > 0 ? await nrwEmployeeModel.getLocationsByIds(locationIds) : [];

  // Create lookup maps
  const levelsById = (levels as any[]).reduce((acc: any, level: any) => {
    acc[level.id] = { id: level.id, name: level.level_name };
    return acc;
  }, {});

  const departmentsById = (departments as any[]).reduce((acc: any, dept: any) => {
    acc[dept.id] = { id: dept.id, name: dept.name };
    return acc;
  }, {});

  const costcentersById = (costcenters as any[]).reduce((acc: any, cc: any) => {
    acc[cc.id] = { id: cc.id, name: cc.name };
    return acc;
  }, {});

  const locationsById = (locations as any[]).reduce((acc: any, loc: any) => {
    acc[loc.id] = { id: loc.id, name: loc.name };
    return acc;
  }, {});

  // Enrich employees with related data and remove *_id fields
  const enrichedEmployees = (employees as any[]).map((emp: any) => {
    const { costcenter_id, department_id, level: levelId, location_id, ...empWithoutIds } = emp;
    return {
      ...empWithoutIds,
      costcenter: costcentersById[costcenter_id] || null,
      department: departmentsById[department_id] || null,
      level: levelsById[levelId] || null,
      location: locationsById[location_id] || null
    };
  });

  res.json({
    data: enrichedEmployees,
    message: 'Employees retrieved',
    status: 'success'
  });
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const employee = await nrwEmployeeModel.getEmployeeById(Number(id));

  if (employee) {
    const { costcenter_id, department_id, level, location_id } = employee as any;
    const [levelData, departmentData, costcenterData, locationData] = await Promise.all([
      level ? nrwEmployeeModel.getLevelById(level) : null,
      department_id ? nrwEmployeeModel.getDepartmentById(department_id) : null,
      costcenter_id ? nrwEmployeeModel.getCostcenterById(costcenter_id) : null,
      location_id ? nrwEmployeeModel.getLocationById(location_id) : null
    ]);

    const { costcenter_id: ccId, department_id: deptId, level: levelId, location_id: locId, ...empWithoutIds } = employee as any;
    const enrichedEmployee = {
      ...empWithoutIds,
      costcenter: costcenterData ? { id: (costcenterData as any).id, name: (costcenterData as any).name } : null,
      department: departmentData ? { id: (departmentData as any).id, name: (departmentData as any).name } : null,
      level: levelData ? { id: (levelData as any).id, name: (levelData as any).level_name } : null,
      location: locationData ? { id: (locationData as any).id, name: (locationData as any).name } : null
    };

    res.json({
      data: enrichedEmployee,
      message: 'Employee retrieved',
      status: 'success'
    });
  } else {
    res.status(404).json({
      data: null,
      message: 'Employee not found',
      status: 'error'
    });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateEmployee(Number(id), data);
  res.json({
    data: result,
    message: 'Employee updated',
    status: 'success'
  });
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteEmployee(Number(id));
  res.json({
    data: result,
    message: 'Employee deleted',
    status: 'success'
  });
};

// ---- LEVELS ----
export const createLevel = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createLevel(data);
  res.status(201).json({
    data: result,
    message: 'Level created',
    status: 'success'
  });
};

export const getLevels = async (req: Request, res: Response) => {
  const levels = await nrwEmployeeModel.getLevels();
  res.json({
    data: levels,
    message: 'Levels retrieved',
    status: 'success'
  });
};

export const getLevelById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const level = await nrwEmployeeModel.getLevelById(Number(id));
  res.json({
    data: level || null,
    message: level ? 'Level retrieved' : 'Level not found',
    status: 'success'
  });
};

export const updateLevel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateLevel(Number(id), data);
  res.json({
    data: result,
    message: 'Level updated',
    status: 'success'
  });
};

export const deleteLevel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteLevel(Number(id));
  res.json({
    data: result,
    message: 'Level deleted',
    status: 'success'
  });
};

// ---- DEPARTMENTS ----
export const createDepartment = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createDepartment(data);
  res.status(201).json({
    data: result,
    message: 'Department created',
    status: 'success'
  });
};

export const getDepartments = async (req: Request, res: Response) => {
  const departments = await nrwEmployeeModel.getDepartments();
  res.json({
    data: departments,
    message: 'Departments retrieved',
    status: 'success'
  });
};

export const getDepartmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const department = await nrwEmployeeModel.getDepartmentById(Number(id));
  res.json({
    data: department || null,
    message: department ? 'Department retrieved' : 'Department not found',
    status: 'success'
  });
};

export const updateDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateDepartment(Number(id), data);
  res.json({
    data: result,
    message: 'Department updated',
    status: 'success'
  });
};

export const deleteDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteDepartment(Number(id));
  res.json({
    data: result,
    message: 'Department deleted',
    status: 'success'
  });
};

// ---- COSTCENTERS ----
export const createCostcenter = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createCostcenter(data);
  res.status(201).json({
    data: result,
    message: 'Costcenter created',
    status: 'success'
  });
};

export const getCostcenters = async (req: Request, res: Response) => {
  const costcenters = await nrwEmployeeModel.getCostcenters();
  res.json({
    data: costcenters,
    message: 'Costcenters retrieved',
    status: 'success'
  });
};

export const getCostcenterById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const costcenter = await nrwEmployeeModel.getCostcenterById(Number(id));
  res.json({
    data: costcenter || null,
    message: costcenter ? 'Costcenter retrieved' : 'Costcenter not found',
    status: 'success'
  });
};

export const updateCostcenter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateCostcenter(Number(id), data);
  res.json({
    data: result,
    message: 'Costcenter updated',
    status: 'success'
  });
};

export const deleteCostcenter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteCostcenter(Number(id));
  res.json({
    data: result,
    message: 'Costcenter deleted',
    status: 'success'
  });
};

// ---- LOCATIONS ----
export const createLocation = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createLocation(data);
  res.status(201).json({
    data: result,
    message: 'Location created',
    status: 'success'
  });
};

export const getLocations = async (req: Request, res: Response) => {
  const locations = await nrwEmployeeModel.getLocations();
  res.json({
    data: locations,
    message: 'Locations retrieved',
    status: 'success'
  });
};

export const getLocationById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const location = await nrwEmployeeModel.getLocationById(Number(id));
  res.json({
    data: location || null,
    message: location ? 'Location retrieved' : 'Location not found',
    status: 'success'
  });
};

export const updateLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateLocation(Number(id), data);
  res.json({
    data: result,
    message: 'Location updated',
    status: 'success'
  });
};

export const deleteLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteLocation(Number(id));
  res.json({
    data: result,
    message: 'Location deleted',
    status: 'success'
  });
};
