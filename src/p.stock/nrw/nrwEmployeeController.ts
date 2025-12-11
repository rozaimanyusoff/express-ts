import { Request, Response } from 'express';
import * as nrwEmployeeModel from './nrwEmployeeModel';
import asyncHandler from '../../utils/asyncHandler';

// ---- EMPLOYEES ----
export const createEmployee = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createEmployee(data);
  res.status(201).json({
    status: 'success',
    message: 'Employee created',
    data: result
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
    const { level: levelId, department_id, costcenter_id, location_id, ...empWithoutIds } = emp;
    return {
      ...empWithoutIds,
      level: levelsById[levelId] || null,
      department: departmentsById[department_id] || null,
      costcenter: costcentersById[costcenter_id] || null,
      location: locationsById[location_id] || null
    };
  });

  res.json({
    status: 'success',
    message: 'Employees retrieved',
    data: enrichedEmployees
  });
};

export const getEmployeeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const employee = await nrwEmployeeModel.getEmployeeById(Number(id));

  if (employee) {
    const { level, department_id, costcenter_id, location_id } = employee as any;
    const [levelData, departmentData, costcenterData, locationData] = await Promise.all([
      level ? nrwEmployeeModel.getLevelById(level) : null,
      department_id ? nrwEmployeeModel.getDepartmentById(department_id) : null,
      costcenter_id ? nrwEmployeeModel.getCostcenterById(costcenter_id) : null,
      location_id ? nrwEmployeeModel.getLocationById(location_id) : null
    ]);

    const { level: levelId, department_id: deptId, costcenter_id: ccId, location_id: locId, ...empWithoutIds } = employee as any;
    const enrichedEmployee = {
      ...empWithoutIds,
      level: levelData ? { id: (levelData as any).id, name: (levelData as any).level_name } : null,
      department: departmentData ? { id: (departmentData as any).id, name: (departmentData as any).name } : null,
      costcenter: costcenterData ? { id: (costcenterData as any).id, name: (costcenterData as any).name } : null,
      location: locationData ? { id: (locationData as any).id, name: (locationData as any).name } : null
    };

    res.json({
      status: 'success',
      message: 'Employee retrieved',
      data: enrichedEmployee
    });
  } else {
    res.status(404).json({
      status: 'error',
      message: 'Employee not found',
      data: null
    });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateEmployee(Number(id), data);
  res.json({
    status: 'success',
    message: 'Employee updated',
    data: result
  });
};

export const deleteEmployee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteEmployee(Number(id));
  res.json({
    status: 'success',
    message: 'Employee deleted',
    data: result
  });
};

// ---- LEVELS ----
export const createLevel = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createLevel(data);
  res.status(201).json({
    status: 'success',
    message: 'Level created',
    data: result
  });
};

export const getLevels = async (req: Request, res: Response) => {
  const levels = await nrwEmployeeModel.getLevels();
  res.json({
    status: 'success',
    message: 'Levels retrieved',
    data: levels
  });
};

export const getLevelById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const level = await nrwEmployeeModel.getLevelById(Number(id));
  res.json({
    status: 'success',
    message: level ? 'Level retrieved' : 'Level not found',
    data: level || null
  });
};

export const updateLevel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateLevel(Number(id), data);
  res.json({
    status: 'success',
    message: 'Level updated',
    data: result
  });
};

export const deleteLevel = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteLevel(Number(id));
  res.json({
    status: 'success',
    message: 'Level deleted',
    data: result
  });
};

// ---- DEPARTMENTS ----
export const createDepartment = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createDepartment(data);
  res.status(201).json({
    status: 'success',
    message: 'Department created',
    data: result
  });
};

export const getDepartments = async (req: Request, res: Response) => {
  const departments = await nrwEmployeeModel.getDepartments();
  res.json({
    status: 'success',
    message: 'Departments retrieved',
    data: departments
  });
};

export const getDepartmentById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const department = await nrwEmployeeModel.getDepartmentById(Number(id));
  res.json({
    status: 'success',
    message: department ? 'Department retrieved' : 'Department not found',
    data: department || null
  });
};

export const updateDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateDepartment(Number(id), data);
  res.json({
    status: 'success',
    message: 'Department updated',
    data: result
  });
};

export const deleteDepartment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteDepartment(Number(id));
  res.json({
    status: 'success',
    message: 'Department deleted',
    data: result
  });
};

// ---- COSTCENTERS ----
export const createCostcenter = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createCostcenter(data);
  res.status(201).json({
    status: 'success',
    message: 'Costcenter created',
    data: result
  });
};

export const getCostcenters = async (req: Request, res: Response) => {
  const costcenters = await nrwEmployeeModel.getCostcenters();
  res.json({
    status: 'success',
    message: 'Costcenters retrieved',
    data: costcenters
  });
};

export const getCostcenterById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const costcenter = await nrwEmployeeModel.getCostcenterById(Number(id));
  res.json({
    status: 'success',
    message: costcenter ? 'Costcenter retrieved' : 'Costcenter not found',
    data: costcenter || null
  });
};

export const updateCostcenter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateCostcenter(Number(id), data);
  res.json({
    status: 'success',
    message: 'Costcenter updated',
    data: result
  });
};

export const deleteCostcenter = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteCostcenter(Number(id));
  res.json({
    status: 'success',
    message: 'Costcenter deleted',
    data: result
  });
};

// ---- LOCATIONS ----
export const createLocation = async (req: Request, res: Response) => {
  const data = req.body;
  const result = await nrwEmployeeModel.createLocation(data);
  res.status(201).json({
    status: 'success',
    message: 'Location created',
    data: result
  });
};

export const getLocations = async (req: Request, res: Response) => {
  const locations = await nrwEmployeeModel.getLocations();
  res.json({
    status: 'success',
    message: 'Locations retrieved',
    data: locations
  });
};

export const getLocationById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const location = await nrwEmployeeModel.getLocationById(Number(id));
  res.json({
    status: 'success',
    message: location ? 'Location retrieved' : 'Location not found',
    data: location || null
  });
};

export const updateLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const result = await nrwEmployeeModel.updateLocation(Number(id), data);
  res.json({
    status: 'success',
    message: 'Location updated',
    data: result
  });
};

export const deleteLocation = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await nrwEmployeeModel.deleteLocation(Number(id));
  res.json({
    status: 'success',
    message: 'Location deleted',
    data: result
  });
};
