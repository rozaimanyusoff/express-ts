import { NextFunction, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';

import { pool } from '../utils/db';
import * as assetModel from '../p.asset/assetModel';
import * as userModel from '../p.user/userModel';
import * as telcoModel from './telcoModel';
import { sendMail } from '../utils/mailer';

// Define the structure of the account data
interface AccountData {
    account_master: string;
    id: number;
    subs: {
        account_sub: string;
        sub_no: string;
        sub_no_id: number;
    }[];
}

// Define the structure of the contract data
interface ContractData {
    accounts: {
        account_id: number;
        account_master: string;
        subs: {
            account_sub: string;
            sub_no: string;
            sub_no_id: number;
        }[];
    }[];
    contract_end_date: string;
    contract_start_date: string;
    duration: number;
    id: number;
    plan: string;
    price: number;
    product_type: string;
    status: string;
    vendor_id: string;
}

// Define the structure of the sim card data
interface SimCardData {
    id: number;
    status: string;
    reason: string;
    register_date: string;
    sim_sn: string;
    sub_no: string;
    sub_no_id: number;
}

// Define the structure of the subscriber data
interface SubscriberData {
    account_sub: string;
    id: number;
    register_date: string;
    sims: SimCardData[];
    status: string;
    sub_no: string;
}

/* ===================== SIM CARDS ===================== */
/* list sim cards. ep: /sims */
export const getSimCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get status query parameter for filtering
        const statusFilter = req.query.status ? String(req.query.status).toLowerCase() : null;
        
        // Get all sim cards from telco_sims table
        const allSimCards = await telcoModel.getSimCards();
        // Get sim cards linked to subscribers for enrichment
        const simCardsWithSubs = await (telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : []);
        
        // Create a map of sim cards with subscriber info for quick lookup
        const simWithSubsMap = Object.fromEntries((Array.isArray(simCardsWithSubs) ? simCardsWithSubs : []).map((sim: any) => [sim.sim_id, sim]));
        
        // Get all subscribers to map sub_no_id to sub_no
        const subscribers = await telcoModel.getSubscribers();
        const subNoMap = Object.fromEntries((Array.isArray(subscribers) ? subscribers : []).map((sub: any) => [sub.id, sub.sub_no]));
        // Get account-subscriber mappings to include account info
        const accountSubs = await telcoModel.getAccountSubs();
        const accountSubMap = Object.fromEntries((Array.isArray(accountSubs) ? accountSubs : []).map((as: any) => [as.sub_no_id, { account_id: as.account_id, account_sub: as.account_sub }]));
        // Get all accounts for account details
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries((Array.isArray(accounts) ? accounts : []).map((acc: any) => [acc.id, acc]));
        
        // Filter by status if provided
        const filteredSimCards = statusFilter 
            ? (Array.isArray(allSimCards) ? allSimCards.filter((sim: any) => sim.status && sim.status.toLowerCase() === statusFilter) : [])
            : allSimCards;
        
        const formatted = Array.isArray(filteredSimCards)
            ? await Promise.all(filteredSimCards.map(async (sim: any) => {
                // Get enriched data from simWithSubsMap if available
                const enrichedSim = simWithSubsMap[sim.id] || {};
                const sub_no_id = enrichedSim.sub_no_id || null;
                const account_sub = enrichedSim.account_sub || null;
                
                const accountSubData = sub_no_id ? accountSubMap[sub_no_id] : null;
                const accountId = accountSubData ? accountSubData.account_id : null;
                const account = accountId ? accountMap[accountId] : null;
                
                // Get replacement SIM details if replacement_sim_id exists
                let replacementSim = null;
                if (sim.replacement_sim_id) {
                    const [replacementRows] = await pool.query<RowDataPacket[]>(
                        `SELECT id, sim_sn FROM billings.telco_sims WHERE id = ?`,
                        [sim.replacement_sim_id]
                    );
                    if (replacementRows && replacementRows.length > 0) {
                        replacementSim = replacementRows[0];
                    }
                }
                
                // Get sim card history for this subscriber
                const simHistory = sub_no_id ? await telcoModel.getSimCardHistoryBySubscriber(sub_no_id) : [];
                // Get user history for this sim
                const simUserHistory = await telcoModel.getSimUserHistoryBySimId(sim.id);
                // Get asset history for this sim
                const simAssetHistory = await telcoModel.getSimAssetHistoryBySimId(sim.id);
                
                return {
                    id: sim.id,
                    sim_sn: sim.sim_sn,
                    status: sim.status || null,
                    reason: sim.reason || null,
                    replacement_sim: sim.replacement_sim_id ? {
                        id: sim.replacement_sim_id,
                        sim_sn: replacementSim?.sim_sn || null
                    } : null,
                    activated_at: sim.activated_at || null,
                    deactivated_at: sim.deactivated_at || null,
                    subs: sub_no_id ? { 
                        id: sub_no_id, 
                        sub_no: subNoMap[sub_no_id] || null,
                        account_sub: account_sub || null
                    } : null,
                    account: account ? { id: account.id, account_master: account.account_master || null } : null,
                    sim_subs_history: Array.isArray(simHistory) ? simHistory.map((h: any) => {
                        let formattedDate = null;
                        if (h.effective_date) {
                            const dateObj = new Date(h.effective_date);
                            if (!isNaN(dateObj.getTime())) {
                                formattedDate = dateObj.toISOString().split('T')[0];
                            }
                        }
                        return {
                            effective_date: formattedDate,
                            sub_no: h.sub_no
                        };
                    }) : [],
                    sim_user_history: Array.isArray(simUserHistory) && simUserHistory.length > 0 ? simUserHistory.map((h: any) => {
                        let formattedDate = null;
                        if (h.effective_date) {
                            const dateObj = new Date(h.effective_date);
                            if (!isNaN(dateObj.getTime())) {
                                formattedDate = dateObj.toISOString().split('T')[0];
                            }
                        }
                        // If employee enrichment failed (3rd party assignment), just show ramco_id
                        if (!h.full_name && h.ramco_id) {
                            return {
                                effective_date: formattedDate,
                                user: h.ramco_id
                            };
                        }
                        return {
                            effective_date: formattedDate,
                            user: h.ramco_id ? {
                                ramco_id: h.ramco_id,
                                full_name: h.full_name || null
                            } : null,
                            department: h.dept_id ? {
                                id: h.dept_id,
                                name: h.dept_name || null
                            } : null,
                            costcenter: h.cc_id ? {
                                id: h.cc_id,
                                name: h.cc_name || null
                            } : null,
                            location: h.loc_id ? {
                                id: h.loc_id,
                                name: h.loc_name || null
                            } : null
                        };
                    }) : null,
                    sim_asset_history: Array.isArray(simAssetHistory) && simAssetHistory.length > 0 ? simAssetHistory.map((h: any) => {
                        let formattedDate = null;
                        if (h.effective_date) {
                            const dateObj = new Date(h.effective_date);
                            if (!isNaN(dateObj.getTime())) {
                                formattedDate = dateObj.toISOString().split('T')[0];
                            }
                        }
                        return {
                            effective_date: formattedDate,
                            asset: h.asset_id ? {
                                asset_id: h.asset_id,
                                register_number: h.register_number || null
                            } : null
                        };
                    }) : null
                };
            }))
            : [];
        res.status(200).json({ data: formatted, message: 'Fetched sim card data successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
};

export const getSimCardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const simId = Number(req.params.id);
        
        // Get single sim card with subscriber info
        const [simCardRows] = await pool.query<RowDataPacket[]>(`
            SELECT s.id as sim_id, s.sim_sn, s.status, s.reason, s.activated_at, s.deactivated_at, s.replacement_sim_id, scs.sub_no_id, ts.account_sub
            FROM billings.telco_sims s
            LEFT JOIN billings.telco_sims_subs scs ON s.id = scs.sim_id
            LEFT JOIN billings.telco_subs ts ON scs.sub_no_id = ts.id
            WHERE s.id = ?
        `, [simId]);
        
        if (!simCardRows || simCardRows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Sim card not found',
                data: null
            });
        }
        
        const sim = simCardRows[0] as any;
        
        // Get all subscribers to map sub_no_id to sub_no
        const subscribers = await telcoModel.getSubscribers();
        const subNoMap = Object.fromEntries((Array.isArray(subscribers) ? subscribers : []).map((sub: any) => [sub.id, sub.sub_no]));
        
        // Get account-subscriber mappings
        const accountSubs = await telcoModel.getAccountSubs();
        const accountSubMap = Object.fromEntries((Array.isArray(accountSubs) ? accountSubs : []).map((as: any) => [as.sub_no_id, { account_id: as.account_id, account_sub: as.account_sub }]));
        
        // Get all accounts
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries((Array.isArray(accounts) ? accounts : []).map((acc: any) => [acc.id, acc]));
        
        // Get sim card history for this subscriber
        const simHistory = sim.sub_no_id ? await telcoModel.getSimCardHistoryBySubscriber(sim.sub_no_id) : [];
        // Get user history for this sim
        const simUserHistory = await telcoModel.getSimUserHistoryBySimId(sim.sim_id);
        // Get asset history for this sim
        const simAssetHistory = await telcoModel.getSimAssetHistoryBySimId(sim.sim_id);
        
        const accountSubData = sim.sub_no_id ? accountSubMap[sim.sub_no_id] : null;
        const accountId = accountSubData ? accountSubData.account_id : null;
        const account = accountId ? accountMap[accountId] : null;
        
        // Get replacement SIM details if replacement_sim_id exists
        let replacementSim = null;
        if (sim.replacement_sim_id) {
            const [replacementRows] = await pool.query<RowDataPacket[]>(
                `SELECT id, sim_sn FROM billings.telco_sims WHERE id = ?`,
                [sim.replacement_sim_id]
            );
            if (replacementRows && replacementRows.length > 0) {
                replacementSim = replacementRows[0];
            }
        }
        
        const enrichedData = {
            id: sim.sim_id || sim.id,
            sim_sn: sim.sim_sn || sim.sim_no,
            status: sim.status || null,
            reason: sim.reason || null,
            replacement_sim: sim.replacement_sim_id ? {
                id: sim.replacement_sim_id,
                sim_sn: replacementSim?.sim_sn || null
            } : null,
            activated_at: sim.activated_at || null,
            deactivated_at: sim.deactivated_at || null,
            subs: sim.sub_no_id ? { 
                id: sim.sub_no_id, 
                sub_no: subNoMap[sim.sub_no_id] || null,
                account_sub: sim.account_sub || null
            } : null,
            account: account ? { id: account.id, account_master: account.account_master || null } : null,
            sim_subs_history: Array.isArray(simHistory) ? simHistory.map((h: any) => {
                let formattedDate = null;
                if (h.effective_date) {
                    const dateObj = new Date(h.effective_date);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toISOString().split('T')[0];
                    }
                }
                return {
                    effective_date: formattedDate,
                    sub_no: h.sub_no
                };
            }) : [],
            sim_user_history: Array.isArray(simUserHistory) && simUserHistory.length > 0 ? simUserHistory.map((h: any) => {
                let formattedDate = null;
                if (h.effective_date) {
                    const dateObj = new Date(h.effective_date);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toISOString().split('T')[0];
                    }
                }
                // If employee enrichment failed (3rd party assignment), just show ramco_id
                if (!h.full_name && h.ramco_id) {
                    return {
                        effective_date: formattedDate,
                        user: h.ramco_id
                    };
                }
                return {
                    effective_date: formattedDate,
                    user: h.ramco_id ? {
                        ramco_id: h.ramco_id,
                        full_name: h.full_name || null
                    } : null,
                    department: h.dept_id ? {
                        id: h.dept_id,
                        name: h.dept_name || null
                    } : null,
                    costcenter: h.cc_id ? {
                        id: h.cc_id,
                        name: h.cc_name || null
                    } : null,
                    location: h.loc_id ? {
                        id: h.loc_id,
                        name: h.loc_name || null
                    } : null
                };
            }) : null,
            sim_asset_history: Array.isArray(simAssetHistory) && simAssetHistory.length > 0 ? simAssetHistory.map((h: any) => {
                let formattedDate = null;
                if (h.effective_date) {
                    const dateObj = new Date(h.effective_date);
                    if (!isNaN(dateObj.getTime())) {
                        formattedDate = dateObj.toISOString().split('T')[0];
                    }
                }
                return {
                    effective_date: formattedDate,
                    asset: h.asset_id ? {
                        asset_id: h.asset_id,
                        register_number: h.register_number || null
                    } : null
                };
            }) : null
        };
        
        res.status(200).json({ data: enrichedData, message: 'Sim card retrieved successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Create sim cards. POST /sims */
export const createSimCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { sim_sn, status, reason, replacement_sim, sub_no_id, asset_id, effective_date } = req.body;
        
        // Validate required field
        if (!sim_sn) {
            return res.status(400).json({
                status: 'error',
                message: 'sim_sn is required',
                data: null
            });
        }
        
        const effDate = effective_date || new Date().toISOString().split('T')[0];
        
        // Create the new sim card in telco_sims table
        const simCardData = { 
            sim_sn, 
            status: 'active', // Always set new SIM as active
            reason: reason || 'new',
            replacement_sim_id: null, // Will be set after replacement_sim is deactivated
            activated_at: new Date()
        };
        const newSimCardId = await telcoModel.createSimCard(simCardData);
        
        // If replacement_sim is provided (replacing an old SIM)
        if (replacement_sim) {
            // 1. Deactivate the old SIM with status='deactivated', reason='broken', deactivated_at=effective_date
            await telcoModel.deactivateSimCard(replacement_sim, 'broken', effDate);
            
            // 2. Link the new SIM to the old SIM (set replacement_sim_id on old SIM)
            await telcoModel.linkReplacementSim(replacement_sim, newSimCardId);
        }
        
        // 3. Insert new record in telco_sims_subs: sim_id, sub_no_id, effective_date
        if (sub_no_id) {
            await telcoModel.createSimSubsMapping({
                sim_id: newSimCardId,
                sub_no_id,
                effective_date: effDate
            });
        }
        
        // 4. Insert new record in telco_subs_devices: sub_no_id, asset_id, effective_date
        if (sub_no_id && asset_id) {
            await telcoModel.createSubsDeviceMapping({
                sub_no_id,
                asset_id,
                effective_date: effDate
            });
        }
        
        res.status(201).json({ 
            id: newSimCardId, 
            message: 'Sim card created successfully',
            status: 'success'
        });
    } catch (error) {
        next(error);
    }
};

