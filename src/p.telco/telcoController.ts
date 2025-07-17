
import { Request, Response, NextFunction } from 'express';
import * as telcoModel from './telcoModel';
import * as assetModel from '../p.asset/assetModel';

// Define the structure of the subscriber data
type SubscriberData = {
    id: number;
    sub_no: string;
    account_sub: string;
    status: string;
    register_date: string;
    sims: SimCardData[];
};

// Define the structure of the sim card data
type SimCardData = {
    id: number;
    sim_sn: string;
    sub_no_id: number;
    sub_no: string;
    register_date: string;
    reason: string;
    note: string;
};

// Define the structure of the account data
type AccountData = {
    id: number;
    account_master: string;
    subs: {
        sub_no_id: number;
        sub_no: string;
        account_sub: string;
    }[];
};

// Define the structure of the contract data
type ContractData = {
    id: number;
    product_type: string;
    contract_start_date: string;
    contract_end_date: string;
    plan: string;
    status: string;
    vendor_id: string;
    price: number;
    duration: number;
    accounts: {
        account_id: number;
        account_master: string;
        subs: {
            sub_no_id: number;
            sub_no: string;
            account_sub: string;
        }[];
    }[];
};

// ===================== TELCO BILLING =====================
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
                    id: acc.id,
                    account_no: acc.account_master,
                    provider: acc.provider || null,
                };
            }
            return {
                id: b.id,
                bfcy_id: b.bfcy_id,
                account: accountObj,
                bill_date: b.bill_date,
                bill_no: b.bill_no,
                subtotal: b.subtotal,
                discount: b.discount || 0,
                tax: b.tax || 0,
                rounding: b.rounding || 0,
                grand_total: b.grand_total,
                reference: b.reference || null,
                status: b.status
            };
        });
        res.status(200).json({ status: 'success', message: 'Telco billing retrieved', data: formatted });
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
            return res.status(404).json({ status: 'error', message: 'Telco billing not found' });
        }
        // Resolve sim_subno if sim_id exists
        let sim_subno = null;
        if (billing.sim_id) {
            const oldSub = await telcoModel.getOldSubscriberById(billing.sim_id);
            sim_subno = oldSub?.sim_subno || null;
        }
        // Fetch accounts for mapping
        const accounts = await telcoModel.getAccounts();
        const accountMap = Object.fromEntries(accounts.map((a: any) => [a.account_master, a]));
        let accountObj = null;
        if (billing.account && accountMap[billing.account]) {
            const acc = accountMap[billing.account];
            accountObj = {
                id: acc.id,
                account_no: acc.account_master,
                provider: acc.provider || null,
                old_id: acc.old_bill_id // Keep old_id for backward compatibility
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
                let sim_subno = null;
                if (d.sim_id) {
                    const oldSub = await telcoModel.getOldSubscriberById(d.sim_id);
                    sim_subno = oldSub?.sim_subno || null;
                }
                if (sim_subno) {
                    const subscriber = Array.isArray(subscribers)
                        ? subscribers.find((sub: any) => sub.sub_no === sim_subno)
                        : null;
                    if (subscriber) {
                        subsObj = { id: subscriber.id, sub_no: subscriber.sub_no };
                    }
                }
                // Support new records: map by sub_id if sim_id is null
                if (!subsObj && d.sub_id) {
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
                    user = { ramco_id: emp.ramco_id, full_name: emp.full_name };
                }
                // Remove cc_id and loc_id from details
                const { cc_id, loc_id, ramco_id, ...rest } = d;
                return {
                    ...rest,
                    old_sim_id: d.sim_id || null,
                    subs: subsObj,
                    costcenter,
                    district,
                    user
                };
            }));
        }
        // Build summary: sum util2_amt by costcenter object from details
        let summary: Array<{ costcenter: { id: number | null, name: string }, cc_amount: number }> = [];
        if (Array.isArray(details)) {
            // Use a Map to group by costcenter stringified
            const summaryMap = new Map();
            for (const d of details) {
                const cc = d.costcenter || { id: null, name: '' };
                const key = JSON.stringify(cc);
                const amt = parseFloat(d.amount) || 0;
                if (!summaryMap.has(key)) {
                    summaryMap.set(key, { costcenter: cc, cc_amount: 0 });
                }
                summaryMap.get(key).cc_amount += amt;
            }
            summary = Array.from(summaryMap.values());
        }
        const formatted = {
            id: billing.id,
            bfcy_id: billing.bfcy_id,
            account: accountObj,
            bill_date: billing.bill_date,
            bill_no: billing.bill_no,
            subtotal: billing.subtotal,
            tax: billing.tax,
            rounding: billing.rounding,
            grand_total: billing.grand_total,
            status: billing.status,
            reference: billing.reference || null,
            summary,
            details: Array.isArray(details) ? details : []
        };
        res.status(200).json({ status: 'success', message: 'Telco billing retrieved', data: formatted });
    } catch (error) {
        next(error);
    }
};

