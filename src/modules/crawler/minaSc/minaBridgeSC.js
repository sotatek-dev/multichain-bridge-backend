import { Field, method, PublicKey, SmartContract, State, state, Struct, UInt64 } from 'o1js';

import { FungibleToken } from './fungibleToken';

var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r = c < 3 ? target : desc === null ? (desc = Object.getOwnPropertyDescriptor(target, key)) : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i])) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function') return Reflect.metadata(k, v);
  };

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
  tokenAddress: PublicKey,
}) {
  constructor(locker, receipt, amount, tokenAddress) {
    super({ locker, receipt, amount, tokenAddress });
  }
}
export class Bridge extends SmartContract {
  constructor() {
    super(...arguments);
    this.minter = State();
    this.configurator = State();
    this.minAmount = State();
    this.maxAmount = State();
    // @state(UInt64) total = State<UInt64>()
    this.tokenAddress = State();
    this.events = { Unlock: UnlockEvent, Lock: LockEvent };
  }
  async decrementBalance(amount) {
    this.balance.subInPlace(amount);
  }
  async deploy(args) {
    super.deploy(args);
    this.configurator.set(this.sender.getAndRequireSignature());
    this.minter.set(this.sender.getAndRequireSignature());
    this.tokenAddress.set(args.tokenAddress);
    this.minAmount.set(UInt64.from(0));
    this.maxAmount.set(UInt64.from(0));
    // this.total.set(UInt64.from(0));
  }
  async config(_configurator, _min, _max) {
    this.configurator.getAndRequireEquals().assertEquals(this.sender.getAndRequireSignature());
    this.configurator.set(_configurator);
    this.minAmount.set(_min);
    this.maxAmount.set(_max);
    _max.assertGreaterThanOrEqual(_min);
  }
  checkMinMax(amount) {
    this.minAmount.getAndRequireEquals().assertLessThanOrEqual(amount);
    this.maxAmount.getAndRequireEquals().assertGreaterThanOrEqual(amount);
  }
  async lock(amount, address) {
    this.checkMinMax(amount);
    const tokenAddress = this.tokenAddress.getAndRequireEquals();
    const token = new FungibleToken(tokenAddress);
    await token.transfer(this.sender.getAndRequireSignature(), this.address, amount);
    this.emitEvent('Lock', new LockEvent(this.sender.getAndRequireSignature(), address, amount, tokenAddress));
  }
  async unlock(amount, receiver, id) {
    this.minter.getAndRequireEquals().assertEquals(this.sender.getAndRequireSignature());
    const tokenAddress = this.tokenAddress.getAndRequireEquals();
    const token = new FungibleToken(tokenAddress);
    await token.transfer(this.address, receiver, amount);
    this.emitEvent('Unlock', new UnlockEvent(receiver, tokenAddress, amount, id));
  }
}
__decorate([state(PublicKey), __metadata('design:type', Object)], Bridge.prototype, 'minter', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Bridge.prototype, 'configurator', void 0);
__decorate([state(UInt64), __metadata('design:type', Object)], Bridge.prototype, 'minAmount', void 0);
__decorate([state(UInt64), __metadata('design:type', Object)], Bridge.prototype, 'maxAmount', void 0);
__decorate([state(PublicKey), __metadata('design:type', Object)], Bridge.prototype, 'tokenAddress', void 0);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [UInt64]),
    __metadata('design:returntype', Promise),
  ],
  Bridge.prototype,
  'decrementBalance',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [PublicKey, UInt64, UInt64]),
    __metadata('design:returntype', Promise),
  ],
  Bridge.prototype,
  'config',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [UInt64, Field]),
    __metadata('design:returntype', Promise),
  ],
  Bridge.prototype,
  'lock',
  null,
);
__decorate(
  [
    method,
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [UInt64, PublicKey, UInt64]),
    __metadata('design:returntype', Promise),
  ],
  Bridge.prototype,
  'unlock',
  null,
);
//# sourceMappingURL=Bridge.js.map
