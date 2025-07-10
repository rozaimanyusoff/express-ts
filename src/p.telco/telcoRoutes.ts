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

/* Sim Card */
router.get('/sims', asyncHandler(TelcoController.getSimCards));
router.post('/sims', asyncHandler(TelcoController.createSimCard));

/* Accounts */
router.get('/accounts/:id/subs', asyncHandler(TelcoController.getAccountWithSubscribersById)); // show account and its subscribers by account id
router.get('/accounts/subs', asyncHandler(TelcoController.getAccountsWithSubscribers)); // show all accounts and its subscribers
router.get('/accounts', asyncHandler(TelcoController.getAccounts)); // list accounts
router.post('/accounts', asyncHandler(TelcoController.createAccount)); // create account

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

export default router;