// CREATE telco billing
export const createTelcoBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const billing = req.body;
        // Insert parent billing
        const insertId = await telcoModel.createTelcoBilling(billing);
        // Insert child details if present
        if (Array.isArray(billing.details) && billing.details.length > 0) {
            // Attach util_id to each detail
            const detailsWithUtilId = billing.details.map((detail: any) => ({
                ...detail,
                bill_id: insertId
            }));
            // Insert each detail
            for (const detail of detailsWithUtilId) {
                await telcoModel.createTelcoBillingDetail(detail);
            }
        }
        res.status(201).json({ status: 'success', message: 'Telco billing created', id: insertId });
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
        res.status(200).json({ status: 'success', message: 'Telco billing updated' });
    } catch (error) {
        next(error);
    }
};

// DELETE telco billing
export const deleteTelcoBilling = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        await telcoModel.deleteTelcoBilling(id);
        res.status(200).json({ status: 'success', message: 'Telco billing deleted' });
    } catch (error) {
        next(error);
    }
};


// GET /api/telco/bills/:id/report?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getCostcenterSummaryReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountId = Number(req.params.id);
        const { from, to } = req.query;
        if (isNaN(accountId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid account ID' });
        }
        if (typeof from !== 'string' || typeof to !== 'string' || !from || !to) {
            return res.status(400).json({ status: 'error', message: 'Missing or invalid from/to query params. Use ?from=YYYY-MM-DD&to=YYYY-MM-DD' });
        }
        // Always use the RAW result from telcoModel.getTelcoBillings(), not the formatted controller output
        const bills = await telcoModel.getTelcoBillingByAccountDateRange(accountId, from, to);
        // Debug: log the first bill to check structure
        if (bills && bills.length > 0) {
            // eslint-disable-next-line no-console
            console.log('DEBUG: First bill from getTelcoBillings:', bills[0]);
        }
        const fromDate = new Date(from);
        const toDate = new Date(to);
        // Filter bills by account_id and bill_date/date_bill in range
        // Make sure to use b.account_id (from raw DB row)
        const filteredBills = bills.filter((b: any) => {
            if (b.account_id !== accountId) return false;
            const date = b.date_bill || b.bill_date;
            const billDate = date ? new Date(date) : null;
            return billDate && billDate >= fromDate && billDate <= toDate;
        });
        if (!filteredBills.length) {
            return res.status(404).json({ status: 'error', message: 'No bills found for this account in the date range' });
        }
        // Get all details for these bills
        let allDetails: any[] = [];
        for (const bill of filteredBills) {
            const details = await telcoModel.getTelcoBillingDetailsById(bill.id); //ToDo: to be reviewed as this method will get data by bill_id & not accoun_id
            // Attach bill date to each detail for grouping
            const date = bill.date_bill || bill.bill_date;
            const billDate = date ? new Date(date) : null;
            for (const d of details) {
                allDetails.push({ ...d, _billDate: billDate });
            }
        }
        // Group by costcenter_id and month
        const summaryMap = new Map();
        for (const d of allDetails) {
            const costcenterId = d.costcenter_id || null;
            const billDate = d._billDate;
            if (!billDate) continue;
            const month = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;
            const key = `${costcenterId || 'null'}_${month}`;
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    costcenter_id: costcenterId,
                    month,
                    total_amount: 0
                });
            }
            summaryMap.get(key).total_amount += parseFloat(d.amount) || 0;
        }
        const summary = Array.from(summaryMap.values());
        res.status(200).json({ status: 'success', data: summary });
    } catch (error) {
        next(error);
    }
};