export const updateSimCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const simId = Number(req.params.id);
        const { sim_sn, sub_no_id, ramco_id, asset_id, effective_date } = req.body;
        
        // Validate required fields
        if (!simId) {
            return res.status(400).json({
                status: 'error',
                message: 'SIM ID is required',
                data: null
            });
        }
        
        // Update sim_sn in telco_sims if provided
        if (sim_sn) {
            await pool.query(`UPDATE billings.telco_sims SET sim_sn = ? WHERE id = ?`, [sim_sn, simId]);
        }
        
        // Create new history record in telco_sims_history
        await telcoModel.createSimHistory({
            sim_id: simId,
            sub_no_id: sub_no_id || null,
            ramco_id: ramco_id || null,
            asset_id: asset_id || null,
            effective_date: effective_date || new Date().toISOString().split('T')[0]
        });
        
        res.status(200).json({ 
            id: simId,
            message: 'Sim card updated with history record',
            status: 'success'
        });
    } catch (error) {
        next(error);
    }
};

/* ===================== SUBSCRIBERS ===================== */
/** Show subscriber with historical sims by ID. endpoints: /subs/:id/sims */
export const getSubscriberWithSimsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriberId = Number(req.params.id);
        if (isNaN(subscriberId)) {
            return res.status(400).json({ message: 'Invalid subscriber ID', status: 'error' });
        }
        const subscriber = await telcoModel.getSubscriberById(subscriberId);
        if (!subscriber) {
            return res.status(404).json({ data: null, message: 'Subscriber not found', status: 'error' });
        }
        // Use join method to get all historical sims for this subscriber
        const simCards = await (telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : []);
        const sims = Array.isArray(simCards)
            ? simCards.filter((sim: any) => sim.sub_no_id === subscriberId).map((sim: any) => ({
                id: sim.sim_id || sim.id,
                register_date: sim.register_date,
                sim_no: sim.sim_sn || sim.sim_no,
                status: sim.status,
            }))
            : [];
        const formattedData = {
            account_sub: subscriber.account_sub,
            id: subscriber.id,
            register_date: subscriber.register_date,
            sims,
            status: subscriber.status,
            sub_no: subscriber.sub_no,
        };
        res.status(200).json({ data: formattedData, message: 'Show subscriber with historical sims by ID', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/** Show sub by ID. ep: /subs/:id */
export const getSubscriberById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        
        // Fetch subscriber with full history
        const subWithHistory = await telcoModel.getSubscriberByIdWithHistory(id);
        if (!subWithHistory) {
            return res.status(404).json({ message: 'Subscriber not found', status: 'error' });
        }
        
        const subscriber = subWithHistory.subscriber;
        const history = subWithHistory.history;
        
        // Fetch all reference data in parallel
        const [accounts, simCards, employees, assets, brands, models, categories, costcenters, departments, districts] = await Promise.all([
            telcoModel.getAccounts(),
            telcoModel.getSimCards ? telcoModel.getSimCards() : [],
            assetModel.getEmployees ? assetModel.getEmployees() : [],
            assetModel.getAssets ? assetModel.getAssets() : [],
            assetModel.getBrands ? assetModel.getBrands() : [],
            assetModel.getModels ? assetModel.getModels() : [],
            assetModel.getCategories ? assetModel.getCategories() : [],
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
        ]);
        
        // Build lookup maps
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.id, a]));
        const simCardMap = Object.fromEntries((Array.isArray(simCards) ? simCards : []).map((s: any) => [s.id, s]));
        const employeeMap = Object.fromEntries((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
        const assetMap = Object.fromEntries((Array.isArray(assets) ? assets : []).map((a: any) => [a.id, a]));
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));
        const categoryMap = Object.fromEntries((Array.isArray(categories) ? categories : []).map((c: any) => [c.id, c]));
        const costcenterMap = Object.fromEntries((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [c.id, c]));
        const departmentMap = Object.fromEntries((Array.isArray(departments) ? departments : []).map((d: any) => [d.id, d]));
        const districtMap = Object.fromEntries((Array.isArray(districts) ? districts : []).map((d: any) => [d.id, d]));
        
        // Build enriched current data (latest from history)
        const latestAccount = history.account.length > 0 ? accountMap[history.account[0].account_id] : null;
        const latestSimId = history.sim.length > 0 ? history.sim[0].sim_id : null;
        const latestSim = latestSimId ? simCardMap[latestSimId] : null;
        const latestRamcoId = history.user.length > 0 ? history.user[0].ramco_id : null;
        const latestUser = latestRamcoId ? employeeMap[latestRamcoId] : null;
        const latestAssetId = history.asset.length > 0 ? history.asset[0].asset_id : null;
        const latestAsset = latestAssetId ? assetMap[latestAssetId] : null;
        
        // Format enriched asset data
        let assetData = null;
        if (latestAsset) {
            const brand = latestAsset.brand_id && brandMap[latestAsset.brand_id] ? { id: latestAsset.brand_id, name: brandMap[latestAsset.brand_id].name } : null;
            const model = latestAsset.model_id && modelMap[latestAsset.model_id] ? { id: latestAsset.model_id, name: modelMap[latestAsset.model_id].name } : null;
            const category = latestAsset.category_id && categoryMap[latestAsset.category_id] ? { id: latestAsset.category_id, name: categoryMap[latestAsset.category_id].name } : null;
            assetData = {
                brand,
                category,
                id: latestAsset.id,
                model,
                register_number: latestAsset.register_number
            };
        }
        
        // Format enriched user data
        let userData = null;
        if (latestUser) {
            userData = {
                full_name: latestUser.full_name || latestUser.fullname || latestUser.name,
                ramco_id: latestRamcoId,
                costcenter: latestUser.costcenter_id ? { id: latestUser.costcenter_id, name: costcenterMap[latestUser.costcenter_id]?.name || null } : null,
                department: latestUser.department_id ? { id: latestUser.department_id, name: departmentMap[latestUser.department_id]?.name || null } : null,
                location: latestUser.location_id ? { id: latestUser.location_id, name: districtMap[latestUser.location_id]?.name || null } : null,
            };
        }
        
        // Build account history with enriched data
        const accountHistoryEnriched = history.account.map((acc: any) => ({
            id: acc.id,
            account_id: acc.account_id,
            account: accountMap[acc.account_id] ? {
                id: accountMap[acc.account_id].id,
                account_master: accountMap[acc.account_id].account_master,
                provider: accountMap[acc.account_id].provider
            } : null,
            effective_date: acc.effective_date,
            created_at: acc.created_at,
            status: acc.status,
            updated_by: acc.updated_by
        }));
        
        // Build SIM history with enriched data
        const simHistoryEnriched = history.sim.map((sim: any) => {
            const simData = simCardMap[sim.sim_id];
            return {
                id: sim.id,
                sim_id: sim.sim_id,
                simcard: simData ? {
                    id: simData.id,
                    sim_sn: simData.sim_sn,
                    status: simData.status
                } : null,
                effective_date: sim.effective_date,
                created_at: sim.created_at
            };
        });
        
        // Build user history with enriched data
        const userHistoryEnriched = history.user.map((usr: any) => {
            const emp = employeeMap[usr.ramco_id];
            return {
                id: usr.id,
                ramco_id: usr.ramco_id,
                user: emp ? {
                    full_name: emp.full_name || emp.fullname || emp.name,
                    ramco_id: usr.ramco_id,
                    costcenter: emp.costcenter_id ? { id: emp.costcenter_id, name: costcenterMap[emp.costcenter_id]?.name || null } : null,
                    department: emp.department_id ? { id: emp.department_id, name: departmentMap[emp.department_id]?.name || null } : null,
                    location: emp.location_id ? { id: emp.location_id, name: districtMap[emp.location_id]?.name || null } : null,
                } : null,
                effective_date: usr.effective_date,
                created_at: usr.created_at,
                updated_by: usr.updated_by
            };
        });
        
        // Build asset history with enriched data
        const assetHistoryEnriched = history.asset.map((ast: any) => {
            const assetData = assetMap[ast.asset_id];
            let assetInfo = null;
            if (assetData) {
                const brand = assetData.brand_id && brandMap[assetData.brand_id] ? { id: assetData.brand_id, name: brandMap[assetData.brand_id].name } : null;
                const model = assetData.model_id && modelMap[assetData.model_id] ? { id: assetData.model_id, name: modelMap[assetData.model_id].name } : null;
                const category = assetData.category_id && categoryMap[assetData.category_id] ? { id: assetData.category_id, name: categoryMap[assetData.category_id].name } : null;
                assetInfo = {
                    brand,
                    category,
                    id: assetData.id,
                    model,
                    register_number: assetData.register_number
                };
            }
            return {
                id: ast.id,
                asset_id: ast.asset_id,
                asset: assetInfo,
                effective_date: ast.effective_date,
                created_at: ast.created_at
            };
        });
        
        // Build response
        const enriched = {
            id: subscriber.id,
            sub_no: subscriber.sub_no,
            account_sub: subscriber.account_sub,
            status: subscriber.status,
            register_date: subscriber.register_date,
            account: latestAccount ? { account_master: latestAccount.account_master, id: latestAccount.id, provider: latestAccount.provider } : null,
            asset: assetData,
            simcard: latestSim ? { id: latestSim.id, sim_sn: latestSim.sim_sn } : null,
            user: userData,
            history: {
                account: accountHistoryEnriched,
                sim: simHistoryEnriched,
                user: userHistoryEnriched,
                asset: assetHistoryEnriched
            }
        };
        
        res.status(200).json({ data: enriched, message: 'Show subscriber by id with history', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* list subscribers. ep: /subs */
export const getSubscribers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Fetch all required data in parallel
        const [subscribers, accounts, accountSubs, simCards, departments, costcenters, districts, employees, assets, userSubs, brands, models, categories] = await Promise.all([
            telcoModel.getSubscribers(),
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
            assetModel.getEmployees ? assetModel.getEmployees() : [],
            assetModel.getAssets ? assetModel.getAssets() : [],
            telcoModel.getUserSubs(),
            assetModel.getBrands ? assetModel.getBrands() : [],
            assetModel.getModels ? assetModel.getModels() : [],
            assetModel.getCategories ? assetModel.getCategories() : [],
        ]);

        // Build lookup maps for fast access
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.id, a]));
        const accountSubMap = Object.fromEntries(accountSubs.map((as: any) => [as.sub_no_id, as.account_id]));
        // simCards is now the join result, so map by sub_no_id (not subscriber_id)
        const simMap = Object.fromEntries(simCards.map((sim: any) => [sim.sub_no_id, sim]));
        const employeeMap = Object.fromEntries((Array.isArray(employees) ? employees : []).map((e: any) => [e.ramco_id, e]));
        const userSubMap = Object.fromEntries((Array.isArray(userSubs) ? userSubs : []).map((us: any) => [us.sub_no_id, us.ramco_id]));
        // Defensive: ensure departments/costcenters are arrays of objects
        const departmentArr = Array.isArray(departments) && !(departments as any).hasOwnProperty('affectedRows') ? departments : [];
        const costcenterArr = Array.isArray(costcenters) && !(costcenters as any).hasOwnProperty('affectedRows') ? costcenters : [];
        const districtArr = Array.isArray(districts) && !(districts as any).hasOwnProperty('affectedRows') ? districts : [];
        const departmentMap = Object.fromEntries((departmentArr).map((d: any) => [d.id, d]));
        const costcenterMap = Object.fromEntries((costcenterArr).map((c: any) => [c.id, c]));
        const districtMap = Object.fromEntries((districtArr).map((d: any) => [d.id, d]));
        const assetMap = Object.fromEntries((Array.isArray(assets) ? assets : []).map((a: any) => [a.id, a]));
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));
        const categoryMap = Object.fromEntries((Array.isArray(categories) ? categories : []).map((c: any) => [c.id, c]));

        // Format each subscriber
        const formatted = subscribers.map((sub: any) => {
            // Destructure to remove asset_id and category_id from the returned object
            const { asset_id, category_id, ...rest } = sub;
            // Find account
            const accountId = accountSubMap[sub.id];
            const account = accountId ? accountMap[accountId] : null;
            // Find sim card (joined)
            const sim = simMap[sub.id] || null;
            // Find department
            const department = sub.department_id ? departmentMap[sub.department_id] : null;
            // Find costcenter
            const costcenter = sub.costcenter_id ? costcenterMap[sub.costcenter_id] : null;
            // Find asset
            const asset = sub.asset_id ? assetMap[sub.asset_id] : null;
            let assetData = null;
            if (asset) {
                const brand = asset.brand_id && brandMap[asset.brand_id] ? { id: asset.brand_id, name: brandMap[asset.brand_id].name } : null;
                const model = asset.model_id && modelMap[asset.model_id] ? { id: asset.model_id, name: modelMap[asset.model_id].name } : null;
                const category = category_id && categoryMap[category_id] ? { id: categoryMap[category_id].id, name: categoryMap[category_id].name } : null;
                assetData = {
                    brand,
                    category,
                    id: asset.id,
                    model,
                    register_number: asset.register_number
                };
            }
            // Find user with enriched data
            const ramcoId = userSubMap[sub.id];
            let user = null;
            if (ramcoId && employeeMap[ramcoId]) {
                const emp = employeeMap[ramcoId];
                user = {
                    full_name: emp.full_name || emp.fullname || emp.name,
                    ramco_id: ramcoId,
                    costcenter: emp.costcenter_id ? { id: emp.costcenter_id, name: costcenterMap[emp.costcenter_id]?.name || null } : null,
                    department: emp.department_id ? { id: emp.department_id, name: departmentMap[emp.department_id]?.code || null } : null,
                    location: emp.location_id ? { id: emp.location_id, name: districtMap[emp.location_id]?.code || null } : null,
                };
            }
            return {
                id: sub.id,
                sub_no: sub.sub_no,
                account_sub: sub.account_sub,
                status: sub.status,
                register_date: sub.register_date,
                account: account ? { account_master: account.account_master, id: account.id, provider: account.provider } : null,
                asset: assetData,
                simcard: sim ? { id: sim.sim_id, sim_sn: sim.sim_sn } : null,
                user,
            };
        });

        res.status(200).json({ data: formatted, message: 'Show all subscribers', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* ----- list subscribers with full data. ep: /subs */
export const getSubscribersFullData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Fetch all raw data
        const [subscribers, accounts, accountSubs, contracts, vendors, simCards] = await Promise.all([
            telcoModel.getSubscribers(),
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getContracts(),
            telcoModel.getVendors(),
            telcoModel.getSimCards(),
        ]);

        // Map vendors by id
        const vendorMap: Record<number, any> = Object.fromEntries(vendors.map((v: any) => [v.id, v]));
        // Map contracts by account_id
        const contractMap: Record<number, any[]> = {};
        contracts.forEach((c: any) => {
            if (!contractMap[c.account_id]) contractMap[c.account_id] = [];
            contractMap[c.account_id].push(c);
        });
        // Map accounts by id
        const accountMap: Record<number, any> = Object.fromEntries(accounts.map((a: any) => [a.id, a]));
        // Map sim cards by sub_no_id
        const simMap: Record<number, any[]> = {};
        simCards.forEach((sim: any) => {
            if (!simMap[sim.sub_no_id]) simMap[sim.sub_no_id] = [];
            simMap[sim.sub_no_id].push(sim);
        });
        // Map accountSubs by sub_no_id
        const subToAccount: Record<number, number[]> = {};
        accountSubs.forEach((as: any) => {
            if (!subToAccount[as.sub_no_id]) subToAccount[as.sub_no_id] = [];
            subToAccount[as.sub_no_id].push(as.account_id);
        });

        // Assemble full data
        const result = subscribers.map((sub: any) => {
            const subAccounts = (subToAccount[sub.id] || []).map((accId: number) => {
                const acc = accountMap[accId];
                const accContracts = (contractMap[accId] || []).map((c: any) => ({
                    ...c,
                    vendor: vendorMap[c.vendor_id] || null,
                }));
                return {
                    ...acc
                };
            });
            return {
                ...sub,
                accounts: subAccounts,
                sims: simMap[sub.id] || [],
            };
        });

        if (!result.length) {
            return res.status(404).json({ data: [], message: 'No subscribers found', status: 'error' });
        }
        res.status(200).json({ data: result, message: 'Subscribers full data', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Create subs. POST /subs */
export const createSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriber = req.body;
        const id = await telcoModel.createSubscriber(subscriber);
        res.status(201).json({ id, message: 'Subscriber created' });
    } catch (error) {
        next(error);
    }
};

/* Update subs by ID. PUT /subs/:id */
export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const subscriber = req.body;
        const { updated_by } = subscriber;
        
        // Update subscriber in database
        await telcoModel.updateSubscriber(id, subscriber);
        
        // Send notification email to updated_by user if provided
        if (updated_by) {
            try {
                const updater = await userModel.getEmployeeByRamcoId(updated_by);
                if (updater && updater.email) {
                    const subscriberData = await telcoModel.getSubscriberById(id);
                    const emailSubject = `Subscriber Account Updated - ${subscriberData?.sub_no || `ID: ${id}`}`;
                    const emailBody = `
                        <h3>Subscriber Account Update Notification</h3>
                        <p>The following subscriber account has been updated:</p>
                        <ul>
                            <li><strong>Subscriber Number:</strong> ${subscriberData?.sub_no || 'N/A'}</li>
                            <li><strong>Account Sub:</strong> ${subscriberData?.account_sub || 'N/A'}</li>
                            <li><strong>Status:</strong> ${subscriberData?.status || 'N/A'}</li>
                            <li><strong>Register Date:</strong> ${subscriberData?.register_date || 'N/A'}</li>
                        </ul>
                        <p><strong>Updated by:</strong> ${updater.full_name || updated_by}</p>
                        <p>Please log in to the system to review the changes.</p>
                    `;
                    
                    await sendMail(updater.email, emailSubject, emailBody);
                } else {
                    console.warn(`Could not send notification email: User ${updated_by} not found or has no email`);
                }
            } catch (emailErr) {
                console.error('Error sending subscriber update notification email:', emailErr);
                // Don't fail the main request if email fails
            }
        }
        
        res.status(200).json({ message: 'Subscriber updated successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Delete subs by ID. DELETE /subs/:id */
export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        await telcoModel.deleteSubscriber(id);
        res.status(200).json({ message: 'Subscriber deleted' });
    } catch (error) {
        next(error);
    }
};

/** Move subscriber to another account. PATCH /subs/:id/move */
export const moveSubscriberToAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriberId = Number(req.params.id);
        const { account_id, old_account_id, updated_by } = req.body;
        if (isNaN(subscriberId) || !account_id) {
            return res.status(400).json({ message: 'Invalid subscriber or account ID', status: 'error' });
        }
        await telcoModel.moveSubscriberToAccount(subscriberId, account_id, old_account_id, updated_by);
        res.status(200).json({ message: 'Subscriber moved to new account', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* ===================== ACCOUNTS ===================== */
/* list accounts. ep: /accounts */
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accounts = await telcoModel.getAccounts();
        const accountSubs = await telcoModel.getAccountSubs();
        // Count total subscribers for each account
        const subsCountMap: Record<number, number> = {};
        for (const as of accountSubs) {
            if (!subsCountMap[as.account_id]) subsCountMap[as.account_id] = 0;
            subsCountMap[as.account_id]++;
        }
        const enriched = accounts.map((acc: any) => ({
            ...acc,
            total_subs: subsCountMap[acc.id] || 0
        }));
        res.status(200).json({ data: enriched, message: 'Show all accounts', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Create account. POST /accounts */
export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = req.body;
        const id = await telcoModel.createAccount(account);
        res.status(201).json({ id, message: 'Account created' });
    } catch (error) {
        next(error);
    }
};

/* show account and its subscribers by account id. ep: /accounts/:id/subs */
export const getAccountWithSubscribersById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountId = Number(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({ message: 'Invalid account ID', status: 'error' });
        }
        const [accounts, accountSubs, subscribers, assets, brands, models, costcenters, departments, districts, simCards] = await Promise.all([
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSubscribers(),
            assetModel.getAssets(),
            assetModel.getBrands(),
            assetModel.getModels(),
            assetModel.getCostcenters(),
            assetModel.getDepartments(),
            assetModel.getDistricts(),
            telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : [],
        ]);
        const account = accounts.find((acc: any) => acc.id === accountId);
        if (!account) {
            return res.status(404).json({ data: null, message: 'Account not found', status: 'error' });
        }
        const subIds: number[] = accountSubs.filter((as: any) => as.account_id === accountId).map((as: any) => as.sub_no_id);
        // Build sim card map by sub_no_id
        const simMap = Object.fromEntries(simCards.map((sim: any) => [sim.sub_no_id, sim]));
        // Build lookup maps for enrichment
        const costcenterMap = Object.fromEntries((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
        const departmentMap = Object.fromEntries((Array.isArray(departments) ? departments : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const districtMap = Object.fromEntries((Array.isArray(districts) ? districts : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const assetMap = Object.fromEntries((Array.isArray(assets) ? assets : []).map((a: any) => [a.id, a]));
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));
        // Build employee map for user enrichment
        const employeesArr = await (assetModel.getEmployees ? assetModel.getEmployees() : []);
        const employeeMap = Object.fromEntries((Array.isArray(employeesArr) ? employeesArr : []).map((e: any) => [e.ramco_id, e]));
        // Build userSubMap for mapping sub.id to ramco_id
        const userSubs = await telcoModel.getUserSubs();
        const userSubMap = Object.fromEntries((Array.isArray(userSubs) ? userSubs : []).map((us: any) => [us.sub_no_id, us.ramco_id]));
        const subs = subscribers.filter((sub: any) => subIds.includes(sub.id)).map((sub: any) => {
            const sim = simMap[sub.id];
            const assetObj = sub.asset_id && assetMap[sub.asset_id] ? assetMap[sub.asset_id] : null;
            // Destructure to remove *_id fields
            const { asset_id, costcenter_id, department_id, district_id, ...rest } = sub;
            let assetData = null;
            if (assetObj) {
                const brand = assetObj.brand_id && brandMap[assetObj.brand_id] ? { id: assetObj.brand_id, name: brandMap[assetObj.brand_id].name } : null;
                const model = assetObj.model_id && modelMap[assetObj.model_id] ? { id: assetObj.model_id, name: modelMap[assetObj.model_id].name } : null;
                assetData = {
                    brand,
                    id: assetObj.id,
                    model,
                    register_number: assetObj.register_number
                };
            }
            // Enrich user
            const ramcoId = userSubMap[sub.id];
            const user = ramcoId && employeeMap[ramcoId] ? { full_name: employeeMap[ramcoId].full_name, ramco_id: ramcoId } : null;
            let simObj = null;
            if (sim) {
                simObj = {
                    id: sim.sim_id || sim.id || null,
                    no: sim.sim_sn || sim.sim_no || null
                };
            }
            return {
                ...rest,
                asset: assetData,
                costcenter: costcenter_id ? costcenterMap[costcenter_id] || null : null,
                department: department_id ? departmentMap[department_id] || null : null,
                district: district_id ? districtMap[district_id] || null : null,
                sim: simObj,
                user
            };
        });
        const formattedData = {
            ...account,
            subs,
        };
        res.status(200).json({ data: formattedData, message: 'Show specific account with its subscribers', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* list all accounts with its subscribers: /accounts/subs */
export const getAccountsWithSubscribers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [accounts, accountSubs, subscribers, costcenters, departments, districts, assets, brands, models] = await Promise.all([
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSubscribers(),
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
            assetModel.getAssets ? assetModel.getAssets() : [],
            assetModel.getBrands ? assetModel.getBrands() : [],
            assetModel.getModels ? assetModel.getModels() : [],
        ]);

        // Build lookup maps for enrichment (id & name only)
        const costcenterMap = Object.fromEntries((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
        const departmentMap = Object.fromEntries((Array.isArray(departments) ? departments : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const districtMap = Object.fromEntries((Array.isArray(districts) ? districts : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const assetMap = Object.fromEntries((Array.isArray(assets) ? assets : []).map((a: any) => [a.id, a]));
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));

        const result = accounts.map((account: any) => {
            const subIds: number[] = accountSubs.filter((as: any) => as.account_id === account.id).map((as: any) => as.sub_no_id);
            const subs = subscribers.filter((sub: any) => subIds.includes(sub.id)).map((sub: any) => {
                // Destructure to remove costcenter_id, department_id, district_id, asset_id
                const { asset_id, costcenter_id, department_id, district_id, ...rest } = sub;
                // Find asset
                const assetObj = sub.asset_id && assetMap[sub.asset_id] ? assetMap[sub.asset_id] : null;
                let assetData = null;
                if (assetObj) {
                    const brand = assetObj.brand_id && brandMap[assetObj.brand_id] ? { id: assetObj.brand_id, name: brandMap[assetObj.brand_id].name } : null;
                    const model = assetObj.model_id && modelMap[assetObj.model_id] ? { id: assetObj.model_id, name: modelMap[assetObj.model_id].name } : null;
                    assetData = {
                        brand,
                        id: assetObj.id,
                        model,
                        register_number: assetObj.register_number
                    };
                }
                return {
                    ...rest,
                    asset: assetData,
                    costcenter: costcenter_id ? costcenterMap[costcenter_id] || null : null,
                    department: department_id ? departmentMap[department_id] || null : null,
                    district: district_id ? districtMap[district_id] || null : null,
                };
            });
            return {
                ...account,
                subs,
            };
        });
        if (!result.length) {
            return res.status(404).json({ data: [], message: 'Data not found', status: 'error' });
        }
        res.status(200).json({ data: result, message: 'Show all accounts with their subscribers', status: 'success' });
    } catch (error) {
        next(error);
    }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = Number(req.params.id);
    if (isNaN(accountId)) {
        return res.status(400).json({ message: 'Invalid account ID', status: 'error' });
    }
    try {
        const accountData = req.body;
        await telcoModel.updateAccount(accountId, accountData);
        res.status(200).json({ message: 'Account updated successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
}

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = Number(req.params.id);
    if (isNaN(accountId)) {
        return res.status(400).json({ message: 'Invalid account ID', status: 'error' });
    }
    try {
        await telcoModel.deleteAccount(accountId);
        res.status(200).json({ message: 'Account deleted successfully', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* ===================== CONTRACTS ===================== */
/* list contracts. ep: /contracts */
export const getContracts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contracts = await telcoModel.getContracts();
        res.status(200).json(contracts);
    } catch (error) {
        next(error);
    }
};

/* show contract by ID. ep: /contracts/:id */
export const getContractById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contractId = Number(req.params.id);

        if (isNaN(contractId)) {
            return res.status(400).json({ message: 'Invalid contract ID', status: 'error' });
        }

        const contract = await telcoModel.getContractById(contractId);

        if (!contract) {
            return res.status(404).json({ data: null, message: 'Contract not found', status: 'error' });
        }

        const formattedData = {
            account_id: contract.account_id,
            contract_end_date: contract.contract_end_date,
            contract_start_date: contract.contract_start_date,
            duration: contract.duration,
            id: contract.id,
            plan: contract.plan,
            price: contract.price,
            product_type: contract.product_type,
            status: contract.status,
            vendor: contract.name,
            vendor_id: contract.vendor_id,
        };

        res.status(200).json({ data: formattedData, message: 'Show contract by ID', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* show contract and its accounts details by contract id */
export const getContractWithAccountsAndSubsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contractId = Number(req.params.id);
        if (isNaN(contractId)) {
            return res.status(400).json({ message: 'Invalid contract ID', status: 'error' });
        }
        const [contract, accounts, accountSubs, subscribers, vendors] = await Promise.all([
            telcoModel.getContractById(contractId),
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSubscribers(),
            telcoModel.getVendors(),
        ]);
        if (!contract) {
            return res.status(404).json({ data: null, message: 'Contract not found', status: 'error' });
        }
        const vendor = vendors.find((v: any) => v.id === contract.vendor_id) || null;
        const account = accounts.find((a: any) => a.id === contract.account_id);
        let subs: any[] = [];
        if (account) {
            const subIds: number[] = accountSubs.filter((as: any) => as.account_id === account.id).map((as: any) => as.sub_no_id);
            subs = subscribers.filter((sub: any) => subIds.includes(sub.id));
        }
        const formattedData = {
            ...contract,
            accounts: account ? [{ ...account, subs }] : [],
            vendor,
        };
        res.status(200).json({ data: formattedData, message: 'Show contract with accounts and subscribers by ID', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Create contract. POST /contracts */
export const createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = req.body;
        const id = await telcoModel.createContract(contract);
        res.status(201).json({ id, message: 'Contract created' });
    } catch (error) {
        next(error);
    }
};

/* ===================== VENDORS ===================== */
/* list vendors. ep: /vendors */
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendors = await telcoModel.getVendors();
        res.status(200).json({ data: vendors, message: 'Vendors data retrieved succesfully', status: 'Success' });
    } catch (error) {
        next(error);
    }
};

/* Show vendor by ID. ep: /vendors/:id */
export const getVendorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendorId = Number(req.params.id);

        if (isNaN(vendorId)) {
            return res.status(400).json({ message: 'Invalid vendor ID', status: 'error' });
        }

        const vendor = await telcoModel.getVendorById(vendorId);

        if (!vendor) {
            return res.status(404).json({ data: null, message: 'Vendor not found', status: 'error' });
        }

        const formattedData = {
            address: vendor.address,
            contact_email: vendor.contact_email,
            contact_name: vendor.contact_name,
            contact_no: vendor.contact_no,
            id: vendor.id,
            name: vendor.name,
            register_date: vendor.register_date,
            service_type: vendor.service_type,
            status: vendor.status,
        };

        res.status(200).json({ data: formattedData, message: 'Show vendor by ID', status: 'success' });
    } catch (error) {
        next(error);
    }
};

/* Create vendor. POST /vendors */
export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendor = req.body;
        const id = await telcoModel.createVendor(vendor);
        res.status(201).json({ id, message: 'Vendor created' });
    } catch (error) {
        next(error);
    }
};

/* Update vendor by ID. PUT /vendors/:id */
export const updateVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendorId = Number(req.params.id); // Ensure vendorId is a number
        const vendor = req.body;
        await telcoModel.updateVendor(vendorId, vendor);
        res.status(200).json({ message: 'Vendor updated' });
    } catch (error) {
        next(error);
    }
};

/* Delete vendor by ID. DELETE /vendors/:id */
export const deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendorId = Number(req.params.id); // Ensure vendorId is a number
        await telcoModel.deleteVendor(vendorId);
        res.status(200).json({ message: 'Vendor deleted' });
    } catch (error) {
        next(error);
    }
};

/* ===================== ACCOUNT SUBS ===================== */
/* list account & subs assignment. ep: /account-subs */
export const getAccountSubs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountSubs = await telcoModel.getAccountSubs();
        res.status(200).json(accountSubs);
    } catch (error) {
        next(error);
    }
};

/* assign subs to accounts. POST /account-subs */
export const createAccountSub = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountSub = req.body;
        const id = await telcoModel.createAccountSub(accountSub);
        res.status(201).json({ id, message: 'Account subscription created' });
    } catch (error) {
        next(error);
    }
};

/* ===================== TELCO BILLING ===================== */

// GET telco billings by multiple IDs
export const getTelcoBillingsByIds = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let ids: number[] = [];
        if (Array.isArray(req.body.ids)) {
            ids = req.body.ids.map((v: any) => Number(v)).filter((id: number) => !isNaN(id));
        } else if (typeof req.body.ids === 'string') {
            ids = req.body.ids.split(',').map((v: string) => Number(v)).filter((id: number) => !isNaN(id));
        }
        if (!ids.length) {
            return res.status(400).json({ message: 'No valid IDs provided', status: 'error' });
        }
        const [billings, accounts, costcentersArr, subscribers] = await Promise.all([
            telcoModel.getTelcoBillingsByIds(ids),
            telcoModel.getAccounts(),
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            telcoModel.getSubscribers()
        ]);
        // Map account_no to account object (reverse mapping)
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.account_master, a]));
        // Map costcenter_id to costcenter object
        const costcenterMap = Object.fromEntries((Array.isArray(costcentersArr) ? costcentersArr : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
        // Map subscribers by account_no/master (assuming subscriber.account_sub or similar matches b.account)
        // Try to map by account_sub (or adjust as needed to match b.account)
        const subscriberMap = Object.fromEntries(subscribers.map((s: any) => [s.account_sub, s]));
        // Format each billing
        const formatted = await Promise.all(billings.map(async (b: any) => {
            let accountObj = null;
            if (b.account && accountMap[b.account]) {
                const acc = accountMap[b.account];
                accountObj = {
                    account_no: acc.account_master,
                    id: acc.id,
                    provider: acc.provider || null
                };
            }
            // Build summary for this billing: aggregate amounts by costcenter
            let summary: { cc_amount: number; cc_sub_amount: number; costcenter: { id: null | number, name: string }, tax: number }[] = [];
            try {
                const details = await telcoModel.getTelcoBillingDetailsById(b.id);
                if (Array.isArray(details)) {
                    const summaryMap = new Map();
                    let totalAmount = 0;
                    for (const d of details) {
                        const cc = d.costcenter_id ? (costcenterMap[d.costcenter_id] || { id: d.costcenter_id, name: '' }) : { id: null, name: '' };
                        const key = JSON.stringify(cc);
                        const amt = parseFloat(d.amount) || 0;
                        totalAmount += amt;
                        if (!summaryMap.has(key)) {
                            summaryMap.set(key, { cc_sub_amount: 0, costcenter: cc });
                        }
                        summaryMap.get(key).cc_sub_amount += amt;
                    }
                    // Calculate tax breakdown by costcenter
                    const totalTax = parseFloat(b.tax) || 0;
                    summary = Array.from(summaryMap.values()).map((item: any) => {
                        const proportion = totalAmount > 0 ? item.cc_sub_amount / totalAmount : 0;
                        const ccTax = proportion * totalTax;
                        const tax = parseFloat(ccTax.toFixed(2));
                        return {
                            costcenter: item.costcenter,
                            cc_sub_amount: item.cc_sub_amount,
                            tax,
                            cc_amount: parseFloat((item.cc_sub_amount + tax).toFixed(2)),
                        };
                    });
                }
            } catch (err) {
                // ignore error, leave summary as empty array
            }
            return {
                id: b.id,
                account: accountObj,
                bill_no: b.bill_no,
                bill_date: b.bill_date,
                bfcy_id: b.id ?? b.bfcy_id,
                reference: b.reference || null,
                status: b.status,
                subtotal: b.subtotal,
                tax: b.tax || 0,
                discount: b.discount || 0,
                rounding: b.rounding || 0,
                grand_total: b.grand_total,
                summary
            };
        }));
        // Build bill_summary: aggregate grand_total, tax, and summary by costcenter across all billings
        let billSummaryGrandTotal = 0;
        let billSummaryTax = 0;
        const billSummaryCostcenterMap = new Map();
        for (const f of formatted) {
            billSummaryGrandTotal += parseFloat(f.grand_total) || 0;
            billSummaryTax += parseFloat(f.tax) || 0;
            for (const s of f.summary) {
                const key = JSON.stringify(s.costcenter);
                if (!billSummaryCostcenterMap.has(key)) {
                    billSummaryCostcenterMap.set(key, { cc_sub_amount: 0, cc_amount: 0, costcenter: s.costcenter, tax: 0 });
                }
                const existing = billSummaryCostcenterMap.get(key);
                existing.cc_sub_amount += s.cc_sub_amount || 0;
                existing.cc_amount += s.cc_amount || 0;
                existing.tax += s.tax || 0;
            }
        }
        const billSummarySummary = Array.from(billSummaryCostcenterMap.values()).map((item: any) => ({
            costcenter: item.costcenter,
            cc_sub_amount: parseFloat(item.cc_sub_amount.toFixed(2)),
            tax: parseFloat(item.tax.toFixed(2)),
            cc_amount: parseFloat(item.cc_amount.toFixed(2)),
        }));
        const billSummary = {
            grand_total_across_bills: parseFloat(billSummaryGrandTotal.toFixed(2)),
            cc_summary_across_bills: billSummarySummary,
            total_tax_across_bills: parseFloat(billSummaryTax.toFixed(2))
        };
        res.status(200).json({
            bill_summary: billSummary,
            data: formatted,
            message: `Telco billings retrieved (${formatted.length} entries)`,
            status: 'success'
        });
    } catch (error) {
        next(error);
    }
};

// GET all telco billings
export const getTelcoBillings = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const [billings, accounts] = await Promise.all([
            telcoModel.getTelcoBillings(),
            telcoModel.getAccounts()
        ]);
        // Map account_no to account object (reverse mapping)
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.account_master, a]));
        // Format each billing
        const formatted = billings.map((b: any) => {
            let accountObj = null;
            // Try to map using b.account_no to accounts.account_master
            if (b.account && accountMap[b.account]) {
                const acc = accountMap[b.account];
                accountObj = {
                    account_no: acc.account_master,
                    id: acc.id,
                    provider: acc.provider || null,
                };
            }
            return {
                account: accountObj,
                bfcy_id: b.id ?? b.bfcy_id,
                bill_date: b.bill_date,
                bill_no: b.bill_no,
                discount: b.discount || 0,
                grand_total: b.grand_total,
                id: b.id,
                reference: b.reference || null,
                rounding: b.rounding || 0,
                status: b.status,
                subtotal: b.subtotal,
                tax: b.tax || 0
            };
        });
        res.status(200).json({ data: formatted, message: 'Telco billing retrieved', status: 'success' });
    } catch (error) {
        next(error);
    }
};

