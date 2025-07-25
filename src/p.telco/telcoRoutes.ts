import { Router } from 'express';
import * as TelcoController from '../p.telco/telcoController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/subs/:id/sims', asyncHandler(TelcoController.getSubscriberWithSimsById)); // show subscriber and its sim cards by id
router.get('/subs/:id', asyncHandler(TelcoController.getSubscriberById)); // show subscriber by id
router.get('/subs', asyncHandler(TelcoController.getSubscribers)); // list subscribers
router.post('/subs', asyncHandler(TelcoController.createSubscriber));
router.put('/subs/:id', asyncHandler(TelcoController.updateSubscriber));
router.delete('/subs/:id', asyncHandler(TelcoController.deleteSubscriber));
router.patch('/subs/:id/move', asyncHandler(TelcoController.moveSubscriberToAccount)); // update subscriber by id

/* Sim Card */
router.get('/sims', asyncHandler(TelcoController.getSimCards));
router.post('/sims', asyncHandler(TelcoController.createSimCard));

/* Accounts */
router.get('/accounts/:id/subs', asyncHandler(TelcoController.getAccountWithSubscribersById)); // show account and its subscribers by account id
router.get('/accounts/subs', asyncHandler(TelcoController.getAccountsWithSubscribers)); // show all accounts and its subscribers
router.get('/accounts', asyncHandler(TelcoController.getAccounts)); // list accounts
router.post('/accounts', asyncHandler(TelcoController.createAccount)); // create account
router.put('/accounts/:id', asyncHandler(TelcoController.updateAccount)); // update account by id

/* Contracts */
router.get('/contracts/:id/accounts', asyncHandler(TelcoController.getContractWithAccountsAndSubsById)); // show contract and its accounts details by contract id
router.get('/contracts/:id', asyncHandler(TelcoController.getContractById)); // show contract by id
router.get('/contracts', asyncHandler(TelcoController.getContracts));
router.post('/contracts', asyncHandler(TelcoController.createContract));

/* Vendors */
router.get('/vendors/:id', asyncHandler(TelcoController.getVendorById)); // show vendor and its accounts details by vendor id
router.get('/vendors', asyncHandler(TelcoController.getVendors)); // list vendors
router.post('/vendors', asyncHandler(TelcoController.createVendor)); // create vendor
router.put('/vendors/:id', asyncHandler(TelcoController.updateVendor)); // update vendor by id
router.delete('/vendors/:id', asyncHandler(TelcoController.deleteVendor)); // delete vendor by id


/* Utility */
router.get('/account-subs', asyncHandler(TelcoController.getAccountSubs)); // list account & subs assignment
router.post('/account-subs', asyncHandler(TelcoController.createAccountSub)); // assign subs to accounts

/* Telco Billing */
router.post('/bills/by-ids', asyncHandler(TelcoController.getTelcoBillingsByIds));
router.get('/bills/:id', asyncHandler(TelcoController.getTelcoBillingById)); // show subscriber billing by id
router.get('/bills/:id/report/account', asyncHandler(TelcoController.getTelcoBillingByAccountId)); // summary report of cost centers by account id
// summary report of accounts by cost center id
router.get('/bills/:id/report/costcenter', asyncHandler(TelcoController.getTelcoBillingByCostcenterId));
router.get('/bills', asyncHandler(TelcoController.getTelcoBillings)); // list subscribers billing
router.post('/bills', asyncHandler(TelcoController.createTelcoBilling));
router.put('/bills/:id', asyncHandler(TelcoController.updateTelcoBilling));

export default router;