// ===================== SUBSCRIBERS =====================
/** Show subscriber with historical sims by ID. endpoints: /subs/:id/sims */
export const getSubscriberWithSimsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriberId = Number(req.params.id);
        if (isNaN(subscriberId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid subscriber ID' });
        }
        const subscriber = await telcoModel.getSubscriberById(subscriberId);
        if (!subscriber) {
            return res.status(404).json({ status: 'error', message: 'Subscriber not found', data: null });
        }
        // Use join method to get all historical sims for this subscriber
        const simCards = await (telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : []);
        const sims = Array.isArray(simCards)
            ? simCards.filter((sim: any) => sim.sub_no_id === subscriberId).map((sim: any) => ({
                id: sim.sim_id || sim.id,
                sim_no: sim.sim_sn || sim.sim_no,
                status: sim.status,
                register_date: sim.register_date,
            }))
            : [];
        const formattedData = {
            id: subscriber.id,
            sub_no: subscriber.sub_no,
            account_sub: subscriber.account_sub,
            status: subscriber.status,
            register_date: subscriber.register_date,
            sims,
        };
        res.status(200).json({ status: 'success', message: 'Show subscriber with historical sims by ID', data: formattedData });
    } catch (error) {
        next(error);
    }
};

/** Show sub by ID. ep: /subs/:id */
export const getSubscriberById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const subscriber = await telcoModel.getSubscriberById(id);
        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }
        // Enrich with costcenter, department, district (id & name only)
        const [costcenters, departments, districts, simCards] = await Promise.all([
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
            telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : [],
        ]);
        const costcenterMap = Object.fromEntries((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
        const departmentMap = Object.fromEntries((Array.isArray(departments) ? departments : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const districtMap = Object.fromEntries((Array.isArray(districts) ? districts : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        // Remove costcenter_id, department_id, district_id
        const { costcenter_id, department_id, district_id, ...rest } = subscriber;
        // Filter simCards for this subscriber
        const sims = Array.isArray(simCards)
            ? simCards.filter((sim: any) => sim.sub_no_id === id).map((sim: any) => ({
                id: sim.sim_id || sim.id,
                sim_no: sim.sim_sn || sim.sim_no,
                status: sim.status,
                register_date: sim.register_date,
            }))
            : [];
        const enriched = {
            ...rest,
            costcenter: costcenter_id ? costcenterMap[costcenter_id] || null : null,
            department: department_id ? departmentMap[department_id] || null : null,
            district: district_id ? districtMap[district_id] || null : null,
            sims,
        };
        res.status(200).json({ status: 'success', message: 'Show subscriber by id', data: enriched });
    } catch (error) {
        next(error);
    }
};

/* list subscribers. ep: /subs */
export const getSubscribers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Fetch all required data in parallel
        const [subscribers, accounts, accountSubs, simCards, departments, costcenters, employees, assets, userSubs, brands, models] = await Promise.all([
            telcoModel.getSubscribers(),
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getEmployees ? assetModel.getEmployees() : [],
            assetModel.getAssets ? assetModel.getAssets() : [],
            telcoModel.getUserSubs(),
            assetModel.getBrands ? assetModel.getBrands() : [],
            assetModel.getModels ? assetModel.getModels() : [],
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
        const departmentMap = Object.fromEntries((departmentArr).map((d: any) => [d.id, d]));
        const costcenterMap = Object.fromEntries((costcenterArr).map((c: any) => [c.id, c]));
        const assetMap = Object.fromEntries((Array.isArray(assets) ? assets : []).map((a: any) => [a.id, a]));
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));

        // Format each subscriber
        const formatted = subscribers.map((sub: any) => {
            // Destructure to remove asset_id from the returned object
            const { asset_id, ...rest } = sub;
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
                assetData = {
                    id: asset.id,
                    register_number: asset.register_number,
                    brand,
                    model
                };
            }
            // Find user
            const ramcoId = userSubMap[sub.id];
            const user = ramcoId && employeeMap[ramcoId] ? { ramco_id: ramcoId, full_name: employeeMap[ramcoId].full_name } : null;
            return {
                ...rest,
                account: account ? { id: account.id, account_master: account.account_master, provider: account.provider } : null,
                simcard: sim ? { id: sim.sim_id, sim_sn: sim.sim_sn } : null,
                costcenter: costcenter ? { id: costcenter.id, name: costcenter.name } : null,
                department: department ? { id: department.id, name: department.code } : null,
                asset: assetData,
                user,
            };
        });

        res.status(200).json({ status: 'success', message: 'Show all subscribers', data: formatted });
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
            return res.status(404).json({ status: 'error', message: 'No subscribers found', data: [] });
        }
        res.status(200).json({ status: 'success', message: 'Subscribers full data', data: result });
    } catch (error) {
        next(error);
    }
};

/* Create subs. POST /subs */
export const createSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriber = req.body;
        const id = await telcoModel.createSubscriber(subscriber);
        res.status(201).json({ message: 'Subscriber created', id });
    } catch (error) {
        next(error);
    }
};