// GET telco billing by ID
export const getTelcoBillingById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const billing = await telcoModel.getTelcoBillingById(id);
        if (!billing) {
            return res.status(404).json({ message: 'Telco billing not found', status: 'error' });
        }
        // Fetch accounts for mapping
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.account_master, a]));
        let accountObj = null;
        if (billing.account && accountMap[billing.account]) {
            const acc = accountMap[billing.account];
            accountObj = {
                account_no: acc.account_master,
                id: acc.id,
                old_id: acc.old_bill_id, // Keep old_id for backward compatibility
                provider: acc.provider || null
            };
        }
        // Fetch billing details by util_id
        let details = await telcoModel.getTelcoBillingDetailsById(billing.id);
        // Enrich each detail with sim_id and sim_subno
        if (Array.isArray(details)) {
            // Fetch all subscribers for mapping sub_no to id
            const subscribers = await telcoModel.getSubscribers();
            // Fetch costcenters and districts for lookup
            const costcentersArr = await (assetModel.getCostcenters ? assetModel.getCostcenters() : []);
            const districtsArr = await (assetModel.getDistricts ? assetModel.getDistricts() : []);
            const costcenterMap = Object.fromEntries((Array.isArray(costcentersArr) ? costcentersArr : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
            const districtMap = Object.fromEntries((Array.isArray(districtsArr) ? districtsArr : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
            // Fetch employees for user enrichment
            const employeesArr = await (assetModel.getEmployees ? assetModel.getEmployees() : []);
            const employeeMap = Object.fromEntries((Array.isArray(employeesArr) ? employeesArr : []).map((e: any) => [e.ramco_id, e]));
            details = await Promise.all(details.map(async (d: any) => {
                let subsObj = null;
                // Map subscriber by sub_id
                if (d.sub_id) {
                    const subscriber = Array.isArray(subscribers)
                        ? subscribers.find((sub: any) => sub.id === d.sub_id)
                        : null;
                    if (subscriber) {
                        subsObj = { id: subscriber.id, sub_no: subscriber.sub_no };
                    }
                }
                // Resolve costcenter and district
                const costcenter = d.costcenter_id ? costcenterMap[d.costcenter_id] || null : null;
                const district = d.loc_id ? districtMap[d.loc_id] || null : null;
                // Enrich user from sim_user_id
                let user = null;
                if (d.ramco_id && employeeMap[d.ramco_id]) {
                    const emp = employeeMap[d.ramco_id];
                    user = { full_name: emp.full_name, ramco_id: emp.ramco_id };
                }
                // Remove cc_id, loc_id, util_id, sub_id, sim_user_id, costcenter_id, cc_no, cc_user from details
                const { cc_id, loc_id, ramco_id, costcenter_id, cc_no, cc_user, util_id, sub_id, sim_user_id, ...rest } = d;
                return {
                    ...rest,
                    costcenter,
                    old_sim_id: d.sim_id || null,
                    subs: subsObj,
                    user
                };
            }));
        }
        // Build summary: sum util2_amt by costcenter object from details
        let summary: { cc_amount: number; costcenter: { id: null | number, name: string }, }[] = [];
        if (Array.isArray(details)) {
            // Use a Map to group by costcenter stringified
            const summaryMap = new Map();
            for (const d of details) {
                const cc = d.costcenter || { id: null, name: '' };
                const key = JSON.stringify(cc);
                const amt = parseFloat(d.amount) || 0;
                if (!summaryMap.has(key)) {
                    summaryMap.set(key, { cc_amount: 0, costcenter: cc });
                }
                summaryMap.get(key).cc_amount += amt;
            }
            summary = Array.from(summaryMap.values());
        }
        const formatted = {
            account: accountObj,
            bfcy_id: billing.id ?? billing.bfcy_id,
            bill_date: billing.bill_date,
            bill_no: billing.bill_no,
            details: Array.isArray(details) ? details : [],
            grand_total: billing.grand_total,
            id: billing.id,
            reference: billing.reference || null,
            rounding: billing.rounding,
            status: billing.status,
            subtotal: billing.subtotal,
            summary,
            tax: billing.tax
        };
        res.status(200).json({ data: formatted, message: 'Telco billing retrieved', status: 'success' });
    } catch (error) {
        next(error);
    }
};

// GET /api/telco/bills/account/:id
export const getTelcoBillingByAccountId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountId = Number(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({ message: 'Invalid account ID', status: 'error' });
        }
        const { from, to } = req.query;
        let fromDate: Date | null = null;
        let toDate: Date | null = null;
        if (from && typeof from === 'string') {
            fromDate = new Date(from);
        }
        if (to && typeof to === 'string') {
            toDate = new Date(to);
        }
        // Always use the RAW result from telcoModel.getTelcoBillings(), not the formatted controller output
        const bills = await telcoModel.getTelcoBillings();
        // Fetch all accounts for mapping
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.id, a]));
        // Filter bills by account and date range
        const filteredBills = bills.filter((b: any) => {
            const billAccountId = b.account_id !== undefined ? b.account_id : (b.account && b.account.id !== undefined ? b.account.id : undefined);
            if (billAccountId !== accountId) return false;
            if (fromDate || toDate) {
                const billDate = b.bill_date ? new Date(b.bill_date) : null;
                if (!billDate) return false;
                if (fromDate && billDate < fromDate) return false;
                if (toDate && billDate > toDate) return false;
            }
            return true;
        });

        // Fetch all costcenters once for mapping
        const costcentersArr = await (assetModel.getCostcenters ? assetModel.getCostcenters() : []);
        const costcenterMap = Object.fromEntries((Array.isArray(costcentersArr) ? costcentersArr : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));

        // For each bill, fetch details and aggregate by costcenter_id, resolving to {id, name}
        const matchedBills = await Promise.all(filteredBills.map(async (b: any) => {
            let provider = null;
            if (b.account?.provider) {
                provider = b.account.provider;
            } else if (b.provider) {
                provider = b.provider;
            }
            // Fetch details for this bill
            let details: { amount: any; costcenter: { id: any, name: null | string }, }[] = [];
            try {
                const billDetails = await telcoModel.getTelcoBillingDetailsById(b.id);
                if (Array.isArray(billDetails)) {
                    // Aggregate by costcenter_id
                    const aggMap = new Map();
                    for (const d of billDetails) {
                        const ccid = d.costcenter_id;
                        const amt = parseFloat(d.amount) || 0;
                        if (!aggMap.has(ccid)) {
                            aggMap.set(ccid, 0);
                        }
                        aggMap.set(ccid, aggMap.get(ccid) + amt);
                    }
                    details = Array.from(aggMap.entries()).map(([costcenter_id, amount]) => ({
                        amount: amount.toFixed(2),
                        costcenter: costcenter_id ? (costcenterMap[costcenter_id] || { id: costcenter_id, name: null }) : { id: null, name: null }
                    }));
                }
            } catch (err) {
                // If error, leave details empty
            }
            return {
                account: b.account?.account_no ? b.account.account_no : (b.account_no || null),
                account_id: b.account_id !== undefined ? b.account_id : (b.account && b.account.id !== undefined ? b.account.id : null),
                bill_date: b.bill_date,
                details,
                id: b.id,
                provider
            };
        }));

        // Prepare account info (from getAccounts mapping)
        let accountInfo = null;
        if (matchedBills.length > 0) {
            const b = matchedBills[0];
            const accObj = accountMap[b.account_id];
            accountInfo = accObj ? {
                account_no: accObj.account_master,
                description: accObj.description || null,
                id: accObj.id,
                provider: accObj.provider || null
            } : {
                account_no: b.account,
                description: null,
                id: b.account_id,
                name: null,
                provider: b.provider || null
            };
        }

        // Group bills by year and month, aggregate costcenters and total_amount
        const yearMonthMap: Record<number, Record<number, { costcenters: any[]; name: string, total_amount: string, }>> = {};
        for (const bill of matchedBills) {
            const date = bill.bill_date ? new Date(bill.bill_date) : null;
            if (!date || isNaN(date.getTime())) continue;
            const year = date.getFullYear();
            const monthNum = date.getMonth(); // 0-based
            // Format month as Jan'25, Feb'25, etc.
            const monthShort = date.toLocaleString('default', { month: 'short' });
            const yearShort = String(year).slice(-2);
            const monthName = `${monthShort}'${yearShort}`;
            if (!yearMonthMap[year]) yearMonthMap[year] = {};
            if (!yearMonthMap[year][monthNum]) yearMonthMap[year][monthNum] = { costcenters: [], name: monthName, total_amount: '0.00' };

            // Aggregate costcenters for this bill into month
            for (const detail of bill.details) {
                // Find if costcenter already exists in month
                const idx = yearMonthMap[year][monthNum].costcenters.findIndex((cc: any) => cc.id === detail.costcenter.id);
                if (idx === -1 && detail.costcenter.id != null) {
                    yearMonthMap[year][monthNum].costcenters.push({
                        amount: detail.amount,
                        id: detail.costcenter.id,
                        name: detail.costcenter.name
                    });
                } else if (idx !== -1) {
                    // Sum amounts for same costcenter
                    const prev = yearMonthMap[year][monthNum].costcenters[idx];
                    prev.amount = (parseFloat(prev.amount) + parseFloat(detail.amount)).toFixed(2);
                }
            }
            // Add bill's total to month total_amount
            const billTotal = bill.details.reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0);
            yearMonthMap[year][monthNum].total_amount = (parseFloat(yearMonthMap[year][monthNum].total_amount) + billTotal).toFixed(2);
        }

        // Build final data array
        const data = Object.entries(yearMonthMap).map(([year, months]) => ({
            month: Object.values(months),
            year: Number(year)
        }));

        // Build response
        res.status(200).json({
            account: accountInfo,
            data,
            from_date: fromDate ? fromDate.toISOString() : null,
            message: 'Telco costcenter summary retrieved successfully',
            status: 'success',
            to_date: toDate ? toDate.toISOString() : null
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/telco/bills/report/costcenter?cc=23,26&from={}&to={}&provider=celcom,tm&account=1,2,3
export const getTelcoBillingByCostcenterId = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Parse cost center IDs from query parameter
        const { cc, from, to, provider, account } = req.query;
        
        if (!cc) {
            return res.status(400).json({ message: 'Cost center IDs (cc) parameter is required', status: 'error' });
        }
        
        let costcenterIds: number[] = [];
        if (Array.isArray(cc)) {
            costcenterIds = cc.map((v: any) => Number(v)).filter((id: number) => !isNaN(id));
        } else if (typeof cc === 'string') {
            costcenterIds = cc.split(',').map((v: string) => Number(v.trim())).filter((id: number) => !isNaN(id));
        }
        
        if (!costcenterIds.length) {
            return res.status(400).json({ message: 'No valid cost center IDs provided', status: 'error' });
        }
        
        // Parse provider filter from query parameter
        let providerFilter: string[] = [];
        if (provider) {
            if (Array.isArray(provider)) {
                providerFilter = provider.map((v: any) => String(v).toLowerCase());
            } else if (typeof provider === 'string') {
                providerFilter = provider.split(',').map((v: string) => v.trim().toLowerCase());
            }
        }
        
        // Parse account filter from query parameter
        let accountFilter: number[] = [];
        if (account) {
            if (Array.isArray(account)) {
                accountFilter = account.map((v: any) => Number(v)).filter((id: number) => !isNaN(id));
            } else if (typeof account === 'string') {
                accountFilter = account.split(',').map((v: string) => Number(v.trim())).filter((id: number) => !isNaN(id));
            }
        }
        
        let fromDate: Date | null = null;
        let toDate: Date | null = null;
        if (from && typeof from === 'string') {
            fromDate = new Date(from);
        }
        if (to && typeof to === 'string') {
            toDate = new Date(to);
        }
        // Fetch all bills and accounts
        const bills = await telcoModel.getTelcoBillings();
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.id, a]));
        // Fetch all costcenters for mapping
        const costcentersArr = await (assetModel.getCostcenters ? assetModel.getCostcenters() : []);
        const costcenterMap = Object.fromEntries((Array.isArray(costcentersArr) ? costcentersArr : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));

        // Filter bills by date range if provided
        const filteredBills = bills.filter((b: any) => {
            if (fromDate || toDate) {
                const billDate = b.bill_date ? new Date(b.bill_date) : null;
                if (!billDate) return false;
                if (fromDate && billDate < fromDate) return false;
                if (toDate && billDate > toDate) return false;
            }
            return true;
        });

        // Fetch all billing details in parallel for better performance
        const allBillDetailsResults = await Promise.all(
            filteredBills.map(async (b: any) => {
                try {
                    const billDetails = await telcoModel.getTelcoBillingDetailsById(b.id);
                    return { billId: b.id, bill: b, details: Array.isArray(billDetails) ? billDetails : [] };
                } catch (err) {
                    return { billId: b.id, bill: b, details: [] };
                }
            })
        );

        // Process the results and filter by costcenter_ids and provider
        const matchedBills = [];
        for (const result of allBillDetailsResults) {
            const { bill, details } = result;
            // Filter details matching any of the provided cost center IDs
            const ccDetails = details.filter((d: any) => costcenterIds.includes(d.costcenter_id));
            if (ccDetails.length > 0) {
                // Aggregate by account_id and costcenter_id
                const aggMap = new Map();
                for (const d of ccDetails) {
                    const accid = bill.account_id;
                    const ccid = d.costcenter_id;
                    const key = `${accid}|${ccid}`;
                    const amt = parseFloat(d.amount) || 0;
                    if (!aggMap.has(key)) {
                        aggMap.set(key, { account_id: accid, costcenter_id: ccid, amount: 0 });
                    }
                    aggMap.get(key).amount += amt;
                }
                const detailsAgg = Array.from(aggMap.values()).map((agg: any) => ({
                    account: agg.account_id ? (accountMap[agg.account_id] ? {
                        account_no: accountMap[agg.account_id].account_master,
                        description: accountMap[agg.account_id].description || null,
                        id: accountMap[agg.account_id].id,
                        provider: accountMap[agg.account_id].provider || null
                    } : { account_no: null, description: null, id: agg.account_id, provider: null }) : null,
                    costcenter: agg.costcenter_id ? (costcenterMap[agg.costcenter_id] || { id: agg.costcenter_id, name: null }) : { id: null, name: null },
                    amount: agg.amount.toFixed(2)
                })).filter((detail: any) => {
                    // Filter by provider if specified
                    if (providerFilter.length > 0) {
                        const accountProvider = detail.account?.provider ? String(detail.account.provider).toLowerCase() : '';
                        if (!providerFilter.includes(accountProvider)) return false;
                    }
                    // Filter by account if specified
                    if (accountFilter.length > 0) {
                        const accountId = detail.account?.id;
                        if (!accountFilter.includes(accountId)) return false;
                    }
                    return true;
                });
                
                if (detailsAgg.length > 0) {
                    matchedBills.push({
                        bill_date: bill.bill_date,
                        details: detailsAgg,
                        id: bill.id
                    });
                }
            }
        }

        // Group bills by costcenter, then year/month, aggregate accounts and total_amount
        const costcenterGroupMap: Record<number, Record<number, Record<number, { accounts: any[]; name: string, total_amount: string, }>>> = {};
        
        for (const bill of matchedBills) {
            const date = bill.bill_date ? new Date(bill.bill_date) : null;
            if (!date || isNaN(date.getTime())) continue;
            const year = date.getFullYear();
            const monthNum = date.getMonth(); // 0-based
            // Format month as Jan'25, Feb'25, etc.
            const monthShort = date.toLocaleString('default', { month: 'short' });
            const yearShort = String(year).slice(-2);
            const monthName = `${monthShort}'${yearShort}`;

            // Aggregate accounts for this bill into month per costcenter
            for (const detail of bill.details) {
                const ccid = detail.costcenter?.id;
                if (!ccid) continue;
                
                if (!costcenterGroupMap[ccid]) costcenterGroupMap[ccid] = {};
                if (!costcenterGroupMap[ccid][year]) costcenterGroupMap[ccid][year] = {};
                if (!costcenterGroupMap[ccid][year][monthNum]) {
                    costcenterGroupMap[ccid][year][monthNum] = { accounts: [], name: monthName, total_amount: '0.00' };
                }

                // Find if account already exists in month for this costcenter
                const idx = costcenterGroupMap[ccid][year][monthNum].accounts.findIndex(
                    (acc: any) => acc.id === (detail.account ? detail.account.id : null)
                );
                if (idx === -1 && detail.account?.id != null) {
                    costcenterGroupMap[ccid][year][monthNum].accounts.push({
                        account_no: detail.account.account_no,
                        account_id: detail.account.id,
                        amount: detail.amount,
                        description: detail.account.description,
                        id: detail.account.id,
                        provider: detail.account.provider
                    });
                } else if (idx !== -1) {
                    // Sum amounts for same account
                    const prev = costcenterGroupMap[ccid][year][monthNum].accounts[idx];
                    prev.amount = (parseFloat(prev.amount) + parseFloat(detail.amount)).toFixed(2);
                }

                // Add to month total
                const amt = parseFloat(detail.amount) || 0;
                costcenterGroupMap[ccid][year][monthNum].total_amount = 
                    (parseFloat(costcenterGroupMap[ccid][year][monthNum].total_amount) + amt).toFixed(2);
            }
        }

        // Prepare costcenters info for multiple cost centers
        const costcentersInfo = costcenterIds.map((ccid: number) => 
            costcenterMap[ccid] ? { id: ccid, name: costcenterMap[ccid].name } : { id: ccid, name: null }
        );

        // Build response array with each costcenter having its own data
        const responseArray = costcentersInfo.map((ccInfo: any) => {
            const ccid = ccInfo.id;
            const yearMonthData = costcenterGroupMap[ccid] || {};
            const data = Object.entries(yearMonthData).map(([year, months]) => ({
                month: Object.values(months),
                year: Number(year)
            }));

            return {
                costcenter: ccInfo,
                data,
                from_date: fromDate ? fromDate.toISOString() : null,
                to_date: toDate ? toDate.toISOString() : null
            };
        });

        // Build response
        res.status(200).json({
            data: responseArray,
            message: `Telco account summary by cost centers (${costcenterIds.join(', ')}) retrieved successfully`,
            status: 'success'
        });
    } catch (error) {
        next(error);
    }
};

