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


export const TelcoController = {
    /* Show subscriber with historical sims by ID. endpoints: /subs/:id/sims */
    async getSubscriberWithSimsById(req: Request, res: Response, next: NextFunction) {
        try {
            const subscriberId = Number(req.params.id);

            if (isNaN(subscriberId)) {
                return res.status(400).json({ status: 'error', message: 'Invalid subscriber ID' });
            }

            const subscriber = await TelcoModel.getSubscriberById(subscriberId);

            if (!subscriber) {
                return res.status(404).json({ status: 'error', message: 'Subscriber not found', data: null });
            }

            const sims = await TelcoModel.getSimsBySubscriberId(subscriberId);

            const formattedData = {
                id: subscriber.id,
                sub_no: subscriber.sub_no,
                account_sub: subscriber.account_sub,
                status: subscriber.status,
                register_date: subscriber.register_date,
                sims: sims.map(sim => ({
                    id: sim.id,
                    sim_sn: sim.sim_sn,
                    register_date: sim.register_date,
                    reason: sim.reason,
                    note: sim.note,
                })),
            };

            res.status(200).json({ status: 'success', message: 'Show subscriber with historical sims by ID', data: formattedData });
        } catch (error) {
            next(error);
        }
    },

    /* Show sub by ID. ep: /subs/:id */
    async getSubscriberById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            const subscriber = await TelcoModel.getSubscriberById(id);
            if (!subscriber) {
                return res.status(404).json({ message: 'Subscriber not found' });
            }
            res.status(200).json({ status: 'success', message: 'Show subscriber by id', data: subscriber });
        } catch (error) {
            next(error);
        }
    },

    /* list subscribers. ep: /subs */
    async getSubscribers(req: Request, res: Response, next: NextFunction) {
        try {
            const subscribers = await TelcoModel.getSubscribers();
            res.status(200).json({ status: 'success', message: 'Show all subscribers', data: subscribers });
        } catch (error) {
            next(error);
        }
    },

    /* list subscribers with full data. ep: /subs */
    async getSubscribersFullData(req: Request, res: Response, next: NextFunction) {
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
                        ...acc,
                        contracts: accContracts,
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
    },

    /* Create subs. POST /subs */
    async createSubscriber(req: Request, res: Response, next: NextFunction) {
        try {
            const subscriber = req.body;
            const id = await TelcoModel.createSubscriber(subscriber);
            res.status(201).json({ message: 'Subscriber created', id });
        } catch (error) {
            next(error);
        }
    },

    /* Update subs by ID. PUT /subs/:id */
    async updateSubscriber(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            const subscriber = req.body;
            await TelcoModel.updateSubscriber(id, subscriber);
            res.status(200).json({ message: 'Subscriber updated' });
        } catch (error) {
            next(error);
        }
    },

    /* Delete subs by ID. DELETE /subs/:id */
    async deleteSubscriber(req: Request, res: Response, next: NextFunction) {
        try {
            const id = Number(req.params.id);
            await TelcoModel.deleteSubscriber(id);
            res.status(200).json({ message: 'Subscriber deleted' });
        } catch (error) {
            next(error);
        }
    },

    /* list sim cards. ep: /sims */
    async getSimCards(req: Request, res: Response, next: NextFunction) {
        try {
            const simCards = await TelcoModel.getSimCards();
            res.status(200).json({ status: 'success', message: 'Fetched sim card data successfully', data: simCards});
        } catch (error) {
            next(error);
        }
    },

    /* Create sim cards. POST /sims */
    async createSimCard(req: Request, res: Response, next: NextFunction) {
        try {
            const simCard = req.body;
            const id = await TelcoModel.createSimCard(simCard);
            res.status(201).json({ message: 'Sim card created', id });
        } catch (error) {
            next(error);
        }
    },

    /* show account and its subscribers by account id. ep: /accounts/:id/subs */
    async getAccountWithSubscribersById(req: Request, res: Response, next: NextFunction) {
        try {
            const accountId = Number(req.params.id);
            if (isNaN(accountId)) {
                return res.status(400).json({ status: 'error', message: 'Invalid account ID' });
            }
            const [accounts, accountSubs, subscribers] = await Promise.all([
                TelcoModel.getAccounts(),
                TelcoModel.getAccountSubs(),
                TelcoModel.getSubscribers(),
            ]);
            const account = accounts.find((acc: any) => acc.id === accountId);
            if (!account) {
                return res.status(404).json({ status: 'error', message: 'Account not found', data: null });
            }
            const subIds: number[] = accountSubs.filter((as: any) => as.account_id === accountId).map((as: any) => as.sub_no_id);
            const subs = subscribers.filter((sub: any) => subIds.includes(sub.id));
            const formattedData = {
                ...account,
                subs,
            };
            res.status(200).json({ status: 'success', message: 'Show specific account with its subscribers', data: formattedData });
        } catch (error) {
            next(error);
        }
    },

    /* list all accounts with its subscribers: /accounts/subs */
    async getAccountsWithSubscribers(req: Request, res: Response, next: NextFunction) {
        try {
            const [accounts, accountSubs, subscribers] = await Promise.all([
                TelcoModel.getAccounts(),
                TelcoModel.getAccountSubs(),
                TelcoModel.getSubscribers(),
            ]);
            const result = accounts.map((account: any) => {
                const subIds: number[] = accountSubs.filter((as: any) => as.account_id === account.id).map((as: any) => as.sub_no_id);
                const subs = subscribers.filter((sub: any) => subIds.includes(sub.id));
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
    },

    /* show contract and its accounts details by contract id */
    async getContractWithAccountsAndSubsById(req: Request, res: Response, next: NextFunction) {
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
    },

    /* show contract by ID. ep: /contracts/:id */
    async getContractById(req: Request, res: Response, next: NextFunction) {
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
    },

    /* list contracts. ep: /contracts */
    async getContracts(req: Request, res: Response, next: NextFunction) {
        try {
            const contracts = await TelcoModel.getContracts();
            res.status(200).json(contracts);
        } catch (error) {
            next(error);
        }
    },

    /* Create contract. POST /contracts */
    async createContract(req: Request, res: Response, next: NextFunction) {
        try {
            const contract = req.body;
            const id = await TelcoModel.createContract(contract);
            res.status(201).json({ message: 'Contract created', id });
        } catch (error) {
            next(error);
        }
    },


    /* Show vendor by ID. ep: /vendors/:id */
    async getVendorById(req: Request, res: Response, next: NextFunction) {
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
    },

    /* list vendors. ep: /vendors */
    async getVendors(req: Request, res: Response, next: NextFunction) {
        try {
            const vendors = await TelcoModel.getVendors();
            res.status(200).json({status: 'Success', message: 'Vendors data retrieved succesfully', data: vendors});
        } catch (error) {
            next(error);
        }
    },

    /* Create vendor. POST /vendors */
    async createVendor(req: Request, res: Response, next: NextFunction) {
        try {
            const vendor = req.body;
            const id = await TelcoModel.createVendor(vendor);
            res.status(201).json({ message: 'Vendor created', id });
        } catch (error) {
            next(error);
        }
    },

    /* Update vendor by ID. PUT /vendors/:id */
    async updateVendor(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = Number(req.params.id); // Ensure vendorId is a number
            const vendor = req.body;
            await TelcoModel.updateVendor(vendorId, vendor);
            res.status(200).json({ message: 'Vendor updated' });
        } catch (error) {
            next(error);
        }
    },

    /* Delete vendor by ID. DELETE /vendors/:id */
    async deleteVendor(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = Number(req.params.id); // Ensure vendorId is a number
            await TelcoModel.deleteVendor(vendorId);
            res.status(200).json({ message: 'Vendor deleted' });
        } catch (error) {
            next(error);
        }
    },

    /* list account & subs assignment. ep: /account-subs */
    async getAccountSubs(req: Request, res: Response, next: NextFunction) {
        try {
            const accountSubs = await TelcoModel.getAccountSubs();
            res.status(200).json(accountSubs);
        } catch (error) {
            next(error);
        }
    },

    /* assign subs to accounts. POST /account-subs */
    async createAccountSub(req: Request, res: Response, next: NextFunction) {
        try {
            const accountSub = req.body;
            const id = await TelcoModel.createAccountSub(accountSub);
            res.status(201).json({ message: 'Account subscription created', id });
        } catch (error) {
            next(error);
        }
    },

    /* list accounts. ep: /accounts */
    async getAccounts(req: Request, res: Response, next: NextFunction) {
        try {
            const accounts = await TelcoModel.getAccounts();
            res.status(200).json({ status: 'success', message: 'Show all accounts', data: accounts });
        } catch (error) {
            next(error);
        }
    },

    /* Create account. POST /accounts */
    async createAccount(req: Request, res: Response, next: NextFunction) {
        try {
            const account = req.body;
            const id = await TelcoModel.createAccount(account);
            res.status(201).json({ message: 'Account created', id });
        } catch (error) {
            next(error);
        }
    },

};