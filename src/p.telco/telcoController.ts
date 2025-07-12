import { Request, Response, NextFunction } from 'express';
import { TelcoModel } from './telcoModel';
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

// ===================== SUBSCRIBERS =====================
/** Show subscriber with historical sims by ID. endpoints: /subs/:id/sims */
export const getSubscriberWithSimsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const subscriberId = Number(req.params.id);
        if (isNaN(subscriberId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid subscriber ID' });
        }
        const subscriber = await TelcoModel.getSubscriberById(subscriberId);
        if (!subscriber) {
            return res.status(404).json({ status: 'error', message: 'Subscriber not found', data: null });
        }
        // Use join method to get all historical sims for this subscriber
        const simCards = await (TelcoModel.getSimCardBySubscriber ? TelcoModel.getSimCardBySubscriber() : []);
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
        const subscriber = await TelcoModel.getSubscriberById(id);
        if (!subscriber) {
            return res.status(404).json({ message: 'Subscriber not found' });
        }
        // Enrich with costcenter, department, district (id & name only)
        const [costcenters, departments, districts, simCards] = await Promise.all([
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
            TelcoModel.getSimCardBySubscriber ? TelcoModel.getSimCardBySubscriber() : [],
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
        const [subscribers, accounts, accountSubs, simCards, departments, costcenters, employees, assets, userSubs] = await Promise.all([
            TelcoModel.getSubscribers(),
            TelcoModel.getAccounts(),
            TelcoModel.getAccountSubs(),
            TelcoModel.getSimCardBySubscriber ? TelcoModel.getSimCardBySubscriber() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getEmployees ? assetModel.getEmployees() : [],
            assetModel.getAssets ? assetModel.getAssets() : [],
            TelcoModel.getUserSubs(),
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

        // Fetch brands and models for asset enrichment
        const brands = assetModel.getBrands ? await assetModel.getBrands() : [];
        const models = assetModel.getModels ? await assetModel.getModels() : [];
        const brandMap = Object.fromEntries((Array.isArray(brands) ? brands : []).map((b: any) => [b.id, b]));
        const modelMap = Object.fromEntries((Array.isArray(models) ? models : []).map((m: any) => [m.id, m]));

        // Format each subscriber
        const formatted = subscribers.map((sub: any) => {
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
                // Get brand and model
                const brand = asset.brand_id && brandMap[asset.brand_id] ? { id: asset.brand_id, name: brandMap[asset.brand_id].name } : null;
                const model = asset.model_id && modelMap[asset.model_id] ? { id: asset.model_id, name: modelMap[asset.model_id].name } : null;
                assetData = {
                    asset_id: sub.asset_id,
                    register_number: asset.register_number,
                    brand,
                    model
                };
            }
            // Find user
            const ramcoId = userSubMap[sub.id];
            const user = ramcoId && employeeMap[ramcoId] ? { ramco_id: ramcoId, full_name: employeeMap[ramcoId].full_name } : null;
            return {
                id: sub.id,
                sub_no: sub.sub_no,
                account_sub: sub.account_sub,
                status: sub.status,
                account: account ? { id: account.id, account_master: account.account_master } : null,
                simcard: sim ? { id: sim.sim_id, sim_sn: sim.sim_sn } : null,
                costcenter: costcenter ? { id: costcenter.id, name: costcenter.name } : null,
                department: department ? { id: department.id, name: department.code } : null,
                asset: assetData,
                user,
                register_date: sub.register_date,
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
            TelcoModel.getSubscribers(),
            TelcoModel.getAccounts(),
            TelcoModel.getAccountSubs(),
            TelcoModel.getContracts(),
            TelcoModel.getVendors(),
            TelcoModel.getSimCards(),
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
        const id = await TelcoModel.createSubscriber(subscriber);
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
        await TelcoModel.updateSubscriber(id, subscriber);
        res.status(200).json({ message: 'Subscriber updated' });
    } catch (error) {
        next(error);
    }
};

/* Delete subs by ID. DELETE /subs/:id */
export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = Number(req.params.id);
        await TelcoModel.deleteSubscriber(id);
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
        await TelcoModel.moveSubscriberToAccount(subscriberId, account_id, old_account_id, updated_by);
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
        const simCards = await (TelcoModel.getSimCardBySubscriber ? TelcoModel.getSimCardBySubscriber() : []);
        // Get all subscribers to map sub_no_id to sub_no
        const subscribers = await TelcoModel.getSubscribers();
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
        const id = await TelcoModel.createSimCard(simCard);
        res.status(201).json({ message: 'Sim card created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== ACCOUNTS =====================
/* list accounts. ep: /accounts */
export const getAccounts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accounts = await TelcoModel.getAccounts();
        const accountSubs = await TelcoModel.getAccountSubs();
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
        const id = await TelcoModel.createAccount(account);
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
        const [accounts, accountSubs, subscribers, simCards] = await Promise.all([
            TelcoModel.getAccounts(),
            TelcoModel.getAccountSubs(),
            TelcoModel.getSubscribers(),
            TelcoModel.getSimCardBySubscriber ? TelcoModel.getSimCardBySubscriber() : [],
        ]);
        const account = accounts.find((acc: any) => acc.id === accountId);
        if (!account) {
            return res.status(404).json({ status: 'error', message: 'Account not found', data: null });
        }
        const subIds: number[] = accountSubs.filter((as: any) => as.account_id === accountId).map((as: any) => as.sub_no_id);
        // Build sim card map by sub_no_id
        const simMap = Object.fromEntries(simCards.map((sim: any) => [sim.sub_no_id, sim]));
        const subs = subscribers.filter((sub: any) => subIds.includes(sub.id)).map((sub: any) => {
            const sim = simMap[sub.id];
            return {
                ...sub,
                sim_no: sim ? (sim.sim_sn || sim.sim_no) : null
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
        const [accounts, accountSubs, subscribers, costcenters, departments, districts] = await Promise.all([
            TelcoModel.getAccounts(),
            TelcoModel.getAccountSubs(),
            TelcoModel.getSubscribers(),
            assetModel.getCostcenters ? assetModel.getCostcenters() : [],
            assetModel.getDepartments ? assetModel.getDepartments() : [],
            assetModel.getDistricts ? assetModel.getDistricts() : [],
        ]);

        // Build lookup maps for enrichment (id & name only)
        const costcenterMap = Object.fromEntries((Array.isArray(costcenters) ? costcenters : []).map((c: any) => [c.id, { id: c.id, name: c.name }]));
        const departmentMap = Object.fromEntries((Array.isArray(departments) ? departments : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));
        const districtMap = Object.fromEntries((Array.isArray(districts) ? districts : []).map((d: any) => [d.id, { id: d.id, name: d.code }]));

        const result = accounts.map((account: any) => {
            const subIds: number[] = accountSubs.filter((as: any) => as.account_id === account.id).map((as: any) => as.sub_no_id);
            const subs = subscribers.filter((sub: any) => subIds.includes(sub.id)).map((sub: any) => {
                // Destructure to remove costcenter_id, department_id, district_id
                const { costcenter_id, department_id, district_id, ...rest } = sub;
                return {
                    ...rest,
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
        await TelcoModel.updateAccount(accountId, accountData);
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
        await TelcoModel.deleteAccount(accountId);
        res.status(200).json({ status: 'success', message: 'Account deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// ===================== ACCOUNT SUBS =====================
/* list account & subs assignment. ep: /account-subs */
export const getAccountSubs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountSubs = await TelcoModel.getAccountSubs();
        res.status(200).json(accountSubs);
    } catch (error) {
        next(error);
    }
};

/* assign subs to accounts. POST /account-subs */
export const createAccountSub = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountSub = req.body;
        const id = await TelcoModel.createAccountSub(accountSub);
        res.status(201).json({ message: 'Account subscription created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== CONTRACTS =====================
/* list contracts. ep: /contracts */
export const getContracts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contracts = await TelcoModel.getContracts();
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

        const contract = await TelcoModel.getContractById(contractId);

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
            TelcoModel.getContractById(contractId),
            TelcoModel.getAccounts(),
            TelcoModel.getAccountSubs(),
            TelcoModel.getSubscribers(),
            TelcoModel.getVendors(),
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
        const id = await TelcoModel.createContract(contract);
        res.status(201).json({ message: 'Contract created', id });
    } catch (error) {
        next(error);
    }
};

// ===================== VENDORS =====================
/* list vendors. ep: /vendors */
export const getVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendors = await TelcoModel.getVendors();
        res.status(200).json({status: 'Success', message: 'Vendors data retrieved succesfully', data: vendors});
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

        const vendor = await TelcoModel.getVendorById(vendorId);

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
        const id = await TelcoModel.createVendor(vendor);
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
        await TelcoModel.updateVendor(vendorId, vendor);
        res.status(200).json({ message: 'Vendor updated' });
    } catch (error) {
        next(error);
    }
};

/* Delete vendor by ID. DELETE /vendors/:id */
export const deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const vendorId = Number(req.params.id); // Ensure vendorId is a number
        await TelcoModel.deleteVendor(vendorId);
        res.status(200).json({ message: 'Vendor deleted' });
    } catch (error) {
        next(error);
    }
};