/* Update subs by ID. PUT /subs/:id */
export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        const subscriber = req.body;
        await telcoModel.updateSubscriber(id, subscriber);
        res.status(200).json({ message: 'Subscriber updated' });
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
            return res.status(400).json({ status: 'error', message: 'Invalid subscriber or account ID' });
        }
        await telcoModel.moveSubscriberToAccount(subscriberId, account_id, old_account_id, updated_by);
        res.status(200).json({ status: 'success', message: 'Subscriber moved to new account' });
    } catch (error) {
        next(error);
    }
};

// ===================== SIM CARDS =====================
/* list sim cards. ep: /sims */
export const getSimCards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Use join to get sim cards with sub_no_id and sub_no
        const simCards = await (telcoModel.getSimCardBySubscriber ? telcoModel.getSimCardBySubscriber() : []);
        // Get all subscribers to map sub_no_id to sub_no
        const subscribers = await telcoModel.getSubscribers();
        const subNoMap = Object.fromEntries((Array.isArray(subscribers) ? subscribers : []).map((sub: any) => [sub.id, sub.sub_no]));
        const formatted = Array.isArray(simCards)
            ? simCards.map((sim: any) => ({
                id: sim.sim_id || sim.id,
                sim_sn: sim.sim_sn || sim.sim_no,
                subs: sim.sub_no_id ? { id: sim.sub_no_id, sub_no: subNoMap[sim.sub_no_id] || null } : null,
            }))
            : [];
        res.status(200).json({ status: 'success', message: 'Fetched sim card data successfully', data: formatted });
    } catch (error) {
        next(error);
    }
};

/* Create sim cards. POST /sims */
export const createSimCard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const simCard = req.body;
        const id = await telcoModel.createSimCard(simCard);
        res.status(201).json({ message: 'Sim card created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== ACCOUNTS =====================
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
        res.status(200).json({ status: 'success', message: 'Show all accounts', data: enriched });
    } catch (error) {
        next(error);
    }
};

/* Create account. POST /accounts */
export const createAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const account = req.body;
        const id = await telcoModel.createAccount(account);
        res.status(201).json({ message: 'Account created', id });
    } catch (error) {
        next(error);
    }
};

/* show account and its subscribers by account id. ep: /accounts/:id/subs */
export const getAccountWithSubscribersById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountId = Number(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid account ID' });
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
            return res.status(404).json({ status: 'error', message: 'Account not found', data: null });
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
            const { costcenter_id, department_id, district_id, asset_id, ...rest } = sub;
            let assetData = null;
            if (assetObj) {
                const brand = assetObj.brand_id && brandMap[assetObj.brand_id] ? { id: assetObj.brand_id, name: brandMap[assetObj.brand_id].name } : null;
                const model = assetObj.model_id && modelMap[assetObj.model_id] ? { id: assetObj.model_id, name: modelMap[assetObj.model_id].name } : null;
                assetData = {
                    id: assetObj.id,
                    register_number: assetObj.register_number,
                    brand,
                    model
                };
            }
            // Enrich user
            const ramcoId = userSubMap[sub.id];
            const user = ramcoId && employeeMap[ramcoId] ? { ramco_id: ramcoId, full_name: employeeMap[ramcoId].full_name } : null;
            let simObj = null;
            if (sim) {
                simObj = {
                    id: sim.sim_id || sim.id || null,
                    no: sim.sim_sn || sim.sim_no || null
                };
            }
            return {
                ...rest,
                costcenter: costcenter_id ? costcenterMap[costcenter_id] || null : null,
                department: department_id ? departmentMap[department_id] || null : null,
                district: district_id ? districtMap[district_id] || null : null,
                asset: assetData,
                sim: simObj,
                user
            };
        });
        const formattedData = {
            ...account,
            subs,
        };
        res.status(200).json({ status: 'success', message: 'Show specific account with its subscribers', data: formattedData });
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
                const { costcenter_id, department_id, district_id, asset_id, ...rest } = sub;
                // Find asset
                const assetObj = sub.asset_id && assetMap[sub.asset_id] ? assetMap[sub.asset_id] : null;
                let assetData = null;
                if (assetObj) {
                    const brand = assetObj.brand_id && brandMap[assetObj.brand_id] ? { id: assetObj.brand_id, name: brandMap[assetObj.brand_id].name } : null;
                    const model = assetObj.model_id && modelMap[assetObj.model_id] ? { id: assetObj.model_id, name: modelMap[assetObj.model_id].name } : null;
                    assetData = {
                        id: assetObj.id,
                        register_number: assetObj.register_number,
                        brand,
                        model
                    };
                }
                return {
                    ...rest,
                    costcenter: costcenter_id ? costcenterMap[costcenter_id] || null : null,
                    department: department_id ? departmentMap[department_id] || null : null,
                    district: district_id ? districtMap[district_id] || null : null,
                    asset: assetData,
                };
            });
            return {
                ...account,
                subs,
            };
        });
        if (!result.length) {
            return res.status(404).json({ status: 'error', message: 'Data not found', data: [] });
        }
        res.status(200).json({ status: 'success', message: 'Show all accounts with their subscribers', data: result });
    } catch (error) {
        next(error);
    }
};

