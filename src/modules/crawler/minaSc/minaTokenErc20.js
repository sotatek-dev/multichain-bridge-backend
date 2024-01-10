/* eslint-disable max-statements */
/* eslint-disable max-lines */
/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AccountUpdate, Bool, SmartContract, method, PublicKey, UInt64, Account, state, State, VerificationKey, Field, Experimental, Int64, Struct } from 'o1js';
// eslint-disable-next-line max-len
// eslint-disable-next-line no-duplicate-imports, @typescript-eslint/consistent-type-imports
import { TransferFromToOptions, } from '../interfaces/token/transferable.js';
import errors from './errors.js';
import { AdminAction, } from '../interfaces/token/adminable.js';
import Hooks from './Hooks.js';
class Transfer extends Struct({
    from: PublicKey,
    to: PublicKey,
    amount: UInt64
}) {
    constructor(from, to, amount) {
        super({ from, to, amount });
    }
}
class Lock extends Struct({
    locker: PublicKey,
    receipt: Field,
    amount: UInt64
}) {
    constructor(locker, receipt, amount) {
        super({ locker, receipt, amount });
    }
}
class Token extends SmartContract {
    constructor() {
        super(...arguments);
        this.hooks = State();
        this.totalSupply = State();
        this.circulatingSupply = State();
        this.paused = State();
        this.decimals = UInt64.from(Token.defaultDecimals);
        this.events = { "Transfer": Transfer, "Lock": Lock };
    }
    getHooksContract() {
        const admin = this.getHooks();
        return new Hooks(admin);
    }
    initialize(hooks, totalSupply) {
        super.init();
        this.account.provedState.assertEquals(Bool(false));
        this.hooks.set(hooks);
        this.totalSupply.set(totalSupply);
        this.circulatingSupply.set(UInt64.from(0));
        this.paused.set(Bool(false));
    }
    /**
     * Mintable
     */
    mint(to, amount) {
        const hooksContract = this.getHooksContract();
        hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.mint));
        const totalSupply = this.getTotalSupply();
        const circulatingSupply = this.getCirculatingSupply();
        const newCirculatingSupply = circulatingSupply.add(amount);
        newCirculatingSupply.assertLessThanOrEqual(totalSupply, errors.mintAmountExceedsTotalSupply);
        // eslint-disable-next-line no-warning-comments
        // TODO: find out why amount can't be Int64, also for burn
        // eslint-disable-next-line putout/putout
        return this.token.mint({ address: to, amount });
    }
    setTotalSupply(amount) {
        const hooksContract = this.getHooksContract();
        hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.setTotalSupply));
        this.totalSupply.set(amount);
    }
    /**
     * Burnable
     */
    burn(from, amount) {
        const hooksContract = this.getHooksContract();
        hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.burn));
        // eslint-disable-next-line putout/putout
        return this.token.mint({ address: from, amount });
    }
    /**
     * Upgradable
     */
    setVerificationKey(verificationKey) {
        const hooksContract = this.getHooksContract();
        hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.setVerificationKey));
        this.account.verificationKey.set(verificationKey);
    }
    /**
     * Pausable
     */
    setPaused(paused) {
        const hooksContract = this.getHooksContract();
        hooksContract.canAdmin(AdminAction.fromType(AdminAction.types.setPaused));
        this.paused.set(paused);
    }
    /**
     * Approvable
     */
    // TODO
    hasNoBalanceChange(accountUpdates) {
        return Bool(true);
    }
    assertHasNoBalanceChange(accountUpdates) {
        this.hasNoBalanceChange(accountUpdates).assertTrue(errors.nonZeroBalanceChange);
    }
    approveTransfer(from, to) {
        this.assertHasNoBalanceChange([from, to]);
        this.approve(from, AccountUpdate.Layout.NoChildren);
        this.approve(to, AccountUpdate.Layout.NoChildren);
    }
    approveDeploy(deploy) {
        this.assertHasNoBalanceChange([deploy]);
        this.approve(deploy, AccountUpdate.Layout.NoChildren);
    }
    lock(receipt, bridgeAddress, amount) {
        // this.token.send({ from: this.sender, to: bridgeAddress, amount })
        this.burn(this.sender, amount);
        this.emitEvent("Lock", {
            locker: this.sender,
            receipt,
            amount,
        });
    }
    approveCallbackAndTransfer(sender, receiver, amount, callback) {
        const tokenId = this.token.id;
        const senderAccountUpdate = this.approve(callback, AccountUpdate.Layout.AnyChildren);
        senderAccountUpdate.body.tokenId.assertEquals(tokenId);
        senderAccountUpdate.body.publicKey.assertEquals(sender);
        const negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange);
        negativeAmount.assertEquals(Int64.from(amount).neg());
        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, tokenId);
        receiverAccountUpdate.balance.addInPlace(amount);
    }
    approveUpdateAndTransfer(zkappUpdate, receiver, amount) {
        // TODO: THIS IS INSECURE. The proper version has a prover error (compile != prove) that must be fixed
        this.approve(zkappUpdate, AccountUpdate.Layout.AnyChildren);
        // THIS IS HOW IT SHOULD BE DONE:
        // // approve a layout of two grandchildren, both of which can't inherit the token permission
        // let { StaticChildren, AnyChildren } = AccountUpdate.Layout;
        // this.approve(zkappUpdate, StaticChildren(AnyChildren, AnyChildren));
        // zkappUpdate.body.mayUseToken.parentsOwnToken.assertTrue();
        // let [grandchild1, grandchild2] = zkappUpdate.children.accountUpdates;
        // grandchild1.body.mayUseToken.inheritFromParent.assertFalse();
        // grandchild2.body.mayUseToken.inheritFromParent.assertFalse();
        // see if balance change cancels the amount sent
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange);
        balanceChange.assertEquals(Int64.from(amount).neg());
        const receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiver, this.token.id);
        receiverAccountUpdate.balance.addInPlace(amount);
    }
    approveUpdate(zkappUpdate) {
        this.approve(zkappUpdate);
        const balanceChange = Int64.fromObject(zkappUpdate.body.balanceChange);
        balanceChange.assertEquals(Int64.from(0));
    }
    // Instead, use `approveUpdate` method.
    // @method deployZkapp(address: PublicKey, verificationKey: VerificationKey) {
    //     let tokenId = this.token.id
    //     let zkapp = AccountUpdate.create(address, tokenId)
    //     zkapp.account.permissions.set(Permissions.default())
    //     zkapp.account.verificationKey.set(verificationKey)
    //     zkapp.requireSignature()
    // }
    /**
     * 'sendTokens()' sends tokens from `senderAddress` to `receiverAddress`.
     *
     * It does so by deducting the amount of tokens from `senderAddress` by
     * authorizing the deduction with a proof. It then creates the receiver
     * from `receiverAddress` and sends the amount.
     */
    sendTokensFromZkApp(receiverAddress, amount, callback) {
        // approves the callback which deductes the amount of tokens from the sender
        let senderAccountUpdate = this.approve(callback);
        // Create constraints for the sender account update and amount
        let negativeAmount = Int64.fromObject(senderAccountUpdate.body.balanceChange);
        negativeAmount.assertEquals(Int64.from(amount).neg());
        let tokenId = this.token.id;
        // Create receiver accountUpdate
        let receiverAccountUpdate = Experimental.createChildAccountUpdate(this.self, receiverAddress, tokenId);
        receiverAccountUpdate.balance.addInPlace(amount);
    }
    mintToken(receiverAddress, amount, callback) {
        // approves the callback which deductes the amount of tokens from the sender
        let senderAccountUpdate = this.approve(callback);
        // // Create constraints for the sender account update and amount
        // let negativeAmount = Int64.fromObject(
        //     senderAccountUpdate.body.balanceChange
        // );
        // negativeAmount.assertEquals(Int64.from(amount).neg());
        // let tokenId = this.token.id;
        // // Create receiver accountUpdate
        // let receiverAccountUpdate = Experimental.createChildAccountUpdate(
        //     this.self,
        //     receiverAddress,
        //     tokenId
        // );
        // receiverAccountUpdate.balance.addInPlace(amount);
        this.mint(receiverAddress, amount);
    }
    /**
     * Transferable
     */
    transferFromTo({ from, to, amount, }) {
        const [fromAccountUpdate] = this.transferFrom(from, amount, AccountUpdate.MayUseToken.ParentsOwnToken);
        const [, toAccountUpdate] = this.transferTo(to, amount, AccountUpdate.MayUseToken.ParentsOwnToken);
        fromAccountUpdate.requireSignature();
        return [fromAccountUpdate, toAccountUpdate];
    }
    transferFrom(from, amount, mayUseToken) {
        const fromAccountUpdate = AccountUpdate.create(from, this.token.id);
        fromAccountUpdate.balance.subInPlace(amount);
        fromAccountUpdate.body.mayUseToken = mayUseToken;
        return [fromAccountUpdate, undefined];
    }
    transferTo(to, amount, mayUseToken) {
        const toAccountUpdate = AccountUpdate.create(to, this.token.id);
        toAccountUpdate.body.mayUseToken = mayUseToken;
        toAccountUpdate.balance.addInPlace(amount);
        return [undefined, toAccountUpdate];
    }
    transfer({ from, to, amount, mayUseToken, }) {
        if (!from && !to) {
            throw new Error(errors.fromOrToNotProvided);
        }
        if (from && to) {
            return this.transferFromTo({
                from,
                to,
                amount,
            });
        }
        if (!mayUseToken) {
            throw new Error(errors.mayUseTokenNotProvided);
        }
        if (from && !to) {
            return this.transferFrom(from, amount, mayUseToken);
        }
        if (!to) {
            throw new Error(errors.fromOrToNotProvided);
        }
        return this.transferTo(to, amount, mayUseToken);
    }
    /**
     * Viewable
     */
    getAccountOf(address) {
        return Account(address, this.token.id);
    }
    getBalanceOf(address, { preconditions } = Token.defaultViewableOptions) {
        const account = this.getAccountOf(address);
        const balance = account.balance.get();
        if (preconditions.shouldAssertEquals) {
            account.balance.assertEquals(balance);
        }
        return balance;
    }
    getTotalSupply({ preconditions } = Token.defaultViewableOptions) {
        const totalSupply = this.totalSupply.get();
        if (preconditions.shouldAssertEquals) {
            this.totalSupply.assertEquals(totalSupply);
        }
        return totalSupply;
    }
    getCirculatingSupply({ preconditions } = Token.defaultViewableOptions) {
        const circulatingSupply = this.circulatingSupply.get();
        if (preconditions.shouldAssertEquals) {
            this.circulatingSupply.assertEquals(circulatingSupply);
        }
        return circulatingSupply;
    }
    getHooks({ preconditions } = Token.defaultViewableOptions) {
        const hooks = this.hooks.get();
        if (preconditions.shouldAssertEquals) {
            this.hooks.assertEquals(hooks);
        }
        return hooks;
    }
    getPaused({ preconditions } = Token.defaultViewableOptions) {
        const paused = this.paused.get();
        if (preconditions.shouldAssertEquals) {
            this.paused.assertEquals(paused);
        }
        return paused;
    }
    getDecimals() {
        return this.decimals;
    }
}
Token.defaultViewableOptions = {
    preconditions: { shouldAssertEquals: true },
};
// eslint-disable-next-line no-warning-comments
// TODO: check how many decimals mina has by default
Token.defaultDecimals = 9;
__decorate([
    state(PublicKey),
    __metadata("design:type", Object)
], Token.prototype, "hooks", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Token.prototype, "totalSupply", void 0);
__decorate([
    state(UInt64),
    __metadata("design:type", Object)
], Token.prototype, "circulatingSupply", void 0);
__decorate([
    state(Bool),
    __metadata("design:type", Object)
], Token.prototype, "paused", void 0);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, UInt64]),
    __metadata("design:returntype", void 0)
], Token.prototype, "initialize", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, UInt64]),
    __metadata("design:returntype", AccountUpdate)
], Token.prototype, "mint", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UInt64]),
    __metadata("design:returntype", void 0)
], Token.prototype, "setTotalSupply", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey, UInt64]),
    __metadata("design:returntype", AccountUpdate)
], Token.prototype, "burn", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerificationKey]),
    __metadata("design:returntype", void 0)
], Token.prototype, "setVerificationKey", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Bool]),
    __metadata("design:returntype", void 0)
], Token.prototype, "setPaused", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountUpdate, AccountUpdate]),
    __metadata("design:returntype", void 0)
], Token.prototype, "approveTransfer", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountUpdate]),
    __metadata("design:returntype", void 0)
], Token.prototype, "approveDeploy", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Field, PublicKey, UInt64]),
    __metadata("design:returntype", void 0)
], Token.prototype, "lock", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey,
        PublicKey,
        UInt64, Experimental.Callback]),
    __metadata("design:returntype", void 0)
], Token.prototype, "approveCallbackAndTransfer", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountUpdate, PublicKey, UInt64]),
    __metadata("design:returntype", void 0)
], Token.prototype, "approveUpdateAndTransfer", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AccountUpdate]),
    __metadata("design:returntype", void 0)
], Token.prototype, "approveUpdate", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey,
        UInt64, Experimental.Callback]),
    __metadata("design:returntype", void 0)
], Token.prototype, "sendTokensFromZkApp", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [PublicKey,
        UInt64, Experimental.Callback]),
    __metadata("design:returntype", void 0)
], Token.prototype, "mintToken", null);
__decorate([
    method,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [TransferFromToOptions]),
    __metadata("design:returntype", Array)
], Token.prototype, "transferFromTo", null);
export default Token;
//# sourceMappingURL=token.js.map