// CREATE telco billing
export const createTelcoBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billing = req.body;

        // Validate required fields
        if (!billing.account_id) {
            return res.status(400).json({
                message: 'account_id is required',
                status: 'error'
            });
        }
        if (!billing.bill_no) {
            return res.status(400).json({
                message: 'bill_no is required',
                status: 'error'
            });
        }
        if (!billing.bill_date) {
            return res.status(400).json({
                message: 'bill_date is required',
                status: 'error'
            });
        }

        // Check if billing already exists
        const existingBillings = await telcoModel.getTelcoBillings();
        const duplicate = existingBillings.find((b: any) =>
            b.bill_no === billing.bill_no &&
            b.account_id === billing.account_id &&
            b.bill_date === billing.bill_date
        );

        if (duplicate) {
            return res.status(409).json({
                data: { existing_id: duplicate.id },
                message: 'Billing record already exists for this account, bill number, and date',
                status: 'error'
            });
        }

        // Insert parent billing
        const insertId = await telcoModel.createTelcoBilling(billing);

        // Insert child details if present
        if (Array.isArray(billing.details) && billing.details.length > 0) {
            // Attach bill_id to each detail
            const detailsWithBillId = billing.details.map((detail: any) => ({
                ...detail,
                bill_id: insertId
            }));
            // Insert each detail
            for (const detail of detailsWithBillId) {
                await telcoModel.createTelcoBillingDetail(detail);
            }
        }

        res.status(201).json({
            data: { id: insertId },
            message: 'Telco billing created successfully',
            status: 'success'
        });
    } catch (error) {
        next(error);
    }
};

// UPDATE telco billing
export const updateTelcoBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const billing = req.body;
        // Update parent billing
        await telcoModel.updateTelcoBilling(id, billing);
        // Update child details if present
        if (Array.isArray(billing.details) && billing.details.length > 0) {
            // Attach util_id to each detail
            const detailsWithUtilId = billing.details.map((detail: any) => ({
                ...detail,
                util_id: id
            }));
            // Update each detail (assumes upsert or update logic in model)
            for (const detail of detailsWithUtilId) {
                // Use util2_id or another unique id for detail row
                await telcoModel.updateTelcoBillingDetail(detail.util2_id, detail);
            }
        }
        res.status(200).json({ message: 'Telco billing updated', status: 'success' });
    } catch (error) {
        next(error);
    }
};

// DELETE telco billing
export const deleteTelcoBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        await telcoModel.deleteTelcoBilling(id);
        res.status(200).json({ message: 'Telco billing deleted', status: 'success' });
    } catch (error) {
        next(error);
    }
};