export const updateAccount = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = Number(req.params.id);
    if (isNaN(accountId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid account ID' });
    }
    try {
        const accountData = req.body;
        await telcoModel.updateAccount(accountId, accountData);
        res.status(200).json({ status: 'success', message: 'Account updated successfully' });
    } catch (error) {
        next(error);
    }
}

export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    const accountId = Number(req.params.id);
    if (isNaN(accountId)) {
        return res.status(400).json({ status: 'error', message: 'Invalid account ID' });
    }
    try {
        await telcoModel.deleteAccount(accountId);
        res.status(200).json({ status: 'success', message: 'Account deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// ===================== ACCOUNT SUBS =====================
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
        res.status(201).json({ message: 'Account subscription created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== CONTRACTS =====================
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
            return res.status(400).json({ status: 'error', message: 'Invalid contract ID' });
        }

        const contract = await telcoModel.getContractById(contractId);

        if (!contract) {
            return res.status(404).json({ status: 'error', message: 'Contract not found', data: null });
        }

        const formattedData = {
            id: contract.id,
            account_id: contract.account_id,
            product_type: contract.product_type,
            contract_start_date: contract.contract_start_date,
            contract_end_date: contract.contract_end_date,
            plan: contract.plan,
            status: contract.status,
            vendor_id: contract.vendor_id,
            vendor: contract.name,
            price: contract.price,
            duration: contract.duration,
        };

        res.status(200).json({ status: 'success', message: 'Show contract by ID', data: formattedData });
    } catch (error) {
        next(error);
    }
};

/* show contract and its accounts details by contract id */
export const getContractWithAccountsAndSubsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contractId = Number(req.params.id);
        if (isNaN(contractId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid contract ID' });
        }
        const [contract, accounts, accountSubs, subscribers, vendors] = await Promise.all([
            telcoModel.getContractById(contractId),
            telcoModel.getAccounts(),
            telcoModel.getAccountSubs(),
            telcoModel.getSubscribers(),
            telcoModel.getVendors(),
        ]);
        if (!contract) {
            return res.status(404).json({ status: 'error', message: 'Contract not found', data: null });
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
            vendor,
            accounts: account ? [{ ...account, subs }] : [],
        };
        res.status(200).json({ status: 'success', message: 'Show contract with accounts and subscribers by ID', data: formattedData });
    } catch (error) {
        next(error);
    }
};

/* Create contract. POST /contracts */
export const createContract = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract = req.body;
        const id = await telcoModel.createContract(contract);
        res.status(201).json({ message: 'Contract created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== VENDORS =====================
/* list vendors. ep: /vendors */
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendors = await telcoModel.getVendors();
        res.status(200).json({ status: 'Success', message: 'Vendors data retrieved succesfully', data: vendors });
    } catch (error) {
        next(error);
    }
};

/* Show vendor by ID. ep: /vendors/:id */
export const getVendorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendorId = Number(req.params.id);

        if (isNaN(vendorId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid vendor ID' });
        }

        const vendor = await telcoModel.getVendorById(vendorId);

        if (!vendor) {
            return res.status(404).json({ status: 'error', message: 'Vendor not found', data: null });
        }

        const formattedData = {
            id: vendor.id,
            name: vendor.name,
            service_type: vendor.service_type,
            register_date: vendor.register_date,
            address: vendor.address,
            contact_name: vendor.contact_name,
            contact_no: vendor.contact_no,
            contact_email: vendor.contact_email,
            status: vendor.status,
        };

        res.status(200).json({ status: 'success', message: 'Show vendor by ID', data: formattedData });
    } catch (error) {
        next(error);
    }
};

/* Create vendor. POST /vendors */
export const createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendor = req.body;
        const id = await telcoModel.createVendor(vendor);
        res.status(201).json({ message: 'Vendor created', id });
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

// ToDo: implement costcenter summary by bill ID with date range params