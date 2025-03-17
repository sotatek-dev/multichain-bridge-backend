var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PublicKey, SmartContract, State, UInt64, method, state, Struct, Bool, Provable, Field, Signature } from 'o1js';
import { FungibleToken } from "./FungibleToken.js";
import { ValidatorManager } from './ValidatorManager.js';
import { Manager } from './Manager.js';
class UnlockEvent extends Struct({
  receiver: PublicKey,
  tokenAddress: PublicKey,
  amount: UInt64,
  id: UInt64,
}) {
  constructor(receiver, tokenAddress, amount, id) {
    super({ receiver, tokenAddress, amount, id });
  }
}
class LockEvent extends Struct({
  locker: PublicKey,
  receipt: Field,
  amount: UInt64,
  tokenAddress: PublicKey
}) {
  constructor(locker, receipt, amount, tokenAddress) {
    super({ locker, receipt, amount, tokenAddress });
  }
}
export class Bridge extends SmartContract {
  constructor() {
    super(...arguments);
    this.minAmount = State();
    this.maxAmount = State();
    this.threshold = State();
    this.validatorManager = State();
    this.manager = State();
    this.events = { "Unlock": UnlockEvent, "Lock": LockEvent };
  }
  async deploy(args) {
    await super.deploy(args);
    this.minAmount.set(args.minAmount);
    this.maxAmount.set(args.maxAmount);
    this.validatorManager.set(args.validatorPub);
    this.threshold.set(args.threshold);
    this.manager.set(args.manager);
  }
  async setAmountLimits(newMinAmount, newMaxAmount) {
    // Ensure the caller is the manager
    const managerZkapp = new Manager(this.manager.getAndRequireEquals());
    managerZkapp.isAdmin(this.sender.getAndRequireSignature());
    // Set the new minimum and maximum amounts
    this.minAmount.set(newMinAmount);
    this.maxAmount.set(newMaxAmount);
    // Ensure the new minimum is less than or equal to the new maximum
    newMinAmount.assertLessThanOrEqual(newMaxAmount);
  }
  async changeManager(newManager) {
    // Ensure the caller is the current manager
    const managerZkapp = new Manager(this.manager.getAndRequireEquals());
    managerZkapp.isAdmin(this.sender.getAndRequireSignature());
    // Change the manager
    this.manager.set(newManager);
  }
  async changeValidatorManager(validatorManager) {
    const managerZkapp = new Manager(this.manager.getAndRequireEquals());
    managerZkapp.isAdmin(this.sender.getAndRequireSignature());
    // Change the validator manager
    this.validatorManager.set(validatorManager);
  }
  async lock(amount, address, tokenAddr) {
    // Check if the amount is within the allowed range
    const minAmount = this.minAmount.getAndRequireEquals();
    const maxAmount = this.maxAmount.getAndRequireEquals();
    amount.assertGreaterThanOrEqual(minAmount, "Amount is less than minimum allowed");
    amount.assertLessThanOrEqual(maxAmount, "Amount exceeds maximum allowed");
    const token = new FungibleToken(tokenAddr);
    await token.burn(this.sender.getAndRequireSignature(), amount);
    this.emitEvent("Lock", new LockEvent(this.sender.getAndRequireSignature(), address, amount, tokenAddr));
  }
  // @method async unlock(
  //   amount: UInt64,
  //   receiver: PublicKey,
  //   id: UInt64,
  //   tokenAddr: PublicKey,
  //   useSig1: Bool,
  //   validator1: PublicKey,
  //   sig1: Signature,
  //   useSig2: Bool,
  //   validator2: PublicKey,
  //   sig2: Signature,
  //   useSig3: Bool,
  //   validator3: PublicKey,
  //   sig3: Signature,
  // ) {
  //   const managerZkapp = new Manager(this.manager.getAndRequireEquals());
  //   managerZkapp.isMinter(this.sender.getAndRequireSignature());
  //   const msg = [
  //     ...receiver.toFields(),
  //     ...amount.toFields(),
  //     ...tokenAddr.toFields(),
  //   ]
  //   this.validateValidator(
  //     useSig1,
  //     validator1,
  //     useSig2,
  //     validator2,
  //     useSig3,
  //     validator3,
  //   );
  //   this.validateSig(msg, sig1, validator1, useSig1);
  //   this.validateSig(msg, sig2, validator2, useSig2);
  //   this.validateSig(msg, sig3, validator3, useSig3);
  //   const token = new FungibleToken(tokenAddr)
  //   await token.mint(receiver, amount)
  //   this.emitEvent("Unlock", new UnlockEvent(receiver, tokenAddr, amount, id));
  // }
  async unlock(amount, receiver, id, tokenAddr, useSig1, validator1, sig1, useSig2, validator2, sig2, useSig3, validator3, sig3) {
    const managerZkapp = new Manager(this.manager.getAndRequireEquals());
    managerZkapp.isMinter(this.sender.getAndRequireSignature());
    const msg = [
      ...receiver.toFields(),
      ...amount.toFields(),
      ...tokenAddr.toFields(),
    ];
    await this.validateValidator(useSig1, validator1, useSig2, validator2, useSig3, validator3);
    await this.validateSig(msg, sig1, validator1, useSig1);
    await this.validateSig(msg, sig2, validator2, useSig2);
    await this.validateSig(msg, sig3, validator3, useSig3);
    const token = new FungibleToken(tokenAddr);
    await token.mint(receiver, amount);
    this.emitEvent('Unlock', new UnlockEvent(receiver, tokenAddr, amount, id));
  }
  async validateValidator(useSig1, validator1, useSig2, validator2, useSig3, validator3) {
    let count = UInt64.from(0);
    const validatorManager = new ValidatorManager(this.validatorManager.getAndRequireEquals());
    count = Provable.if(useSig1, count.add(1), count);
    count = Provable.if(useSig2, count.add(1), count);
    count = Provable.if(useSig3, count.add(1), count);
    count.assertGreaterThanOrEqual(this.threshold.getAndRequireEquals(), "Not reached threshold");
    const index1 = await validatorManager.getValidatorIndex(validator1);
    const index2 = await validatorManager.getValidatorIndex(validator2);
    const index3 = await validatorManager.getValidatorIndex(validator3);
    const isValid1 = Provable.if(useSig1, index1.equals(Field(1)), Bool(true));
    const isValid2 = Provable.if(useSig2, index2.equals(Field(2)), Bool(true));
    const isValid3 = Provable.if(useSig3, index3.equals(Field(3)), Bool(true));
    isValid1.assertTrue("Validator1 has incorrect index");
    isValid2.assertTrue("Validator2 has incorrect index");
    isValid3.assertTrue("Validator3 has incorrect index");
  }
  async validateSig(msg, signature, validator, useSig) {
    let isValidSig = signature.verify(validator, msg);
    const isValid = Provable.if(useSig, isValidSig, Bool(true));
    isValid.assertTrue("Invalid signature");
  }
  async verifyMsg(publicKey, msg, sig) {
    const isOk = await sig.verify(publicKey, msg);
    Provable.log("isOk", isOk.toString());
  }
}
__decorate([
  state(UInt64),
  __metadata("design:type", Object)
], Bridge.prototype, "minAmount", void 0);
__decorate([
  state(UInt64),
  __metadata("design:type", Object)
], Bridge.prototype, "maxAmount", void 0);
__decorate([
  state(UInt64),
  __metadata("design:type", Object)
], Bridge.prototype, "threshold", void 0);
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], Bridge.prototype, "validatorManager", void 0);
__decorate([
  state(PublicKey),
  __metadata("design:type", Object)
], Bridge.prototype, "manager", void 0);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [UInt64, UInt64]),
  __metadata("design:returntype", Promise)
], Bridge.prototype, "setAmountLimits", null);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [PublicKey]),
  __metadata("design:returntype", Promise)
], Bridge.prototype, "changeManager", null);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [PublicKey]),
  __metadata("design:returntype", Promise)
], Bridge.prototype, "changeValidatorManager", null);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [UInt64, Field, PublicKey]),
  __metadata("design:returntype", Promise)
], Bridge.prototype, "lock", null);
__decorate([
  method,
  __metadata("design:type", Function),
  __metadata("design:paramtypes", [UInt64,
    PublicKey,
    UInt64,
    PublicKey,
    Bool,
    PublicKey,
    Signature,
    Bool,
    PublicKey,
    Signature,
    Bool,
    PublicKey,
    Signature]),
  __metadata("design:returntype", Promise)
], Bridge.prototype, "unlock", null);
//# sourceMappingURL=Bridge.js.map